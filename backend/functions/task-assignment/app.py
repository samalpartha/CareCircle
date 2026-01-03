"""
Multi-Agent Task Assignment Lambda Function
Intelligently assigns care tasks to family members using AI
"""
import json
import os
import logging
from typing import Dict, Any, List
from datetime import datetime
import boto3

# Standard Python logging (no external dependencies)
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# AWS Clients
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ.get('DYNAMODB_TABLE', 'CareCircle-Data'))
bedrock_runtime = boto3.client('bedrock-runtime', region_name='us-east-1')
sns = boto3.client('sns')



def get_family_members(family_id: str) -> List[Dict[str, Any]]:
    """Retrieve all family members from DynamoDB"""
    try:
        response = table.query(
            KeyConditionExpression='PK = :pk AND begins_with(SK, :sk)',
            ExpressionAttributeValues={
                ':pk': f'FAMILY#{family_id}',
                ':sk': 'MEMBER#'
            }
        )
        return response.get('Items', [])
    except Exception as e:
        logger.error(f"Error getting family members: {e}")
        return []



def calculate_proximity_score(member_zip: str, elder_zip: str) -> float:
    """Calculate proximity score (0-100, higher is better)"""
    try:
        # Simple hash-based distance for demo
        # In production, use actual ZIP code geocoding
        hash_val = abs(hash(member_zip + elder_zip))
        distance = (hash_val % 100) / 10.0  # 0-10 miles
        
        # Convert to score: closer = higher score
        if distance < 1:
            return 100.0
        elif distance < 5:
            return 80.0
        elif distance < 10:
            return 60.0
        elif distance < 25:
            return 40.0
        else:
            return 20.0
    except Exception:
        return 50.0



def calculate_skill_match_score(required_skills: List[str], member_skills: List[str]) -> float:
    """Calculate how well member's skills match task requirements"""
    if not required_skills:
        return 50.0  # Neutral if no specific skills required
    
    if not member_skills:
        return 20.0  # Low score if member has no skills listed
    
    matches = sum(1 for skill in required_skills if skill in member_skills)
    return (matches / len(required_skills)) * 100



def calculate_availability_score(availability: str, urgency: str) -> float:
    """Calculate availability score based on urgency"""
    availability_scores = {
        'flexible': 100.0,
        'weekends': 70.0 if urgency != 'urgent' else 30.0,
        'limited': 50.0 if urgency == 'low' else 20.0,
    }
    return availability_scores.get(availability, 50.0)



def calculate_workload_score(member_id: str) -> float:
    """Calculate workload score (lower workload = higher score)"""
    try:
        # Query active tasks for this member
        response = table.query(
            IndexName='GSI1',
            KeyConditionExpression='GSI1PK = :pk',
            FilterExpression='#status IN (:pending, :inprogress)',
            ExpressionAttributeNames={
                '#status': 'status'
            },
            ExpressionAttributeValues={
                ':pk': f'MEMBER#{member_id}',
                ':pending': 'pending',
                ':inprogress': 'inProgress'
            }
        )
        
        active_tasks = len(response.get('Items', []))
        
        # Score: fewer tasks = higher score
        if active_tasks == 0:
            return 100.0
        elif active_tasks == 1:
            return 80.0
        elif active_tasks == 2:
            return 60.0
        elif active_tasks == 3:
            return 40.0
        else:
            return 20.0
    except Exception as e:
        logger.error(f"Error calculating workload: {e}")
        return 50.0



