"""
Transcribe Handler Lambda Function
Manages Amazon Transcribe streaming sessions
"""
import json
import os
from typing import Dict, Any
import boto3
import logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)




# AWS Clients
transcribe = boto3.client('transcribe')
s3 = boto3.client('s3')



def start_transcription_session(language: str = 'en-US') -> Dict[str, Any]:
    """Start a transcription session"""
    try:
        # For streaming transcription, return session configuration
        # The actual streaming is handled client-side with WebSockets
        session_id = f"session-{os.urandom(8).hex()}"
        
        return {
            'sessionId': session_id,
            'language': language,
            'configuration': {
                'sampleRate': 16000,
                'encoding': 'pcm',
                'languageCode': language
            }
        }
    except Exception as e:
        logger.error(f"Error starting transcription: {e}")
        raise



def process_audio_file(audio_key: str, language: str = 'en-US') -> str:
    """Start asynchronous transcription job for uploaded audio"""
    try:
        job_name = f"carecircle-{os.urandom(8).hex()}"
        bucket_name = os.environ.get('AUDIO_BUCKET', 'carecircle-audio')
        
        transcribe.start_transcription_job(
            TranscriptionJobName=job_name,
            LanguageCode=language,
            MediaFormat='wav',
            Media={
                'MediaFileUri': f's3://{bucket_name}/{audio_key}'
            },
            Settings={
                'ShowSpeakerLabels': True,
                'MaxSpeakerLabels': 2
            }
        )
        
        logger.info(f"Started transcription job: {job_name}")
        return job_name
        
    except Exception as e:
        logger.error(f"Error processing audio file: {e}")
        raise




def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Main handler for transcription requests"""
    try:
        body = json.loads(event.get('body', '{}'))
        action = body.get('action', 'start')
        language = body.get('language', 'en-US')
        
        if action == 'start':
            result = start_transcription_session(language)
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                'body': json.dumps(result)
            }
        elif action == 'process':
            audio_key = body.get('audioKey', '')
            job_name = process_audio_file(audio_key, language)
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                'body': json.dumps({'jobName': job_name})
            }
        else:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Invalid action'})
            }
            
    except Exception as e:
        logger.error(f"Error in transcribe handler: {e}", exc_info=True)
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }

