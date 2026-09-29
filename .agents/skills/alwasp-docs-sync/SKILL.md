---
name: alwasp-docs-sync
description: Synchronize the public left-code/alwasp-dev documentation with released changes from the private left-code/alwasp repository. Use when updating ALWasp documentation, release notes, CLI documentation, examples, configuration schema, or the documented ALWasp version.
---

# ALWasp documentation synchronization

Synchronize `left-code/alwasp-dev` with released versions of `left-code/alwasp`.

The documentation repository is versioned against ALWasp itself.

`package.json` and `package-lock.json` contain the newest ALWasp version that is fully documented by this repository.

Do not treat the documentation site as an independently versioned npm package.

## Repositories

Source product:

`left-code/alwasp`

Public documentation:

`left-code/alwasp-dev`

When both repositories are available locally, prefer the local repositories and Git history.

Otherwise, use GitHub access to inspect `left-code/alwasp`.

## Determine the synchronization range

1. Read `package.json` in `alwasp-dev`.
2. Let its `version` be `DOCUMENTED_VERSION`.
3. The baseline Git tag in `alwasp` is:

   `v<DOCUMENTED_VERSION>`

4. Determine the newest released ALWasp version after that tag.
5. Use the newest existing release tag as `TARGET_TAG`.
6. Compare:

   `v<DOCUMENTED_VERSION>..TARGET_TAG`

Never use `master` as the target when it contains commits after `TARGET_TAG`.

Never document `CHANGELOG.md` entries under `Unreleased` as part of a released documentation version.

If no release exists after `DOCUMENTED_VERSION`, report that the documentation is already synchronized and do not change versions.

## Inspect the actual product changes

Do not derive documentation only from commit messages or `CHANGELOG.md`.

Use these sources together:

- Git diff between the baseline tag and target release tag
- `CHANGELOG.md`
- changed CLI command modules
- changed command handlers
- changed models and configuration structures
- product-contract CLI help snapshots
- tests that describe externally visible behavior
- existing ALWasp documentation
- canonical JSON schemas

Separate:

- user-visible additions
- changed behavior
- fixes that users need to know about
- CLI option changes
- configuration changes
- output/path/schema changes
- migration requirements
- internal-only implementation changes

Do not document implementation-only refactoring unless it changes observable product behavior.

Tests and CLI contract snapshots are authoritative evidence when documentation and implementation disagree.

## Map changes to public documentation

Inspect the existing pages under:

`src/content/docs/`

Update existing pages where possible.

Typical mappings include:

- CLI commands/options → `cli-reference.md`
- build behavior → `build.md`
- restore behavior → `restore.md`
- compatibility validation → `compatibility.md`
- configuration → `configuration.md`
- CI behavior → `ci-cd.md`
- analysis → `analyze.md`
- translations → `translations.md`
- translation package preparation → `translation-preparation.md`
- installation/runtime requirements → `install.md`
- significant release changes → `release-notes.md`

Create a new page only when the feature represents a distinct user workflow that does not fit an existing page.

Preserve the existing documentation style, front matter, terminology, links, examples, and information architecture.

## Release notes

Add release-note sections for every released ALWasp version after `DOCUMENTED_VERSION` through `TARGET_TAG`.

Do not collapse multiple released versions into one release unless the source repository does so.

Release notes must describe user-visible behavior, not implementation details.

Do not copy the complete internal changelog verbatim.

## Schema synchronization

Compare the canonical schema from:

`left-code/alwasp/schemas/alwasp.schema.json`

at `TARGET_TAG`

with:

`public/schema/alwasp.schema.json`

in `alwasp-dev`.

Copy the canonical schema when it changed.

Do not manually reconstruct the schema.

If other public schemas are added to ALWasp and are intended for publication, inspect the existing site architecture before adding them.

## Examples and paths

Search the documentation for examples affected by changed defaults, command syntax, paths, option names, output names, or configuration.

Update all affected examples consistently.

Pay special attention to changes that can leave old examples technically valid but misleading.

## Version synchronization

Only after all documentation for `TARGET_TAG` is complete:

```bash
npm version <TARGET_VERSION> --no-git-tag-version
```

This must update both:

- `package.json`
- `package-lock.json`

The resulting version must exactly equal the ALWasp release version represented by the documentation.

Do not create an npm Git tag.

Do not publish this package to npm.

## Validation

Run:

```bash
npm ci
npm run build
```

The build must succeed.

Also verify:

1. `package.json` and `package-lock.json` have the same version.
2. The version equals `TARGET_VERSION`.
3. Public schema matches the canonical ALWasp schema at `TARGET_TAG`.
4. No documentation claims behavior that exists only after `TARGET_TAG`.
5. CLI examples use commands and options present in the target release.
6. Default paths and filenames match the target release.
7. Internal/private implementation details have not leaked into public documentation.
8. Links between documentation pages resolve using the site's existing route conventions.

## Report

At completion, report:

- previous documented version
- target documented version
- release tags inspected
- important user-visible changes found
- documentation files changed
- schema synchronization result
- validation commands run
- any source changes intentionally not documented because they are internal-only
- any commits after `TARGET_TAG` intentionally excluded as unreleased

Do not create or push a release tag unless explicitly requested.
Do not modify `left-code/alwasp`.
Do not include unreleased ALWasp behavior in released documentation.