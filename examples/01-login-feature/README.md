# Example 01 — Login Feature (ASVS L2)

A complete walkthrough of the Secure SDLC agent team collaborating on a greenfield
user authentication feature. Shows the full lifecycle from requirements to release gate.

**Feature:** Username/password login with MFA support
**Stack:** Node.js API, PostgreSQL, React frontend
**ASVS level:** L2

---

## What this example shows

- How the `product-manager` agent maps login feature requirements to ASVS controls
- How the `appsec-engineer` agent runs a STRIDE threat model against the auth flow
- How the `grc-analyst` agent maps controls to SOC 2 and ISO 27001
- How the `dev-lead` agent reviews a PR that implements password hashing
- How the `appsec-engineer` agent triages a SAST finding (hardcoded JWT secret)
- How the `release-manager` agent runs the go/no-go gate

---

## Step 1 — Plan: Secure requirements

**Invoke:**
```bash
claude --agent product-manager \
  "Define security requirements for a username/password login feature with optional TOTP-based \
   MFA. Users are consumers. Stack is Node.js + PostgreSQL. Target ASVS L2."
```

**Output produced:** [`security-requirements.md`](security-requirements.md)

**Key requirements generated:**
- SR-001: Passwords stored using bcrypt with cost factor ≥ 12 (ASVS V2.4.1)
- SR-002: Account lockout after 5 failed attempts, 15-minute lockout (ASVS V2.2.1)
- SR-003: Login does not reveal whether username or password was incorrect (ASVS V2.5.4)
- SR-004: TOTP-based MFA supported; backup codes generated and stored hashed (ASVS V2.8.3)
- SR-005: Session tokens invalidated immediately on logout (ASVS V3.3.1)
- SR-006: All auth events logged: timestamp, IP, user ID (hashed), outcome (ASVS V7.2.1)
- SR-007: CSRF protection on login form submission (ASVS V4.2.2)

---

## Step 2 — Plan: Risk register initialisation

**Invoke:**
```bash
claude --agent grc-analyst \
  "Initialise the risk register for the login feature. Map security requirements to \
   SOC 2 and ISO 27001 controls."
```

**Output produced:** [`risk-register.md`](risk-register.md)

**Key risks identified:**
- R-001: Credential stuffing attack — HIGH
- R-002: Session fixation — HIGH
- R-003: MFA bypass via backup code brute force — MEDIUM
- R-004: Password reset flow not yet in scope, leaving account recovery insecure — HIGH (deferred)

---

## Step 3 — Design: Threat model

**Invoke:**
```bash
claude --agent appsec-engineer \
  "Threat model the login feature architecture using STRIDE. Architecture: browser → \
   HTTPS → Node.js API → PostgreSQL. JWT tokens issued on success, stored in httpOnly \
   cookie. TOTP verified against stored secret."
```

**Output produced:** [`threat-model.md`](threat-model.md)

**Top threats identified:**
- T-001: JWT secret hardcoded in environment variable file committed to repo (CRITICAL)
- T-002: TOTP secret stored in plaintext in database (HIGH)
- T-003: No rate limiting on /auth/login endpoint (HIGH)
- T-004: JWT algorithm not explicitly validated — alg:none attack possible (HIGH)

---

## Step 4 — Build: PR review

The developer submits PR #17 implementing the login endpoint.

**Invoke:**
```bash
claude --agent dev-lead "Review PR #17 — login endpoint implementation"
```

**Dev-lead findings:**
- 🚫 BLOCK: `bcrypt.hash(password, 10)` — cost factor 10 is below the required 12 (SR-001)
- 🚫 BLOCK: Generic `catch(err) { res.json({ error: err.message }) }` leaks stack traces
- ⚠️ WARN: `console.log('Login attempt:', email)` — PII logged in plaintext
- ✅ GOOD: Parameterised queries used throughout, no SQL injection risk

---

## Step 5 — Build: SAST triage

SAST scan (Semgrep) produces 3 findings on the PR.

**Invoke:**
```bash
claude --agent appsec-engineer \
  "Triage these SAST findings for PR #17:
   1. semgrep/hardcoded-secret: JWT_SECRET='dev-secret-123' in .env.example
   2. semgrep/jwt-none-alg: jwt.verify() called without algorithms option
   3. semgrep/timing-attack: string comparison used for token verification"
```

**AppSec triage:**
- Finding 1: **CRITICAL** — Confirmed. `.env.example` committed with real-looking secret.
  Rotate immediately even on a dev branch. Move to secrets manager.
- Finding 2: **HIGH** — Confirmed. Add `{ algorithms: ['HS256'] }` to all jwt.verify() calls.
- Finding 3: **HIGH** — Confirmed. Use `crypto.timingSafeEqual()` for all token comparisons.

---

## Step 6 — Test: Security report

After DAST run with OWASP ZAP:

**Invoke:**
```bash
claude --agent appsec-engineer \
  "Interpret these ZAP findings for the login feature staging environment: [paste findings]"
```

**Output produced:** [`test-security-report.md`](test-security-report.md)

---

## Step 7 — Release: Go/no-go gate

**Invoke:**
```bash
claude --agent release-manager "Run pre-release security checklist for v1.0.0-login"
```

**Result:** ✅ GO — all CRITICAL and HIGH findings resolved, risk register up to date,
GRC attestation produced, no blocking compliance gaps.

**Output produced:** [`release-sign-off.md`](release-sign-off.md)

---

## Files in this example

| File | Produced by | Description |
|------|-------------|-------------|
| `security-requirements.md` | product-manager | ASVS L2 requirements for the login feature |
| `risk-register.md` | grc-analyst | Initial risk register with SOC 2 / ISO 27001 mapping |
| `threat-model.md` | appsec-engineer | STRIDE threat model for the auth flow |
| `test-security-report.md` | appsec-engineer | DAST findings summary |
| `release-sign-off.md` | release-manager | Final go/no-go decision |
