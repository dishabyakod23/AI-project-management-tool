# CLAUDE.md
# AI Project Management Tool — 3-Day GenAI / Agentic AI Assessment

> **IMPORTANT:** This file is the implementation source of truth for Claude Code.
> Read the complete file before making implementation decisions.

---

# 1. Assessment Context

This project is being developed as part of a **3-day GenAI / Agentic AI office assessment/competition**.

The selected project is:

> **AI Project Management Tool**

The concept is a very small Jira/Asana-style project management application.

The assessment is intended to evaluate both software engineering and AI engineering ability. The goal is **not** to build a huge production-grade Jira clone. The goal is to deliver a polished, functional, demonstrable prototype with:

- Working frontend
- Working backend
- Persistent database
- Meaningful AI capabilities
- Good validation
- Error handling
- Testing
- Grounded AI responses
- Clear architecture
- A workflow that can be explained during the final review

The official assessment emphasizes that Claude-assisted coding is allowed, but the developer must understand and be able to explain the solution and demonstrate ownership of the implementation.

Therefore:

**Do not build something unnecessarily complex that cannot be explained or demonstrated.**

Prioritize a small, complete, reliable product over a large unfinished product.

---

# 2. Primary Goal

Build a functional AI-powered project management application where:

1. Project Managers can create and manage projects.
2. Team Members can work on assigned tasks.
3. Tasks can be managed through a Kanban-style workflow.
4. Dashboard metrics reflect real project data.
5. AI converts natural-language requirements into structured task suggestions.
6. Project Managers can review and approve AI-generated tasks.
7. AI analyzes actual project data and provides project health/risk analysis.
8. An agentic workflow can propose project changes and execute them only after explicit approval.
9. The complete system is tested as a real application.

---

# 3. Mandatory Technology Stack

## Frontend

Use:

- Next.js
- TypeScript
- React

Use TypeScript for all new frontend code.

The frontend must communicate with the backend through APIs.

## Backend

Use:

- Python
- FastAPI
- Pydantic
- REST APIs

The backend is responsible for:

- Authentication
- Authorization
- Business logic
- Input validation
- Database access
- AI integration
- Dashboard calculations
- Agentic workflows
- Notifications
- Error handling
- AI observability/logging

## Database

Use:

- PostgreSQL

PostgreSQL must be the persistent source of truth.

Do not use:

- In-memory arrays as persistent storage
- JSON files as the application database
- Hardcoded dashboard numbers
- Fake task data for actual functionality

Use proper:

- Primary keys
- Foreign keys
- Constraints
- Indexes where appropriate
- Timestamps
- Relationships
- Database migrations

## High-Level Architecture

```text
                 ┌─────────────────────┐
                 │ Next.js + TypeScript│
                 │      Frontend       │
                 └──────────┬──────────┘
                            │
                         REST API
                            │
                 ┌──────────▼──────────┐
                 │ Python + FastAPI    │
                 │      Backend        │
                 └─────┬────────┬──────┘
                       │        │
                ┌──────▼───┐ ┌──▼────────────┐
                │PostgreSQL│ │ Claude / AI   │
                │ Database │ │ Provider      │
                └──────────┘ └───────────────┘
```

AI API keys must remain on the backend.

---

# 4. Claude Code Development Rules

## Before Coding

First inspect the repository.

Inspect:

- Existing folder structure
- Existing frontend
- Existing backend
- Package managers
- Dependencies
- Environment variables
- Database configuration
- Existing API routes
- Existing components
- Existing tests
- Build scripts
- Lint/type-check scripts
- README
- Docker configuration if present

Do not immediately rewrite the project.

First understand what already exists.

Then provide a concise implementation plan.

---

# 5. Do Not Over-Engineer

This is a 3-day assessment.

Do not introduce unnecessary:

- Microservices
- Complex event systems
- Overly complicated state management
- Excessive abstractions
- Infrastructure
- Deployment systems
- Unnecessary third-party services

Prefer:

```text
Simple
Reliable
Understandable
Testable
Demonstrable
```

over:

```text
Complex
Over-engineered
Hard to explain
Incomplete
```

---

# 6. User Roles

## Project Manager

Can:

- Create projects
- Edit projects
- Add/remove team members
- Create tasks
- Edit tasks
- Delete tasks
- Assign/reassign tasks
- View project progress
- View dashboard
- Use AI Project Assistant
- Review AI-generated tasks
- Edit AI suggestions
- Approve AI suggestions
- Generate project health analysis
- Review agentic proposals
- Approve/reject agentic actions
- Receive notifications

## Team Member

Can:

- View projects they belong to
- View assigned tasks
- View task details
- Update permitted task information
- Update task status
- Use permitted AI functionality

## Authorization

Permissions must be enforced by the backend.

Do not rely only on hiding buttons in the frontend.

---

# 7. Main Screens

Implement:

1. Dashboard
2. Projects
3. Project Details
4. Task Board
5. Task Details
6. AI Project Assistant

The UI should be:

- Clean
- Modern
- Responsive
- Consistent
- Easy to understand
- Suitable for a professional demo

---

# 8. Project Management

A Project Manager can create a project with:

- Project name
- Description
- Start date
- End date
- Team members

Validate:

- Required fields
- Valid dates
- End date cannot be before start date
- Team members must exist
- User must have permission to create/edit the project

Project Details should show:

- Project name
- Description
- Start date
- End date
- Team members
- Overall progress
- Task statistics
- Task board
- Project health
- AI recommendations

---

# 9. Tasks

Each task contains:

- Title
- Description
- Owner
- Priority
- Start date
- Due date
- Status

Statuses must be:

```text
To Do
In Progress
Testing
Completed
```

Main workflow:

```text
To Do → In Progress → Testing → Completed
```

Validate:

- Title
- Owner
- Priority
- Status
- Dates
- Due date cannot be before start date
- Owner must be a valid project member
- User must have permission to modify the task

---

# 10. Task Board

Create four columns:

```text
To Do | In Progress | Testing | Completed
```

Drag-and-drop is optional.

If implemented:

1. Change UI state.
2. Send update to backend.
3. Persist to PostgreSQL.
4. Confirm success.
5. Handle failure.
6. Revert UI state if persistence fails.

Refreshing the page must preserve the database state.

---

# 11. Dashboard

Display:

- Total tasks
- Completed
- In Progress
- Delayed
- Due this week

Definitions:

### Completed

Task status is `Completed`.

### In Progress

Task status is `In Progress`.

### Delayed

Due date has passed and task is not completed.

### Due This Week

Due date falls within the current defined week and task is not completed, where applicable.

Calculate these using backend/database logic.

Do not ask AI to calculate basic statistics.

Do not hardcode these numbers.

---

# 12. Important AI Architecture Principle

Do not use AI for deterministic application logic.

Use normal backend/database logic for:

- Task counts
- Overdue calculations
- Due-this-week calculations
- Completion percentages
- Permission checks
- Authentication
- Status transitions
- Database writes
- Validation
- Business rules

Use AI where reasoning/language understanding adds real value:

- Requirement decomposition
- Task generation
- Risk analysis
- Project health reasoning
- Natural-language project questions
- Agent planning
- Recommendations

This separation must be reflected in the architecture.

---

# 13. AI Capability #1 — Requirement → Tasks

This is a primary feature and should be one of the strongest parts of the demo.

PM enters:

> Build customer registration with email OTP and forgot password functionality.

Claude should generate structured task suggestions such as:

- User registration UI
- Registration API
- OTP generation
- OTP validation
- Forgot password
- Reset password
- Testing tasks

AI may also suggest:

- Description
- Priority
- Suggested owner role
- Estimated effort
- Suggested dates
- Dependencies
- Acceptance criteria
- Testing requirements

---

# 14. Structured AI Output

Prefer structured JSON/schema output rather than free-form text.

Example:

