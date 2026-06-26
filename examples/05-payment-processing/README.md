# Example 05 — Payment Processing (PCI DSS SAQ A)

A walkthrough of the agent team securing a card-payment checkout. Payments combine a
**third-party trust boundary** (the payment service provider), a **redirect/callback flow**,
and a **compliance scope** (PCI DSS) in one feature. The single most valuable security
decision here is architectural: keep card data entirely off your servers so the system
qualifies for the lightest PCI obligation (SAQ A) instead of the full assessment.

**Feature:** Checkout — redirect to a hosted payment page, fulfil the order on a signed webhook
**Stack:** React + Node.js (Express) API, Stripe Checkout (redirect), Postgres for orders
**Compliance:** PCI DSS v4.0.1, validating to **SAQ A**
**Primary reference:** [PCI SSC — SAQ A 2025 updates](https://blog.pcisecuritystandards.org/important-updates-announced-for-merchants-validating-to-self-assessment-questionnaire-a)
**New attack surface:** `/checkout` session creation, `/webhooks/stripe`, the `success_url` redirect

---

## What this example shows

- How the `product-manager` agent makes the **PCI scoping decision** (redirect vs iframe vs
  self-hosted fields) the first requirement, because it determines every downstream control
- How the `appsec-engineer` agent threat models a webhook-driven fulfilment flow with STRIDE
- How the `dev-lead` agent catches the two classic payment bugs: trusting a client-supplied
  amount, and processing an **unverified webhook**
- How the `cloud-platform-engineer` agent scopes the PSP API keys and protects the webhook secret
- How the `grc-analyst` agent maps the design to SAQ A and applies the **2025 SAQ A changes**
- How the `release-manager` agent gates on webhook signature verification and idempotency

---

## Step 1 — Plan: Secure requirements (and the scoping decision)

**Invoke:**
```bash
claude --agent product-manager \
  "Define security requirements for a card-payment checkout. We want the lightest PCI DSS \
   scope possible. Stack is React + Node.js. We do not want card data touching our servers. \
   Target PCI DSS v4.0.1 SAQ A."
```

**Output produced:** [`security-requirements.md`](security-requirements.md)

**Key requirements generated:**

| ID | Requirement | Reference | Priority |
|----|-------------|-----------|----------|
| SR-001 | Cardholder data is **never** transmitted to, processed by, or stored on merchant servers — payment is fully outsourced via redirect to the PSP-hosted page | PCI DSS SAQ A eligibility | MUST |
| SR-002 | Use a **redirect** to the hosted payment page (not an embedded iframe) to avoid the 2025 SAQ A script-attack eligibility criterion | PCI SSC SAQ A 2025 | MUST |
| SR-003 | The charge **amount and currency are set server-side** from the catalogue/order — never read from the client | PCI DSS 6.2.4 / ASVS V5.1.1 | MUST |
| SR-004 | Order fulfilment is triggered **only** by a webhook whose signature is verified against the PSP signing secret | PCI DSS 6.2.4 | MUST |
| SR-005 | Webhook handling is **idempotent** — a replayed or duplicated event fulfils the order at most once | ASVS V11.1.4 | MUST |
| SR-006 | `success_url` / `cancel_url` validated against a server-side allow-list (no open redirect) | ASVS V5.1.5 | MUST |
| SR-007 | No PAN, CVV, full track, or `client_secret` is ever written to logs, error messages, or analytics | PCI DSS 3.3 / 3.4 | MUST |
| SR-008 | PSP API keys stored in a secrets manager; **restricted** keys used (least privilege), secret keys never shipped to the browser | PCI DSS 8.6 / ASVS V2.10 | MUST |
| SR-009 | Order/payment status endpoints enforce object-level authorisation (no IDOR on another user's order) | ASVS V4.2.1 | MUST |
| SR-010 | Payment events logged (order ID, PSP event ID, amount, outcome) — without any cardholder data | PCI DSS 10.2 | MUST |

**Product-manager note:** SR-001/SR-002 are the *scoping* requirements and must be settled
first — they decide whether the team validates to SAQ A (≈22 controls) or SAQ A-EP / full
PCI DSS (hundreds). Escalated to `grc-analyst` to confirm SAQ A eligibility under the 2025 rules.

---

## Step 2 — Plan: Risk register & PCI scope

**Invoke:**
```bash
claude --agent grc-analyst \
  "Initialise the risk register for a redirect-based card checkout using a hosted payment \
   page. Confirm PCI DSS SAQ A eligibility under the January 2025 SAQ A changes and map to \
   SOC 2 CC6 and PCI DSS Req 3, 4, 6, 10."
```

**Output produced:** [`risk-register.md`](risk-register.md)

**GRC scoping determination:**
- **SAQ A applies.** Card data is captured entirely on the PSP-hosted page reached by
  **redirect**, so the merchant site never receives, processes, or stores cardholder data.
- **2025 SAQ A changes accounted for:** Requirements 6.4.3, 11.6.1, and 12.3.1 were **removed**
  from SAQ A (effective 31 March 2025). The new "site not susceptible to script attacks"
  eligibility criterion applies **only to iframe-embedded** payment pages — because this
  design uses a **redirect**, that criterion does not apply. *(Choosing an iframe later would
  re-introduce it and the associated client-side-script controls.)*

**Key risks:**
- R-001: Webhook spoofing — attacker POSTs a fake `payment.succeeded` to fulfil an unpaid order — **CRITICAL**
- R-002: Amount tampering — client manipulates price and is charged less than the order value — **HIGH**
  *(mitigated by SR-003 — amount derived server-side from the order)*
- R-003: Webhook replay — a valid event is re-sent and the order ships twice — **HIGH**
- R-004: Scope creep — a future "card on file" feature pulls PAN onto merchant servers, breaking SAQ A — **HIGH** (watch item)
- R-005: Open redirect via attacker-controlled `success_url` after payment — **MEDIUM**

---

## Step 3 — Design: Threat model

**Invoke:**
```bash
claude --agent appsec-engineer \
  "Threat model the checkout flow using STRIDE. Flow: SPA → POST /checkout (server creates \
   a hosted payment session with a server-set amount) → redirect to PSP-hosted page → user \
   pays → PSP redirects to success_url AND sends a signed webhook to /webhooks/stripe → \
   server verifies signature, fulfils order idempotently. Focus on the webhook trust boundary."
```

**Output produced:** [`threat-model.md`](threat-model.md)

**Top threats:**

| ID | Category | Threat | Rating |
|----|----------|--------|--------|
| T-001 | Spoofing | `/webhooks/stripe` accepts any POST — an attacker forges `checkout.session.completed` and the order ships without payment | CRITICAL |
| T-002 | Tampering | Amount/currency taken from the client request when creating the session — user pays an attacker-chosen price | HIGH |
| T-003 | Replay | A genuine, correctly-signed webhook is re-delivered (or replayed) and fulfilment runs twice | HIGH |
| T-004 | Repudiation | Fulfilment driven by the browser hitting `success_url` instead of the webhook — user closes the tab and a paid order is never fulfilled (or a forged redirect fulfils an unpaid one) | HIGH |
| T-005 | Info Disclosure | Verbose PSP error or request body logged, leaking PAN fragments / secret keys | HIGH |
| T-006 | Elevation of Privilege | `GET /orders/:id` returns any order — IDOR exposes another customer's purchase and address | MEDIUM |

**Critical note from threat model:** Fulfilment MUST be driven by the **signature-verified
webhook**, never by the browser redirect to `success_url`. The redirect is a UX signal only —
it is attacker-controllable and unreliable. Treat the webhook as the single source of truth,
and verify its signature before reading the body (T-001).

---

## Step 4 — Build: PR review

Developer submits PR #71 implementing `/checkout` and `/webhooks/stripe`.

**Invoke:**
```bash
claude --agent dev-lead "Review PR #71 — checkout session creation and Stripe webhook"
```

**Dev-lead findings:**

```
🚫 BLOCK: Charge amount is taken from the request body (T-002 / SR-003).

    const session = await stripe.checkout.sessions.create({
      line_items: [{ price_data: { unit_amount: req.body.amount, ... }, quantity: 1 }],
    });

The client can pay any amount they like. Derive it server-side from the order:

    const order = await orders.findOwned(req.user.id, req.body.orderId);
    const amount = order.totalCents; // authoritative, server-side
    // ...unit_amount: amount

🚫 BLOCK: Webhook processed WITHOUT signature verification (T-001 / SR-004).

    app.post('/webhooks/stripe', express.json(), (req, res) => {
      const event = req.body;                 // anyone can POST this
      if (event.type === 'checkout.session.completed') fulfil(event);
      res.sendStatus(200);
    });

Verify the signature against the raw body and the signing secret BEFORE trusting it:

    app.post('/webhooks/stripe',
      express.raw({ type: 'application/json' }),   // raw body required for the HMAC
      (req, res) => {
        let event;
        try {
          event = stripe.webhooks.constructEvent(
            req.body, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);
        } catch {
          return res.sendStatus(400);              // bad/forged signature -> reject
        }
        // ...trusted from here
      });

🚫 BLOCK: No idempotency — a replayed event fulfils twice (T-003 / SR-005).

    Persist the PSP event id and no-op on repeats:

    if (await events.seen(event.id)) return res.sendStatus(200);
    await events.record(event.id);
    await fulfil(event);

⚠️ WARN: catch (err) { console.log(err) } on the checkout path may log the request body,
  which can include payment metadata — scrub before logging (SR-007).
✅ GOOD: Fulfilment is driven by the webhook, not the success_url redirect (T-004).
✅ GOOD: Stripe secret key read from env/secrets manager, never sent to the SPA (SR-008).
```

---

## Step 5 — Design: Infrastructure & key scoping

**Invoke:**
```bash
claude --agent cloud-platform-engineer \
  "Review the payment integration infra: Stripe API keys, the webhook secret, and logging. \
   Check keys are least-privilege, the webhook secret is in a secrets manager, TLS is \
   enforced on the webhook endpoint, and no cardholder data can reach logs."
```

**Output produced:** [`infra-security-review.md`](infra-security-review.md)

**Key findings:**
- IF-001 **HIGH**: A single unrestricted Stripe **secret** key is used for all operations.
  Replace with a **restricted** key scoped to Checkout Sessions + Webhooks only, so a leak
  cannot issue refunds or read the full customer ledger (SR-008).
- IF-002 **HIGH**: `STRIPE_WEBHOOK_SECRET` is committed in `docker-compose.yml`. Move to the
  secrets manager; rotate the exposed secret immediately.
- IF-003 **MEDIUM**: Application logs ship to a third-party aggregator with no redaction
  filter — add a scrubber that drops `card`, `payment_method`, and `*_secret` fields (SR-007).
- IF-004 **INFO**: Webhook endpoint allows plain HTTP on the internal load balancer hop —
  enforce TLS end-to-end so the signed payload cannot be observed/tampered in transit.

**IF-001 and IF-002 are blocking** — a leaked unrestricted key or committed webhook secret
defeats the entire trust model.

---

## Step 6 — Test: Security report

**Invoke:**
```bash
claude --agent appsec-engineer \
  "Triage these findings from testing the checkout flow on staging:
   1. POSTing a hand-crafted checkout.session.completed to /webhooks/stripe returned 400
   2. Re-sending a captured, validly-signed webhook a second time did NOT ship a 2nd order
   3. Setting success_url to https://evil.com/win returned a 302 to that URL after payment"
```

**Triage:**
- Finding 1: **Pass** — Signature verification rejects forged webhooks (T-001 closed).
- Finding 2: **Pass** — Idempotency on the PSP event id holds; replays are no-ops (T-003 closed).
- Finding 3: **MEDIUM** — Open redirect (T-005 / SR-006). `success_url` was echoed from the
  request. Restrict it to a server-side allow-list of paths on the merchant origin.

**Output produced:** [`test-security-report.md`](test-security-report.md)

---

## Step 7 — Release: Go/no-go gate + compliance attestation

**Invoke:**
```bash
claude --agent release-manager "Run pre-release security checklist for v1.4.0-checkout"
claude --agent grc-analyst "Produce the PCI DSS SAQ A attestation for v1.4.0-checkout"
```

**Initial result:** 🚫 NO-GO
- IF-002 (committed webhook secret) — not yet rotated/moved
- `success_url` open redirect — not yet restricted

**After rotating the secret, moving it to the secrets manager, and allow-listing success_url:**

**Final result:** ✅ GO — webhook signatures verified, fulfilment idempotent, amount set
server-side, card data confirmed out of scope (SAQ A), restricted keys in use, GRC SAQ A
attestation produced with no blocking gaps.

**Output produced:** [`release-sign-off.md`](release-sign-off.md), [`compliance-attestation.md`](compliance-attestation.md)

---

## Files in this example

| File | Produced by | Description |
|------|-------------|-------------|
| `security-requirements.md` | product-manager | PCI scoping + payment requirements (SAQ A) |
| `risk-register.md` | grc-analyst | Webhook spoofing, amount tampering, replay, scope creep |
| `threat-model.md` | appsec-engineer | STRIDE on the webhook fulfilment trust boundary |
| `infra-security-review.md` | cloud-platform-engineer | PSP key scoping, webhook secret, log redaction |
| `test-security-report.md` | appsec-engineer | Webhook spoofing/replay pass; open-redirect finding |
| `release-sign-off.md` | release-manager | Initial NO-GO, then GO after secret rotation |
| `compliance-attestation.md` | grc-analyst | PCI DSS v4.0.1 SAQ A attestation |

---

## Key lessons from this example

**Scope is a security control — decide it first.** Choosing a **redirect** to a hosted
payment page keeps cardholder data off your servers entirely, which is what makes the system
eligible for SAQ A (≈22 controls) instead of SAQ A-EP or full PCI DSS. The cheapest way to
secure card data is to never touch it.

**Redirect vs iframe is a compliance fork, not just UX.** Under the January 2025 SAQ A update,
requirements 6.4.3, 11.6.1, and 12.3.1 were removed from SAQ A — but a new eligibility
criterion (your site is "not susceptible to script attacks") applies to merchants who
**embed** the payment page in an **iframe**. A pure redirect avoids that criterion; an iframe
re-introduces client-side-script management obligations. Pick deliberately.

**The webhook is the source of truth — verify it before you trust it.** Never fulfil an order
based on the browser landing on `success_url`; that redirect is attacker-controllable. Fulfil
only on a webhook whose signature you have verified against the signing secret, computed over
the **raw** request body. And make it idempotent on the PSP event id so a replay ships nothing twice.

**Never trust a client-supplied amount.** The price, currency, and line items must be derived
server-side from the order record. A checkout that reads `amount` from the request lets the
customer set their own price.
