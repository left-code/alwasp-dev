---
title: Release Notes
description: User-facing changes in ALWasp releases.
order: 10
---

# Release Notes

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
