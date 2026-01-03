"""
API Handlers Lambda Function
Handles CRUD operations for the frontend
"""
import json
import os
import logging
from typing import Dict, Any
from datetime import datetime
import boto3
from boto3.dynamodb.conditions import Key

# Setup logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# AWS Clients
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ.get('DYNAMODB_TABLE', 'CareCircle-Data'))


def create_response(status_code: int, body: Dict[str, Any]) -> Dict[str, Any]:
    """Create standardized API response"""
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        },
        'body': json.dumps(body, default=str),
    }


def get_user_info(event: Dict[str, Any]) -> Dict[str, str]:
    """Extract user ID and username from Cognito claims"""
    try:
        claims = event.get('requestContext', {}).get('authorizer', {}).get('claims', {})
        user_id = claims.get('sub', 'anonymous')
        # Try to get username from various claim fields
        username = (claims.get('cognito:username') or 
                   claims.get('preferred_username') or 
                   claims.get('email') or 
                   user_id)
        # In this app, family_id is currently mapped 1:1 to user_id
        # In the future, this can be changed to lookup family membership
        return {'user_id': user_id, 'username': username, 'family_id': user_id}
    except Exception:
        return {'user_id': 'anonymous', 'username': 'anonymous', 'family_id': 'anonymous'}


def get_user_id(event: Dict[str, Any]) -> str:
    """Helper to just get user_id"""
    return get_user_info(event)['user_id']


def extract_id_from_path(event: Dict[str, Any], position: int = -1) -> str:
    """Helper to extract ID from path segments"""
    from urllib.parse import unquote
    try:
        path = event.get('path', '')
        if path.endswith('/'):
            path = path[:-1]
        segments = path.split('/')
        if segments:
            return unquote(segments[position])
        return ''
    except Exception:
        return ''


def handle_get_alerts(event: Dict[str, Any]) -> Dict[str, Any]:
    """GET /alerts - Retrieve alerts for user's family"""
    try:
        user_info = get_user_info(event)
        family_id = user_info['family_id']
        
        logger.info(f"Getting alerts for family_id={family_id}")
        
        response = table.query(
            KeyConditionExpression=Key('PK').eq(f'FAMILY#{family_id}') & Key('SK').begins_with('ALERT#'),
            ScanIndexForward=False,  # Most recent first
            Limit=20
        )
        
        alerts = response.get('Items', [])
        return create_response(200, alerts)
        
    except Exception as e:
        logger.error(f"Error getting alerts: {e}")
        return create_response(500, {'error': str(e)})


def handle_create_task(event: Dict[str, Any]) -> Dict[str, Any]:
    """POST /tasks - Create a new task"""
    try:
        user_info = get_user_info(event)
        family_id = user_info['family_id']
        user_id = user_info['user_id']
        body = json.loads(event.get('body', '{}'))
        
        now = datetime.utcnow().isoformat() + 'Z'
        task_id = f"TASK#{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
        
        item = {
            'PK': f'FAMILY#{family_id}',
            'SK': task_id,
            'task_id': task_id,
            'title': body.get('title', 'Untitled Task'),
            'description': body.get('description', ''),
            'priority': body.get('priority', 'medium'),
            'status': 'pending',
            'elder_name': body.get('elderName', ''),
            'created_by': user_id,
            'created_at': now,
            'updated_at': now,
        }
        
        table.put_item(Item=item)
        
        return create_response(201, {'success': True, 'task': item})
        
    except Exception as e:
        logger.error(f"Error creating task: {e}")
        return create_response(500, {'error': str(e)})


def handle_get_tasks(event: Dict[str, Any]) -> Dict[str, Any]:
    """GET /tasks - Retrieve tasks with optional filters"""
    try:
        user_info = get_user_info(event)
        family_id = user_info['family_id']
        user_id = user_info['user_id']
        
        query_params = event.get('queryStringParameters') or {}
        assigned_to_me = query_params.get('assignedToMe') == 'true'
        status_filter = query_params.get('status', '')
        
        if assigned_to_me:
            # Query by GSI1 (assigned member index)
            response = table.query(
                IndexName='GSI1',
                KeyConditionExpression=Key('GSI1PK').eq(f'MEMBER#{user_id}')
            )
        else:
            # Query all family tasks
            response = table.query(
                KeyConditionExpression=Key('PK').eq(f'FAMILY#{family_id}') & Key('SK').begins_with('TASK#')
            )
        
        tasks = response.get('Items', [])
        
        # Filter by status if specified
        if status_filter:
            statuses = status_filter.split(',')
            tasks = [t for t in tasks if t.get('status') in statuses]
        
        return create_response(200, tasks)
        
    except Exception as e:
        logger.error(f"Error getting tasks: {e}")
        return create_response(500, {'error': str(e)})


def handle_accept_task(event: Dict[str, Any]) -> Dict[str, Any]:
    """PUT /tasks/{taskId}/accept - Accept a task"""
    try:
        from urllib.parse import unquote
        
        user_info = get_user_info(event)
        user_id = user_info['user_id']
        username = user_info['username']
        family_id = user_info['family_id']
        
        family_id = user_info['family_id']
        
        # Extract task ID from path
        task_id = extract_id_from_path(event, -2) # /tasks/{taskId}/accept
        
        logger.info(f"Accepting task - task: {task_id}, user: {user_id}, username: {username}")
        
        # Update task - store both user_id and username for display
        response = table.update_item(
            Key={
                'PK': f'FAMILY#{family_id}',
                'SK': task_id
            },
            UpdateExpression='SET #status = :status, assigned_to = :user, assigned_to_name = :username, updated_at = :updated',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={
                ':status': 'inProgress',
                ':user': user_id,
                ':username': username,
                ':updated': datetime.utcnow().isoformat() + 'Z'
            },
            ReturnValues='ALL_NEW'
        )
        
        return create_response(200, {'success': True, 'task': response.get('Attributes', {})})
        
    except Exception as e:
        logger.error(f"Error accepting task: {e}")
        return create_response(500, {'error': str(e)})


def handle_complete_task(event: Dict[str, Any]) -> Dict[str, Any]:
    """PUT /tasks/{taskId}/complete - Complete a task"""
    try:
        from urllib.parse import unquote
        
        user_id = get_user_id(event)
        user_id = get_user_id(event)
        # Extract task ID from path
        task_id = extract_id_from_path(event, -2) # /tasks/{taskId}/complete
        family_id = user_id
        
        body = json.loads(event.get('body', '{}'))
        notes = body.get('notes', '')
        
        # Update task
        response = table.update_item(
            Key={
                'PK': f'FAMILY#{family_id}',
                'SK': task_id
            },
            UpdateExpression='SET #status = :status, completed_at = :completed, completion_notes = :notes, updated_at = :updated',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={
                ':status': 'completed',
                ':completed': datetime.utcnow().isoformat() + 'Z',  # Add 'Z' to mark as UTC
                ':notes': notes,
                ':updated': datetime.utcnow().isoformat() + 'Z'  # Add 'Z' to mark as UTC
            },
            ReturnValues='ALL_NEW'
        )
        
        return create_response(200, {'success': True, 'task': response.get('Attributes', {})})
        
    except Exception as e:
        logger.error(f"Error completing task: {e}")
        return create_response(500, {'error': str(e)})


