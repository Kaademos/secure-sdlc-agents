# Threat Model — [Feature / System Name]

**Feature / System:** [Description]
**Date:** [YYYY-MM-DD]
**Author:** AppSec Engineer Agent + [Human reviewer]
**Methodology:** STRIDE (+ LINDDUN if PII in scope)
**Status:** Draft / Review / Approved

---

## Scope

### In scope

- [Component or data flow 1]
- [Component or data flow 2]

### Out of scope

- [What is explicitly not modelled and why]

### Assumptions

- [e.g. The underlying cloud platform is trusted and hardened by the Cloud/Platform team]
- [e.g. The database server is not directly internet-accessible]

---

## Architecture Overview

Describe or embed a diagram of the system being modelled. At minimum, document:

**Components:**

| ID | Component | Type | Description |
|----|-----------|------|-------------|
| C1 | [e.g. Web frontend] | [Web app / API / DB / Queue / etc.] | [What it does] |
| C2 | | | |

**Data flows:**

| ID | From | To | Data | Protocol | Authentication |
|----|----|------|------|------|------|
| F1 | C1 | C2 | [e.g. User credentials] | HTTPS | None (pre-auth) |
| F2 | | | | | |

**Trust boundaries:**

| ID | Boundary | Description |
|----|----------|-------------|
| TB1 | [e.g. Internet / DMZ] | [Traffic crossing from public internet to internal network] |

---

## STRIDE Threat Analysis

For each component and data flow, enumerate applicable threats.

### [Component / Flow name — e.g. Login endpoint (F1)]

| ID | Threat Category | Threat Description | Affected Asset | Likelihood | Impact | Risk Rating | Mitigation | Status |
|----|-----------------|-------------------|----------------|------------|--------|-------------|------------|--------|
| T-001 | Spoofing | Attacker submits forged credentials as another user | User account | High | Critical | CRITICAL | MFA, account lockout, rate limiting | Open |
| T-002 | Tampering | Request body modified in transit | Credentials | Low | Critical | HIGH | TLS enforced, HSTS | Mitigated |
| T-003 | Repudiation | No audit log of failed login attempts | Audit trail | Medium | Medium | MEDIUM | Log all auth attempts with timestamp, IP, outcome | Open |
| T-004 | Info Disclosure | Verbose error reveals whether username exists | User enumeration | High | Medium | HIGH | Generic error: "Invalid credentials" | Open |
| T-005 | Denial of Service | Credential stuffing exhausts login endpoint | Availability | High | High | HIGH | Rate limiting, CAPTCHA after N failures | Open |
| T-006 | Elevation of Privilege | Session token not invalidated after logout | Session | Medium | Critical | HIGH | Invalidate server-side session on logout | Open |

**Threat categories (STRIDE):**
- **S**poofing — pretending to be someone or something else
- **T**ampering — modifying data or code
- **R**epudiation — denying an action was performed
- **I**nformation disclosure — exposing data to unauthorised parties
- **D**enial of service — making a system unavailable
- **E**levation of privilege — gaining access beyond what is authorised

### [Next component / flow — repeat section]

---

## LINDDUN Privacy Threat Analysis

Complete this section if the feature handles personal data (PII, PHI, etc.).

| ID | Threat Category | Threat Description | Affected Data | Risk Rating | Mitigation | Status |
|----|-----------------|-------------------|---------------|-------------|------------|--------|
| L-001 | Linking | User behaviour across sessions can be correlated via persistent identifiers | Session data | MEDIUM | Rotate session IDs on privilege change | Open |
| L-002 | Identifying | Profile data sufficient to uniquely re-identify anonymised records | User profile | HIGH | K-anonymity for analytics exports | Open |

**LINDDUN categories:**
- **L**inking — combining data to learn more than intended
- **I**dentifying — identifying a person from supposedly anonymous data
- **N**on-repudiation — inability of a person to deny an action
- **D**etecting — inferring information from observable behaviour
- **D**ata disclosure — exposing personal data
- **U**nawareness — user unaware of data collection or use
- **N**on-compliance — violation of privacy regulations

---

## Threat Summary

| Rating | Count | Blocked (gate) |
|--------|-------|----------------|
| CRITICAL | [N] | Yes — must resolve before build |
| HIGH | [N] | Yes — must resolve before release |
| MEDIUM | [N] | Resolve or accept risk before release |
| LOW | [N] | Track in risk register |

---

## Mitigations Recommended

Priority list of mitigations to carry into the build phase:

| Priority | Threat ID(s) | Mitigation | Owner | ASVS Ref |
|----------|-------------|------------|-------|----------|
| 1 | T-001, T-004 | Implement account lockout and generic error responses | Dev Lead | V2.2.1, V8.3.4 |
| 2 | | | | |

---

## Sign-off

| Role | Name | Date | Status |
|------|------|------|--------|
| AppSec Engineer | | | Approved / Pending |
| Engineering Lead | | | Approved / Pending |
