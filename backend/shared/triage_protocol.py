"""
Triage Protocol State Machine - Backend Implementation
Implements 4-step workflow: Safety Check → Assessment → Action Plan → Outcome Capture
"""

import json
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Union, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import uuid

from aws_lambda_powertools import Logger

logger = Logger()

# =============================================
# Enums and Data Classes
# =============================================

class ProtocolType(Enum):
    FALL = "fall"
    INJURY = "injury"
    CHEST_PAIN = "chest_pain"
    CONFUSION = "confusion"

class QuestionType(Enum):
    YES_NO = "yes_no"
    SCALE = "scale"
    MULTIPLE_CHOICE = "multiple_choice"
    TEXT = "text"

class ActionRecommendation(Enum):
    CALL_911 = "call_911"
    URGENT_CARE = "urgent_care"
    NURSE_LINE = "nurse_line"
    MONITOR = "monitor"

@dataclass
class TriageQuestion:
    id: str
    text: str
    type: QuestionType
    required: bool
    critical_flag: bool = False
    options: Optional[List[str]] = None

@dataclass
class StepTransition:
    condition: str
    next_step: Union[int, str]  # int for step number, 'emergency' or 'complete'

@dataclass
class TriageStep:
    step_number: int
    title: str
    questions: List[TriageQuestion]
    critical_flags: List[str]
    next_step_logic: List[StepTransition]

@dataclass
class TriageProtocolTemplate:
    protocol_type: ProtocolType
    steps: List[TriageStep]

@dataclass
class ActionPlan:
    recommendation: ActionRecommendation
    call_script: str
    urgency_level: int  # 1-10 scale
    estimated_timeframe: str
    follow_up_tasks: List[Dict[str, Any]]

@dataclass
class TriageOutcome:
    action_taken: str
    emergency_services_called: bool
    notes: str
    evidence: List[Dict[str, Any]]
    follow_up_required: bool
    next_check_in: Optional[str] = None

# =============================================
# Protocol Templates
# =============================================

def create_fall_protocol() -> TriageProtocolTemplate:
    """Create fall protocol template"""
    return TriageProtocolTemplate(
        protocol_type=ProtocolType.FALL,
        steps=[
            TriageStep(
                step_number=1,
                title="Immediate Safety Check",
                questions=[
                    TriageQuestion(
                        id="consciousness",
                        text="Is the elder conscious and breathing normally?",
                        type=QuestionType.YES_NO,
                        required=True,
                        critical_flag=True
                    ),
                    TriageQuestion(
                        id="severe_injury",
                        text="Is there severe bleeding, head injury, or inability to move?",
                        type=QuestionType.YES_NO,
                        required=True,
                        critical_flag=True
                    ),
                    TriageQuestion(
                        id="pain_level_initial",
                        text="On a scale of 1-10, how severe is the pain?",
                        type=QuestionType.SCALE,
                        required=True,
                        critical_flag=False
                    )
                ],
                critical_flags=["consciousness_no", "severe_injury_yes", "pain_level_initial_8_plus"],
                next_step_logic=[
                    StepTransition(
                        condition="consciousness_no OR severe_injury_yes OR pain_level_initial >= 8",
                        next_step="emergency"
                    ),
                    StepTransition(
                        condition="consciousness_yes AND severe_injury_no AND pain_level_initial < 8",
                        next_step=2
                    )
                ]
            ),
            TriageStep(
                step_number=2,
                title="Rapid Assessment",
                questions=[
                    TriageQuestion(
                        id="pain_location",
                        text="Where is the pain located?",
                        type=QuestionType.MULTIPLE_CHOICE,
                        options=["Head/Neck", "Back/Spine", "Hip/Pelvis", "Arm/Shoulder", "Leg/Knee", "Other"],
                        required=True
                    ),
                    TriageQuestion(
                        id="mobility_status",
                        text="Can the elder move without assistance?",
                        type=QuestionType.YES_NO,
                        required=True
                    ),
                    TriageQuestion(
                        id="current_medications",
                        text="Is the elder taking blood thinners or other medications?",
                        type=QuestionType.YES_NO,
                        required=True
                    ),
                    TriageQuestion(
                        id="head_injury_check",
                        text="Did the elder hit their head during the fall?",
                        type=QuestionType.YES_NO,
                        required=True,
                        critical_flag=True
                    ),
                    TriageQuestion(
                        id="confusion_check",
                        text="Is the elder confused or disoriented?",
                        type=QuestionType.YES_NO,
                        required=True,
                        critical_flag=True
                    )
                ],
                critical_flags=["head_injury_check_yes", "confusion_check_yes"],
                next_step_logic=[
                    StepTransition(
                        condition="head_injury_check_yes OR confusion_check_yes",
                        next_step="emergency"
                    ),
                    StepTransition(
                        condition="mobility_status_no",
                        next_step="emergency"
                    ),
                    StepTransition(
                        condition="DEFAULT",
                        next_step=3
                    )
                ]
            ),
            TriageStep(
                step_number=3,
                title="Action Plan Generation",
                questions=[
                    TriageQuestion(
                        id="action_preference",
                        text="Based on the assessment, what action would you prefer?",
                        type=QuestionType.MULTIPLE_CHOICE,
                        options=["Call 911", "Go to Urgent Care", "Call Nurse Line", "Monitor at Home"],
                        required=True
                    )
                ],
                critical_flags=[],
                next_step_logic=[
                    StepTransition(condition="DEFAULT", next_step=4)
                ]
            ),
            TriageStep(
                step_number=4,
                title="Outcome Capture",
                questions=[
                    TriageQuestion(
                        id="action_taken",
                        text="What action was taken?",
                        type=QuestionType.TEXT,
                        required=True
                    ),
                    TriageQuestion(
                        id="emergency_called",
                        text="Were emergency services called?",
                        type=QuestionType.YES_NO,
                        required=True
                    ),
                    TriageQuestion(
                        id="outcome_notes",
                        text="Additional notes about the outcome:",
                        type=QuestionType.TEXT,
                        required=False
                    )
                ],
                critical_flags=[],
                next_step_logic=[
                    StepTransition(condition="DEFAULT", next_step="complete")
                ]
            )
        ]
    )

