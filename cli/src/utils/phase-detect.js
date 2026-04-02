import { existsSync, statSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

const ARTEFACTS = {
  PLAN:    ["docs/security-requirements.md", "docs/risk-register.md"],
  DESIGN:  ["docs/threat-model.md", "docs/infra-security-review.md"],
  BUILD:   ["docs/sast-findings.md"],
  TEST:    ["docs/test-security-report.md"],
  RELEASE: ["docs/release-security-sign-off.md", "docs/audit-evidence"],
};

/**
 * Check which SDLC artefacts are present in the project.
 * Returns a detailed status object.
 */
export function getSDLCStatus(projectRoot) {
  const status = {};

  for (const [phase, files] of Object.entries(ARTEFACTS)) {
    const results = files.map((rel) => {
      const abs = join(projectRoot, rel);
      const exists = existsSync(abs);
      let isTemplate = false;

      if (exists && !rel.endsWith("/") && !rel.includes("audit-evidence")) {
        try {
          const { readFileSync } = require("fs");
          const content = readFileSync(abs, "utf-8");
          // Detect unfilled templates — they still have [PLACEHOLDER] markers
          isTemplate = content.includes("[YYYY-MM-DD]") || content.includes("[Feature Name]");
        } catch {
          // ignore
        }
      }

      return { path: rel, exists, isTemplate };
    });

    const allPresent    = results.every((r) => r.exists);
    const somePresent   = results.some((r) => r.exists);
    const allFilled     = results.every((r) => r.exists && !r.isTemplate);

    status[phase] = {
      files: results,
      allPresent,
      somePresent,
      allFilled,
      complete: allPresent && allFilled,
    };
  }

  return status;
}

/**
 * Detect current SDLC phase based on git state and artefact presence.
 */
export function detectCurrentPhase(projectRoot) {
  const status = getSDLCStatus(projectRoot);

  // Walk phases in order — the current phase is the first incomplete one
  const order = ["PLAN", "DESIGN", "BUILD", "TEST", "RELEASE"];

  for (const phase of order) {
    if (!status[phase].complete) {
      return { current: phase, status };
    }
  }

  return { current: "COMPLETE", status };
}

/**
 * Get the next recommended action based on phase state.
 */
export function getNextAction(phase, status) {
  const actions = {
    PLAN: {
      command: 'claude --agent product-manager "Define security requirements for [your feature]"',
      mcp: "sdlc_plan_feature",
      description: "Generate ASVS-mapped security requirements and risk register",
    },
    DESIGN: {
      command: 'claude --agent appsec-engineer "Threat model [your architecture] using STRIDE"',
      mcp: "sdlc_threat_model",
      description: "Run STRIDE threat model and infrastructure security review",
    },
    BUILD: {
      command: 'claude --agent dev-lead "Review PR #[N] for security issues"',
      mcp: "sdlc_review_pr",
      description: "Security review pull requests and triage SAST findings",
    },
    TEST: {
      command: 'claude --agent appsec-engineer "Interpret DAST findings: [findings]"',
      mcp: "sdlc_triage_sast",
      description: "Interpret DAST/pentest results and collect audit evidence",
    },
    RELEASE: {
      command: 'claude --agent release-manager "Run pre-release security checklist for v[X.Y.Z]"',
      mcp: "sdlc_release_gate",
      description: "Run go/no-go security gate and produce compliance attestation",
    },
  };

  return actions[phase] || null;
}
