# Requirements Document

## Introduction

The Care Operations Console transforms CareCircle from an "insight dashboard" to a true "care operations console" that enforces end-to-end triage → action plan → confirmation → follow-up workflows. This addresses the critical gap where caregivers receive alerts and recommendations but lack structured protocols to safely and effectively respond to urgent situations.

## Glossary

- **Care_Operations_Console**: The primary dashboard interface that manages all caregiving workflows
- **Urgent_Triage_Protocol**: A 4-step guided workflow for handling urgent alerts (fall, injury, medical emergency)
- **Care_Queue**: Unified operational queue that merges alerts, tasks, and scheduled check-ins
- **Risk_Card**: AI-powered health risk assessment with actionable CTAs and trend analysis
- **Outcome_Capture**: Required documentation of actions taken and results achieved
- **Family_Circle**: Multi-user caregiver network with role-based assignment and escalation
- **Timeline_Entry**: Immutable audit log of all care events and outcomes
- **Stress_Mode**: Simplified UI for high-pressure urgent situations

## Requirements

### Requirement 1: Urgent Triage Protocol

**User Story:** As a family caregiver, I want a structured protocol for urgent alerts, so that I can respond safely and effectively to emergencies like falls or injuries.

#### Acceptance Criteria

1. WHEN an urgent alert appears (severity: urgent/high), THE Care_Operations_Console SHALL display a prominent "Take Action" button that opens the Urgent Triage Protocol
2. WHEN the Urgent Triage Protocol starts, THE System SHALL present Step 1: Immediate Safety Check with two critical questions: "Is the elder conscious and breathing normally?" and "Is there severe bleeding, head injury, or inability to move?"
3. WHEN safety concerns are identified, THE System SHALL provide a primary "Call Emergency Services Now" button with one-tap 911 dialing
4. WHEN proceeding to assessment, THE System SHALL guide through Step 2: Rapid Assessment collecting pain severity (0-10), location, mobility, medications, and head injury status
5. WHEN assessment is complete, THE System SHALL generate Step 3: Recommended Action Plan stating "Call 911" vs "Urgent care" vs "Call nurse line" vs "Monitor" with call scripts
6. WHEN action is taken, THE System SHALL require Step 4: Confirmation + Evidence with outcome selection, notes, photos, and automatic follow-up task creation
7. THE System SHALL create an immutable Timeline_Entry for the complete triage workflow with timestamps and outcomes

### Requirement 2: Unified Care Queue

**User Story:** As a family caregiver, I want all my care responsibilities in one prioritized queue, so that I can efficiently manage alerts, tasks, and check-ins without cognitive overload.

#### Acceptance Criteria

1. THE Care_Operations_Console SHALL display a unified "Today's Care Queue" that merges alerts, tasks, scheduled check-ins, and medication events
2. WHEN displaying queue items, THE System SHALL show severity (Urgent/High/Medium/Low), due time, owner, and suggested next step for each item
3. THE System SHALL provide filters: Urgent, Due Today, Assigned to Me, Medication, Cognitive, Safety
4. WHEN queue items are created, THE System SHALL assign statuses: New → In Progress → Completed → Snoozed → Escalated
5. THE System SHALL sort the queue by severity first, then due time, ensuring urgent items always appear at the top
6. WHEN a queue item is completed, THE System SHALL require outcome capture before marking complete
7. THE System SHALL automatically escalate overdue high-priority items after defined time thresholds

### Requirement 3: Actionable Risk Cards

**User Story:** As a family caregiver, I want AI risk assessments with clear next steps, so that I can take preventive action based on health trends.

#### Acceptance Criteria

1. THE Risk_Card SHALL display normalized scores (0-100) with trend indicators and confidence levels
2. WHEN displaying cognitive risk, THE Risk_Card SHALL show primary CTA "Run 2-min Check-in Call" with estimated time
3. WHEN displaying medication adherence risk, THE Risk_Card SHALL show primary CTA "Verify Today's Doses" with checklist access
4. WHEN displaying emotional wellbeing risk, THE Risk_Card SHALL show primary CTA "Schedule Social Touchpoint" with family notification
5. THE Risk_Card SHALL show "What changed" before "Why" with delta information: "Up 8% since last week because..."
6. THE Risk_Card SHALL display data coverage: "High confidence based on X conversations over Y days"
7. THE Risk_Card SHALL include safety disclaimer: "Not a diagnosis. Use as an early signal for professional consultation"

### Requirement 4: Role-Based Assignment and Escalation

**User Story:** As a family caregiver, I want to assign tasks to appropriate family members and escalate when needed, so that care responsibilities are distributed effectively across our family circle.

#### Acceptance Criteria

1. WHEN creating or viewing alerts and tasks, THE System SHALL provide "Assign to" dropdown with Family_Circle members
2. WHEN assigning tasks, THE System SHALL consider proximity (ZIP code), skills (medical, transportation), and availability
3. THE System SHALL provide "Escalate to" option for transferring responsibility to another family member or professional caregiver
4. WHEN escalating, THE System SHALL notify the new assignee and provide full context including previous actions taken
5. THE System SHALL support "On-call" scheduling in Family_Circle for rotating primary caregiver responsibilities
6. THE System SHALL track assignment history and workload distribution across family members
7. WHEN assignments are overdue, THE System SHALL automatically suggest escalation to available family members

### Requirement 5: Outcome Tracking and Audit Trail

**User Story:** As a family caregiver, I want to document outcomes of all care actions, so that I have a complete audit trail for medical professionals and family coordination.