def handle_delete_task(event: Dict[str, Any]) -> Dict[str, Any]:
    """DELETE /tasks/{taskId} - Delete a task"""
    try:
        from urllib.parse import unquote
        
        user_id = get_user_id(event)
        task_id = extract_id_from_path(event) # /tasks/{taskId}
        family_id = user_id
        
        logger.info(f"Deleting task - task: {task_id}, user: {user_id}")
        
        table.delete_item(
            Key={
                'PK': f'FAMILY#{family_id}',
                'SK': task_id
            }
        )
        
        return create_response(200, {'success': True, 'message': 'Task deleted successfully'})
        
    except Exception as e:
        logger.error(f"Error deleting task: {e}")
        return create_response(500, {'error': str(e)})


def handle_delete_alert(event: Dict[str, Any]) -> Dict[str, Any]:
    """DELETE /alerts/{alertId} - Delete an alert"""
    try:
        from urllib.parse import unquote
        
        user_id = get_user_id(event)
        alert_id = extract_id_from_path(event) # /alerts/{alertId}
        family_id = user_id
        
        logger.info(f"Deleting alert - alert: {alert_id}, user: {user_id}")
        
        table.delete_item(
            Key={
                'PK': f'FAMILY#{family_id}',
                'SK': alert_id
            }
        )
        
        return create_response(200, {'success': True, 'message': 'Alert deleted successfully'})
        
    except Exception as e:
        logger.error(f"Error deleting alert: {e}")
        return create_response(500, {'error': str(e)})


def handle_get_analytics(event: Dict[str, Any]) -> Dict[str, Any]:
    """GET /analytics - Get care analytics"""
    try:
        user_id = get_user_id(event)
        family_id = user_id
        
        # Query all tasks for analytics
        response = table.query(
            KeyConditionExpression=Key('PK').eq(f'FAMILY#{family_id}') & Key('SK').begins_with('TASK#')
        )
        
        tasks = response.get('Items', [])
        
        # Calculate metrics
        total_tasks = len(tasks)
        completed_tasks = sum(1 for t in tasks if t.get('status') == 'completed')
        task_completion = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
        
        # Task distribution by member
        member_counts = {}
        for task in tasks:
            member = task.get('assigned_to_name', 'Unassigned')
            member_counts[member] = member_counts.get(member, 0) + 1
        
        tasks_by_member = [
            {'name': member, 'value': count}
            for member, count in member_counts.items()
        ]
        
        analytics = {
            'taskCompletion': round(task_completion),
            'avgResponseTime': 2.5,  # Calculate from timestamps in production
            'activeMembers': len(member_counts),
            'totalTasks': total_tasks,
            'tasksByMember': tasks_by_member,
            'trendsData': [],  # Calculate time-series in production
            'effectivenessData': [],
            'insights': [
                {'type': 'info', 'message': f'{total_tasks} total tasks managed'}
            ]
        }
        
        return create_response(200, analytics)
        
    except Exception as e:
        logger.error(f"Error getting analytics: {e}")
        return create_response(500, {'error': str(e)})


def handle_get_profile(event: Dict[str, Any]) -> Dict[str, Any]:
    """GET /users/{userId}/profile - Get user profile"""
    try:
        # Extract userId from path: /users/{userId}/profile
        user_id = extract_id_from_path(event, -2)
        
        response = table.get_item(
            Key={
                'PK': f'USER#{user_id}',
                'SK': 'PROFILE'
            }
        )
        
        profile = response.get('Item', {})
        return create_response(200, profile)
        
    except Exception as e:
        logger.error(f"Error getting profile: {e}")
        return create_response(500, {'error': str(e)})


def handle_update_profile(event: Dict[str, Any]) -> Dict[str, Any]:
    """PUT /users/profile - Update user profile"""
    try:
        user_id = get_user_id(event)
        body = json.loads(event.get('body', '{}'))
        
        # Update profile
        table.put_item(
            Item={
                'PK': f'USER#{user_id}',
                'SK': 'PROFILE',
                'user_id': user_id,
                'language': body.get('language', 'en'),
                'zipcode': body.get('zipCode', ''),
                'skills': body.get('skills', []),
                'availability': body.get('availability', 'flexible'),
                'notifications': body.get('notifications', {}),
                'updated_at': datetime.utcnow().isoformat() + 'Z'  # Add 'Z' to mark as UTC
            }
        )
        
        return create_response(200, {'success': True})
        
    except Exception as e:
        logger.error(f"Error updating profile: {e}")
        return create_response(500, {'error': str(e)})


# =============================================================================
# FAMILY MANAGEMENT - Elders and Caregivers
# =============================================================================

def handle_get_elders(event: Dict[str, Any]) -> Dict[str, Any]:
    """GET /elders - Get all elders for user's family"""
    try:
        user_info = get_user_info(event)
        family_id = user_info['family_id']
        
        response = table.query(
            KeyConditionExpression=Key('PK').eq(f'FAMILY#{family_id}') & Key('SK').begins_with('ELDER#')
        )
        
        elders = []
        for item in response.get('Items', []):
            elders.append({
                'id': item.get('elder_id', item.get('SK', '').replace('ELDER#', '')),
                'name': item.get('name', ''),
                'age': item.get('age', 0),
                'relationship': item.get('relationship', ''),
                'gender': item.get('gender', ''),
                'location': item.get('location', ''),
                'phone_number': item.get('phone_number', ''),
                'email': item.get('email', ''),
                'conditions': item.get('conditions', []),
                'medications': item.get('medications', []),
                'allergies': item.get('allergies', ''),
                'emergency_contact': item.get('emergency_contact', ''),
                'notes': item.get('notes', ''),
                'createdAt': item.get('created_at', ''),
            })
        
        return create_response(200, elders)
        
    except Exception as e:
        logger.error(f"Error getting elders: {e}")
        return create_response(500, {'error': str(e)})


