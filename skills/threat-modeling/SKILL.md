---
name: threat-modeling
description: >
  Use when a new feature, architecture, or significant design decision is being made.
  Run before any code is written. Produces a structured STRIDE threat model and
  architecture review that feeds directly into security requirements and PR review.
---

# Threat Modeling

## Overview

This skill runs a structured threat model against a proposed design or architecture.
It applies STRIDE (and LINDDUN for privacy) to enumerate what can go wrong before
any code exists to exploit. The output is a `docs/threat-model.md` that every other
agent can reference throughout the SDLC.

The discipline: spec the threats before you write the code. AI agents that skip this
step produce features that are locally correct but architecturally broken.

## When to Use

- Starting a new feature or service
- Changing authentication, authorisation, or data access patterns
- Adding a third-party integration or external data source
- Designing a new API surface
- Before a penetration test (to scope it correctly)
- When a security incident reveals a design-level gap

## Process

### Step 1 — Define the scope

Document:
- **Feature summary**: what it does, for whom, and why
- **Data flows**: where data enters, where it goes, where it is stored, where it exits
- **Trust boundaries**: which components trust which other components, and why
- **External dependencies**: APIs, databases, third-party services, user inputs

Draw or describe a simple data flow diagram. Even ASCII is sufficient.

### Step 2 — Enumerate STRIDE threats

For each component and data flow, systematically enumerate threats across all six categories:

| Category | Question to ask |
|---|---|
| **Spoofing** | Can an attacker pretend to be a legitimate user, service, or system? |
| **Tampering** | Can data be modified in transit, in storage, or during processing? |
| **Repudiation** | Can a user deny having performed an action — and would logs prove otherwise? |
| **Information Disclosure** | Can data be accessed by an unauthorised party or leaked in error messages? |
| **Denial of Service** | Can an attacker exhaust resources — compute, memory, storage, rate limits? |
| **Elevation of Privilege** | Can a lower-privilege user or process gain higher-privilege access? |

Produce a threat table:

```markdown
| Component / Flow | Threat Category | Threat Description | Likelihood | Impact | Mitigation |
|---|---|---|---|---|---|
| Login endpoint | Spoofing | Credential stuffing via enumerable usernames | High | High | Account lockout, MFA |
| JWT token | Tampering | Signature bypass via alg=none | Medium | Critical | Enforce alg allowlist; use RS256 |
| User records API | Info Disclosure | IDOR — UUID in path param, no object-level auth | High | High | Verify resource ownership per request |
```

### Step 3 — Add LINDDUN for privacy (when PII is involved)

If the feature processes personal data, extend the model:

| Category | What to check |
|---|---|
| **Linking** | Can user records be correlated across sessions or services? |
| **Identifying** | Can data reveal a user's identity when combined? |
| **Non-repudiation** | Are users stuck with data they can't delete or correct? |
| **Detecting** | Can an attacker infer sensitive facts from system behaviour? |
| **Data disclosure** | Is PII exposed to parties who shouldn't see it? |
| **Unawareness** | Are users informed about what data is collected and why? |
| **Non-compliance** | Does the feature conflict with GDPR, CCPA, or applicable regulation? |

### Step 4 — Prioritise and assign mitigations

For each identified threat:
1. Rate Likelihood (High / Medium / Low) and Impact (Critical / High / Medium / Low)
2. Determine Inherent Risk = Likelihood × Impact
3. Specify a concrete mitigation (not "add validation" — "validate MIME type and magic bytes server-side before accepting file")
4. Assign an owner and target phase (Design / Build / Test)

### Step 5 — Produce the output document

Write `docs/threat-model.md` using this structure:

```markdown
## Threat Model: [Feature Name]

**Date:** YYYY-MM-DD  
**Feature:** [Brief description]  
**ASVS Level:** L[1/2/3]  
**Conducted by:** appsec-engineer (AI) + [human reviewer]

### Data Flow Summary
[Describe or diagram the data flows and trust boundaries]

### STRIDE Threat Table
[Full table from Step 2]

### LINDDUN Privacy Threats (if applicable)
[Full table from Step 3]

### Architecture Review Checklist
- [ ] Authentication enforced on all endpoints
- [ ] Authorisation follows least-privilege; no IDOR vectors
- [ ] All inputs validated server-side; output encoding in place
- [ ] Sensitive data identified and encryption requirements confirmed
- [ ] Third-party integrations reviewed for supply chain risk
- [ ] Error handling does not leak internal state
- [ ] Logging captures security events without logging secrets
- [ ] Rate limiting and anti-automation controls present

### Mitigations Required (prioritised)
[Ordered list by severity]
```

## Common Rationalizations

| Excuse | Counter |
|---|---|
| "We'll do threat modeling after we build the MVP" | Design-level flaws cost 10–100x more to fix after implementation. The MVP will have the flaw baked in. |
| "It's a simple feature, no need for a threat model" | The features that skip threat modeling are the features that produce the breach post-mortems. |
| "We've done this before, we know the risks" | Every feature has novel combinations of data, trust boundaries, and integrations. Past experience is input, not a substitute. |
| "The threat model would just say the same things every time" | Then produce a short one quickly. If you can't identify any threats, you haven't looked hard enough. |
| "Security will review it in staging" | Staging review catches implementation bugs. Architectural flaws require an architectural fix — which means redesign and rebuild. |

## Red Flags

- A feature accesses user data across multiple accounts without explicit object-level authorisation logic
- An API accepts user-supplied IDs (UUIDs, integers) without verifying ownership
- A new external API or third-party service is introduced without a supply chain review
- Data flows across a trust boundary without an explicit authN/authZ check
- Error responses return stack traces, internal hostnames, or database schemas
- A "temporary" bypass of an authorisation check for development convenience
- No logging on authentication events, privilege changes, or data access

## Verification

Do not close the threat model until:

- [ ] All STRIDE categories have been explicitly considered (even if some yield no findings)
- [ ] Every HIGH and CRITICAL threat has a named mitigation with an owner and a target phase
- [ ] `docs/threat-model.md` has been written and linked from the feature spec
- [ ] The threat model has been reviewed by a human with security knowledge — not just read
- [ ] Findings are reflected in `docs/security-requirements.md` (via `product-manager` agent)
- [ ] `docs/risk-register.md` is updated with any accepted risks
