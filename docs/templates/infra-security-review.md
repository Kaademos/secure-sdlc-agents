# Infrastructure Security Review — [Feature / Release Name]

**Feature / Release:** [Description]
**Date:** [YYYY-MM-DD]
**Author:** Cloud/Platform Engineer Agent + [Human reviewer]
**Scope:** [IaC changes, new services, pipeline changes — list what was reviewed]
**Status:** Draft / Review / Approved

---

## Scope of Review

### Changes reviewed

| Change | Type | Files / Resources | Notes |
|--------|------|-------------------|-------|
| [e.g. New RDS instance] | Terraform | `infra/modules/db/main.tf` | |
| [e.g. New S3 bucket for uploads] | Terraform | `infra/storage/uploads.tf` | |
| [e.g. Updated ECS task definition] | Terraform | `infra/ecs/api.tf` | |

### Out of scope

[What was not reviewed and why — e.g. existing unchanged infrastructure, third-party managed services]

---

## Identity and Access Management

| Check | Status | Finding | Severity | Notes |
|-------|--------|---------|----------|-------|
| IAM roles follow least-privilege | ✅ Pass / ⚠️ Finding / 🚫 Fail | | | |
| No wildcard (`*`) permissions without justification | | | | |
| Service accounts / managed identities used (no long-lived keys) | | | | |
| MFA enforced on all human accounts with console access | | | | |
| Cross-account roles reviewed | | | | |

---

## Network Security

| Check | Status | Finding | Severity | Notes |
|-------|--------|---------|----------|-------|
| Security groups follow deny-by-default | ✅ Pass / ⚠️ Finding / 🚫 Fail | | | |
| No 0.0.0.0/0 ingress except LB ports 80/443 | | | | |
| Databases and internal services in private subnets | | | | |
| VPC flow logs enabled | | | | |
| WAF configured for public-facing endpoints | | | | |

---

## Data Security

| Check | Status | Finding | Severity | Notes |
|-------|--------|---------|----------|-------|
| Storage buckets / blobs private by default | ✅ Pass / ⚠️ Finding / 🚫 Fail | | | |
| Encryption at rest enabled | | | | |
| Encryption in transit enforced (TLS 1.2 minimum) | | | | |
| Database backup encryption and access controls in place | | | | |
| Data retention policy applied to new stores | | | | |

---

## Compute and Containers

| Check | Status | Finding | Severity | Notes |
|-------|--------|---------|----------|-------|
| Container images built from minimal, pinned base images | ✅ Pass / ⚠️ Finding / 🚫 Fail | | | |
| Images scanned for CVEs before deployment | | | | |
| Containers run as non-root | | | | |
| Read-only root filesystems where possible | | | | |
| Pod Security Standards enforced (Kubernetes) | | | | |
| Network policies applied (Kubernetes) | | | | |
| No privileged containers | | | | |

---

## Secrets Management

| Check | Status | Finding | Severity | Notes |
|-------|--------|---------|----------|-------|
| No secrets in environment variables, config files, or code | ✅ Pass / ⚠️ Finding / 🚫 Fail | | | |
| Secrets stored in approved secrets manager | | | | |
| Secret rotation policy defined and automated where possible | | | | |
| CI/CD uses short-lived credentials (OIDC where available) | | | | |

---

## Logging and Monitoring

| Check | Status | Finding | Severity | Notes |
|-------|--------|---------|----------|-------|
| Audit logs enabled and retained ≥ 90 days | ✅ Pass / ⚠️ Finding / 🚫 Fail | | | |
| Alerts configured for key security events | | | | |
| SIEM integration or log aggregation in place | | | | |
| Runtime threat detection enabled | | | | |

---

## CI/CD Pipeline Integrity

| Check | Status | Finding | Severity | Notes |
|-------|--------|---------|----------|-------|
| Build artefacts signed (SLSA / Sigstore / cosign) | ✅ Pass / ⚠️ Finding / 🚫 Fail | | | |
| SBOM generated | | | | |
| Third-party pipeline actions pinned to commit SHAs | | | | |
| Dependency versions pinned (no `latest` tags) | | | | |

---

## Findings Summary

| ID | Severity | Description | Resource | Recommendation | Status | Owner |
|----|----------|-------------|----------|----------------|--------|-------|
| IF-001 | CRITICAL / HIGH / MEDIUM / LOW | [Finding description] | [Terraform resource or ARN] | [What to fix] | Open / Mitigated | |

---

## Decisions and Accepted Deviations

Document any approved deviations from the standard checklist:

| Check | Deviation | Justification | Approver | Review date |
|-------|-----------|---------------|----------|-------------|
| | | | | |

---

## Sign-off

| Role | Name | Date | Status |
|------|------|------|--------|
| Cloud/Platform Engineer | | | Approved / Pending |
| Engineering Lead | | | Approved / Pending |
