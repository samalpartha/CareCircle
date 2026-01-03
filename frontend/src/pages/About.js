import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './About.css';

/**
 * About Page - Complete App Guide for Novice Users
 * Addresses trust, privacy, AI limitations, elder autonomy, and real-world scenarios
 */
function About() {
  const [expandedSection, setExpandedSection] = useState('overview');

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="about-page">
      {/* Hero Section */}
      <div className="about-hero">
        <div className="hero-content">
          <div className="hero-icon">💜</div>
          <h1>Welcome to CareCircle</h1>
          <p className="hero-subtitle">
            Your family's care coordination companion. We help you stay connected 
            with elderly loved ones, detect health concerns early, and coordinate 
            care among family members—even when you're miles away.
          </p>
        </div>
      </div>

      {/* Trust Banner - Address concerns upfront */}
      <div className="trust-banner">
        <div className="trust-items">
          <div className="trust-item">
            <span className="trust-icon">🔒</span>
            <span>Recording is always opt-in</span>
          </div>
          <div className="trust-item">
            <span className="trust-icon">👤</span>
            <span>Family-only access</span>
          </div>
          <div className="trust-item">
            <span className="trust-icon">🩺</span>
            <span>AI assists, never replaces doctors</span>
          </div>
          <div className="trust-item">
            <span className="trust-icon">🗑️</span>
            <span>Full deletion control</span>
          </div>
        </div>
      </div>

      {/* Quick Start Banner */}
      <div className="quick-start-banner">
        <div className="banner-icon">🚀</div>
        <div className="banner-content">
          <h2>New here? Start with these 3 steps:</h2>
          <ol className="quick-steps">
            <li><Link to="/family">Add your family members</Link> (elders + caregivers)</li>
            <li><Link to="/call">Make your first call</Link> to record a conversation</li>
            <li>Review AI suggestions and decide what actions to take</li>
          </ol>
        </div>
      </div>

      {/* Real-Life Story */}
      <div className="story-banner">
        <div className="story-icon">📖</div>
        <div className="story-content">
          <h3>How It Helped One Family</h3>
          <p>
            "During a routine call with Mom, I mentioned she sounded tired. After recording, 
            CareCircle noticed she'd mentioned dizziness three times that week. An alert was created. 
            My sister, who lives nearby, scheduled a doctor visit. Turns out her blood pressure 
            medication needed adjusting. <strong>We caught it before a fall happened.</strong>"
          </p>
          <p className="story-attribution">— Sarah, daughter and primary caregiver</p>
        </div>
      </div>

      {/* Main Sections */}
      <div className="about-sections">
        
        {/* Privacy & Trust - MOST IMPORTANT */}
        <section className={`about-section priority-section ${expandedSection === 'privacy' ? 'expanded' : ''}`}>
          <button className="section-header" onClick={() => toggleSection('privacy')}>
            <span className="section-icon">🔐</span>
            <span className="section-title">Privacy, Trust & Your Control</span>
            <span className="section-badge">Read First</span>
            <span className="section-toggle">{expandedSection === 'privacy' ? '−' : '+'}</span>
          </button>
          {expandedSection === 'privacy' && (
            <div className="section-content">
              <div className="privacy-grid">
                <div className="privacy-card">
                  <h4>🎙️ Recording Is Always Your Choice</h4>
                  <ul>
                    <li><strong>You press the button.</strong> Recording never happens automatically.</li>
                    <li>You can stop recording at any time.</li>
                    <li>Nothing is analyzed until you choose "Analyze."</li>
                    <li>You can delete recordings permanently—no hidden copies.</li>
                  </ul>
                </div>

                <div className="privacy-card">
                  <h4>👵 Does My Elder Know?</h4>
                  <ul>
                    <li>CareCircle does not notify the elder automatically.</li>
                    <li><strong>We strongly recommend</strong> telling your loved one: "I'm using an app to help remember what we talked about."</li>
                    <li>Transparency builds trust. Most elders appreciate the extra attention.</li>
                    <li>If they're uncomfortable, you can simply take notes instead.</li>
                  </ul>
                </div>

                <div className="privacy-card">
                  <h4>🔒 Who Can See My Data?</h4>
                  <ul>
                    <li><strong>Only family members you add</strong> can see recordings, alerts, and tasks.</li>
                    <li>CareCircle staff cannot access your recordings or health data.</li>
                    <li>Data is encrypted in transit and at rest.</li>
                    <li>You can remove family members at any time.</li>
                  </ul>
                </div>

                <div className="privacy-card">
                  <h4>📍 Where Is My Data Stored?</h4>
                  <ul>
                    <li>Stored securely on Amazon Web Services (AWS) in the US.</li>
                    <li>Recordings are stored only as long as you keep them.</li>
                    <li>Delete a recording = permanently gone within 24 hours.</li>
                    <li>You can export all your data anytime.</li>
                  </ul>
                </div>

                <div className="privacy-card">
                  <h4>🗑️ How Do I Delete Everything?</h4>
                  <ul>
                    <li>Go to Settings → Privacy → Delete All Data.</li>
                    <li>This removes all recordings, alerts, tasks, and history.</li>
                    <li>Account deletion removes everything permanently.</li>
                    <li>No "are you sure?" games—we respect your decision.</li>
                  </ul>
                </div>

                <div className="privacy-card">
                  <h4>⚖️ Your Rights</h4>
                  <ul>
                    <li>Access: See all data we have about you.</li>
                    <li>Correct: Fix any incorrect information.</li>
                    <li>Delete: Remove your data at any time.</li>
                    <li>Export: Download your data in readable format.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* AI Limitations - Critical for Trust */}
        <section className={`about-section ${expandedSection === 'ai-limits' ? 'expanded' : ''}`}>
          <button className="section-header" onClick={() => toggleSection('ai-limits')}>
            <span className="section-icon">🤖</span>
            <span className="section-title">AI Is an Assistant, Not a Doctor</span>
            <span className="section-toggle">{expandedSection === 'ai-limits' ? '−' : '+'}</span>
          </button>
          {expandedSection === 'ai-limits' && (
            <div className="section-content">
              <div className="ai-disclaimer">
                <p className="disclaimer-text">
                  <strong>CareCircle's AI is a helpful assistant—not a medical professional.</strong> 
                  It can notice patterns and flag concerns, but <em>you and your healthcare team</em> make all decisions.
                </p>
              </div>

              <div className="ai-grid">
                <div className="ai-card can-do">
                  <h4>✅ What AI CAN Do</h4>
                  <ul>
                    <li>Notice repeated mentions of symptoms (pain, dizziness, fatigue)</li>
                    <li>Detect mood changes over multiple conversations</li>
                    <li>Flag medication names and potential issues</li>
                    <li>Identify confusion or memory concerns</li>
                    <li>Suggest when a doctor visit might be helpful</li>
                    <li>Create tasks so nothing falls through the cracks</li>
                  </ul>
                </div>

                <div className="ai-card cannot-do">
                  <h4>❌ What AI CANNOT Do</h4>
                  <ul>
                    <li>Diagnose any medical condition</li>
                    <li>Prescribe or adjust medications</li>
                    <li>Replace a doctor, nurse, or medical advice</li>
                    <li>Guarantee it catches every issue</li>
                    <li>Understand sarcasm, jokes, or cultural context perfectly</li>
                    <li>Make decisions for your family</li>
                  </ul>
                </div>

                <div className="ai-card transparency">
                  <h4>🔍 How AI Transparency Works</h4>
                  <ul>
                    <li>Every alert shows a <strong>"Why?"</strong> button explaining what triggered it</li>
                    <li>You see the exact words that raised concern</li>
                    <li>Confidence levels are shown (high/medium/low)</li>
                    <li>You can dismiss any alert you disagree with</li>
                    <li>Your feedback helps improve accuracy over time</li>
                  </ul>
                </div>

                <div className="ai-card wrong">
                  <h4>🤔 What If AI Gets It Wrong?</h4>
                  <p>AI will make mistakes. Here's how we handle it:</p>
                  <ul>
                    <li><strong>False positives:</strong> AI may flag something that isn't concerning. Just dismiss it—no harm done.</li>
                    <li><strong>Missed concerns:</strong> AI won't catch everything. That's why human judgment matters.</li>
                    <li><strong>Misinterpretation:</strong> "I'm dying to try that restaurant" might trigger a flag. Review before acting.</li>
                    <li><strong>Your override:</strong> You can always dismiss, modify, or ignore AI suggestions.</li>
                  </ul>
                  <p className="safety-note">
                    <strong>Safety rule:</strong> When in doubt, call your elder or their doctor directly. AI is a backup, not a replacement for your instincts.
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Elder Experience - Address their perspective */}
        <section className={`about-section ${expandedSection === 'elder' ? 'expanded' : ''}`}>
          <button className="section-header" onClick={() => toggleSection('elder')}>
            <span className="section-icon">👵</span>
            <span className="section-title">Your Elder's Experience</span>
            <span className="section-toggle">{expandedSection === 'elder' ? '−' : '+'}</span>
          </button>
          {expandedSection === 'elder' && (
            <div className="section-content">
              <div className="elder-intro">
                <p>
                  We designed CareCircle to be <strong>invisible to your elder</strong> unless they want to be involved. 
                  They don't need to learn new technology or feel like they're being watched.
                </p>
              </div>

              <div className="elder-grid">
                <div className="elder-card">
                  <h4>📱 No App Required for Elders</h4>
                  <p>Your loved one doesn't need to:</p>
                  <ul>
                    <li>Install any app</li>
                    <li>Learn new technology</li>
                    <li>Remember passwords</li>
                    <li>Change how they use their phone</li>
                  </ul>
                  <p>They just talk to you like normal. You handle the technology.</p>
                </div>

                <div className="elder-card">
                  <h4>💬 Will They Feel Monitored?</h4>
                  <p>This depends on how you introduce it:</p>
                  <ul>
                    <li><strong>Don't say:</strong> "I'm recording you to check on you."</li>
                    <li><strong>Do say:</strong> "I'm using an app to help me remember what we talked about so I can help you better."</li>
                    <li>Frame it as <em>your memory aid</em>, not surveillance.</li>
                    <li>Emphasize it helps you be a better caregiver.</li>
                  </ul>
                </div>

                <div className="elder-card">
                  <h4>🚫 What If They Refuse?</h4>
                  <p>That's completely okay. Alternatives:</p>
                  <ul>
                    <li>Don't record—just use the task and coordination features</li>
                    <li>Take manual notes after calls</li>
                    <li>Ask if you can record "just this once" for important topics</li>
                    <li>Respect their autonomy—it's their choice</li>
                  </ul>
                </div>

                <div className="elder-card">
                  <h4>👁️ Can They See Alerts and Tasks?</h4>
                  <ul>
                    <li>By default, elders don't see alerts or tasks</li>
                    <li>You can choose to share specific information with them</li>
                    <li>Some families involve capable elders in their own care planning</li>
                    <li>It's your family's decision—we support both approaches</li>
                  </ul>
                </div>

                <div className="elder-card">
                  <h4>🗣️ Language and Accents</h4>
                  <p>Our AI works with:</p>
                  <ul>
                    <li>English (US, UK, Australian accents)</li>
                    <li>Spanish</li>
                    <li>Hindi</li>
                    <li>Mandarin Chinese</li>
                  </ul>
                  <p>Regional accents may reduce accuracy. If transcription looks wrong, you can edit it before analysis.</p>
                </div>

                <div className="elder-card">
                  <h4>👥 Multiple Elders</h4>
                  <ul>
                    <li>Yes, you can care for multiple elders in one account</li>
                    <li>Each elder has their own profile, medications, and history</li>
                    <li>Alerts and tasks are organized per person</li>
                    <li>Different family members can be assigned to different elders</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Family Dynamics */}
        <section className={`about-section ${expandedSection === 'family' ? 'expanded' : ''}`}>
          <button className="section-header" onClick={() => toggleSection('family')}>
            <span className="section-icon">👨‍👩‍👧‍👦</span>
            <span className="section-title">Family Dynamics & Coordination</span>
            <span className="section-toggle">{expandedSection === 'family' ? '−' : '+'}</span>
          </button>
          {expandedSection === 'family' && (
            <div className="section-content">
              <div className="family-intro">
                <p>
                  Real families are complex. Siblings disagree. Schedules conflict. 
                  Some people do more work than others. CareCircle helps—but can't solve family dynamics.
                </p>
              </div>

              <div className="family-grid">
                <div className="family-card">
                  <h4>⚖️ Who Makes Decisions?</h4>
                  <ul>
                    <li>CareCircle doesn't enforce authority—your family decides</li>
                    <li>Any family member can create, edit, or dismiss alerts</li>
                    <li>Tasks are suggestions, not mandates</li>
                    <li>We recommend designating a "primary coordinator" in your family</li>
                    <li>Medical POA should be noted in elder's profile</li>
                  </ul>
                </div>

                <div className="family-card">
                  <h4>🤝 What If We Disagree?</h4>
                  <p>CareCircle provides transparency, not resolution:</p>
                  <ul>
                    <li>Everyone sees the same alerts and data</li>
                    <li>Timeline shows who did what and when</li>
                    <li>Comments can be added to tasks for discussion</li>
                    <li>For serious disagreements, involve a care manager or mediator</li>
                  </ul>
                </div>

                <div className="family-card">
                  <h4>🔒 Can I Restrict Access?</h4>
                  <ul>
                    <li>Currently, all family members see all data</li>
                    <li>You can choose who to add (don't add someone you don't trust)</li>
                    <li>You can remove family members at any time</li>
                    <li>Future update: Role-based permissions (viewer vs. editor)</li>
                  </ul>
                </div>

                <div className="family-card">
                  <h4>📋 Are Tasks Mandatory?</h4>
                  <ul>
                    <li>No. Tasks are suggestions and requests.</li>
                    <li>Assigned person can decline or reassign</li>
                    <li>Overdue tasks escalate to next available person</li>
                    <li>If no one completes a task, it stays visible as overdue</li>
                    <li>The app can't force anyone to do anything</li>
                  </ul>
                </div>

                <div className="family-card">
                  <h4>⚠️ What If Someone Misuses It?</h4>
                  <p>Potential misuse scenarios:</p>
                  <ul>
                    <li><strong>Overbearing sibling:</strong> Uses alerts to criticize others. → Have a family conversation.</li>
                    <li><strong>Absent relative:</strong> Creates tasks but never helps. → Track workload in Analytics.</li>
                    <li><strong>Control issues:</strong> Uses the app to micromanage. → Consider removing their access.</li>
                  </ul>
                  <p>CareCircle is a tool. Family relationships require human work.</p>
                </div>

                <div className="family-card">
                  <h4>📊 Preventing Caregiver Burnout</h4>
                  <ul>
                    <li>Analytics shows tasks per person per week</li>
                    <li>Identify if one person is overloaded</li>
                    <li>Night alert duty should rotate</li>
                    <li>Use this data to have fair-share conversations</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Emergency Procedures */}
        <section className={`about-section ${expandedSection === 'emergency' ? 'expanded' : ''}`}>
          <button className="section-header emergency" onClick={() => toggleSection('emergency')}>
            <span className="section-icon">🚨</span>
            <span className="section-title">Emergency Procedures</span>
            <span className="section-toggle">{expandedSection === 'emergency' ? '−' : '+'}</span>
          </button>
          {expandedSection === 'emergency' && (
            <div className="section-content emergency-content">
              <div className="emergency-banner">
                <p><strong>If someone is in immediate danger, call 911 first. Always.</strong></p>
                <p>CareCircle does NOT automatically call 911 or emergency services.</p>
              </div>

              <div className="emergency-grid">
                <div className="emergency-card">
                  <h4>🆘 What Qualifies as an Emergency?</h4>
                  <p>CareCircle flags these as urgent:</p>
                  <ul>
                    <li>Falls with potential injury</li>
                    <li>Chest pain or difficulty breathing</li>
                    <li>Sudden confusion or unresponsiveness</li>
                    <li>Severe bleeding or injury</li>
                    <li>Suicidal ideation or safety threats</li>
                  </ul>
                  <p>But <strong>you decide</strong> what's truly an emergency.</p>
                </div>

                <div className="emergency-card">
                  <h4>📞 Does AI Escalate Automatically?</h4>
                  <ul>
                    <li><strong>No.</strong> CareCircle never calls 911 automatically.</li>
                    <li>We create alerts and notify family members</li>
                    <li>The decision to call emergency services is always yours</li>
                    <li>Triage protocols guide you, but you take action</li>
                  </ul>
                </div>

                <div className="emergency-card">
                  <h4>🗺️ How Emergency Features Work</h4>
                  <ol>
                    <li>Go to <Link to="/emergency">Emergency Hub</Link></li>
                    <li>For life-threatening: Tap <strong>Call 911</strong> (dials your phone)</li>
                    <li>For guidance: Use <strong>Triage Protocol</strong>
                      <ul>
                        <li>Answer simple questions</li>
                        <li>Get a call script for 911 with all context</li>
                        <li>Includes elder's medications and conditions</li>
                      </ul>
                    </li>
                    <li>Tap <strong>Alert Nearby Caregiver</strong> to send help</li>
                  </ol>
                </div>

                <div className="emergency-card">
                  <h4>💊 Casual Mentions of Pain</h4>
                  <p>If your elder casually says "my back hurts":</p>
                  <ul>
                    <li>AI might flag it, but at low/medium severity</li>
                    <li>It won't trigger emergency escalation</li>
                    <li>Repeated mentions increase severity over time</li>
                    <li>You review and decide if action is needed</li>
                  </ul>
                </div>

                <div className="emergency-card">
                  <h4>👥 Who Gets Notified?</h4>
                  <ul>
                    <li>Urgent alerts notify all active family members</li>
                    <li>You can set primary emergency contact in elder's profile</li>
                    <li>Notifications go via app, email, and SMS (if configured)</li>
                    <li>You can customize notification preferences in Settings</li>
                  </ul>
                </div>

                <div className="emergency-card">
                  <h4>⚙️ Can I Customize Emergency Rules?</h4>
                  <ul>
                    <li>Yes—in elder's profile under "Emergency Preferences"</li>
                    <li>Set primary emergency contact</li>
                    <li>Add neighbor or local friend for fast response</li>
                    <li>Note any DNR or advanced directive</li>
                    <li>Specify hospital preferences</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* How the App Works */}
        <section className={`about-section ${expandedSection === 'flow' ? 'expanded' : ''}`}>
          <button className="section-header" onClick={() => toggleSection('flow')}>
            <span className="section-icon">🔄</span>
            <span className="section-title">How the App Works (Step by Step)</span>
            <span className="section-toggle">{expandedSection === 'flow' ? '−' : '+'}</span>
          </button>
          {expandedSection === 'flow' && (
            <div className="section-content">
              <div className="flow-diagram">
                <div className="flow-step">
                  <div className="step-number">1</div>
                  <div className="step-content">
                    <h4>👨‍👩‍👧‍👦 Set Up Your Family</h4>
                    <p>Go to <Link to="/family">Family Circle</Link> and add:</p>
                    <ul>
                      <li><strong>Elders</strong> — with their medications, allergies, conditions</li>
                      <li><strong>Caregivers</strong> — with their skills and availability</li>
                    </ul>
                  </div>
                </div>

                <div className="flow-arrow">↓</div>

                <div className="flow-step">
                  <div className="step-number">2</div>
                  <div className="step-content">
                    <h4>📞 Record a Call (Your Choice)</h4>
                    <p>Go to <Link to="/call">Call Elder</Link> and press <strong>Start Recording</strong>.</p>
                    <ul>
                      <li>Recording uses your device's microphone</li>
                      <li>Real-time transcription shows what's being said</li>
                      <li>Stop anytime—you control the recording</li>
                    </ul>
                  </div>
                </div>

                <div className="flow-arrow">↓</div>

                <div className="flow-step">
                  <div className="step-number">3</div>
                  <div className="step-content">
                    <h4>🤖 AI Analysis (You Trigger It)</h4>
                    <p>Click <strong>Analyze with AI</strong> to have the system:</p>
                    <ul>
                      <li>Look for health concerns in the conversation</li>
                      <li>Compare against known medications and conditions</li>
                      <li>Generate suggestions with confidence levels</li>
                    </ul>
                    <p className="note">You can edit the transcript before analysis if needed.</p>
                  </div>
                </div>

                <div className="flow-arrow">↓</div>

                <div className="flow-step">
                  <div className="step-number">4</div>
                  <div className="step-content">
                    <h4>🚨 Review Alerts (You Decide)</h4>
                    <p>Alerts appear in <Link to="/alerts">Alerts</Link>:</p>
                    <ul>
                      <li>Each shows severity and a "Why?" explanation</li>
                      <li>You can dismiss, snooze, or take action</li>
                      <li><strong>You are always in control</strong></li>
                    </ul>
                  </div>
                </div>

                <div className="flow-arrow">↓</div>

                <div className="flow-step">
                  <div className="step-number">5</div>
                  <div className="step-content">
                    <h4>✅ Create Tasks (Optional)</h4>
                    <p>If you want to act on an alert:</p>
                    <ul>
                      <li>Create a task for yourself or another family member</li>
                      <li>AI suggests who might be best suited</li>
                      <li>You can override and assign anyone</li>
                    </ul>
                  </div>
                </div>

                <div className="flow-arrow">↓</div>

                <div className="flow-step">
                  <div className="step-number">6</div>
                  <div className="step-content">
                    <h4>📋 Complete Tasks & Document</h4>
                    <p>When finishing a task, record the outcome:</p>
                    <ul>
                      <li><strong>Success</strong> — task completed well</li>
                      <li><strong>Partial</strong> — some issues, may need follow-up</li>
                      <li><strong>Failed</strong> — couldn't complete, auto-creates follow-up</li>
                    </ul>
                    <p>This creates an audit trail for doctor visits.</p>
                  </div>
                </div>

                <div className="flow-arrow">↓</div>

                <div className="flow-step">
                  <div className="step-number">7</div>
                  <div className="step-content">
                    <h4>📈 Track Progress Over Time</h4>
                    <p>See trends in <Link to="/analytics">Analytics</Link>:</p>
                    <ul>
                      <li>Are alerts decreasing? (care is working!)</li>
                      <li>Who's doing the most work? (prevent burnout)</li>
                      <li>Export reports for doctor appointments</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Navigation Guide */}
        <section className={`about-section ${expandedSection === 'navigation' ? 'expanded' : ''}`}>
          <button className="section-header" onClick={() => toggleSection('navigation')}>
            <span className="section-icon">🗺️</span>
            <span className="section-title">Navigation Guide</span>
            <span className="section-toggle">{expandedSection === 'navigation' ? '−' : '+'}</span>
          </button>
          {expandedSection === 'navigation' && (
            <div className="section-content">
              <div className="nav-guide">
                <div className="nav-item-guide">
                  <Link to="/" className="nav-link-guide">
                    <span className="nav-icon-guide">🏠</span>
                    <div className="nav-info-guide">
                      <h4>Dashboard</h4>
                      <p>Today's summary: risk level, active alerts, pending tasks, family status.</p>
                    </div>
                  </Link>
                </div>

                <div className="nav-item-guide">
                  <Link to="/alerts" className="nav-link-guide">
                    <span className="nav-icon-guide">🚨</span>
                    <div className="nav-info-guide">
                      <h4>Alerts</h4>
                      <p>Health concerns detected. Each has a "Why?" button explaining the reasoning.</p>
                    </div>
                  </Link>
                </div>

                <div className="nav-item-guide">
                  <Link to="/actions" className="nav-link-guide">
                    <span className="nav-icon-guide">🎯</span>
                    <div className="nav-info-guide">
                      <h4>Care Actions</h4>
                      <p>Tasks assigned to family. Check daily, complete checklists, record outcomes.</p>
                    </div>
                  </Link>
                </div>

                <div className="nav-item-guide">
                  <Link to="/medications" className="nav-link-guide">
                    <span className="nav-icon-guide">💊</span>
                    <div className="nav-info-guide">
                      <h4>Medications</h4>
                      <p>Track schedules, reminders, adherence. See missed doses and refill needs.</p>
                    </div>
                  </Link>
                </div>

                <div className="nav-item-guide">
                  <Link to="/emergency" className="nav-link-guide urgent">
                    <span className="nav-icon-guide">🆘</span>
                    <div className="nav-info-guide">
                      <h4>Emergency</h4>
                      <p>Quick 911 access, emergency contacts, guided triage protocols.</p>
                    </div>
                  </Link>
                </div>

                <div className="nav-item-guide">
                  <Link to="/family" className="nav-link-guide">
                    <span className="nav-icon-guide">👨‍👩‍👧‍👦</span>
                    <div className="nav-info-guide">
                      <h4>Family Circle</h4>
                      <p>Manage elders (health info) and caregivers (skills). Core data for AI.</p>
                    </div>
                  </Link>
                </div>

                <div className="nav-item-guide">
                  <Link to="/history" className="nav-link-guide">
                    <span className="nav-icon-guide">📋</span>
                    <div className="nav-info-guide">
                      <h4>Care History</h4>
                      <p>Immutable timeline of all events. Export for doctor visits.</p>
                    </div>
                  </Link>
                </div>

                <div className="nav-item-guide">
                  <Link to="/analytics" className="nav-link-guide">
                    <span className="nav-icon-guide">📈</span>
                    <div className="nav-info-guide">
                      <h4>Analytics</h4>
                      <p>Trends, workload distribution, task completion rates.</p>
                    </div>
                  </Link>
                </div>

                <div className="nav-item-guide">
                  <Link to="/call" className="nav-link-guide primary">
                    <span className="nav-icon-guide">📞</span>
                    <div className="nav-info-guide">
                      <h4>Call Elder</h4>
                      <p>Record conversations and get AI insights. Start here daily!</p>
                    </div>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* What Can Go Wrong */}
        <section className={`about-section ${expandedSection === 'failures' ? 'expanded' : ''}`}>
          <button className="section-header" onClick={() => toggleSection('failures')}>
            <span className="section-icon">⚠️</span>
            <span className="section-title">What Can Go Wrong (Honest Answers)</span>
            <span className="section-toggle">{expandedSection === 'failures' ? '−' : '+'}</span>
          </button>
          {expandedSection === 'failures' && (
            <div className="section-content">
              <p className="section-intro">
                Every system has limitations. Here's what can go wrong and what to do about it.
              </p>

              <div className="failure-grid">
                <div className="failure-card">
                  <h4>🤖 AI Misses Something Important</h4>
                  <p><strong>What happens:</strong> The AI doesn't flag a real health concern.</p>
                  <p><strong>Why:</strong> AI isn't perfect. It may miss subtle cues, understand context incorrectly, or not recognize rare conditions.</p>
                  <p><strong>What to do:</strong> Trust your instincts. If something feels wrong, act on it regardless of what the app says. CareCircle is a backup, not your only tool.</p>
                </div>

                <div className="failure-card">
                  <h4>🔔 Too Many False Alerts</h4>
                  <p><strong>What happens:</strong> AI flags things that aren't actually concerning.</p>
                  <p><strong>Why:</strong> Without enough history, AI errs on the side of caution. It may also misinterpret jokes or sarcasm.</p>
                  <p><strong>What to do:</strong> Dismiss false alerts using the feedback button. Over time, AI learns your elder's patterns. Usually improves after 2-3 weeks.</p>
                </div>

                <div className="failure-card">
                  <h4>📶 Internet Goes Down During Call</h4>
                  <p><strong>What happens:</strong> Recording may be interrupted or not saved.</p>
                  <p><strong>Why:</strong> Real-time transcription requires internet connection.</p>
                  <p><strong>What to do:</strong> Recording is saved locally until upload completes. If lost, just take manual notes and try again next time.</p>
                </div>

                <div className="failure-card">
                  <h4>🎙️ Forgot to Record</h4>
                  <p><strong>What happens:</strong> You had an important call but didn't record it.</p>
                  <p><strong>Why:</strong> Recording is always opt-in—it never happens automatically.</p>
                  <p><strong>What to do:</strong> Write down what you remember. Create manual alerts if needed. Set a reminder for next time.</p>
                </div>

                <div className="failure-card">
                  <h4>🗣️ Accent Not Understood</h4>
                  <p><strong>What happens:</strong> Transcription is inaccurate.</p>
                  <p><strong>Why:</strong> Speech recognition works better with standard accents.</p>
                  <p><strong>What to do:</strong> Edit the transcript before analysis. Over time, you'll learn which phrases need correction.</p>
                </div>

                <div className="failure-card">
                  <h4>👨‍👩‍👧 Family Drama</h4>
                  <p><strong>What happens:</strong> Someone uses CareCircle to criticize or control others.</p>
                  <p><strong>Why:</strong> Technology can't fix family relationships.</p>
                  <p><strong>What to do:</strong> Have honest conversations. Remove access if needed. Consider involving a neutral care manager.</p>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Tips for Success */}
        <section className={`about-section ${expandedSection === 'tips' ? 'expanded' : ''}`}>
          <button className="section-header" onClick={() => toggleSection('tips')}>
            <span className="section-icon">💡</span>
            <span className="section-title">Tips for Success</span>
            <span className="section-toggle">{expandedSection === 'tips' ? '−' : '+'}</span>
          </button>
          {expandedSection === 'tips' && (
            <div className="section-content">
              <div className="tips-grid">
                <div className="tip-card">
                  <span className="tip-icon">📅</span>
                  <h4>Daily Routine (5 min)</h4>
                  <ol>
                    <li>Check Dashboard</li>
                    <li>Review new alerts</li>
                    <li>Complete your tasks</li>
                    <li>Make a quick call if needed</li>
                  </ol>
                </div>

                <div className="tip-card">
                  <span className="tip-icon">📊</span>
                  <h4>Understanding Scores</h4>
                  <ul>
                    <li><span className="score-green">0-39</span> = Low risk</li>
                    <li><span className="score-yellow">40-59</span> = Moderate</li>
                    <li><span className="score-orange">60-79</span> = High</li>
                    <li><span className="score-red">80+</span> = Critical</li>
                  </ul>
                </div>

                <div className="tip-card">
                  <span className="tip-icon">📈</span>
                  <h4>Trend Arrows</h4>
                  <ul>
                    <li><span className="trend-down">↓</span> Improving</li>
                    <li><span className="trend-stable">→</span> Stable</li>
                    <li><span className="trend-up">↑</span> Needs attention</li>
                  </ul>
                </div>

                <div className="tip-card">
                  <span className="tip-icon">🩺</span>
                  <h4>Doctor Visits</h4>
                  <ul>
                    <li>Export Care History before appointments</li>
                    <li>Shows medications, symptoms, patterns</li>
                    <li>Doctors appreciate having this data</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Troubleshooting */}
        <section className={`about-section ${expandedSection === 'troubleshooting' ? 'expanded' : ''}`}>
          <button className="section-header" onClick={() => toggleSection('troubleshooting')}>
            <span className="section-icon">🔧</span>
            <span className="section-title">Troubleshooting</span>
            <span className="section-toggle">{expandedSection === 'troubleshooting' ? '−' : '+'}</span>
          </button>
          {expandedSection === 'troubleshooting' && (
            <div className="section-content">
              <div className="faq-list">
                <div className="faq-item">
                  <h4>Recording not working?</h4>
                  <p>Check browser microphone permissions. Go to Settings → Privacy → Microphone. Chrome and Edge work best.</p>
                </div>

                <div className="faq-item">
                  <h4>AI analysis failing?</h4>
                  <p>This requires backend to be running. If you see "Failed to analyze," the AWS service may be down. Try again in a few minutes.</p>
                </div>

                <div className="faq-item">
                  <h4>No alerts appearing?</h4>
                  <p>Could be good! Means no concerns detected. AI needs 2-3 calls to establish patterns.</p>
                </div>

                <div className="faq-item">
                  <h4>Need more help?</h4>
                  <p>Email <strong>support@carecircle.com</strong> — we respond within 24 hours.</p>
                </div>
              </div>
            </div>
          )}
        </section>

      </div>

      {/* Footer */}
      <div className="about-footer">
        <p><strong>CareCircle</strong> — Prevent Failure. Reduce Burden.</p>
        <p className="footer-links">
          <Link to="/">Dashboard</Link>
          <span>•</span>
          <Link to="/family">Set Up Family</Link>
          <span>•</span>
          <Link to="/call">Make a Call</Link>
        </p>
      </div>
    </div>
  );
}

export default About;
