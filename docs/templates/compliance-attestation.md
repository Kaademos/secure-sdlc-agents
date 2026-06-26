# Compliance Attestation — v[X.Y.Z]

**Release version:** v[X.Y.Z]
**Date:** [YYYY-MM-DD]
**Author:** GRC Analyst Agent + [Human GRC lead]
**Frameworks in scope:** [SOC 2 / ISO 27001 / NIST CSF / PCI DSS / GDPR / HIPAA / DORA / FedRAMP — delete inapplicable]
**Status:** Draft / Review / Approved

---

## Scope

**Systems and services covered by this attestation:**
[List the systems, APIs, data stores, and infrastructure components in scope for this release]

**Data in scope:**
[Describe what categories of data are processed — PII, payment data, health data, etc.]

**Frameworks assessed:**
[List frameworks and the specific version or edition — e.g. SOC 2 Trust Services Criteria 2017,
ISO/IEC 27001:2022 Annex A, NIST CSF 2.0]

---

## Control Status by Framework

### SOC 2 — Trust Services Criteria

| Criteria | Control Description | Status | Evidence Reference | Notes |
|----------|--------------------|---------|--------------------|-------|
| CC6.1 | Logical access controls restrict access to information assets | ✅ Met / ⚠️ Gap / 🚫 Fail | `docs/audit-evidence/` | |
| CC6.2 | New internal and external users provisioned with appropriate access | | | |
| CC6.3 | Access removed when no longer required | | | |
| CC6.6 | Logical access restrictions meet security requirements | | | |
| CC6.7 | Transmission of data restricted to authorised parties | | | |
| CC7.1 | Vulnerabilities in system components detected | | | |
| CC7.2 | Security incidents identified and managed | | | |
| CC8.1 | Changes authorised, designed, and implemented to meet objectives | | | |
| CC9.1 | Risk assessment process identifies and manages risks | | | |

*Add or remove rows based on applicable Trust Services Criteria for your engagement.*

---

### ISO/IEC 27001:2022 — Annex A

| Control | Name | Status | Evidence Reference | Notes |
|---------|------|--------|--------------------|-------|
| A.5.15 | Access control | ✅ Met / ⚠️ Gap / 🚫 Fail | | |
| A.5.17 | Authentication information | | | |
| A.8.5 | Secure authentication | | | |
| A.8.7 | Protection against malware | | | |
| A.8.9 | Configuration management | | | |
| A.8.15 | Logging | | | |
| A.8.20 | Networks security | | | |
| A.8.24 | Use of cryptography | | | |
| A.8.25 | Secure development lifecycle | | | |
| A.8.26 | Application security requirements | | | |
| A.8.27 | Secure system architecture and engineering principles | | | |
| A.8.28 | Secure coding | | | |
| A.8.29 | Security testing in development and acceptance | | | |

*Extend with additional Annex A controls relevant to the systems in scope.*

---

### NIST CSF 2.0

| Function | Category | Status | Evidence Reference | Notes |
|----------|----------|--------|--------------------|-------|
| Govern | GV.OC — Organisational context | ✅ Met / ⚠️ Gap / 🚫 Fail | | |
| Identify | ID.AM — Asset management | | | |
| Protect | PR.AC — Identity management and access control | | | |
| Protect | PR.DS — Data security | | | |
| Protect | PR.IP — Information protection processes | | | |
| Detect | DE.CM — Security continuous monitoring | | | |
| Respond | RS.RP — Response planning | | | |
| Recover | RC.RP — Recovery planning | | | |

---

### PCI DSS v4.0 *(complete only if payment card data is in scope)*

| Requirement | Description | Status | Evidence Reference | Notes |
|-------------|-------------|--------|--------------------|-------|
| 2.2 | System components configured securely | ✅ Met / ⚠️ Gap / 🚫 Fail | | |
| 3.5 | Primary account number secured | | | |
| 4.2 | PAN protected during transmission | | | |
| 6.2 | Bespoke software developed securely | | | |
| 6.3 | Security vulnerabilities identified and addressed | | | |
| 7.2 | Access controlled based on need to know | | | |
| 8.2 | User identification and authentication | | | |
| 10.2 | Audit logs implemented | | | |
| 11.3 | External and internal penetration testing | | | |

---

### GDPR / UK GDPR *(complete only if personal data of EU/UK residents is processed)*

