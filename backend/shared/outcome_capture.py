"""
Outcome Capture Service - Backend Implementation
Handles outcome documentation, follow-up task generation, and timeline entry creation
"""

from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Tuple
from enum import Enum
import uuid

from aws_lambda_powertools import Logger

logger = Logger()

# =============================================
# Enums and Data Classes
# =============================================

class OutcomeTemplateType(Enum):
    MEDICATION = "medication"
    SAFETY = "safety"
    APPOINTMENT = "appointment"
    GENERAL = "general"

class EvidenceType(Enum):
    PHOTO = "photo"
    VIDEO = "video"
    NOTES = "notes"
    DOCUMENTS = "documents"
    TIMESTAMP = "timestamp"

@dataclass
class Evidence:
    type: str
    data: str
    timestamp: str
    description: Optional[str] = None

@dataclass
class FollowUpRule:
    outcome_condition: str
    follow_up_task_template: Dict[str, Any]
    due_in_hours: float

@dataclass
class OutcomeTemplateDefinition:
    template_type: OutcomeTemplateType
    title: str
    description: str
    outcome_options: List[str]
    follow_up_rules: List[FollowUpRule]
    evidence_types: List[str]

@dataclass
class CapturedOutcome:
    action_taken: str
    emergency_services_called: bool
    notes: str
    evidence: List[Evidence]
    follow_up_required: bool
    next_check_in: Optional[str] = None

@dataclass
class TimelineEntry:
    id: str
    family_id: str
    elder_id: str
    timestamp: str
    event_type: str
    title: str
    description: str
    details: Dict[str, Any]
    caregiver: Dict[str, str]
    immutable: bool = True
    created_at: str = None
    updated_at: str = None

# =============================================
# Outcome Templates
# =============================================

def create_medication_template() -> OutcomeTemplateDefinition:
    """Create medication verification outcome template"""
    return OutcomeTemplateDefinition(
        template_type=OutcomeTemplateType.MEDICATION,
        title="Medication Verification Outcome",
        description="Document the outcome of medication verification task",
        outcome_options=[
            "All doses verified and taken",
            "Some doses missed",
            "Doses refused",
            "Unable to verify",
            "Medication not available"
        ],
        follow_up_rules=[
            FollowUpRule(
                outcome_condition="Some doses missed",
                follow_up_task_template={
                    "title": "Follow up on missed medication doses",
                    "description": "Contact elder to understand why doses were missed and reschedule",
                    "priority": "high",
                    "estimatedMinutes": 15,
                    "checklist": [
                        {"text": "Contact elder about missed doses", "required": True},
                        {"text": "Understand reason for missing doses", "required": True},
                        {"text": "Reschedule missed doses if appropriate", "required": True},
                        {"text": "Document reason in notes", "required": False}
                    ],
                    "dueInHours": 4
                },
                due_in_hours=4
            ),
            FollowUpRule(
                outcome_condition="Doses refused",
                follow_up_task_template={
                    "title": "Investigate medication refusal",
                    "description": "Understand why elder is refusing medication and escalate if needed",
                    "priority": "high",
                    "estimatedMinutes": 20,
                    "checklist": [
                        {"text": "Ask about side effects or concerns", "required": True},
                        {"text": "Contact primary care physician if needed", "required": True},
                        {"text": "Document refusal reason", "required": True}
                    ],
                    "dueInHours": 2
                },
                due_in_hours=2
            ),
            FollowUpRule(
                outcome_condition="Unable to verify",
                follow_up_task_template={
                    "title": "Escalate medication verification issue",
                    "description": "Unable to verify medication status - escalate to primary caregiver",
                    "priority": "urgent",
                    "estimatedMinutes": 10,
                    "checklist": [
                        {"text": "Contact primary caregiver", "required": True},
                        {"text": "Provide context about verification issue", "required": True}
                    ],
                    "dueInHours": 1
                },
                due_in_hours=1
            )
        ],
        evidence_types=["photo", "notes", "timestamp"]
    )

