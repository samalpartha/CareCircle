"""
CareCircle Wellness Handler Lambda
Handles daily wellness check-ins and trend analysis
"""
import json
import os
import boto3
from datetime import datetime, timedelta
from decimal import Decimal

# Initialize AWS clients
dynamodb = boto3.resource('dynamodb')

table_name = os.environ.get('DYNAMODB_TABLE', 'CareCircle-Data-v2')
table = dynamodb.Table(table_name)


class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj) if obj % 1 else int(obj)
        return super().default(obj)


def get_user_id(event):
    try:
        return event['requestContext']['authorizer']['claims']['sub']
    except (KeyError, TypeError):
        return None


def cors_response(status_code, body):
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        },
        'body': json.dumps(body, cls=DecimalEncoder) if body else ''
    }


def calculate_risk_score(entry, history):
    """
    Calculate risk score based on wellness patterns
    Returns 0-100 where higher = more concern
    """
    score = 0
    flags = []
    
    # Mood analysis (1-5 scale, 5 is best)
    mood = entry.get('mood', 3)
    if mood <= 2:
        score += 25
        flags.append('low_mood')
    
    # Sleep analysis (recommended 7-9 hours)
    sleep = entry.get('sleep', 7)
    if sleep < 5:
        score += 20
        flags.append('poor_sleep')
    elif sleep > 10:
        score += 10
        flags.append('excessive_sleep')
    
    # Activity analysis (recommended 30+ minutes)
    activity = entry.get('activity', 30)
    if activity < 10:
        score += 15
        flags.append('low_activity')
    
    # Trend analysis (compare to last 7 days)
    if len(history) >= 3:
        recent_moods = [h.get('mood', 3) for h in history[:7]]
        avg_mood = sum(recent_moods) / len(recent_moods)
        
        # Declining mood trend
        if mood < avg_mood - 1:
            score += 15
            flags.append('declining_mood')
        
        # Consistent low mood
        if avg_mood < 2.5:
            score += 20
            flags.append('persistent_low_mood')
    
    return min(score, 100), flags


def handle_get_wellness(event, user_id):
    """Get wellness entries with optional date range"""
    try:
        params = event.get('queryStringParameters', {}) or {}
        days = int(params.get('days', 30))
        elder_id = params.get('elderId')
        
        pk = f'ELDER#{elder_id}' if elder_id else f'USER#{user_id}'
        
        # Calculate date range
        end_date = datetime.utcnow().strftime('%Y-%m-%d')
        start_date = (datetime.utcnow() - timedelta(days=days)).strftime('%Y-%m-%d')
        
        response = table.query(
            KeyConditionExpression='PK = :pk AND SK BETWEEN :start AND :end',
            ExpressionAttributeValues={
                ':pk': pk,
                ':start': f'WELLNESS#{start_date}',
                ':end': f'WELLNESS#{end_date}Z'
            },
            ScanIndexForward=False  # Most recent first
        )
        
        entries = response.get('Items', [])
        
        # Calculate trends
        trends = {}
        if entries:
            moods = [e.get('mood', 3) for e in entries if e.get('mood')]
            sleeps = [e.get('sleep', 7) for e in entries if e.get('sleep')]
            activities = [e.get('activity', 0) for e in entries if e.get('activity')]
            
            trends = {
                'avgMood': round(sum(moods) / len(moods), 1) if moods else None,
                'avgSleep': round(sum(sleeps) / len(sleeps), 1) if sleeps else None,
                'avgActivity': round(sum(activities) / len(activities), 0) if activities else None,
                'totalEntries': len(entries),
            }
        
        formatted = []
        for entry in entries:
            formatted.append({
                'date': entry.get('SK', '').replace('WELLNESS#', ''),
                'mood': entry.get('mood'),
                'moodLabel': ['', 'Very Low', 'Low', 'Okay', 'Good', 'Great'][entry.get('mood', 0)],
                'sleep': entry.get('sleep'),
                'activity': entry.get('activity'),
                'notes': entry.get('notes'),
                'riskScore': entry.get('riskScore', 0),
                'riskFlags': entry.get('riskFlags', []),
                'createdAt': entry.get('createdAt'),
            })
        
        return cors_response(200, {
            'entries': formatted,
            'trends': trends,
            'period': {'start': start_date, 'end': end_date, 'days': days}
        })
    
    except Exception as e:
        print(f"Error getting wellness: {e}")
        return cors_response(500, {'error': str(e)})


def handle_log_wellness(event, user_id):
    """Log a wellness check-in"""
    try:
        body = json.loads(event.get('body', '{}'))
        
        timestamp = datetime.utcnow().isoformat() + 'Z'
        date = body.get('date', datetime.utcnow().strftime('%Y-%m-%d'))
        elder_id = body.get('elderId')
        
        pk = f'ELDER#{elder_id}' if elder_id else f'USER#{user_id}'
        
        # Get recent history for trend analysis
        history_response = table.query(
            KeyConditionExpression='PK = :pk AND begins_with(SK, :sk)',
            ExpressionAttributeValues={
                ':pk': pk,
                ':sk': 'WELLNESS#'
            },
            ScanIndexForward=False,
            Limit=7
        )
        history = history_response.get('Items', [])
        
        # Build entry
        entry = {
            'mood': body.get('mood'),  # 1-5 scale
            'sleep': body.get('sleep'),  # hours
            'activity': body.get('activity'),  # minutes
            'notes': body.get('notes'),
        }
        
        # Calculate risk score
        risk_score, risk_flags = calculate_risk_score(entry, history)
        
        wellness_entry = {
            'PK': pk,
            'SK': f'WELLNESS#{date}',
            'date': date,
            'mood': body.get('mood'),
            'sleep': body.get('sleep'),
            'activity': body.get('activity'),
            'notes': body.get('notes'),
            'riskScore': risk_score,
            'riskFlags': risk_flags,
            'elderId': elder_id,
            'createdAt': timestamp,
            'createdBy': user_id,
            # GSI for user queries
            'GSI1PK': f'USER#{user_id}',
            'GSI1SK': f'WELLNESS#{date}',
        }
        
        table.put_item(Item=wellness_entry)
        
        # Generate insights
        insights = []
        if 'low_mood' in risk_flags:
            insights.append("Mood seems low today. Consider reaching out for a check-in call.")
        if 'poor_sleep' in risk_flags:
            insights.append("Sleep was below recommended. This may affect energy and mood.")
        if 'declining_mood' in risk_flags:
            insights.append("Mood has been declining over the past week. Monitor closely.")
        if 'low_activity' in risk_flags:
            insights.append("Activity level is low. Encourage light exercise or a short walk.")
        
        return cors_response(201, {
            'message': 'Wellness logged successfully',
            'date': date,
            'riskScore': risk_score,
            'riskFlags': risk_flags,
            'insights': insights,
            'entry': wellness_entry
        })
    
    except Exception as e:
        print(f"Error logging wellness: {e}")
        return cors_response(500, {'error': str(e)})


def lambda_handler(event, context):
    """Main Lambda handler"""
    print(f"Event: {json.dumps(event)}")
    
    http_method = event.get('httpMethod', '')
    path = event.get('path', '')
    
    user_id = get_user_id(event)
    if not user_id:
        return cors_response(401, {'error': 'Unauthorized'})
    
    if path == '/wellness':
        if http_method == 'GET':
            return handle_get_wellness(event, user_id)
        elif http_method == 'POST':
            return handle_log_wellness(event, user_id)
    
    return cors_response(404, {'error': f'Route not found: {http_method} {path}'})