def create_injury_protocol() -> TriageProtocolTemplate:
    """Create injury protocol template"""
    return TriageProtocolTemplate(
        protocol_type=ProtocolType.INJURY,
        steps=[
            TriageStep(
                step_number=1,
                title="Immediate Safety Check",
                questions=[
                    TriageQuestion(
                        id="consciousness",
                        text="Is the elder conscious and alert?",
                        type=QuestionType.YES_NO,
                        required=True,
                        critical_flag=True
                    ),
                    TriageQuestion(
                        id="bleeding_severity",
                        text="Is there active bleeding?",
                        type=QuestionType.MULTIPLE_CHOICE,
                        options=["No bleeding", "Minor bleeding", "Moderate bleeding", "Severe bleeding"],
                        required=True,
                        critical_flag=True
                    ),
                    TriageQuestion(
                        id="breathing_status",
                        text="Is breathing normal and unlabored?",
                        type=QuestionType.YES_NO,
                        required=True,
                        critical_flag=True
                    )
                ],
                critical_flags=["consciousness_no", "bleeding_severity_severe", "breathing_status_no"],
                next_step_logic=[
                    StepTransition(
                        condition="consciousness_no OR bleeding_severity_severe OR breathing_status_no",
                        next_step="emergency"
                    ),
                    StepTransition(condition="DEFAULT", next_step=2)
                ]
            ),
            TriageStep(
                step_number=2,
                title="Rapid Assessment",
                questions=[
                    TriageQuestion(
                        id="injury_location",
                        text="Where is the injury located?",
                        type=QuestionType.MULTIPLE_CHOICE,
                        options=["Head/Face", "Neck", "Chest", "Abdomen", "Arms", "Legs", "Back"],
                        required=True
                    ),
                    TriageQuestion(
                        id="pain_scale",
                        text="Pain level (0-10 scale):",
                        type=QuestionType.SCALE,
                        required=True
                    ),
                    TriageQuestion(
                        id="mobility_affected",
                        text="Is mobility affected by the injury?",
                        type=QuestionType.YES_NO,
                        required=True
                    ),
                    TriageQuestion(
                        id="swelling_present",
                        text="Is there visible swelling or deformity?",
                        type=QuestionType.YES_NO,
                        required=True
                    )
                ],
                critical_flags=["pain_scale_8_plus"],
                next_step_logic=[
                    StepTransition(
                        condition="pain_scale >= 8",
                        next_step="emergency"
                    ),
                    StepTransition(condition="DEFAULT", next_step=3)
                ]
            ),
            TriageStep(
                step_number=3,
                title="Action Plan Generation",
                questions=[
                    TriageQuestion(
                        id="recommended_action",
                        text="Recommended next step:",
                        type=QuestionType.MULTIPLE_CHOICE,
                        options=["Emergency Room", "Urgent Care", "Primary Care", "Home Care"],
                        required=True
                    )
                ],
                critical_flags=[],
                next_step_logic=[
                    StepTransition(condition="DEFAULT", next_step=4)
                ]
            ),
            TriageStep(
                step_number=4,
                title="Outcome Capture",
                questions=[
                    TriageQuestion(
                        id="action_taken",
                        text="Action taken:",
                        type=QuestionType.TEXT,
                        required=True
                    ),
                    TriageQuestion(
                        id="emergency_called",
                        text="Were emergency services contacted?",
                        type=QuestionType.YES_NO,
                        required=True
                    ),
                    TriageQuestion(
                        id="follow_up_needed",
                        text="Is follow-up care needed?",
                        type=QuestionType.YES_NO,
                        required=True
                    )
                ],
                critical_flags=[],
                next_step_logic=[
                    StepTransition(condition="DEFAULT", next_step="complete")
                ]
            )
        ]
    )

