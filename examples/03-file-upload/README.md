# Example 03 — File Upload Feature

A walkthrough of the agent team securing a user file upload feature. File handling is one
of the highest-risk feature types — it combines path traversal, malware, content-type
confusion, storage misconfiguration, and denial-of-service risk in a single surface.

**Feature:** Users can upload a profile picture (image files only, max 5MB)
**Stack:** Node.js (Express), AWS S3 for storage, CloudFront CDN for delivery
**ASVS level:** L2
**New attack surface:** File upload endpoint, S3 bucket, CDN origin

---

## What this example shows

- How the `product-manager` agent handles file-upload-specific ASVS controls (V12)
- How the `appsec-engineer` agent threat models a file upload and storage flow
- How the `cloud-platform-engineer` agent reviews S3 bucket policy and CloudFront config
- How the `dev-lead` agent catches a content-type trust vulnerability in PR review
- How the `appsec-engineer` agent triages a DAST finding (stored XSS via SVG upload)
- How a CRITICAL finding near release is handled without delaying the ship date

---

## Step 1 — Plan: Secure requirements

**Invoke:**
```bash
claude --agent product-manager \
  "Define security requirements for a profile picture upload feature. Users upload images \
   (JPEG, PNG, WebP only), max 5MB, stored in S3, served via CloudFront. Target ASVS L2."
```

**Output produced:** [`security-requirements.md`](security-requirements.md)

**Key requirements generated:**

| ID | Requirement | ASVS Ref | Priority |
|----|-------------|----------|----------|
| SR-001 | File type validated by content inspection (magic bytes), not only MIME type or extension | V12.1.1 | MUST |
| SR-002 | Accepted formats: JPEG, PNG, WebP only. All others rejected with 400 | V12.1.2 | MUST |
| SR-003 | Maximum file size enforced server-side at 5MB; client-side limit is UX only | V12.1.3 | MUST |
| SR-004 | Uploaded files stored with a random, non-guessable filename — never the original name | V12.3.1 | MUST |
| SR-005 | Files stored in a private S3 bucket; served via pre-signed URLs or CloudFront with signed cookies | V12.3.3 | MUST |
| SR-006 | Uploaded files served from a separate domain or subdomain to prevent same-origin attacks | V12.3.4 | MUST |
| SR-007 | Malware scanning performed before file is made accessible to other users | V12.2.1 | MUST |
| SR-008 | Image files re-encoded server-side before storage to strip embedded metadata and payloads | V12.1.1 | SHOULD |
| SR-009 | Upload rate limiting: max 10 uploads per user per hour | V12.1.4 | MUST |
| SR-010 | Audit log: file upload events logged with user ID (hashed), file hash, timestamp, outcome | V7.2.1 | MUST |

**Product-manager note:** SR-007 (malware scanning) and SR-008 (re-encoding) flagged as
dependencies — if not in place at launch, CRITICAL risk. Escalated to `appsec-engineer`
and `cloud-platform-engineer` to confirm implementation before release gate.

---

## Step 2 — Plan: Risk register

**Invoke:**
```bash
claude --agent grc-analyst \
  "Initialise risk register for the file upload feature. Include storage, CDN, and \
   processing risks. Map to SOC 2 CC6 and ISO 27001 A.8.25 (secure development)."
```

**Output produced:** [`risk-register.md`](risk-register.md)

**Key risks:**
- R-001: Malicious file upload — attacker uploads file with embedded payload, served to other users — **CRITICAL**
- R-002: Path traversal — manipulated filename allows writing outside intended directory — **HIGH**
  *(mitigated by SR-004 — random filenames generated server-side, original name discarded)*
- R-003: Public S3 bucket misconfiguration — uploaded files world-readable — **CRITICAL**
- R-004: Denial of service via large file uploads — **MEDIUM**
- R-005: Metadata leakage — EXIF data in images exposes GPS location or device info — **MEDIUM**

---

## Step 3 — Design: Threat model

**Invoke:**
```bash
claude --agent appsec-engineer \
  "Threat model the file upload flow using STRIDE. Flow: browser → POST /api/upload → \
   Node.js validation → S3 upload → Lambda malware scan → CloudFront delivery. \
   Re-encoding via Sharp library."
```

**Output produced:** [`threat-model.md`](threat-model.md)

**Top threats:**

| ID | Category | Threat | Rating |
|----|----------|--------|--------|
| T-001 | Tampering | SVG file uploaded with embedded JavaScript — served as image, executes in browser | CRITICAL |
| T-002 | Tampering | Polyglot file passes JPEG magic byte check but contains PHP payload — executes on server if processed | HIGH |
| T-003 | Info Disclosure | EXIF GPS metadata in JPEG exposes user's location to anyone who downloads the file | HIGH |
| T-004 | Elevation of Privilege | Pre-signed URL generated with excessive TTL (days not minutes) — allows persistent access after account deletion | MEDIUM |
| T-005 | Denial of Service | Malformed image triggers Sharp library crash or infinite loop — no timeout set | MEDIUM |

**Critical note from threat model:** SVG must be explicitly blocked (T-001). SVG is XML and
can contain `<script>` tags — it cannot be safely sanitised. Content-type `image/svg+xml`
must be added to the rejected list even though browsers treat it as an image.

---

## Step 4 — Design: Infrastructure review

**Invoke:**
```bash
claude --agent cloud-platform-engineer \
  "Review S3 bucket policy, CloudFront distribution, and Lambda malware scanner config \
   for the file upload feature. Check: bucket is private, CloudFront uses OAC not OAI, \
   Lambda has only s3:GetObject and s3:PutObjectTagging, malware scanner is integrated."
```

**Output produced:** [`infra-security-review.md`](infra-security-review.md)

**Key findings:**
- IF-001 **CRITICAL**: S3 bucket `Block Public Access` setting disabled at account level —
  new bucket inherits permissive default. Must enable explicitly on the bucket.
- IF-002 **HIGH**: CloudFront distribution has no geo-restriction and no signed URL/cookie
  requirement — files are publicly accessible without authentication once URL is known.
- IF-003 **MEDIUM**: Lambda malware scanner has `s3:*` on the uploads bucket — should be
  scoped to `s3:GetObject` and `s3:PutObjectTagging` only.
- IF-004 **INFO**: CloudFront origin using OAI (legacy) — should migrate to OAC. Not a
  blocking finding but should be remediated in next sprint.

**IF-001 and IF-002 are blocking** — feature cannot be released with these configurations.

---

## Step 5 — Build: PR review

Developer submits PR #44 implementing the upload endpoint.

**Invoke:**
```bash
claude --agent dev-lead "Review PR #44 — file upload endpoint"
```

**Dev-lead findings:**

```
🚫 BLOCK: Content-type validation trusts the client-supplied MIME type.

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ error: 'Invalid file type' });
    }

`req.file.mimetype` in multer comes from the Content-Type header of the
multipart field — it is entirely attacker-controlled. An SVG file named
photo.jpg with Content-Type: image/jpeg passes this check.

Fix: use the `file-type` library to read the actual magic bytes:

    import { fileTypeFromBuffer } from 'file-type';
    const type = await fileTypeFromBuffer(req.file.buffer);
    if (!type || !['image/jpeg', 'image/png', 'image/webp'].includes(type.mime)) {
      return res.status(400).json({ error: 'Invalid file type' });
    }

This satisfies SR-001 and closes T-001 and T-002 from the threat model.

🚫 BLOCK: Original filename used as S3 key with a prefix:

    const s3Key = `avatars/${req.file.originalname}`;

Generates predictable, guessable URLs and retains attacker-controlled
path components. Replace with:

    import { randomUUID } from 'crypto';
    const ext = type.ext; // from file-type, not original filename
    const s3Key = `avatars/${randomUUID()}.${ext}`;

✅ GOOD: File size limit enforced in multer config (5MB) — server-side.
✅ GOOD: Sharp re-encoding implemented — strips EXIF data, closes T-003.
⚠️ WARN: No timeout set on Sharp processing — add a 10-second timeout to
  prevent DoS via malformed image (T-005).
```

---

## Step 6 — Test: DAST findings

**Invoke:**
```bash
claude --agent appsec-engineer \
  "Triage these upload endpoint findings from manual security testing on staging: \
   1. SVG file with <script>alert(1)</script> returned 200 and file was stored and served \
   2. Upload of 50MB file returned 413 — size limit working \
   3. File with .php extension and image/jpeg Content-Type was accepted and stored"
```

**Triage:**
- Finding 1: **CRITICAL** — SVG upload accepted. Magic byte validation was deployed but SVG
  does not have a fixed magic byte sequence — `file-type` library returns `image/svg+xml`
  as a valid match on some SVG files. SVG must be explicitly blocked by extension AND
  content-type regardless of library result.
- Finding 2: **Pass** — size limit correctly enforced.
- Finding 3: **HIGH** — PHP file accepted when disguised as image. After magic byte fix,
  re-test confirms PHP files with genuine image headers are now caught by Sharp — Sharp
  throws on non-image input. Resolved after PR fix re-deployed.

**Output produced:** [`test-security-report.md`](test-security-report.md)

---

## Step 7 — Release: Go/no-go

**Invoke:**
```bash
claude --agent release-manager "Run pre-release security checklist for v1.2.0-file-upload"
```

**Initial result:** 🚫 NO-GO
- IF-001 (S3 public access) — not yet resolved in IaC
- SVG CRITICAL finding from testing — not yet resolved

**48 hours later, after IaC fix and SVG explicit block deployed:**

**Final result:** ✅ GO — all CRITICAL and HIGH findings resolved, malware scanning
confirmed operational, GRC attestation produced.

---

## Files in this example

| File | Produced by | Description |
|------|-------------|-------------|
| `security-requirements.md` | product-manager | ASVS V12 requirements for file upload |
| `risk-register.md` | grc-analyst | Malware, path traversal, storage misconfiguration risks |
| `threat-model.md` | appsec-engineer | STRIDE — SVG XSS and polyglot file as top threats |
| `infra-security-review.md` | cloud-platform-engineer | S3, CloudFront, Lambda IAM review |
| `test-security-report.md` | appsec-engineer | SVG upload CRITICAL finding and resolution |
| `release-sign-off.md` | release-manager | Initial NO-GO, then GO after fixes confirmed |

---

## Key lessons from this example

**Client-supplied MIME type is not a security control.** The dev-lead finding on PR #44 is
the single most common file upload vulnerability — trusting `Content-Type` from the client.
Magic byte inspection using a library like `file-type` (Node.js), `python-magic` (Python),
or `Apache Tika` (JVM) is the correct control.

**SVG is not a safe image format.** It is XML. It can contain scripts. Never accept SVG
uploads unless you have a dedicated SVG sanitiser (`DOMPurify` on SVG content,
or server-side tools like `svg-sanitize`). When in doubt, block it.

**The NO-GO gate worked as intended.** Infrastructure findings caught by
`cloud-platform-engineer` would have shipped a world-readable S3 bucket to production.
The release gate stopped that. The two-day delay is the feature, not a bug.
