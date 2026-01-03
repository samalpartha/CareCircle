"""
RAG (Retrieval-Augmented Generation) Service
Uses Amazon Bedrock Knowledge Bases for evidence-based care recommendations
"""
import json
import os
import logging
from typing import Dict, Any, List
import boto3

# Standard Python logging (no external dependencies)
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# AWS Clients
bedrock_agent = boto3.client('bedrock-agent-runtime', region_name='us-east-1')
bedrock_runtime = boto3.client('bedrock-runtime', region_name='us-east-1')

# Knowledge Base Configuration
KNOWLEDGE_BASE_ID = os.environ.get('KNOWLEDGE_BASE_ID', 'default-kb-id')


def query_knowledge_base(query: str, max_results: int = 5) -> List[Dict[str, Any]]:
    """
    Query the Bedrock Knowledge Base for relevant care guidelines
    Returns: List of relevant documents with citations
    """
    try:
        response = bedrock_agent.retrieve(
            knowledgeBaseId=KNOWLEDGE_BASE_ID,
            retrievalQuery={
                'text': query
            },
            retrievalConfiguration={
                'vectorSearchConfiguration': {
                    'numberOfResults': max_results
                }
            }
        )
        
        results = []
        for result in response.get('retrievalResults', []):
            results.append({
                'content': result.get('content', {}).get('text', ''),
                'score': result.get('score', 0),
                'source': result.get('location', {}).get('s3Location', {}).get('uri', 'unknown'),
                'metadata': result.get('metadata', {})
            })
        
        logger.info(f"Retrieved {len(results)} documents from knowledge base")
        return results
        
    except Exception as e:
        logger.error(f"Error querying knowledge base: {e}")
        # Fallback: Return mock data for demo/development
        return get_mock_knowledge_base_results(query)