```json
{
  "tasks": [
    {
      "title": "User registration UI",
      "description": "Create the registration interface...",
      "priority": "HIGH",
      "suggested_owner_role": "Frontend Developer",
      "estimated_effort": "1 day",
      "dependencies": [],
      "acceptance_criteria": [
        "User can enter email",
        "Validation is shown for invalid input"
      ]
    }
  ]
}
```

The exact schema can be improved if necessary.

Backend must validate AI output before using it.

Never blindly save raw LLM output to PostgreSQL.

---

# 15. AI Task Approval Workflow

AI-generated tasks must NOT automatically become real tasks.

Workflow:

```text
PM Requirement
      ↓
Claude / AI
      ↓
Structured Task Suggestions
      ↓
Backend Validation
      ↓
PM Reviews
      ↓
PM Edits / Removes
      ↓
PM Approves
      ↓
Backend Creates Tasks
      ↓
PostgreSQL
```

The UI must clearly distinguish:

- AI suggestions
- Actual project tasks

The PM must be able to:

- Edit suggestion
- Delete suggestion
- Approve individual suggestions or all valid suggestions

Only approved suggestions should be persisted as real tasks.

---

# 16. AI Capability #2 — Project Health Analysis

The AI should analyze actual project information.

Do not send an empty generic prompt.

First collect project data from PostgreSQL.

Example:

```text
Project:
E-commerce Checkout

Tasks:
Payment API — High — In Progress — Due Aug 25 — Owner Ravi
Checkout UI — Medium — Completed
Checkout Testing — High — To Do
Order API — High — Testing
```

Then send relevant structured context to Claude.

Claude should return structured output such as:

```json
{
  "health": "AMBER",
  "summary": "The project is progressing but has delivery risks.",
  "risks": [
    {
      "title": "Payment API is overdue",
      "severity": "HIGH",
      "evidence": "Due date has passed and task is not completed"
    }
  ],
  "recommended_actions": [
    {
      "action": "Escalate payment integration",
      "reason": "The task is high priority and overdue."
    }
  ]
}
```

---

# 17. AI Grounding

The AI must be grounded in actual project data.

It must not invent:

- Tasks
- Owners
- Dates
- Dependencies
- Bugs
- Progress
- Risks

If the database does not contain enough information to support a claim, the AI should state that the information is unavailable.

Strong implementation:

```text
PostgreSQL
    ↓
Backend calculates objective facts
    ↓
Backend builds structured AI context
    ↓
Claude analyzes the context
    ↓
Backend validates Claude response
    ↓
Frontend displays result
```

---

# 18. Project Health Objective Facts

Where practical, calculate objective facts before calling AI.

Example:

```text
Total tasks: 20
Completed: 11
In Progress: 5
Testing: 2
To Do: 2
Overdue: 4
High-priority overdue: 2
```

AI should reason over these facts instead of being responsible for basic counting.

---

# 19. Agentic Stretch Goal

Only implement after the core application is stable.

Example:

> Move all overdue high-priority tasks to tomorrow and notify me which resources are impacted.

Expected workflow:

```text
User Request
      ↓
Agent Planning
      ↓
Identify Relevant Tasks
      ↓
Identify Impacted Resources
      ↓
Generate Proposal
      ↓
Show Proposal
      ↓
PM Approves / Rejects
      ↓
If Approved
      ↓
Execute Controlled Backend Actions
      ↓
Persist Changes
      ↓
Create Notifications
      ↓
Log Action
```

The agent must NOT have unrestricted database access.

Use controlled backend tools/services.

Possible tools:

```text
find_overdue_tasks()
get_task()
get_impacted_resources()
propose_task_update()
update_task_due_date()
create_notification()
```

The exact implementation can differ.

---

# 20. Agentic Safety Rule

**Never execute an agentic action without explicit user approval.**

Example proposal:

```text
Proposed Changes

Payment API
Current due date: Aug 25
New due date: Aug 28
Owner: Ravi

Impacted resources:
- Ravi
- Sarah

[Approve] [Reject]
```

