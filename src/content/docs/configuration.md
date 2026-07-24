---
title: Configuration
description: Understand alwasp.json inventories, profiles, targets, restore settings, transformations, and schema validation.
order: 2
---

# Configuration

Config-driven builds use `alwasp.json` at the repository root. The JSON Schema is published at `https://alwasp.dev/schema/alwasp.schema.json`.

```json
{
  "$schema": "https://alwasp.dev/schema/alwasp.schema.json",
  "version": 1,
  "defaultTarget": "release"
}
```

## Three layers

| Layer | Purpose |
|---|---|
| `apps` / `tests` | Project inventory and source paths |
| `defaults` / `profiles` | Build settings and selected projects |
| `targets` | Ordered profile shortcuts for local and CI workflows |

## Minimal config

```json
{
  "version": 1,
  "defaultTarget": "ci",
  "apps": [
    { "id": "Broker", "path": "./Broker" }
  ],
  "tests": [
    { "id": "BrokerTest", "path": "./BrokerTest", "app": "Broker" }
  ],
  "profiles": {
    "appsource": {
      "include": "apps",
      "appSourceCop": true,
      "warningPolicy": { "treatWarningsAsErrors": true }
    },
    "test": {
      "include": "tests"
    }
  },
  "targets": {
    "ci": ["appsource", "test"]
  }
}
```

## Include selectors

`profile.include` accepts:

| Value | Selects |
|---|---|
| `"apps"` | Every configured app project |
| `"tests"` | Every configured test project |
| `"Broker"` | A single project by id |
| `["apps", "BrokerTest"]` | Ordered mixed selection |

## Per-app compatibility baseline

An app entry can identify the previous compiled package used by config-driven AppSourceCop validation:

```json
{
  "apps": [
    {
      "id": "Broker",
      "path": "./Broker",
      "compatibility": {
        "baseline": "./latest/Broker.app"
      }
    }
  ]
}
```

The baseline path is resolved relative to `alwasp.json`. It is consumed by `alwasp validate compatibility [targetOrProfile]`, not by `alwasp build`. Projects selected by the target/profile without a configured baseline are skipped by compatibility validation.

## `defaults`

Compiler settings applied to every profile unless overridden:

| Field | Purpose |
|---|---|
| `ruleset` | Path to a ruleset file overriding diagnostic severities |
| `nowarn` | Warning codes to suppress, merged with profile/override `nowarn` |
| `warningPolicy.treatWarningsAsErrors` | Fail the build if any non-suppressed warning remains after compile (enforced by ALWasp from parsed diagnostic logs, since `altool` has no such flag). `warnAsError` is a legacy alias, used only when `warningPolicy` is unset at the same level |
| `errorLog` | Path to write all diagnostics |
| `features` | Feature flags, merged with profile/override values, passed to the compiler |
| `defines` | Preprocessor symbols, merged with profile/override values. Config-driven build writes them into each project's `app.json` `preprocessorSymbols` (restoring `app.json` afterwards) rather than passing a workspace-wide `/define` — see the note below |
| `parallel` / `maxParallelism` | Parallel compilation within a project (default `true` / `4`) |
| `analyzers` | `codeCop`, `appSourceCop`, `pteCop`, `uiCop` booleans plus `custom` analyzer DLL paths. Booleans resolve override → profile → defaults; `custom` is only definable in `defaults` |
| `outFolder` | Default output folder for compiled `.app` files, used by any profile without its own `outFolder` |

## `tooling`

Optional overrides for AL compiler tool paths — by default ALWasp downloads tools automatically:

| Field | Purpose |
|---|---|
| `alcPath` | Path to `alc` / `alc.exe`, overrides `ALC_PATH` |
| `altoolPath` | Path to `altool` / `altool.exe`, overrides `AL_PATH` |

## Profile fields beyond `include`

| Field | Purpose |
|---|---|
| `outFolder` | Output folder for this profile's compiled `.app` files, overriding `defaults.outFolder` |
| `needsProfile` | Profile name(s) whose compiled apps must be staged into the package cache before this profile builds (e.g. a test profile that needs the apps it exercises). The referenced profile must run earlier in the same target and declare an `outFolder` (its own or `defaults.outFolder`). Staged apps are removed afterward |
| `outputSuffix` | Cosmetic suffix appended to each compiled `.app` file name before the `.app` extension (e.g. `_develop`); affects the file name only, never the app identity |
| `manifest` | Path for the build manifest written after this profile completes; takes precedence over `workspace.manifest` |
| `overrides` | Per-project setting overrides, keyed by project id |

## Settings merge order

Compiler settings are resolved from the broadest level to the most specific level:

```text
defaults -> profile -> overrides.<projectId>
```

Use this rule of thumb:

- Put shared settings in `defaults`.
- Put workflow-specific settings in a `profile`.
- Put one-off project exceptions in `profile.overrides.<projectId>`.

How values combine:

| Setting type | Behavior |
|---|---|
| Lists such as `defines`, `features`, and `nowarn` | Merged from all levels |
| Most booleans and strings | Most specific value wins |
| Analyzer booleans | Resolve override -> profile -> defaults |
| `custom` analyzer DLLs | Defined only in `defaults.analyzers.custom` |

### Defines and preprocessor symbols

`defines` are handled differently from most compiler options:

- ALWasp writes the resolved symbols into each project's `app.json` `preprocessorSymbols`.
- The original `app.json` is restored after the build.
- Symbols already present in `app.json` are preserved and unioned with configured symbols.
- A project included by more than one selected profile resolves its symbols once; the first including profile wins.