def get_mock_knowledge_base_results(query: str) -> List[Dict[str, Any]]:
    """
    Mock knowledge base for development/demo
    Replace with real KB once deployed
    """
    # Simulated medical guidelines database
    guidelines = [
        {
            'topic': 'cognitive_decline',
            'content': '''Temporal disorientation (confusion about dates, times, or locations) is an early indicator of cognitive decline. 
            According to Mayo Clinic guidelines, families should monitor for:
            - Difficulty remembering recent events or conversations
            - Confusion about time, date, or place
            - Difficulty with familiar tasks
            - Changes in mood or personality
            
            Recommended Actions:
            1. Document specific incidents with dates and details
            2. Schedule cognitive screening (Mini-Mental State Examination or Montreal Cognitive Assessment)
            3. Review current medications for cognitive side effects
            4. Establish daily routines and memory aids
            
            Reference: Mayo Clinic Alzheimer's Disease & Dementia Guidelines 2024''',
            'source': 'Mayo Clinic Cognitive Health Guidelines',
            'score': 0.95
        },
        {
            'topic': 'medication_adherence',
            'content': '''Medication non-adherence in elderly populations is a critical safety concern. 
            National Institute on Aging (NIA) recommendations:
            
            Risk Factors for Non-Adherence:
            - Complex medication regimens (>4 medications)
            - Cognitive impairment
            - Visual impairment
            - Lack of social support
            - Cost concerns
            
            Evidence-Based Interventions:
            1. Pill organizers with daily compartments
            2. Medication reminder apps or alarms
            3. Simplified dosing schedules (discuss with prescriber)
            4. Regular medication reviews every 3-6 months
            5. Family caregiver involvement in medication management
            
            Critical: Missing doses of diabetes medication (Metformin, insulin) can lead to hyperglycemia. 
            Missing blood pressure medication increases cardiovascular risk.
            
            Reference: NIA Medication Management Best Practices 2024''',
            'source': 'National Institute on Aging',
            'score': 0.92
        },
        {
            'topic': 'fall_risk',
            'content': '''Dizziness in elderly adults is a significant fall risk factor requiring immediate assessment.
            
            CDC Fall Prevention Guidelines:
            
            Common Causes of Dizziness:
            - Medication side effects (blood pressure meds, diabetes meds)
            - Inner ear problems (vertigo)
            - Dehydration
            - Orthostatic hypotension (blood pressure drops when standing)
            - Hypoglycemia (low blood sugar in diabetics)
            
            Immediate Actions:
            1. Check blood pressure (lying and standing)
            2. Check blood glucose if diabetic
            3. Review medications for side effects
            4. Assess hydration status
            5. Remove fall hazards from home (rugs, clutter)
            
            Red Flags Requiring Medical Attention:
            - Dizziness with chest pain or shortness of breath
            - Dizziness with confusion or speech changes
            - Dizziness after head injury
            - Persistent or worsening dizziness
            
            Reference: CDC STEADI (Stopping Elderly Accidents, Deaths & Injuries) Initiative 2024''',
            'source': 'CDC Fall Prevention Guidelines',
            'score': 0.89
        },
        {
            'topic': 'diabetes_management',
            'content': '''Type 2 Diabetes management in elderly populations requires careful monitoring.
            
            American Diabetes Association (ADA) Elderly Care Guidelines:
            
            Blood Glucose Monitoring:
            - Target: 100-180 mg/dL for most elderly adults
            - More lenient targets for those with cognitive impairment
            - Check before meals and at bedtime if on insulin
            
            Metformin Safety:
            - Most common first-line medication for Type 2 Diabetes
            - Side effects: GI upset, diarrhea, nausea (usually temporary)
            - Contraindications: Severe kidney disease, liver disease
            - Take with meals to reduce GI side effects
            
            Hypoglycemia Warning Signs:
            - Dizziness, shakiness, confusion
            - Sweating, rapid heartbeat
            - Cognitive changes (can mimic dementia)
            
            Family Caregiver Role:
            - Monitor blood glucose logs
            - Ensure medication adherence
            - Watch for hypo/hyperglycemia symptoms
            - Coordinate with healthcare team
            
            Reference: ADA Standards of Medical Care in Diabetes 2024''',
            'source': 'American Diabetes Association',
            'score': 0.87
        },
        {
            'topic': 'family_caregiver_support',
            'content': '''Family caregivers are at high risk for burnout and need proactive support systems.
            
            Family Caregiver Alliance Recommendations:
            
            Warning Signs of Caregiver Burnout:
            - Feeling overwhelmed or constantly worried
            - Feeling tired often
            - Getting too much sleep or not enough
            - Losing interest in activities you used to enjoy
            - Becoming easily irritated or angry
            
            Self-Care Strategies:
            1. Share caregiving tasks among family members
            2. Take regular breaks (respite care)
            3. Join caregiver support groups
            4. Maintain your own health appointments
            5. Set realistic expectations
            
            Technology for Caregiver Coordination:
            - Shared task management apps
            - Medication tracking systems
            - Video check-ins
            - Emergency alert systems
            
            Reference: Family Caregiver Alliance National Center on Caregiving 2024''',
            'source': 'Family Caregiver Alliance',
            'score': 0.84
        }
    ]
    
    # Simple keyword matching for demo
    query_lower = query.lower()
    relevant_docs = []
    
    for guideline in guidelines:
        if any(keyword in query_lower for keyword in ['memory', 'confusion', 'cognitive', 'dementia', 'date', 'time', 'disoriented']):
            if guideline['topic'] == 'cognitive_decline':
                relevant_docs.append(guideline)
        if any(keyword in query_lower for keyword in ['medication', 'pill', 'metformin', 'adherence', 'dose', 'forgot']):
            if guideline['topic'] in ['medication_adherence', 'diabetes_management']:
                relevant_docs.append(guideline)
        if any(keyword in query_lower for keyword in ['dizzy', 'fall', 'balance', 'trip']):
            if guideline['topic'] == 'fall_risk':
                relevant_docs.append(guideline)
        if any(keyword in query_lower for keyword in ['diabetes', 'blood sugar', 'glucose', 'metformin']):
            if guideline['topic'] == 'diabetes_management':
                relevant_docs.append(guideline)
        if any(keyword in query_lower for keyword in ['caregiver', 'burnout', 'stress', 'overwhelmed']):
            if guideline['topic'] == 'family_caregiver_support':
                relevant_docs.append(guideline)
    
    # Remove duplicates and limit results
    seen = set()
    unique_docs = []
    for doc in relevant_docs:
        if doc['topic'] not in seen:
            seen.add(doc['topic'])
            unique_docs.append({
                'content': doc['content'],
                'source': doc['source'],
                'score': doc['score'],
                'metadata': {'topic': doc['topic']}
            })
    
    return unique_docs[:3]  # Return top 3 most relevant


