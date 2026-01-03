"""
CareCircle Medications Handler Lambda
Handles medication management: CRUD + adherence logging
"""
import json
import os
import boto3
import uuid
from datetime import datetime
from decimal import Decimal

# Initialize AWS clients
dynamodb = boto3.resource('dynamodb')

table_name = os.environ.get('DYNAMODB_TABLE', 'CareCircle-Data-v2')
table = dynamodb.Table(table_name)


class DecimalEncoder(json.JSONEncoder):
    """Handle Decimal types from DynamoDB"""
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj) if obj % 1 else int(obj)
        return super().default(obj)


def get_user_id(event):
    """Extract user ID from Cognito authorizer"""
    try:
        return event['requestContext']['authorizer']['claims']['sub']
    except (KeyError, TypeError):
        return None


def cors_response(status_code, body):
    """Generate CORS-enabled response"""
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        },
        'body': json.dumps(body, cls=DecimalEncoder) if body else ''
    }


def handle_get_medications(event, user_id):
    """Get all medications for the user's elders"""
    try:
        params = event.get('queryStringParameters', {}) or {}
        elder_id = params.get('elderId')
        
        if elder_id:
            # Get medications for specific elder
            response = table.query(
                KeyConditionExpression='PK = :pk AND begins_with(SK, :sk)',
                ExpressionAttributeValues={
                    ':pk': f'ELDER#{elder_id}',
                    ':sk': 'MED#'
                }
            )
        else:
            # Get all medications for user's elders (via GSI)
            response = table.query(
                IndexName='GSI1',
                KeyConditionExpression='GSI1PK = :pk AND begins_with(GSI1SK, :sk)',
                ExpressionAttributeValues={
                    ':pk': f'USER#{user_id}',
                    ':sk': 'MED#'
                }
            )
        
        medications = response.get('Items', [])
        
        # Format for frontend
        formatted_meds = []
        for med in medications:
            formatted_meds.append({
                'medicationId': med.get('medicationId'),
                'elderId': med.get('elderId'),
                'elderName': med.get('elderName', 'Unknown'),
                'name': med.get('name'),
                'dosage': med.get('dosage'),
                'frequency': med.get('frequency'),
                'schedule': med.get('schedule', []),
                'instructions': med.get('instructions'),
                'prescribedBy': med.get('prescribedBy'),
                'pharmacy': med.get('pharmacy'),
                'refillDate': med.get('refillDate'),
                'pillsRemaining': med.get('pillsRemaining'),
                'adherenceLog': med.get('adherenceLog', []),
                'isActive': med.get('isActive', True),
                'createdAt': med.get('createdAt'),
                'updatedAt': med.get('updatedAt'),
            })
        
        return cors_response(200, {'medications': formatted_meds})
    
    except Exception as e:
        print(f"Error getting medications: {e}")
        return cors_response(500, {'error': str(e)})


def handle_create_medication(event, user_id):
    """Create a new medication"""
    try:
        body = json.loads(event.get('body', '{}'))
        
        medication_id = str(uuid.uuid4())
        timestamp = datetime.utcnow().isoformat() + 'Z'
        elder_id = body.get('elderId', 'default')
        
        medication = {
            'PK': f'ELDER#{elder_id}',
            'SK': f'MED#{medication_id}',
            'medicationId': medication_id,
            'elderId': elder_id,
            'elderName': body.get('elderName', 'Unknown'),
            'name': body.get('name'),
            'dosage': body.get('dosage'),
            'frequency': body.get('frequency'),  # e.g., "twice daily", "every 8 hours"
            'schedule': body.get('schedule', []),  # e.g., ["08:00", "20:00"]
            'instructions': body.get('instructions'),  # e.g., "Take with food"
            'prescribedBy': body.get('prescribedBy'),
            'pharmacy': body.get('pharmacy'),
            'refillDate': body.get('refillDate'),
            'pillsRemaining': body.get('pillsRemaining'),
            'adherenceLog': [],  # Will store {date, time, taken: bool}
            'isActive': True,
            'createdAt': timestamp,
            'updatedAt': timestamp,
            'createdBy': user_id,
            # GSI for querying by user
            'GSI1PK': f'USER#{user_id}',
            'GSI1SK': f'MED#{medication_id}',
        }
        
        table.put_item(Item=medication)
        
        return cors_response(201, {
            'message': 'Medication created successfully',
            'medicationId': medication_id,
            'medication': medication
        })
    
    except Exception as e:
        print(f"Error creating medication: {e}")
        return cors_response(500, {'error': str(e)})


def handle_get_medication(event, user_id, medication_id):
    """Get a specific medication"""
    try:
        # Query using GSI since we don't know the elder_id
        response = table.query(
            IndexName='GSI1',
            KeyConditionExpression='GSI1PK = :pk AND GSI1SK = :sk',
            ExpressionAttributeValues={
                ':pk': f'USER#{user_id}',
                ':sk': f'MED#{medication_id}'
            }
        )
        
        items = response.get('Items', [])
        if not items:
            return cors_response(404, {'error': 'Medication not found'})
        
        return cors_response(200, {'medication': items[0]})
    
    except Exception as e:
        print(f"Error getting medication: {e}")
        return cors_response(500, {'error': str(e)})