def create_chest_pain_protocol() -> TriageProtocolTemplate:
    """Create chest pain protocol template"""
    return TriageProtocolTemplate(
        protocol_type=ProtocolType.CHEST_PAIN,
        steps=[
            TriageStep(
                step_number=1,
                title="Immediate Safety Check",
                questions=[
                    TriageQuestion(
                        id="consciousness",
                        text="Is the elder conscious and responsive?",
                        type=QuestionType.YES_NO,
                        required=True,
                        critical_flag=True
                    ),
                    TriageQuestion(
                        id="chest_pain_severity",
                        text="How severe is the chest pain (0-10)?",
                        type=QuestionType.SCALE,
                        required=True,
                        critical_flag=True
                    ),
                    TriageQuestion(
                        id="breathing_difficulty",
                        text="Is there difficulty breathing or shortness of breath?",
                        type=QuestionType.YES_NO,
                        required=True,
                        critical_flag=True
                    ),
                    TriageQuestion(
                        id="sweating_nausea",
                        text="Is there sweating, nausea, or dizziness?",
                        type=QuestionType.YES_NO,
                        required=True,
                        critical_flag=True
                    )
                ],
                critical_flags=["consciousness_no", "chest_pain_severity_7_plus", "breathing_difficulty_yes", "sweating_nausea_yes"],
                next_step_logic=[
                    StepTransition(
                        condition="consciousness_no OR chest_pain_severity >= 7 OR breathing_difficulty_yes OR sweating_nausea_yes",
                        next_step="emergency"
                    ),
                    StepTransition(condition="DEFAULT", next_step=2)
                ]
            ),
            TriageStep(
                step_number=2,
                title="Rapid Assessment",
                questions=[
                    TriageQuestion(
                        id="pain_duration",
                        text="How long has the chest pain been present?",
                        type=QuestionType.MULTIPLE_CHOICE,
                        options=["Less than 5 minutes", "5-15 minutes", "15-30 minutes", "More than 30 minutes"],
                        required=True
                    ),
                    TriageQuestion(
                        id="pain_radiation",
                        text="Does the pain radiate to arm, jaw, or back?",
                        type=QuestionType.YES_NO,
                        required=True,
                        critical_flag=True
                    ),
                    TriageQuestion(
                        id="cardiac_history",
                        text="Does the elder have a history of heart problems?",
                        type=QuestionType.YES_NO,
                        required=True
                    ),
                    TriageQuestion(
                        id="current_medications",
                        text="Is the elder taking heart medications?",
                        type=QuestionType.YES_NO,
                        required=True
                    )
                ],
                critical_flags=["pain_radiation_yes"],
                next_step_logic=[
                    StepTransition(
                        condition="pain_radiation_yes OR pain_duration_more_than_30",
                        next_step="emergency"
                    ),
                    StepTransition(condition="DEFAULT", next_step=3)
                ]
            ),
            TriageStep(
                step_number=3,
                title="Action Plan Generation",
                questions=[
                    TriageQuestion(
                        id="immediate_action",
                        text="Immediate action required:",
                        type=QuestionType.MULTIPLE_CHOICE,
                        options=["Call 911 Immediately", "Go to Emergency Room", "Call Cardiologist", "Monitor Closely"],
                        required=True
                    )
                ],
                critical_flags=[],
                next_step_logic=[
                    StepTransition(condition="DEFAULT", next_step=4)
                ]
            ),
            TriageStep(
                step_number=4,
                title="Outcome Capture",
                questions=[
                    TriageQuestion(
                        id="action_taken",
                        text="Action taken:",
                        type=QuestionType.TEXT,
                        required=True
                    ),
                    TriageQuestion(
                        id="emergency_called",
                        text="Were emergency services called?",
                        type=QuestionType.YES_NO,
                        required=True
                    ),
                    TriageQuestion(
                        id="symptoms_resolved",
                        text="Have symptoms improved or resolved?",
                        type=QuestionType.YES_NO,
                        required=True
                    )
                ],
                critical_flags=[],
                next_step_logic=[
                    StepTransition(condition="DEFAULT", next_step="complete")
                ]
            )
        ]
    )

def create_confusion_protocol() -> TriageProtocolTemplate:
    """Create confusion protocol template"""
    return TriageProtocolTemplate(
        protocol_type=ProtocolType.CONFUSION,
        steps=[
            TriageStep(
                step_number=1,
                title="Immediate Safety Check",
                questions=[
                    TriageQuestion(
                        id="responsiveness",
                        text="Is the elder responsive to voice and touch?",
                        type=QuestionType.YES_NO,
                        required=True,
                        critical_flag=True
                    ),
                    TriageQuestion(
                        id="orientation_check",
                        text="Does the elder know their name, location, and date?",
                        type=QuestionType.MULTIPLE_CHOICE,
                        options=["Knows all three", "Knows two", "Knows one", "Knows none"],
                        required=True,
                        critical_flag=True
                    ),
                    TriageQuestion(
                        id="physical_symptoms",
                        text="Are there any physical symptoms (fever, weakness, difficulty speaking)?",
                        type=QuestionType.YES_NO,
                        required=True,
                        critical_flag=True
                    )
                ],
                critical_flags=["responsiveness_no", "orientation_check_knows_none", "physical_symptoms_yes"],
                next_step_logic=[
                    StepTransition(
                        condition="responsiveness_no OR orientation_check_knows_none OR physical_symptoms_yes",
                        next_step="emergency"
                    ),
                    StepTransition(condition="DEFAULT", next_step=2)
                ]
            ),
            TriageStep(
                step_number=2,
                title="Rapid Assessment",
                questions=[
                    TriageQuestion(
                        id="confusion_onset",
                        text="When did the confusion start?",
                        type=QuestionType.MULTIPLE_CHOICE,
                        options=["Suddenly (minutes)", "Gradually (hours)", "Over days", "Chronic/ongoing"],
                        required=True
                    ),
                    TriageQuestion(
                        id="medication_changes",
                        text="Have there been recent medication changes?",
                        type=QuestionType.YES_NO,
                        required=True
                    ),
                    TriageQuestion(
                        id="recent_illness",
                        text="Has the elder been ill recently (UTI, infection, etc.)?",
                        type=QuestionType.YES_NO,
                        required=True
                    ),
                    TriageQuestion(
                        id="safety_concerns",
                        text="Are there immediate safety concerns (wandering, agitation)?",
                        type=QuestionType.YES_NO,
                        required=True,
                        critical_flag=True
                    )
                ],
                critical_flags=["safety_concerns_yes"],
                next_step_logic=[
                    StepTransition(
                        condition="safety_concerns_yes OR confusion_onset_suddenly",
                        next_step="emergency"
                    ),
                    StepTransition(condition="DEFAULT", next_step=3)
                ]
            ),
            TriageStep(
                step_number=3,
                title="Action Plan Generation",
                questions=[
                    TriageQuestion(
                        id="recommended_care",
                        text="Recommended level of care:",
                        type=QuestionType.MULTIPLE_CHOICE,
                        options=["Emergency Room", "Urgent Care", "Primary Care Same Day", "Schedule Appointment"],
                        required=True
                    )
                ],
                critical_flags=[],
                next_step_logic=[
                    StepTransition(condition="DEFAULT", next_step=4)
                ]
            ),
            TriageStep(
                step_number=4,
                title="Outcome Capture",
                questions=[
                    TriageQuestion(
                        id="action_taken",
                        text="Action taken:",
                        type=QuestionType.TEXT,
                        required=True
                    ),
                    TriageQuestion(
                        id="emergency_called",
                        text="Were emergency services called?",
                        type=QuestionType.YES_NO,
                        required=True
                    ),
                    TriageQuestion(
                        id="safety_measures",
                        text="What safety measures were implemented?",
                        type=QuestionType.TEXT,
                        required=False
                    )
                ],
                critical_flags=[],
                next_step_logic=[
                    StepTransition(condition="DEFAULT", next_step="complete")
                ]
            )
        ]
    )