def create_safety_template() -> OutcomeTemplateDefinition:
    """Create safety check outcome template"""
    return OutcomeTemplateDefinition(
        template_type=OutcomeTemplateType.SAFETY,
        title="Safety Check Outcome",
        description="Document the outcome of safety check task",
        outcome_options=[
            "All safety checks passed",
            "Minor safety issues found",
            "Major safety concerns identified",
            "Immediate intervention required"
        ],
        follow_up_rules=[
            FollowUpRule(
                outcome_condition="Minor safety issues found",
                follow_up_task_template={
                    "title": "Address minor safety issues",
                    "description": "Implement solutions for identified minor safety concerns",
                    "priority": "medium",
                    "estimatedMinutes": 30,
                    "checklist": [
                        {"text": "Identify specific safety issues", "required": True},
                        {"text": "Implement corrective measures", "required": True},
                        {"text": "Verify improvements", "required": True}
                    ],
                    "dueInHours": 24
                },
                due_in_hours=24
            ),
            FollowUpRule(
                outcome_condition="Major safety concerns identified",
                follow_up_task_template={
                    "title": "Address major safety concerns",
                    "description": "Urgent action needed to address major safety concerns",
                    "priority": "urgent",
                    "estimatedMinutes": 60,
                    "checklist": [
                        {"text": "Document all safety concerns", "required": True},
                        {"text": "Contact family members", "required": True},
                        {"text": "Implement immediate safety measures", "required": True},
                        {"text": "Consider professional assessment", "required": True}
                    ],
                    "dueInHours": 2
                },
                due_in_hours=2
            ),
            FollowUpRule(
                outcome_condition="Immediate intervention required",
                follow_up_task_template={
                    "title": "Emergency safety intervention",
                    "description": "Immediate action required for critical safety issue",
                    "priority": "urgent",
                    "estimatedMinutes": 15,
                    "checklist": [
                        {"text": "Ensure elder safety immediately", "required": True},
                        {"text": "Contact emergency services if needed", "required": True},
                        {"text": "Notify all family members", "required": True}
                    ],
                    "dueInHours": 0.5
                },
                due_in_hours=0.5
            )
        ],
        evidence_types=["photo", "video", "notes", "timestamp"]
    )

def create_appointment_template() -> OutcomeTemplateDefinition:
    """Create medical appointment outcome template"""
    return OutcomeTemplateDefinition(
        template_type=OutcomeTemplateType.APPOINTMENT,
        title="Medical Appointment Outcome",
        description="Document the outcome of medical appointment",
        outcome_options=[
            "Appointment completed successfully",
            "Appointment rescheduled",
            "Appointment cancelled",
            "Elder refused to attend",
            "Transportation issue"
        ],
        follow_up_rules=[
            FollowUpRule(
                outcome_condition="Appointment completed successfully",
                follow_up_task_template={
                    "title": "Document appointment results",
                    "description": "Collect and document results from completed appointment",
                    "priority": "medium",
                    "estimatedMinutes": 20,
                    "checklist": [
                        {"text": "Collect appointment summary from elder", "required": True},
                        {"text": "Document any new medications or instructions", "required": True},
                        {"text": "Schedule any recommended follow-ups", "required": True}
                    ],
                    "dueInHours": 4
                },
                due_in_hours=4
            ),
            FollowUpRule(
                outcome_condition="Appointment rescheduled",
                follow_up_task_template={
                    "title": "Confirm rescheduled appointment",
                    "description": "Confirm new appointment date and time with elder",
                    "priority": "medium",
                    "estimatedMinutes": 10,
                    "checklist": [
                        {"text": "Confirm new appointment date/time", "required": True},
                        {"text": "Update calendar", "required": True},
                        {"text": "Arrange transportation if needed", "required": True}
                    ],
                    "dueInHours": 24
                },
                due_in_hours=24
            ),
            FollowUpRule(
                outcome_condition="Elder refused to attend",
                follow_up_task_template={
                    "title": "Follow up on appointment refusal",
                    "description": "Understand why elder refused appointment and escalate if needed",
                    "priority": "high",
                    "estimatedMinutes": 20,
                    "checklist": [
                        {"text": "Understand reason for refusal", "required": True},
                        {"text": "Contact physician if medically necessary", "required": True},
                        {"text": "Document refusal and reason", "required": True}
                    ],
                    "dueInHours": 4
                },
                due_in_hours=4
            )
        ],
        evidence_types=["notes", "documents", "timestamp"]
    )

def create_general_template() -> OutcomeTemplateDefinition:
    """Create general task outcome template"""
    return OutcomeTemplateDefinition(
        template_type=OutcomeTemplateType.GENERAL,
        title="General Task Outcome",
        description="Document the outcome of a general care task",
        outcome_options=[
            "Completed successfully",
            "Partially completed",
            "Not completed",
            "Escalated"
        ],
        follow_up_rules=[
            FollowUpRule(
                outcome_condition="Partially completed",
                follow_up_task_template={
                    "title": "Complete remaining task items",
                    "description": "Complete the remaining items from the original task",
                    "priority": "medium",
                    "estimatedMinutes": 30,
                    "checklist": [
                        {"text": "Review what was not completed", "required": True},
                        {"text": "Complete remaining items", "required": True},
                        {"text": "Verify completion", "required": True}
                    ],
                    "dueInHours": 24
                },
                due_in_hours=24
            ),
            FollowUpRule(
                outcome_condition="Not completed",
                follow_up_task_template={
                    "title": "Retry incomplete task",
                    "description": "Attempt to complete the task again",
                    "priority": "high",
                    "estimatedMinutes": 30,
                    "checklist": [
                        {"text": "Understand reason for non-completion", "required": True},
                        {"text": "Address any barriers", "required": True},
                        {"text": "Retry task completion", "required": True}
                    ],
                    "dueInHours": 12
                },
                due_in_hours=12
            ),
            FollowUpRule(
                outcome_condition="Escalated",
                follow_up_task_template={
                    "title": "Handle escalated task",
                    "description": "Task has been escalated and requires attention",
                    "priority": "urgent",
                    "estimatedMinutes": 20,
                    "checklist": [
                        {"text": "Review escalation reason", "required": True},
                        {"text": "Determine appropriate action", "required": True},
                        {"text": "Assign to appropriate person", "required": True}
                    ],
                    "dueInHours": 2
                },
                due_in_hours=2
            )
        ],
        evidence_types=["notes", "timestamp"]
    )

