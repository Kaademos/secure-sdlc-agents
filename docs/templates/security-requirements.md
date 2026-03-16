# Security Requirements — [Feature Name]

**Feature:** [Brief description of what is being built]
**Date:** [YYYY-MM-DD]
**Author:** Product Manager Agent + [Human reviewer]
**ASVS Target Level:** L1 / L2 / L3
**Status:** Draft / Review / Approved

---

## Actors

List every actor that interacts with this feature:

| Actor | Type | Trust Level | Notes |
|-------|------|------------|-------|
| [e.g. Authenticated user] | Human | Low | Standard registered user |
| [e.g. Admin] | Human | Medium | Internal staff with elevated access |
| [e.g. Payment service] | System | High | Third-party integration via API key |

---

## Security Requirements

| ID | Requirement | ASVS Ref | Priority | Acceptance Criteria | Status |
|----|-------------|----------|----------|---------------------|--------|
| SR-001 | [Requirement text] | V[X.Y.Z] | MUST / SHOULD / MAY | [Testable criterion] | Open |
| SR-002 | | | | | |
| SR-003 | | | | | |

**Priority definitions:**
- MUST — non-negotiable; feature cannot ship without this
- SHOULD — strong preference; requires documented justification to defer
- MAY — nice to have; defer if time-constrained

**Common ASVS references by topic:**

| Topic | ASVS Chapter |
|-------|-------------|
| Authentication | V2 |
| Session management | V3 |
| Access control | V4 |
| Input validation | V5 |
| Cryptography | V6 |
| Error handling / logging | V7 |
| Data protection | V8 |
| Communications security | V9 |
| API security | V13 |

---

## Privacy Requirements

- [ ] Data minimisation: only the following fields are collected: [list fields]
- [ ] Retention period defined: data retained for [X days/years], then [deleted/anonymised]
- [ ] Legal basis documented: [Consent / Contract / Legitimate interest / Legal obligation]
- [ ] User consent mechanism required: Yes / No — [reasoning]
- [ ] Data subject rights supported: access, rectification, erasure, portability

---

## Data Classification

| Data Element | Classification | Storage Location | Encryption Required | Access Control |
|---|---|---|---|---|
| [e.g. Password hash] | Confidential | Users DB | At rest + in transit | Auth users only |
| [e.g. Email address] | PII | Users DB | At rest + in transit | Owner + admin |
| [e.g. Session token] | Confidential | Redis | In transit | Owner only |

---

## Integration Security

List any third-party services, APIs, or systems this feature calls:

| Integration | Purpose | Auth method | Data shared | Risk notes |
|---|---|---|---|---|
| [Service name] | [Why] | [API key / OAuth / mTLS] | [What data] | [Any concerns] |

---

## Out of Scope

Document any ASVS controls explicitly deferred and the justification:

| ASVS Ref | Control | Reason deferred | Review date |
|----------|---------|----------------|-------------|
| | | | |

---

## Sign-off

| Role | Name | Date | Status |
|------|------|------|--------|
| Product Manager | | | Approved / Pending |
| AppSec Engineer | | | Approved / Pending |
| Engineering Lead | | | Approved / Pending |