def handle_create_elder(event: Dict[str, Any]) -> Dict[str, Any]:
    """POST /elders - Create a new elder"""
    try:
        user_info = get_user_info(event)
        family_id = user_info['family_id']
        user_id = user_info['user_id']
        body = json.loads(event.get('body', '{}'))
        
        now = datetime.utcnow().isoformat() + 'Z'
        elder_id = f"ELDER#{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
        
        item = {
            'PK': f'FAMILY#{family_id}',
            'SK': elder_id,
            'elder_id': elder_id,
            'name': body.get('name', ''),
            'age': body.get('age', 0),
            'relationship': body.get('relationship', ''),
            'gender': body.get('gender', ''),
            'location': body.get('location', ''),
            'phone_number': body.get('phone_number') or body.get('phoneNumber', ''),
            'email': body.get('email', ''),
            'conditions': body.get('conditions', []),
            'medications': body.get('medications', []),
            'allergies': body.get('allergies', ''),
            'emergency_contact': body.get('emergency_contact') or body.get('emergencyContact', ''),
            'notes': body.get('notes', ''),
            'created_by': user_id,
            'created_at': now,
            'updated_at': now,
        }
        
        table.put_item(Item=item)
        
        return create_response(201, {
            'id': elder_id,
            'name': item['name'],
            'age': item['age'],
            'relationship': item['relationship'],
            'location': item['location'],
            'phoneNumber': item['phone_number'],
            'conditions': item['conditions'],
            'medications': item['medications'],
            'notes': item['notes'],
            'createdAt': item['created_at'],
        })
        
    except Exception as e:
        logger.error(f"Error creating elder: {e}")
        return create_response(500, {'error': str(e)})


def handle_update_elder(event: Dict[str, Any]) -> Dict[str, Any]:
    """PUT /elders/{elderId} - Update an elder"""
    try:
        user_info = get_user_info(event)
        family_id = user_info['family_id']
        elder_id = extract_id_from_path(event) # /elders/{elderId}
        body = json.loads(event.get('body', '{}'))
        
        # URL decode if needed
        # (Already decoded by extract_id_from_path)
        
        response = table.update_item(
            Key={
                'PK': f'FAMILY#{family_id}',
                'SK': elder_id
            },
            UpdateExpression='SET #name = :name, age = :age, relationship = :rel, gender = :gen, #loc = :loc, phone_number = :phone, email = :email, conditions = :cond, medications = :meds, allergies = :alg, emergency_contact = :emer, notes = :notes, updated_at = :updated',
            ExpressionAttributeNames={'#name': 'name', '#loc': 'location'},
            ExpressionAttributeValues={
                ':name': body.get('name', ''),
                ':age': body.get('age', 0),
                ':rel': body.get('relationship', ''),
                ':gen': body.get('gender', ''),
                ':loc': body.get('location', ''),
                ':phone': body.get('phone_number') or body.get('phoneNumber', ''),
                ':email': body.get('email', ''),
                ':cond': body.get('conditions', []),
                ':meds': body.get('medications', []),
                ':alg': body.get('allergies', ''),
                ':emer': body.get('emergency_contact') or body.get('emergencyContact', ''),
                ':notes': body.get('notes', ''),
                ':updated': datetime.utcnow().isoformat() + 'Z'
            },
            ReturnValues='ALL_NEW'
        )
        
        return create_response(200, {'success': True, 'elder': response.get('Attributes', {})})
        
    except Exception as e:
        logger.error(f"Error updating elder: {e}")
        return create_response(500, {'error': str(e)})


def handle_delete_elder(event: Dict[str, Any]) -> Dict[str, Any]:
    """DELETE /elders/{elderId} - Delete an elder"""
    try:
        user_info = get_user_info(event)
        family_id = user_info['family_id']
        user_info = get_user_info(event)
        family_id = user_info['family_id']
        elder_id = extract_id_from_path(event)
        
        # (Already decoded by extract_id_from_path)
        
        table.delete_item(
            Key={
                'PK': f'FAMILY#{family_id}',
                'SK': elder_id
            }
        )
        
        return create_response(200, {'success': True})
        
    except Exception as e:
        logger.error(f"Error deleting elder: {e}")
        return create_response(500, {'error': str(e)})


def handle_get_caregivers(event: Dict[str, Any]) -> Dict[str, Any]:
    """GET /caregivers - Get all caregivers for user's family"""
    try:
        user_info = get_user_info(event)
        family_id = user_info['family_id']
        
        response = table.query(
            KeyConditionExpression=Key('PK').eq(f'FAMILY#{family_id}') & Key('SK').begins_with('CAREGIVER#')
        )
        
        caregivers = []
        for item in response.get('Items', []):
            caregivers.append({
                'id': item.get('caregiver_id', item.get('SK', '').replace('CAREGIVER#', '')),
                'name': item.get('name', ''),
                'email': item.get('email', ''),
                'phone': item.get('phone', ''),
                'role': item.get('role', ''),
                'relationship': item.get('relationship', ''),
                'skills': item.get('skills', []),
                'availability': item.get('availability', ''),
                'createdAt': item.get('created_at', ''),
            })
        
        return create_response(200, caregivers)
        
    except Exception as e:
        logger.error(f"Error getting caregivers: {e}")
        return create_response(500, {'error': str(e)})


def handle_create_caregiver(event: Dict[str, Any]) -> Dict[str, Any]:
    """POST /caregivers - Create a new caregiver"""
    try:
        user_info = get_user_info(event)
        family_id = user_info['family_id']
        user_id = user_info['user_id']
        body = json.loads(event.get('body', '{}'))
        
        now = datetime.utcnow().isoformat() + 'Z'
        caregiver_id = f"CAREGIVER#{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
        
        item = {
            'PK': f'FAMILY#{family_id}',
            'SK': caregiver_id,
            'caregiver_id': caregiver_id,
            'name': body.get('name', ''),
            'email': body.get('email', ''),
            'phone': body.get('phone', ''),
            'role': body.get('role', 'caregiver'),
            'relationship': body.get('relationship', ''),
            'skills': body.get('skills', []),
            'availability': body.get('availability', 'flexible'),
            'created_by': user_id,
            'created_at': now,
            'updated_at': now,
        }
        
        table.put_item(Item=item)
        
        return create_response(201, {
            'id': caregiver_id,
            'name': item['name'],
            'email': item['email'],
            'phone': item['phone'],
            'role': item['role'],
            'relationship': item['relationship'],
            'skills': item['skills'],
            'availability': item['availability'],
            'createdAt': item['created_at'],
        })
        
    except Exception as e:
        logger.error(f"Error creating caregiver: {e}")
        return create_response(500, {'error': str(e)})