def multi_agent_scoring(task: Dict[str, Any], members: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Multi-agent scoring system:
    - Proximity Agent: Scores based on distance
    - Skill Agent: Scores based on expertise match
    - Availability Agent: Scores based on time availability
    - Workload Agent: Scores based on current task load
    """
    scored_members = []
    
    required_skills = task.get('required_skills', [])
    urgency = task.get('urgency', 'medium')
    elder_zip = task.get('elder_zipcode', '')
    
    for member in members:
        member_id = member.get('member_id', '')
        
        # Individual agent scores
        proximity_score = calculate_proximity_score(
            member.get('zipcode', ''),
            elder_zip
        )
        skill_score = calculate_skill_match_score(
            required_skills,
            member.get('skills', [])
        )
        availability_score = calculate_availability_score(
            member.get('availability', 'flexible'),
            urgency
        )
        workload_score = calculate_workload_score(member_id)
        
        # Weighted composite score
        weights = {
            'proximity': 0.30,
            'skill': 0.30,
            'availability': 0.20,
            'workload': 0.20,
        }
        
        composite_score = (
            proximity_score * weights['proximity'] +
            skill_score * weights['skill'] +
            availability_score * weights['availability'] +
            workload_score * weights['workload']
        )
        
        scored_members.append({
            'member': member,
            'scores': {
                'proximity': proximity_score,
                'skill': skill_score,
                'availability': availability_score,
                'workload': workload_score,
                'composite': composite_score,
            }
        })
    
    # Sort by composite score (descending)
    scored_members.sort(key=lambda x: x['scores']['composite'], reverse=True)
    
    return scored_members



def bedrock_recommendation(task: Dict[str, Any], scored_members: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Use Bedrock LLM for final recommendation and message generation
    """
    try:
        # Prepare top 3 candidates
        top_candidates = scored_members[:3]
        candidates_summary = []
        
        for i, candidate in enumerate(top_candidates):
            member = candidate['member']
            scores = candidate['scores']
            candidates_summary.append(
                f"{i+1}. {member.get('name', 'Member')}: "
                f"Proximity={scores['proximity']:.0f}, "
                f"Skill={scores['skill']:.0f}, "
                f"Availability={scores['availability']:.0f}, "
                f"Workload={scores['workload']:.0f}, "
                f"Overall={scores['composite']:.0f}"
            )
        
        prompt = f"""You are an AI care coordinator helping assign caregiving tasks to family members.

TASK DETAILS:
- Description: {task.get('description', 'Care task')}
- Urgency: {task.get('urgency', 'medium')}
- Required Skills: {', '.join(task.get('required_skills', [])) or 'None specified'}

TOP CANDIDATES (with scoring):
{chr(10).join(candidates_summary)}

Based on the scores and task requirements:
1. Recommend which member should take this task (1, 2, or 3)
2. Provide a brief explanation (1-2 sentences)
3. Suggest a personalized message to send to that member

Respond in JSON format:
{{
  "recommended_member": 1,
  "explanation": "brief explanation",
  "message": "personalized message for the member"
}}"""

        request_body = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 500,
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        }
        
        response = bedrock_runtime.invoke_model(
            modelId='anthropic.claude-3-haiku-20240307-v1:0',
            contentType='application/json',
            accept='application/json',
            body=json.dumps(request_body)
        )
        
        response_body = json.loads(response['body'].read())
        content = response_body.get('content', [{}])[0].get('text', '')
        
        # Parse JSON
        if '```json' in content:
            content = content.split('```json')[1].split('```')[0].strip()
        elif '```' in content:
            content = content.split('```')[1].split('```')[0].strip()
        
        recommendation = json.loads(content)
        return recommendation
        
    except Exception as e:
        logger.error(f"Error getting Bedrock recommendation: {e}")
        return {
            'recommended_member': 1,
            'explanation': 'Selected based on scoring system',
            'message': 'You have been assigned a new care task. Please review and accept.'
        }



def create_task_in_db(task_data: Dict[str, Any], assigned_member: Dict[str, Any]) -> str:
    """Create task record in DynamoDB"""
    try:
        task_id = f"TASK#{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
        
        item = {
            'PK': f"FAMILY#{task_data.get('family_id')}",
            'SK': task_id,
            'GSI1PK': f"MEMBER#{assigned_member.get('member_id')}",
            'GSI1SK': task_id,
            'task_id': task_id,
            'title': task_data.get('title', 'Care Task'),
            'description': task_data.get('description', ''),
            'priority': task_data.get('urgency', 'medium'),
            'status': 'pending',
            'alert_type': task_data.get('alert_type', 'behavioralChange'),
            'assigned_to': assigned_member.get('member_id'),
            'assigned_to_name': assigned_member.get('name'),
            'created_at': datetime.utcnow().isoformat() + 'Z',  # Add 'Z' to mark as UTC
            'updated_at': datetime.utcnow().isoformat() + 'Z',  # Add 'Z' to mark as UTC
        }
        
        table.put_item(Item=item)
        logger.info(f"Task created: {task_id}")
        return task_id
        
    except Exception as e:
        logger.error(f"Error creating task: {e}")
        raise



