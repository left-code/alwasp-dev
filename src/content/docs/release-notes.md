---
title: Release Notes
description: User-facing changes in ALWasp releases.
order: 10
---

# Release Notes

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