def handle_update_caregiver(event: Dict[str, Any]) -> Dict[str, Any]:
    """PUT /caregivers/{caregiverId} - Update a caregiver"""
    try:
        user_info = get_user_info(event)
        family_id = user_info['family_id']
        user_info = get_user_info(event)
        family_id = user_info['family_id']
        caregiver_id = extract_id_from_path(event)
        body = json.loads(event.get('body', '{}'))
        
        
        # (Already decoded by extract_id_from_path)
        
        response = table.update_item(
            Key={
                'PK': f'FAMILY#{family_id}',
                'SK': caregiver_id
            },
            UpdateExpression='SET #name = :name, email = :email, phone = :phone, #role = :role, relationship = :rel, skills = :skills, availability = :avail, updated_at = :updated',
            ExpressionAttributeNames={'#name': 'name', '#role': 'role'},
            ExpressionAttributeValues={
                ':name': body.get('name', ''),
                ':email': body.get('email', ''),
                ':phone': body.get('phone', ''),
                ':role': body.get('role', 'caregiver'),
                ':rel': body.get('relationship', ''),
                ':skills': body.get('skills', []),
                ':avail': body.get('availability', 'flexible'),
                ':updated': datetime.utcnow().isoformat() + 'Z'
            },
            ReturnValues='ALL_NEW'
        )
        
        return create_response(200, {'success': True, 'caregiver': response.get('Attributes', {})})
        
    except Exception as e:
        logger.error(f"Error updating caregiver: {e}")
        return create_response(500, {'error': str(e)})


def handle_delete_caregiver(event: Dict[str, Any]) -> Dict[str, Any]:
    """DELETE /caregivers/{caregiverId} - Delete a caregiver"""
    try:
        user_info = get_user_info(event)
        family_id = user_info['family_id']
        user_info = get_user_info(event)
        family_id = user_info['family_id']
        caregiver_id = extract_id_from_path(event)
        
        # (Already decoded by extract_id_from_path)
        
        table.delete_item(
            Key={
                'PK': f'FAMILY#{family_id}',
                'SK': caregiver_id
            }
        )
        
        return create_response(200, {'success': True})
        
    except Exception as e:
        logger.error(f"Error deleting caregiver: {e}")
        return create_response(500, {'error': str(e)})


# =============================================
# CALL RECORDS HANDLERS
# =============================================

def handle_get_calls(event: Dict[str, Any]) -> Dict[str, Any]:
    """GET /calls - Retrieve call history"""
    try:
        user_id = get_user_id(event)
        family_id = user_id
        
        response = table.query(
            KeyConditionExpression=Key('PK').eq(f'FAMILY#{family_id}') & Key('SK').begins_with('CALL#'),
            ScanIndexForward=False,
            Limit=50
        )
        
        calls = response.get('Items', [])
        return create_response(200, calls)
        
    except Exception as e:
        logger.error(f"Error getting calls: {e}")
        return create_response(500, {'error': str(e)})


def handle_create_call(event: Dict[str, Any]) -> Dict[str, Any]:
    """POST /calls - Save a call record"""
    try:
        user_id = get_user_id(event)
        family_id = user_id
        body = json.loads(event.get('body', '{}'))
        
        call_id = f"CALL#{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
        
        item = {
            'PK': f'FAMILY#{family_id}',
            'SK': call_id,
            'call_id': call_id,
            'elder_id': body.get('elder_id', ''),
            'elder_name': body.get('elder_name', 'Unknown'),
            'duration_seconds': body.get('duration_seconds', 0),
            'transcript': body.get('transcript', ''),
            'analysis': body.get('analysis', {}),
            'audio_s3_key': body.get('audio_s3_key', ''),
            'caller_id': user_id,
            'created_at': datetime.utcnow().isoformat() + 'Z',
            'status': 'completed'
        }
        
        table.put_item(Item=item)
        
        return create_response(201, {
            'success': True,
            'call_id': call_id,
            'message': 'Call record saved successfully'
        })
        
    except Exception as e:
        logger.error(f"Error creating call record: {e}")
        return create_response(500, {'error': str(e)})


def handle_get_call(event: Dict[str, Any]) -> Dict[str, Any]:
    """GET /calls/{callId} - Get a single call record"""
    try:
        user_id = get_user_id(event)
        family_id = user_id
        user_id = get_user_id(event)
        family_id = user_id
        call_id = extract_id_from_path(event)
        
        # (Already decoded by extract_id_from_path)
        
        response = table.get_item(
            Key={
                'PK': f'FAMILY#{family_id}',
                'SK': call_id
            }
        )
        
        if 'Item' not in response:
            return create_response(404, {'error': 'Call not found'})
            
        return create_response(200, response['Item'])
        
    except Exception as e:
        logger.error(f"Error getting call: {e}")
        return create_response(500, {'error': str(e)})


def handle_delete_call(event: Dict[str, Any]) -> Dict[str, Any]:
    """DELETE /calls/{callId} - Delete a call record"""
    try:
        user_id = get_user_id(event)
        family_id = user_id
        user_id = get_user_id(event)
        family_id = user_id
        call_id = extract_id_from_path(event)
        
        # (Already decoded by extract_id_from_path)
        
        table.delete_item(
            Key={
                'PK': f'FAMILY#{family_id}',
                'SK': call_id
            }
        )
        
        return create_response(200, {'success': True})
        
    except Exception as e:
        logger.error(f"Error deleting call: {e}")
        return create_response(500, {'error': str(e)})


def handle_get_call_audio_url(event: Dict[str, Any]) -> Dict[str, Any]:
    """GET /calls/{callId}/audio-url - Get presigned URL for audio"""
    try:
        import boto3
        user_id = get_user_id(event)
        family_id = user_id
        import boto3
        user_id = get_user_id(event)
        family_id = user_id
        call_id = extract_id_from_path(event, -2) # /calls/{callId}/audio-url
        
        # (Already decoded by extract_id_from_path)
        
        # Get call record to find audio key
        response = table.get_item(
            Key={
                'PK': f'FAMILY#{family_id}',
                'SK': call_id
            }
        )
        
        if 'Item' not in response:
            return create_response(404, {'error': 'Call not found'})
        
        audio_key = response['Item'].get('audio_s3_key', '')
        if not audio_key:
            return create_response(404, {'error': 'No audio recording for this call'})
        
        # Generate presigned URL
        s3_client = boto3.client('s3')
        bucket = os.environ.get('MEDIA_BUCKET', '')
        
        url = s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': bucket, 'Key': audio_key},
            ExpiresIn=3600  # 1 hour
        )
        
        return create_response(200, {'url': url, 'expires_in': 3600})
        
    except Exception as e:
        logger.error(f"Error getting audio URL: {e}")
        return create_response(500, {'error': str(e)})


# =============================================
# MEDICATIONS HANDLERS
# =============================================

