---
title: Release Notes
description: User-facing changes in ALWasp releases.
order: 10
---

# Release Notes

## 0.5.9 — 2026-10-15

- `symbols create` turns a compiled `.app` into a symbol-only app through ALTool without a
  Business Central container. `symbols pack` produces a NuGet package using the app's identity,
  version, and dependency minimums. Repeatable `--dependency-package-id` supports dependencies
  published under non-standard IDs.
- `symbols push` publishes verified packages to a NuGet v3 feed, configured source, or folder,
  reusing restore credentials and adding API-key support and `--skip-duplicate`. Existing
  non-standard package IDs can be preserved when moving packages between feeds.
- `symbols publish` runs create → pack → push, stops at the first failure, and reports
  `failedStage`; NDJSON reports stage events. **Build never publishes automatically.**
- All stages require valid symbol metadata and ALTool confirmation that apps are symbol-only,
  not runtime packages. Push validates the package/app identity before sending. Push output
  redacts effective credentials, including API keys and stored source passwords.
- Generated symbol package IDs remain compatible with restore and NuGet version lookup;
  existing consumer configuration does not need migration.

See [Symbol Packages](/docs/symbol-packages/), [Authentication](/docs/authentication/), and
[CI/CD](/docs/ci-cd/#symbol-package-publication).

## 0.5.8 — 2026-10-13

- `version resolve` previews current/next versions and dependency updates; `version apply` writes
  them. Both accept direct project/root selection without configuration, policy overrides, and
  changed-only selection with optional dependents. Each app uses its own current version.
- Compatibility accepts target lists and validates every target/country combination in isolation,
  with live app progress. If `current` is included, Insider failures warn; use `--fail-on-next`
  to make them fatal. Runs without `current` fail on any failure.
- **Migration:** `init` moves to `config init` with no alias. Replace compatibility
  `--max-parallel-countries` / `maxParallelCountries` with `--max-parallel-processing` /
  `maxParallelProcessing`. The default is all combinations, capped at half the logical processors,
  instead of two workers.
- Artifact validation cleans Insider, superseded, and long-unused caches. Use `--keep-artifacts`
  per run or `ALWASP_ARTIFACT_CLEANUP=off`; `artifacts prune` provides on-demand cleanup and dry runs.
  Artifacts in use are retained. Interrupted-run temporary folders older than a day are swept.
- `artifacts resolve --bc-version` looks up a released version or newest matching version prefix
  without downloading artifacts; non-current `--bc-target` cannot be combined with it.
- Bare or empty `--ruleset` values on build/workspace build/compatibility allow ordinary discovery.
  Automatic workspace discovery now uses only the nearest workspace listing the project, avoiding
  unrelated ancestor settings and rulesets.
- Compatibility restores share feed metadata queries and stage only needed Microsoft artifact
  symbols. Missing localization apps can come from another country artifact of the same BC version,
  matched by AppId, preventing cross-country missing-symbol errors.

See [CLI Reference](/docs/cli-reference/), [Compatibility](/docs/compatibility/), and
[Versioning](/docs/configuration/#versioning).

## 0.5.7 — 2026-10-11

- `artifacts resolve` looks up concrete BC versions and Application/Platform URLs for `current`,
  `next-minor`, `next-major`, or all three, with one country and JSON/NDJSON output. It reads
  indexes without downloading or caching artifacts; any unresolved requested target fails.
- Workspace restore/build read supported VS Code AL settings. Project settings override workspace
  settings and explicit CLI options win, including explicit false values. Relative paths resolve
  per project. Restore writes the first package cache; build also reads additional caches.
- Workspace builds honor per-project rulesets, analyzers, parallelism, and output folders, compiling
  differing settings in dependency order. Summaries report settings and sources, compile groups,
  durations, outputs, and diagnostics; structured results include `alSettings` and effective settings.
- Build summaries count errors/warnings per analyzer. `build --diagnostics` lists individual
  findings; workspace diagnostics now include warnings. Human output summaries list folders,
  while structured build results retain the full output list.
- `workspace build --bc-target current` uses NuGet symbols/tools; country only selects localized
  packages in this mode. Country alone, pinned versions, and Insider targets still use artifacts.
- **Migration:** an empty project `al.ruleSetPath` disables a workspace ruleset, and a configured
  ruleset path pointing to a missing file now fails build/check/compatibility instead of being
  ignored. Compatibility `--workspace` reads rulesets from the selected workspace file.

See [Build](/docs/build/), [Restore](/docs/restore/), and
[Artifact lookup](/docs/cli-reference/#artifacts-resolve).

## 0.5.6 — 2026-10-09

- Build projects without configuration using `build --project` or recursive `--project-root`,
  repeatable `--app`, changed-only selection, and optional `--include-dependents`. Local dependencies
  compile in order without being collected as selected outputs; tests can also be built.
- Direct/configured builds accept BC target/version/country selection. Pinned/Insider artifacts
  supply matching Microsoft symbols, compiler, and analyzers with isolated caches and outputs.
  Default `current` builds retain NuGet symbols. Build accepts exactly one country.
- Every build reports effective settings with provenance, diagnostics, outputs, and failing stage;
  structured results/manifests include the report. Reported secrets and restore feed URLs are masked.
- **Migration:** standalone compatibility `--changed-since` now validates only apps whose own
  files changed. Add `--include-dependents` for downstream validation. Build/check/plan configured
  change-detection behavior remains unchanged. Changed-only baseline downloads target validated apps.
- Project-root/workspace compatibility can run without a baseline source, compiling current
  production source without AppSourceCop. Directory builds/compatibility also discover
  `al.ruleSetPath` from project VS Code settings or an enclosing workspace.
- Ordinary preprocessor conditionals no longer make classification unknown; every branch is read
  so test codeunits remain visible. Malformed directives still warn. Classification warnings and
  changed-only discovery summaries are shorter.

See [Build](/docs/build/) and [Compatibility](/docs/compatibility/).

## 0.5.5 — 2026-10-08

- Compatibility accepts country lists such as `--bc-country de,us,w1`, with isolated source/cache
  runs and `--max-parallel-countries` (default 2). All countries report results; any failure fails
  the command.
- **Migration:** use `init --include-tests` instead of `--include-tests-by-name`. Source test
  codeunits determine classification, including apps containing test support objects.
  Discovered compatibility/translation selections exclude confirmed tests; unknown source stays
  eligible. Explicit configuration overrides inference. Duplicate manifest GUIDs in inventory fail validation.
- Selected production apps without baselines now compile/analyze current source without
  AppSourceCop instead of being skipped. Compatibility is N/A, while compile/analyzer failures
  fail the command. All-unpublished baseline lookup can succeed; feed failures still fail.
  Structured results add source-validation fields and remove `newAppsSkipped`.

## 0.5.4 — 2026-10-07

All four context commands accept repeatable `--dependency-source-folder`. Exact restored symbols
remain authoritative; matching local dependency source adds verified implementation members,
objects, and provenance. Mismatches/ambiguity produce `ALWCTX007`–`ALWCTX012`. Source-enriched
packages use schema 1.1; symbol-only packages retain 1.0. See [Agent Context](/docs/context/).

## 0.5.3 — 2026-10-05

Context preparation keeps the highest-ranked candidates fitting the 16 MiB package limit,
warns about omissions, and records `sizeLimitReached`. Generated JSON preserves readable Unicode.
Repeated symbol-object identities receive reproducible distinct keys instead of failing preparation.

## 0.5.2 — 2026-10-03

BC artifact builds use compiler binaries for the host OS and restore executable permissions for
Linux/macOS tools. Workspace builds accept Windows-style backslash paths across platforms.

## 0.5.1 — 2026-10-02

`analyze`, compatibility/translation validation, and all four context commands accept direct
`--workspace` selection. Only folders directly containing app.json are selected, without
recursive discovery. Compatibility supports workspace baseline directories, published symbols,
and relative `--app` filters. Analysis/compatibility change detection requires one Git repository.

## 0.5.0 — 2026-10-02

- [`alwasp check`](/docs/check/) runs configured verification gates over one deterministic
  target/profile, changed-only, or validated-plan selection. Independent translation gates
  continue after build failure. Test apps are reported as compiled, never executed.
- [`context search`, `object`, `usages`, and `prepare`](/docs/context/) provide offline local AL
  and restored-symbol evidence. Preparation writes a bounded agent package in `.alwasp/context/`
  without changing source or calling an AI service.
- Configured compatibility and check support top-level `compatibility.baseline.source:
  publishedSymbols` with an optional authenticated feed. Explicit per-app baselines win.
  Baselines resolve by AppId across package/publisher renames and use the highest stable version.
  At this release unpublished apps reported N/A without failing; 0.5.5 adds source validation.
- Verification/compatibility summaries include elapsed time, app verdict counts/IDs, and failure
  artifacts. Compiler diagnostics are counted separately from workflow messages.
- Builds count only compiler logs rewritten by the current group, preventing earlier warnings
  from failing later groups or being counted twice in manifests.

## 0.4.4 — 2026-09-30

- Translation preparation/validation support source character limits, approved locale glossaries,
  and package-directory checks for glossary violations, terminology differences, and inconsistent
  translations. Coverage reports length violations; `--fail-on needs-review` makes them fatal.
- Packages record terminology/expected BC versions and available source revision metadata.
  `--expected-bc-version` warns about terminology mismatches without changing artifact selection.
- Templates preserve target BOM/newline/XML declaration conventions. Apostrophe guidance follows
  existing unit/file style without rewriting punctuation. See [Translation Preparation](/docs/translation-preparation/).

## 0.4.3 — 2026-09-29

### Workspace builds against Business Central artifacts

`workspace build` can select an Insider target with `--bc-target next-minor|next-major`, or a
released version with `--bc-version`, plus a localization with `--bc-country`. Microsoft symbols,
compiler, and analyzers come from the same artifact; partner dependencies still use NuGet.
Artifact package caches are isolated by version and country. Workspace `--clean` also clears
other associated package caches, skipping those in use. See [Build](/docs/build/#business-central-artifact-selection).

### Terminal diagnostics

Interactive human output supports clickable paths and public URLs through
`ALWASP_HYPERLINKS=auto|always|never`. CI, redirected streams, and machine output remain plain.
Failed commands list available diagnostic logs, build manifests, and translation coverage reports
in a deduplicated human-only `Failure artifacts` section.

## 0.4.2 — 2026-09-23

### Select apps for compatibility validation

Repeatable `validate compatibility --app` selects apps by name, GUID, or project path in directory
mode. With `--get-baseline-symbols`, only selected apps receive baseline downloads and validation;
required local dependencies still compile. Unknown or ambiguous selectors fail. See
[Compatibility](/docs/compatibility/#select-specific-apps).

## 0.4.1 — 2026-09-22

### Translation packages and dependency context

Translation preparation includes context from direct and transitive non-Microsoft dependencies,
using local translations or restored packages. Repeatable `--parent-source-folder` supplies parent
source repositories without building them or adding output apps. Microsoft terminology uses Base
Application and supports large translation files.

Apps must declare the target locale in `app.json`'s `supportedLocales`; missing or empty lists
skip the app. Apps with no translation work are also skipped, and regeneration removes stale
folders. An entirely skipped selection succeeds with an empty package.

Package directories now use app names or configured IDs, with safe names and GUID suffixes for
collisions. `<App Name>.<language>.xlf` replaces `target.xlf`; manifests include `appName` and
`translationFile`, and JSON preserves readable Unicode. Update scripts to read the manifest's
directory and filename. See [Translation Preparation](/docs/translation-preparation/).

### Default output locations

Plans now default to `.alwasp/alwasp-plan.json`, build manifests to `.alwasp/build-manifest.json`,
and translation packages to `.alwasp/translation/<language>`. Update scripts and CI artifact
collection that relied on `.output`. Explicit plan and manifest paths retain their existing
behavior.

## 0.4.0 — 2026-09-22

### External translation preparation

`alwasp translation prepare` creates deterministic packages containing authoritative source,
reusable translations, optional secondary-language context, focused Microsoft Business Central
terminology, unit metadata, and translator instructions. `alwasp translation validate` strictly
checks returned XLIFF structure, source, metadata, inline codes, and placeholders. ALWasp prepares
and validates content but does not translate or connect to AI services. See
[Translation Preparation](/docs/translation-preparation/).

### .NET 10 runtime

ALWasp now targets `net10.0` and requires the .NET 10 runtime. CLI behavior and structured output
formats are otherwise unchanged. The remaining internal Free/Pro split and obsolete preview
compatibility machinery were removed without changing commands or exit codes.

## 0.3.9 — 2026-09-10

### Compatibility workflow improvements

- `--get-baseline-symbols` defaults to the current directory when it contains `app.json`.
- Directory validation accepts `--profile` to choose Application Insights settings independently
  of the default build target.
- Application Insights transforms now apply to next-minor and next-major validation targets.
- Missing published baselines are grouped into one counted, collapsible CI log section.
- Restore includes the Microsoft Application wrapper required by `app.json`'s `application`
  property, preventing AL1022 when only Base and System Application symbols were cached.

## 0.3.8 — 2026-09-09

### Changed-only compatibility validation

`validate compatibility --project-root` accepts `--changed-since <ref>` to validate changed apps
and their downstream dependents. Unchanged local prerequisites are compiled without AppSourceCop.
References may be `latest`, `latest:<glob>`, `latest-merge:<text>`, or an explicit Git ref.

## 0.3.7 — 2026-09-08

### CI compiler annotations

Compatibility validation and single-project builds now emit native Azure Pipelines and GitHub
Actions compiler diagnostic annotations, matching workspace and config-driven builds.

## 0.3.6 — 2026-09-08

### Downloadable compatibility baselines

`validate compatibility --project-root ... --get-baseline-symbols [feed-url]` downloads the latest
stable baselines from Microsoft AppSourceSymbols or a private NuGet feed. See
[Compatibility](/docs/compatibility/#download-the-latest-stable-baselines).

## 0.3.5 — 2026-09-04

### Deterministic package overrides

When multiple restored packages share an AppId, `restore.overridesFolder` now replaces the highest
version rather than whichever file happened to be enumerated last.

## 0.3.4 — 2026-09-04

### Profile-specific translation gates

Profiles can override top-level `translations` settings, allowing release profiles to enforce
different `failOn` or `minCoverage` gates. App-level enabled/language settings still win.

## 0.3.3 — 2026-09-03

### Development versions

`versioning.releaseType: Dev` preserves Major.Minor.Build and forces Revision to at least `1`, a
fixed marker for non-release builds that must sort above the corresponding release version.

## 0.3.2 — 2026-09-03

### Plan-consumer versioning baseline

`build --plan` accepts `--changed-since` for `versioning.applyTo: changedOnly`. It does not alter
planned selection and fails if the resolved base differs from the plan's recorded base.

## 0.3.1 — 2026-08-31

### Business Central artifact targeting

Compatibility validation can target `current`, `next-minor`, or `next-major`, pin a concrete BC
version, and select a country code (default `W1`). `alwasp artifacts download` exposes the same
verified artifact download and cache workflow independently.

## 0.3.0 — 2026-08-28

### Deterministic CI plans

`alwasp plan [targetOrProfile] --changed-since <ref> [--plan-file <path>]` creates a versioned,
timestamp-free JSON plan without compiling anything. It selects directly changed projects,
downstream applications, and affected test apps, restores upstream compile prerequisites, and
records project/AppIds, build and deployment order, repository commits, changed-file hashes, the
configuration hash, and an input fingerprint. A change to `alwasp.json`, a configured NuGet
config, or an active ruleset selects the complete requested target; no relevant changes produce a
successful empty plan; dependency cycles fail plan creation. The default output is
`.output/alwasp-plan.json`.

`alwasp build --plan <path>` consumes a generated plan instead of resolving selection itself. It
fails closed on schema, fingerprint, configuration, Git HEAD, changed-file set/content, profile,
project ID, or App ID drift, and restores, transforms, and compiles only each profile's planned
projects; an empty plan is a successful no-op. Builds without `--plan` are unchanged. See
[CI/CD](/docs/ci-cd/#deterministic-ci-plans) and [Build](/docs/build/#plan-based-builds).

### Clean builds

`--clean` on `alwasp build` and `alwasp workspace build` removes the prior ALWasp package cache,
compiled output, compiler log, and build-manifest artifacts before restoring and compiling, while
leaving unrelated files in custom output and log directories untouched. See
[Build](/docs/build/#clean-builds).

## 0.2.5 — 2026-08-22

### Smaller, non-duplicated result files

`analyze`, `validate translations`, and config-driven `build` no longer embed their full
report/manifest a second time inside the `--result-file` document when a separate report or
manifest file was also produced (`--json`, or `workspace.manifest` for `build`). A
`jsonReportPath`/`manifestPath` pointer is written instead when both files exist; the full object
is still embedded directly when no separate file was requested.

`validate translations --json` now writes `translations-report.json` in camelCase, matching every
other JSON report and manifest this CLI produces.

## 0.2.4 — 2026-08-22

### Translation validation respects the configured language scope

A non-empty `translations.languages` (or `--languages`) list is now the *scope* of
`alwasp validate translations`, not only the required set. Translation files for languages
outside that list no longer contribute coverage failures. Leaving the list empty still checks
every discovered language, as before. See [Translation Coverage](/docs/translations/#configuration).

## 0.2.3 — 2026-08-22

### Per-project literal Application Insights values

`applicationInsights.source: "literalByProject"` maps a project id directly to a literal
Application Insights value through the new `applicationInsights.values` map — for the common
case of each app having its own fixed, permanently-assigned Application Insights resource.
Unlike `environmentByProject`, there is no environment-variable indirection: the mapped string
is written to `app.json` as-is. See [Configuration](/docs/configuration/#applicationinsights).

## 0.2.2 — 2026-08-21

### Compatibility validation built into the normal build

A profile can set `compatibility.enabled: true` so its ordinary `alwasp build` performs
baseline-bound AppSourceCop validation for apps declaring `compatibility.baseline`, and the
validated compilation becomes the profile's collected build artifact — no more separate
`validate compatibility` followed by `build`. Compatibility is scoped to the profile; other
profiles keep their normal analyzer settings. See
[Compatibility](/docs/compatibility/#profile-bound-baseline-validation).

### Other changes

- Config-driven build manifests classify each profile's `artifactType` (`apps`, `tests`, or
  `mixed`), so CI pipelines can distinguish application and test output profiles without relying
  on profile names. See [Build](/docs/build/#manifests).
- `validate compatibility` now temporarily applies the effective build-time `applicationInsights`
  setting before invoking AppSourceCop and restores `app.json` afterward, preventing false
  `AS0092` warnings when the connection string or instrumentation key is intentionally injected
  by the following build.

## 0.2.1 — 2026-08-20

### One package, no license gate

The separate Pro edition and signed-license requirement have been retired. `alwasp analyze`,
`alwasp validate translations`, and the universal `--format json|ndjson` and `--result-file`
options now ship unconditionally in the single `left-code.AlWasp` package.

The package ID and `alwasp` command are unchanged. Existing `left-code.AlWasp` installations can
update in place. If you installed the former `left-code.AlWasp.Pro` package, uninstall it and
install `left-code.AlWasp` instead.

### Config-driven package overrides

Config-driven builds can set `restore.overridesFolder` to replace a restored dependency with a
pre-built `.app` matched by its embedded AppId. This supports CI workflows that consume another
repository's build before the corresponding NuGet package is published. See
[Package overrides](/docs/restore/#package-overrides) for matching, warnings, and failure rules.

## 0.2.0 — 2026-08-17

Version `0.2.0` introduced the earlier Free/Pro product split. Version `0.2.1` supersedes that
model with the single package described above; no license migration is required.
