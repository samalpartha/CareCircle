"""
CareCircle Health Handler Lambda
Handles health conditions and allergies management
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


# =============================================
# HEALTH CONDITIONS HANDLERS
# =============================================

def handle_get_health_conditions(event, user_id):
    """Get all health conditions for the user"""
    try:
        params = event.get('queryStringParameters', {}) or {}
        elder_id = params.get('elderId')
        
        pk = f'ELDER#{elder_id}' if elder_id else f'USER#{user_id}'
        
        response = table.query(
            KeyConditionExpression='PK = :pk AND begins_with(SK, :sk)',
            ExpressionAttributeValues={
                ':pk': pk,
                ':sk': 'HEALTH#CONDITION#'
            }
        )
        
        conditions = response.get('Items', [])
        
        formatted = []
        for cond in conditions:
            formatted.append({
                'conditionId': cond.get('conditionId'),
                'name': cond.get('name'),
                'severity': cond.get('severity', 'moderate'),
                'diagnosedDate': cond.get('diagnosedDate'),
                'treatedBy': cond.get('treatedBy'),
                'notes': cond.get('notes'),
                'isActive': cond.get('isActive', True),
                'createdAt': cond.get('createdAt'),
            })
        
        return cors_response(200, {'conditions': formatted})
    
    except Exception as e:
        print(f"Error getting health conditions: {e}")
        return cors_response(500, {'error': str(e)})


def handle_create_health_condition(event, user_id):
    """Create a new health condition"""
    try:
        body = json.loads(event.get('body', '{}'))
        
        condition_id = str(uuid.uuid4())
        timestamp = datetime.utcnow().isoformat() + 'Z'
        elder_id = body.get('elderId')
        
        pk = f'ELDER#{elder_id}' if elder_id else f'USER#{user_id}'
        
        condition = {
            'PK': pk,
            'SK': f'HEALTH#CONDITION#{condition_id}',
            'conditionId': condition_id,
            'elderId': elder_id,
            'name': body.get('name'),
            'severity': body.get('severity', 'moderate'),  # mild, moderate, severe
            'diagnosedDate': body.get('diagnosedDate'),
            'treatedBy': body.get('treatedBy'),
            'notes': body.get('notes'),
            'isActive': body.get('isActive', True),
            'createdAt': timestamp,
            'createdBy': user_id,
            # GSI for querying by user
            'GSI1PK': f'USER#{user_id}',
            'GSI1SK': f'HEALTH#CONDITION#{condition_id}',
        }
        
        table.put_item(Item=condition)
        
        return cors_response(201, {
            'message': 'Health condition added',
            'conditionId': condition_id,
            'condition': condition
        })
    
    except Exception as e:
        print(f"Error creating health condition: {e}")
        return cors_response(500, {'error': str(e)})


def handle_delete_health_condition(event, user_id, condition_id):
    """Delete a health condition"""
    try:
        # Find the condition first (via GSI)
        response = table.query(
            IndexName='GSI1',
            KeyConditionExpression='GSI1PK = :pk AND GSI1SK = :sk',
            ExpressionAttributeValues={
                ':pk': f'USER#{user_id}',
                ':sk': f'HEALTH#CONDITION#{condition_id}'
            }
        )
        
        items = response.get('Items', [])
        if not items:
            return cors_response(404, {'error': 'Condition not found'})
        
        item = items[0]
        
        table.delete_item(
            Key={'PK': item['PK'], 'SK': item['SK']}
        )
        
        return cors_response(200, {'message': 'Condition deleted successfully'})
    
    except Exception as e:
        print(f"Error deleting health condition: {e}")
        return cors_response(500, {'error': str(e)})


# =============================================
# ALLERGIES HANDLERS
# =============================================

def handle_get_allergies(event, user_id):
    """Get all allergies for the user"""
    try:
        params = event.get('queryStringParameters', {}) or {}
        elder_id = params.get('elderId')
        
        pk = f'ELDER#{elder_id}' if elder_id else f'USER#{user_id}'
        
        response = table.query(
            KeyConditionExpression='PK = :pk AND begins_with(SK, :sk)',
            ExpressionAttributeValues={
                ':pk': pk,
                ':sk': 'HEALTH#ALLERGY#'
            }
        )
        
        allergies = response.get('Items', [])
        
        formatted = []
        for allergy in allergies:
            formatted.append({
                'allergyId': allergy.get('allergyId'),
                'name': allergy.get('name'),
                'severity': allergy.get('severity', 'moderate'),
                'reaction': allergy.get('reaction'),
                'notes': allergy.get('notes'),
                'createdAt': allergy.get('createdAt'),
            })
        
        return cors_response(200, {'allergies': formatted})
    
    except Exception as e:
        print(f"Error getting allergies: {e}")
        return cors_response(500, {'error': str(e)})


def handle_create_allergy(event, user_id):
    """Create a new allergy"""
    try:
        body = json.loads(event.get('body', '{}'))
        
        allergy_id = str(uuid.uuid4())
        timestamp = datetime.utcnow().isoformat() + 'Z'
        elder_id = body.get('elderId')
        
        pk = f'ELDER#{elder_id}' if elder_id else f'USER#{user_id}'
        
        allergy = {
            'PK': pk,
            'SK': f'HEALTH#ALLERGY#{allergy_id}',
            'allergyId': allergy_id,
            'elderId': elder_id,
            'name': body.get('name'),
            'severity': body.get('severity', 'moderate'),  # mild, moderate, severe, life-threatening
            'reaction': body.get('reaction'),  # e.g., "rash", "anaphylaxis"
            'notes': body.get('notes'),
            'createdAt': timestamp,
            'createdBy': user_id,
            # GSI for querying by user
            'GSI1PK': f'USER#{user_id}',
            'GSI1SK': f'HEALTH#ALLERGY#{allergy_id}',
        }
        
        table.put_item(Item=allergy)
        
        return cors_response(201, {
            'message': 'Allergy added',
            'allergyId': allergy_id,
            'allergy': allergy
        })
    
    except Exception as e:
        print(f"Error creating allergy: {e}")
        return cors_response(500, {'error': str(e)})


def handle_delete_allergy(event, user_id, allergy_id):
    """Delete an allergy"""
    try:
        # Find the allergy first (via GSI)
        response = table.query(
            IndexName='GSI1',
            KeyConditionExpression='GSI1PK = :pk AND GSI1SK = :sk',
            ExpressionAttributeValues={
                ':pk': f'USER#{user_id}',
                ':sk': f'HEALTH#ALLERGY#{allergy_id}'
            }
        )
        
        items = response.get('Items', [])
        if not items:
            return cors_response(404, {'error': 'Allergy not found'})
        
        item = items[0]
        
        table.delete_item(
            Key={'PK': item['PK'], 'SK': item['SK']}
        )
        
        return cors_response(200, {'message': 'Allergy deleted successfully'})
    
    except Exception as e:
        print(f"Error deleting allergy: {e}")
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
    
    # Route: /health-conditions
    if path == '/health-conditions':
        if http_method == 'GET':
            return handle_get_health_conditions(event, user_id)
        elif http_method == 'POST':
            return handle_create_health_condition(event, user_id)
    
    # Route: /health-conditions/{conditionId}
    elif '/health-conditions/' in path:
        condition_id = path_params.get('conditionId')
        if http_method == 'DELETE':
            return handle_delete_health_condition(event, user_id, condition_id)
    
    # Route: /allergies
    elif path == '/allergies':
        if http_method == 'GET':
            return handle_get_allergies(event, user_id)
        elif http_method == 'POST':
            return handle_create_allergy(event, user_id)
    
    # Route: /allergies/{allergyId}
    elif '/allergies/' in path:
        allergy_id = path_params.get('allergyId')
        if http_method == 'DELETE':
            return handle_delete_allergy(event, user_id, allergy_id)
    
    return cors_response(404, {'error': f'Route not found: {http_method} {path}'})




