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

A local clone can be without tags. Fetch them before you determine the range:

```bash
git -C ../alwasp fetch origin --tags
```

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

Confirm that `TARGET_TAG` is a published release before you document it: the version must be in
the version list of the `left-code.AlWasp` package on NuGet.org. A tag without a published package
is not a release for this site.

## Synchronize everything together

One synchronization changes all of these in the same commit, for the same `TARGET_TAG`:

- the documentation pages and the release notes
- `public/schema/alwasp.schema.json`
- the visual CLI reference (`scripts/cli-reference/help.json` and the generated HTML)
- the version in `package.json` and `package-lock.json`

Never copy the schema, or regenerate the CLI reference, without the page changes for the same
releases. A schema-only synchronization makes the site look current while its pages describe an
older version. If you cannot complete the pages, change nothing and report what is missing.

## Inspect the actual product changes

Do not derive documentation only from commit messages or `CHANGELOG.md`.

Use these sources together:

- Git diff between the baseline tag and target release tag
- `CHANGELOG.md`
- the product's own user documentation at `TARGET_TAG`: `README.md` and `docs/*.md` (for example
  `docs/app-packages.md`, `docs/translation-skill.md`, `docs/cli-reference.md`). These describe
  user-facing behavior in full sentences and are the best source for new pages. Do not copy
  internal documents (`docs/adr/`, migration maps, audits, release operations).
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

- CLI commands/options → `cli-reference.md` (syntax and primary options only; the generated visual
  reference has the complete option lists)
- `--bc-version` / `--bc-country`, artifacts, compiler selection, `toolchain` → `bc-version.md`
- build behavior → `build.md`
- restore behavior → `restore.md`
- compatibility validation → `compatibility.md`
- unified verification → `check.md`
- configuration → `configuration.md`
- CI behavior → `ci-cd.md`
- analysis → `analyze.md`
- translations → `translations.md`
- translation package preparation, validation, and apply → `translation-preparation.md`
- agent skills → `translation-skill.md`
- symbol packages / app packages → `symbol-packages.md` / `app-packages.md`
- result documents, NDJSON records, `--result-file` → `structured-output.md`
- exit codes, environment variables, written files and folders → `reference.md`
- known failure cases and their solutions → `troubleshooting.md`
- installation/runtime requirements → `install.md`
- license text (`LICENSE.txt` of the tool) → `license.md`
- significant release changes → `release-notes.md`

Writing rules for the guide and reference pages:

- Describe only the current behavior. Do not write "since 0.x", "now", "no longer", or
  "retains its existing behavior" in a guide. Put history and migration steps in `release-notes.md`.
- State each rule in one page and link to it from the others. Business Central version rules
  belong in `bc-version.md`; plan rules in `build.md`.
- Put result field names in tables, not in running text.
- Do not name internal classes, assemblies, or source files of the product.
- Do not type a version number into a page or component. The site reads the documented version
  from `package.json` (`src/lib/docs.ts`).
- Each page needs `group` (`Start`, `Guides`, `Reference`, `Project`) and `order` in its front matter.
- Quote a front matter `description` that contains a colon.

Create a new page only when the feature represents a distinct user workflow that does not fit an existing page.

Preserve the existing documentation style, front matter, terminology, links, examples, and information architecture.

## Release notes

Add release-note sections for every released ALWasp version after `DOCUMENTED_VERSION` through `TARGET_TAG`.

Do not collapse multiple released versions into one release unless the source repository does so.

Release notes must describe user-visible behavior, not implementation details.

Do not copy the complete internal changelog verbatim.

Start an entry with **Migration:** when users must change a script, a configuration file, or a
pipeline, and with **Behavior change:** when a command that they do not change gives a different
result. The release notes page tells readers to look for these two markers.

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

## License text

Compare `LICENSE.txt` of the tool at `TARGET_TAG` with the agreement text in
`src/content/docs/license.md`. When it changed, replace the text in the code block and update the
summary table above it.

## Examples and paths

Search the documentation for examples affected by changed defaults, command syntax, paths, option names, output names, or configuration.

Update all affected examples consistently.

Pay special attention to changes that can leave old examples technically valid but misleading.

## Visual CLI reference synchronization

Publish the standalone visual help page at:

`public/alwasp-cli-reference.html` → `https://alwasp.dev/alwasp-cli-reference.html`

Regenerate it for every target release from the authoritative product-contract help snapshots,
rather than copying the product repository's HTML (its embedded command data can be stale).

With the product repository available locally, run from the documentation repository:

```bash
node scripts/generate-cli-reference.mjs --source ../alwasp --tag <TARGET_TAG>
```

This reads only `tests/product-contract/help/*.txt` at the supplied Git tag, updates
`scripts/cli-reference/help.json` and generates the static HTML. It does not modify the
product repository or use its working tree. Refresh before the version synchronization step;
after `npm version`, the snapshot version must equal the package version.

If using GitHub access instead, retrieve the complete help snapshot directory at `TARGET_TAG`
into a temporary local folder, then run:

```bash
node scripts/generate-cli-reference.mjs --snapshots <snapshot-folder> --tag <TARGET_TAG>
```

Commit both the snapshot JSON and generated HTML. The template and generator are maintained at
`scripts/cli-reference/template.html` and `scripts/generate-cli-reference.mjs`.
For layout-only changes, regenerate from the committed snapshots with
`npm run generate:cli-reference`. Do not manually edit the generated HTML.

Verify search, copy controls, version display, and direct command anchors such as
`#c-build` and `#c-artifacts-resolve`. Preserve the standalone page and stable command anchors
so ALWasp can open visual help without depending on the site's application shell.
Run `npm run check:cli-reference`; the site build also runs this check automatically.
Confirm the build copies the page unchanged to `dist/alwasp-cli-reference.html`.

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

The build must succeed. It runs `scripts/check-docs.mjs`, which fails when:

- a page names a `--option` that is not in the `TARGET_TAG` help snapshots
  (`scripts/cli-reference/help.json`). `release-notes.md` is excluded, because it describes
  earlier versions.
- an internal link or anchor in the built site does not resolve.

Do not add an option to the script's allowlist to make the check pass, unless the option belongs
to a different tool (`dotnet`, `git`). Correct the page. `npm run check:docs` runs the check
again on an existing `dist/`.

Also verify:

1. `package.json` and `package-lock.json` have the same version.
2. The version equals `TARGET_VERSION`.
3. Public schema matches the canonical ALWasp schema at `TARGET_TAG`.
4. No documentation claims behavior that exists only after `TARGET_TAG`.
5. CLI examples use commands and options present in the target release. The build check covers
   option names; examine values, defaults, and combinations yourself.
6. Default paths and filenames match the target release.
7. Internal/private implementation details have not leaked into public documentation.
8. Links between documentation pages resolve using the site's existing route conventions.
9. The visual CLI reference matches the target version, passes the freshness check, and is copied unchanged to dist/alwasp-cli-reference.html.

## Report

At completion, report:

- previous documented version
- target documented version
- release tags inspected
- important user-visible changes found
- documentation files changed
- schema synchronization result
- license text comparison result
- confirmation that `TARGET_TAG` is published on NuGet.org
- visual CLI reference generation and validation result
- validation commands run
- any source changes intentionally not documented because they are internal-only
- any commits after `TARGET_TAG` intentionally excluded as unreleased

Do not create or push a release tag unless explicitly requested.
Do not modify `left-code/alwasp`.
Do not include unreleased ALWasp behavior in released documentation.