def handle_get_medications(event: Dict[str, Any]) -> Dict[str, Any]:
    """GET /medications - Retrieve all medications"""
    try:
        user_id = get_user_id(event)
        family_id = user_id
        
        response = table.query(
            KeyConditionExpression=Key('PK').eq(f'FAMILY#{family_id}') & Key('SK').begins_with('MED#'),
            ScanIndexForward=True
        )
        
        medications = response.get('Items', [])
        return create_response(200, medications)
        
    except Exception as e:
        logger.error(f"Error getting medications: {e}")
        return create_response(500, {'error': str(e)})


def handle_create_medication(event: Dict[str, Any]) -> Dict[str, Any]:
    """POST /medications - Create a medication"""
    try:
        user_id = get_user_id(event)
        family_id = user_id
        body = json.loads(event.get('body', '{}'))
        
        med_id = f"MED#{body.get('name', 'unknown').lower().replace(' ', '-')}-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
        
        item = {
            'PK': f'FAMILY#{family_id}',
            'SK': med_id,
            'medication_id': med_id,
            'name': body.get('name', ''),
            'dosage': body.get('dosage', ''),
            'frequency': body.get('frequency', 'daily'),
            'schedule': body.get('schedule', []),  # e.g., ["08:00", "20:00"]
            'with_food': body.get('with_food', False),
            'purpose': body.get('purpose', ''),
            'prescriber': body.get('prescriber', ''),
            'pharmacy': body.get('pharmacy', {}),
            'refills_remaining': body.get('refills_remaining', 0),
            'elder_id': body.get('elder_id', ''),
            'notes': body.get('notes', ''),
            'image_s3_key': body.get('image_s3_key', ''),
            'active': True,
            'created_at': datetime.utcnow().isoformat() + 'Z',
            'updated_at': datetime.utcnow().isoformat() + 'Z'
        }
        
        table.put_item(Item=item)
        
        return create_response(201, {
            'success': True,
            'medication_id': med_id,
            'medication': item
        })
        
    except Exception as e:
        logger.error(f"Error creating medication: {e}")
        return create_response(500, {'error': str(e)})


def handle_update_medication(event: Dict[str, Any]) -> Dict[str, Any]:
    """PUT /medications/{medicationId} - Update a medication"""
    try:
        user_id = get_user_id(event)
        family_id = user_id
        med_id = event.get('pathParameters', {}).get('medicationId', '')
        body = json.loads(event.get('body', '{}'))
        
        from urllib.parse import unquote
        med_id = unquote(med_id)
        
        response = table.update_item(
            Key={
                'PK': f'FAMILY#{family_id}',
                'SK': med_id
            },
            UpdateExpression='SET #name = :name, dosage = :dosage, frequency = :freq, schedule = :sched, with_food = :food, purpose = :purp, prescriber = :pres, pharmacy = :pharm, refills_remaining = :refills, notes = :notes, active = :active, updated_at = :updated',
            ExpressionAttributeNames={'#name': 'name'},
            ExpressionAttributeValues={
                ':name': body.get('name', ''),
                ':dosage': body.get('dosage', ''),
                ':freq': body.get('frequency', 'daily'),
                ':sched': body.get('schedule', []),
                ':food': body.get('with_food', False),
                ':purp': body.get('purpose', ''),
                ':pres': body.get('prescriber', ''),
                ':pharm': body.get('pharmacy', {}),
                ':refills': body.get('refills_remaining', 0),
                ':notes': body.get('notes', ''),
                ':active': body.get('active', True),
                ':updated': datetime.utcnow().isoformat() + 'Z'
            },
            ReturnValues='ALL_NEW'
        )
        
        return create_response(200, {'success': True, 'medication': response.get('Attributes', {})})
        
    except Exception as e:
        logger.error(f"Error updating medication: {e}")
        return create_response(500, {'error': str(e)})


def handle_delete_medication(event: Dict[str, Any]) -> Dict[str, Any]:
    """DELETE /medications/{medicationId} - Delete a medication"""
    try:
        user_id = get_user_id(event)
        family_id = user_id
        med_id = event.get('pathParameters', {}).get('medicationId', '')
        
        from urllib.parse import unquote
        med_id = unquote(med_id)
        
        table.delete_item(
            Key={
                'PK': f'FAMILY#{family_id}',
                'SK': med_id
            }
        )
        
        return create_response(200, {'success': True})
        
    except Exception as e:
        logger.error(f"Error deleting medication: {e}")
        return create_response(500, {'error': str(e)})


def handle_log_medication_taken(event: Dict[str, Any]) -> Dict[str, Any]:
    """POST /medications/{medicationId}/log - Log that medication was taken"""
    try:
        user_id = get_user_id(event)
        family_id = user_id
        med_id = event.get('pathParameters', {}).get('medicationId', '')
        body = json.loads(event.get('body', '{}'))
        
        from urllib.parse import unquote
        med_id = unquote(med_id)
        
        log_id = f"MEDLOG#{med_id}#{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
        
        item = {
            'PK': f'FAMILY#{family_id}',
            'SK': log_id,
            'log_id': log_id,
            'medication_id': med_id,
            'taken_at': datetime.utcnow().isoformat() + 'Z',
            'scheduled_time': body.get('scheduled_time', ''),
            'status': body.get('status', 'taken'),  # taken, skipped, late
            'notes': body.get('notes', ''),
            'logged_by': user_id
        }
        
        table.put_item(Item=item)
        
        return create_response(201, {'success': True, 'log_id': log_id})
        
    except Exception as e:
        logger.error(f"Error logging medication: {e}")
        return create_response(500, {'error': str(e)})


# =============================================
# EMERGENCY CONTACTS HANDLERS
# =============================================

def handle_get_emergency_contacts(event: Dict[str, Any]) -> Dict[str, Any]:
    """GET /emergency-contacts - Retrieve all emergency contacts"""
    try:
        user_id = get_user_id(event)
        family_id = user_id
        
        response = table.query(
            KeyConditionExpression=Key('PK').eq(f'FAMILY#{family_id}') & Key('SK').begins_with('CONTACT#'),
            ScanIndexForward=True
        )
        
        contacts = response.get('Items', [])
        return create_response(200, contacts)
        
    except Exception as e:
        logger.error(f"Error getting emergency contacts: {e}")
        return create_response(500, {'error': str(e)})


