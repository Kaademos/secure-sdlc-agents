# Release Security Sign-Off — v[X.Y.Z]

**Release version:** v[X.Y.Z]
**Release date:** [YYYY-MM-DD]
**Release Manager:** Release Manager Agent + [Human approver]
**Decision:** PENDING / ✅ GO / 🚫 NO-GO

---

## Pre-Release Checklist

### Phase artefacts

| Artefact | Location | Status | Notes |
|----------|----------|--------|-------|
| Security requirements | `docs/security-requirements.md` | ✅ Complete / ⚠️ Incomplete / 🚫 Missing | |
| Risk register | `docs/risk-register.md` | | |
| Threat model | `docs/threat-model.md` | | |
| Infrastructure security review | `docs/infra-security-review.md` | | |
| SAST findings | `docs/sast-findings.md` | | |
| Test security report | `docs/test-security-report.md` | | |
| Compliance attestation | `docs/audit-evidence/compliance-attestation-vX.Y.Z.md` | | |

---

### Application security gate

| Check | Status | Evidence | Notes |
|-------|--------|----------|-------|
| No unmitigated CRITICAL vulnerabilities | ✅ Pass / 🚫 Fail | | |
| No unmitigated HIGH vulnerabilities (or formal accepted risk) | | | |
| All ASVS requirements satisfied or formally deferred | | | |
| Dependency scan clean (no CRITICAL CVEs in direct deps) | | | |
| Security regression tests pass | | | |
| DAST / pentest completed and findings triaged | | | |

---

### Infrastructure and platform gate

| Check | Status | Evidence | Notes |
|-------|--------|----------|-------|
| No CRITICAL or HIGH CSPM findings outstanding | ✅ Pass / 🚫 Fail | | |
| Secret scan clean — no hardcoded secrets in release branch | | | |
| TLS configuration verified on all public endpoints | | | |
| WAF rules reviewed and updated for new attack surface | | | |
| Production access controls reviewed | | | |
| Secrets rotation completed where applicable | | | |

---

### Compliance gate

| Check | Status | Evidence | Notes |
|-------|--------|----------|-------|
| GRC compliance attestation produced | ✅ Pass / 🚫 Fail | | |
| No blocking compliance gaps | | | |
| Audit evidence collected for all changed controls | | | |

---

### Operational readiness

| Check | Status | Notes |
|-------|--------|-------|
| Security monitoring covers new features | ✅ Pass / 🚫 Fail | |
| Incident response runbook updated | | |
| On-call team briefed on security-relevant changes | | |
| Rollback plan documented | | |

---

## Gate Summary

| Gate | Result | Blocker count | Notes |
|------|--------|--------------|-------|
| Application Security | ✅ PASS / 🚫 FAIL | | |
| Infrastructure Security | ✅ PASS / 🚫 FAIL | | |
| Compliance | ✅ PASS / 🚫 FAIL | | |
| Operational Readiness | ✅ PASS / 🚫 FAIL | | |

---

## Outstanding Items

Items waived, accepted, or deferred for this release:

| Item | Risk ID | Justification | Owner | Resolution date |
|------|---------|---------------|-------|----------------|
| | | | | |

---

## Blockers (NO-GO only)

| Blocker | Severity | Owner | Required action | Target date |
|---------|----------|-------|-----------------|-------------|
| | | | | |

---

## Decision

**Decision:** ✅ GO / 🚫 NO-GO

**Rationale:**
[Brief summary of the security posture of this release and the basis for the decision]

---

## Authorisation

This sign-off has been produced by the Release Manager Agent. Human authorisation is
required before deployment to production.

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Release Manager Agent | (automated) | — | [YYYY-MM-DD] |
| [CISO / Engineering Director / as per release policy] | | | |