def send_notification(member: Dict[str, Any], task: Dict[str, Any], message: str):
    """Send notification via SNS"""
    try:
        phone = member.get('phone')
        if phone:
            sns.publish(
                PhoneNumber=phone,
                Message=f"CareCircle Alert: {message}"
            )
            logger.info(f"SMS sent to {phone}")
    except Exception as e:
        logger.error(f"Error sending notification: {e}")




def check_duplicate_alert(family_id: str, alert_type: str, new_urgency: str, summary: str) -> bool:
    """
    Check if a similar alert exists in the last 30 minutes.
    Returns True if valid duplicate found.
    """
    try:
        # Check alerts from last 30 mins
        min_time = (datetime.utcnow() - timedelta(minutes=30)).strftime('%Y%m%d%H%M%S')
        response = table.query(
            KeyConditionExpression='PK = :pk AND SK > :sk',
            ExpressionAttributeValues={
                ':pk': f'FAMILY#{family_id}',
                ':sk': f'ALERT#{min_time}'
            }
        )
        
        existing_alerts = response.get('Items', [])
        for alert in existing_alerts:
            # Check for exact type match
            if alert.get('alert_type') == alert_type:
                # If existing is Urgent/High, and new is lower/same, suppress new
                existing_urgency = alert.get('urgency', 'medium')
                
                # Simple priority ranking
                priority_rank = {'urgent': 3, 'high': 2, 'medium': 1, 'low': 0}
                existing_rank = priority_rank.get(existing_urgency, 1)
                new_rank = priority_rank.get(new_urgency, 1)
                
                if existing_rank >= new_rank:
                    logger.info(f"Duplicate alert suppressed: {summary} (Similar to {alert.get('summary')})")
                    return True
                    
        return False
    except Exception as e:
        logger.error(f"Error checking duplicates: {e}")
        return False


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Main handler for task assignment
    Triggered by EventBridge alert events
    """
    try:
        logger.info("Processing task assignment")
        
        # Extract alert details from EventBridge event
        detail = event.get('detail', {})
        
        # Map alert types to human-readable titles
        alert_type = detail.get('alert_type', 'healthConcern')
        alert_titles = {
            'healthConcern': 'Health Concern Detected',
            'memoryIssue': 'Memory/Cognitive Concern',
            'emotionalDistress': 'Emotional Support Needed',
            'medicationConcern': 'Medication Review Required',
            'urgentHelp': '⚠️ Urgent Attention Required',
            'behavioralChange': 'Behavioral Change Noticed',
        }
        human_title = alert_titles.get(alert_type, 'Care Concern Detected')
        
        task_data = {
            'family_id': detail.get('user_id', 'default-family'),  # Map user to family
            'title': human_title,
            'description': detail.get('summary', 'Care concern detected'),
            'urgency': detail.get('urgency', 'medium'),
            'alert_type': alert_type,
            'required_skills': [],
            'elder_zipcode': '10001',  # Get from elder profile in production
        }
        
        # DEDUPLICATION CHECK
        if check_duplicate_alert(task_data['family_id'], alert_type, task_data['urgency'], task_data['description']):
             logger.info(f"Skipping duplicate alert: {task_data['title']}")
             return {
                'statusCode': 200,
                'body': json.dumps({'message': 'Duplicate alert suppressed', 'skipped': True})
            }
        
        # Determine required skills based on alert type
        alert_type = detail.get('alert_type', '')
        if 'memory' in alert_type.lower() or 'medication' in alert_type.lower():
            task_data['required_skills'] = ['Medical/Healthcare']
        elif 'emotional' in alert_type.lower():
            task_data['required_skills'] = ['Emotional Support']
        
        # ALWAYS create alert in DynamoDB first (so it shows in UI)
        # Key structure must match what the API expects:
        # Key structure must match what the API expects:
        # PK: FAMILY#{family_id}, SK: ALERT#{timestamp}
        family_id = task_data['family_id']
        
        # Use ID provided by AI Analysis if available (for SLA tracking consistency)
        if detail.get('alert_id'):
            alert_id = detail.get('alert_id')
        else:
            alert_timestamp = datetime.utcnow().strftime('%Y%m%d%H%M%S')
            alert_id = f"ALERT#{alert_timestamp}"
        
        # Get actual concerns and transcript from the event
        concerns_list = detail.get('concerns', [])
        transcript = detail.get('transcript_preview', '')
        recommended_actions = detail.get('recommended_actions', [])
        summary = detail.get('summary', task_data['description'])
        
        # Build a rich description including the actual transcript
        rich_description = summary
        if transcript:
            rich_description = f"{summary}\n\n📝 What was said: \"{transcript}\""
        
        alert_item = {
            'PK': f"FAMILY#{family_id}",  # API queries by FAMILY#
            'SK': alert_id,                # API queries SK begins_with ALERT#
            'GSI1PK': f"USER#{family_id}",
            'GSI1SK': alert_id,
            'id': alert_id,
            'alert_id': alert_id,
            'type': task_data['alert_type'],
            'alert_type': task_data['alert_type'],
            'severity': task_data['urgency'],  # For frontend compatibility
            'priority': task_data['urgency'],  # For frontend compatibility
            'urgency': task_data['urgency'],
            'title': human_title,
            'message': rich_description,  # Include transcript in message
            'description': rich_description,
            'transcript': transcript,  # Store transcript separately too
            'summary': summary,
            'status': 'active',
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'concerns': concerns_list,
            'recommended_actions': recommended_actions,
        }
        table.put_item(Item=alert_item)
        logger.info(f"Alert stored in DynamoDB: PK=FAMILY#{family_id}, SK={alert_id}")
        
        # Step 1: Get family members
        family_members = get_family_members(task_data['family_id'])
        
        if not family_members:
            logger.warning("No family members found - creating unassigned task")
            # Create unassigned task so it still shows up
            # Key structure must match what the API expects:
            # PK: FAMILY#{family_id}, SK: TASK#{timestamp}
            task_id = f"TASK#{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
            task_item = {
                'PK': f"FAMILY#{family_id}",  # API queries by FAMILY#
                'SK': task_id,                 # API queries SK begins_with TASK#
                'GSI1PK': f"USER#{family_id}",
                'GSI1SK': task_id,
                'task_id': task_id,
                'title': task_data['title'],
                'description': task_data['description'],
                'priority': task_data['urgency'],  # Use priority field for frontend
                'urgency': task_data['urgency'],
                'status': 'pending',
                'assigned_to': None,
                'assigned_to_name': 'Unassigned',
                'alert_id': alert_id,
                'created_at': datetime.utcnow().isoformat() + 'Z',
                'updated_at': datetime.utcnow().isoformat() + 'Z',
            }
            table.put_item(Item=task_item)
            logger.info(f"Unassigned task created: PK=FAMILY#{family_id}, SK={task_id}")
            return {'statusCode': 200, 'body': json.dumps({'message': 'Alert and unassigned task created', 'alert_id': alert_id, 'task_id': task_id})}
        
        # Step 2: Multi-agent scoring
        scored_members = multi_agent_scoring(task_data, family_members)
        
        # Step 3: Bedrock recommendation
        recommendation = bedrock_recommendation(task_data, scored_members)
        
        # Step 4: Select member
        member_index = recommendation.get('recommended_member', 1) - 1
        selected_member = scored_members[member_index]['member']
        
        logger.info(f"Selected member: {selected_member.get('name')} - {recommendation.get('explanation')}")
        
        # Step 5: Create task
        task_id = create_task_in_db(task_data, selected_member)
        
        # Step 6: Send notification
        send_notification(
            selected_member,
            task_data,
            recommendation.get('message', 'New care task assigned to you')
        )
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'success': True,
                'task_id': task_id,
                'assigned_to': selected_member.get('name'),
                'recommendation': recommendation
            }, default=str)
        }
        
    except Exception as e:
        logger.error(f"Error in task assignment: {e}", exc_info=True)
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }

