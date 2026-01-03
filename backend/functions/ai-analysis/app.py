"""
AI Analysis Lambda Function
Analyzes call transcripts using Amazon Comprehend and Bedrock
"""
import json
import os
import logging
from typing import Dict, Any, List
import boto3

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# AWS Clients
comprehend = boto3.client('comprehend')
comprehend_medical = boto3.client('comprehendmedical')  # NEW: Medical entity extraction
translate = boto3.client('translate')
bedrock_runtime = boto3.client('bedrock-runtime', region_name='us-east-1')
events = boto3.client('events')

EVENT_BUS_NAME = os.environ.get('EVENT_BUS_NAME', 'CareCircle-Events')


def detect_language(text: str) -> str:
    """Detect the dominant language in the text"""
    try:
        response = comprehend.detect_dominant_language(Text=text[:5000])
        languages = response.get('Languages', [])
        if languages:
            return languages[0].get('LanguageCode', 'en')
        return 'en'
    except Exception as e:
        logger.error(f"Error detecting language: {e}")
        return 'en'


def translate_text(text: str, source_lang: str, target_lang: str = 'en') -> str:
    """Translate text using Amazon Translate"""
    try:
        if source_lang == target_lang:
            return text
        
        response = translate.translate_text(
            Text=text[:5000],  # Limit to first 5000 chars
            SourceLanguageCode=source_lang,
            TargetLanguageCode=target_lang
        )
        return response.get('TranslatedText', text)
    except Exception as e:
        logger.error(f"Error translating text: {e}")
        return text


def analyze_sentiment(text: str, language: str = 'en') -> Dict[str, Any]:
    """Analyze sentiment using Amazon Comprehend"""
    try:
        # Comprehend supports limited languages for sentiment
        supported_langs = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ar', 'hi', 'ja', 'ko', 'zh', 'zh-TW']
        
        if language not in supported_langs:
            # Translate to English first
            text = translate_text(text, language, 'en')
            language = 'en'
        
        response = comprehend.detect_sentiment(
            Text=text[:5000],
            LanguageCode=language
        )
        
        return {
            'sentiment': response.get('Sentiment', 'NEUTRAL').lower(),
            'scores': response.get('SentimentScore', {}),
        }
    except Exception as e:
        logger.error(f"Error analyzing sentiment: {e}")
        return {'sentiment': 'neutral', 'scores': {}}


