# Test Security Report — [Feature / Release Name]

**Feature / Release:** [Description]
**Date:** [YYYY-MM-DD]
**Author:** AppSec Engineer Agent + [Human reviewer]
**Test types performed:** DAST / Penetration test / Fuzz testing / Security regression / [other]
**Environment tested:** Staging / Pre-production / [other — never production without explicit approval]
**Status:** Draft / Review / Approved

---

## Test Coverage Summary

| Test Type | Tool / Method | Scope | Date Performed | Performed By |
|-----------|---------------|-------|---------------|-------------|
| DAST | [e.g. OWASP ZAP, Burp Suite] | [URLs / API endpoints in scope] | [YYYY-MM-DD] | [Agent / Person / External firm] |
| Penetration test | [Manual / Automated] | [Scope] | | |
| Fuzz testing | [e.g. Atheris, Jazzer, libFuzzer] | [Components] | | |
| Security regression | [Test suite reference] | [Feature] | | |

---

## Findings Summary

| Severity | Count | Resolved | Outstanding | Accepted Risk |
|----------|-------|----------|-------------|---------------|
| CRITICAL | | | | |
| HIGH | | | | |
| MEDIUM | | | | |
| LOW | | | | |
| INFO | | | | |

**Gate status:**
- CRITICAL outstanding: [N] — [Blocks release / None]
- HIGH outstanding: [N] — [Blocks release or accepted risk documented]

---

## Findings

---

### [TF-001] — [Finding Title]

**Source:** [DAST / Pentest / Fuzz / Regression]
**Tool / Tester:** [Tool name or tester]
**Endpoint / Component:** `[URL, method, or component name]`
**Severity:** CRITICAL / HIGH / MEDIUM / LOW / INFO
**Status:** Open / In Remediation / Resolved / Accepted Risk
**CWE:** [CWE-XXX — Name]
**OWASP Top 10:** [A0X:Year — Category]
**CVSS Score:** [X.X — if calculated]

**Description:**
[What was found. Be specific — include the request/response, payload, or reproduction steps
where it does not expose sensitive production details.]

**Reproduction steps:**
1. [Step 1]
2. [Step 2]
3. [Observed result]

**Expected result:**
[What should have happened instead]

**Evidence:**
[Screenshot reference, HTTP request/response excerpt, or log snippet — redact any real user
data or credentials before including here]

**Business impact:**
[What could an attacker do with this? Quantify where possible — e.g. "allows unauthenticated
read access to all user records" rather than "information disclosure".]

**Remediation:**
[Specific fix. Reference the relevant ASVS control and security requirement ID.]

**ASVS Ref:** [V.X.Y.Z]
**Security Requirement Ref:** [SR-XXX from security-requirements.md]

**Owner:** [Developer / team]
**Target resolution date:** [YYYY-MM-DD]
**Resolved date:** [YYYY-MM-DD or —]
**Verification:** [How the fix was verified — e.g. re-run ZAP scan, manual retest]

---

### [TF-002] — [Finding Title]

*(Copy the block above for each finding)*

---

## OWASP Top 10 Coverage

Document which OWASP Top 10 categories were tested and the result:

| Category | Tested | Result | Notes |
|----------|--------|--------|-------|
| A01 Broken Access Control | ✅ Yes / ❌ No | Pass / Finding | |
| A02 Cryptographic Failures | | | |
| A03 Injection | | | |
| A04 Insecure Design | | | |
| A05 Security Misconfiguration | | | |
| A06 Vulnerable and Outdated Components | | | |
| A07 Identification and Authentication Failures | | | |
| A08 Software and Data Integrity Failures | | | |
| A09 Security Logging and Monitoring Failures | | | |
| A10 Server-Side Request Forgery | | | |

---

## Security Regression Results

| Test ID | Test Description | ASVS Ref | SR Ref | Result | Notes |
|---------|-----------------|----------|--------|--------|-------|
| | | | | Pass / Fail | |

---

## Remediation Tracking

| ID | Severity | Description | Owner | Target Date | Status | PR / Commit |
|----|----------|-------------|-------|-------------|--------|-------------|
| TF-001 | | | | | Open / Resolved | |

---

## Outstanding Items

List any findings that remain open at the time of sign-off, with accepted risk documentation:

| ID | Severity | Reason not resolved | Risk Register Ref | Approver | Review Date |
|----|----------|--------------------|--------------------|----------|-------------|
| | | | | | |

---

## Sign-off

| Role | Name | Date | Status |
|------|------|------|--------|
| AppSec Engineer | | | Approved / Pending |
| Engineering Lead | | | Approved / Pending |