# Protocol Templates Registry
PROTOCOL_TEMPLATES = {
    ProtocolType.FALL: create_fall_protocol,
    ProtocolType.INJURY: create_injury_protocol,
    ProtocolType.CHEST_PAIN: create_chest_pain_protocol,
    ProtocolType.CONFUSION: create_confusion_protocol
}

# =============================================
# Triage Protocol State Machine
# =============================================

class TriageProtocolStateMachine:
    """Backend implementation of the triage protocol state machine"""
    
    def __init__(self, alert_id: str, protocol_type: str):
        self.alert_id = alert_id
        self.protocol_type = ProtocolType(protocol_type)
        self.template = PROTOCOL_TEMPLATES[self.protocol_type]()
        self.current_step_number = 1
        self.responses: Dict[str, Any] = {}
        self.created_at = datetime.utcnow().isoformat() + 'Z'
        self.updated_at = self.created_at
        
    def get_current_step(self) -> Dict[str, Any]:
        """Get the current step information"""
        current_step = self._find_step_by_number(self.current_step_number)
        if not current_step:
            raise ValueError(f"Step {self.current_step_number} not found")
        
        return {
            'stepNumber': current_step.step_number,
            'title': current_step.title,
            'questions': [self._question_to_dict(q) for q in current_step.questions],
            'criticalFlags': current_step.critical_flags,
            'nextStepLogic': [self._transition_to_dict(t) for t in current_step.next_step_logic]
        }
    
    def record_response(self, question_id: str, response: Any) -> None:
        """Record a response to a question"""
        self.responses[question_id] = response
        self.updated_at = datetime.utcnow().isoformat() + 'Z'
        logger.info(f"Recorded response for {question_id}: {response}")
    
    def has_critical_flags(self) -> bool:
        """Check if current step has critical flags triggered"""
        current_step = self._find_step_by_number(self.current_step_number)
        if not current_step:
            return False
        
        for flag in current_step.critical_flags:
            if self._evaluate_condition(flag):
                logger.warning(f"Critical flag triggered: {flag}")
                return True
        
        return False
    
    def get_next_step(self) -> Union[int, str]:
        """Determine the next step based on current responses"""
        current_step = self._find_step_by_number(self.current_step_number)
        if not current_step:
            return "complete"
        
        # Evaluate step transition logic
        for transition in current_step.next_step_logic:
            if self._evaluate_condition(transition.condition):
                logger.info(f"Transition condition met: {transition.condition} -> {transition.next_step}")
                return transition.next_step
        
        # Default: go to next sequential step
        next_step_number = self.current_step_number + 1
        if self._find_step_by_number(next_step_number):
            return next_step_number
        
        return "complete"
    
    def proceed_to_next_step(self) -> Union[Dict[str, Any], str]:
        """Proceed to the next step"""
        next_step = self.get_next_step()
        
        if next_step == "emergency" or next_step == "complete":
            return next_step
        
        if isinstance(next_step, int):
            self.current_step_number = next_step
            self.updated_at = datetime.utcnow().isoformat() + 'Z'
            return self.get_current_step()
        
        return "complete"
    
    def generate_action_plan(self) -> Dict[str, Any]:
        """Generate action plan based on responses"""
        # Check for emergency escalation
        if self.has_critical_flags():
            return self._generate_emergency_action_plan()
        
        # Generate protocol-specific action plan
        return self._generate_protocol_specific_action_plan()
    
    def validate_current_step(self) -> Tuple[bool, List[str]]:
        """Validate that all required questions in current step are answered"""
        current_step = self._find_step_by_number(self.current_step_number)
        if not current_step:
            return False, ["Invalid step"]
        
        missing_questions = []
        for question in current_step.questions:
            if question.required and question.id not in self.responses:
                missing_questions.append(question.text)
        
        return len(missing_questions) == 0, missing_questions
    
    def get_protocol_state(self) -> Dict[str, Any]:
        """Get the complete protocol state"""
        return {
            'alertId': self.alert_id,
            'protocolType': self.protocol_type.value,
            'currentStep': self.get_current_step(),
            'responses': self.responses,
            'createdAt': self.created_at,
            'updatedAt': self.updated_at
        }
    
    def to_dynamodb_item(self, family_id: str) -> Dict[str, Any]:
        """Convert to DynamoDB item format"""
        protocol_id = f"PROTOCOL#{self.alert_id}#{uuid.uuid4().hex[:8]}"
        
        return {
            'PK': f'FAMILY#{family_id}',
            'SK': protocol_id,
            'GSI1PK': f'ALERT#{self.alert_id}',
            'GSI1SK': self.created_at,
            'protocol_id': protocol_id,
            'alert_id': self.alert_id,
            'protocol_type': self.protocol_type.value,
            'current_step': self.current_step_number,
            'responses': self.responses,
            'created_at': self.created_at,
            'updated_at': self.updated_at,
            'entity_type': 'triage_protocol'
        }
    
    # =============================================
    # Private Helper Methods
    # =============================================
    
    def _find_step_by_number(self, step_number: int) -> Optional[TriageStep]:
        """Find step by step number"""
        for step in self.template.steps:
            if step.step_number == step_number:
                return step
        return None
    
    def _question_to_dict(self, question: TriageQuestion) -> Dict[str, Any]:
        """Convert question to dictionary"""
        return {
            'id': question.id,
            'text': question.text,
            'type': question.type.value,
            'required': question.required,
            'criticalFlag': question.critical_flag,
            'options': question.options
        }
    
    def _transition_to_dict(self, transition: StepTransition) -> Dict[str, Any]:
        """Convert transition to dictionary"""
        return {
            'condition': transition.condition,
            'nextStep': transition.next_step
        }
    
    def _evaluate_condition(self, condition: str) -> bool:
        """Evaluate a condition string against current responses"""
        if condition == "DEFAULT":
            return True
        
        # Handle OR conditions
        if " OR " in condition:
            or_conditions = condition.split(" OR ")
            return any(self._evaluate_single_condition(cond.strip()) for cond in or_conditions)
        
        # Handle AND conditions
        if " AND " in condition:
            and_conditions = condition.split(" AND ")
            return all(self._evaluate_single_condition(cond.strip()) for cond in and_conditions)
        
        # Single condition
        return self._evaluate_single_condition(condition)
    
    def _evaluate_single_condition(self, condition: str) -> bool:
        """Evaluate a single condition"""
        # Handle comparison operators
        if ">=" in condition:
            question_id, value = condition.split(">=")
            question_id = question_id.strip()
            value = value.strip()
            response = self.responses.get(question_id)
            return response is not None and float(response) >= float(value)
        
        if "<=" in condition:
            question_id, value = condition.split("<=")
            question_id = question_id.strip()
            value = value.strip()
            response = self.responses.get(question_id)
            return response is not None and float(response) <= float(value)
        
        # Handle exact matches (question_id_expected_value)
        parts = condition.split("_")
        if len(parts) >= 3:
            question_id = "_".join(parts[:-1])
            expected_value = parts[-1]
            response = self.responses.get(question_id)
            
            if expected_value == "yes":
                return response in [True, "yes", "Yes"]
            if expected_value == "no":
                return response in [False, "no", "No"]
            if expected_value.endswith("plus"):
                # Handle cases like "8_plus"
                threshold = expected_value.replace("_plus", "")
                try:
                    return response is not None and float(response) >= float(threshold)
                except (ValueError, TypeError):
                    return False
            
            return str(response) == expected_value
        
        return False
    
    def _generate_emergency_action_plan(self) -> Dict[str, Any]:
        """Generate emergency action plan"""
        call_scripts = {
            ProtocolType.FALL: "This is a medical emergency. An elderly person has fallen and may have serious injuries. Please send an ambulance immediately.",
            ProtocolType.INJURY: "This is a medical emergency. An elderly person has sustained a serious injury. Please send an ambulance immediately.",
            ProtocolType.CHEST_PAIN: "This is a medical emergency. An elderly person is experiencing severe chest pain. This may be a heart attack. Please send an ambulance immediately.",
            ProtocolType.CONFUSION: "This is a medical emergency. An elderly person is experiencing severe confusion or altered mental state. Please send an ambulance immediately."
        }
        
        return {
            'recommendation': ActionRecommendation.CALL_911.value,
            'callScript': call_scripts.get(self.protocol_type, "This is a medical emergency. Please send an ambulance immediately."),
            'urgencyLevel': 10,
            'estimatedTimeframe': 'Immediate',
            'followUpTasks': [
                {
                    'title': 'Follow up on emergency response',
                    'description': 'Contact family members and track emergency services response',
                    'priority': 'urgent',
                    'estimatedMinutes': 15,
                    'checklist': [
                        {'text': 'Confirm ambulance arrival', 'required': True},
                        {'text': 'Notify primary family contacts', 'required': True},
                        {'text': 'Gather medical information for hospital', 'required': True}
                    ],
                    'dueInHours': 1
                }
            ]
        }
    
    def _generate_protocol_specific_action_plan(self) -> Dict[str, Any]:
        """Generate protocol-specific action plan based on responses"""
        if self.protocol_type == ProtocolType.FALL:
            return self._generate_fall_action_plan()
        elif self.protocol_type == ProtocolType.INJURY:
            return self._generate_injury_action_plan()
        elif self.protocol_type == ProtocolType.CHEST_PAIN:
            return self._generate_chest_pain_action_plan()
        elif self.protocol_type == ProtocolType.CONFUSION:
            return self._generate_confusion_action_plan()
        else:
            return self._generate_default_action_plan()
    
    def _generate_fall_action_plan(self) -> Dict[str, Any]:
        """Generate fall-specific action plan"""
        pain_level = self.responses.get('pain_level_initial', 0)
        can_move = self.responses.get('mobility_status')
        
        try:
            pain_level = float(pain_level)
        except (ValueError, TypeError):
            pain_level = 0
        
        if pain_level >= 6 or can_move in [False, "no", "No"]:
            return {
                'recommendation': ActionRecommendation.URGENT_CARE.value,
                'callScript': 'The elder has fallen and is experiencing significant pain or mobility issues. Please arrange for urgent medical evaluation.',
                'urgencyLevel': 7,
                'estimatedTimeframe': 'Within 2 hours',
                'followUpTasks': [
                    {
                        'title': 'Arrange urgent care visit',
                        'description': 'Schedule and transport to urgent care facility',
                        'priority': 'high',
                        'estimatedMinutes': 60,
                        'checklist': [
                            {'text': 'Call urgent care to confirm availability', 'required': True},
                            {'text': 'Arrange transportation', 'required': True},
                            {'text': 'Gather insurance and medication information', 'required': True}
                        ],
                        'dueInHours': 2
                    }
                ]
            }
        
        return {
            'recommendation': ActionRecommendation.MONITOR.value,
            'callScript': 'The elder appears stable after the fall. Continue monitoring for any changes in condition.',
            'urgencyLevel': 4,
            'estimatedTimeframe': 'Monitor for 24 hours',
            'followUpTasks': [
                {
                    'title': 'Monitor post-fall condition',
                    'description': 'Check on elder regularly for next 24 hours',
                    'priority': 'medium',
                    'estimatedMinutes': 10,
                    'checklist': [
                        {'text': 'Check pain level every 4 hours', 'required': True},
                        {'text': 'Monitor mobility and balance', 'required': True},
                        {'text': 'Watch for signs of delayed injury', 'required': True}
                    ],
                    'dueInHours': 4
                }
            ]
        }
    
    def _generate_injury_action_plan(self) -> Dict[str, Any]:
        """Generate injury-specific action plan"""
        pain_level = self.responses.get('pain_scale', 0)
        bleeding_severity = self.responses.get('bleeding_severity', 'none')
        
        try:
            pain_level = float(pain_level)
        except (ValueError, TypeError):
            pain_level = 0
        
        if pain_level >= 7 or bleeding_severity == 'Moderate bleeding':
            return {
                'recommendation': ActionRecommendation.URGENT_CARE.value,
                'callScript': 'The elder has sustained an injury requiring medical attention. Please arrange for urgent care evaluation.',
                'urgencyLevel': 6,
                'estimatedTimeframe': 'Within 4 hours',
                'followUpTasks': []
            }
        
        return {
            'recommendation': ActionRecommendation.MONITOR.value,
            'callScript': 'The injury appears minor. Continue monitoring and provide basic first aid as needed.',
            'urgencyLevel': 3,
            'estimatedTimeframe': 'Monitor closely',
            'followUpTasks': []
        }
    
    def _generate_chest_pain_action_plan(self) -> Dict[str, Any]:
        """Generate chest pain-specific action plan"""
        # Chest pain should generally be treated seriously
        return {
            'recommendation': ActionRecommendation.URGENT_CARE.value,
            'callScript': 'The elder is experiencing chest pain. Given the potential cardiac implications, please arrange for immediate medical evaluation.',
            'urgencyLevel': 8,
            'estimatedTimeframe': 'Within 1 hour',
            'followUpTasks': [
                {
                    'title': 'Urgent cardiac evaluation',
                    'description': 'Ensure immediate medical assessment for chest pain',
                    'priority': 'urgent',
                    'estimatedMinutes': 30,
                    'checklist': [
                        {'text': 'Contact primary care physician', 'required': True},
                        {'text': 'Prepare cardiac medication list', 'required': True},
                        {'text': 'Monitor vital signs if possible', 'required': True}
                    ],
                    'dueInHours': 1
                }
            ]
        }
    
    def _generate_confusion_action_plan(self) -> Dict[str, Any]:
        """Generate confusion-specific action plan"""
        onset_type = self.responses.get('confusion_onset')
        medication_changes = self.responses.get('medication_changes')
        
        if onset_type == 'Suddenly (minutes)' or medication_changes in [True, "yes", "Yes"]:
            return {
                'recommendation': ActionRecommendation.URGENT_CARE.value,
                'callScript': 'The elder is experiencing confusion that may require immediate medical evaluation to rule out serious causes.',
                'urgencyLevel': 7,
                'estimatedTimeframe': 'Within 2 hours',
                'followUpTasks': []
            }
        
        return {
            'recommendation': ActionRecommendation.NURSE_LINE.value,
            'callScript': 'The elder is experiencing confusion. Please contact the nurse line or primary care provider for guidance.',
            'urgencyLevel': 5,
            'estimatedTimeframe': 'Within 4 hours',
            'followUpTasks': []
        }
    
    def _generate_default_action_plan(self) -> Dict[str, Any]:
        """Generate default action plan"""
        return {
            'recommendation': ActionRecommendation.MONITOR.value,
            'callScript': 'Continue monitoring the situation and contact healthcare provider if symptoms worsen.',
            'urgencyLevel': 3,
            'estimatedTimeframe': 'Within 24 hours',
            'followUpTasks': []
        }

