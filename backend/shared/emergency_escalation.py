"""
Emergency Safety Escalation - Backend Implementation
Handles emergency services integration, contact management, and call logging
"""

import json
import os
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import boto3
from aws_lambda_powertools import Logger

logger = Logger()

# AWS Clients
sns = boto3.client('sns')
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ.get('DYNAMODB_TABLE', 'CareCircle-Data'))

# =============================================
# Enums and Data Classes
# =============================================

class EmergencyScenario(Enum):
    FALL = "fall"
    INJURY = "injury"
    CHEST_PAIN = "chest_pain"
    CONFUSION = "confusion"
    GENERAL = "general"

class CallStatus(Enum):
    INITIATED = "initiated"
    CONNECTED = "connected"
    FAILED = "failed"
    COMPLETED = "completed"

class ContactType(Enum):
    FAMILY = "family"
    MEDICAL = "medical"
    EMERGENCY_SERVICES = "emergency_services"
    CAREGIVER = "caregiver"

@dataclass
class EmergencyContact:
    id: str
    name: str
    phone: str
    relationship: str
    priority: int
    contact_type: ContactType
    is_available: Optional[bool] = None
    last_contacted_at: Optional[str] = None
    notification_preferences: Optional[Dict[str, bool]] = None

@dataclass
class EmergencyCallRequest:
    alert_id: str
    elder_id: str
    elder_name: str
    scenario: EmergencyScenario
    urgency_level: int
    location: Optional[str] = None
    triage_responses: Optional[Dict[str, Any]] = None
    requested_by: Optional[str] = None

@dataclass
class EmergencyCallResult:
    call_id: str
    status: CallStatus
    timestamp: str
    emergency_services_called: bool
    contacts_notified: List[str]
    call_script: str
    location: Optional[str] = None
    response_time_seconds: Optional[int] = None

@dataclass
class CallScript:
    scenario: str
    primary_script: str
    key_information: List[str]
    medical_history: Optional[str] = None
    current_condition: str = ""
    location: str = ""
    callback_number: str = ""

# =============================================
# Emergency Escalation Service
# =============================================

