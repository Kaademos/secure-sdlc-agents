# Example 02 — Public REST API Endpoint

A walkthrough of the agent team securing a new public-facing REST API endpoint, with a
focus on authentication, rate limiting, input validation, and the threat surface unique
to APIs exposed on the internet.

**Feature:** `GET /api/v1/users/{id}/profile` — authenticated user profile retrieval endpoint
**Stack:** Python (FastAPI), PostgreSQL, deployed on AWS ECS behind an ALB
**ASVS level:** L2
**New attack surface:** Public internet, requires API key + JWT auth

---

## What this example shows

- How the `product-manager` agent handles API-specific security requirements (V13 controls)
- How the `appsec-engineer` agent threat models an API endpoint with IDOR risk
- How the `cloud-platform-engineer` agent reviews WAF rules and ALB configuration
- How the `dev-lead` agent catches a missing object-level authorisation check in PR review
- How the `appsec-engineer` agent triages a DAST finding (IDOR via user ID manipulation)
- How all findings are tracked through to the release gate

---

## Step 1 — Plan: Secure requirements

**Invoke:**
```bash
claude --agent product-manager \
  "Define security requirements for a public REST API endpoint GET /api/v1/users/{id}/profile. \
   Users authenticate with JWT (Bearer token). Stack is Python FastAPI on AWS. Target ASVS L2. \
   This endpoint will be rate-limited and exposed on the internet."
```

**Output produced:** [`security-requirements.md`](security-requirements.md)

**Key requirements generated:**

| ID | Requirement | ASVS Ref | Priority |
|----|-------------|----------|----------|
| SR-001 | All requests require a valid JWT; 401 returned for missing or invalid tokens | V4.1.1 | MUST |
| SR-002 | Users may only retrieve their own profile; 403 returned for cross-user access | V4.2.1 | MUST |
| SR-003 | Rate limiting applied: 60 requests/minute per authenticated user | V13.2.5 | MUST |
| SR-004 | API returns only fields necessary for the profile view; no PII over-exposure | V8.3.1 | MUST |
| SR-005 | `{id}` path parameter validated as UUID format before database query | V5.1.3 | MUST |
| SR-006 | 404 returned for non-existent IDs (not 403) — avoids confirming whether a user exists | V8.3.4 | SHOULD |
| SR-007 | All API requests logged: timestamp, endpoint, user ID (hashed), response code, latency | V7.2.2 | MUST |
| SR-008 | API versioning in place; old versions have defined deprecation timeline | V13.2.1 | SHOULD |

**GRC note from product-manager:** SR-002 and SR-004 flagged to `grc-analyst` as they relate
to SOC 2 CC6.1 (access control) and GDPR Art. 5(1)(c) (data minimisation).

---

## Step 2 — Plan: Risk register

**Invoke:**
```bash
claude --agent grc-analyst \
  "Initialise risk register for the user profile API endpoint. Map to SOC 2 CC6 controls \
   and GDPR Art. 5. Identify risks specific to public API exposure."
```

**Output produced:** [`risk-register.md`](risk-register.md)

**Key risks identified:**
- R-001: Insecure Direct Object Reference (IDOR) — attacker accesses another user's profile by
  substituting their UUID — **CRITICAL**
- R-002: API enumeration — sequential or guessable user IDs allow bulk profile harvesting — **HIGH**
  *(mitigated by UUID v4 format for user IDs)*
- R-003: JWT replay attack — stolen token reused after expiry — **MEDIUM**
- R-004: Rate limit bypass via IP rotation — **MEDIUM**

---

## Step 3 — Design: Threat model

**Invoke:**
```bash
claude --agent appsec-engineer \
  "Threat model GET /api/v1/users/{id}/profile using STRIDE. Trust boundary: public internet \
   to ALB to ECS task to PostgreSQL. Authentication: JWT Bearer, validated in FastAPI \
   dependency. Data returned: display name, avatar URL, bio, join date."
```

**Output produced:** [`threat-model.md`](threat-model.md)

**Top threats:**

| ID | Category | Threat | Rating |
|----|----------|--------|--------|
| T-001 | Elevation of Privilege | Authenticated user queries another user's profile by substituting UUID in path | CRITICAL |
| T-002 | Info Disclosure | Error response reveals internal database structure on invalid UUID input | HIGH |
| T-003 | Denial of Service | No rate limiting — sustained request flood exhausts ECS task capacity | HIGH |
| T-004 | Spoofing | JWT not validated for `iss` and `aud` claims — tokens from other services accepted | HIGH |
| T-005 | Info Disclosure | Bio field stored and returned without sanitisation — stored XSS if rendered in browser | MEDIUM |

**AppSec recommendation to cloud-platform-engineer:** WAF rule required to block requests
with UUIDs containing SQL metacharacters (`'`, `--`, `;`) even though parameterised queries
are used, as defence-in-depth.

---

## Step 4 — Design: Infrastructure review

**Invoke:**
```bash
claude --agent cloud-platform-engineer \
  "Review the ALB and ECS configuration for the new profile API endpoint. Check: WAF rules \
   cover the new /api/v1/users/* path, rate limiting configured at ALB level, ECS task \
   has no over-privileged IAM role, RDS security group allows only ECS tasks."
```

**Output produced:** [`infra-security-review.md`](infra-security-review.md)

**Key findings:**
- IF-001 **HIGH**: ECS task IAM role has `rds:*` — should be scoped to `rds-db:connect` only
- IF-002 **MEDIUM**: WAF rate-based rule set to 1000 req/5min — too permissive; reduce to 300/5min
- IF-003 **INFO**: RDS security group correctly restricts to ECS security group only — no action needed

---

## Step 5 — Build: PR review

Developer submits PR #31 implementing the endpoint.

**Invoke:**
```bash
claude --agent dev-lead "Review PR #31 — GET /api/v1/users/{id}/profile implementation"
```

**Dev-lead findings:**

```
🚫 BLOCK: No object-level authorisation check.

The endpoint validates the JWT and extracts current_user.id, but then queries:

    user = db.query(User).filter(User.id == path_id).first()

It never checks that current_user.id == path_id. Any authenticated user can
retrieve any other user's profile by substituting their UUID.

Fix required before merge:

    if str(current_user.id) != path_id:
        raise HTTPException(status_code=403, detail="Forbidden")

This satisfies SR-002 and closes T-001 from the threat model.

⚠️ WARN: UUID validation is done with a try/except around uuid.UUID(path_id), but
the exception returns a 500. Should return 422 with a generic message.

✅ GOOD: Parameterised SQLAlchemy query used throughout — no injection risk.
✅ GOOD: Response schema uses a Pydantic model that excludes password_hash and
internal fields — data minimisation handled correctly.
```

**SAST scan (Semgrep) — no additional findings on this PR after dev-lead fix.**

---

## Step 6 — Test: DAST findings

OWASP ZAP authenticated scan run against staging.

**Invoke:**
```bash
claude --agent appsec-engineer \
  "Interpret these ZAP DAST findings for the profile API endpoint on staging: \
   1. IDOR: /api/v1/users/[other-uuid]/profile returned 200 with full profile data \
      when authenticated as a different user \
   2. Missing rate limiting headers — no X-RateLimit-* headers in response \
   3. Bio field reflected in response without encoding"
```

**Triage:**
- Finding 1: **CRITICAL** — Confirmed IDOR. The fix from PR #31 was not yet deployed to staging
  at time of scan. Re-test after deployment confirms fix — resolved.
- Finding 2: **LOW** — Rate limiting is enforced at ALB level but headers not propagated to
  response. Informational improvement for API consumers; not a security control gap.
- Finding 3: **INFO** — Bio is returned as raw JSON string. XSS risk is in the rendering client,
  not the API. Documented in risk register as client responsibility.

**Output produced:** [`test-security-report.md`](test-security-report.md)

---

## Step 7 — Release: Go/no-go

**Invoke:**
```bash
claude --agent release-manager "Run pre-release security checklist for v1.1.0-api-profile"
```

**Result:** ✅ GO
- IDOR (CRITICAL) confirmed resolved — re-test passed
- IAM role scoped (IF-001 HIGH) — resolved in IaC PR #33
- WAF rate limit adjusted (IF-002 MEDIUM) — resolved in IaC PR #33
- All ASVS L2 requirements for V4 and V13 satisfied
- GRC attestation produced covering SOC 2 CC6.1 and GDPR Art. 5

---

## Files in this example

| File | Produced by | Description |
|------|-------------|-------------|
| `security-requirements.md` | product-manager | ASVS L2 requirements for the API endpoint |
| `risk-register.md` | grc-analyst | Risk register with IDOR and enumeration risks |
| `threat-model.md` | appsec-engineer | STRIDE model — IDOR as top threat |
| `infra-security-review.md` | cloud-platform-engineer | ALB, WAF, ECS IAM review |
| `test-security-report.md` | appsec-engineer | DAST findings including confirmed IDOR |
| `release-sign-off.md` | release-manager | Go decision after all findings resolved |

---

## Key lesson from this example

The IDOR vulnerability (T-001 / R-001) was identified at threat modelling, caught again at
PR review, and then confirmed by DAST — three independent layers. The threat model gave the
developer-lead enough context to know exactly what to look for in the PR. Without it, the
IDOR might only have been caught by DAST, much later and at greater remediation cost.