| Article / Principle | Description | Status | Evidence Reference | Notes |
|--------------------|-------------|--------|--------------------|-------|
| Art. 5(1)(a) | Lawfulness, fairness, transparency | ✅ Met / ⚠️ Gap / 🚫 Fail | | |
| Art. 5(1)(b) | Purpose limitation | | | |
| Art. 5(1)(c) | Data minimisation | | | |
| Art. 5(1)(e) | Storage limitation | | | |
| Art. 5(1)(f) | Integrity and confidentiality | | | |
| Art. 25 | Data protection by design and by default | | | |
| Art. 32 | Security of processing | | | |
| Art. 33/34 | Breach notification capability | | | |

---

### HIPAA *(complete only if protected health information (PHI) is in scope)*

| Standard / Rule | Safeguard | Status | Evidence Reference | Notes |
|-----------------|-----------|--------|--------------------|-------|
| §164.308(a)(1) | Security Rule — Security management process (risk analysis) | ✅ Met / ⚠️ Gap / 🚫 Fail | | |
| §164.312(a)(1) | Security Rule — Access control (technical safeguards) | | | |
| §164.312(b) | Security Rule — Audit controls | | | |
| §164.312(e)(1) | Security Rule — Transmission security (encryption in transit) | | | |
| §164.502(b) | Privacy Rule — Minimum necessary use and disclosure | | | |

*Extend with additional Security/Privacy Rule standards (e.g. §164.308 administrative, §164.310 physical) relevant to the systems in scope.*

---

### DORA *(complete only if an EU financial entity or critical ICT third-party provider)*

| Article / Pillar | Requirement | Status | Evidence Reference | Notes |
|------------------|-------------|--------|--------------------|-------|
| Art. 5–15 | ICT risk management framework | ✅ Met / ⚠️ Gap / 🚫 Fail | | |
| Art. 17–23 | ICT-related incident management, classification & reporting | | | |
| Art. 24–27 | Digital operational resilience testing (incl. TLPT) | | | |
| Art. 28–30 | ICT third-party risk management | | | |

---

### FedRAMP *(complete only if selling to US federal agencies — NIST SP 800-53 baseline)*

| Control Family | Control | Status | Evidence Reference | Notes |
|----------------|---------|--------|--------------------|-------|
| AC — Access Control | AC-2 Account management | ✅ Met / ⚠️ Gap / 🚫 Fail | | |
| AU — Audit & Accountability | AU-2 Event logging | | | |
| IA — Identification & Authentication | IA-2 Identification and authentication (organisational users) | | | |
| SC — System & Communications Protection | SC-7 Boundary protection | | | |
| SC — System & Communications Protection | SC-28 Protection of information at rest | | | |

*Select the impact baseline (Low / Moderate / High) and extend with the corresponding 800-53 control families (CM, CP, IR, RA, SI, …).*

---

## Gaps

Controls that are not fully met at the time of this attestation:

| Framework | Control | Gap Description | Risk Rating | Remediation Plan | Owner | Target Date |
|-----------|---------|-----------------|-------------|-----------------|-------|-------------|
| | | | | | | |

---

## Accepted Risks

Controls with residual gaps that have been formally accepted for this release:

| Framework | Control | Gap | Business Justification | Risk Register Ref | Approver | Acceptance Date | Review Date |
|-----------|---------|-----|------------------------|-------------------|----------|----------------|-------------|
| | | | | | | | |

---

## Audit Evidence Index

Evidence collected in support of this attestation, located in `docs/audit-evidence/`:

| Evidence ID | Description | Framework / Control | Collection Date | Location |
|-------------|-------------|--------------------|-----------------|---------| 
| AE-001 | [e.g. SAST scan results showing no CRITICAL findings] | [SOC 2 CC7.1] | [YYYY-MM-DD] | `docs/audit-evidence/sast-results-vX.Y.Z.pdf` |
| AE-002 | | | | |

---

## Attestation Statement

All in-scope controls have been reviewed against the evidence collected for release
v[X.Y.Z]. The gaps and accepted risks listed above have been formally acknowledged by the
named approvers. This attestation is valid for this release only and does not constitute
a certification under any framework.

---

## Sign-off

| Role | Name | Date | Status |
|------|------|------|--------|
| GRC Analyst Agent | (automated) | [YYYY-MM-DD] | Approved |
| GRC Lead / CISO | | | Approved / Pending |
| Release Manager | | | Approved / Pending |
