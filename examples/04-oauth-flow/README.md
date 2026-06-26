# Example 04 — OAuth 2.0 / OIDC "Sign in with Google"

A walkthrough of the agent team securing a social-login feature built on the OAuth 2.0
authorization-code flow with OIDC. OAuth introduces a **third-party trust boundary** (the
Identity Provider) and a browser redirect dance, which is where most real-world breaches
happen: `redirect_uri` manipulation, authorization-code injection, and CSRF on the callback.

**Feature:** "Sign in with Google" (OpenID Connect, authorization-code + PKCE)
**Stack:** React SPA + Node.js (Express) API, Google as the Identity Provider (IdP)
**ASVS level:** L2 (ASVS 5.0 V10 — OAuth and OIDC)
**Primary reference:** [RFC 9700 — OAuth 2.0 Security Best Current Practice](https://www.rfc-editor.org/info/rfc9700/) (Jan 2025)
**New attack surface:** `/auth/login` redirect, `/auth/callback` endpoint, the IdP trust boundary

---

## What this example shows

- How the `product-manager` agent turns "let users log in with Google" into OAuth-specific
  security requirements anchored to ASVS and RFC 9700
- How the `appsec-engineer` agent threat models a redirect-based trust boundary with STRIDE
- How the `dev-lead` agent catches the three classic OAuth bugs in PR review:
  loose `redirect_uri` matching, a missing `state` parameter, and a skipped PKCE check
- How the `appsec-engineer` agent triages an authorization-code injection finding
- How the `grc-analyst` agent records third-party processor risk (the IdP)
- How the `release-manager` agent gates on full ID-token validation

---

## Step 1 — Plan: Secure requirements

**Invoke:**
```bash
claude --agent product-manager \
  "Define security requirements for a 'Sign in with Google' feature using the OAuth 2.0 \
   authorization-code flow with OIDC. React SPA (public client) + Node.js API. Target \
   ASVS L2 and follow RFC 9700 (OAuth Security BCP)."
```

**Output produced:** [`security-requirements.md`](security-requirements.md)

**Key requirements generated:**

| ID | Requirement | Reference | Priority |
|----|-------------|-----------|----------|
| SR-001 | Use the authorization-code flow — the implicit (`token`) and ROPC (`password`) grants are prohibited | ASVS V10.4.4 | MUST |
| SR-002 | `redirect_uri` validated against a pre-registered, client-specific allow-list using **exact string comparison** — no wildcards, no prefix/substring matching | ASVS V10.4.1 | MUST |
| SR-003 | PKCE used on every authorization request with `code_challenge_method=S256` (never `plain`) — the SPA is a public client | ASVS V10.4.6 | MUST |
| SR-004 | A cryptographically random, single-use `state` (or PKCE) value, unguessable and bound to the user-agent session, verified on callback (CSRF defence) | ASVS V10.2.1, V10.1.2 | MUST |
| SR-005 | OIDC `nonce` generated, sent, and verified against the ID token's `nonce` claim to prevent ID-token replay | ASVS V10.5.1 | MUST |
| SR-006 | ID token validated: signature (JWKS), `iss`, `exp`, and `aud` equal to this client's `client_id` | ASVS V10.5.4 | MUST |
| SR-007 | The `code` is exchanged for tokens **server-side** via an authenticated confidential-client backchannel request; tokens never exposed to the SPA | ASVS V10.4.10 | MUST |
| SR-008 | The authorization code is single-use and short-lived (≤ 10 min at L2); reused codes are rejected and related tokens revoked | ASVS V10.4.2, V10.4.3 | MUST |
| SR-009 | Account linking keys on the IdP `iss`+`sub` (stable, non-reassignable identifiers), not on email; require `email_verified=true` before associating | ASVS V10.3.3 | MUST |
| SR-010 | Session cookie issued after login is `Secure` + `HttpOnly` + `SameSite`; all auth events (success **and** failure) logged with metadata (outcome, IdP, `sub` hashed, timestamp, IP) and no tokens in cleartext | ASVS V3.3.1, V3.3.2, V3.3.4 (cookie); V16.3.1, V16.2.1, V16.2.5 (logging) | MUST |

**Product-manager note:** SR-002 and SR-004 are the two requirements that, if skipped, turn
this feature into an account-takeover vector. Escalated to `appsec-engineer` to threat model
the callback explicitly.

---

## Step 2 — Plan: Risk register

**Invoke:**
```bash
claude --agent grc-analyst \
  "Initialise the risk register for a 'Sign in with Google' feature. Treat Google as a \
   third-party identity processor. Map to SOC 2 CC6.1 and ISO 27001 A.5.17."
```

**Output produced:** [`risk-register.md`](risk-register.md)

**Key risks:**
- R-001: `redirect_uri` manipulation — attacker redirects the authorization code to a host they control — **CRITICAL**
- R-002: Authorization-code injection — attacker replays a stolen/forged code into a victim session — **CRITICAL**
  *(mitigated by SR-003 PKCE — the code is useless without the original `code_verifier`)*
- R-003: Login CSRF — attacker forces a victim to log into the attacker's account via a missing `state` check — **HIGH**
- R-004: ID-token confusion — token issued for a different `aud` accepted by the API — **HIGH**
- R-005: Third-party (IdP) outage or compromise — no local fallback authentication path — **MEDIUM** (accepted, see R-005 in register)

---

## Step 3 — Design: Threat model

**Invoke:**
```bash
claude --agent appsec-engineer \
  "Threat model the OAuth login flow using STRIDE. Flow: SPA → /auth/login (generates \
   state + PKCE) → redirect to Google → user consents → Google redirects to /auth/callback \
   with code → API exchanges code+code_verifier for tokens → validates ID token → issues \
   session cookie. Focus on the redirect_uri and callback trust boundary."
```

**Output produced:** [`threat-model.md`](threat-model.md)

**Top threats:**

| ID | Category | Threat | Rating |
|----|----------|--------|--------|
| T-001 | Spoofing | Loose `redirect_uri` matching (`startsWith`, wildcard subdomain) lets the IdP send the code to `https://app.example.com.evil.com` | CRITICAL |
| T-002 | Tampering | Authorization-code injection — code captured from logs/referrer is replayed into the attacker's session without PKCE | CRITICAL |
| T-003 | Spoofing | Missing/optional `state` enables login CSRF — victim is silently logged into the attacker's Google account | HIGH |
| T-004 | Elevation of Privilege | API trusts an ID token without checking `aud` — a token minted for another client is accepted (mix-up attack) | HIGH |
| T-005 | Info Disclosure | `code`/`access_token` placed in the URL fragment or query and leaked via `Referer` header or browser history | HIGH |
| T-006 | Spoofing | Account-linking by email without `email_verified` lets an attacker pre-register a victim's email and hijack the linked account | HIGH |

**Critical note from threat model:** `redirect_uri` validation MUST be exact string comparison
against a client-specific allow-list (ASVS V10.4.1; RFC 9700). The only sanctioned exception
is varying ports on `localhost` for native apps — which does **not** apply to this web app.
Reject anything that is not byte-for-byte equal to a registered URI.

---

## Step 4 — Build: PR review

Developer submits PR #58 implementing `/auth/login` and `/auth/callback`.

**Invoke:**
```bash
claude --agent dev-lead "Review PR #58 — Google OAuth login and callback endpoints"
```

**Dev-lead findings:**

```
🚫 BLOCK: redirect_uri validated with startsWith — open to subdomain/suffix abuse.

    const ok = redirectUri.startsWith('https://app.example.com');
    // matches https://app.example.com.evil.com AND https://app.example.com/../x

Exact-match against a fixed allow-list (ASVS V10.4.1 / SR-002):

    const ALLOWED_REDIRECTS = new Set(['https://app.example.com/auth/callback']);
    if (!ALLOWED_REDIRECTS.has(redirectUri)) {
      return res.status(400).json({ error: 'invalid_request' });
    }

🚫 BLOCK: No `state` verification on the callback (SR-004 / T-003).

    // /auth/callback reads `code` but never checks `state`
    const { code } = req.query;

The login step must generate a random state, store it in the session, and the
callback must compare in constant time and then delete it (single use):

    // /auth/login
    const state = crypto.randomBytes(32).toString('base64url');
    req.session.oauthState = state;
    // /auth/callback
    if (!req.query.state || req.query.state !== req.session.oauthState) {
      return res.status(400).json({ error: 'invalid_state' });
    }
    delete req.session.oauthState;

🚫 BLOCK: PKCE code_verifier generated but never sent to the token endpoint (SR-003).

    // token exchange omits code_verifier — PKCE provides zero protection
    const body = { code, grant_type: 'authorization_code', redirect_uri, client_id };

Add the stored verifier so the IdP can bind the code to this client (T-002):

    body.code_verifier = req.session.pkceVerifier;

⚠️ WARN: ID token decoded with jwt.decode() (no signature check) before validation.
  Use the IdP JWKS and verify signature, iss, aud, exp, and nonce (SR-006 / T-004).
✅ GOOD: Token exchange happens server-side; tokens are never returned to the SPA (SR-007).
```

---

## Step 5 — Build: SAST triage

SAST scan (Semgrep) produces 2 findings on the PR.

**Invoke:**
```bash
claude --agent appsec-engineer \
  "Triage these SAST findings for PR #58:
   1. semgrep/jwt-decode-without-verify: jwt.decode(idToken) used before validation
   2. semgrep/insecure-randomness: Math.random() used to generate the state value"
```

**AppSec triage:**
- Finding 1: **HIGH** — Confirmed (T-004). `jwt.decode()` does not verify the signature.
  Replace with `jwtVerify(idToken, JWKS, { issuer, audience })` and assert `nonce` matches
  the value stored at login. An unverified token lets an attacker forge `sub`/`email`.
- Finding 2: **HIGH** — Confirmed (T-003). `Math.random()` is not cryptographically secure,
  so `state` becomes predictable. Use `crypto.randomBytes(32)`. Same applies to the PKCE
  `code_verifier` and the OIDC `nonce`.

**Output produced:** [`sast-findings.md`](sast-findings.md)

---

## Step 6 — Test: Manual security testing

**Invoke:**
```bash
claude --agent appsec-engineer \
  "Triage these findings from manual testing of the OAuth flow on staging:
   1. Changing redirect_uri to https://app.example.com.attacker.com returned a 302 to Google
   2. Replaying a captured ?code= in a fresh session without code_verifier returned 400
   3. Removing the state parameter on /auth/callback still logged the user in"
```

**Triage:**
- Finding 1: **CRITICAL** — The exact-match allow-list (SR-002) was deployed to the token
  endpoint but the **authorization request builder** still echoed a client-supplied
  `redirect_uri`. Pin `redirect_uri` to a server-side constant; never read it from the request.
- Finding 2: **Pass** — PKCE is working. Without the original `code_verifier`, the IdP
  rejects the code exchange (T-002 closed).
- Finding 3: **HIGH** — `state` was validated only when present. Make it mandatory: a
  callback with no `state` must fail closed (T-003).

**Output produced:** [`test-security-report.md`](test-security-report.md)

---

## Step 7 — Release: Go/no-go gate

**Invoke:**
```bash
claude --agent release-manager "Run pre-release security checklist for v1.3.0-oauth-login"
```

**Initial result:** 🚫 NO-GO
- redirect_uri CRITICAL (request builder echoed client value) — not yet resolved
- `state` made mandatory but fix not yet deployed to staging

**After pinning redirect_uri server-side and failing closed on missing state:**

**Final result:** ✅ GO — `redirect_uri` exact-matched, PKCE + `state` + `nonce` enforced,
ID token fully validated (signature/iss/aud/exp/nonce), tokens kept server-side, IdP
third-party risk recorded and accepted by GRC.

**Output produced:** [`release-sign-off.md`](release-sign-off.md)

---

## Files in this example

| File | Produced by | Description |
|------|-------------|-------------|
| `security-requirements.md` | product-manager | OAuth/OIDC requirements (ASVS 5.0 V10 + RFC 9700) |
| `risk-register.md` | grc-analyst | redirect_uri, code injection, login CSRF, IdP risk |
| `threat-model.md` | appsec-engineer | STRIDE on the redirect/callback trust boundary |
| `sast-findings.md` | appsec-engineer | Unverified ID token + insecure randomness triage |
| `test-security-report.md` | appsec-engineer | redirect_uri bypass found and resolved |
| `release-sign-off.md` | release-manager | Initial NO-GO, then GO after redirect_uri fix |

---

## Key lessons from this example

**`redirect_uri` must be an exact string match.** This is the single most important OAuth
control (ASVS V10.4.1; RFC 9700). `startsWith`, regex, and wildcard-subdomain matching are all
bypassable. Register the full callback URI and compare for byte-for-byte equality — and pin
it server-side so a request can never influence it. The only sanctioned exception is
`localhost` port variation for native apps, which does not apply to web apps.

**PKCE is not just for mobile.** ASVS V10.4.6 and RFC 9700 require PKCE (with `S256`) for all
public clients — a browser SPA is public — and recommend it even for confidential clients.
PKCE is what neutralises authorization-code injection: a stolen code is worthless without the
original `code_verifier`.

**`state` and `nonce` are different controls — you need both.** `state` defends the callback
against CSRF (was this redirect tied to *my* login attempt?). `nonce` defends the ID token
against replay (was this token minted for *this* request?). Validate each, and fail closed if
either is missing.

**The IdP is a third party in your trust boundary.** Google issuing a valid token does not
make the *user* trusted. Always validate `iss`, `aud`, `exp`, and the token signature against
the IdP's JWKS, and require `email_verified` before linking to an existing local account.
