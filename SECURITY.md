# Security Policy

## Overview
This repository is dedicated to secure development lifecycle tooling and guidance. We take security reports seriously and aim for transparent, timely communication with reporters.

## Scope
Applies to:
- `cli/`, `mcp/`, `hooks/`, `stacks/`, and project scripts
- Agent policy and prompt artifacts under `.claude/agents/`
- Documentation and templates in `docs/`, `warp-workflows/`, and `examples/`

Excludes:
- Third-party dependencies and external service providers (raise as dependency security issue with timestamp and vendor name).

## Reporting a Vulnerability
Preferred method: GitHub issue in this repository.
1. Create a new issue using the template `Security Vulnerability Report` (or include `[SECURITY]` in the title).
2. Include:
   - Affected component (file/path, agent role, runtime, workflow)
   - Proof of concept (PoC) or reproduction steps
   - Impact description (confidentiality, integrity, availability)
   - Suggested mitigation (if known)
3. Leave attacker-independent details out of public issue comments when possible. If the issue requires private handling, mark it as confidential in the body and request a private disclosure channel.

If the public issue tracker is not safe for your report, email: `security@kaademos.com` (or alternative provider email provided by project maintainers in README). If no email exists, open a private issue via the GitHub security advisory flow (https://github.com/organizations/kaademos/settings/security).

## Response commitments
- Acknowledge within 3 business days.
- Provide periodic status updates every 7 calendar days until resolved in the issue thread.
- Patch or mitigation plan within 30 calendar days for critical/high findings, and within 90 days for medium/low findings.

## Severity classification
- Critical: remote code execution, unauthorized code modification, data exfiltration of secret material.
- High: privilege escalation, auth bypass, supply-chain manipulation affecting production behavior.
- Medium: CSRF, insecure defaults, missing hardening controls, non-sensitive data leakage.
- Low: documentation gaps, non-exploitable UX issues, typos in policy text.

## Safe harbor
We welcome good-faith security research. Reporters who follow this policy and avoid privacy breaches will not be blocked or pursued for violation of terms of service.

## Public disclosures
After a fix is merged, maintainers aim to publish a short advisory in the repository Release notes, with attribution optional and at researcher’s request.

## Credit
Contributors who report confirmed vulnerabilities may be acknowledged in release notes or the README security section, subject to their preference.
