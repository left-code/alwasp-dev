---
title: Build
description: Compile single projects, config-driven targets, and workspace files with restore, analyzers, manifests, and transformations.
order: 4
---

# Build

`alwasp build` has two modes:

| Mode | Trigger | Compiler |
|---|---|---|
| Config-driven | `alwasp.json` exists or `--config` / `--profile` is used | `altool workspace compile` |
| Single-project | No `alwasp.json` | `alc` |

## Config-driven build

```bash
alwasp build
alwasp build release
alwasp build ci
alwasp build --profile appsource
```

Config-driven builds load and validate `alwasp.json`, resolve target/profile selection, restore symbols for selected projects, group projects by effective compiler settings, generate temporary `.code-workspace` files, and run `altool workspace compile` per group.

## Temporary app.json transformations

Config-driven `build` can temporarily patch selected projects before compilation:

| Feature | Written to app.json |
|---|---|
| Versioning | `version` |
| Resource exposure | `resourceExposurePolicy` |
| Application Insights | `applicationInsightsConnectionString` or `applicationInsightsKey` |
| Preprocessor symbols | `preprocessorSymbols` |

Before modifying, ALWasp backs up `app.json` to `app.json.alwasp.bak`. It restores the original file in a `finally` block even when the build fails. A stale backup from an interrupted run is recovered before future builds or version application.

Config-driven `defines` are written per project into `app.json` `preprocessorSymbols` and unioned with symbols already present in the source file. This avoids workspace-wide `/define` arguments and allows projects with different define sets to stay in the same compile group when the rest of their compiler settings match.

## Warning policy

`altool workspace compile` has no treat-warnings-as-errors flag. ALWasp enforces `warningPolicy.treatWarningsAsErrors` after compile by parsing the group's log files. If non-suppressed warnings remain, ALWasp forces that group to fail and prints the offending warnings to the console, even without `--diagnostics`.

```json
{
  "defaults": {
    "warningPolicy": {
      "treatWarningsAsErrors": true
    }
  }
}
```

## Manifests

Config-driven builds can write a structured manifest with selected projects, groups, effective settings, diagnostics, timestamps, and per-project transformation traceability.

```bash
alwasp build ci --manifest output/build-manifest.json
```

Configured manifest paths take priority:

1. `profile.manifest`
2. `workspace.manifest`
3. CLI `--manifest`

When a target runs multiple profiles, ALWasp writes one combined manifest. The manifest path is resolved from the first selected profile with `manifest`, then `workspace.manifest`, then the CLI option.

## Single-project build

When no config is present:

```bash
alwasp build
alwasp build --restore --latest
alwasp build --out ./artifacts/MyApp.app
alwasp build --codecop --appsourcecop --ptecop --uicop
```

ALWasp resolves `app.json`, restores symbols, locates `alc` through `ALC_PATH`, the tool cache, or NuGet download, then invokes the compiler with mapped options.

## Workspace build

Low-level workspace compile is still available:

```bash
alwasp workspace build ./MyWorkspace.code-workspace --restore
alwasp workspace build --max-cpu-count 4 --ruleset ./ruleset.json
alwasp workspace build --manifest ci/build-manifest.json
```

For multi-project repositories, prefer config-driven `alwasp build`.

## Tool cache

`alwasp build` downloads `alc` / `altool` automatically when needed, using the `Microsoft.Dynamics.BusinessCentral.Development.Tools` package and the cache under `~/.alwasp/tools/<version>/`. To warm or clean this cache explicitly:

```bash
alwasp tools update
alwasp tools update --check
alwasp tools update --clean
```
