---
title: Build
description: Compile single projects, config-driven targets, and workspace files with restore, analyzers, manifests, and transformations.
order: 4
---

# Build

`alwasp build` has three modes:

| Mode | Trigger | Compiler |
|---|---|---|
| Direct projects | Explicit `--project` or `--project-root` | `altool workspace compile` |
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
`.alwasp/alwasp-plan.json`.

```bash
alwasp plan ci --changed-since origin/main --plan-file .alwasp/alwasp-plan.json
alwasp build --plan .alwasp/alwasp-plan.json
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

For config-driven and workspace builds, `--manifest` without a path defaults to
`.alwasp/build-manifest.json`. Explicitly configured paths retain their existing meaning.

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

### Business Central artifact selection

Choose Microsoft symbols and matching compiler/analyzers from a released or Insider artifact:

```bash
alwasp workspace build --bc-country DE
alwasp workspace build --bc-target next-minor --bc-country DE
alwasp workspace build --bc-target next-major
alwasp workspace build --bc-version 27.5 --bc-country DE
```

`--bc-target` accepts `current`, `next-minor`, or `next-major` and cannot be combined with `--bc-version`.
`current` uses NuGet symbols and the ordinary compiler, without a BC artifact; with this target,
`--bc-country` only selects localized NuGet packages.
A four-part version pins an exact released build; a two- or three-part version selects the latest
matching build. A major version alone is rejected. Country codes are case-insensitive and default
to `W1`. With country alone, ALWasp selects the latest released artifact in the highest
`application` major/minor line across workspace apps. Source `app.json` files are not rewritten.

The verified artifact cache supplies a coherent application/platform pair, Microsoft symbols,
and matching tools. Non-Microsoft dependencies still use NuGet, including feed/authentication
options, `--latest`, and transitive dependencies. Microsoft dependencies are excluded from NuGet
at every level, and workspace app IDs are skipped during dependency restore.

Artifact builds use `.alwasp-bc/<packages-name>/<version>-<country>` next to the configured
packages folder, which defaults to `.alpackages`. These caches isolate BC versions and countries
from ordinary builds and from other package folders. They are not nested inside the packages
folder because AL tooling searches its subdirectories. `--outfolder` still collects newly
compiled apps.

For workspace builds, `--clean` clears ALWasp artifacts from the ordinary package cache and its
associated artifact caches, including other versions and countries. A cache in use by another
ALWasp process is skipped with a warning. Unrelated files remain in place.

The selected artifact must include `altool` with workspace compilation support. Otherwise the
build fails instead of substituting another compiler. Explicit artifact selection does not use
`AL_PATH` or `ALC_PATH` overrides. Omitting all three options, or selecting `--bc-target current`,
uses the ordinary NuGet restore and compiler-resolution behavior, with package folders from CLI
options, supported VS Code settings, or defaults.

## Generated paths and failure diagnostics

Since 0.4.1, default plans and manifests use `.alwasp` instead of `.output`. Update CI artifact
collection and scripts relying on the defaults. Explicit `--plan-file` and manifest paths still
work, so pipelines can retain an old location by supplying it explicitly.

Failed commands list available diagnostic logs and build manifests in a deduplicated
`Failure artifacts` section. Interactive terminals can make these paths clickable; see
[CLI output controls](/docs/cli-reference/#terminal-links-and-failure-artifacts).

## Tool cache

`alwasp build` downloads `alc` / `altool` automatically when needed, using the `Microsoft.Dynamics.BusinessCentral.Development.Tools` package and the cache under `~/.alwasp/tools/<version>/`. To warm or clean this cache explicitly:

```bash
alwasp tools update
alwasp tools update --check
alwasp tools update --clean
```

## Direct project builds

```bash
alwasp build --project ./src/Core
alwasp build --project-root ./src --app Core --app Sales
alwasp build --project-root ./src --changed-since origin/main
alwasp build --project-root ./src --changed-since origin/main --include-dependents
alwasp build --project-root ./src --bc-version 27.5 --bc-country DE
```

Explicit direct selection takes precedence even when `alwasp.json` exists. It cannot be combined
with a positional target/path, `--profile`, `--plan`, or `--config`. `build` has no `--workspace`
option; use `workspace build` for that workflow. `--app` is repeatable in project-root mode and
accepts names, app IDs, or paths relative to the root. Unknown/ambiguous selectors fail.

Projects compile in dependency order, including test apps. Required local dependencies compile
as dependency-only projects and are not collected as requested outputs. `--changed-since`
selects apps whose own files changed and the dependencies needed to compile them; add
`--include-dependents` to also build downstream apps. No selected changes succeeds without compilation.

The pipeline shares configured build's restore, package-cache locking, temporary app.json edits
and restoration, and per-project manifest records. Ordinary direct builds collect output in
`<selection-root>/.output`; artifact builds default to `.output/<version>-<country>`.
`--outfolder` overrides this relative to the current directory; `--out` is rejected.

## Business Central targets for build

Direct and configured builds accept `--bc-target current|next-minor|next-major`, `--bc-version`,
and exactly one `--bc-country` (CLI, then `restore.country`, then `W1`). `current` keeps NuGet
Microsoft symbols and ordinary tool resolution. A pinned version or Insider target supplies one
coherent artifact's Microsoft symbols, compiler, and analyzers; partner dependencies still use
NuGet. `--bc-version` excludes `--bc-target next-minor|next-major`. A conflicting configured
`workspace.bcVersion` major/minor fails validation.

Artifact package caches use `.alwasp-bc/<packages-name>/<version>-<country>` next to the package
folder. Missing artifacts or workspace-capable compilers fail instead of substituting another
target. These options are rejected for a positional app.json build. Country lists are supported
by compatibility validation, not build. Linux/macOS artifact tools use the matching OS binaries;
workspace paths may use Windows backslashes across platforms.

## Effective configuration and rulesets

Every `build` reports the effective settings and their source: `cli`, `config`, `profile`,
`project`, `discovered`, `default`, `resolved`, or `notResolved`. The summary includes per-project
settings, diagnostics totals, outputs, and the failing stage. Quiet mode suppresses successful
summary text. Structured results expose `effectiveConfiguration`; build manifests add `mode`,
`selection`, `projects[].role`, and `effectiveConfiguration` without changing their schema version.
Credentials, secret URL parameters, bearer tokens, and connection strings are redacted.

Directory-mode builds discover a project ruleset first (`ruleset.json`, then `*.ruleset.json`),
then `al.ruleSetPath` in project `.vscode/settings.json`, then an enclosing `.code-workspace`.
Settings paths resolve relative to the project folder. An explicit empty project `al.ruleSetPath`
disables the workspace setting; a configured path pointing to a missing file fails the command. Workspace
discovery uses only the nearest ancestor level with a single workspace file whose `folders` list
the project. Unrelated workspaces are ignored and farther workspaces do not supply fallback settings.
An explicit CLI ruleset wins. For `build` and `workspace build`, a bare or empty `--ruleset`
is treated as omitted, allowing normal discovery (useful for empty pipeline variables).
Diagnostics count only logs rewritten by the current compile group,
so earlier groups' warnings cannot fail a later group.

### VS Code AL settings for workspace builds

Since 0.5.7, `workspace build` reads the selected workspace's `settings` and each project's
`.vscode/settings.json`. Explicit CLI options override project settings, which override workspace
settings, then defaults. The low-level command validates `alwasp.json` but does not take build
settings from it; use config-driven `build` for profiles and per-project configuration.

| Setting | Workspace build behavior |
|---|---|
| `al.packageCachePath` | String or array of symbol-cache paths; combine entries across projects, with the first as the shared writable cache and the rest read-only |
| `al.ruleSetPath` | Per-project ruleset; an empty value disables the workspace ruleset |
| `al.enableCodeAnalysis` / `al.codeAnalyzers` | Enable the listed built-in cops or local analyzer assemblies only when code analysis is enabled |
| `al.compilationOptions.maxDegreeOfParallelism` | Positive integer controlling compile parallelism |
| `al.compilationOptions.outFolder` / `al.packageOutputPath` | Copy each project's compiled app into its own output folder; the compilation outFolder setting takes priority |

All relative settings paths resolve against each project folder, even when declared in the
workspace file. For sibling project folders, `../.alpackages` names a shared cache. Comments and
trailing commas in settings files are accepted. Explicit `false` and empty values stop fallback
to workspace settings. CLI analyzer flags override their corresponding settings individually,
including explicit `false`; `--outfolder` collects all projects into one folder instead of the
settings-defined folders.

For example, add this `settings` object to a workspace containing sibling AL project folders:

```json
{
  "settings": {
    "al.packageCachePath": "../.alpackages",
    "al.enableCodeAnalysis": true,
    "al.codeAnalyzers": ["${CodeCop}", "${UICop}"],
    "al.compilationOptions.maxDegreeOfParallelism": 4,
    "al.packageOutputPath": "./output"
  }
}
```

Projects with different effective rulesets, analyzers, or parallelism compile in dependency-ordered
groups, one `altool workspace compile` run per group. Identical ruleset contents can share a group.
A failed group stops subsequent groups. BC artifact builds retain their isolated cache and do not
use additional settings-defined caches.

Missing configured ruleset files, invalid active analyzer tokens or missing analyzer assemblies,
and non-positive parallelism fail before compilation. Malformed settings files or wrong value
types produce warnings. `al.nugetFeeds` and `al.symbolsCountryRegion` are recognized but not
applied; use ALWasp's feed/country options. Effective settings and their origin appear in
`alSettings` in structured results. Workspace builds also report `effectiveConfiguration`,
including per-project settings with `vscodeProject` / `vscodeWorkspace` provenance, compile-group
durations, diagnostics, output folders, and the outcome.

### Analyzer findings

Build summaries count compiler and analyzer errors/warnings separately (CodeCop, AppSourceCop,
UICop, and other cops). Use `build --diagnostics` (alias `--diagnostic`) or
`workspace.diagnostics: true` in `alwasp.json` for configured builds to list individual findings.
`workspace build --diagnostics` lists warnings as well as errors.

The human `Outputs:` summary lists output folders. Structured build results retain the full
output list and add per-analyzer totals under `effectiveConfiguration.diagnostics.analyzers`.
