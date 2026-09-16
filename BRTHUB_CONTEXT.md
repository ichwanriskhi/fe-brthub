# BRTHub --- Project Context

## 1. Project Overview

BRTHub is a centralized BRT ticket and case management system.

It centralizes reports, requests, complaints, incidents, and inquiries
into one trackable case lifecycle:

Reporter Submission → Review → Routing / Assignment → Handling →
Resolution → Review → Final Closure

The system has two experiences: 1. Public Reporter Portal 2. Internal
BRTHub Application

## 2. Actors

### Reporter

The person submitting a ticket. May be an internal employee or customer.
A Reporter does not necessarily need a full system account.

Public flow: Phone Number → OTP Verification → Report Form

### Customer

The subject of a ticket when applicable. Reporter and Customer may be
the same or different people.

### Reviewer

Responsible for initial review, adjusting ticket information when
necessary, determining priority, determining routing / next action,
reviewing resolutions, requesting rework, and final closure for Priority
C.

Reviewer is not limited to approve/reject.

### Unit Assignment

Receives Priority A/B tickets routed to its destination unit and selects
an eligible Handler from that unit.

### Handler / PIC

Handles assigned tickets, communicates, documents handling progress,
adds attachments, prepares resolutions, submits resolutions, and
performs rework.

### Manager

A position that is the final closure authority for Priority B.

### Director

A position that is the final closure authority for Priority A.

### Admin

Manages employee, account setup, and relevant master data.

Manager and Director are positions, not separate system roles.

## 3. Employee Structure

Employee has: - Department - Position

Position has: - `hierarchy_level`

There is no `reports_to_employee_id` requirement.

Reviewer candidates for internal tickets may be inferred from relevant
department, higher hierarchy position, and Reviewer role. If multiple
eligible employees exist, do not invent a selection rule.

## 4. Authentication

### Reporter

Reporter does not require a full Account to submit.

Public authentication: 1. Phone number 2. OTP verification 3. Report
form

One phone number maps to one Identity. A different phone number is
treated as a different identity.

### Employee

Employee login supports: - Phone + password - Phone + OTP

Phone identifies the account.

### Account Setup

Admin activates an employee Account and can send a setup-password link.
The employee sets their own password.

Admin may send a reset link but must never know or display an employee
password.

`password_hash` may be nullable for OTP-only accounts.

OTP/setup/reset tokens are authentication mechanisms, not ordinary admin
master-data pages.

## 5. Ticket Types

Four Ticket Types exist:

-   Request --- e.g. request for a new chair
-   Incident --- e.g. Wi-Fi is down
-   Complaint --- dissatisfaction or service issue
-   Inquiry --- question or information request

## 6. Category

Category is separate from Ticket Type and represents the issue domain.

Examples:

Vehicle: - Vehicle Maintenance - Vehicle Operation - Vehicle Part -
Engine Part - Electrical Part

Facility: - Office Facility - Building Facility

IT Service: - Network - Application - Hardware

Do not merge Ticket Type and Category.

## 7. Priority

  Priority   Meaning                     Final Closure Authority
  ---------- --------------------------- -------------------------
  A          Critical / very important   Director
  B          High / important            Manager
  C          Normal / general            Reviewer

Reporter may provide an initial priority, but Reviewer can adjust it.

Routing: - A → Reviewer routes to destination unit only - B → Reviewer
routes to destination unit only - C → Reviewer directly assigns Handler

A/B then go through Unit Assignment for Handler selection.

Do not assume automatic assignment.

## 8. Ticket Statuses

Use only: - Open - In Progress - Pending Review - Rework Required -
Rejected - Closed

Do not create a long-lived `Approved` status.

Final status is `Closed`.

`is_terminal` can indicate a final status. `sort_order` is display
ordering, not workflow enforcement.

## 9. Revision and History

Original ticket submission must never be silently overwritten.

`TICKET_REVISION` stores snapshots / versions of adjusted ticket
information.

`TICKET_ACTIVITY` records chronological system and workflow activity.

Do not create a separate `TICKET_STATUS_HISTORY` concept unless
explicitly required.

## 10. Resolution Versioning

A ticket can have multiple resolution submissions.

Example: Resolution #1 → Rework Required → Resolution #2

Previous resolutions remain preserved.

`TICKET_RESOLUTION.resolution_no` identifies the resolution version.

Never overwrite an earlier resolution.

## 11. Interactions

`TICKET_INTERACTION.interaction_type` may be: - MESSAGE -
REQUEST_DETAIL - RESPONSE - INFORMATION - FOLLOW_UP

Conversation and system activity must be visually distinguishable.

## 12. Ticket Relations

Supported relation types: - RECURRING_OF - DUPLICATE_OF - RELATED_TO -
FOLLOW_UP_OF - CHILD_OF

A related/recurring issue creates a new ticket. Do not reopen the old
ticket merely because a new ticket is related.

## 13. Product

Lightweight local product dictionary examples: - ECU Juken - CDI - CVT -
Brake System - Battery

Do not assume a complete Wansis parts master exists.

## 14. Vehicle

Local `VEHICLE` may cache/reference a Wansis ID.

Do not assume a specific Wansis API or integration mechanism unless
explicitly provided.

## 15. Attachments

Attachments are metadata/references; actual file storage is separate.

Attachments may belong to: - Ticket - Interaction - Resolution

## 16. Database Entities

1.  IDENTITY
2.  ACCOUNT
3.  EMPLOYEE
4.  DEPARTMENT
5.  POSITION
6.  ROLE
7.  EMPLOYEE_ROLE
8.  PRODUCT
9.  CATEGORY
10. PRIORITY
11. TICKET_TYPE
12. TICKET_STATUS
13. VEHICLE
14. CUSTOMER
15. TICKET
16. TICKET_REVISION
17. TICKET_ASSIGNMENT
18. TICKET_REVIEW
19. TICKET_RESOLUTION
20. TICKET_INTERACTION
21. TICKET_ACTIVITY
22. TICKET_RELATION
23. TICKET_ATTACHMENT

OTP/authentication token tables may exist separately as implementation
details. Do not assume an exact physical schema unless provided.

## 17. UI Principles

Internal BRTHub is a dense enterprise SaaS application: - clear
hierarchy - reusable components - role-based actions - explicit
editable/read-only states - ticket context - conversation + activity
timeline - status and priority indicators - confirmation dialogs for
consequential actions

Public Reporter Portal should be simpler and customer-facing.

## 18. Source of Truth

Use: - `AGENTS.md` → coding-agent rules - `BRTHUB_CONTEXT.md` →
business/domain context - `WORKFLOW.md` → workflow and role rules -
`DESIGN.md` → visual design system - Stitch designs / Stitch MCP →
screen-level visual reference

If these sources conflict, do not silently invent a solution. Ask for
clarification.
