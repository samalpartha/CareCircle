"""
CareCircle Calls Handler Lambda
Handles all call record operations: CRUD + audio URL generation
"""
import json
import os
import boto3
import uuid
from datetime import datetime
from decimal import Decimal

# Initialize AWS clients
dynamodb = boto3.resource('dynamodb')
s3 = boto3.client('s3')

table_name = os.environ.get('DYNAMODB_TABLE', 'CareCircle-Data-v2')
media_bucket = os.environ.get('MEDIA_BUCKET', '')
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


def handle_get_calls(event, user_id):
    """Get all calls for the user"""
    try:
        # Query calls using GSI or scan with filter
        response = table.query(
            KeyConditionExpression='PK = :pk AND begins_with(SK, :sk)',
            ExpressionAttributeValues={
                ':pk': f'USER#{user_id}',
                ':sk': 'CALL#'
            },
            ScanIndexForward=False,  # Most recent first
            Limit=50
        )
        
        calls = response.get('Items', [])
        
        # Transform for frontend
        formatted_calls = []
        for call in calls:
            formatted_calls.append({
                'callId': call.get('callId'),
                'elderId': call.get('elderId'),
                'elderName': call.get('elderName', 'Unknown'),
                'duration': call.get('duration', 0),
                'transcript': call.get('transcript', ''),
                'analysis': call.get('analysis', {}),
                'audioS3Key': call.get('audioS3Key'),
                'createdAt': call.get('createdAt'),
                'sentimentScore': call.get('sentimentScore'),
            })
        
        return cors_response(200, {'calls': formatted_calls})
    
    except Exception as e:
        print(f"Error getting calls: {e}")
        return cors_response(500, {'error': str(e)})


def handle_create_call(event, user_id):
    """Create a new call record"""
    try:
        body = json.loads(event.get('body', '{}'))
        
        call_id = str(uuid.uuid4())
        timestamp = datetime.utcnow().isoformat() + 'Z'
        
        # Build call record
        call_record = {
            'PK': f'USER#{user_id}',
            'SK': f'CALL#{timestamp}#{call_id}',
            'callId': call_id,
            'elderId': body.get('elderId'),
            'elderName': body.get('elderName', 'Unknown'),
            'duration': body.get('duration', 0),
            'transcript': body.get('transcript', ''),
            'analysis': body.get('analysis', {}),
            'audioS3Key': body.get('audioS3Key'),
            'sentimentScore': body.get('sentimentScore'),
            'createdAt': timestamp,
            'createdBy': user_id,
            # GSI for querying by elder
            'GSI1PK': f'ELDER#{body.get("elderId")}' if body.get('elderId') else f'USER#{user_id}',
            'GSI1SK': f'CALL#{timestamp}',
        }
        
        table.put_item(Item=call_record)
        
        return cors_response(201, {
            'message': 'Call saved successfully',
            'callId': call_id,
            'call': call_record
        })
    
    except Exception as e:
        print(f"Error creating call: {e}")
        return cors_response(500, {'error': str(e)})


def handle_get_call(event, user_id, call_id):
    """Get a specific call by ID"""
    try:
        # Query to find the call (we need the full SK)
        response = table.query(
            KeyConditionExpression='PK = :pk AND begins_with(SK, :sk)',
            FilterExpression='callId = :callId',
            ExpressionAttributeValues={
                ':pk': f'USER#{user_id}',
                ':sk': 'CALL#',
                ':callId': call_id
            }
        )
        
        items = response.get('Items', [])
        if not items:
            return cors_response(404, {'error': 'Call not found'})
        
        call = items[0]
        return cors_response(200, {'call': call})
    
    except Exception as e:
        print(f"Error getting call: {e}")
        return cors_response(500, {'error': str(e)})


def handle_delete_call(event, user_id, call_id):
    """Delete a call record and its audio"""
    try:
        # First find the call to get the full SK and audio key
        response = table.query(
            KeyConditionExpression='PK = :pk AND begins_with(SK, :sk)',
            FilterExpression='callId = :callId',
            ExpressionAttributeValues={
                ':pk': f'USER#{user_id}',
                ':sk': 'CALL#',
                ':callId': call_id
            }
        )
        
        items = response.get('Items', [])
        if not items:
            return cors_response(404, {'error': 'Call not found'})
        
        call = items[0]
        
        # Delete audio from S3 if exists
        audio_key = call.get('audioS3Key')
        if audio_key and media_bucket:
            try:
                s3.delete_object(Bucket=media_bucket, Key=audio_key)
            except Exception as s3_error:
                print(f"Warning: Could not delete S3 audio: {s3_error}")
        
        # Delete from DynamoDB
        table.delete_item(
            Key={
                'PK': call['PK'],
                'SK': call['SK']
            }
        )
        
        return cors_response(200, {'message': 'Call deleted successfully'})
    
    except Exception as e:
        print(f"Error deleting call: {e}")
        return cors_response(500, {'error': str(e)})


def handle_get_audio_url(event, user_id, call_id):
    """Generate presigned URL for call audio (upload or download)"""
    try:
        # Check query params for operation type
        params = event.get('queryStringParameters', {}) or {}
        operation = params.get('operation', 'download')  # 'upload' or 'download'
        
        # Generate S3 key
        audio_key = f'calls/{user_id}/{call_id}/audio.webm'
        
        if operation == 'upload':
            # Generate presigned URL for upload
            url = s3.generate_presigned_url(
                'put_object',
                Params={
                    'Bucket': media_bucket,
                    'Key': audio_key,
                    'ContentType': 'audio/webm',
                },
                ExpiresIn=300  # 5 minutes
            )
            return cors_response(200, {
                'uploadUrl': url,
                's3Key': audio_key
            })
        else:
            # First check if audio exists
            # Generate presigned URL for download
            url = s3.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': media_bucket,
                    'Key': audio_key,
                },
                ExpiresIn=3600  # 1 hour
            )
            return cors_response(200, {
                'downloadUrl': url,
                's3Key': audio_key
            })
    
    except Exception as e:
        print(f"Error generating audio URL: {e}")
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
    if path == '/calls':
        if http_method == 'GET':
            return handle_get_calls(event, user_id)
        elif http_method == 'POST':
            return handle_create_call(event, user_id)
    
    elif '/calls/' in path:
        call_id = path_params.get('callId')
        
        if path.endswith('/audio-url'):
            return handle_get_audio_url(event, user_id, call_id)
        elif http_method == 'GET':
            return handle_get_call(event, user_id, call_id)
        elif http_method == 'DELETE':
            return handle_delete_call(event, user_id, call_id)
    
    return cors_response(404, {'error': f'Route not found: {http_method} {path}'})




