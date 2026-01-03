"""
DynamoDB Setup and Access Patterns for Care Operations Console
Defines the table structure and access patterns for the single-table design
"""

import boto3
import os
from typing import Dict, Any, List
from aws_lambda_powertools import Logger

logger = Logger()

# Table configuration
TABLE_NAME = os.environ.get('DYNAMODB_TABLE', 'CareCircle-Data')

# Access patterns for Care Operations Console
ACCESS_PATTERNS = {
    # Pattern 1: Get all queue items for family (sorted by priority)
    'get_queue_by_family': {
        'index': 'GSI1',
        'pk': 'QUEUE#{family_id}',
        'sk_prefix': None,
        'sort_order': 'ASC'  # Priority ascending (urgent first)
    },
    
    # Pattern 2: Get tasks assigned to specific user
    'get_tasks_by_assignee': {
        'index': 'GSI1', 
        'pk': 'ASSIGNEE#{user_id}',
        'sk_prefix': None,
        'sort_order': 'ASC'  # Due date ascending
    },
    
    # Pattern 3: Get timeline for elder (chronological)
    'get_timeline_by_elder': {
        'index': 'GSI1',
        'pk': 'ELDER#{elder_id}',
        'sk_prefix': 'TIMELINE#',
        'sort_order': 'DESC'  # Most recent first
    },
    
    # Pattern 4: Get active alerts by severity
    'get_alerts_by_severity': {
        'index': 'GSI2',
        'pk': 'SEVERITY#{severity}',
        'sk_prefix': None,
        'sort_order': 'DESC'  # Most recent first
    },
    
    # Pattern 5: Get overdue tasks for escalation
    'get_overdue_tasks': {
        'index': 'GSI2',
        'pk': 'PRIORITY#{priority}',
        'sk_prefix': None,
        'sort_order': 'ASC',  # Due date ascending
        'filter': 'due_at < :now'
    },
    
    # Pattern 6: Get family member workload distribution
    'get_workload_by_family': {
        'index': 'GSI1',
        'pk': 'QUEUE#{family_id}',
        'sk_prefix': None,
        'sort_order': 'ASC',
        'projection': ['assigned_to', 'estimated_minutes', 'status']
    }
}

# DynamoDB Key Patterns
KEY_PATTERNS = {
    # Primary Table Keys
    'family_alert': 'FAMILY#{family_id}|ALERT#{alert_id}',
    'family_task': 'FAMILY#{family_id}|TASK#{task_id}',
    'family_plan': 'FAMILY#{family_id}|PLAN#{plan_id}',
    'family_outcome': 'FAMILY#{family_id}|OUTCOME#{outcome_id}',
    'family_timeline': 'FAMILY#{family_id}|TIMELINE#{timeline_id}',
    
    # GSI1 Keys (Queue Management)
    'queue_family': 'QUEUE#{family_id}|{priority:03d}#{due_at}',
    'assignee_task': 'ASSIGNEE#{user_id}|{due_at}',
    'elder_timeline': 'ELDER#{elder_id}|{occurred_at}',
    'alert_plan': 'ALERT#{alert_id}|{started_at}',
    
    # GSI2 Keys (Assignment Tracking)
    'severity_alert': 'SEVERITY#{severity}|{created_at}',
    'priority_task': 'PRIORITY#{priority}|{due_at}',
    'timeline_family': 'TIMELINE#{family_id}|{occurred_at}',
    
    # GSI3 Keys (Analytics and Reporting)
    'metrics_family': 'METRICS#{family_id}|{date}',
    'workload_member': 'WORKLOAD#{user_id}|{date}',
}

def create_table_if_not_exists():
    """Create DynamoDB table with proper indexes if it doesn't exist"""
    try:
        dynamodb = boto3.resource('dynamodb')
        
        # Check if table exists
        try:
            table = dynamodb.Table(TABLE_NAME)
            table.load()
            logger.info(f"Table {TABLE_NAME} already exists")
            return table
        except dynamodb.meta.client.exceptions.ResourceNotFoundException:
            pass
        
        # Create table with GSIs
        table = dynamodb.create_table(
            TableName=TABLE_NAME,
            KeySchema=[
                {'AttributeName': 'PK', 'KeyType': 'HASH'},
                {'AttributeName': 'SK', 'KeyType': 'RANGE'}
            ],
            AttributeDefinitions=[
                {'AttributeName': 'PK', 'AttributeType': 'S'},
                {'AttributeName': 'SK', 'AttributeType': 'S'},
                {'AttributeName': 'GSI1PK', 'AttributeType': 'S'},
                {'AttributeName': 'GSI1SK', 'AttributeType': 'S'},
                {'AttributeName': 'GSI2PK', 'AttributeType': 'S'},
                {'AttributeName': 'GSI2SK', 'AttributeType': 'S'},
                {'AttributeName': 'GSI3PK', 'AttributeType': 'S'},
                {'AttributeName': 'GSI3SK', 'AttributeType': 'S'},
            ],
            BillingMode='PAY_PER_REQUEST',
            GlobalSecondaryIndexes=[
                {
                    'IndexName': 'GSI1',
                    'KeySchema': [
                        {'AttributeName': 'GSI1PK', 'KeyType': 'HASH'},
                        {'AttributeName': 'GSI1SK', 'KeyType': 'RANGE'}
                    ],
                    'Projection': {'ProjectionType': 'ALL'}
                },
                {
                    'IndexName': 'GSI2',
                    'KeySchema': [
                        {'AttributeName': 'GSI2PK', 'KeyType': 'HASH'},
                        {'AttributeName': 'GSI2SK', 'KeyType': 'RANGE'}
                    ],
                    'Projection': {'ProjectionType': 'ALL'}
                },
                {
                    'IndexName': 'GSI3',
                    'KeySchema': [
                        {'AttributeName': 'GSI3PK', 'KeyType': 'HASH'},
                        {'AttributeName': 'GSI3SK', 'KeyType': 'RANGE'}
                    ],
                    'Projection': {'ProjectionType': 'ALL'}
                }
            ]
        )
        
        # Wait for table to be created
        table.wait_until_exists()
        logger.info(f"Created table {TABLE_NAME} with GSIs")
        return table
        
    except Exception as e:
        logger.error(f"Error creating table: {e}")
        raise

