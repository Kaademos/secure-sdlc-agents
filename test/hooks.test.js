// Git hook regression tests: install the real hooks/pre-push script into a
// throwaway repo and push to a throwaway bare remote, exactly like a consumer
// project would. These are integration tests (real git, real bash), not mocks —
// the bugs they guard against (a gate that "passes" on blank templates, a bash
// arithmetic crash on a clean report) only show up when the hook actually runs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, mkdirSync, copyFileSync, writeFileSync, chmodSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const prePushSrc = join(ROOT, "hooks", "pre-push");
const templatesDir = join(ROOT, "docs", "templates");
const hasPrePush = existsSync(prePushSrc);

function sh(cmd, args, cwd) {
  const res = spawnSync(cmd, args, { cwd, encoding: "utf-8" });
  return { status: res.status, output: `${res.stdout || ""}${res.stderr || ""}` };
}

function setupRepo() {
  const base = mkdtempSync(join(tmpdir(), "secure-sdlc-hooks-"));
  const bareRemote = join(base, "remote.git");
  const workdir = join(base, "work");
  mkdirSync(workdir, { recursive: true });

  sh("git", ["init", "-q", "--bare", bareRemote], base);
  sh("git", ["init", "-q"], workdir);
  sh("git", ["config", "user.email", "test@example.com"], workdir);
  sh("git", ["config", "user.name", "Test"], workdir);
  sh("git", ["remote", "add", "origin", bareRemote], workdir);

  mkdirSync(join(workdir, ".git", "hooks"), { recursive: true });
  const hookDest = join(workdir, ".git", "hooks", "pre-push");
  copyFileSync(prePushSrc, hookDest);
  chmodSync(hookDest, 0o755);

  mkdirSync(join(workdir, "docs"), { recursive: true });
  return { base, workdir };
}

function commitAll(workdir, message) {
  sh("git", ["add", "-A"], workdir);
  return sh("git", ["commit", "-q", "-m", message], workdir);
}

function pushMain(workdir) {
  sh("git", ["branch", "-M", "main"], workdir);
  return sh("git", ["push", "-u", "origin", "main"], workdir);
}

test(
  "pre-push blocks a push to main when required artefacts are still blank templates",
  { skip: !hasPrePush && "hooks/pre-push not found" },
  () => {
    const { base, workdir } = setupRepo();
    try {
      copyFileSync(join(templatesDir, "threat-model.md"), join(workdir, "docs", "threat-model.md"));
      copyFileSync(join(templatesDir, "sast-findings.md"), join(workdir, "docs", "sast-findings.md"));
      commitAll(workdir, "blank templates only");

      const result = pushMain(workdir);
      assert.notEqual(result.status, 0, "push should be rejected");
      assert.match(result.output, /still the blank template/, "should call out the blank templates, not just missing files");
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  }
);

test(
  "pre-push allows a push to main once required artefacts are actually filled in, with no shell errors",
  { skip: !hasPrePush && "hooks/pre-push not found" },
  () => {
    const { base, workdir } = setupRepo();
    try {
      // Long, real-looking content with zero mentions of "CRITICAL" — this is
      // the exact shape of doc that used to trip the grep/pipefail bug in the
      // "Open Finding Check" section (COUNT ended up as "0\n0" and broke the
      // arithmetic below it) even though the push itself wasn't blocked by it.
      const realContent = "x".repeat(2500) + "\n# Real content, not a template, no severity words here.\n";
      writeFileSync(join(workdir, "docs", "threat-model.md"), realContent);
      writeFileSync(join(workdir, "docs", "sast-findings.md"), realContent);
      commitAll(workdir, "real docs");

      const result = pushMain(workdir);
      assert.equal(result.status, 0, `push should succeed:\n${result.output}`);
      assert.doesNotMatch(result.output, /syntax error/, "hook should not throw a bash arithmetic error");
      assert.doesNotMatch(result.output, /unbound variable/, "hook should not throw a bash unbound-variable error");
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  }
);
