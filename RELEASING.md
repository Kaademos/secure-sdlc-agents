# Releasing

How to cut a new release of `@kaademos/secure-sdlc`.

Versioning follows [SemVer](https://semver.org/). Keep these four in sync (the test
suite enforces it):

- `package.json`
- `.claude-plugin/plugin.json`
- `.claude-plugin/marketplace.json` (`metadata.version` **and** `plugins[0].version`)
- the git tag (`vX.Y.Z`)

---

## 1. Prepare the release

```bash
# bump the version in all manifests, then:
npm run ci        # tests + package-contents check; the version-sync test
                  # fails if any manifest is out of step
```

- Add a `## [X.Y.Z] — YYYY-MM-DD` section to [CHANGELOG.md](CHANGELOG.md).
- Commit the version bump + changelog.

---

## 2. Publish

### Automated (preferred): tag → CircleCI

Pushing a `v*` tag triggers the `release` workflow in
[`.circleci/config.yml`](.circleci/config.yml), which re-tests, verifies the tag matches
`package.json`, and runs `npm publish`.

```bash
git tag -a vX.Y.Z -m "vX.Y.Z"
git push origin vX.Y.Z
```

**One-time CircleCI setup:** add an `NPM_TOKEN` project environment variable
(Project Settings → Environment Variables) — an npm automation token with publish rights
to the `@kaademos` scope.

### Manual fallback

If CircleCI is unavailable, publish from a clean checkout (deps installed — the `prepack`
hook runs the CLI to assert the version):

```bash
npm install
npm test
npm whoami                     # confirm you're logged in (else: npm login)
npm publish --access public    # add --otp=<code> if publish 2FA is enabled
```

> Do **not** pass `--provenance` for a manual publish — it requires CI's OIDC token and
> will fail locally. Provenance only applies to CI-based publishes.

---

## 3. Verify and announce

```bash
npm view @kaademos/secure-sdlc version   # should print the new version
```

- Create the **GitHub Release** from the `vX.Y.Z` tag (done manually) and paste the
  relevant [CHANGELOG.md](CHANGELOG.md) section into the body.
- The Claude Code plugin marketplace and `npx @kaademos/secure-sdlc@latest` pick up the
  new version automatically.

---

## Notes

- CI configs (`.circleci/`, `.github/workflows/`) are **not** part of the npm package, so a
  CI-only change does not require a version bump.
- `.github/workflows/secure-sdlc-gate.yml` is a **product template** shipped to end users
  (and uses GitHub-native CodeQL); it is not part of this repo's release CI.
- `mcp/package.json` is versioned independently from the root CLI package.