# Outcome Templates Registry
OUTCOME_TEMPLATES = {
    OutcomeTemplateType.MEDICATION: create_medication_template,
    OutcomeTemplateType.SAFETY: create_safety_template,
    OutcomeTemplateType.APPOINTMENT: create_appointment_template,
    OutcomeTemplateType.GENERAL: create_general_template
}

# =============================================
# Outcome Capture Service
# =============================================

class OutcomeCaptureService:
    """Backend service for outcome capture and follow-up automation"""
    
    @staticmethod
    def get_outcome_template(template_type: str) -> Optional[OutcomeTemplateDefinition]:
        """Get outcome template by type"""
        try:
            template_enum = OutcomeTemplateType(template_type)
            template_factory = OUTCOME_TEMPLATES.get(template_enum)
            if template_factory:
                return template_factory()
        except ValueError:
            pass
        return None
    
    @staticmethod
    def get_available_templates() -> List[Dict[str, Any]]:
        """Get all available outcome templates"""
        templates = []
        for template_factory in OUTCOME_TEMPLATES.values():
            template = template_factory()
            templates.append({
                'templateType': template.template_type.value,
                'title': template.title,
                'description': template.description,
                'outcomeOptions': template.outcome_options,
                'evidenceTypes': template.evidence_types
            })
        return templates
    
    @staticmethod
    def capture_outcome(
        task_id: str,
        template_type: str,
        outcome: str,
        notes: str,
        evidence: Optional[List[Dict[str, Any]]] = None
    ) -> Tuple[bool, List[str], Optional[Dict[str, Any]]]:
        """Capture outcome with validation"""
        template = OutcomeCaptureService.get_outcome_template(template_type)
        if not template:
            return False, ["Invalid outcome template type"], None
        
        errors = []
        
        # Validate outcome selection
        if outcome not in template.outcome_options:
            errors.append(f"Invalid outcome: {outcome}")
        
        if errors:
            return False, errors, None
        
        captured_outcome = {
            'actionTaken': outcome,
            'emergencyServicesCalled': False,
            'notes': notes,
            'evidence': evidence or [],
            'followUpRequired': OutcomeCaptureService._should_generate_follow_up(template, outcome),
            'nextCheckIn': OutcomeCaptureService._calculate_next_check_in(template, outcome)
        }
        
        logger.info(f"Outcome captured for task {task_id}: {outcome}")
        return True, [], captured_outcome
    
    @staticmethod
    def generate_follow_up_tasks(
        template_type: str,
        outcome: str
    ) -> List[Dict[str, Any]]:
        """Generate follow-up tasks based on outcome"""
        template = OutcomeCaptureService.get_outcome_template(template_type)
        if not template:
            return []
        
        follow_up_tasks = []
        
        for rule in template.follow_up_rules:
            if OutcomeCaptureService._evaluate_outcome_condition(rule.outcome_condition, outcome):
                follow_up_tasks.append(rule.follow_up_task_template)
                logger.info(f"Generated follow-up task for outcome: {outcome}")
        
        return follow_up_tasks
    
    @staticmethod
    def create_timeline_entry(
        family_id: str,
        elder_id: str,
        task_id: str,
        outcome: Dict[str, Any],
        template_type: str,
        caregiver: Dict[str, str]
    ) -> Dict[str, Any]:
        """Create immutable timeline entry for outcome"""
        now = datetime.utcnow().isoformat() + 'Z'
        timeline_id = f"TIMELINE#{task_id}#{uuid.uuid4().hex[:8]}"
        
        timeline_entry = {
            'id': timeline_id,
            'familyId': family_id,
            'elderId': elder_id,
            'timestamp': now,
            'eventType': 'outcome_captured',
            'title': f"Task Outcome: {template_type}",
            'description': outcome.get('notes', outcome.get('actionTaken', '')),
            'details': {
                'taskId': task_id,
                'templateType': template_type,
                'outcome': outcome.get('actionTaken'),
                'notes': outcome.get('notes'),
                'evidence': outcome.get('evidence', []),
                'followUpRequired': outcome.get('followUpRequired', False)
            },
            'caregiver': caregiver,
            'immutable': True,
            'createdAt': now,
            'updatedAt': now
        }
        
        logger.info(f"Created timeline entry: {timeline_id}")
        return timeline_entry
    
    @staticmethod
    def validate_outcome_completeness(
        template_type: str,
        outcome: str,
        notes: str
    ) -> Tuple[bool, List[str]]:
        """Validate outcome completeness"""
        template = OutcomeCaptureService.get_outcome_template(template_type)
        if not template:
            return False, ["Invalid template type"]
        
        missing_fields = []
        
        if not outcome or outcome not in template.outcome_options:
            missing_fields.append("Outcome selection")
        
        # Notes are optional but recommended for certain outcomes
        if not notes and outcome in ["Partially completed", "Not completed", "Escalated"]:
            missing_fields.append("Notes (recommended for this outcome)")
        
        return len(missing_fields) == 0, missing_fields
    
    @staticmethod
    def get_evidence_requirements(template_type: str) -> List[str]:
        """Get evidence requirements for template"""
        template = OutcomeCaptureService.get_outcome_template(template_type)
        return template.evidence_types if template else []
    
    @staticmethod
    def to_dynamodb_item(
        family_id: str,
        outcome_data: Dict[str, Any],
        task_id: str
    ) -> Dict[str, Any]:
        """Convert outcome to DynamoDB item format"""
        now = datetime.utcnow().isoformat() + 'Z'
        outcome_id = f"OUTCOME#{task_id}#{uuid.uuid4().hex[:8]}"
        
        return {
            'PK': f'FAMILY#{family_id}',
            'SK': outcome_id,
            'GSI1PK': f'TASK#{task_id}',
            'GSI1SK': now,
            'outcome_id': outcome_id,
            'task_id': task_id,
            'action_taken': outcome_data.get('actionTaken'),
            'notes': outcome_data.get('notes'),
            'evidence': outcome_data.get('evidence', []),
            'follow_up_required': outcome_data.get('followUpRequired', False),
            'next_check_in': outcome_data.get('nextCheckIn'),
            'created_at': now,
            'updated_at': now,
            'entity_type': 'outcome'
        }
    
    # =============================================
    # Private Helper Methods
    # =============================================
    
    @staticmethod
    def _should_generate_follow_up(template: OutcomeTemplateDefinition, outcome: str) -> bool:
        """Check if follow-up should be generated"""
        return any(
            OutcomeCaptureService._evaluate_outcome_condition(rule.outcome_condition, outcome)
            for rule in template.follow_up_rules
        )
    
    @staticmethod
    def _calculate_next_check_in(template: OutcomeTemplateDefinition, outcome: str) -> Optional[str]:
        """Calculate next check-in time"""
        for rule in template.follow_up_rules:
            if OutcomeCaptureService._evaluate_outcome_condition(rule.outcome_condition, outcome):
                next_check_in = datetime.utcnow() + timedelta(hours=rule.due_in_hours)
                return next_check_in.isoformat() + 'Z'
        return None
    
    @staticmethod
    def _evaluate_outcome_condition(condition: str, outcome: str) -> bool:
        """Evaluate outcome condition"""
        return condition == outcome

