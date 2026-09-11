# justification-deadline Specification

## Purpose

Defines the monthly cutoff that determines when employees may submit or replace point justifications for a reference month.

## Requirements

### Requirement: Enforce the monthly justification deadline
The system MUST accept an authenticated employee's new point justification or replacement for a reference date only through the end of the fifth calendar day of the following month. The fifth day is inclusive; starting on the sixth calendar day, the system MUST reject the request. The deadline MUST be evaluated against the calendar month containing the submitted reference date, including the December-to-January year transition.

#### Scenario: Justification is submitted before the deadline
- **WHEN** an authenticated employee submits a valid justification for a reference date and the current date is before the fifth day of the following month
- **THEN** the system creates the justification with pending status and returns the existing successful creation response

#### Scenario: Justification is submitted on the fifth day
- **WHEN** an authenticated employee submits a valid justification for a reference date and the current date is the fifth calendar day of the following month
- **THEN** the system accepts the request and creates or replaces the justification

#### Scenario: New justification is submitted after the deadline
- **WHEN** an authenticated employee submits a valid justification for a reference date and the current date is the sixth calendar day or later of the following month
- **THEN** the system rejects the request with a 4xx response, does not create a record, and returns an error explaining that the deadline has passed

#### Scenario: Existing justification is replaced after the deadline
- **WHEN** an authenticated employee submits a valid justification for a reference date that already has a justification and the current date is the sixth calendar day or later of the following month
- **THEN** the system rejects the request and leaves the existing justification, reason, and status unchanged

#### Scenario: December reference month uses the next calendar year
- **WHEN** an authenticated employee submits a valid justification for a December reference date on or before January 5 of the following year
- **THEN** the system accepts the request, and requests from January 6 onward are rejected under the same rule

#### Scenario: Existing validation remains in force
- **WHEN** an unauthenticated client, a client with a future reference date, or a client with invalid justification fields submits a request
- **THEN** the system preserves the existing authentication, future-date, and field-validation responses regardless of whether the monthly deadline would otherwise allow the request