#### Acceptance Criteria

1. WHEN completing any task or alert response, THE System SHALL require outcome selection from predefined options plus optional notes
2. THE System SHALL capture timestamps, actions taken, results achieved, and next steps for every care event
3. WHEN outcomes indicate unresolved issues, THE System SHALL automatically create follow-up tasks with appropriate due dates
4. THE System SHALL maintain an immutable Timeline_Entry for every care event that cannot be edited after creation
5. THE System SHALL provide outcome templates for common scenarios: medication verification, safety checks, medical appointments
6. WHEN multiple family members are involved, THE System SHALL track who did what and when in the audit trail
7. THE System SHALL generate exportable care reports for medical professionals including outcome summaries and trend analysis

### Requirement 6: Task Schema Enhancement

**User Story:** As a family caregiver, I want tasks with clear expectations and completion criteria, so that I know exactly what needs to be done and when.

#### Acceptance Criteria

1. WHEN creating tasks, THE System SHALL require due date/time, estimated completion time (5 min, 15 min, 30 min, 1 hour), and definition of done checklist
2. THE System SHALL provide task templates for common care activities: medication verification, safety checks, appointment scheduling
3. WHEN tasks are overdue, THE System SHALL automatically suggest escalation options and notify relevant family members
4. THE System SHALL track task completion rates and average completion times for workload planning
5. WHEN marking tasks complete, THE System SHALL require minimal outcome capture: success/partial/failed plus brief notes
6. THE System SHALL automatically create follow-up tasks based on outcomes: failed medication check → schedule doctor consultation
7. THE System SHALL provide task analytics: completion rates, average response times, and caregiver workload distribution

### Requirement 7: Stress Mode Interface

**User Story:** As a family caregiver in an emergency situation, I want a simplified interface with larger buttons and fewer options, so that I can act quickly under stress.

#### Acceptance Criteria

1. THE System SHALL provide a "Stress Mode" toggle that simplifies the interface for urgent situations
2. WHEN Stress Mode is active, THE System SHALL display larger text, bigger buttons, and reduced menu options
3. THE System SHALL prominently display emergency contact buttons and 911 calling functionality
4. WHEN in Stress Mode, THE System SHALL use consistent button labels avoiding variations like "Take Action Now" vs "Take Action"
5. THE System SHALL provide voice guidance for critical steps in Stress Mode
6. THE System SHALL automatically suggest Stress Mode when urgent alerts are detected
7. THE System SHALL maintain full functionality while reducing cognitive load through simplified navigation

### Requirement 8: Navigation and Information Architecture

**User Story:** As a family caregiver, I want clear, consistent navigation that reduces duplication and uses familiar terminology, so that I can quickly find what I need.

#### Acceptance Criteria

1. THE System SHALL use consistent terminology: "Tasks" (not "Care Actions"), "Timeline" (not "Care History")
2. THE Primary Navigation SHALL include: Dashboard, Today (Queue), Call, Medications, Family, Timeline, Analytics, Reports, Settings
3. THE System SHALL eliminate navigation duplication between dashboard sections and main navigation
4. WHEN users access "Today" from navigation, THE System SHALL display the unified Care Queue
5. THE System SHALL merge historical care events into a single "Timeline" view with filtering options
6. THE System SHALL reserve "Reports" for exportable summaries (doctor visits, insurance, family summaries)
7. THE System SHALL provide breadcrumb navigation for multi-step workflows like Urgent Triage Protocol

### Requirement 9: Analytics and Outcome Metrics

**User Story:** As a family caregiver and care coordinator, I want to measure the effectiveness of our care coordination, so that I can identify improvements and demonstrate value to medical professionals.

#### Acceptance Criteria

1. THE Analytics Dashboard SHALL track operational metrics: time-to-triage for urgent alerts, percentage of alerts closed with documented outcomes
2. THE System SHALL measure care quality metrics: missed medication events per week, repeat falls, safety checklist completion rates
3. THE System SHALL track caregiver burden indicators: tasks per week per family member, night alerts, workload distribution
4. THE System SHALL provide trend analysis showing improvement or deterioration in key health and operational metrics
5. THE System SHALL generate exportable reports for medical professionals including outcome summaries and intervention effectiveness
6. THE System SHALL display both health metrics (cognitive trends, medication adherence) and operations metrics (queue performance, response times)
7. THE System SHALL provide family-level analytics showing coordination effectiveness and individual caregiver contributions

### Requirement 10: Domain Model Standardization

**User Story:** As a system architect, I want a consistent domain model that supports operational workflows, so that the system can scale and integrate with external healthcare systems.

#### Acceptance Criteria

1. THE System SHALL maintain core entities: Person (elder, caregiver), Event (conversation, fall, medication), Signal (AI risk score), Alert (severity, protocol), Task (workflow step), Plan (multi-step care plan), Timeline_Entry (audit log)
2. WHEN Alerts are created, THE System SHALL spawn either a Plan (urgent/high severity) or a Task (medium/low severity) or a Monitor rule with scheduled check-ins
3. THE System SHALL ensure every Plan and Task writes back to Timeline with outcomes and timestamps
4. THE System SHALL drive notifications from Queue items and due dates, not just alert creation
5. THE System SHALL maintain referential integrity between entities: Tasks reference Alerts, Timeline_Entries reference Plans/Tasks
6. THE System SHALL support immutable audit trails where Timeline_Entries cannot be modified after creation
7. THE System SHALL provide APIs for integration with external systems: EHR, pharmacy, medical devices, emergency services