# =============================================
# Utility Functions
# =============================================

def get_outcome_template(template_type: str) -> Optional[Dict[str, Any]]:
    """Get outcome template by type"""
    template = OutcomeCaptureService.get_outcome_template(template_type)
    if not template:
        return None
    
    return {
        'templateType': template.template_type.value,
        'title': template.title,
        'description': template.description,
        'outcomeOptions': template.outcome_options,
        'evidenceTypes': template.evidence_types
    }

def capture_outcome(
    task_id: str,
    template_type: str,
    outcome: str,
    notes: str,
    evidence: Optional[List[Dict[str, Any]]] = None
) -> Tuple[bool, List[str], Optional[Dict[str, Any]]]:
    """Capture outcome with validation"""
    return OutcomeCaptureService.capture_outcome(task_id, template_type, outcome, notes, evidence)

def generate_follow_up_tasks(template_type: str, outcome: str) -> List[Dict[str, Any]]:
    """Generate follow-up tasks"""
    return OutcomeCaptureService.generate_follow_up_tasks(template_type, outcome)

def create_timeline_entry(
    family_id: str,
    elder_id: str,
    task_id: str,
    outcome: Dict[str, Any],
    template_type: str,
    caregiver: Dict[str, str]
) -> Dict[str, Any]:
    """Create timeline entry"""
    return OutcomeCaptureService.create_timeline_entry(family_id, elder_id, task_id, outcome, template_type, caregiver)
