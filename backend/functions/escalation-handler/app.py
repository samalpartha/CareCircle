"""
Escalation Handler Lambda Function
Check alert status and execute escalation actions (call/sms)
"""
import json
import os
import boto3
import logging
from typing import Dict, Any

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ.get('DYNAMODB_TABLE', 'CareCircle-Data-v2'))
sns = boto3.client('sns')
connect = boto3.client('connect')

def get_alert(alert_id: str) -> Dict[str, Any]:
    """Fetch alert current status"""
    try:
        response = table.get_item(Key={'PK': f'ALERT#{alert_id}', 'SK': f'ALERT#{alert_id}'})
        return response.get('Item', {})
    except Exception as e:
        logger.error(f"Error fetching alert: {e}")
        return None

def get_care_team(elder_id: str) -> list:
    """Fetch care team for the elder"""
    # In a real app, this would query a GSI or relation
    # For now, we'll assume a mocked list or query by PK/SK
    # Placeholder implementation
    return [
        {'role': 'primary', 'name': 'Primary Caregiver', 'phone': '+15550000000'},
        {'role': 'secondary', 'name': 'Secondary', 'phone': '+15550000001'}
    ]

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    logger.info(f"Escalation event: {json.dumps(event)}")
    
    action = event.get('action')
    alert_id = event.get('alert_id')
    
    if not alert_id:
        return {'status': 'error', 'message': 'Missing alert_id'}
    
    alert = get_alert(alert_id)
    if not alert:
        return {'status': 'error', 'message': 'Alert not found'}
    
    # Check if still unassigned/open
    if alert.get('status') != 'UNASSIGNED':
        logger.info(f"Alert {alert_id} is already {alert.get('status')}. Stopping escalation.")
        return {'status': 'resolved', 'current_status': alert.get('status')}

    if action == 'CHECK_STATUS':
        return {'status': 'unassigned', 'alert_id': alert_id}

    elif action == 'ESCALATE_PRIMARY':
        # Logic to call primary caregiver
        # cloud-native: Trigger AWS Connect outbound contact
        logger.info("ESCALATING TO PRIMARY: Initiating call...")
        # Placeholder for AWS Connect integration
        return {'status': 'escalated_primary'}

    elif action == 'ESCALATE_BROADCAST':
        # Logic to SMS everyone
        logger.info("ESCALATING BROADCAST: Sending SMS to all...")
        # Placeholder for SNS publish
        return {'status': 'escalated_broadcast'}
    
    return {'status': 'unknown_action'}