def handle_create_emergency_contact(event: Dict[str, Any]) -> Dict[str, Any]:
    """POST /emergency-contacts - Create an emergency contact"""
    try:
        user_id = get_user_id(event)
        family_id = user_id
        body = json.loads(event.get('body', '{}'))
        
        contact_id = f"CONTACT#{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
        
        item = {
            'PK': f'FAMILY#{family_id}',
            'SK': contact_id,
            'contact_id': contact_id,
            'name': body.get('name', ''),
            'phone': body.get('phone', ''),
            'email': body.get('email', ''),
            'relationship': body.get('relationship', ''),
            'contact_type': body.get('contact_type', 'family'),  # family, neighbor, medical, emergency
            'is_local': body.get('is_local', False),  # Can respond quickly
            'response_time_minutes': body.get('response_time_minutes', 30),
            'has_key': body.get('has_key', False),  # Has access to home
            'priority': body.get('priority', 1),  # Escalation order
            'notes': body.get('notes', ''),
            'created_at': datetime.utcnow().isoformat() + 'Z'
        }
        
        table.put_item(Item=item)
        
        return create_response(201, {
            'success': True,
            'contact_id': contact_id,
            'contact': item
        })
        
    except Exception as e:
        logger.error(f"Error creating emergency contact: {e}")
        return create_response(500, {'error': str(e)})


def handle_update_emergency_contact(event: Dict[str, Any]) -> Dict[str, Any]:
    """PUT /emergency-contacts/{contactId} - Update an emergency contact"""
    try:
        user_id = get_user_id(event)
        family_id = user_id
        contact_id = event.get('pathParameters', {}).get('contactId', '')
        body = json.loads(event.get('body', '{}'))
        
        from urllib.parse import unquote
        contact_id = unquote(contact_id)
        
        response = table.update_item(
            Key={
                'PK': f'FAMILY#{family_id}',
                'SK': contact_id
            },
            UpdateExpression='SET #name = :name, phone = :phone, email = :email, relationship = :rel, contact_type = :type, is_local = :local, response_time_minutes = :resp, has_key = :key, priority = :pri, notes = :notes, updated_at = :updated',
            ExpressionAttributeNames={'#name': 'name'},
            ExpressionAttributeValues={
                ':name': body.get('name', ''),
                ':phone': body.get('phone', ''),
                ':email': body.get('email', ''),
                ':rel': body.get('relationship', ''),
                ':type': body.get('contact_type', 'family'),
                ':local': body.get('is_local', False),
                ':resp': body.get('response_time_minutes', 30),
                ':key': body.get('has_key', False),
                ':pri': body.get('priority', 1),
                ':notes': body.get('notes', ''),
                ':updated': datetime.utcnow().isoformat() + 'Z'
            },
            ReturnValues='ALL_NEW'
        )
        
        return create_response(200, {'success': True, 'contact': response.get('Attributes', {})})
        
    except Exception as e:
        logger.error(f"Error updating emergency contact: {e}")
        return create_response(500, {'error': str(e)})


def handle_delete_emergency_contact(event: Dict[str, Any]) -> Dict[str, Any]:
    """DELETE /emergency-contacts/{contactId} - Delete an emergency contact"""
    try:
        user_id = get_user_id(event)
        family_id = user_id
        contact_id = event.get('pathParameters', {}).get('contactId', '')
        
        from urllib.parse import unquote
        contact_id = unquote(contact_id)
        
        table.delete_item(
            Key={
                'PK': f'FAMILY#{family_id}',
                'SK': contact_id
            }
        )
        
        return create_response(200, {'success': True})
        
    except Exception as e:
        logger.error(f"Error deleting emergency contact: {e}")
        return create_response(500, {'error': str(e)})


def handle_get_medical_id(event: Dict[str, Any]) -> Dict[str, Any]:
    """GET /medical-id - Generate medical ID card data"""
    try:
        user_id = get_user_id(event)
        family_id = user_id
        
        # Get elder info
        elder_response = table.query(
            KeyConditionExpression=Key('PK').eq(f'FAMILY#{family_id}') & Key('SK').begins_with('ELDER#'),
            Limit=1
        )
        elder = elder_response.get('Items', [{}])[0] if elder_response.get('Items') else {}
        
        # Get medications
        med_response = table.query(
            KeyConditionExpression=Key('PK').eq(f'FAMILY#{family_id}') & Key('SK').begins_with('MED#')
        )
        medications = [m.get('name', '') + ' ' + m.get('dosage', '') for m in med_response.get('Items', []) if m.get('active', True)]
        
        # Get health conditions
        cond_response = table.query(
            KeyConditionExpression=Key('PK').eq(f'FAMILY#{family_id}') & Key('SK').begins_with('CONDITION#')
        )
        conditions = [c.get('name', '') for c in cond_response.get('Items', [])]
        
        # Get allergies
        allergy_response = table.query(
            KeyConditionExpression=Key('PK').eq(f'FAMILY#{family_id}') & Key('SK').begins_with('ALLERGY#')
        )
        allergies = [a.get('name', '') for a in allergy_response.get('Items', [])]
        
        # Get emergency contacts (top 3)
        contact_response = table.query(
            KeyConditionExpression=Key('PK').eq(f'FAMILY#{family_id}') & Key('SK').begins_with('CONTACT#'),
            Limit=3
        )
        contacts = [{
            'name': c.get('name', ''),
            'phone': c.get('phone', ''),
            'relationship': c.get('relationship', '')
        } for c in contact_response.get('Items', [])]
        
        medical_id = {
            'name': elder.get('name', 'Unknown'),
            'date_of_birth': elder.get('date_of_birth', ''),
            'blood_type': elder.get('blood_type', ''),
            'weight': elder.get('weight', ''),
            'languages': elder.get('languages', ['English']),
            'conditions': conditions,
            'allergies': allergies,
            'medications': medications,
            'emergency_contacts': contacts,
            'generated_at': datetime.utcnow().isoformat() + 'Z'
        }
        
        return create_response(200, medical_id)
        
    except Exception as e:
        logger.error(f"Error generating medical ID: {e}")
        return create_response(500, {'error': str(e)})


# =============================================
# HEALTH CONDITIONS & ALLERGIES HANDLERS
# =============================================

def handle_get_conditions(event: Dict[str, Any]) -> Dict[str, Any]:
    """GET /health-conditions - Retrieve health conditions"""
    try:
        user_id = get_user_id(event)
        family_id = user_id
        
        response = table.query(
            KeyConditionExpression=Key('PK').eq(f'FAMILY#{family_id}') & Key('SK').begins_with('CONDITION#')
        )
        
        return create_response(200, response.get('Items', []))
        
    except Exception as e:
        logger.error(f"Error getting conditions: {e}")
        return create_response(500, {'error': str(e)})


def handle_create_condition(event: Dict[str, Any]) -> Dict[str, Any]:
    """POST /health-conditions - Create a health condition"""
    try:
        user_id = get_user_id(event)
        family_id = user_id
        body = json.loads(event.get('body', '{}'))
        
        cond_id = f"CONDITION#{body.get('name', 'unknown').lower().replace(' ', '-')}"
        
        item = {
            'PK': f'FAMILY#{family_id}',
            'SK': cond_id,
            'condition_id': cond_id,
            'name': body.get('name', ''),
            'diagnosed_date': body.get('diagnosed_date', ''),
            'severity': body.get('severity', 'moderate'),
            'notes': body.get('notes', ''),
            'created_at': datetime.utcnow().isoformat() + 'Z'
        }
        
        table.put_item(Item=item)
        return create_response(201, {'success': True, 'condition': item})
        
    except Exception as e:
        logger.error(f"Error creating condition: {e}")
        return create_response(500, {'error': str(e)})


def handle_delete_condition(event: Dict[str, Any]) -> Dict[str, Any]:
    """DELETE /health-conditions/{conditionId} - Delete a condition"""
    try:
        user_id = get_user_id(event)
        family_id = user_id
        cond_id = event.get('pathParameters', {}).get('conditionId', '')
        
        from urllib.parse import unquote
        cond_id = unquote(cond_id)
        
        table.delete_item(Key={'PK': f'FAMILY#{family_id}', 'SK': cond_id})
        return create_response(200, {'success': True})
        
    except Exception as e:
        logger.error(f"Error deleting condition: {e}")
        return create_response(500, {'error': str(e)})


def handle_get_allergies(event: Dict[str, Any]) -> Dict[str, Any]:
    """GET /allergies - Retrieve allergies"""
    try:
        user_id = get_user_id(event)
        family_id = user_id
        
        response = table.query(
            KeyConditionExpression=Key('PK').eq(f'FAMILY#{family_id}') & Key('SK').begins_with('ALLERGY#')
        )
        
        return create_response(200, response.get('Items', []))
        
    except Exception as e:
        logger.error(f"Error getting allergies: {e}")
        return create_response(500, {'error': str(e)})


def handle_create_allergy(event: Dict[str, Any]) -> Dict[str, Any]:
    """POST /allergies - Create an allergy"""
    try:
        user_id = get_user_id(event)
        family_id = user_id
        body = json.loads(event.get('body', '{}'))
        
        allergy_id = f"ALLERGY#{body.get('name', 'unknown').lower().replace(' ', '-')}"
        
        item = {
            'PK': f'FAMILY#{family_id}',
            'SK': allergy_id,
            'allergy_id': allergy_id,
            'name': body.get('name', ''),
            'severity': body.get('severity', 'moderate'),  # mild, moderate, severe
            'reaction': body.get('reaction', ''),
            'notes': body.get('notes', ''),
            'created_at': datetime.utcnow().isoformat() + 'Z'
        }
        
        table.put_item(Item=item)
        return create_response(201, {'success': True, 'allergy': item})
        
    except Exception as e:
        logger.error(f"Error creating allergy: {e}")
        return create_response(500, {'error': str(e)})


def handle_delete_allergy(event: Dict[str, Any]) -> Dict[str, Any]:
    """DELETE /allergies/{allergyId} - Delete an allergy"""
    try:
        user_id = get_user_id(event)
        family_id = user_id
        allergy_id = event.get('pathParameters', {}).get('allergyId', '')
        
        from urllib.parse import unquote
        allergy_id = unquote(allergy_id)
        
        table.delete_item(Key={'PK': f'FAMILY#{family_id}', 'SK': allergy_id})
        return create_response(200, {'success': True})
        
    except Exception as e:
        logger.error(f"Error deleting allergy: {e}")
        return create_response(500, {'error': str(e)})


# =============================================
# WELLNESS HANDLERS
# =============================================

def handle_get_wellness(event: Dict[str, Any]) -> Dict[str, Any]:
    """GET /wellness - Retrieve wellness scores"""
    try:
        user_id = get_user_id(event)
        family_id = user_id
        
        response = table.query(
            KeyConditionExpression=Key('PK').eq(f'FAMILY#{family_id}') & Key('SK').begins_with('WELLNESS#'),
            ScanIndexForward=False,
            Limit=30  # Last 30 days
        )
        
        return create_response(200, response.get('Items', []))
        
    except Exception as e:
        logger.error(f"Error getting wellness data: {e}")
        return create_response(500, {'error': str(e)})


def handle_log_wellness(event: Dict[str, Any]) -> Dict[str, Any]:
    """POST /wellness - Log daily wellness"""
    try:
        user_id = get_user_id(event)
        family_id = user_id
        body = json.loads(event.get('body', '{}'))
        
        today = datetime.utcnow().strftime('%Y-%m-%d')
        wellness_id = f"WELLNESS#{today}"
        
        item = {
            'PK': f'FAMILY#{family_id}',
            'SK': wellness_id,
            'wellness_id': wellness_id,
            'date': today,
            'mood_score': body.get('mood_score', 5),  # 1-10
            'sleep_quality': body.get('sleep_quality', 5),  # 1-10
            'pain_level': body.get('pain_level', 0),  # 0-10
            'energy_level': body.get('energy_level', 5),  # 1-10
            'social_interaction': body.get('social_interaction', False),
            'notes': body.get('notes', ''),
            'logged_by': user_id,
            'created_at': datetime.utcnow().isoformat() + 'Z'
        }
        
        table.put_item(Item=item)
        return create_response(201, {'success': True, 'wellness': item})
        
    except Exception as e:
        logger.error(f"Error logging wellness: {e}")
        return create_response(500, {'error': str(e)})


# =============================================
# ACTION HISTORY HANDLERS
# =============================================

def handle_create_action(event: Dict[str, Any]) -> Dict[str, Any]:
    """POST /actions - Record an action taken"""
    try:
        user_id = get_user_id(event)
        family_id = user_id
        body = json.loads(event.get('body', '{}'))
        
        now = datetime.utcnow().isoformat() + 'Z'
        # SK is timestamp-based for time-series access
        action_id = f"ACTION#{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
        
        item = {
            'PK': f'FAMILY#{family_id}',
            'SK': action_id,
            'action_id': action_id,
            'alert_id': body.get('alertId', ''),
            'action_type': body.get('actionType', 'general'),
            'description': body.get('description', ''),
            'completed_steps': body.get('completedSteps', {}),
            'notes': body.get('notes', ''),
            'assigned_to': body.get('assignTo', ''),
            'escalation_hours': body.get('escalateHours', 0),
            'outcome': body.get('outcome', 'resolved'),  # resolved, monitoring, escalated
            'performed_by': user_id,
            'created_at': now
        }
        
        table.put_item(Item=item)
        
        return create_response(201, {'success': True, 'action': item})
        
    except Exception as e:
        logger.error(f"Error creating action: {e}")
        return create_response(500, {'error': str(e)})


def handle_get_actions(event: Dict[str, Any]) -> Dict[str, Any]:
    """GET /actions - Retrieve action history"""
    try:
        user_id = get_user_id(event)
        family_id = user_id
        
        # Query actions for the family
        response = table.query(
            KeyConditionExpression=Key('PK').eq(f'FAMILY#{family_id}') & Key('SK').begins_with('ACTION#'),
            ScanIndexForward=False,  # Most recent first
            Limit=50
        )
        
        actions = response.get('Items', [])
        return create_response(200, actions)
        
    except Exception as e:
        logger.error(f"Error getting actions: {e}")
        return create_response(500, {'error': str(e)})



