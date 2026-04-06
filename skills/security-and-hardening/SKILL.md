---
name: security-and-hardening
description: >
  Use when writing or reviewing code that handles user input, authentication, access
  control, cryptography, error handling, file uploads, or dependency management.
  Also activates when a pull request touches any security-sensitive component.
---

# Security and Hardening

## Overview

This skill enforces the secure coding standards and PR review discipline that prevent
the most common vulnerability classes from reaching production. It covers OWASP Top 10
categories, ASVS control requirements, and the review process that catches issues before
they merge — not after they breach.

## When to Use

- Any code handling user-supplied input (forms, APIs, file uploads, query params)
- Authentication, session management, or access control changes
- Cryptographic operations — hashing, encryption, key management
- Dependency additions or upgrades
- Pull request review on any security-sensitive component
- SAST finding triage and remediation

## Process

### Step 1 — Classify the security surface

Before reviewing, identify which categories are in scope:

| Surface | Key risks |
|---|---|
| Input handling | Injection (SQL, LDAP, OS command, template, XSS) |
| Authentication | Weak passwords, missing MFA, session fixation |
| Access control | IDOR, broken object-level auth, privilege escalation |
| Cryptography | Weak algorithms, hardcoded keys, improper key storage |
| File handling | Path traversal, type confusion, SVG XSS, unrestricted upload |
| Dependencies | Known CVEs, unmaintained packages, licence risk |
| Error handling | Stack trace leakage, verbose error messages |

### Step 2 — Apply the PR security checklist

- [ ] No hardcoded secrets, API keys, or credentials anywhere in the diff
- [ ] All user-controlled inputs validated server-side (type, length, format, range)
- [ ] SQL/NoSQL queries use parameterised statements — no string concatenation with input
- [ ] Object-level authorisation checks present (not just resource-type checks)
- [ ] New dependencies reviewed: CVE status, maintenance activity, licence, download count
- [ ] Error messages returned to the client are generic; detail is server-side only
- [ ] Log entries do not include PII, credentials, session tokens, or payment data
- [ ] Cryptographic operations use approved algorithms (AES-256-GCM, Argon2id, SHA-256+)
- [ ] File upload handlers validate MIME type, magic bytes, size, and destination path
- [ ] ASVS requirements from `docs/security-requirements.md` are satisfied

### Step 3 — Severity-gate the findings

| Severity | Action |
|---|---|
| **CRITICAL** | Block merge immediately. No exceptions. Fix and re-review. |
| **HIGH** | Block merge unless risk is formally accepted with CISO sign-off. |
| **MEDIUM** | Must have fix or accepted-risk entry in risk register before release. |
| **LOW / INFO** | Track in risk register. Does not block. |

### Step 4 — Structure the review output

```markdown
## Security Review: PR #[N] — [Title]

### CRITICAL / HIGH — Block merge
- [Issue]: [Plain English description + CWE reference + concrete fix]

### MEDIUM — Fix before release
- [Issue]: [Description + remediation suggestion]

### Positive observations
- [Good security practice observed — reinforce it]
```

### Step 5 — Verify the fix

After remediation:
1. Confirm the root cause is fixed, not just the symptom.
2. Confirm a regression test exists that would catch the same issue in future.
3. For CRITICAL/HIGH: re-review the changed lines before marking resolved.
4. Update `docs/sast-findings.md` with the resolution status.

## Common Rationalizations

| Excuse | Counter |
|---|---|
| "It's internal-only, not a real risk" | Internal endpoints are breached via SSRF, pivot attacks, and insider threat. Internal ≠ safe. |
| "I'll add input validation later" | Injection vulnerabilities are introduced at write time. "Later" is too late once it ships. |
| "The ORM handles SQL injection" | ORMs do not protect against raw queries, JSON operators, or second-order injection. Verify. |
| "We'll rotate the hardcoded key before production" | Keys committed to git are already compromised. Rotate now; remove from history. |
| "This dependency vulnerability isn't reachable" | Reachability analysis is hard. Upgrade unless you can prove the affected code path is never hit. |
| "The client validates it too" | Client-side validation is UX. Server-side validation is security. Both are required. |

## Red Flags

- A function accepts user input and builds a query, command, or markup string by concatenation
- Password storage using MD5, SHA-1, SHA-256 alone (without bcrypt/Argon2id/scrypt)
- Any `eval()`, `exec()`, `subprocess.run(shell=True)` with user-controlled data
- File path constructed from user input without strict allowlisting
- `Authorization` header or session token logged anywhere
- A new npm/pip/gem package added without a comment explaining what it does and why
- `catch (e) {}` — swallowed errors that may be masking a security event

## Verification

Do not close this review until:

- [ ] All CRITICAL and HIGH findings have a confirmed fix or documented accepted risk
- [ ] The fix has been re-reviewed at the code level (not just "looks good")
- [ ] Regression tests exist for any vulnerability classes found
- [ ] `docs/sast-findings.md` is updated with finding status
- [ ] `docs/risk-register.md` is updated if any risk was accepted
