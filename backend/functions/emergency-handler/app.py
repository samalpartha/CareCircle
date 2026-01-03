"""
CareCircle Emergency Handler Lambda
Handles emergency contacts and Medical ID operations
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
# EMERGENCY CONTACTS HANDLERS
# =============================================

def handle_get_emergency_contacts(event, user_id):
    """Get all emergency contacts for the user"""
    try:
        response = table.query(
            KeyConditionExpression='PK = :pk AND begins_with(SK, :sk)',
            ExpressionAttributeValues={
                ':pk': f'USER#{user_id}',
                ':sk': 'EMERGENCY#CONTACT#'
            }
        )
        
        contacts = response.get('Items', [])
        
        # Format for frontend
        formatted = []
        for contact in contacts:
            formatted.append({
                'contactId': contact.get('contactId'),
                'name': contact.get('name'),
                'phone': contact.get('phone'),
                'email': contact.get('email'),
                'relationship': contact.get('relationship'),
                'contact_type': contact.get('contact_type', 'family'),
                'is_local': contact.get('is_local', False),
                'response_time_minutes': contact.get('response_time_minutes', 30),
                'has_key': contact.get('has_key', False),
                'priority': contact.get('priority', 1),
                'notes': contact.get('notes'),
                'createdAt': contact.get('createdAt'),
            })
        
        # Sort by priority
        formatted.sort(key=lambda x: (not x.get('is_local', False), x.get('priority', 99)))
        
        return cors_response(200, {'contacts': formatted})
    
    except Exception as e:
        print(f"Error getting emergency contacts: {e}")
        return cors_response(500, {'error': str(e)})


def handle_create_emergency_contact(event, user_id):
    """Create a new emergency contact"""
    try:
        body = json.loads(event.get('body', '{}'))
        
        contact_id = str(uuid.uuid4())
        timestamp = datetime.utcnow().isoformat() + 'Z'
        
        contact = {
            'PK': f'USER#{user_id}',
            'SK': f'EMERGENCY#CONTACT#{contact_id}',
            'contactId': contact_id,
            'name': body.get('name'),
            'phone': body.get('phone'),
            'email': body.get('email'),
            'relationship': body.get('relationship'),
            'contact_type': body.get('contact_type', 'family'),
            'is_local': body.get('is_local', False),
            'response_time_minutes': body.get('response_time_minutes', 30),
            'has_key': body.get('has_key', False),
            'priority': body.get('priority', 1),
            'notes': body.get('notes'),
            'createdAt': timestamp,
            'updatedAt': timestamp,
        }
        
        table.put_item(Item=contact)
        
        return cors_response(201, {
            'message': 'Emergency contact created',
            'contactId': contact_id,
            'contact': contact
        })
    
    except Exception as e:
        print(f"Error creating emergency contact: {e}")
        return cors_response(500, {'error': str(e)})


def handle_update_emergency_contact(event, user_id, contact_id):
    """Update an emergency contact"""
    try:
        body = json.loads(event.get('body', '{}'))
        timestamp = datetime.utcnow().isoformat() + 'Z'
        
        # Build update expression
        update_parts = ['updatedAt = :updatedAt']
        expr_values = {':updatedAt': timestamp}
        expr_names = {}
        
        updatable = ['name', 'phone', 'email', 'relationship', 'contact_type',
                     'is_local', 'response_time_minutes', 'has_key', 'priority', 'notes']
        
        for field in updatable:
            if field in body:
                update_parts.append(f'#{field} = :{field}')
                expr_values[f':{field}'] = body[field]
                expr_names[f'#{field}'] = field
        
        table.update_item(
            Key={
                'PK': f'USER#{user_id}',
                'SK': f'EMERGENCY#CONTACT#{contact_id}'
            },
            UpdateExpression='SET ' + ', '.join(update_parts),
            ExpressionAttributeValues=expr_values,
            ExpressionAttributeNames=expr_names if expr_names else None
        )
        
        return cors_response(200, {'message': 'Contact updated successfully'})
    
    except Exception as e:
        print(f"Error updating emergency contact: {e}")
        return cors_response(500, {'error': str(e)})


def handle_delete_emergency_contact(event, user_id, contact_id):
    """Delete an emergency contact"""
    try:
        table.delete_item(
            Key={
                'PK': f'USER#{user_id}',
                'SK': f'EMERGENCY#CONTACT#{contact_id}'
            }
        )
        
        return cors_response(200, {'message': 'Contact deleted successfully'})
    
    except Exception as e:
        print(f"Error deleting emergency contact: {e}")
        return cors_response(500, {'error': str(e)})


# =============================================
# MEDICAL ID HANDLER
# =============================================

def handle_get_medical_id(event, user_id):
    """Get or generate Medical ID card for user"""
    try:
        # Get user profile
        profile_response = table.get_item(
            Key={
                'PK': f'USER#{user_id}',
                'SK': 'PROFILE'
            }
        )
        profile = profile_response.get('Item', {})
        
        # Get medications
        meds_response = table.query(
            IndexName='GSI1',
            KeyConditionExpression='GSI1PK = :pk AND begins_with(GSI1SK, :sk)',
            ExpressionAttributeValues={
                ':pk': f'USER#{user_id}',
                ':sk': 'MED#'
            }
        )
        medications = [m.get('name') for m in meds_response.get('Items', [])]
        
        # Get health conditions
        conditions_response = table.query(
            IndexName='GSI1',
            KeyConditionExpression='GSI1PK = :pk AND begins_with(GSI1SK, :sk)',
            ExpressionAttributeValues={
                ':pk': f'USER#{user_id}',
                ':sk': 'HEALTH#CONDITION#'
            }
        )
        conditions = [c.get('name') for c in conditions_response.get('Items', []) if c.get('isActive', True)]
        
        # Get allergies
        allergies_response = table.query(
            IndexName='GSI1',
            KeyConditionExpression='GSI1PK = :pk AND begins_with(GSI1SK, :sk)',
            ExpressionAttributeValues={
                ':pk': f'USER#{user_id}',
                ':sk': 'HEALTH#ALLERGY#'
            }
        )
        allergies = [a.get('name') for a in allergies_response.get('Items', [])]
        
        # Get emergency contacts (top 3)
        contacts_response = table.query(
            KeyConditionExpression='PK = :pk AND begins_with(SK, :sk)',
            ExpressionAttributeValues={
                ':pk': f'USER#{user_id}',
                ':sk': 'EMERGENCY#CONTACT#'
            },
            Limit=3
        )
        emergency_contacts = [{
            'name': c.get('name'),
            'phone': c.get('phone'),
            'relationship': c.get('relationship')
        } for c in contacts_response.get('Items', [])]
        
        # Build Medical ID from live data
        medical_id = {
            'name': profile.get('name', profile.get('preferred_username', 'Not set')),
            'date_of_birth': profile.get('date_of_birth'),
            'blood_type': profile.get('blood_type'),
            'weight': profile.get('weight'),
            'conditions': conditions,
            'allergies': allergies,
            'medications': medications,
            'emergency_contacts': emergency_contacts,
            'generated_at': datetime.utcnow().isoformat() + 'Z',
        }
        
        return cors_response(200, medical_id)
    
    except Exception as e:
        print(f"Error getting medical ID: {e}")
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
    
    # Route: /emergency-contacts
    if path == '/emergency-contacts':
        if http_method == 'GET':
            return handle_get_emergency_contacts(event, user_id)
        elif http_method == 'POST':
            return handle_create_emergency_contact(event, user_id)
    
    # Route: /emergency-contacts/{contactId}
    elif '/emergency-contacts/' in path:
        contact_id = path_params.get('contactId')
        if http_method == 'PUT':
            return handle_update_emergency_contact(event, user_id, contact_id)
        elif http_method == 'DELETE':
            return handle_delete_emergency_contact(event, user_id, contact_id)
    
    # Route: /medical-id
    elif path == '/medical-id':
        if http_method == 'GET':
            return handle_get_medical_id(event, user_id)
    
    return cors_response(404, {'error': f'Route not found: {http_method} {path}'})