class EmergencyEscalationService:
    """Backend service for emergency escalation and 911 calling"""
    
    def __init__(self):
        self.emergency_phone_number = os.environ.get('EMERGENCY_PHONE_NUMBER', '911')
        self.sns_topic_arn = os.environ.get('EMERGENCY_SNS_TOPIC_ARN')
        
    def initiate_emergency_call(self, request: EmergencyCallRequest, family_id: str) -> EmergencyCallResult:
        """Initiate emergency services call and notifications"""
        try:
            call_id = f"EMERGENCY_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{request.alert_id[:8]}"
            start_time = datetime.utcnow()
            
            # Generate call script
            call_script = self.generate_call_script(request)
            
            # Simulate emergency services call (in production, integrate with actual emergency services API)
            emergency_call_success = self._simulate_emergency_call(request, call_script)
            
            # Get and notify emergency contacts
            contacts_notified = self._notify_emergency_contacts(request, family_id, call_script)
            
            # Calculate response time
            response_time = int((datetime.utcnow() - start_time).total_seconds())
            
            # Create result
            result = EmergencyCallResult(
                call_id=call_id,
                status=CallStatus.INITIATED if emergency_call_success else CallStatus.FAILED,
                timestamp=datetime.utcnow().isoformat() + 'Z',
                emergency_services_called=emergency_call_success,
                contacts_notified=contacts_notified,
                call_script=call_script.primary_script,
                location=request.location,
                response_time_seconds=response_time
            )
            
            # Log the emergency call
            self._log_emergency_call(result, request, family_id)
            
            # Create timeline entry
            self._create_emergency_timeline_entry(result, request, family_id)
            
            logger.info(f"Emergency call initiated: {call_id}")
            return result
            
        except Exception as e:
            logger.error(f"Error initiating emergency call: {e}")
            
            # Return failed result
            return EmergencyCallResult(
                call_id=f"EMERGENCY_FAILED_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
                status=CallStatus.FAILED,
                timestamp=datetime.utcnow().isoformat() + 'Z',
                emergency_services_called=False,
                contacts_notified=[],
                call_script="Emergency call failed",
                location=request.location
            )
    
    def generate_call_script(self, request: EmergencyCallRequest) -> CallScript:
        """Generate appropriate call script based on scenario"""
        scenario_generators = {
            EmergencyScenario.FALL: self._generate_fall_call_script,
            EmergencyScenario.INJURY: self._generate_injury_call_script,
            EmergencyScenario.CHEST_PAIN: self._generate_chest_pain_call_script,
            EmergencyScenario.CONFUSION: self._generate_confusion_call_script,
            EmergencyScenario.GENERAL: self._generate_general_call_script
        }
        
        generator = scenario_generators.get(request.scenario, self._generate_general_call_script)
        return generator(request)
    
    def get_emergency_contacts(self, family_id: str) -> List[EmergencyContact]:
        """Get emergency contacts for a family"""
        try:
            response = table.query(
                KeyConditionExpression='PK = :pk AND begins_with(SK, :sk)',
                ExpressionAttributeValues={
                    ':pk': f'FAMILY#{family_id}',
                    ':sk': 'EMERGENCY_CONTACT#'
                }
            )
            
            contacts = []
            for item in response.get('Items', []):
                contact = EmergencyContact(
                    id=item.get('contact_id'),
                    name=item.get('name'),
                    phone=item.get('phone'),
                    relationship=item.get('relationship'),
                    priority=item.get('priority', 999),
                    contact_type=ContactType(item.get('contact_type', 'family')),
                    is_available=item.get('is_available'),
                    last_contacted_at=item.get('last_contacted_at'),
                    notification_preferences=item.get('notification_preferences', {})
                )
                contacts.append(contact)
            
            # Sort by priority
            contacts.sort(key=lambda x: x.priority)
            
            # Add default emergency services if not present
            if not any(c.contact_type == ContactType.EMERGENCY_SERVICES for c in contacts):
                contacts.insert(0, self._get_default_emergency_contact())
            
            return contacts
            
        except Exception as e:
            logger.error(f"Error getting emergency contacts for family {family_id}: {e}")
            return [self._get_default_emergency_contact()]
    
    def add_emergency_contact(self, contact: EmergencyContact, family_id: str) -> Dict[str, Any]:
        """Add or update emergency contact"""
        try:
            contact_id = contact.id or f"EMERGENCY_CONTACT#{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}#{contact.name.replace(' ', '_')}"
            
            item = {
                'PK': f'FAMILY#{family_id}',
                'SK': f'EMERGENCY_CONTACT#{contact_id}',
                'contact_id': contact_id,
                'name': contact.name,
                'phone': contact.phone,
                'relationship': contact.relationship,
                'priority': contact.priority,
                'contact_type': contact.contact_type.value,
                'is_available': contact.is_available,
                'last_contacted_at': contact.last_contacted_at,
                'notification_preferences': contact.notification_preferences or {},
                'created_at': datetime.utcnow().isoformat() + 'Z',
                'updated_at': datetime.utcnow().isoformat() + 'Z',
                'entity_type': 'emergency_contact'
            }
            
            table.put_item(Item=item)
            logger.info(f"Emergency contact added: {contact_id}")
            
            return item
            
        except Exception as e:
            logger.error(f"Error adding emergency contact: {e}")
            raise
    
    def test_contact_availability(self, contact_id: str, family_id: str) -> bool:
        """Test if emergency contact is available"""
        try:
            # Get contact
            response = table.get_item(
                Key={
                    'PK': f'FAMILY#{family_id}',
                    'SK': f'EMERGENCY_CONTACT#{contact_id}'
                }
            )
            
            if 'Item' not in response:
                return False
            
            contact = response['Item']
            
            # Simulate availability check (in production, this might ping the contact)
            # For now, assume 80% availability
            import random
            is_available = random.random() > 0.2
            
            # Update contact with availability status
            table.update_item(
                Key={
                    'PK': f'FAMILY#{family_id}',
                    'SK': f'EMERGENCY_CONTACT#{contact_id}'
                },
                UpdateExpression='SET is_available = :available, last_contacted_at = :timestamp',
                ExpressionAttributeValues={
                    ':available': is_available,
                    ':timestamp': datetime.utcnow().isoformat() + 'Z'
                }
            )
            
            return is_available
            
        except Exception as e:
            logger.error(f"Error testing contact availability: {e}")
            return False
    
    # =============================================
    # Private Helper Methods
    # =============================================
    
    def _simulate_emergency_call(self, request: EmergencyCallRequest, call_script: CallScript) -> bool:
        """Simulate emergency services call (replace with actual integration in production)"""
        try:
            # In production, this would integrate with:
            # - Emergency services API
            # - VoIP service for automated calling
            # - SMS gateway for text-based emergency alerts
            
            logger.info(f"Simulating emergency call for {request.elder_name}")
            logger.info(f"Call script: {call_script.primary_script}")
            
            # Simulate 95% success rate
            import random
            return random.random() > 0.05
            
        except Exception as e:
            logger.error(f"Error in emergency call simulation: {e}")
            return False
    
    def _notify_emergency_contacts(self, request: EmergencyCallRequest, family_id: str, call_script: CallScript) -> List[str]:
        """Notify emergency contacts via SMS/push notifications"""
        notified_contacts = []
        
        try:
            contacts = self.get_emergency_contacts(family_id)
            
            # Notify top 5 priority contacts (excluding emergency services)
            contacts_to_notify = [c for c in contacts if c.contact_type != ContactType.EMERGENCY_SERVICES][:5]
            
            for contact in contacts_to_notify:
                try:
                    message = self._generate_notification_message(request, contact, call_script)
                    
                    if self.sns_topic_arn and contact.phone:
                        # Send SMS notification
                        sns.publish(
                            PhoneNumber=contact.phone,
                            Message=message
                        )
                        logger.info(f"SMS sent to {contact.name} ({contact.phone})")
                    
                    # Update last contacted timestamp
                    table.update_item(
                        Key={
                            'PK': f'FAMILY#{family_id}',
                            'SK': f'EMERGENCY_CONTACT#{contact.id}'
                        },
                        UpdateExpression='SET last_contacted_at = :timestamp',
                        ExpressionAttributeValues={
                            ':timestamp': datetime.utcnow().isoformat() + 'Z'
                        }
                    )
                    
                    notified_contacts.append(contact.id)
                    
                except Exception as e:
                    logger.error(f"Error notifying contact {contact.name}: {e}")
            
        except Exception as e:
            logger.error(f"Error notifying emergency contacts: {e}")
        
        return notified_contacts
    
    def _generate_notification_message(self, request: EmergencyCallRequest, contact: EmergencyContact, call_script: CallScript) -> str:
        """Generate notification message for emergency contacts"""
        timestamp = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')
        
        message = f"🚨 EMERGENCY ALERT 🚨\n\n"
        message += f"{request.elder_name} needs immediate assistance.\n"
        message += f"Situation: {request.scenario.value.replace('_', ' ').title()}\n"
        message += f"Location: {request.location or 'Location TBD'}\n"
        message += f"Emergency services: {'Called' if True else 'Not called'}\n"
        message += f"Time: {timestamp}\n\n"
        message += f"Please respond if available to assist.\n"
        message += f"This is an automated emergency notification."
        
        return message
    
    def _generate_fall_call_script(self, request: EmergencyCallRequest) -> CallScript:
        """Generate call script for fall scenario"""
        responses = request.triage_responses or {}
        elder_name = request.elder_name
        location = request.location or "Location to be determined"
        
        consciousness = responses.get('consciousness')
        severe_injury = responses.get('severe_injury')
        pain_level = responses.get('pain_level_initial', 'unknown')
        head_injury = responses.get('head_injury_check')
        mobility = responses.get('mobility_status')
        
        key_info = [
            f"Patient: {elder_name}",
            f"Incident: Fall",
            f"Conscious: {'Yes' if consciousness else 'No'}",
            f"Severe injury: {'Yes' if severe_injury else 'No'}",
            f"Pain level: {pain_level}/10",
            f"Head injury: {'Yes' if head_injury else 'No'}",
            f"Can move: {'Yes' if mobility else 'No'}"
        ]
        
        primary_script = f"This is a medical emergency. An elderly person named {elder_name} has fallen. "
        
        if not consciousness:
            primary_script += "The person is unconscious. "
        if severe_injury:
            primary_script += "There are signs of severe injury. "
        if head_injury:
            primary_script += "There may be a head injury. "
        if not mobility:
            primary_script += "The person cannot move. "
            
        primary_script += f"Please send an ambulance immediately to {location}."
        
        return CallScript(
            scenario='fall',
            primary_script=primary_script,
            key_information=key_info,
            current_condition=self._assess_fall_condition(responses),
            location=location,
            callback_number="Callback number to be provided"
        )
    
    def _generate_injury_call_script(self, request: EmergencyCallRequest) -> CallScript:
        """Generate call script for injury scenario"""
        responses = request.triage_responses or {}
        elder_name = request.elder_name
        location = request.location or "Location to be determined"
        
        consciousness = responses.get('consciousness')
        bleeding = responses.get('bleeding_severity', 'unknown')
        breathing = responses.get('breathing_status')
        pain_level = responses.get('pain_scale', 'unknown')
        injury_location = responses.get('injury_location', 'unknown')
        
        key_info = [
            f"Patient: {elder_name}",
            f"Incident: Injury",
            f"Conscious: {'Yes' if consciousness else 'No'}",
            f"Bleeding: {bleeding}",
            f"Breathing normal: {'Yes' if breathing else 'No'}",
            f"Pain level: {pain_level}/10",
            f"Injury location: {injury_location}"
        ]
        
        primary_script = f"This is a medical emergency. An elderly person named {elder_name} has sustained an injury. "
        
        if not consciousness:
            primary_script += "The person is unconscious. "
        if bleeding == 'Severe bleeding':
            primary_script += "There is severe bleeding. "
        if not breathing:
            primary_script += "The person is having difficulty breathing. "
            
        primary_script += f"The injury is located at {injury_location}. "
        primary_script += f"Please send an ambulance immediately to {location}."
        
        return CallScript(
            scenario='injury',
            primary_script=primary_script,
            key_information=key_info,
            current_condition=self._assess_injury_condition(responses),
            location=location,
            callback_number="Callback number to be provided"
        )
    
    def _generate_chest_pain_call_script(self, request: EmergencyCallRequest) -> CallScript:
        """Generate call script for chest pain scenario"""
        responses = request.triage_responses or {}
        elder_name = request.elder_name
        location = request.location or "Location to be determined"
        
        consciousness = responses.get('consciousness')
        pain_severity = responses.get('chest_pain_severity', 'unknown')
        breathing_difficulty = responses.get('breathing_difficulty')
        sweating_nausea = responses.get('sweating_nausea')
        pain_radiation = responses.get('pain_radiation')
        cardiac_history = responses.get('cardiac_history')
        
        key_info = [
            f"Patient: {elder_name}",
            f"Incident: Chest Pain",
            f"Conscious: {'Yes' if consciousness else 'No'}",
            f"Pain severity: {pain_severity}/10",
            f"Breathing difficulty: {'Yes' if breathing_difficulty else 'No'}",
            f"Sweating/nausea: {'Yes' if sweating_nausea else 'No'}",
            f"Pain radiating: {'Yes' if pain_radiation else 'No'}",
            f"Cardiac history: {'Yes' if cardiac_history else 'No'}"
        ]
        
        primary_script = f"This is a medical emergency. An elderly person named {elder_name} is experiencing severe chest pain. "
        
        if not consciousness:
            primary_script += "The person is unconscious. "
        if breathing_difficulty:
            primary_script += "There is difficulty breathing. "
        if sweating_nausea:
            primary_script += "The person is sweating and nauseous. "
        if pain_radiation:
            primary_script += "The pain is radiating to arm, jaw, or back. "
        if cardiac_history:
            primary_script += "The person has a history of heart problems. "
            
        primary_script += "This may be a heart attack. "
        primary_script += f"Please send an ambulance immediately to {location}."
        
        return CallScript(
            scenario='chest_pain',
            primary_script=primary_script,
            key_information=key_info,
            medical_history="History of cardiac problems" if cardiac_history else "No known cardiac history",
            current_condition=self._assess_chest_pain_condition(responses),
            location=location,
            callback_number="Callback number to be provided"
        )
    
    def _generate_confusion_call_script(self, request: EmergencyCallRequest) -> CallScript:
        """Generate call script for confusion scenario"""
        responses = request.triage_responses or {}
        elder_name = request.elder_name
        location = request.location or "Location to be determined"
        
        responsiveness = responses.get('responsiveness')
        orientation = responses.get('orientation_check', 'unknown')
        physical_symptoms = responses.get('physical_symptoms')
        confusion_onset = responses.get('confusion_onset', 'unknown')
        safety_concerns = responses.get('safety_concerns')
        
        key_info = [
            f"Patient: {elder_name}",
            f"Incident: Confusion/Altered Mental State",
            f"Responsive: {'Yes' if responsiveness else 'No'}",
            f"Orientation: {orientation}",
            f"Physical symptoms: {'Yes' if physical_symptoms else 'No'}",
            f"Onset: {confusion_onset}",
            f"Safety concerns: {'Yes' if safety_concerns else 'No'}"
        ]
        
        primary_script = f"This is a medical emergency. An elderly person named {elder_name} is experiencing severe confusion or altered mental state. "
        
        if not responsiveness:
            primary_script += "The person is not responsive to voice or touch. "
        if physical_symptoms:
            primary_script += "There are physical symptoms present. "
        if safety_concerns:
            primary_script += "There are immediate safety concerns. "
            
        primary_script += f"The confusion started {confusion_onset}. "
        primary_script += f"Please send an ambulance immediately to {location}."
        
        return CallScript(
            scenario='confusion',
            primary_script=primary_script,
            key_information=key_info,
            current_condition=self._assess_confusion_condition(responses),
            location=location,
            callback_number="Callback number to be provided"
        )
    
    def _generate_general_call_script(self, request: EmergencyCallRequest) -> CallScript:
        """Generate general call script"""
        elder_name = request.elder_name
        location = request.location or "Location to be determined"
        
        key_info = [
            f"Patient: {elder_name}",
            f"Incident: Medical Emergency",
            f"Location: {location}"
        ]
        
        primary_script = f"This is a medical emergency involving an elderly person named {elder_name}. "
        primary_script += f"Please send an ambulance immediately to {location}."
        
        return CallScript(
            scenario='general',
            primary_script=primary_script,
            key_information=key_info,
            current_condition="Medical emergency requiring immediate attention",
            location=location,
            callback_number="Callback number to be provided"
        )
    
    def _assess_fall_condition(self, responses: Dict[str, Any]) -> str:
        """Assess fall condition severity"""
        consciousness = responses.get('consciousness')
        severe_injury = responses.get('severe_injury')
        head_injury = responses.get('head_injury_check')
        mobility = responses.get('mobility_status')
        
        if not consciousness:
            return "Critical - Unconscious"
        if severe_injury or head_injury:
            return "Serious - Potential major injury"
        if not mobility:
            return "Moderate - Cannot move"
        return "Stable - Conscious and mobile"
    
    def _assess_injury_condition(self, responses: Dict[str, Any]) -> str:
        """Assess injury condition severity"""
        consciousness = responses.get('consciousness')
        bleeding = responses.get('bleeding_severity')
        breathing = responses.get('breathing_status')
        
        if not consciousness:
            return "Critical - Unconscious"
        if bleeding == 'Severe bleeding' or not breathing:
            return "Critical - Life threatening"
        if bleeding == 'Moderate bleeding':
            return "Serious - Significant injury"
        return "Stable - Minor injury"
    
    def _assess_chest_pain_condition(self, responses: Dict[str, Any]) -> str:
        """Assess chest pain condition severity"""
        consciousness = responses.get('consciousness')
        pain_severity = responses.get('chest_pain_severity', 0)
        breathing_difficulty = responses.get('breathing_difficulty')
        pain_radiation = responses.get('pain_radiation')
        
        try:
            pain_severity = float(pain_severity)
        except (ValueError, TypeError):
            pain_severity = 0
        
        if not consciousness:
            return "Critical - Unconscious"
        if pain_severity >= 8 or breathing_difficulty or pain_radiation:
            return "Critical - Possible heart attack"
        if pain_severity >= 6:
            return "Serious - Significant chest pain"
        return "Moderate - Chest discomfort"
    
    def _assess_confusion_condition(self, responses: Dict[str, Any]) -> str:
        """Assess confusion condition severity"""
        responsiveness = responses.get('responsiveness')
        physical_symptoms = responses.get('physical_symptoms')
        safety_concerns = responses.get('safety_concerns')
        
        if not responsiveness:
            return "Critical - Unresponsive"
        if physical_symptoms or safety_concerns:
            return "Serious - Altered mental state with complications"
        return "Moderate - Confusion requiring evaluation"
    
    def _get_default_emergency_contact(self) -> EmergencyContact:
        """Get default emergency services contact"""
        return EmergencyContact(
            id="DEFAULT_911",
            name="Emergency Services (911)",
            phone="911",
            relationship="Emergency Services",
            priority=1,
            contact_type=ContactType.EMERGENCY_SERVICES,
            is_available=True
        )
    
    def _log_emergency_call(self, result: EmergencyCallResult, request: EmergencyCallRequest, family_id: str) -> None:
        """Log emergency call for audit trail"""
        try:
            log_entry = {
                'PK': f'FAMILY#{family_id}',
                'SK': f'EMERGENCY_LOG#{result.call_id}',
                'call_id': result.call_id,
                'alert_id': request.alert_id,
                'elder_id': request.elder_id,
                'elder_name': request.elder_name,
                'scenario': request.scenario.value,
                'status': result.status.value,
                'emergency_services_called': result.emergency_services_called,
                'contacts_notified_count': len(result.contacts_notified),
                'contacts_notified': result.contacts_notified,
                'urgency_level': request.urgency_level,
                'location': result.location,
                'response_time_seconds': result.response_time_seconds,
                'call_script': result.call_script,
                'timestamp': result.timestamp,
                'requested_by': request.requested_by,
                'entity_type': 'emergency_log'
            }
            
            table.put_item(Item=log_entry)
            logger.info(f"Emergency call logged: {result.call_id}")
            
        except Exception as e:
            logger.error(f"Error logging emergency call: {e}")
    
    def _create_emergency_timeline_entry(self, result: EmergencyCallResult, request: EmergencyCallRequest, family_id: str) -> None:
        """Create timeline entry for emergency call"""
        try:
            timeline_id = f"TIMELINE#{result.call_id}#{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
            
            timeline_entry = {
                'PK': f'FAMILY#{family_id}',
                'SK': timeline_id,
                'GSI1PK': f'ELDER#{request.elder_id}',
                'GSI1SK': result.timestamp,
                'GSI2PK': f'TIMELINE#{family_id}',
                'GSI2SK': result.timestamp,
                'timeline_id': timeline_id,
                'elder_id': request.elder_id,
                'event_type': 'emergency_call_initiated',
                'participants': [request.requested_by] if request.requested_by else [],
                'event_data': {
                    'summary': f'Emergency services called for {request.elder_name}',
                    'details': {
                        'call_id': result.call_id,
                        'scenario': request.scenario.value,
                        'emergency_services_called': result.emergency_services_called,
                        'contacts_notified': len(result.contacts_notified),
                        'location': result.location,
                        'urgency_level': request.urgency_level
                    },
                    'outcomes': [
                        {
                            'type': 'emergency_response',
                            'description': f'Emergency call {"successful" if result.emergency_services_called else "failed"}',
                            'evidence': [],
                            'followUpRequired': True
                        }
                    ],
                    'evidence': []
                },
                'immutable': True,
                'created_by': request.requested_by or 'system',
                'occurred_at': result.timestamp,
                'related_items': [request.alert_id],
                'entity_type': 'timeline'
            }
            
            table.put_item(Item=timeline_entry)
            logger.info(f"Emergency timeline entry created: {timeline_id}")
            
        except Exception as e:
            logger.error(f"Error creating emergency timeline entry: {e}")

