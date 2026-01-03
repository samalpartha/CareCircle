"""
Shared utilities for CareCircle backend
"""
import json
import os
from datetime import datetime
from typing import Dict, Any
import boto3
from aws_lambda_powertools import Logger, Tracer

logger = Logger()
tracer = Tracer()

# AWS Clients
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ.get('DYNAMODB_TABLE', 'CareCircle-Data'))


def create_response(status_code: int, body: Dict[str, Any]) -> Dict[str, Any]:
    """Create standardized API Gateway response"""
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        },
        'body': json.dumps(body, default=str),
    }


def get_user_from_event(event: Dict[str, Any]) -> str:
    """Extract user ID from Cognito authorizer"""
    try:
        claims = event.get('requestContext', {}).get('authorizer', {}).get('claims', {})
        return claims.get('sub') or claims.get('cognito:username', 'anonymous')
    except Exception as e:
        logger.error(f"Error extracting user: {e}")
        return 'anonymous'


def generate_id(prefix: str = '') -> str:
    """Generate unique ID with optional prefix"""
    from uuid import uuid4
    timestamp = datetime.utcnow().strftime('%Y%m%d%H%M%S')
    unique = str(uuid4())[:8]
    return f"{prefix}{timestamp}-{unique}" if prefix else f"{timestamp}-{unique}"


def calculate_distance(zip1: str, zip2: str) -> float:
    """
    Calculate approximate distance between two ZIP codes
    Note: This is a simplified version. In production, use a proper ZIP code distance API
    """
    # For demo purposes, return a random distance
    # In production, integrate with a ZIP code distance calculation service
    try:
        # Simple hash-based pseudo-distance for demo
        hash_val = abs(hash(zip1 + zip2))
        return (hash_val % 100) / 10.0  # Returns 0-10 miles
    except Exception:
        return 5.0  # Default distance


def get_language_name(code: str) -> str:
    """Convert language code to full name"""
    languages = {
        'en': 'English',
        'es': 'Spanish',
        'hi': 'Hindi',
        'ar': 'Arabic',
        'zh': 'Mandarin',
        'pt': 'Portuguese',
    }
    return languages.get(code, 'English')