# =============================================
# Utility Functions
# =============================================

def create_triage_protocol(alert_id: str, protocol_type: str) -> TriageProtocolStateMachine:
    """Create a new triage protocol instance"""
    return TriageProtocolStateMachine(alert_id, protocol_type)

def get_available_protocol_types() -> List[str]:
    """Get list of available protocol types"""
    return [pt.value for pt in ProtocolType]

def get_protocol_template(protocol_type: str) -> Optional[Dict[str, Any]]:
    """Get protocol template by type"""
    try:
        pt = ProtocolType(protocol_type)
        template = PROTOCOL_TEMPLATES[pt]()
        return {
            'protocolType': template.protocol_type.value,
            'steps': [
                {
                    'stepNumber': step.step_number,
                    'title': step.title,
                    'questions': [
                        {
                            'id': q.id,
                            'text': q.text,
                            'type': q.type.value,
                            'required': q.required,
                            'criticalFlag': q.critical_flag,
                            'options': q.options
                        } for q in step.questions
                    ],
                    'criticalFlags': step.critical_flags,
                    'nextStepLogic': [
                        {
                            'condition': t.condition,
                            'nextStep': t.next_step
                        } for t in step.next_step_logic
                    ]
                } for step in template.steps
            ]
        }
    except ValueError:
        return None

def validate_protocol_responses(protocol_type: str, responses: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """Validate protocol responses for completeness"""
    try:
        pt = ProtocolType(protocol_type)
        template = PROTOCOL_TEMPLATES[pt]()
        
        errors = []
        
        # Check that all required questions across all steps have responses
        for step in template.steps:
            for question in step.questions:
                if question.required and question.id not in responses:
                    errors.append(f"Missing required response for: {question.text}")
        
        return len(errors) == 0, errors
    except ValueError:
        return False, ["Invalid protocol type"]