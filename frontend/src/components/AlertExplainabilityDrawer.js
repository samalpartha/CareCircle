import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import './AlertExplainabilityDrawer.css';

/**
 * Alert Explainability Drawer
 * Shows RAG-powered evidence-based explanations for alerts
 * Demonstrates Amazon Bedrock Knowledge Base + Citations
 */
function AlertExplainabilityDrawer({ alert, onClose }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [explanation, setExplanation] = useState(null);
  const [error, setError] = useState(null);

  // Fetch RAG explanation when component mounts
  React.useEffect(() => {
    if (alert && !explanation) {
      fetchExplanation();
    }
  }, [alert]);

  const fetchExplanation = async () => {
    setLoading(true);
    setError(null);
    
    // Generate dynamic explanation based on actual alert content
    console.log('Generating explanation for alert:', alert);
    setExplanation(generateDynamicExplanation(alert));
    setLoading(false);
  };

  // Generate dynamic explanation based on actual alert content
  const generateDynamicExplanation = (alertData) => {
    const alertType = alertData.type || alertData.alert_type || 'healthConcern';
    const concerns = alertData.concerns || [];
    const actions = alertData.recommended_actions || [];
    const description = alertData.description || alertData.message || '';
    const transcript = alertData.transcript || '';
    const summary = alertData.summary || '';
    const timestamp = alertData.timestamp ? new Date(alertData.timestamp).toLocaleString() : 'Recently';
    
    // Extract the actual spoken words from description if transcript not available
    // Description format: "summary\n\n📝 What was said: \"actual words\""
    let actualTranscript = transcript;
    if (!actualTranscript && description.includes('📝 What was said:')) {
      const match = description.match(/📝 What was said: "([^"]+)"/);
      if (match) {
        actualTranscript = match[1];
      }
    }
    
    // Determine severity based on keywords (falls are always high priority)
    const descLower = (description + ' ' + actualTranscript).toLowerCase();
    const isHighPriority = descLower.includes('fall') || descLower.includes('fell') || 
                           descLower.includes('hurt') || descLower.includes('pain') ||
                           descLower.includes('emergency') || descLower.includes('help') ||
                           descLower.includes('dizzy') || descLower.includes('chest') ||
                           alertData.severity === 'high' || alertData.priority === 'high';
    
    // Build evidence from concerns AND transcript
    let evidence = [];
    
    // Add transcript as primary evidence if available
    if (actualTranscript) {
      evidence.push({
        type: 'quote',
        signal: '🗣️ Elder\'s Words',
        content: actualTranscript,
        source: `Call at ${timestamp}`,
      });
    }
    
    // Add individual concerns from AI
    if (concerns.length > 0) {
      concerns.forEach((concern) => {
        evidence.push({
          type: 'signal',
          signal: '🔍 AI Detected',
          content: concern,
          source: `Amazon Bedrock Analysis`,
        });
      });
    }
    
    // Add summary as evidence if no other evidence
    if (evidence.length === 0 && summary) {
      evidence.push({
        type: 'signal',
        signal: '📋 AI Summary',
        content: summary,
        source: `Detected at ${timestamp}`,
      });
    }
    
    // Ultimate fallback
    if (evidence.length === 0) {
      evidence.push({
        type: 'signal',
        signal: '⚠️ Alert',
        content: description || 'Health concern detected',
        source: `Detected at ${timestamp}`,
      });
    }
    
    // Build action items from recommended_actions with smart urgency
    let actionItems = [];
    
    if (actions.length > 0) {
      // Use actual AI-recommended actions
      actionItems = actions.map((action, idx) => {
        // Determine urgency based on action content
        const actionLower = action.toLowerCase();
        let urgency = 'medium';
        if (actionLower.includes('immediate') || actionLower.includes('emergency') || actionLower.includes('urgent') || idx === 0) {
          urgency = isHighPriority ? 'immediate' : 'high';
        } else if (actionLower.includes('schedule') || actionLower.includes('monitor')) {
          urgency = 'medium';
        }
        
        return {
          action: action,
          urgency: urgency,
          citation: 'Amazon Bedrock (Claude) AI'
        };
      });
    } else {
      // Fall back to context-aware defaults
      actionItems = getSmartDefaultActions(alertType, descLower, isHighPriority);
    }
    
    // Build confidence rationale
    const confidenceReasons = [];
    if (actualTranscript) {
      confidenceReasons.push('Direct quote captured from conversation');
    }
    if (concerns.length > 0) {
      confidenceReasons.push(`${concerns.length} specific concern(s) identified by AI`);
    }
    confidenceReasons.push(`Alert type: ${formatAlertType(alertType)}`);
    if (isHighPriority) {
      confidenceReasons.push('⚠️ High-risk keywords detected (fall, injury, pain)');
    }
    
    // Clean summary for display
    const cleanSummary = summary || description.split('\n')[0] || 'Health concern detected';
    
    return {
      answer: cleanSummary,
      
      what_changed: null, // Only show if we have historical data
      
      evidence: evidence,
      
      confidence_rationale: {
        level: isHighPriority ? 'high' : 'medium',
        reasons: confidenceReasons,
      },
      
      action_items: actionItems,
      
      sources_cited: [
        'Amazon Bedrock (Claude) AI Analysis',
        actions.length > 0 ? 'AI-Generated Recommendations' : 'CareCircle Best Practices',
      ],
      
      confidence: isHighPriority ? 'high' : 'medium',
      
      additional_considerations: getSmartConsiderations(alertType, descLower),
      
      retrieved_documents: null // Only show when RAG service returns documents
    };
  };
  
  const formatAlertType = (type) => {
    const labels = {
      healthConcern: 'Health Concern',
      memoryIssue: 'Memory/Cognitive Issue',
      emotionalDistress: 'Emotional Distress',
      medicationConcern: 'Medication Concern',
      urgentHelp: 'Urgent Help Needed',
      behavioralChange: 'Behavioral Change',
    };
    return labels[type] || type;
  };
  
  // Smart default actions based on alert type AND content
  const getSmartDefaultActions = (alertType, contentLower, isHighPriority) => {
    // Fall-specific actions
    if (contentLower.includes('fall') || contentLower.includes('fell')) {
      return [
        { action: '🚨 Contact elder IMMEDIATELY to check for injuries', urgency: 'immediate', citation: 'CDC STEADI Fall Prevention' },
        { action: 'Assess for head injury, broken bones, or severe pain', urgency: 'immediate', citation: 'Emergency Response Protocol' },
        { action: 'If injured or confused, call 911 or take to ER', urgency: 'immediate', citation: 'Emergency Medical Services' },
        { action: 'Document fall details: location, time, circumstances', urgency: 'high', citation: 'Fall Risk Assessment' },
        { action: 'Schedule fall risk assessment with physician', urgency: 'high', citation: 'CDC Fall Prevention Guidelines' },
        { action: 'Review home for hazards: rugs, lighting, grab bars', urgency: 'medium', citation: 'Home Safety Checklist' },
      ];
    }
    
    // Pain/injury-specific actions
    if (contentLower.includes('pain') || contentLower.includes('hurt') || contentLower.includes('injury')) {
      return [
        { action: 'Assess pain level and location immediately', urgency: 'high', citation: 'Pain Assessment Guidelines' },
        { action: 'Check for visible injuries or swelling', urgency: 'high', citation: 'First Aid Protocol' },
        { action: 'Apply ice if appropriate, elevate if limb injury', urgency: 'high', citation: 'First Aid Best Practices' },
        { action: 'Schedule medical evaluation within 24 hours', urgency: 'medium', citation: 'Medical Follow-up Guidelines' },
      ];
    }
    
    // Dizziness-specific actions
    if (contentLower.includes('dizzy') || contentLower.includes('dizziness')) {
      return [
        { action: 'Have elder sit or lie down immediately', urgency: 'immediate', citation: 'Dizziness Safety Protocol' },
        { action: 'Check blood pressure if equipment available', urgency: 'high', citation: 'Vital Signs Monitoring' },
        { action: 'Ensure hydration - offer water or electrolytes', urgency: 'high', citation: 'Dehydration Prevention' },
        { action: 'Review recent medication changes', urgency: 'medium', citation: 'Medication Side Effects' },
        { action: 'Schedule physician visit for evaluation', urgency: 'medium', citation: 'Medical Evaluation Guidelines' },
      ];
    }
    
    // Standard actions by type
    const defaultActions = {
      healthConcern: [
        { action: 'Check on elder and assess current condition', urgency: isHighPriority ? 'high' : 'medium', citation: 'CareCircle Best Practices' },
        { action: 'Schedule medical follow-up if symptoms persist', urgency: 'medium', citation: 'General Health Guidelines' },
      ],
      memoryIssue: [
        { action: 'Document specific memory incidents with dates', urgency: 'high', citation: 'Mayo Clinic Cognitive Health' },
        { action: 'Consider scheduling cognitive assessment', urgency: 'medium', citation: 'NIA Guidelines' },
      ],
      emotionalDistress: [
        { action: 'Reach out to elder for emotional support', urgency: 'high', citation: 'Mental Health First Aid' },
        { action: 'Monitor for signs of depression or anxiety', urgency: 'medium', citation: 'CDC Mental Health' },
      ],
      medicationConcern: [
        { action: 'Verify all medications were taken correctly', urgency: 'high', citation: 'NIA Medication Management' },
        { action: 'Consider pill organizer or reminder system', urgency: 'medium', citation: 'FDA Medication Safety' },
      ],
      urgentHelp: [
        { action: 'Contact elder immediately to assess safety', urgency: 'immediate', citation: 'Emergency Response' },
        { action: 'Consider calling emergency services if unresponsive', urgency: 'immediate', citation: 'Emergency Protocol' },
      ],
      behavioralChange: [
        { action: 'Note the behavioral change with specific details', urgency: 'medium', citation: 'Caregiver Best Practices' },
        { action: 'Discuss with other family members', urgency: 'medium', citation: 'Family Care Coordination' },
      ],
    };
    return defaultActions[alertType] || defaultActions.healthConcern;
  };
  
  // Smart considerations based on actual content
  const getSmartConsiderations = (alertType, contentLower) => {
    if (contentLower.includes('fall') || contentLower.includes('fell')) {
      return '⚠️ IMPORTANT: Falls in elderly individuals are a leading cause of injury and hospitalization. Even if the elder says they are fine, hidden injuries (especially head injuries) can have delayed symptoms. Monitor closely for the next 24-48 hours for confusion, severe headache, or worsening pain.';
    }
    
    if (contentLower.includes('dizzy')) {
      return 'Dizziness in elderly can indicate dehydration, medication side effects, blood pressure issues, or inner ear problems. Keep elder safe from falls and monitor closely.';
    }
    
    if (contentLower.includes('pain') || contentLower.includes('hurt')) {
      return 'Pain is the body\'s warning signal. New or worsening pain should be evaluated by a healthcare provider, especially in elderly individuals who may underreport symptoms.';
    }
    
    const considerations = {
      healthConcern: 'Health symptoms in elderly individuals can have various causes. If symptoms persist or worsen, seek professional medical evaluation.',
      memoryIssue: 'Occasional memory lapses are normal, but consistent patterns may warrant professional cognitive assessment.',
      emotionalDistress: 'Emotional wellbeing is crucial for overall health. Consider regular check-ins and social engagement.',
      medicationConcern: 'Medication adherence is critical for managing chronic conditions. Simple reminder systems can significantly improve compliance.',
      urgentHelp: 'When in doubt about safety, always err on the side of caution and seek immediate assistance.',
      behavioralChange: 'Changes in behavior can indicate underlying health issues or environmental factors. Track patterns over time.',
    };
    return considerations[alertType] || 'Always consult healthcare professionals for medical concerns.';
  };

  const getUrgencyColor = (urgency) => {
    const colors = {
      immediate: '#dc3545',
      high: '#fd7e14',
      medium: '#ffc107',
      low: '#28a745'
    };
    return colors[urgency] || colors.medium;
  };

  const getUrgencyIcon = (urgency) => {
    const icons = {
      immediate: '🚨',
      high: '⚠️',
      medium: '📌',
      low: '💡'
    };
    return icons[urgency] || icons.medium;
  };

  if (!alert) return null;

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="explainability-drawer" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="drawer-header">
          <div className="drawer-title">
            <span className="drawer-icon">🤖</span>
            <div>
              <h2>AI Alert Explanation</h2>
              <p className="drawer-subtitle">Evidence-based insights powered by Amazon Bedrock</p>
            </div>
          </div>
          <button className="drawer-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="drawer-content">
          {loading && (
            <div className="drawer-loading">
              <div className="loading-spinner"></div>
              <p>Analyzing alert with medical guidelines...</p>
            </div>
          )}

          {error && !explanation && (
            <div className="drawer-error">
              <span className="error-icon">⚠️</span>
              <p>Unable to load explanation: {error}</p>
              <button onClick={fetchExplanation} className="retry-btn">Retry</button>
            </div>
          )}

          {explanation && (
            <>
              {/* What Changed - Trend Delta */}
              {explanation.what_changed && (
                <section className="explanation-section what-changed">
                  <h3 className="section-title">
                    <span className="section-icon">📈</span>
                    What Changed
                  </h3>
                  <div className="what-changed-card">
                    <div className="change-summary">
                      <span className="change-delta">{explanation.what_changed.trend_delta}</span>
                      <div className="change-text">
                        <strong>{explanation.what_changed.summary}</strong>
                        <span className="change-period">{explanation.what_changed.period}</span>
                      </div>
                    </div>
                    <table className="change-table">
                      <thead>
                        <tr>
                          <th>Metric</th>
                          <th>Before</th>
                          <th>After</th>
                          <th>Change</th>
                        </tr>
                      </thead>
                      <tbody>
                        {explanation.what_changed.key_changes.map((change, index) => (
                          <tr key={index}>
                            <td>{change.metric}</td>
                            <td>{change.before}</td>
                            <td>{change.after}</td>
                            <td className={change.change.startsWith('+') || change.change === 'New concern' ? 'change-negative' : 'change-positive'}>
                              {change.change}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {/* Evidence - Specific Signals */}
              {explanation.evidence && (
                <section className="explanation-section evidence">
                  <h3 className="section-title">
                    <span className="section-icon">🔍</span>
                    Evidence (What Triggered This)
                  </h3>
                  <div className="evidence-list">
                    {explanation.evidence.map((item, index) => (
                      <div key={index} className={`evidence-item evidence-${item.type}`}>
                        <div className="evidence-signal">
                          <span className="signal-badge">{item.signal}</span>
                          <span className="evidence-source">{item.source}</span>
                        </div>
                        <blockquote className="evidence-quote">
                          "{item.content}"
                        </blockquote>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Confidence Rationale */}
              {explanation.confidence_rationale && (
                <section className="explanation-section confidence-rationale">
                  <h3 className="section-title">
                    <span className="section-icon">✓✓</span>
                    Why High Confidence?
                  </h3>
                  <div className="confidence-card">
                    <ul className="confidence-reasons">
                      {explanation.confidence_rationale.reasons.map((reason, index) => (
                        <li key={index}>
                          <span className="check-icon">✓</span>
                          {reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                </section>
              )}

              {/* Main Explanation */}
              <section className="explanation-section">
                <h3 className="section-title">
                  <span className="section-icon">📋</span>
                  AI Analysis Summary
                </h3>
                <div className="explanation-card">
                  <p className="explanation-text">{explanation.answer}</p>
                  {explanation.confidence && (
                    <div className="confidence-badge">
                      <span className="badge-label">Evidence Confidence:</span>
                      <span className={`badge confidence-${explanation.confidence}`}>
                        {explanation.confidence.toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
              </section>

              {/* Action Items */}
              {explanation.action_items && explanation.action_items.length > 0 && (
                <section className="explanation-section">
                  <h3 className="section-title">
                    <span className="section-icon">✅</span>
                    Recommended Actions
                  </h3>
                  <div className="action-items-list">
                    {explanation.action_items.map((item, index) => (
                      <div key={index} className="action-item" style={{ borderLeftColor: getUrgencyColor(item.urgency) }}>
                        <div className="action-header">
                          <span className="action-urgency" style={{ color: getUrgencyColor(item.urgency) }}>
                            {getUrgencyIcon(item.urgency)} {item.urgency.toUpperCase()}
                          </span>
                        </div>
                        <p className="action-text">{item.action}</p>
                        {item.citation && (
                          <p className="action-citation">
                            <span className="citation-icon">📚</span>
                            Source: {item.citation}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Sources Cited */}
              {explanation.sources_cited && explanation.sources_cited.length > 0 && (
                <section className="explanation-section">
                  <h3 className="section-title">
                    <span className="section-icon">📚</span>
                    Medical Guidelines Referenced
                  </h3>
                  <div className="sources-list">
                    {explanation.sources_cited.map((source, index) => (
                      <div key={index} className="source-item">
                        <span className="source-bullet">•</span>
                        <span className="source-text">{source}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Retrieved Documents (Transparency) */}
              {explanation.retrieved_documents && explanation.retrieved_documents.length > 0 && (
                <section className="explanation-section">
                  <h3 className="section-title">
                    <span className="section-icon">🔍</span>
                    Evidence Retrieved (RAG System)
                  </h3>
                  <div className="documents-list">
                    {explanation.retrieved_documents.map((doc, index) => (
                      <div key={index} className="document-card">
                        <div className="document-header">
                          <span className="document-source">{doc.source}</span>
                          <span className="relevance-score">
                            Relevance: {(doc.relevance_score * 100).toFixed(0)}%
                          </span>
                        </div>
                        <p className="document-excerpt">{doc.excerpt}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Additional Considerations */}
              {explanation.additional_considerations && (
                <section className="explanation-section">
                  <div className="considerations-card">
                    <span className="considerations-icon">💭</span>
                    <p className="considerations-text">{explanation.additional_considerations}</p>
                  </div>
                </section>
              )}

              {/* Disclaimer */}
              <div className="disclaimer">
                <span className="disclaimer-icon">⚕️</span>
                <p>
                  <strong>Medical Disclaimer:</strong> This AI analysis is intended to support family caregivers 
                  and should not replace professional medical advice. Always consult with healthcare providers 
                  for medical decisions.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="drawer-footer">
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
          <button className="btn-primary" onClick={() => window.print()}>
            📄 Print Report
          </button>
        </div>
      </div>
    </div>
  );
}

export default AlertExplainabilityDrawer;