This avoids passing a workspace-wide `/define` value to `altool`. Projects that differ only by `defines` can stay in the same compile group, which reduces the number of compiler invocations.

## Important sections

These sections are optional. Add only the ones your repository needs.

### `restore`

Controls symbol restore before builds.

Common fields:

- `enabled`: turn automatic restore on or off.
- `mode`: `Locked` for stable graph selection, or `LatestAll` for floating latest versions.
- `packagesFolder`: shared symbol package folder, usually `.alpackages`.
- `feeds`, `nugetConfig`, `authMode`, `feedTokenEnv`: private feed and authentication settings.
- `country`: optional Business Central localization code for Microsoft symbols.

Set `country` to a code such as `DE` to prefer matching localized Microsoft symbols, including explicit test-library dependencies. Restore falls back to the unlocalized package when a matching localization does not exist. Omit `country` or use `W1` to prefer unlocalized/W1 packages.

### `workspace`

Controls how config-driven workspace compilation runs.

Common fields:

- `root`: workspace root path.
- `maxCpuCount`: passed to `altool workspace compile`.
- `logDirectory`: where `altool` logs are written.
- `manifest`: default config-driven build manifest path.
- `diagnostics`: parse and display compiler diagnostics from logs.
- `continueOnError`: continue with later groups/profiles after a failed group.
- `bcVersion`: fallback Business Central version for Application Insights `auto` mode.
- `sourceUrl` / `sourceCommit`: optional manifest metadata.

### `versioning`

Calculates effective app versions before build or during `alwasp version apply`.

Key choices:

- `enabled`: turn version calculation on or off.
- `source`: `appJson`, `nuget`, or `explicit`.
- `explicitVersion`: required when `source` is `explicit`.
- `fallbackToAppJson`: when `source` is `nuget`, use the current `app.json` version if no published package is found.
- `releaseType`: `Release`, `Preview`, `Hotfix`, or `None`.
- `applyTo`: `all` or `changedOnly`.
- `includeDependencies`: update internal dependency entries to the calculated versions of selected projects; defaults to `true`.
- `dependencyUpdateScope`: `directlyChanged` (default) updates references only to dependency projects changed directly in git; `allVersioned` propagates every selected calculated version.

Set it at the top level for all profiles, or override individual fields per profile.

Internal dependencies are matched by app GUID, so similarly named external packages are never changed. During `build`, dependency versions are temporary and the original `app.json` files are restored. During `version apply`, both the calculated project version and eligible internal dependency versions are written permanently.

### `resourceExposurePolicy`

Temporarily writes Business Central source/debugging exposure fields into `app.json` before compilation.

Supported fields:

- `allowDebugging`
- `allowDownloadingSource`
- `includeSourceInSymbolFile`

Unset fields are left untouched, and the original `app.json` is restored after build. The removed `showMyCode` and `enableDebugging` config fields are not supported.

### `applicationInsights`

Temporarily writes Application Insights settings into `app.json`.

Key fields:

- `enabled`: turn injection on or off.
- `source`: `literal`, `environment`, or `environmentByProject`.
- `mode`: `auto`, `connectionString`, or `instrumentationKey`.
- `value`: used with `source: literal`.
- `environmentVariable`: used with `source: environment`.
- `environmentVariables`: project id to environment variable map for `source: environmentByProject`.

`mode: auto` chooses between `applicationInsightsConnectionString` and `applicationInsightsKey` from the app's `runtime`, falling back to `workspace.bcVersion`. Secret values are never written to the manifest or logs.

### `changeDetection`

Maps local git diffs to configured projects.

Common fields:

- `mode`: `git` to enable for every run, or `none` to enable only when `--changed-since` is passed.
- `base`: `latest`, `latest:<glob>`, `latest-merge:<text>`, or an explicit tag, branch, or commit.
- `head`: defaults to `HEAD`.
- `includeDependents`: when `true` (the default), also marks transitive dependents as changed.

`latest-merge:<text>` selects the nearest merge commit on `head`'s first-parent history whose commit message contains the supplied text. This is useful when a release merge, rather than its earlier release tag, should begin the next change-detection cycle. The local checkout must contain enough history to reach the merge.

`changeDetection.includeDependencies` remains accepted as a deprecated alias for `includeDependents`. Use `includeDependents` in new and updated configurations; it wins if both names are present.

## Validate

```bash
alwasp config validate
alwasp config validate --config path/to/alwasp.json
```

Validation reports all errors in one pass:

- Missing/duplicate app or test ids, and test `app` references to unknown apps
- Profiles missing `include`, or with `include`/`overrides` keys that don't match `apps`, `tests`, or a known project id
- `outputSuffix` values that aren't safe filename fragments
- `needsProfile` references to an unknown or self profile, or to a profile with no `outFolder` (own or `defaults.outFolder`) to stage from
- Targets with an empty or unknown profile list, and names colliding between `targets` and `profiles`
- `defaultTarget` not matching any defined target or profile
- `versioning.explicitVersion` not parseable as `Major.Minor.Build.Revision`
- `applicationInsights` (top level and per-profile): missing `source` when `enabled`, missing `environmentVariable`/`environmentVariables` for the selected source, and `environmentVariables` keys not matching a known project id
- Filesystem checks against the config's directory: nonexistent app/test paths, missing `app.json` in a project folder, duplicate physical paths, and `outFolder`/`packagesFolder`/`workspace.manifest`/`workspace.logDirectory` locations that are unsafely nested inside source or output directories
