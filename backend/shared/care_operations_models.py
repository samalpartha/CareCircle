"""
Care Operations Console Data Models
DynamoDB access patterns and data models for the care operations system
"""

import json
import os
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Union
from dataclasses import dataclass, asdict
from enum import Enum
import boto3
from boto3.dynamodb.conditions import Key, Attr
from aws_lambda_powertools import Logger

logger = Logger()

# AWS Clients
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ.get('DYNAMODB_TABLE', 'CareCircle-Data'))

# =============================================
# Enums and Constants
# =============================================

class AlertSeverity(Enum):
    URGENT = "urgent"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class AlertType(Enum):
    FALL = "fall"
    MEDICATION = "medication"
    COGNITIVE = "cognitive"
    EMOTIONAL = "emotional"
    SAFETY = "safety"

class TaskStatus(Enum):
    NEW = "new"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    SNOOZED = "snoozed"
    ESCALATED = "escalated"

class TaskPriority(Enum):
    URGENT = "urgent"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class OutcomeResult(Enum):
    SUCCESS = "success"
    PARTIAL = "partial"
    FAILED = "failed"

class QueueItemType(Enum):
    ALERT = "alert"
    TASK = "task"
    MEDICATION = "medication"
    CHECKIN = "checkin"
    FOLLOWUP = "followup"

# =============================================
# Data Classes
# =============================================

@dataclass
class Alert:
    id: str
    severity: AlertSeverity
    type: AlertType
    elder_id: str
    elder_name: str
    ai_analysis: Dict[str, Any]
    created_at: str
    status: str = "new"
    assigned_to: Optional[str] = None
    
    def to_dynamodb_item(self, family_id: str) -> Dict[str, Any]:
        return {
            'PK': f'FAMILY#{family_id}',
            'SK': self.id,
            'GSI1PK': f'ELDER#{self.elder_id}',
            'GSI1SK': f'ALERT#{self.created_at}',
            'GSI2PK': f'SEVERITY#{self.severity.value}',
            'GSI2SK': self.created_at,
            'alert_id': self.id,
            'severity': self.severity.value,
            'type': self.type.value,
            'elder_id': self.elder_id,
            'elder_name': self.elder_name,
            'ai_analysis': self.ai_analysis,
            'created_at': self.created_at,
            'status': self.status,
            'assigned_to': self.assigned_to,
            'entity_type': 'alert'
        }

@dataclass
class Task:
    id: str
    title: str
    description: str
    priority: TaskPriority
    elder_name: str
    created_by: str
    created_at: str
    updated_at: str
    parent_id: Optional[str] = None
    assigned_to: Optional[str] = None
    assigned_to_name: Optional[str] = None
    due_at: Optional[str] = None
    estimated_minutes: int = 30
    checklist: List[Dict[str, Any]] = None
    status: TaskStatus = TaskStatus.NEW
    
    def __post_init__(self):
        if self.checklist is None:
            self.checklist = []
    
    def to_dynamodb_item(self, family_id: str) -> Dict[str, Any]:
        return {
            'PK': f'FAMILY#{family_id}',
            'SK': self.id,
            'GSI1PK': f'ASSIGNEE#{self.assigned_to}' if self.assigned_to else 'UNASSIGNED',
            'GSI1SK': self.due_at or self.created_at,
            'GSI2PK': f'PRIORITY#{self.priority.value}',
            'GSI2SK': self.due_at or self.created_at,
            'task_id': self.id,
            'title': self.title,
            'description': self.description,
            'priority': self.priority.value,
            'elder_name': self.elder_name,
            'created_by': self.created_by,
            'created_at': self.created_at,
            'updated_at': self.updated_at,
            'parent_id': self.parent_id,
            'assigned_to': self.assigned_to,
            'assigned_to_name': self.assigned_to_name,
            'due_at': self.due_at,
            'estimated_minutes': self.estimated_minutes,
            'checklist': self.checklist,
            'status': self.status.value,
            'entity_type': 'task'
        }

@dataclass
class Plan:
    id: str
    alert_id: str
    protocol_type: str
    steps: List[Dict[str, Any]]
    current_step: int
    outcomes: Dict[str, Any]
    started_at: str
    completed_at: Optional[str] = None
    completed_by: Optional[str] = None
    
    def to_dynamodb_item(self, family_id: str) -> Dict[str, Any]:
        return {
            'PK': f'FAMILY#{family_id}',
            'SK': self.id,
            'GSI1PK': f'ALERT#{self.alert_id}',
            'GSI1SK': self.started_at,
            'plan_id': self.id,
            'alert_id': self.alert_id,
            'protocol_type': self.protocol_type,
            'steps': self.steps,
            'current_step': self.current_step,
            'outcomes': self.outcomes,
            'started_at': self.started_at,
            'completed_at': self.completed_at,
            'completed_by': self.completed_by,
            'entity_type': 'plan'
        }

@dataclass
class Outcome:
    id: str
    task_id: str
    result: OutcomeResult
    notes: str
    evidence_urls: List[str]
    recorded_at: str
    recorded_by: str
    follow_up_tasks: List[Dict[str, Any]]
    
    def __post_init__(self):
        if self.evidence_urls is None:
            self.evidence_urls = []
        if self.follow_up_tasks is None:
            self.follow_up_tasks = []
    
    def to_dynamodb_item(self, family_id: str) -> Dict[str, Any]:
        return {
            'PK': f'FAMILY#{family_id}',
            'SK': self.id,
            'GSI1PK': f'TASK#{self.task_id}',
            'GSI1SK': self.recorded_at,
            'outcome_id': self.id,
            'task_id': self.task_id,
            'result': self.result.value,
            'notes': self.notes,
            'evidence_urls': self.evidence_urls,
            'recorded_at': self.recorded_at,
            'recorded_by': self.recorded_by,
            'follow_up_tasks': self.follow_up_tasks,
            'entity_type': 'outcome'
        }

@dataclass
class TimelineEntry:
    id: str
    elder_id: str
    event_type: str
    participants: List[str]
    event_data: Dict[str, Any]
    occurred_at: str
    created_by: str
    related_items: List[str]
    immutable: bool = True
    
    def __post_init__(self):
        if self.participants is None:
            self.participants = []
        if self.related_items is None:
            self.related_items = []
    
    def to_dynamodb_item(self, family_id: str) -> Dict[str, Any]:
        return {
            'PK': f'FAMILY#{family_id}',
            'SK': self.id,
            'GSI1PK': f'ELDER#{self.elder_id}',
            'GSI1SK': self.occurred_at,
            'GSI2PK': f'TIMELINE#{family_id}',
            'GSI2SK': self.occurred_at,
            'timeline_id': self.id,
            'elder_id': self.elder_id,
            'event_type': self.event_type,
            'participants': self.participants,
            'event_data': self.event_data,
            'occurred_at': self.occurred_at,
            'created_by': self.created_by,
            'related_items': self.related_items,
            'immutable': self.immutable,
            'entity_type': 'timeline'
        }

@dataclass
class QueueItem:
    id: str
    type: QueueItemType
    severity: AlertSeverity
    title: str
    elder_name: str
    due_at: str
    estimated_minutes: int
    status: TaskStatus
    suggested_action: str
    priority: int
    assigned_to: Optional[str] = None
    
    def to_dynamodb_item(self, family_id: str) -> Dict[str, Any]:
        return {
            'PK': f'FAMILY#{family_id}',
            'SK': self.id,
            'GSI1PK': f'QUEUE#{family_id}',
            'GSI1SK': f'{self.priority:03d}#{self.due_at}',
            'GSI2PK': f'ASSIGNEE#{self.assigned_to}' if self.assigned_to else 'UNASSIGNED',
            'GSI2SK': self.due_at,
            'queue_item_id': self.id,
            'type': self.type.value,
            'severity': self.severity.value,
            'title': self.title,
            'elder_name': self.elder_name,
            'due_at': self.due_at,
            'estimated_minutes': self.estimated_minutes,
            'status': self.status.value,
            'suggested_action': self.suggested_action,
            'priority': self.priority,
            'assigned_to': self.assigned_to,
            'entity_type': 'queue_item'
        }

