# Releasing the npm package

The CLI is published as **`@kaademos/secure-sdlc`** from the **repository root** `package.json`.

## Versioning

Use [semantic versioning](https://semver.org/) (`MAJOR.MINOR.PATCH`):

| Bump | When |
|------|------|
| **MAJOR** | Breaking CLI behaviour, removed commands, or incompatible asset layout |
| **MINOR** | New commands, new bundled templates, non-breaking features |
| **PATCH** | Bug fixes, doc-only template tweaks, dependency updates |

Update **`package.json`** `version` and add an entry under **`CHANGELOG.md`** `[Unreleased]` (or the new version section) before tagging.

## Prerequisites

- Node.js **18+**
- npm account with permission to publish **`@kaademos`** on [npmjs.com](https://www.npmjs.com/)  
  - If you use a different scope, change the `"name"` field in root `package.json` and update the README install lines.
- `publishConfig.access` is **`public`** so the scoped package is installable without an npm org seat for *consumers* (you still need publish rights on the scope).

## Dry run

From the repo root:

```bash
npm install
npm pack --dry-run
```

Confirm tarball size is ~100KB (not megabytes). If it is huge, ensure **`cli/node_modules`** and **`mcp/node_modules`** are not present and are listed in `.gitignore`.

**`package.json` → `files`** is the main allow-list (what may be published). **`.npmignore`** is secondary: npm still applies it when walking directories in `files`, and it reduces accidents if `files` is ever broadened (e.g. to `"cli"` instead of `cli/bin` + `cli/src`). You do not need `.npmignore` if you keep a tight `files` list — this repo keeps both.

## Publish

```bash
npm whoami
npm publish
```

Git tag (optional but recommended):

```bash
VER=$(grep -m1 '"version"' package.json | sed 's/.*: *"\(.*\)".*/\1/')
git tag "v${VER}"
git push origin "v${VER}"
```

## Consumers install

```bash
npm install -g @kaademos/secure-sdlc
secure-sdlc --version
secure-sdlc paths   # absolute paths for MCP config
```

Or without global install:

```bash
npx @kaademos/secure-sdlc@latest init
```

Pin CI to a specific version when you want reproducibility: `npx @kaademos/secure-sdlc@1.0.0 init`.