def get_key_pattern(pattern_name: str, **kwargs) -> Dict[str, str]:
    """Generate DynamoDB keys based on pattern"""
    try:
        pattern = KEY_PATTERNS.get(pattern_name)
        if not pattern:
            raise ValueError(f"Unknown key pattern: {pattern_name}")
        
        # Split pattern into PK and SK
        if '|' in pattern:
            pk_pattern, sk_pattern = pattern.split('|', 1)
        else:
            pk_pattern = pattern
            sk_pattern = None
        
        # Format the patterns with provided kwargs
        pk = pk_pattern.format(**kwargs)
        sk = sk_pattern.format(**kwargs) if sk_pattern else None
        
        result = {'PK': pk}
        if sk:
            result['SK'] = sk
            
        return result
        
    except Exception as e:
        logger.error(f"Error generating key pattern {pattern_name}: {e}")
        raise

def validate_access_pattern(pattern_name: str) -> bool:
    """Validate that an access pattern is properly configured"""
    try:
        pattern = ACCESS_PATTERNS.get(pattern_name)
        if not pattern:
            return False
        
        required_fields = ['index', 'pk', 'sort_order']
        return all(field in pattern for field in required_fields)
        
    except Exception:
        return False

def get_gsi_keys_for_entity(entity_type: str, entity_data: Dict[str, Any], 
                           family_id: str) -> Dict[str, Any]:
    """Generate GSI keys based on entity type and data"""
    gsi_keys = {}
    
    try:
        if entity_type == 'alert':
            # GSI1: Elder timeline
            gsi_keys['GSI1PK'] = f"ELDER#{entity_data.get('elder_id')}"
            gsi_keys['GSI1SK'] = f"ALERT#{entity_data.get('created_at')}"
            
            # GSI2: Severity-based queries
            gsi_keys['GSI2PK'] = f"SEVERITY#{entity_data.get('severity')}"
            gsi_keys['GSI2SK'] = entity_data.get('created_at')
            
        elif entity_type == 'task':
            # GSI1: Assignment queries
            if entity_data.get('assigned_to'):
                gsi_keys['GSI1PK'] = f"ASSIGNEE#{entity_data.get('assigned_to')}"
            else:
                gsi_keys['GSI1PK'] = 'UNASSIGNED'
            gsi_keys['GSI1SK'] = entity_data.get('due_at') or entity_data.get('created_at')
            
            # GSI2: Priority-based queries
            gsi_keys['GSI2PK'] = f"PRIORITY#{entity_data.get('priority')}"
            gsi_keys['GSI2SK'] = entity_data.get('due_at') or entity_data.get('created_at')
            
        elif entity_type == 'queue_item':
            # GSI1: Queue management
            priority = entity_data.get('priority', 50)
            due_at = entity_data.get('due_at')
            gsi_keys['GSI1PK'] = f"QUEUE#{family_id}"
            gsi_keys['GSI1SK'] = f"{priority:03d}#{due_at}"
            
            # GSI2: Assignment tracking
            if entity_data.get('assigned_to'):
                gsi_keys['GSI2PK'] = f"ASSIGNEE#{entity_data.get('assigned_to')}"
            else:
                gsi_keys['GSI2PK'] = 'UNASSIGNED'
            gsi_keys['GSI2SK'] = due_at
            
        elif entity_type == 'timeline':
            # GSI1: Elder timeline
            gsi_keys['GSI1PK'] = f"ELDER#{entity_data.get('elder_id')}"
            gsi_keys['GSI1SK'] = entity_data.get('occurred_at')
            
            # GSI2: Family timeline
            gsi_keys['GSI2PK'] = f"TIMELINE#{family_id}"
            gsi_keys['GSI2SK'] = entity_data.get('occurred_at')
            
        elif entity_type == 'plan':
            # GSI1: Alert-to-plan mapping
            gsi_keys['GSI1PK'] = f"ALERT#{entity_data.get('alert_id')}"
            gsi_keys['GSI1SK'] = entity_data.get('started_at')
            
        elif entity_type == 'outcome':
            # GSI1: Task outcomes
            gsi_keys['GSI1PK'] = f"TASK#{entity_data.get('task_id')}"
            gsi_keys['GSI1SK'] = entity_data.get('recorded_at')
            
    except Exception as e:
        logger.error(f"Error generating GSI keys for {entity_type}: {e}")
    
    return gsi_keys

# Example usage and testing
if __name__ == "__main__":
    # Test key pattern generation
    test_keys = get_key_pattern('family_alert', family_id='123', alert_id='ALERT#456')
    print(f"Generated keys: {test_keys}")
    
    # Test GSI key generation
    alert_data = {
        'elder_id': 'elder123',
        'severity': 'urgent',
        'created_at': '2024-01-15T10:30:00Z'
    }
    gsi_keys = get_gsi_keys_for_entity('alert', alert_data, 'family123')
    print(f"GSI keys: {gsi_keys}")