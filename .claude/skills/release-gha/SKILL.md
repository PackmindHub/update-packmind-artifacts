---
name: release-gha
description: 'Release a new version of the update-packmind-artifacts GitHub Action: finalize the CHANGELOG [Unreleased] section as [vX.Y.Z] with today''s date, commit "[Chore] Prepare release", tag vX.Y.Z, push main and the tag, then reopen an empty [Unreleased] section and commit/push "[Chore] Post release vX.Y.Z". Use when the user asks to release, publish or tag a new version of the action.'
---

Release version `{{version}}` (format `vX.Y.Z`, e.g. `v1.1.0`) of this GitHub Action.

If the user did not give a version, look at the latest tag (`git tag -l 'v*.*.*' --sort=-v:refname | head -1`) and the `[Unreleased]` entries, propose the next semver version, and ask for confirmation before going further.

All commands run from the repository root. The CHANGELOG helper lives at `.claude/skills/release-gha/scripts/changelog.mjs`.

## 1. Pre-flight

```bash
git checkout main
git status --porcelain            # must be empty
git pull --ff-only origin main
git rev-parse -q --verify "refs/tags/{{version}}" && echo "tag already exists"
```

Abort and ask the user to reconcile if the working tree is dirty, the pull is not a fast-forward, or the tag already exists (locally or on `origin`: `git ls-remote --tags origin {{version}}`).

## 2. Finalize the CHANGELOG

Resolve today's date as `YYYY-MM-DD` — call it `{{today}}`.

```bash
node .claude/skills/release-gha/scripts/changelog.mjs release {{version}} {{today}}
```

This:

* removes the empty subsections (`### Added`, `### Changed`, …) from `[Unreleased]`,
* renames `## [Unreleased]` to `## [{{version}}] {{today}}`,
* removes the `[Unreleased]: …` link definition and appends `[{{version}}]: https://github.com/PackmindHub/update-packmind-artifacts/compare/<previous>...{{version}}` at the end of the file.

It refuses to run if `[Unreleased]` has no entries or if `{{version}}` is already in the changelog. Show the user `git diff CHANGELOG.md` before committing.

## 3. Commit, tag and push the release

```bash
git add CHANGELOG.md
git commit -m "[Chore] Prepare release"
git tag -a {{version}} -m "{{version}}"
git push origin main
git push origin {{version}}
```

Use an annotated tag (existing release tags are annotated). Do not move the floating major tag (e.g. `v1`) unless the user asks for it.

## 4. Reopen [Unreleased]

```bash
node .claude/skills/release-gha/scripts/changelog.mjs next {{version}}
```

This inserts, above the latest release:

```markdown
## [Unreleased]

### Added

### Changed

### Deprecated

### Removed

### Fixed

### Security
```

and adds `[Unreleased]: https://github.com/PackmindHub/update-packmind-artifacts/compare/{{version}}...HEAD` back to the link definitions.

## 5. Commit and push the post-release change

```bash
git add CHANGELOG.md
git commit -m "[Chore] Post release {{version}}"
git push origin main
```

## 6. Report

Give the user:

* the tag URL: `https://github.com/PackmindHub/update-packmind-artifacts/releases/tag/{{version}}`
* a reminder that a GitHub Release can be drafted from that tag if needed.

## Important notes

* Never use `--no-verify`. If a hook fails, fix the cause and create a new commit.
* Check that every commit and push succeeded before moving to the next step.
* If something fails after the tag is pushed, do not delete the tag: finish the post-release step and fix forward with a patch release.
