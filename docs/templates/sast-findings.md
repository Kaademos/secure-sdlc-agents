# SAST Findings — [Feature / PR / Branch]

**Feature / PR / Branch:** [e.g. PR #42 — login endpoint / feature/user-auth]
**Date:** [YYYY-MM-DD]
**Tool(s):** [e.g. Semgrep, Checkmarx, Snyk Code, SonarQube]
**Author:** AppSec Engineer Agent + Dev Lead Agent + [Human reviewer]
**Status:** Open / In Remediation / Resolved

---

## Summary

| Severity | Total | Confirmed | False Positive | Needs Review | Resolved |
|----------|-------|-----------|---------------|-------------|---------|
| CRITICAL | | | | | |
| HIGH | | | | | |
| MEDIUM | | | | | |
| LOW | | | | | |
| INFO | | | | | |
| **Total** | | | | | |

**Gate status:**
- CRITICAL confirmed findings: [N] — [Blocks merge / All resolved]
- HIGH confirmed findings: [N] — [Blocks release / All resolved]

---

## Findings

---

### [SF-001] — [Tool Rule ID] — [Finding Title]

**File:** `path/to/file.ext:line_number`
**Severity:** CRITICAL / HIGH / MEDIUM / LOW / INFO
**Status:** Confirmed / False Positive / Needs Review / Resolved
**CWE:** [CWE-XXX — Name]
**OWASP Top 10:** [A0X:Year — Category] *(if applicable)*
**ASVS Ref:** [V.X.Y.Z] *(from security-requirements.md)*

**What the scanner found:**
```
[Paste the relevant code snippet — anonymised if needed]
```

**Why this matters (plain English):**
[Explain the vulnerability and its real-world impact without jargon. Write this for the
developer who owns the fix, not for an auditor.]

**Confirmed exploitable:** Yes / No / Unknown
[If No or Unknown, explain why — e.g. "the affected function is only reachable from an
authenticated admin context, reducing exploitability significantly"]

**Remediation:**
[Concrete fix with a code example where possible]

```
[Example of the corrected code]
```

**References:**
- OWASP: [relevant link]
- ASVS: [control reference]

**Owner:** [Developer / team]
**Target resolution date:** [YYYY-MM-DD]
**Resolved date:** [YYYY-MM-DD or —]

---

### [SF-002] — [Tool Rule ID] — [Finding Title]

*(Copy the block above for each finding)*

---

## False Positives

Document findings marked as false positives so the reasoning is auditable:

| ID | Tool Rule | File:Line | Reason for FP determination | Reviewer | Date |
|----|-----------|-----------|----------------------------|----------|------|
| | | | | | |

---

## Suppressed / Accepted Findings

Findings that are confirmed but have been formally accepted rather than fixed:

| ID | Severity | Description | Business Justification | Approver | Review Date | Risk Register Ref |
|----|----------|-------------|------------------------|----------|-------------|-------------------|
| | | | | | | |

---

## Remediation Tracking

| ID | Severity | Finding | Owner | Target Date | Status | PR / Commit |
|----|----------|---------|-------|-------------|--------|-------------|
| SF-001 | | | | | Open / In Progress / Resolved | |

---

## Review History

| Date | Reviewer | Action |
|------|----------|--------|
| [YYYY-MM-DD] | AppSec Engineer Agent | Initial triage |
| | | |