def handle_update_medication(event, user_id, medication_id):
    """Update a medication"""
    try:
        body = json.loads(event.get('body', '{}'))
        timestamp = datetime.utcnow().isoformat() + 'Z'
        
        # First find the medication
        response = table.query(
            IndexName='GSI1',
            KeyConditionExpression='GSI1PK = :pk AND GSI1SK = :sk',
            ExpressionAttributeValues={
                ':pk': f'USER#{user_id}',
                ':sk': f'MED#{medication_id}'
            }
        )
        
        items = response.get('Items', [])
        if not items:
            return cors_response(404, {'error': 'Medication not found'})
        
        med = items[0]
        
        # Build update expression
        update_parts = []
        expr_values = {':updatedAt': timestamp}
        expr_names = {}
        
        updatable_fields = [
            'name', 'dosage', 'frequency', 'schedule', 'instructions',
            'prescribedBy', 'pharmacy', 'refillDate', 'pillsRemaining', 'isActive'
        ]
        
        for field in updatable_fields:
            if field in body:
                update_parts.append(f'#{field} = :{field}')
                expr_values[f':{field}'] = body[field]
                expr_names[f'#{field}'] = field
        
        update_parts.append('updatedAt = :updatedAt')
        
        table.update_item(
            Key={'PK': med['PK'], 'SK': med['SK']},
            UpdateExpression='SET ' + ', '.join(update_parts),
            ExpressionAttributeValues=expr_values,
            ExpressionAttributeNames=expr_names if expr_names else None
        )
        
        return cors_response(200, {'message': 'Medication updated successfully'})
    
    except Exception as e:
        print(f"Error updating medication: {e}")
        return cors_response(500, {'error': str(e)})


def handle_delete_medication(event, user_id, medication_id):
    """Delete a medication"""
    try:
        # First find the medication
        response = table.query(
            IndexName='GSI1',
            KeyConditionExpression='GSI1PK = :pk AND GSI1SK = :sk',
            ExpressionAttributeValues={
                ':pk': f'USER#{user_id}',
                ':sk': f'MED#{medication_id}'
            }
        )
        
        items = response.get('Items', [])
        if not items:
            return cors_response(404, {'error': 'Medication not found'})
        
        med = items[0]
        
        table.delete_item(
            Key={'PK': med['PK'], 'SK': med['SK']}
        )
        
        return cors_response(200, {'message': 'Medication deleted successfully'})
    
    except Exception as e:
        print(f"Error deleting medication: {e}")
        return cors_response(500, {'error': str(e)})


def handle_log_medication_taken(event, user_id, medication_id):
    """Log that a medication was taken (or skipped)"""
    try:
        body = json.loads(event.get('body', '{}'))
        timestamp = datetime.utcnow().isoformat() + 'Z'
        
        # First find the medication
        response = table.query(
            IndexName='GSI1',
            KeyConditionExpression='GSI1PK = :pk AND GSI1SK = :sk',
            ExpressionAttributeValues={
                ':pk': f'USER#{user_id}',
                ':sk': f'MED#{medication_id}'
            }
        )
        
        items = response.get('Items', [])
        if not items:
            return cors_response(404, {'error': 'Medication not found'})
        
        med = items[0]
        
        # Create adherence log entry
        log_entry = {
            'logId': str(uuid.uuid4()),
            'date': body.get('date', timestamp[:10]),
            'time': body.get('time', timestamp[11:16]),
            'taken': body.get('taken', True),
            'notes': body.get('notes', ''),
            'loggedAt': timestamp,
            'loggedBy': user_id,
        }
        
        # Append to adherence log
        adherence_log = med.get('adherenceLog', [])
        adherence_log.append(log_entry)
        
        # Update pills remaining if taken
        pills_remaining = med.get('pillsRemaining')
        if body.get('taken', True) and pills_remaining is not None:
            pills_remaining = max(0, pills_remaining - 1)
        
        # Update medication
        update_expr = 'SET adherenceLog = :log, updatedAt = :updatedAt'
        expr_values = {
            ':log': adherence_log,
            ':updatedAt': timestamp
        }
        
        if pills_remaining is not None:
            update_expr += ', pillsRemaining = :pills'
            expr_values[':pills'] = pills_remaining
        
        table.update_item(
            Key={'PK': med['PK'], 'SK': med['SK']},
            UpdateExpression=update_expr,
            ExpressionAttributeValues=expr_values
        )
        
        return cors_response(200, {
            'message': 'Medication logged successfully',
            'logEntry': log_entry,
            'pillsRemaining': pills_remaining
        })
    
    except Exception as e:
        print(f"Error logging medication: {e}")
        return cors_response(500, {'error': str(e)})


def lambda_handler(event, context):
    """Main Lambda handler - route requests"""
    print(f"Event: {json.dumps(event)}")
    
    http_method = event.get('httpMethod', '')
    path = event.get('path', '')
    path_params = event.get('pathParameters', {}) or {}
    
    # Get user ID from Cognito
    user_id = get_user_id(event)
    if not user_id:
        return cors_response(401, {'error': 'Unauthorized'})
    
    # Route based on path and method
    if path == '/medications':
        if http_method == 'GET':
            return handle_get_medications(event, user_id)
        elif http_method == 'POST':
            return handle_create_medication(event, user_id)
    
    elif '/medications/' in path:
        medication_id = path_params.get('medicationId')
        
        if path.endswith('/log'):
            return handle_log_medication_taken(event, user_id, medication_id)
        elif http_method == 'GET':
            return handle_get_medication(event, user_id, medication_id)
        elif http_method == 'PUT':
            return handle_update_medication(event, user_id, medication_id)
        elif http_method == 'DELETE':
            return handle_delete_medication(event, user_id, medication_id)
    
    return cors_response(404, {'error': f'Route not found: {http_method} {path}'})