def generate_rag_response(
    query: str,
    context_documents: List[Dict[str, Any]],
    conversation_summary: str = None
) -> Dict[str, Any]:
    """
    Generate response using RAG pattern:
    1. Retrieve relevant documents (already done)
    2. Augment prompt with retrieved context
    3. Generate evidence-based response
    """
    try:
        # Build context from retrieved documents
        context_text = "\n\n---\n\n".join([
            f"SOURCE: {doc['source']}\nRELEVANCE SCORE: {doc['score']:.2f}\n\n{doc['content']}"
            for doc in context_documents
        ])
        
        # Build RAG-enhanced prompt
        prompt = f"""You are an AI care advisor helping family caregivers with evidence-based recommendations.

CAREGIVER QUESTION/CONCERN:
{query}

{f"CONVERSATION CONTEXT: {conversation_summary}" if conversation_summary else ""}

RETRIEVED MEDICAL GUIDELINES:
{context_text if context_text else "No specific guidelines found for this query."}

INSTRUCTIONS:
1. Provide evidence-based recommendations citing the sources provided above
2. If guidelines don't cover the specific concern, acknowledge limitations
3. Include specific action items with urgency levels
4. Cite sources for each recommendation
5. Be empathetic - this is a family caring for a loved one

Provide your response in JSON format:
{{
  "answer": "Your comprehensive, evidence-based answer",
  "action_items": [
    {{"action": "Specific action", "urgency": "immediate/high/medium/low", "citation": "Source name"}}
  ],
  "sources_cited": ["List of source names"],
  "confidence": "high/medium/low based on evidence strength",
  "additional_considerations": "Any caveats or additional context"
}}

Remember: Always emphasize consulting with healthcare professionals for medical decisions."""

        # Call Bedrock
        request_body = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 2000,
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "temperature": 0.3  # Lower temperature for more factual responses
        }
        
        # Try inference profile first (works with on-demand), fallback to model ID
        model_ids = [
            'us.anthropic.claude-3-5-haiku-20241022-v1:0',
            'anthropic.claude-3-haiku-20240307-v1:0',
        ]
        
        response = None
        for model_id in model_ids:
            try:
                response = bedrock_runtime.invoke_model(
                    modelId=model_id,
                    contentType='application/json',
                    accept='application/json',
                    body=json.dumps(request_body)
                )
                logger.info(f"Successfully used model: {model_id}")
                break
            except Exception as model_error:
                logger.warning(f"Model {model_id} failed: {str(model_error)[:50]}")
                continue
        
        if response is None:
            raise Exception("All Bedrock models failed")
        
        response_body = json.loads(response.get('body').read())
        content = response_body.get('content', [{}])[0].get('text', '{}')
        
        try:
            rag_response = json.loads(content)
            # Add retrieved documents for transparency
            rag_response['retrieved_documents'] = [
                {
                    'source': doc['source'],
                    'relevance_score': doc['score'],
                    'excerpt': doc['content'][:200] + '...' if len(doc['content']) > 200 else doc['content']
                }
                for doc in context_documents
            ]
            return rag_response
        except json.JSONDecodeError:
            logger.warning(f"Could not parse RAG response as JSON: {content}")
            return {
                'answer': content,
                'action_items': [],
                'sources_cited': [doc['source'] for doc in context_documents],
                'confidence': 'medium',
                'retrieved_documents': context_documents
            }
            
    except Exception as e:
        logger.error(f"Error generating RAG response: {e}")
        return {
            'answer': 'Unable to generate response at this time.',
            'action_items': [],
            'sources_cited': [],
            'confidence': 'low',
            'error': str(e)
        }


def explain_alert_with_rag(alert_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generate explainability for an alert using RAG
    This powers the "Why?" button in alerts
    """
    # Build query from alert data
    concerns = alert_data.get('cognitive_concerns', []) + \
               alert_data.get('emotional_concerns', []) + \
               alert_data.get('health_mentions', []) + \
               alert_data.get('medication_concerns', [])
    
    query = f"""Explain this care alert and provide evidence-based recommendations:
    
Alert Type: {alert_data.get('alert_type', 'general')}
Urgency: {alert_data.get('urgency', 'medium')}
Concerns Detected: {', '.join(concerns)}
Summary: {alert_data.get('summary', '')}

What medical guidelines support this alert? What should the family do?"""
    
    # Retrieve relevant guidelines
    documents = query_knowledge_base(query, max_results=3)
    
    # Generate explanation
    explanation = generate_rag_response(
        query=query,
        context_documents=documents,
        conversation_summary=alert_data.get('transcript_preview', '')
    )
    
    return explanation


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    RAG Service Handler
    Routes:
    - POST /rag/query - General RAG query
    - POST /rag/explain-alert - Explain an alert with citations
    """
    try:
        logger.info(f"RAG service request: {event.get('path')}")
        
        body = json.loads(event.get('body', '{}'))
        path = event.get('path', '')
        
        if path.endswith('/query'):
            # General RAG query
            query = body.get('query', '')
            if not query:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json'},
                    'body': json.dumps({'error': 'Query is required'})
                }
            
            # Retrieve relevant documents
            documents = query_knowledge_base(query, max_results=body.get('max_results', 5))
            
            # Generate response
            response = generate_rag_response(
                query=query,
                context_documents=documents,
                conversation_summary=body.get('context', None)
            )
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                'body': json.dumps(response)
            }
        
        elif path.endswith('/explain-alert'):
            # Explain alert with RAG
            alert_data = body.get('alert', {})
            if not alert_data:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json'},
                    'body': json.dumps({'error': 'Alert data is required'})
                }
            
            explanation = explain_alert_with_rag(alert_data)
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                'body': json.dumps(explanation)
            }
        
        else:
            return {
                'statusCode': 404,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'Endpoint not found'})
            }
            
    except Exception as e:
        logger.error(f"Error in RAG service: {e}")
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': str(e)})
        }