def extract_key_phrases(text: str, language: str = 'en') -> List[str]:
    """Extract key phrases using Amazon Comprehend"""
    try:
        response = comprehend.detect_key_phrases(
            Text=text[:5000],
            LanguageCode=language if language in ['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'hi', 'ar', 'zh', 'zh-TW'] else 'en'
        )
        
        phrases = response.get('KeyPhrases', [])
        return [phrase['Text'] for phrase in phrases[:10]]  # Top 10 phrases
    except Exception as e:
        logger.error(f"Error extracting key phrases: {e}")
        return []


def extract_medical_entities(text: str) -> Dict[str, List[Dict[str, Any]]]:
    """
    Extract medical entities using Amazon Comprehend Medical
    Returns medications, symptoms, medical conditions, treatments, etc.
    """
    try:
        # Detect entities (medications, symptoms, conditions, procedures)
        entities_response = comprehend_medical.detect_entities_v2(Text=text[:20000])
        
        # Detect PHI (Protected Health Information) - optional, for compliance
        phi_response = comprehend_medical.detect_phi(Text=text[:20000])
        
        # Organize entities by category
        medical_insights = {
            'medications': [],
            'symptoms': [],
            'conditions': [],
            'procedures': [],
            'anatomy': [],
            'test_results': [],
            'phi_detected': []
        }
        
        # Process entities
        for entity in entities_response.get('Entities', []):
            entity_data = {
                'text': entity.get('Text'),
                'category': entity.get('Category'),
                'type': entity.get('Type'),
                'score': entity.get('Score', 0),
                'traits': [trait.get('Name') for trait in entity.get('Traits', [])]
            }
            
            category = entity.get('Category', '').lower()
            
            if category == 'medication':
                medical_insights['medications'].append(entity_data)
            elif category == 'medical_condition':
                medical_insights['conditions'].append(entity_data)
            elif category == 'symptom':
                medical_insights['symptoms'].append(entity_data)
            elif category == 'procedure':
                medical_insights['procedures'].append(entity_data)
            elif category == 'anatomy':
                medical_insights['anatomy'].append(entity_data)
            elif category == 'test_treatment_procedure':
                medical_insights['test_results'].append(entity_data)
        
        # Process PHI (for privacy awareness)
        for phi in phi_response.get('Entities', []):
            medical_insights['phi_detected'].append({
                'text': phi.get('Text'),
                'type': phi.get('Type'),
                'score': phi.get('Score', 0)
            })
        
        # Sort by confidence score (highest first)
        for key in medical_insights:
            if medical_insights[key]:
                medical_insights[key] = sorted(
                    medical_insights[key], 
                    key=lambda x: x.get('score', 0), 
                    reverse=True
                )[:5]  # Top 5 most confident for each category
        
        logger.info(f"Extracted medical entities: {json.dumps(medical_insights, default=str)}")
        return medical_insights
        
    except Exception as e:
        logger.error(f"Error extracting medical entities: {e}")
        return {
            'medications': [],
            'symptoms': [],
            'conditions': [],
            'procedures': [],
            'anatomy': [],
            'test_results': [],
            'phi_detected': []
        }


def rule_based_fallback_analysis(
    transcript: str,
    sentiment: Dict[str, Any],
    key_phrases: List[str],
    medical_entities: Dict[str, List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    """
    Rule-based fallback analysis when Bedrock is unavailable
    Detects concerning patterns using keyword matching
    """
    transcript_lower = transcript.lower()
    
    cognitive_concerns = []
    emotional_concerns = []
    health_mentions = []
    recommended_actions = []
    urgency = 'low'
    
    # ========== COMPREHENSIVE CONCERN DETECTION ==========
    
    # URGENT: Physical injuries and emergencies (ALWAYS HIGH/URGENT priority)
    injury_keywords = [
        # Head injuries
        'bumped my head', 'hit my head', 'head hurts', 'headache',
        'bumped head', 'hit head', 'banged my head', 'banged head',
        # Falls
        'fell', 'fell down', 'i fell', 'tripped', 'slipped', 'stumbled',
        'fell over', 'fall down', 'falling', 'lost my balance',
        # Physical injuries
        'hurt myself', 'injured', 'injury', 'bleeding', 'blood',
        'broke', 'broken', 'fractured', 'sprained', 'twisted',
        'cut myself', 'bruise', 'bruised', 'swollen', 'swelling',
        # Chest/breathing
        'chest pain', 'chest hurts', 'can\'t breathe', 'hard to breathe',
        'short of breath', 'breathing problem', 'heart racing',
        # Dizziness/fainting
        'dizzy', 'dizziness', 'fainted', 'passed out', 'blacked out',
        'feel faint', 'lightheaded', 'light headed', 'vertigo',
        # Stroke signs
        'can\'t move', 'numbness', 'numb', 'vision problem', 'can\'t see',
        'slurred speech', 'confusion', 'sudden headache',
    ]
    
    # Emotional distress patterns - EXPANDED
    distress_keywords = [
        # Severe distress (URGENT)
        'gave up', 'hopeless', 'worthless', 'helpless', 'depressed',
        'alone', 'lonely', 'nobody cares', 'want to die', 'end it',
        'no point', 'can\'t go on', 'burden', 'better off without me',
        # General not feeling well (HIGH priority)
        'not feeling okay', 'not feeling well', 'not feeling good',
        'don\'t feel okay', 'don\'t feel well', 'don\'t feel good',
        'dont feel okay', 'dont feel well', 'dont feel good',
        'not okay', 'not well', 'not good', 'feel bad', 'feel off',
        'feeling bad', 'feeling terrible', 'feeling awful', 'feel sick',
        'don\'t feel right', 'something wrong', 'not right', 'unwell',
        # Physical symptoms (HIGH priority)
        'in pain', 'hurting', 'uncomfortable', 'ache', 'sore', 'painful',
        'nausea', 'nauseous', 'throwing up', 'vomiting', 'stomach',
        # Emotional distress
        'worried', 'anxious', 'stressed', 'nervous',
        'scared', 'afraid', 'frightened', 'terrified',
        'upset', 'sad', 'unhappy', 'miserable', 'down', 'crying',
        'tired all the time', 'exhausted', 'no energy', 'weak',
        # Short expressions
        'help me', 'need help', 'something\'s wrong', 'emergency'
    ]
    
    # Check for intensity modifiers that escalate urgency
    has_intensifier = any(word in transcript_lower for word in [
        'very', 'extremely', 'really', 'so', 'terribly', 'absolutely'
    ])
    
    # ===== CHECK INJURY KEYWORDS FIRST (highest priority) =====
    for keyword in injury_keywords:
        if keyword in transcript_lower:
            health_mentions.append(f"⚠️ Physical concern: '{keyword}' mentioned")
            # Head injuries, falls, chest pain = URGENT
            if keyword in ['bumped my head', 'hit my head', 'bumped head', 'hit head', 'banged my head',
                          'chest pain', 'can\'t breathe', 'fainted', 'passed out', 'blacked out',
                          'fell', 'fell down', 'i fell', 'bleeding', 'blood']:
                urgency = 'urgent'
            else:
                urgency = 'high' if urgency in ['low', 'medium'] else urgency
    
    # ===== CHECK DISTRESS KEYWORDS =====
    for keyword in distress_keywords:
        if keyword in transcript_lower:
            emotional_concerns.append(f"Expressed concern: '{keyword}' detected in conversation")
            # Higher urgency for severe keywords
            if keyword in ['want to die', 'end it', 'gave up', 'hopeless', 'worthless', 'help me', 'need help']:
                urgency = 'urgent'
            elif keyword in ['not feeling okay', 'not feeling well', 'don\'t feel okay', 'don\'t feel well',
                            'dont feel okay', 'dont feel well', 'not okay', 'not well', 'in pain', 'feel sick',
                            'feel bad', 'something\'s wrong', 'something wrong']:
                urgency = 'high' if urgency in ['low', 'medium'] else urgency
            elif keyword in ['scared', 'afraid', 'frightened', 'terrified', 'anxious', 'worried', 'upset', 'stressed']:
                # Escalate to HIGH if intensifier present
                if has_intensifier:
                    urgency = 'high' if urgency in ['low', 'medium'] else urgency
                else:
                    urgency = 'medium' if urgency == 'low' else urgency
            else:
                urgency = 'medium' if urgency == 'low' else urgency
    
    # Check sentiment scores for severe negative sentiment
    if sentiment.get('sentiment') in ['NEGATIVE', 'MIXED']:
        neg_score = sentiment.get('scores', {}).get('Negative', 0)
        if neg_score > 0.6:
            emotional_concerns.append(f"Strong negative sentiment detected (confidence: {neg_score:.1%})")
            urgency = 'high' if neg_score > 0.8 else 'medium'
    
    # Cognitive concern patterns
    cognitive_keywords = [
        'forgot', 'can\'t remember', 'confused', 'where am i',
        'what day', 'lost', 'disoriented', 'don\'t know'
    ]
    
    for keyword in cognitive_keywords:
        if keyword in transcript_lower:
            cognitive_concerns.append(f"Possible memory issue: '{keyword}' mentioned")
            urgency = 'medium' if urgency == 'low' else urgency
    
    # Health mentions from medical entities
    if medical_entities:
        if medical_entities.get('symptoms'):
            for symptom in medical_entities['symptoms'][:3]:
                health_mentions.append(f"Symptom reported: {symptom['text']}")
                urgency = 'medium' if urgency == 'low' else urgency
        
        if medical_entities.get('conditions'):
            for condition in medical_entities['conditions'][:3]:
                health_mentions.append(f"Medical condition mentioned: {condition['text']}")
        
        if medical_entities.get('medications'):
            for med in medical_entities['medications'][:3]:
                health_mentions.append(f"Medication discussed: {med['text']}")
    
    # Build recommended actions
    if emotional_concerns:
        recommended_actions.append("Consider immediate wellness check-in")
        recommended_actions.append("Review conversation with care team")
    
    if cognitive_concerns:
        recommended_actions.append("Schedule cognitive assessment")
    
    if health_mentions:
        recommended_actions.append("Follow up on reported health concerns")
    
    if not recommended_actions:
        recommended_actions.append("Continue routine monitoring")
    
    # Build summary
    concerns_count = len(emotional_concerns) + len(cognitive_concerns) + len(health_mentions)
    if concerns_count > 0:
        summary = f"Detected {concerns_count} concern(s) requiring attention. "
        if emotional_concerns:
            summary += "Emotional/health concerns expressed by elder. "
        if cognitive_concerns:
            summary += "Cognitive concerns noted. "
        if health_mentions:
            summary += f"Health issues mentioned ({len(health_mentions)} items). "
        summary += "Immediate follow-up recommended."
    else:
        summary = "No significant concerns detected in this conversation."
    
    # Override sentiment if we detected concerns (Comprehend can miss emotional context)
    adjusted_sentiment = sentiment.get('sentiment', 'neutral').lower()
    if emotional_concerns or cognitive_concerns:
        # If we found concerns but Comprehend says neutral/positive, override it
        if adjusted_sentiment in ['neutral', 'positive']:
            adjusted_sentiment = 'negative'  # Concerns detected = negative sentiment
    
    return {
        'cognitive_concerns': cognitive_concerns,
        'emotional_concerns': emotional_concerns,
        'health_mentions': health_mentions,
        'medication_concerns': [],
        'recommended_actions': recommended_actions,
        'urgency': urgency,
        'summary': summary,
        'sentiment': adjusted_sentiment,  # Return adjusted sentiment
        'reasoning': 'Analysis performed using rule-based detection (Bedrock unavailable)'
    }


def analyze_with_bedrock(
    transcript: str, 
    sentiment: Dict[str, Any], 
    key_phrases: List[str],
    medical_entities: Dict[str, List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    """
    Use Amazon Bedrock (Claude) for deeper cognitive analysis
    """
    try:
        # Build medical entities summary
        medical_summary = ""
        if medical_entities:
            if medical_entities.get('medications'):
                meds = [m['text'] for m in medical_entities['medications'][:3]]
                medical_summary += f"\nMedications Mentioned: {', '.join(meds)}"
            if medical_entities.get('symptoms'):
                symptoms = [s['text'] for s in medical_entities['symptoms'][:3]]
                medical_summary += f"\nSymptoms Detected: {', '.join(symptoms)}"
            if medical_entities.get('conditions'):
                conditions = [c['text'] for c in medical_entities['conditions'][:3]]
                medical_summary += f"\nMedical Conditions: {', '.join(conditions)}"
            if medical_entities.get('procedures'):
                procedures = [p['text'] for p in medical_entities['procedures'][:2]]
                medical_summary += f"\nProcedures/Treatments: {', '.join(procedures)}"
        
        prompt = f"""You are an AI assistant helping family caregivers monitor their elderly loved ones for signs of cognitive decline or health issues.

**CRITICAL: Be highly sensitive to any expression of discomfort, unwellness, or negative feelings. Even mild statements like "not feeling okay" or "feeling tired" should be flagged as concerns requiring attention.**

Analyze this conversation transcript and provide insights:

TRANSCRIPT:
{transcript}

SENTIMENT ANALYSIS:
Overall Sentiment: {sentiment.get('sentiment', 'neutral')}
Confidence Scores: {json.dumps(sentiment.get('scores', {}), default=str)}

KEY PHRASES:
{', '.join(key_phrases)}
{medical_summary}

MEDICAL INTELLIGENCE (Amazon Comprehend Medical):
Medications: {json.dumps([m['text'] for m in medical_entities.get('medications', [])[:5]], default=str)}
Symptoms: {json.dumps([s['text'] for s in medical_entities.get('symptoms', [])[:5]], default=str)}
Conditions: {json.dumps([c['text'] for c in medical_entities.get('conditions', [])[:5]], default=str)}

Please analyze this conversation with HIGH SENSITIVITY and provide:
1. Any signs of cognitive issues (memory problems, confusion, disorientation, temporal/spatial awareness)
2. **Any emotional or physical discomfort** (IMPORTANT: statements like "not feeling okay", "feeling unwell", "tired", "in pain" are HIGH priority concerns)
3. Any physical health mentions (pain, medication issues, mobility problems, falls risk)
4. Medication adherence concerns (missed doses, confusion about medications, side effects)
5. Recommended actions for the family (prioritized by urgency)
6. Urgency level (low, medium, high, urgent) - **Be cautious: if elder expresses ANY discomfort, minimum urgency should be "medium"**
7. Evidence-based reasoning for your assessment

**IMPORTANT: Do NOT dismiss health complaints. Any expression of feeling unwell, tired, in pain, or "not okay" should be taken seriously and flagged as a concern.**

Provide your response in JSON format with these keys:
- cognitive_concerns: list of strings (specific observations with evidence)
- emotional_concerns: list of strings (specific observations with evidence)
- health_mentions: list of strings (specific health issues detected)
- medication_concerns: list of strings (adherence, interactions, confusion)
- recommended_actions: list of strings (actionable, prioritized steps)
- urgency: string (low/medium/high/urgent)
- sentiment: string (positive/neutral/negative/mixed) - IMPORTANT: If ANY health concern, injury, pain, or distress is mentioned, sentiment MUST be "negative"
- reasoning: brief explanation of your assessment with evidence from the transcript
- summary: concise 2-3 sentence summary for caregivers

CRITICAL SENTIMENT RULE: If the elder mentions ANY physical injury, pain, illness, fall, or health concern, the sentiment MUST be "negative" - not "neutral". Health concerns are ALWAYS negative sentiment for caregiving purposes.

Keep your response evidence-based, concise, and actionable. Focus on specific observations rather than generic advice."""

        # Call Bedrock with Claude model
        request_body = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 1000,
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        }
        
        # Use inference profile ARNs for Claude Haiku 4.5 (required for on-demand)
        # Also try cross-region inference profiles
        model_ids = [
            'arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-5-haiku-20241022-v1:0',
            'arn:aws:bedrock:us-east-1:007326679457:inference-profile/us.anthropic.claude-3-5-haiku-20241022-v1:0',
            'us.anthropic.claude-3-5-haiku-20241022-v1:0',   # Cross-region format
            'anthropic.claude-3-sonnet-20240229-v1:0',       # Try Sonnet as fallback
            'anthropic.claude-instant-v1',                    # Try Instant as last resort
        ]
        
        response = None
        last_error = None
        successful_model = None
        for model_id in model_ids:
            try:
                logger.info(f"Trying model: {model_id}")
                response = bedrock_runtime.invoke_model(
                    modelId=model_id,
                    contentType='application/json',
                    accept='application/json',
                    body=json.dumps(request_body)
                )
                successful_model = model_id
                logger.info(f"✅ Successfully used model: {model_id}")
                break
            except Exception as model_error:
                last_error = model_error
                logger.warning(f"Model {model_id} failed: {str(model_error)[:100]}, trying next...")
                continue
        
        if response is None:
            logger.error(f"All models failed. Last error: {last_error}")
            raise last_error or Exception("All Bedrock models failed")
        
        response_body = json.loads(response['body'].read())
        content = response_body.get('content', [{}])[0].get('text', '')
        
        # Parse JSON from response - robust extraction
        try:
            import re
            
            # Method 1: Extract from markdown code blocks
            if '```json' in content:
                content = content.split('```json')[1].split('```')[0].strip()
            elif '```' in content:
                content = content.split('```')[1].split('```')[0].strip()
            
            # Method 2: Find JSON object boundaries (handles extra text after JSON)
            # Look for the outermost { ... } pair
            json_match = re.search(r'\{[\s\S]*\}', content)
            if json_match:
                json_str = json_match.group(0)
                
                # Find the matching closing brace for the first opening brace
                brace_count = 0
                json_end = 0
                for i, char in enumerate(json_str):
                    if char == '{':
                        brace_count += 1
                    elif char == '}':
                        brace_count -= 1
                        if brace_count == 0:
                            json_end = i + 1
                            break
                
                if json_end > 0:
                    json_str = json_str[:json_end]
                    logger.info(f"Extracted JSON of length {len(json_str)}")
                    analysis = json.loads(json_str)
                    
                    # Ensure sentiment is present and health concerns = negative
                    if analysis.get('health_mentions') or analysis.get('emotional_concerns') or analysis.get('cognitive_concerns'):
                        if analysis.get('sentiment', '').lower() in ['neutral', 'positive', '']:
                            analysis['sentiment'] = 'negative'
                            logger.info("Overriding Bedrock sentiment to 'negative' due to health concerns")
                    
                    return analysis
            
            # Fallback: try direct parse
            analysis = json.loads(content)
            return analysis
            
        except json.JSONDecodeError as e:
            logger.error(f"Could not parse Bedrock response as JSON: {str(e)[:100]}")
            logger.error(f"Content preview: {content[:300]}")
            # Return the raw summary from Claude as fallback
            return {
                'cognitive_concerns': [],
                'emotional_concerns': ['AI detected potential concerns - review transcript'],
                'health_mentions': [],
                'recommended_actions': ['Review call transcript manually'],
                'urgency': 'medium',
                'sentiment': 'negative',  # Default to negative on parse failure
                'summary': content[:200] if content else 'Analysis completed - review transcript for details'
            }
            
    except Exception as e:
        error_msg = str(e)
        logger.error(f"❌ BEDROCK FAILED: {error_msg}", exc_info=True)
        logger.warning("⚠️ Falling back to rule-based analysis. To enable AI: Enable Claude model access in AWS Bedrock console.")
        
        # Use rule-based fallback analysis
        fallback_result = rule_based_fallback_analysis(
            transcript, sentiment, key_phrases, medical_entities
        )
        
        # Add note about Bedrock status
        if 'AccessDeniedException' in error_msg or 'access' in error_msg.lower():
            bedrock_note = ' [Note: Bedrock access denied - enable Claude model in AWS Console]'
        elif 'ValidationException' in error_msg:
            bedrock_note = f' [Note: Bedrock config error: {error_msg[:50]}]'
        else:
            bedrock_note = f' [Note: Bedrock unavailable: {error_msg[:50]}]'
        
        fallback_result['reasoning'] += bedrock_note
        
        return fallback_result


def create_alert_event(analysis: Dict[str, Any], transcript: str, user_id: str):
    """Create alert event in EventBridge if concerns detected"""
    try:
        urgency = analysis.get('urgency', 'low')
        concerns = (
            analysis.get('cognitive_concerns', []) +
            analysis.get('emotional_concerns', []) +
            analysis.get('health_mentions', [])
        )
        
        if not concerns:
            logger.info("No concerns detected, skipping alert")
            return
        
        # Determine alert type based on actual content
        concerns_text = ' '.join(concerns).lower()
        alert_type = 'healthConcern'  # Default to health concern
        
        # Check for specific patterns in order of priority
        if 'medication' in concerns_text or 'dose' in concerns_text or 'pill' in concerns_text:
            alert_type = 'medicationConcern'
        elif 'dizzy' in concerns_text or 'fever' in concerns_text or 'pain' in concerns_text or 'sick' in concerns_text or 'headache' in concerns_text or 'fall' in concerns_text or 'injury' in concerns_text:
            alert_type = 'healthConcern'
        elif 'memory' in concerns_text or 'forgot' in concerns_text or 'confused' in concerns_text or 'disoriented' in concerns_text:
            alert_type = 'memoryIssue'
        elif 'scared' in concerns_text or 'anxious' in concerns_text or 'worried' in concerns_text or 'sad' in concerns_text or 'lonely' in concerns_text:
            alert_type = 'emotionalDistress'
        elif analysis.get('cognitive_concerns'):
            alert_type = 'memoryIssue'
        elif analysis.get('emotional_concerns'):
            alert_type = 'emotionalDistress'
        
        if urgency == 'urgent':
            alert_type = 'urgentHelp'
        
        # Generate a unique alert ID to track this event across Step Functions and DynamoDB
        import time
        alert_timestamp = int(time.time())
        alert_id = f"ALERT#{alert_timestamp}"

        event = {
            'Source': 'carecircle.alerts',
            'DetailType': 'Alert Created',
            'Detail': json.dumps({
                'alert_id': alert_id,  # CRITICAL: Include ID for checking status later
                'alert_type': alert_type,
                'urgency': urgency,
                'concerns': concerns,
                'summary': analysis.get('summary', ''),
                'recommended_actions': analysis.get('recommended_actions', []),
                'transcript_preview': transcript[:200],
                'user_id': user_id,
            }),
            'EventBusName': EVENT_BUS_NAME,
        }
        
        events.put_events(Entries=[event])
        logger.info(f"Alert event created: {alert_type} - {urgency}")
        
    except Exception as e:
        logger.error(f"Error creating alert event: {e}")


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Main handler for AI analysis
    Input: transcript text or audio file reference
    Output: comprehensive analysis with alerts
    """
    try:
        logger.info(f"Processing AI analysis request")
        
        # Extract transcript from event
        body = json.loads(event.get('body', '{}'))
        transcript = body.get('transcript', '')
        user_id = event.get('requestContext', {}).get('authorizer', {}).get('claims', {}).get('sub', 'anonymous')
        
        if not transcript:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'No transcript provided'})
            }
        
        # Step 1: Detect language
        language = detect_language(transcript)
        logger.info(f"Detected language: {language}")
        
        # Step 2: Sentiment analysis
        sentiment = analyze_sentiment(transcript, language)
        logger.info(f"Sentiment: {sentiment.get('sentiment')}")
        
        # Step 3: Key phrase extraction
        key_phrases = extract_key_phrases(transcript, language)
        logger.info(f"Key phrases: {key_phrases}")
        
        # Step 3.5: Medical entity extraction (Comprehend Medical)
        medical_entities = extract_medical_entities(transcript)
        logger.info(f"Medical entities extracted: "
                   f"{len(medical_entities.get('medications', []))} medications, "
                   f"{len(medical_entities.get('symptoms', []))} symptoms, "
                   f"{len(medical_entities.get('conditions', []))} conditions")
        
        # Step 4: Bedrock analysis for cognitive assessment
        bedrock_analysis = analyze_with_bedrock(transcript, sentiment, key_phrases, medical_entities)
        logger.info(f"Bedrock analysis urgency: {bedrock_analysis.get('urgency')}")
        
        # Step 5: Create alert if needed
        logger.info(f"Creating alert event for user_id: {user_id}")
        create_alert_event(bedrock_analysis, transcript, user_id)
        
        # Compile full analysis
        # Use adjusted sentiment from analysis if available, otherwise use Comprehend sentiment
        final_sentiment = bedrock_analysis.get('sentiment', sentiment['sentiment'])
        
        # OVERRIDE: If health concerns detected, sentiment MUST be negative
        has_health_concerns = (
            bedrock_analysis.get('health_mentions') or 
            bedrock_analysis.get('emotional_concerns') or
            bedrock_analysis.get('cognitive_concerns') or
            bedrock_analysis.get('medication_concerns')
        )
        if has_health_concerns and final_sentiment in ['neutral', 'positive', 'NEUTRAL', 'POSITIVE']:
            final_sentiment = 'negative'
            logger.info("Overriding sentiment to 'negative' due to health concerns detected")
        
        # Detect if Bedrock was used or if it fell back to rules
        used_bedrock = 'rule-based' not in bedrock_analysis.get('reasoning', '').lower()
        
        full_analysis = {
            'transcript': transcript,
            'language': language,
            'sentiment': final_sentiment,  # Use adjusted sentiment
            'sentiment_scores': sentiment['scores'],
            'key_phrases': key_phrases,
            'medical_entities': medical_entities,  # NEW: Include medical entity extraction
            'cognitive_concerns': bedrock_analysis.get('cognitive_concerns', []),
            'emotional_concerns': bedrock_analysis.get('emotional_concerns', []),
            'health_mentions': bedrock_analysis.get('health_mentions', []),
            'medication_concerns': bedrock_analysis.get('medication_concerns', []),  # NEW
            'recommended_actions': bedrock_analysis.get('recommended_actions', []),
            'reasoning': bedrock_analysis.get('reasoning', ''),  # NEW: Evidence-based reasoning
            'urgency': bedrock_analysis.get('urgency', 'low'),
            'summary': bedrock_analysis.get('summary', ''),
            'ai_engine': 'Amazon Bedrock (Claude)' if used_bedrock else 'Rule-based fallback (Bedrock access may need to be enabled)',
        }
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            'body': json.dumps({
                'success': True,
                'analysis': full_analysis
            }, default=str)
        }
        
    except Exception as e:
        logger.error(f"Error in AI analysis: {e}", exc_info=True)
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }

