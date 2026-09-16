# BRTHub --- Workflow Specification

## 1. End-to-End Workflow

``` text
Reporter
   ↓
Submit Ticket
   ↓
Open
   ↓
Reviewer — Initial Review
   ↓
Priority Determination
   │
   ├── Priority A → Destination Unit → Unit Assignment → Handler
   ├── Priority B → Destination Unit → Unit Assignment → Handler
   └── Priority C → Handler directly
                                      ↓
                                In Progress
                                      ↓
                              Handler Resolution
                                      ↓
                               Pending Review
                                      ↓
                             Resolution Review
                                      │
                         ┌────────────┴────────────┐
                         │                         │
                  Rework Required             Continue
                         │                         │
                         ↓                         ↓
                     Handler                 Final Closure
                         │                         │
                 New Resolution       ┌───────────┼───────────┐
                         │             │           │           │
                         └─────────────┤           │           │
                                       │           │           │
                                  Priority A   Priority B  Priority C
                                       │           │           │
                                    Director     Manager    Reviewer
                                       │           │           │
                                       └───────────┴───────────┘
                                                   ↓
                                                 Closed
```

## 2. Statuses

Only these ticket statuses are defined: - Open - In Progress - Pending
Review - Rework Required - Rejected - Closed

Do not introduce `Approved`, `Waiting for Manager`,
`Waiting for Director`, `Assigned to Unit`, `Resolved`, or `Completed`
as database ticket statuses unless requirements explicitly change.

Queue labels such as `Pending Assignment` may be UI labels without
becoming ticket statuses.

## 3. Initial Review

Reviewer may: - review ticket type - review category - review priority -
review Reporter/Customer information - adjust ticket information -
determine routing / assignment

Original submission must remain preserved. Adjustments must be
represented as revision/history.

## 4. Priority Routing

### Priority A

``` text
Reviewer → Destination Unit → Unit Assignment → Handler
```

Reviewer does not directly select Handler.

Final closure: Director.

### Priority B

``` text
Reviewer → Destination Unit → Unit Assignment → Handler
```

Reviewer does not directly select Handler.

Final closure: Manager.

### Priority C

``` text
Reviewer → Handler
```

Unit Assignment is normally not involved.

Final closure: Reviewer.

## 5. Unit Assignment

Unit Assignment: - sees pending A/B assignment - sees the destination
unit already determined by Reviewer - selects an eligible Handler from
that unit - records assignment - monitors assignment history

Unit Assignment must not: - change destination unit - process C through
the A/B workflow - invent automatic assignment

## 6. Handler

Handler can: - view ticket - view original/reviewed information -
communicate - add handling updates - add attachments - prepare
resolution - submit resolution - perform rework

Handler must not: - change priority - change ticket type/category -
change destination unit - change assignment - perform final closure

## 7. Resolution

A ticket may have multiple resolution versions.

``` text
Resolution #1
      ↓
Resolution Review
      ↓
Rework Required
      ↓
Resolution #2
      ↓
Resolution Review
```

Every version remains preserved.

## 8. Resolution Review

Reviewer reviews submitted resolutions.

### Request Rework

Requires a reason.

``` text
Pending Review → Rework Required → Handler → New Resolution
```

### Continue to Closure

``` text
Priority A → Director
Priority B → Manager
Priority C → Reviewer
```

Do not create an `Approved` status.

## 9. Final Closure

Final closure is an action, not a separate status.

-   Priority A → Director → Close Ticket
-   Priority B → Manager → Close Ticket
-   Priority C → Reviewer → Close Ticket

Before closure, authority should be able to inspect: - original
submission - current/reviewed information - assignment - handling
updates - resolution - resolution history - attachments - related
tickets - conversation - activity timeline

Closing must: 1. Set status to `Closed` 2. Record closure activity 3.
Record closure authority 4. Preserve history 5. Remove ticket from
pending closure queue 6. Make it available in closure history

## 10. Rejected

`Rejected` is a defined status. Do not invent additional rejection
stages or workflows without explicit requirements.

## 11. Ticket Relations

Supported: - RECURRING_OF - DUPLICATE_OF - RELATED_TO - FOLLOW_UP_OF -
CHILD_OF

A new related ticket does not reopen the previous ticket.

## 12. Activity and Audit

Use `TICKET_ACTIVITY` for chronological workflow/system events, such
as: - ticket submitted - initial review - ticket revision - priority
changed - routed - Handler assigned - handling update - resolution
submitted - resolution reviewed - rework requested - resolution
resubmitted - final closure

Conversation messages are separate from system activity.

## 13. Role-Based Workflow

### Reviewer

Initial review, priority determination, A/B routing, C Handler
assignment, resolution review, rework request, C final closure.

### Unit Assignment

Handler assignment for A/B.

### Handler

Handling, communication, updates, resolution submission, rework
resolution.

### Manager

Final closure for Priority B.

### Director

Final closure for Priority A.

### Admin

Employee/account/master-data administration. Do not assume Admin can
perform ticket workflow actions unless explicitly specified.

## 14. Frontend vs Backend

Frontend should show only relevant actions and guide the user through
valid UI states.

Backend must independently enforce: - authentication - authorization -
priority rules - ticket state transitions - assignment rules - review
rules - final closure authority

A hidden or disabled button is not security.

## 15. UI State

Clearly distinguish: - editable vs read-only information - system
activity vs conversation - current vs historical resolution - current vs
historical assignment - original vs revised ticket information