def handle_get_docs(event: Dict[str, Any]) -> Dict[str, Any]:
    """GET /docs - Serve Swagger UI"""
    html_content = """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>CareCircle API Documentation</title>
        <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
    </head>
    <body>
        <div id="swagger-ui"></div>
        <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
        <script>
            window.onload = () => {
                window.ui = SwaggerUIBundle({
                    url: '/openapi.json',
                    dom_id: '#swagger-ui',
                    deepLinking: true,
                    presets: [
                        SwaggerUIBundle.presets.apis,
                    ],
                });
            };
        </script>
    </body>
    </html>
    """
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'text/html',
            'Access-Control-Allow-Origin': '*',
        },
        'body': html_content,
    }


def handle_get_openapi(event: Dict[str, Any]) -> Dict[str, Any]:
    """GET /openapi.json - Serve OpenAPI definition"""
    try:
        file_path = os.path.join(os.path.dirname(__file__), 'openapi.json')
        with open(file_path, 'r') as f:
            openapi_data = json.load(f)
        return create_response(200, openapi_data)
    except Exception as e:
        logger.error(f"Error serving openapi.json: {e}")
        return create_response(500, {'error': 'Could not load API definition'})


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Main router for API requests"""
    try:
        http_method = event.get('httpMethod', '')
        path = event.get('path', '')
        if path.endswith('/') and len(path) > 1:
            path = path[:-1]
        
        # Handle OPTIONS for CORS preflight
        if http_method == 'OPTIONS':
            return create_response(200, {})
            
        # Route to appropriate handler
        if path in ['/', '', '/health', '/status']:
            return create_response(200, {"status": "healthy", "service": "CareCircle API"})
        elif path == '/docs' and http_method == 'GET':
            return handle_get_docs(event)
        elif path == '/openapi.json' and http_method == 'GET':
            return handle_get_openapi(event)
        elif path == '/alerts' and http_method == 'GET':
            return handle_get_alerts(event)
        elif '/alerts/' in path and http_method == 'DELETE':
            return handle_delete_alert(event)
        elif path == '/actions' and http_method == 'GET':
            return handle_get_actions(event)
        elif path == '/actions' and http_method == 'POST':
            return handle_create_action(event)
        elif path == '/tasks' and http_method == 'GET':
            return handle_get_tasks(event)
        elif path == '/tasks' and http_method == 'POST':
            return handle_create_task(event)
        elif '/tasks/' in path and path.endswith('/accept') and http_method == 'PUT':
            return handle_accept_task(event)
        elif '/tasks/' in path and path.endswith('/complete') and http_method == 'PUT':
            return handle_complete_task(event)
        elif '/tasks/' in path and http_method == 'DELETE':
            return handle_delete_task(event)
        elif path == '/analytics' and http_method == 'GET':
            return handle_get_analytics(event)
        elif '/users/' in path and path.endswith('/profile') and http_method == 'GET':
            return handle_get_profile(event)
        elif path == '/users/profile' and http_method == 'PUT':
            return handle_update_profile(event)
        # Elder management
        elif path == '/elders' and http_method == 'GET':
            return handle_get_elders(event)
        elif path == '/elders' and http_method == 'POST':
            return handle_create_elder(event)
        elif '/elders/' in path and http_method == 'PUT':
            return handle_update_elder(event)
        elif '/elders/' in path and http_method == 'DELETE':
            return handle_delete_elder(event)
        # Caregiver management
        elif path == '/caregivers' and http_method == 'GET':
            return handle_get_caregivers(event)
        elif path == '/caregivers' and http_method == 'POST':
            return handle_create_caregiver(event)
        elif '/caregivers/' in path and http_method == 'PUT':
            return handle_update_caregiver(event)
        elif '/caregivers/' in path and http_method == 'DELETE':
            return handle_delete_caregiver(event)
        # Call records
        elif path == '/calls' and http_method == 'GET':
            return handle_get_calls(event)
        elif path == '/calls' and http_method == 'POST':
            return handle_create_call(event)
        elif '/calls/' in path and path.endswith('/audio-url') and http_method == 'GET':
            return handle_get_call_audio_url(event)
        elif '/calls/' in path and http_method == 'GET':
            return handle_get_call(event)
        elif '/calls/' in path and http_method == 'DELETE':
            return handle_delete_call(event)
        # Medications
        elif path == '/medications' and http_method == 'GET':
            return handle_get_medications(event)
        elif path == '/medications' and http_method == 'POST':
            return handle_create_medication(event)
        elif '/medications/' in path and path.endswith('/log') and http_method == 'POST':
            return handle_log_medication_taken(event)
        elif '/medications/' in path and http_method == 'PUT':
            return handle_update_medication(event)
        elif '/medications/' in path and http_method == 'DELETE':
            return handle_delete_medication(event)
        # Emergency contacts
        elif path == '/emergency-contacts' and http_method == 'GET':
            return handle_get_emergency_contacts(event)
        elif path == '/emergency-contacts' and http_method == 'POST':
            return handle_create_emergency_contact(event)
        elif '/emergency-contacts/' in path and http_method == 'PUT':
            return handle_update_emergency_contact(event)
        elif '/emergency-contacts/' in path and http_method == 'DELETE':
            return handle_delete_emergency_contact(event)
        # Medical ID
        elif path == '/medical-id' and http_method == 'GET':
            return handle_get_medical_id(event)
        # Health conditions
        elif path == '/health-conditions' and http_method == 'GET':
            return handle_get_conditions(event)
        elif path == '/health-conditions' and http_method == 'POST':
            return handle_create_condition(event)
        elif '/health-conditions/' in path and http_method == 'DELETE':
            return handle_delete_condition(event)
        # Allergies
        elif path == '/allergies' and http_method == 'GET':
            return handle_get_allergies(event)
        elif path == '/allergies' and http_method == 'POST':
            return handle_create_allergy(event)
        elif '/allergies/' in path and http_method == 'DELETE':
            return handle_delete_allergy(event)
        # Wellness
        elif path == '/wellness' and http_method == 'GET':
            return handle_get_wellness(event)
        elif path == '/wellness' and http_method == 'POST':
            return handle_log_wellness(event)
        else:
            logger.info(f"Unhandled route: {http_method} {path}")
            return create_response(404, {'error': 'Not found'})
            
    except Exception as e:
        logger.error(f"Error in API handler: {e}", exc_info=True)
        return create_response(500, {'error': str(e)})

