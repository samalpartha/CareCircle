import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import './CallInterface.css';

function CallInterface() {
  const { t } = useTranslation();
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [duration, setDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recognitionRef = useRef(null);
  const intervalRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    // Initialize Web Speech API
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcriptPiece = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcriptPiece + ' ';
          } else {
            interimTranscript += transcriptPiece;
          }
        }

        if (finalTranscript) {
          setTranscript(prev => (prev + ' ' + finalTranscript).trim());
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          setError(`Speech recognition error: ${event.error}`);
        }
      };

      recognitionRef.current.onend = () => {
        // Only restart if still recording and not paused
        if (isRecording && !isPaused && recognitionRef.current) {
          try {
            recognitionRef.current.start();
          } catch (e) {
            // Ignore if already started
          }
        }
      };
    }

    return () => {
      stopRecording();
    };
  }, []); // Empty dependency array - initialize once

  useEffect(() => {
    if (isRecording && !isPaused) {
      intervalRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRecording, isPaused]);

  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Set up audio context for visualization
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);
      
      visualizeAudio();

      // Set up media recorder
      mediaRecorderRef.current = new MediaRecorder(stream);
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.start();
      
      // Start speech recognition
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          console.log('Recognition already started');
        }
      }

      setIsRecording(true);
      setDuration(0);
      setTranscript('');
      setAnalysis(null);
    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Could not access microphone. Please check permissions.');
    }
  };

  const visualizeAudio = () => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    
    const updateLevel = () => {
      if (!isRecording || isPaused) return;
      
      analyserRef.current.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      setAudioLevel(average / 255); // Normalize to 0-1
      
      animationRef.current = requestAnimationFrame(updateLevel);
    };

    updateLevel();
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        if (recognitionRef.current) {
          try {
            recognitionRef.current.start();
          } catch (e) {
            console.log('Recognition already started');
          }
        }
      } else {
        mediaRecorderRef.current.pause();
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }
      }
      setIsPaused(!isPaused);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }

      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }

      if (audioContextRef.current) {
        audioContextRef.current.close();
      }

      // Stop all tracks
      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
      
      setIsRecording(false);
      setIsPaused(false);
      setAudioLevel(0);
    }
  };

  const analyzeTranscript = async () => {
    if (!transcript.trim()) {
      setError('No transcript available to analyze');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const result = await api.analyzeTranscript({ transcript });
      
      if (result.success && result.analysis) {
        setAnalysis(result.analysis);
        
        // Save call record to database
        try {
          await api.createCall({
            elderName: 'Elder', // TODO: Add elder selection
            duration: duration,
            transcript: transcript,
            analysis: result.analysis,
            sentimentScore: result.analysis?.sentiment_score || null,
          });
          console.log('Call record saved successfully');
        } catch (saveErr) {
          console.error('Error saving call record:', saveErr);
          // Don't show error to user - the analysis succeeded
        }
      } else {
        setError('Analysis failed. Please try again.');
      }
    } catch (err) {
      console.error('Error analyzing transcript:', err);
      // Show the actual error message from the API
      setError(err.message || 'Failed to analyze transcript. Please check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getUrgencyClass = (urgency) => {
    const classes = {
      urgent: 'urgency-urgent',
      high: 'urgency-high',
      medium: 'urgency-medium',
      low: 'urgency-low',
    };
    return classes[urgency] || 'urgency-medium';
  };

  const getSentimentEmoji = (sentiment) => {
    const emojis = {
      positive: '😊',
      negative: '😟',
      neutral: '😐',
      mixed: '😕',
      concerned: '😰',
    };
    return emojis[sentiment?.toLowerCase()] || '😐';
  };

  return (
    <div className="call-interface">
      <div className="call-header">
        <h1>{t('call.title')}</h1>
        <p className="subtitle">{t('call.subtitle')}</p>
        
        {/* Status Banner */}
        <div style={{ 
          background: 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)',
          color: 'white',
          padding: '1rem',
          borderRadius: '12px',
          marginTop: '1rem',
          fontSize: '0.9rem',
          lineHeight: '1.6'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.5rem' }}>✅</span>
            <div>
              <strong>🎤 Recording:</strong> Works immediately (browser microphone)<br/>
              <strong>📝 Transcription:</strong> Real-time speech-to-text (built-in)<br/>
              <strong>🤖 AI Analysis:</strong> Connected to AWS Bedrock (requires backend running)
            </div>
          </div>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '0.75rem' }}>
          💡 <strong>How it works:</strong> Start recording → Talk naturally → Stop → Click "Analyze with AI" for health insights
        </p>
      </div>

      <div className="call-container">
        {/* Recording Controls */}
        <div className="recording-section">
          <div className={`recording-visualizer ${isRecording ? 'active' : ''}`}>
            <div 
              className="audio-wave" 
              style={{ 
                transform: `scaleY(${isRecording ? 0.5 + audioLevel : 0.1})`,
                opacity: isRecording ? 1 : 0.3
              }}
            />
            {isRecording && (
              <div className="recording-indicator pulse">
                <span className="recording-dot" />
                REC
              </div>
            )}
          </div>

          <div className="recording-timer">
            {formatDuration(duration)}
          </div>

          <div className="control-buttons">
            {!isRecording ? (
              <button 
                onClick={startRecording} 
                className="btn btn-primary btn-large btn-record"
              >
                <span className="icon">🎤</span>
                {t('call.startRecording')}
              </button>
            ) : (
              <div className="recording-controls">
                <button 
                  onClick={pauseRecording} 
                  className="btn btn-secondary btn-icon"
                  title={isPaused ? t('call.resume') : t('call.pause')}
                >
                  {isPaused ? '▶️' : '⏸'}
                </button>
                <button 
                  onClick={stopRecording} 
                  className="btn btn-danger btn-icon"
                  title={t('call.stop')}
                >
                  ⏹
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="error-message">
              <span className="icon">⚠️</span>
              {error}
            </div>
          )}
        </div>

        {/* Transcript Section */}
        {transcript && (
          <div className="transcript-section">
            <div className="section-header">
              <h2>
                <span className="icon">📝</span>
                {t('call.transcript')}
              </h2>
              <button 
                onClick={analyzeTranscript}
                className="btn btn-primary"
                disabled={loading || !transcript.trim()}
              >
                {loading ? '⏳ Analyzing...' : '🤖 Analyze with AI'}
              </button>
            </div>
            <div className="transcript-box">
              {transcript || t('call.noTranscript')}
            </div>
          </div>
        )}

        {/* Analysis Results */}
        {loading && <LoadingSpinner message="Analyzing with AI..." />}
        
        {analysis && !loading && (
          <div className="analysis-section">
            <div className="section-header">
              <h2>
                <span className="icon">🧠</span>
                {t('call.analysis')}
              </h2>
              <span className={`urgency-badge ${getUrgencyClass(analysis.urgency)}`}>
                {analysis.urgency} Priority
              </span>
            </div>

            <div className="analysis-content">
              {/* AI Engine Status */}
              {analysis.ai_engine && (
                <div className="ai-engine-badge" style={{
                  padding: '0.5rem 1rem',
                  marginBottom: '1rem',
                  borderRadius: '8px',
                  fontSize: '0.75rem',
                  background: analysis.ai_engine.includes('Bedrock') ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                  color: analysis.ai_engine.includes('Bedrock') ? '#10b981' : '#f59e0b',
                  border: `1px solid ${analysis.ai_engine.includes('Bedrock') ? '#10b981' : '#f59e0b'}`
                }}>
                  🤖 {analysis.ai_engine}
                </div>
              )}
              
              {/* Summary */}
              {analysis.summary && (
                <div className="analysis-card summary-card">
                  <h3>📋 Summary</h3>
                  <p>{analysis.summary}</p>
                </div>
              )}

              {/* Sentiment */}
              {analysis.sentiment && (
                <div className="analysis-card sentiment-card">
                  <h3>{getSentimentEmoji(analysis.sentiment)} Sentiment</h3>
                  <div className="sentiment-info">
                    <span className={`sentiment-badge sentiment-${analysis.sentiment}`}>
                      {analysis.sentiment}
                    </span>
                    {analysis.sentiment_scores && (
                      <div className="sentiment-scores">
                        {Object.entries(analysis.sentiment_scores).map(([key, value]) => (
                          <div key={key} className="score-item">
                            <span className="score-label">{key}:</span>
                            <div className="score-bar">
                              <div 
                                className="score-fill" 
                                style={{ width: `${(value * 100).toFixed(0)}%` }}
                              />
                            </div>
                            <span className="score-value">{(value * 100).toFixed(0)}%</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Concerns */}
              <div className="concerns-grid">
                {analysis.cognitive_concerns && analysis.cognitive_concerns.length > 0 && (
                  <div className="analysis-card concerns-card">
                    <h3>🧠 Cognitive Concerns</h3>
                    <ul>
                      {analysis.cognitive_concerns.map((concern, idx) => (
                        <li key={idx}>{concern}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysis.emotional_concerns && analysis.emotional_concerns.length > 0 && (
                  <div className="analysis-card concerns-card">
                    <h3>💭 Emotional Concerns</h3>
                    <ul>
                      {analysis.emotional_concerns.map((concern, idx) => (
                        <li key={idx}>{concern}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysis.health_mentions && analysis.health_mentions.length > 0 && (
                  <div className="analysis-card concerns-card">
                    <h3>🏥 Health Mentions</h3>
                    <ul>
                      {analysis.health_mentions.map((mention, idx) => (
                        <li key={idx}>{mention}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Recommended Actions */}
              {analysis.recommended_actions && analysis.recommended_actions.length > 0 && (
                <div className="analysis-card actions-card">
                  <h3>✅ Recommended Actions</h3>
                  <ol>
                    {analysis.recommended_actions.map((action, idx) => (
                      <li key={idx}>{action}</li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Language */}
              {analysis.language && (
                <div className="metadata">
                  <span className="meta-item">
                    <strong>Language:</strong> {analysis.language.toUpperCase()}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CallInterface;