# =============================================
# Utility Functions
# =============================================

def create_emergency_escalation_service() -> EmergencyEscalationService:
    """Create emergency escalation service instance"""
    return EmergencyEscalationService()

def initiate_emergency_call(
    alert_id: str,
    elder_id: str,
    elder_name: str,
    scenario: str,
    family_id: str,
    urgency_level: int = 10,
    location: Optional[str] = None,
    triage_responses: Optional[Dict[str, Any]] = None,
    requested_by: Optional[str] = None
) -> Dict[str, Any]:
    """Utility function to initiate emergency call"""
    
    service = create_emergency_escalation_service()
    
    request = EmergencyCallRequest(
        alert_id=alert_id,
        elder_id=elder_id,
        elder_name=elder_name,
        scenario=EmergencyScenario(scenario),
        urgency_level=urgency_level,
        location=location,
        triage_responses=triage_responses,
        requested_by=requested_by
    )
    
    result = service.initiate_emergency_call(request, family_id)
    
    return {
        'success': result.status != CallStatus.FAILED,
        'data': asdict(result),
        'message': f'Emergency call {"initiated" if result.emergency_services_called else "failed"}'
    }

def get_emergency_contacts_for_family(family_id: str) -> List[Dict[str, Any]]:
    """Get emergency contacts for a family"""
    service = create_emergency_escalation_service()
    contacts = service.get_emergency_contacts(family_id)
    
    return [asdict(contact) for contact in contacts]

def add_emergency_contact_to_family(
    family_id: str,
    name: str,
    phone: str,
    relationship: str,
    priority: int,
    contact_type: str = 'family'
) -> Dict[str, Any]:
    """Add emergency contact to family"""
    service = create_emergency_escalation_service()
    
    contact = EmergencyContact(
        id="",  # Will be generated
        name=name,
        phone=phone,
        relationship=relationship,
        priority=priority,
        contact_type=ContactType(contact_type)
    )
    
    result = service.add_emergency_contact(contact, family_id)
    
    return {
        'success': True,
        'data': result,
        'message': 'Emergency contact added successfully'
    }