If rejected:

- Nothing changes.

If approved:

- Changes are persisted.
- Notifications are generated.
- Action is logged.

---

# 21. AI Observability

Because this is an AI assessment, implement lightweight AI observability.

Where practical record:

- Workflow/request type
- Request timestamp
- Response timestamp
- Response duration
- Model
- Token usage if available
- Success/failure
- Validation result

Do not store sensitive data unnecessarily.

This should make it possible to demonstrate that AI requests are being tracked.

---

# 22. Prompt Management

Keep prompts separated from API route handlers.

Suggested structure:

```text
backend/
└── app/
    └── ai/
        ├── prompts/
        │   ├── task_generation.py
        │   ├── project_health.py
        │   └── agent_planning.py
        ├── schemas.py
        ├── service.py
        └── client.py
```

Do not scatter large prompts throughout the backend.

---

# 23. AI Error Handling

Test AI failures explicitly.

## Invalid AI Output

If structured JSON is expected but Claude returns invalid data:

- Validate it.
- Do not save invalid data.
- Attempt safe recovery if appropriate.
- Otherwise show a useful error.
- Log the failure.

## Missing Information

If AI cannot determine an owner:

```text
Owner could not be determined from the requirement.
```

Do not invent a user.

## Unsupported Claim

If there is no payment API task in the project data, AI should not claim that payment API is blocking checkout unless evidence exists.

## AI Provider Failure

If Claude/API fails:

- Do not crash the application.
- Show a useful user-facing error.
- Allow retry.
- Log the technical failure safely.

---

# 24. Authentication

Implement authentication appropriate for the prototype.

Support:

- Login
- Logout
- Current user
- Protected API access

Ensure credentials/secrets are handled securely.

---

# 25. Authorization

Backend must enforce:

- User role
- Project membership
- Resource ownership where relevant
- Operation permissions

Test unauthorized API calls directly.

Do not rely only on frontend UI restrictions.

---

# 26. API Requirements

## Authentication

```text
POST /auth/login
POST /auth/logout
GET  /auth/me
```

Exact routes may differ.

## Projects

Support:

- Create
- List
- Get details
- Update
- Add member
- Remove member

## Tasks

Support:

- Create
- List
- Get details
- Update
- Delete
- Update status
- Assign/reassign

## Dashboard

Support:

- Dashboard statistics

## AI

Support:

- Generate tasks
- Review suggestions
- Approve suggestions
- Generate project health
- Generate agentic proposal
- Approve/reject proposal
- Execute approved action

## Notifications

Support:

- List notifications
- Mark as read

Use appropriate HTTP status codes.

---

# 27. Database Design

At minimum consider:

```text
users
projects
project_members
tasks
task_dependencies
notifications
ai_suggestions
ai_actions
ai_logs
```

Not every table must be implemented if it is unnecessary for the final scope.

Use proper relationships.

Example:

```text
User
 ├── Project Memberships
 └── Tasks

Project
 ├── Members
 └── Tasks

Task
 ├── Owner
 ├── Project
 └── Dependencies
```

Use migrations.

---

# 28. Demo Data

Seed realistic demo data.

Include:

- Multiple projects
- Multiple team members
- Tasks in all four statuses
- Overdue tasks
- High-priority tasks
- Tasks due this week
- Completed tasks
- In-progress tasks
- Testing tasks

The seeded data should make the dashboard and AI project health analysis useful during the demo.

Clearly identify demo/seed data.

---

# 29. Environment Variables

Use environment variables for:

- PostgreSQL connection
- Claude/AI API key
- Authentication secrets
- Other external credentials

Create:

```text
.env.example
```

Never commit actual secrets.

Check `.gitignore`.

AI API keys must never be exposed to the browser.

---

# 30. Recommended Project Structure

If creating from scratch, a structure similar to this is recommended:

```text
project-root/
├── CLAUDE.md
├── README.md
├── .env.example
├── .gitignore
│
├── frontend/
│   ├── app/
│   ├── components/
│   ├── lib/
│   ├── types/
│   ├── hooks/
│   └── ...
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── repositories/
│   │   ├── services/
│   │   ├── ai/
│   │   │   └── prompts/
│   │   └── main.py
│   ├── tests/
│   ├── migrations/
│   └── requirements.txt
│
└── docker-compose.yml
```

Do not force this exact structure if the existing repository has a better established architecture.

---

# 31. 3-Day Implementation Plan

## Day 1 — Foundation + Core Product

Focus on:

- Repository inspection
- Architecture
- Next.js setup
- FastAPI setup
- PostgreSQL setup
- Database models/migrations
- Authentication
- Roles
- Projects
- Tasks
- Task board
- Basic dashboard
- Basic UI skeleton

Goal:

**A working project management application before AI features become the focus.**

---

## Day 2 — AI

Focus on:

### Primary AI workflow

Requirement → Structured Tasks → Validation → PM Review → Approval → Database

### Secondary AI workflow

Project Data → AI Health Analysis → Structured Risks/Recommendations

### If time allows

Agentic proposal workflow.

Goal:

**The AI should be a real part of the product, not a chatbot bolted onto it.**

---

## Day 3 — QA + Polish + Demo

Focus on:

- Testing
- Edge cases
- Error handling
- AI failure handling
- Hallucination handling
- Authorization testing
- UI polish
- Logging
- Observability
- README
- Architecture diagram
- Demo data
- Demo scenarios
- Final regression testing

Goal:

**Stable, polished, explainable demo.**

---

# 32. Priority Levels

If time becomes limited, follow this order.

## P0 — Must Have

1. Next.js frontend
2. TypeScript
3. FastAPI backend
4. PostgreSQL
5. Authentication
6. User roles
7. Projects
8. Tasks
9. Task board
10. Dashboard
11. Requirement → AI tasks
12. AI task review/approval
13. Project health analysis
14. Validation
15. Error handling
16. Tests
17. README
18. Architecture diagram

## P1 — Strongly Recommended

19. AI observability
20. Structured AI output
21. Hallucination handling
22. Notifications
23. Task dependencies
24. Better demo data

## P2 — Stretch

25. Agentic task modification
26. Agent planning
27. Tool calling
28. Resource impact analysis
29. Natural-language project Q&A

**Do not sacrifice P0 functionality for an unfinished P2 feature.**

---

# 33. Testing Requirements

Testing is mandatory.

Use the repository's existing testing framework where possible.

If no test framework exists, establish a sensible one.

Test:

- Frontend
- Backend
- API endpoints
- Database operations
- Authentication
- Authorization
- AI workflows
- Critical user journeys

Run actual project commands for:

```text
Lint
Type check
Unit tests
Integration tests
API tests
Frontend build
Backend tests
Database migration checks
```

Do not invent commands.

Inspect `package.json`, backend configuration, and existing scripts to determine the correct commands.

---

# 34. Mandatory QA Behavior

After implementing a feature:

1. Test it.
2. Look for failures.
3. Reproduce failures.
4. Identify root cause.
5. Fix root cause.
6. Test again.
7. Test related functionality.
8. Run regression tests.

**Do not simply report an error and continue.**

If you find:

```text
TypeScript error
```

fix it.

If you find:

```text
API error
```

fix it.

If you find:

```text
Database error
```

fix it.

If you find:

```text
UI bug
```

fix it.

If you find:

```text
AI parsing error
```

fix it.

If a test fails:

**Investigate and fix it before declaring the relevant phase complete.**

---

# 35. QA Checklist

## Authentication

- [ ] Valid login works.
- [ ] Invalid login fails correctly.
- [ ] Protected resources reject unauthenticated users.
- [ ] Logout works.
- [ ] Session/token behavior works.

## Authorization

- [ ] PM permissions work.
- [ ] Team Member permissions work.
- [ ] Unauthorized API calls are rejected.
- [ ] Project membership is enforced.

## Projects

- [ ] Create project.
- [ ] Edit project.
- [ ] View project.
- [ ] Add member.
- [ ] Remove member.
- [ ] Required validation works.
- [ ] Date validation works.

## Tasks

- [ ] Create.
- [ ] Edit.
- [ ] Delete.
- [ ] Assign.
- [ ] Reassign.
- [ ] Change status.
- [ ] Validate priority.
- [ ] Validate dates.
- [ ] Validate owner.

## Task Board

- [ ] Correct columns.
- [ ] Correct task placement.
- [ ] Status persists.
- [ ] Refresh preserves state.
- [ ] Failed updates are handled.

## Dashboard

- [ ] Total count accurate.
- [ ] Completed count accurate.
- [ ] In-progress count accurate.
- [ ] Overdue count accurate.
- [ ] Due-this-week count accurate.
- [ ] Metrics update after task changes.

## AI Task Generation

- [ ] Requirement submission works.
- [ ] AI response is structured.
- [ ] AI output is validated.
- [ ] Suggestions display correctly.
- [ ] Suggestions can be edited.
- [ ] Suggestions can be removed.
- [ ] Suggestions can be approved.
- [ ] Approved suggestions create real tasks.
- [ ] Invalid AI output is handled.
- [ ] AI provider failure is handled.

## Project Health

- [ ] Uses real project data.
- [ ] Objective facts are correct.
- [ ] AI risks are grounded in data.
- [ ] Recommendations display correctly.
- [ ] Missing information is handled.
- [ ] AI does not invent facts.

## Agentic Workflow

- [ ] Matching tasks identified.
- [ ] Impacted resources identified.
- [ ] Proposal displayed.
- [ ] No action occurs before approval.
- [ ] Reject prevents changes.
- [ ] Approve executes changes.
- [ ] Changes persist.
- [ ] Notifications created.
- [ ] Action logged.

---

# 36. Edge Cases

Test:

- Empty project
- Project with no tasks
- Many tasks
- Missing optional data
- Invalid dates
- Due date before start date
- Overdue tasks
- Task due today
- Task due this week
- Completed overdue task
- Invalid owner
- Removed project member
- Unauthorized project access
- Unauthorized task update
- Duplicate request
- Database unavailable
- AI provider unavailable
- AI timeout
- Malformed AI response
- Empty AI response
- Long requirement input
- Special characters
- Browser refresh
- Concurrent updates

---

# 37. UI/UX QA

Check:

- [ ] Navigation
- [ ] Forms
- [ ] Buttons
- [ ] Loading states
- [ ] Empty states
- [ ] Error states
- [ ] Success feedback
- [ ] Confirmation dialogs
- [ ] Modals
- [ ] Task board
- [ ] Responsive layout
- [ ] No broken images/icons
- [ ] No unexpected console errors
- [ ] No obvious layout overflow

---

# 38. Security QA

Before completion:

- [ ] No secrets committed.
- [ ] `.env` ignored.
- [ ] `.env.example` has placeholders only.
- [ ] AI keys are backend-only.
- [ ] Authentication enforced.
- [ ] Authorization enforced server-side.
- [ ] Input validation exists.
- [ ] Sensitive errors are not exposed.
- [ ] Database credentials are not exposed.
- [ ] Agentic actions require approval.

---

# 39. Code Quality

Before completion:

- [ ] No unnecessary duplicate code.
- [ ] No obvious dead code.
- [ ] No unused imports.
- [ ] No unnecessary dependencies.
- [ ] No hardcoded secrets.
- [ ] No hardcoded dashboard statistics.
- [ ] No fake API success responses.
- [ ] No required feature left as an unexplained TODO.
- [ ] Components are reasonably sized.
- [ ] Backend responsibilities are separated.
- [ ] Types are used correctly.
- [ ] Error handling exists.
- [ ] Naming is consistent.
- [ ] Code is maintainable.

---

# 40. Manual End-to-End QA

## PM Journey

1. Log in.
2. Create a project.
3. Add team members.
4. Create tasks.
5. Assign tasks.
6. Open task board.
7. Move a task through statuses.
8. Verify database persistence.
9. Verify dashboard metrics.
10. Enter a natural-language requirement.
11. Generate AI task suggestions.
12. Edit a suggestion.
13. Remove a suggestion.
14. Approve suggestions.
15. Verify real tasks are created.
16. Generate project health analysis.
17. Verify risks are grounded in project data.
18. Test agentic proposal if implemented.
19. Reject proposal and verify no change.
20. Create proposal again.
21. Approve proposal.
22. Verify database changes.
23. Verify notifications/action log.

## Team Member Journey

1. Log in.
2. View projects.
3. View assigned tasks.
4. Open task.
5. Update permitted information.
6. Change status.
7. Refresh.
8. Verify persistence.
9. Attempt unauthorized operation.
10. Verify backend rejects it.

---

# 41. AI-Specific Test Scenarios

Create at least 5–10 meaningful scenarios overall.

Recommended AI scenarios:

### Scenario 1 — Normal requirement

Input:

```text
Build customer registration with email OTP and forgot password functionality.
```

Expected:

Structured, useful task suggestions.

### Scenario 2 — Ambiguous requirement

Input:

```text
Improve login.
```

Expected:

AI should provide reasonable suggestions but should not invent specific business requirements.

### Scenario 3 — Missing owner

Expected:

AI does not invent a person.

### Scenario 4 — Malformed AI response

Expected:

Backend validation catches it.

### Scenario 5 — AI provider failure

Expected:

Useful error + retry.

### Scenario 6 — Grounded health analysis

Project contains overdue high-priority tasks.

Expected:

AI identifies them using actual project data.

### Scenario 7 — Unsupported claim

Project has no evidence for a risk.

Expected:

AI does not invent the risk.

### Scenario 8 — Agentic rejection

PM rejects proposed changes.

Expected:

No database changes.

### Scenario 9 — Agentic approval

PM approves.

Expected:

Only proposed/approved changes execute.

---

# 42. README Requirements

Create/update `README.md`.

Include:

- Project overview
- Problem statement
- Features
- Tech stack
- Architecture
- Database
- AI capabilities
- AI workflows
- Agentic workflow
- Folder structure
- Environment setup
- Database setup
- Migration instructions
- Frontend setup
- Backend setup
- Running the project
- Running tests
- Demo credentials if applicable
- Demo scenarios
- Known limitations

---

# 43. Architecture Diagram

Create an architecture diagram that clearly shows:

```text
User
 ↓
Next.js Frontend
 ↓
FastAPI Backend
 ├── Authentication
 ├── Project/Task Services
 ├── Dashboard Logic
 ├── AI Service
 │     ↓
 │   Claude API
 └── Notification/Agent Services
 ↓
PostgreSQL
```

The diagram should distinguish deterministic application logic from AI reasoning.

---

# 44. Demo Strategy

The final demo should ideally fit within approximately 5–10 minutes.

Recommended flow:

### 1. Login

Show PM authentication.

### 2. Dashboard

Show:

- Total tasks
- Completed
- In Progress
- Overdue
- Due this week

### 3. Project

Open project and show:

- Team
- Tasks
- Progress

### 4. Task Board

Move:

```text
To Do → In Progress → Testing → Completed
```

Show persistence.

### 5. AI Requirement → Tasks

Enter:

```text
Build customer registration with email OTP and forgot password functionality.
```

Show:

```text
Requirement
↓
Claude
↓
Structured tasks
↓
Validation
↓
PM review
↓
Approval
↓
Real tasks
```

### 6. Project Health

Show:

```text
Project Health: AMBER
```

Explain the actual project data behind the risks.

### 7. Agentic Workflow

If implemented:

Show:

```text
User request
↓
Agent proposal
↓
Impacted resources
↓
PM approval
↓
Execution
↓
Notification
```

Demonstrate rejection before approval if possible.

---

# 45. Be Ready for Live Change Requests

The evaluator may ask for an unexpected change.

Keep the architecture modular enough to modify.

Possible change requests:

- Add a priority.
- Add task dependencies.
- Add milestones.
- Add AI-generated acceptance criteria.
- Add AI-generated test cases.
- Add workload view.
- Add project filters.
- Add natural-language project questions.
- Change the agentic date behavior.

Do not create an architecture that makes small changes unnecessarily difficult.

---

# 46. Developer Ownership

Even though Claude Code is being used to assist with development:

**The final implementation must be understandable by the developer.**

Before completion, ensure you can explain:

- Why Next.js was used.
- Why FastAPI was used.
- Why PostgreSQL was used.
- How authentication works.
- How authorization works.
- How data flows from frontend → backend → database.
- How AI task generation works.
- How AI output is structured and validated.
- How project health is grounded.
- Why deterministic calculations are not delegated to AI.
- How agentic actions are controlled.
- How AI failures are handled.
- How testing was performed.

Do not introduce a technology or architecture solely because it looks impressive.

---

# 47. Final Definition of Done

The project is complete only when:

- [ ] Frontend works.
- [ ] Backend works.
- [ ] PostgreSQL persistence works.
- [ ] Frontend/backend integration works.
- [ ] Authentication works.
- [ ] Authorization works.
- [ ] Projects work.
- [ ] Tasks work.
- [ ] Task board works.
- [ ] Dashboard works.
- [ ] AI task generation works.
- [ ] AI task approval works.
- [ ] Project health analysis works.
- [ ] AI output validation works.
- [ ] AI errors are handled.
- [ ] Hallucination/missing-data cases are handled.
- [ ] Tests pass.
- [ ] Manual QA is complete.
- [ ] Regression testing is complete.
- [ ] No critical/high-severity known bugs remain.
- [ ] README is complete.
- [ ] Architecture diagram exists.
- [ ] Demo data exists.
- [ ] Demo workflow has been tested.
- [ ] No secrets are committed.

---

# 48. Final QA Command

Before declaring the project complete, perform a final verification.

Run the actual project commands discovered during repository inspection for:

```text
Lint
Type check
Tests
Build
Backend tests
Database/migration checks
```

Then manually test the major user journeys.

If anything fails:

**STOP. FIX IT. TEST AGAIN.**

Do not declare success with known failures.

---

# 49. Final Completion Report

When finished, provide:

## Implemented

List the major features implemented.

## Architecture

Confirm:

```text
Next.js + TypeScript
        ↓
Python + FastAPI
        ↓
PostgreSQL
```

Explain AI integration briefly.

## AI Workflows

Describe:

1. Requirement → Tasks
2. Project Health
3. Agentic workflow, if implemented

## Tests Run

List the actual commands and results.

## QA Performed

List the major manual QA scenarios.

## Bugs Found & Fixed

List important bugs discovered and fixed.

## Remaining Issues

Only list genuine remaining issues.

## Final Status

Use exactly one:

```text
READY
```

or:

```text
NOT READY — <reason>
```

---

# 50. FINAL CLAUDE CODE INSTRUCTION

**BUILD THE APPLICATION. DO NOT MERELY DESCRIBE IT.**

Follow this process:

```text
Inspect
  ↓
Plan
  ↓
Implement
  ↓
Test
  ↓
Find Issues
  ↓
Fix Root Causes
  ↓
Test Again
  ↓
Regression Test
  ↓
Continue
```

Act as both:

- Senior developer
- QA engineer

Do not ignore errors.

Do not hide errors.

Do not simply report errors.

**Fix errors.**

Do not declare a feature complete just because it compiles.

Do not declare the project READY just because the UI looks good.

Verify the complete flow:

```text
Frontend
   ↓
API
   ↓
Backend Logic
   ↓
PostgreSQL
   ↓
AI where appropriate
   ↓
Validated Response
   ↓
Frontend
```

The final goal is:

> **A small, polished, working, reliable, AI-powered project management application that can be demonstrated and explained confidently in the office assessment.**
