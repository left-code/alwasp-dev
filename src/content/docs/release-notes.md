---
title: Release Notes
description: User-facing changes in ALWasp releases.
order: 10
---

# Release Notes

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
