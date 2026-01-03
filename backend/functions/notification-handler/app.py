"""
Notification Handler Lambda Function
Sends notifications via SNS and SES
"""
import json
import os
from typing import Dict, Any
import boto3
import logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)




# AWS Clients
sns = boto3.client('sns')
ses = boto3.client('ses')
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ.get('DYNAMODB_TABLE', 'CareCircle-Data'))



def send_sms(phone_number: str, message: str) -> bool:
    """Send SMS notification via SNS"""
    try:
        response = sns.publish(
            PhoneNumber=phone_number,
            Message=message,
            MessageAttributes={
                'AWS.SNS.SMS.SMSType': {
                    'DataType': 'String',
                    'StringValue': 'Transactional'
                }
            }
        )
        logger.info(f"SMS sent to {phone_number}: {response.get('MessageId')}")
        return True
    except Exception as e:
        logger.error(f"Error sending SMS: {e}")
        return False



def send_email(email_address: str, subject: str, body: str) -> bool:
    """Send email notification via SES"""
    try:
        response = ses.send_email(
            Source='noreply@carecircle.app',  # Verify this email in SES
            Destination={
                'ToAddresses': [email_address]
            },
            Message={
                'Subject': {
                    'Data': subject,
                    'Charset': 'UTF-8'
                },
                'Body': {
                    'Text': {
                        'Data': body,
                        'Charset': 'UTF-8'
                    },
                    'Html': {
                        'Data': f"""
                        <html>
                        <body>
                            <h2>{subject}</h2>
                            <p>{body}</p>
                            <hr>
                            <p><small>CareCircle - AI-Powered Family Care Orchestration</small></p>
                        </body>
                        </html>
                        """,
                        'Charset': 'UTF-8'
                    }
                }
            }
        )
        logger.info(f"Email sent to {email_address}: {response.get('MessageId')}")
        return True
    except Exception as e:
        logger.error(f"Error sending email: {e}")
        return False



def get_user_preferences(user_id: str) -> Dict[str, Any]:
    """Get user notification preferences from DynamoDB"""
    try:
        response = table.get_item(
            Key={
                'PK': f'USER#{user_id}',
                'SK': 'PROFILE'
            }
        )
        item = response.get('Item', {})
        return item.get('notifications', {'sms': True, 'email': True, 'push': True})
    except Exception as e:
        logger.error(f"Error getting user preferences: {e}")
        return {'sms': True, 'email': True, 'push': True}




def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Main handler for sending notifications"""
    try:
        # Parse event (could be from API Gateway or EventBridge)
        if 'body' in event:
            # API Gateway
            body = json.loads(event.get('body', '{}'))
        else:
            # EventBridge or direct invocation
            body = event
        
        user_id = body.get('user_id', '')
        notification_type = body.get('type', 'task_assigned')
        message = body.get('message', 'You have a new notification')
        subject = body.get('subject', 'CareCircle Notification')
        
        # Get user contact info and preferences
        try:
            user_response = table.get_item(
                Key={
                    'PK': f'USER#{user_id}',
                    'SK': 'PROFILE'
                }
            )
            user_profile = user_response.get('Item', {})
        except Exception:
            user_profile = {}
        
        preferences = get_user_preferences(user_id)
        phone = user_profile.get('phone', '')
        email = user_profile.get('email', '')
        
        results = {
            'sms': False,
            'email': False,
            'push': False
        }
        
        # Send SMS if enabled and phone available
        if preferences.get('sms') and phone:
            results['sms'] = send_sms(phone, message)
        
        # Send email if enabled and email available
        if preferences.get('email') and email:
            results['email'] = send_email(email, subject, message)
        
        # Push notifications (to be implemented with SNS Mobile Push)
        if preferences.get('push'):
            results['push'] = False  # Placeholder
        
        logger.info(f"Notification sent to {user_id}: {results}")
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            'body': json.dumps({
                'success': True,
                'results': results
            })
        }
        
    except Exception as e:
        logger.error(f"Error in notification handler: {e}", exc_info=True)
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }

