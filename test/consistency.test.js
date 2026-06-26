// Consistency guards: keep stack detection, security notes, and the shipped
// stacks/*.md profiles in sync. These catch the class of bug where the CLI
// detects a stack (or aliases one) but no matching profile / notes exist.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, mkdtempSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import {
  detectStack,
  getStackSecurityNotes,
  getStackProfile,
} from "../cli/src/utils/stack-detect.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const stacksDir = join(ROOT, "stacks");

// Frameworks that ship BOTH a notes entry and a stacks/<name>.md profile.
const PROFILED_FRAMEWORKS = ["nextjs", "express", "django", "fastapi", "rails", "golang"];

test("each profiled framework has at least 4 security notes", () => {
  for (const name of PROFILED_FRAMEWORKS) {
    const notes = getStackSecurityNotes(name);
    assert.ok(Array.isArray(notes), `${name} notes should be an array`);
    assert.ok(notes.length >= 4, `${name} should have >= 4 notes, got ${notes.length}`);
  }
});

test("each profiled framework resolves to an existing stacks/*.md", () => {
  for (const name of PROFILED_FRAMEWORKS) {
    const profile = getStackProfile(name);
    const file = join(stacksDir, `${profile}.md`);
    assert.ok(existsSync(file), `${name} -> stacks/${profile}.md must exist`);
  }
});

test("Go framework aliases (gin/echo/fiber) resolve to the golang profile and notes", () => {
  const golangNotes = getStackSecurityNotes("golang");
  for (const alias of ["gin", "echo", "fiber"]) {
    assert.equal(getStackProfile(alias), "golang", `${alias} should map to golang`);
    assert.deepEqual(
      getStackSecurityNotes(alias),
      golangNotes,
      `${alias} should reuse the golang notes`
    );
    assert.ok(existsSync(join(stacksDir, "golang.md")), "stacks/golang.md must exist");
  }
});

test("getStackProfile is identity for non-aliased stacks", () => {
  for (const name of [...PROFILED_FRAMEWORKS, "nodejs", "terraform", "unknown"]) {
    assert.equal(getStackProfile(name), name);
  }
});

test("every stacks/*.md profile is non-empty and has an H1 title", () => {
  const profiles = readdirSync(stacksDir).filter((f) => f.endsWith(".md"));
  assert.ok(profiles.length >= 6, "expected at least 6 stack profiles");
  for (const f of profiles) {
    const body = readFileSync(join(stacksDir, f), "utf-8");
    assert.ok(body.trim().length > 0, `${f} is empty`);
    assert.match(body, /^#\s+.+/m, `${f} should have an H1 heading`);
  }
});

test("detectStack identifies frameworks from manifest files", () => {
  const cases = [
    { files: { "package.json": JSON.stringify({ dependencies: { next: "14" } }) }, expect: "nextjs" },
    { files: { "package.json": JSON.stringify({ dependencies: { express: "4" } }) }, expect: "express" },
    { files: { "go.mod": "module x\nrequire github.com/gin-gonic/gin v1.9.1" }, expect: "gin" },
    { files: { "go.mod": "module x\n" }, expect: "golang" },
    { files: { "requirements.txt": "fastapi==0.110" }, expect: "fastapi" },
    { files: { "Gemfile": "gem 'rails'" }, expect: "rails" },
  ];
  for (const { files, expect } of cases) {
    const dir = mkdtempSync(join(tmpdir(), "stackdetect-"));
    for (const [name, content] of Object.entries(files)) writeFileSync(join(dir, name), content);
    const stack = detectStack(dir);
    assert.equal(stack.name, expect, `expected ${expect}, got ${stack.name}`);
    // Whatever profile it maps to, if notes are non-default a profile should exist.
    const profile = getStackProfile(stack.name);
    if (PROFILED_FRAMEWORKS.includes(profile)) {
      assert.ok(existsSync(join(stacksDir, `${profile}.md`)));
    }
  }
});