# =============================================
# Data Access Layer
# =============================================

class CareOperationsDAO:
    """Data Access Object for Care Operations Console"""
    
    def __init__(self):
        self.table = table
    
    # =============================================
    # Alert Operations
    # =============================================
    
    def create_alert(self, alert: Alert, family_id: str) -> Dict[str, Any]:
        """Create a new alert"""
        try:
            item = alert.to_dynamodb_item(family_id)
            self.table.put_item(Item=item)
            logger.info(f"Created alert {alert.id} for family {family_id}")
            return item
        except Exception as e:
            logger.error(f"Error creating alert: {e}")
            raise
    
    def get_alerts_by_family(self, family_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        """Get all alerts for a family"""
        try:
            response = self.table.query(
                KeyConditionExpression=Key('PK').eq(f'FAMILY#{family_id}') & Key('SK').begins_with('ALERT#'),
                ScanIndexForward=False,  # Most recent first
                Limit=limit
            )
            return response.get('Items', [])
        except Exception as e:
            logger.error(f"Error getting alerts for family {family_id}: {e}")
            return []
    
    def get_alerts_by_severity(self, severity: AlertSeverity, limit: int = 50) -> List[Dict[str, Any]]:
        """Get alerts by severity across all families"""
        try:
            response = self.table.query(
                IndexName='GSI2',
                KeyConditionExpression=Key('GSI2PK').eq(f'SEVERITY#{severity.value}'),
                ScanIndexForward=False,
                Limit=limit
            )
            return response.get('Items', [])
        except Exception as e:
            logger.error(f"Error getting alerts by severity {severity.value}: {e}")
            return []
    
    # =============================================
    # Task Operations
    # =============================================
    
    def create_task(self, task: Task, family_id: str) -> Dict[str, Any]:
        """Create a new task"""
        try:
            item = task.to_dynamodb_item(family_id)
            self.table.put_item(Item=item)
            logger.info(f"Created task {task.id} for family {family_id}")
            return item
        except Exception as e:
            logger.error(f"Error creating task: {e}")
            raise
    
    def get_tasks_by_family(self, family_id: str, status_filter: Optional[List[str]] = None) -> List[Dict[str, Any]]:
        """Get all tasks for a family with optional status filter"""
        try:
            response = self.table.query(
                KeyConditionExpression=Key('PK').eq(f'FAMILY#{family_id}') & Key('SK').begins_with('TASK#')
            )
            
            tasks = response.get('Items', [])
            
            if status_filter:
                tasks = [t for t in tasks if t.get('status') in status_filter]
            
            return tasks
        except Exception as e:
            logger.error(f"Error getting tasks for family {family_id}: {e}")
            return []
    
    def get_tasks_by_assignee(self, assignee_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Get tasks assigned to a specific user"""
        try:
            response = self.table.query(
                IndexName='GSI1',
                KeyConditionExpression=Key('GSI1PK').eq(f'ASSIGNEE#{assignee_id}'),
                ScanIndexForward=True,  # Due date ascending
                Limit=limit
            )
            return response.get('Items', [])
        except Exception as e:
            logger.error(f"Error getting tasks for assignee {assignee_id}: {e}")
            return []
    
    def update_task_status(self, family_id: str, task_id: str, status: TaskStatus, 
                          assigned_to: Optional[str] = None, assigned_to_name: Optional[str] = None) -> Dict[str, Any]:
        """Update task status and assignment"""
        try:
            update_expression = 'SET #status = :status, updated_at = :updated'
            expression_values = {
                ':status': status.value,
                ':updated': datetime.utcnow().isoformat() + 'Z'
            }
            expression_names = {'#status': 'status'}
            
            if assigned_to:
                update_expression += ', assigned_to = :assigned_to'
                expression_values[':assigned_to'] = assigned_to
                
                # Update GSI1PK for assignment queries
                update_expression += ', GSI1PK = :gsi1pk'
                expression_values[':gsi1pk'] = f'ASSIGNEE#{assigned_to}'
            
            if assigned_to_name:
                update_expression += ', assigned_to_name = :assigned_to_name'
                expression_values[':assigned_to_name'] = assigned_to_name
            
            response = self.table.update_item(
                Key={'PK': f'FAMILY#{family_id}', 'SK': task_id},
                UpdateExpression=update_expression,
                ExpressionAttributeNames=expression_names,
                ExpressionAttributeValues=expression_values,
                ReturnValues='ALL_NEW'
            )
            
            return response.get('Attributes', {})
        except Exception as e:
            logger.error(f"Error updating task {task_id}: {e}")
            raise
    
    # =============================================
    # Queue Operations
    # =============================================
    
    def get_care_queue(self, family_id: str, filters: Optional[Dict[str, bool]] = None) -> List[Dict[str, Any]]:
        """Get unified care queue for a family"""
        try:
            response = self.table.query(
                IndexName='GSI1',
                KeyConditionExpression=Key('GSI1PK').eq(f'QUEUE#{family_id}'),
                ScanIndexForward=True  # Priority ascending (urgent first)
            )
            
            queue_items = response.get('Items', [])
            
            # Apply filters if provided
            if filters:
                filtered_items = []
                for item in queue_items:
                    if filters.get('urgent') and item.get('severity') != 'urgent':
                        continue
                    if filters.get('dueToday'):
                        due_date = item.get('due_at', '')
                        today = datetime.utcnow().date().isoformat()
                        if not due_date.startswith(today):
                            continue
                    if filters.get('assignedToMe'):
                        # This would need the current user ID passed in
                        pass
                    if filters.get('medication') and item.get('type') != 'medication':
                        continue
                    if filters.get('cognitive') and 'cognitive' not in item.get('title', '').lower():
                        continue
                    if filters.get('safety') and 'safety' not in item.get('title', '').lower():
                        continue
                    
                    filtered_items.append(item)
                
                return filtered_items
            
            return queue_items
        except Exception as e:
            logger.error(f"Error getting care queue for family {family_id}: {e}")
            return []
    
    def get_urgent_items(self, family_id: str) -> List[Dict[str, Any]]:
        """Get urgent items requiring immediate attention"""
        try:
            # Get urgent alerts
            urgent_alerts = self.get_alerts_by_severity(AlertSeverity.URGENT)
            
            # Get high priority tasks
            response = self.table.query(
                IndexName='GSI2',
                KeyConditionExpression=Key('GSI2PK').eq('PRIORITY#urgent'),
                ScanIndexForward=True
            )
            urgent_tasks = response.get('Items', [])
            
            # Combine and format as urgent items
            urgent_items = []
            
            for alert in urgent_alerts:
                if alert.get('PK') == f'FAMILY#{family_id}':
                    urgent_items.append({
                        'id': alert.get('alert_id'),
                        'type': alert.get('type'),
                        'severity': alert.get('severity'),
                        'elderName': alert.get('elder_name'),
                        'timeElapsed': self._calculate_time_elapsed(alert.get('created_at')),
                        'suggestedAction': self._get_suggested_action(alert),
                        'triageStatus': 'pending'
                    })
            
            for task in urgent_tasks:
                if task.get('PK') == f'FAMILY#{family_id}':
                    urgent_items.append({
                        'id': task.get('task_id'),
                        'type': 'task',
                        'severity': task.get('priority'),
                        'elderName': task.get('elder_name'),
                        'timeElapsed': self._calculate_time_elapsed(task.get('created_at')),
                        'suggestedAction': task.get('title'),
                        'triageStatus': 'pending'
                    })
            
            return urgent_items
        except Exception as e:
            logger.error(f"Error getting urgent items for family {family_id}: {e}")
            return []
    
    # =============================================
    # Timeline Operations
    # =============================================
    
    def create_timeline_entry(self, entry: TimelineEntry, family_id: str) -> Dict[str, Any]:
        """Create an immutable timeline entry"""
        try:
            item = entry.to_dynamodb_item(family_id)
            self.table.put_item(Item=item)
            logger.info(f"Created timeline entry {entry.id} for family {family_id}")
            return item
        except Exception as e:
            logger.error(f"Error creating timeline entry: {e}")
            raise
    
    def get_timeline_by_elder(self, elder_id: str, limit: int = 50, 
                            next_token: Optional[str] = None) -> Dict[str, Any]:
        """Get timeline entries for a specific elder"""
        try:
            query_kwargs = {
                'IndexName': 'GSI1',
                'KeyConditionExpression': Key('GSI1PK').eq(f'ELDER#{elder_id}'),
                'ScanIndexForward': False,  # Most recent first
                'Limit': limit
            }
            
            if next_token:
                query_kwargs['ExclusiveStartKey'] = json.loads(next_token)
            
            response = self.table.query(**query_kwargs)
            
            result = {
                'items': response.get('Items', []),
                'totalCount': response.get('Count', 0)
            }
            
            if 'LastEvaluatedKey' in response:
                result['nextToken'] = json.dumps(response['LastEvaluatedKey'])
            
            return result
        except Exception as e:
            logger.error(f"Error getting timeline for elder {elder_id}: {e}")
            return {'items': [], 'totalCount': 0}
    
    def get_timeline_by_family(self, family_id: str, limit: int = 50,
                             next_token: Optional[str] = None) -> Dict[str, Any]:
        """Get timeline entries for a family"""
        try:
            query_kwargs = {
                'IndexName': 'GSI2',
                'KeyConditionExpression': Key('GSI2PK').eq(f'TIMELINE#{family_id}'),
                'ScanIndexForward': False,  # Most recent first
                'Limit': limit
            }
            
            if next_token:
                query_kwargs['ExclusiveStartKey'] = json.loads(next_token)
            
            response = self.table.query(**query_kwargs)
            
            result = {
                'items': response.get('Items', []),
                'totalCount': response.get('Count', 0)
            }
            
            if 'LastEvaluatedKey' in response:
                result['nextToken'] = json.dumps(response['LastEvaluatedKey'])
            
            return result
        except Exception as e:
            logger.error(f"Error getting timeline for family {family_id}: {e}")
            return {'items': [], 'totalCount': 0}
    
    # =============================================
    # Outcome Operations
    # =============================================
    
    def create_outcome(self, outcome: Outcome, family_id: str) -> Dict[str, Any]:
        """Create a task outcome"""
        try:
            item = outcome.to_dynamodb_item(family_id)
            self.table.put_item(Item=item)
            logger.info(f"Created outcome {outcome.id} for task {outcome.task_id}")
            return item
        except Exception as e:
            logger.error(f"Error creating outcome: {e}")
            raise
    
    def get_outcomes_by_task(self, task_id: str) -> List[Dict[str, Any]]:
        """Get all outcomes for a specific task"""
        try:
            response = self.table.query(
                IndexName='GSI1',
                KeyConditionExpression=Key('GSI1PK').eq(f'TASK#{task_id}'),
                ScanIndexForward=False  # Most recent first
            )
            return response.get('Items', [])
        except Exception as e:
            logger.error(f"Error getting outcomes for task {task_id}: {e}")
            return []
    
    # =============================================
    # Plan Operations
    # =============================================
    
    def create_plan(self, plan: Plan, family_id: str) -> Dict[str, Any]:
        """Create a triage plan"""
        try:
            item = plan.to_dynamodb_item(family_id)
            self.table.put_item(Item=item)
            logger.info(f"Created plan {plan.id} for alert {plan.alert_id}")
            return item
        except Exception as e:
            logger.error(f"Error creating plan: {e}")
            raise
    
    def get_plan_by_alert(self, alert_id: str) -> Optional[Dict[str, Any]]:
        """Get the plan associated with an alert"""
        try:
            response = self.table.query(
                IndexName='GSI1',
                KeyConditionExpression=Key('GSI1PK').eq(f'ALERT#{alert_id}'),
                Limit=1
            )
            items = response.get('Items', [])
            return items[0] if items else None
        except Exception as e:
            logger.error(f"Error getting plan for alert {alert_id}: {e}")
            return None
    
    def update_plan_step(self, family_id: str, plan_id: str, current_step: int, 
                        responses: Dict[str, Any]) -> Dict[str, Any]:
        """Update plan progress"""
        try:
            response = self.table.update_item(
                Key={'PK': f'FAMILY#{family_id}', 'SK': plan_id},
                UpdateExpression='SET current_step = :step, outcomes = :outcomes',
                ExpressionAttributeValues={
                    ':step': current_step,
                    ':outcomes': responses
                },
                ReturnValues='ALL_NEW'
            )
            return response.get('Attributes', {})
        except Exception as e:
            logger.error(f"Error updating plan {plan_id}: {e}")
            raise
    
    # =============================================
    # Helper Methods
    # =============================================
    
    def _calculate_time_elapsed(self, created_at: str) -> int:
        """Calculate minutes elapsed since creation"""
        try:
            created_time = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
            now = datetime.utcnow().replace(tzinfo=created_time.tzinfo)
            elapsed = now - created_time
            return int(elapsed.total_seconds() / 60)
        except Exception:
            return 0
    
    def _get_suggested_action(self, alert: Dict[str, Any]) -> str:
        """Get suggested action based on alert type and severity"""
        alert_type = alert.get('type', '')
        severity = alert.get('severity', '')
        
        if severity == 'urgent':
            if alert_type == 'fall':
                return 'Start Urgent Triage Protocol'
            elif alert_type == 'medication':
                return 'Verify Medication Status'
            else:
                return 'Take Immediate Action'
        else:
            return f'Review {alert_type.title()} Alert'

# =============================================
# Utility Functions
# =============================================

def generate_id(prefix: str = '') -> str:
    """Generate unique ID with optional prefix"""
    from uuid import uuid4
    timestamp = datetime.utcnow().strftime('%Y%m%d%H%M%S')
    unique = str(uuid4())[:8]
    return f"{prefix}#{timestamp}-{unique}" if prefix else f"{timestamp}-{unique}"

def calculate_priority_score(severity: AlertSeverity, due_at: Optional[str] = None, 
                           elder_risk_level: str = 'medium', 
                           assignment_status: str = 'unassigned',
                           escalation_count: int = 0) -> int:
    """Calculate priority score for queue ordering"""
    # Base severity score
    severity_scores = {
        AlertSeverity.URGENT: 100,
        AlertSeverity.HIGH: 75,
        AlertSeverity.MEDIUM: 50,
        AlertSeverity.LOW: 25
    }
    
    score = severity_scores.get(severity, 25)
    
    # Time sensitivity bonus
    if due_at:
        try:
            due_time = datetime.fromisoformat(due_at.replace('Z', '+00:00'))
            now = datetime.utcnow().replace(tzinfo=due_time.tzinfo)
            
            if due_time < now:  # Overdue
                score += 50
            elif (due_time - now).days == 0:  # Due today
                score += 25
        except Exception:
            pass
    
    # Elder risk level bonus
    if elder_risk_level == 'high':
        score += 20
    
    # Assignment status bonus
    if assignment_status == 'unassigned':
        score += 15
    
    # Escalation bonus
    score += escalation_count * 10
    
    return score