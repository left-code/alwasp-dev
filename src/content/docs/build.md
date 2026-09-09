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
| Internal dependency versioning | Matching `dependencies[].version` values |
| Resource exposure | `resourceExposurePolicy` |
| Application Insights | `applicationInsightsConnectionString` or `applicationInsightsKey` |
| Preprocessor symbols | `preprocessorSymbols` |

Before modifying, ALWasp backs up `app.json` to `app.json.alwasp.bak`. It restores the original file in a `finally` block even when the build fails. A stale backup from an interrupted run is recovered before future builds or version application.

Version-only changes are applied surgically: ALWasp replaces only the relevant top-level `version` and internal dependency `version` values. Unrelated content, comments, indentation, line endings, Unicode, and escaped characters remain unchanged. Internal dependencies are matched by app GUID; external packages are never modified.

Config-driven `defines` are written per project into `app.json` `preprocessorSymbols` and unioned with symbols already present in the source file. This avoids workspace-wide `/define` arguments and allows projects with different define sets to stay in the same compile group when the rest of their compiler settings match.

## Plan-based builds

`alwasp plan [targetOrProfile] --changed-since <ref> [--plan-file <path>]` creates a deterministic,
timestamp-free JSON plan without compiling anything: directly changed projects, downstream
applications, affected test apps, and the internal prerequisites needed to compile them, plus
dependency build levels, deployment order, repository commit IDs, changed-file hashes, the
configuration hash, and an input fingerprint. A change to `alwasp.json`, a configured NuGet
config, or an active ruleset selects the complete requested target; no relevant changes produce a
successful empty plan; dependency cycles fail plan creation. The default output is
`.output/alwasp-plan.json`.

```bash
alwasp plan ci --changed-since origin/main --plan-file .output/alwasp-plan.json
alwasp build --plan .output/alwasp-plan.json
```

`alwasp build --plan <path>` consumes that plan instead of resolving target/profile/change
selection itself. It fails closed if the schema major version or fingerprint is invalid, or if the
configuration, repository HEAD, changed-file set/content, or planned profiles/project App IDs have
drifted since the plan was created. It restores, transforms, and compiles only each profile's
planned projects; an empty plan succeeds without invoking restore or compilation. `--plan` cannot
be combined with a positional target or `--profile`. A supplied `--changed-since` affects only
`versioning.applyTo: changedOnly`; it never changes the plan's project selection. ALWasp resolves
it and fails closed if its base differs from the plan's recorded base. Builds without `--plan`
keep their existing behavior. See [CI/CD](/docs/ci-cd/#deterministic-ci-plans).

## Clean builds

`--clean` on `alwasp build` (single-project and config-driven) and `alwasp workspace build` removes
the prior ALWasp package cache, compiled output, compiler log, and build-manifest artifacts before
restoring and compiling. Files in custom output and log directories that ALWasp did not produce are
left in place.

```bash
alwasp build --clean
alwasp build ci --clean
alwasp workspace build --clean
```

## Compatibility-validated builds

A profile can set `compatibility.enabled: true` so its normal build compiles apps declaring
`compatibility.baseline` with AppSourceCop bound to that baseline, making the build's own output
the compatibility-validated artifact instead of a separate `validate compatibility` step. See
[Compatibility](/docs/compatibility/#profile-bound-baseline-validation).

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

Config-driven builds can write a structured manifest with selected projects, groups, effective settings, diagnostics, timestamps, and per-project transformation traceability. Each project records its original and effective version plus `internalDependencyVersions`, which lists every internal dependency version applied for that build without exposing unrelated package data. Each profile entry also records an `artifactType` of `"apps"`, `"tests"`, or `"mixed"`, derived from its selected projects, so a CI pipeline can distinguish application and test output profiles without relying on profile names, selection syntax, or output-folder conventions.

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
