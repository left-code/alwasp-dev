---
title: Compatibility
description: Compare compiled AL packages or validate current source against previous packages with AppSourceCop.
group: Guides
order: 13
---

# Compatibility

ALWasp provides package comparison and source validation. A build can opt into profile-bound baseline validation; `check` runs configured compatibility gates alongside the build.

| Command | Inputs | Compiler required | Purpose |
|---|---|---:|---|
| `alwasp compare` | Previous `.app` + current `.app` | No | Informational public-symbol change log |
| `alwasp validate compatibility` | Previous `.app` + current AL source | Yes | Microsoft's AppSourceCop baseline validation |

These checks do not prove that an extension upgrade is runtime-safe. Publish/sync/upgrade testing, data migration, upgrade code, permissions, and changed business behavior still require an appropriate Business Central environment and test suite.

## Compare compiled packages

```bash
alwasp compare previous/MyApp.app output/MyApp.app
alwasp compare previous/MyApp.app output/MyApp.app --json output/compare.json
```

The console output is titled **ALWasp compare report** and groups public-symbol changes by
namespace into `REMOVED`, `CHANGED`, and `ADDED`. The reader uses each package's manifest and
`SymbolReference.json`; it does not require AL compiler tools, a container, or a sandbox.

`compare` is an informational package change log, not a compatibility gate: it does not classify
changes as breaking, and it does not fail because changes were found. A completed comparison
always exits `0`; unreadable packages, mismatched app IDs, invalid arguments, or a report-write
failure exit `1`. There is no `--fail-on` option and no ruleset applies to `compare` — use
`validate compatibility` when current source must be checked against Microsoft's AppSourceCop
baseline rules.

## Validate one source project

```bash
alwasp validate compatibility \
  --project ./src/Core \
  --baseline ./previous/Core.app \
  --ruleset ./rulesets/AppSourceCop.ruleset.json
```

This command restores current dependencies plus Application, Platform, and explicit dependencies recorded in the historical baseline package's `NavxManifest.xml`, obtains `alc`, enables AppSourceCop, and recompiles the current source against the baseline package. App identity is matched by app ID; name and publisher changes are reported but allowed, and the version is expected to differ. If an old Microsoft Application major is no longer published, ALWasp uses the lowest available compatible symbols package.

ALWasp temporarily supplies AppSourceCop's baseline identity and cache properties. Existing user settings in `AppSourceCop.json` are honored, and the original file is restored byte-for-byte afterward. Current restored packages and historical `.app` files beside the baseline are staged so AppSourceCop can resolve referenced types instead of reporting false `MissingTypeSymbol` changes.

`--ruleset` is resolved from the current directory and overrides configured rulesets. In direct mode, omitting it auto-detects `ruleset.json`, then the first `*.ruleset.json` in the project directory.

## Minimum supported release

Without `--bc-version`, or with `--bc-version minimum`, each app is compiled against the Microsoft
symbols of the **lowest release that it can be installed on**. AppSource starts its validation at
that release.

This finds a problem that a build against the latest release hides. Example: an app declares
`application` `27.0.0.0` and calls a method that is public in 27.5 but `internal` in 27.0. The
normal build passes. AppSource rejects the app with `AL0161 ... is inaccessible due to its
protection level`. This validation fails in the same way.

How the minimum is found:

- It starts at the `application` and `platform` values in the app's `app.json`.
- It is raised to the release that the app's dependencies need, because an app cannot be installed
  below that release. This includes Microsoft dependencies, partner packages, and other apps of the
  repository, also indirect ones.
- Each app gets its own Microsoft symbols. Newer symbols in `.alpackages`, or symbols that a
  different app of the same run needed, are not used.

| Situation | Result |
|---|---|
| A dependency needs a newer release than the app declares | **Warning.** The app is validated at the newer release. The run does not fail |
| The app's own Microsoft dependency needs a later major.minor than `application`, for example `application` `27.0.0.0` with `Subscription Billing` `28.0.0.0` | **Error.** AppSource cannot resolve this dependency. The app is compiled, so that its other findings and its dependents are reported, and then it fails |
| The dependency version differs only in build or revision | Warning |

At the end of the run, a table lists all apps with a minimum that is too low: the app, the
declared and the necessary `application` and `platform`, and the dependency that needs it. Use the
table to correct the `app.json` files. The same rows are in the result data as
`understatedMinimums`.

`--project` mode works on a temporary copy of the packages folder. The `.alpackages` folder that
the AL extension uses is not changed.

AppSource validates from the minimum up to the latest release. To do the same in one run:

```bash
alwasp validate compatibility --project-root . --get-baseline-symbols \
  --bc-version minimum,current,next-minor
```

## Select the Business Central version

| `--bc-version` | Microsoft symbols and compiler |
|---|---|
| Not given, or `minimum` | NuGet symbols of each app's minimum supported release |
| `current` | The latest released artifact |
| `next-minor`, `next-major` | The Insider artifact |
| A version such as `28.3.12345.0` | That artifact |

`--bc-country` selects the localization (default `W1`; in configured mode `restore.country`
first). See [Business Central Versions](/docs/bc-version/) for all rules. You can download an
artifact ahead of a run with `alwasp artifacts download`.

## Validate a dynamic multi-app repository

```powershell
alwasp validate compatibility `
  --project-root .\src `
  --baseline-directory .\latest `
  --ruleset .\dyce.ruleset.json
```

To validate only apps changed since a Git reference, add `--changed-since`. Only apps whose own
files changed are validated by default. Add `--include-dependents` to also
validate apps that transitively depend on them. An unchanged local app needed only to compile a selected
app is built as a dependency without AppSourceCop:

```powershell
alwasp validate compatibility `
  --project-root .\src `
  --baseline-directory .\latest `
  --changed-since latest:v* `
  --ruleset .\dyce.ruleset.json
```

The reference accepts `latest`, `latest:<glob>`, `latest-merge:<text>`, or an explicit tag, branch,
or commit. ALWasp reads local Git history and does not fetch missing refs.

Directory mode:

- discovers `app.json` projects and baseline `.app` packages recursively;
- matches projects to baselines by app ID, never by filename;
- rejects duplicate project IDs and multiple baselines matching the same project;
- validates matched projects in dependency order;
- validates unmatched apps from current source against the selected BC target, with configured
  non-baseline analyzers and without AppSourceCop; their compatibility verdict is N/A;
- compiles required local dependency apps first without AppSourceCop;
- after a matched app fails AppSourceCop, compiles it once without AppSourceCop and stages the
  package for downstream validations while preserving the original failure;
- makes every package under `--baseline-directory` available as a historical dependency;
- excludes `.git`, `.alpackages`, `.alwasp`, `.output`, `bin`, `obj`, and `node_modules` from project discovery.

The isolated validation cache is seeded from `<project-root>/.alpackages`. If the shared cache is elsewhere, pass it explicitly:

```powershell
alwasp validate compatibility `
  --project-root .\src `
  --baseline-directory .\latest `
  --packages .\.alpackages `
  --ruleset .\dyce.ruleset.json
```

The final summary separates baseline compatibility verdicts, current-source validation, prepared local dependencies, failed apps/dependencies, and total processing time. Source or analyzer failures fail the command even when compatibility is N/A.

### Why apps failed

When an app fails, the summary gives the reason, so that you do not have to search a long log.
Under `Why apps failed`, each failed app is listed with the Microsoft symbols it was compiled
against and its first five compiler or AppSourceCop errors, or the `app.json` problem:

```text
Why apps failed (first errors; the full compiler output is above):
  My App (Microsoft symbols: minimum release, application 27.0.0.0)
    src/MyTableExt.TableExt.al(416,32): error AL0161: 'SetCustomerContractNo(Code[20])' is inaccessible due to its protection level
```

The result data has the same information as `failureReasons` (`app`, `name`, `symbols`, `errors`,
`errorCount`). `check` prints the list in its overview.

### Select specific apps

Repeat `--app` to select validation roots by app name, app GUID, or project path relative to
`--project-root`. Paths may point to the project directory or its `app.json`:

```bash
alwasp validate compatibility --project-root ./src --baseline-directory ./latest \
  --app "Sales App" --app ./Core
alwasp validate compatibility --project-root ./src --get-baseline-symbols --app ./Core
```

Names match case-insensitively. Repeated selections are deduplicated; unknown or ambiguous
selectors fail with an error. Use a GUID or path to disambiguate matching names. `--app` is
available with `--project-root` and `--workspace`, including the inferred current-directory root
used by `--get-baseline-symbols`. Workspace paths are relative to the workspace file directory.

Only selected apps receive baseline downloads and compatibility checks. Required local
dependencies still compile without becoming validation roots. `--changed-since` can further
restrict validation within the selected roots. Human output distinguishes discovered and selected
projects; structured results include `selectedProjects`.

## Download the latest stable baselines

In directory mode, `--get-baseline-symbols [feed-url]` can download the latest stable published
symbols instead of reading a pinned `--baseline-directory`:

```powershell
# Microsoft AppSourceSymbols
alwasp validate compatibility --project-root .\src --get-baseline-symbols

# When the current directory contains app.json, --project-root defaults to .
alwasp validate compatibility --get-baseline-symbols

# A private NuGet feed
alwasp validate compatibility --project-root .\src `
  --get-baseline-symbols https://example.com/nuget/v3/index.json
```

Without a URL, only Microsoft's AppSourceSymbols feed is queried for baselines. An explicit URL
replaces that baseline feed and also participates in dependency restore. Existing `--pat` /
`ALWASP_PAT`, `--feed-token-env`, `--nuget-config`, and `--auth-mode` settings apply.

Downloaded packages are matched by app ID, stored temporarily outside the project tree, and
removed after the run. Apps without a published stable baseline are source-validated without
AppSourceCop and report
compatibility N/A. An all-unpublished selection succeeds if its source checks pass; feed/download
errors still fail and are never treated as unpublished apps. Baseline versions are independent of the
current app version and `--bc-version`.

When the current directory contains `app.json`, `--get-baseline-symbols` defaults the project root
to that directory and also discovers nested projects. Otherwise, pass `--project-root`. The option
cannot be combined with `--baseline-directory`, `--baseline`, `--project`, `--config`, or a
positional target/profile. `--profile <name>` is allowed: it selects Application Insights settings
from the current directory's `alwasp.json`, but does not limit which directory projects are
discovered or validated. Without it, the default target supplies those settings.

Prefer a checked-in or artifact-provided baseline directory when validation must be reproducible
against pinned versions. Application Insights transforms apply consistently to current,
next-minor, and next-major Business Central targets.

## CI diagnostic annotations

In Azure Pipelines and GitHub Actions, compiler diagnostics from compatibility validation are
emitted as native workflow annotations. Single-project `alwasp build` does the same; no additional
flag is required. This matches the annotation behavior of workspace and config-driven builds.
Apps without published compatibility baselines are grouped into one counted, collapsible section
in Azure Pipelines and GitHub Actions logs instead of producing a separate group per app.

## Config-driven validation

Put the baseline on the corresponding app entry in `alwasp.json`:

```json
{
  "apps": [
    {
      "id": "core",
      "path": "src/Core",
      "compatibility": {
        "baseline": "previous/Core.app"
      }
    }
  ]
}
```

Then validate the same target/profile selection model used by build:

```bash
alwasp validate compatibility release
alwasp validate compatibility --profile appsource
```

Compatibility validation enables AppSourceCop when an app has a baseline; source-only checks use the configured non-baseline analyzers. It is separate from `alwasp build`, so the two commands together compile the source two times.

`validate compatibility` temporarily applies the effective build-time `applicationInsights`
setting to each selected project's `app.json` before compiling, and restores the original file
afterward. This matches the `app.json` state the following `build` will produce, so AppSourceCop
does not raise a false `AS0092` warning about a connection string or instrumentation key that is
intentionally injected by the build.

## Profile-bound baseline validation

A profile can run the baseline check during its normal `alwasp build`:

```json
{
  "apps": [
    {
      "id": "Broker",
      "path": "./Broker",
      "compatibility": { "baseline": "./previous/Broker.app" }
    }
  ],
  "profiles": {
    "release": {
      "include": "apps",
      "outFolder": "output/release",
      "compatibility": { "enabled": true }
    }
  }
}
```

```bash
alwasp build release
```

With `compatibility.enabled: true`, apps in the profile's selection that declare
`compatibility.baseline` are compiled once with AppSourceCop bound to that baseline, and the
successful package is collected through the profile's ordinary `outFolder`/`outputSuffix` flow.
Selected apps without a
baseline are compiled normally, not skipped. Compatibility is scoped to the profile: other
profiles keep their configured `appSourceCop` setting and are never implicitly baseline-checked.
Historical dependencies use an isolated temporary cache, and a user-owned `AppSourceCop.json` is
restored byte-for-byte after every compile group.

This build check finds breaking changes against the baseline with the symbols of the build. It
does **not** compile each app at its [minimum supported release](#minimum-supported-release).
Only `validate compatibility` and `check` do that, so keep one of them in your release pipeline.

## Microsoft symbol cache safety

With an artifact (`--bc-version current`, an Insider lane, or a version), the Microsoft symbols
of the artifact stay in the validation cache. If a symbols feed has only an older package, that
package cannot replace the newer artifact symbols.

If a direct dependency allows an older package but a transitive dependency requires a newer one,
ALWasp resolves the package again at the stricter minimum. Repeated AppIds are skipped only when
the version already restored satisfies the later requirement.

## Workspace and source-only validation

```bash
alwasp validate compatibility --workspace Apps.code-workspace --get-baseline-symbols --app Core
alwasp validate compatibility --project-root ./src
alwasp validate compatibility --workspace Apps.code-workspace --changed-since origin/main
```

Workspace discovery includes only folders directly containing app.json, without recursion.
Workspace changed-only validation requires one Git repository. Direct workspace selection cannot
be combined with `--project`, `--project-root`, or configured target/config selection.

In project-root/workspace mode, baseline sources are optional. Without `--baseline-directory` or
`--get-baseline-symbols`, all selected production apps (or the changed selection) are compiled
and analyzed from current source without AppSourceCop. `--baseline-directory` requires project-root
or workspace mode. Single `--project` mode still requires `--baseline`.

Ruleset discovery falls back from project ruleset files to project `.vscode/settings.json`
`al.ruleSetPath`, then the enclosing `.code-workspace`. With `--workspace`, the selected file
supplies workspace settings even when it is outside the project ancestors. Relative paths resolve
from each project folder. An explicit empty project value disables the workspace ruleset; a
configured path pointing to a missing file fails validation. `--ruleset` overrides discovery.
The same ruleset resolution applies to directory builds and `check`. Automatic workspace discovery
uses only the nearest ancestor workspace whose `folders` list the project (and requires a single
workspace file at that level). Unrelated ancestor workspaces are ignored; farther workspaces do
not fill in missing settings. A bare or empty `--ruleset` is treated as omitted, preserving discovery.

## Production and test classification

Discovered compatibility roots exclude confirmed test apps before baseline lookup. Any test
codeunit establishes test status, including apps containing support libraries or fixtures.
Unknown/incomplete source remains eligible with a warning. All preprocessor branches are read;
ordinary conditionals do not cause unknown status or hide test codeunits. Malformed directives do.
Explicit `apps`/`tests` configuration overrides inference, and explicit `--app`/`--project`
selection retains the selected project. Test apps remain available for dependency compilation.
An all-test discovered selection succeeds as N/A before baseline lookup.

With changed-only validation, baseline downloads and warnings are limited to validated apps.
The summary names changed apps and, when requested, their validated dependents.

Structured results add `projectClassifications`, `skippedTestProjects`, `skippedTests`,
`sourceValidatedProjects`, `sourceFailedProjects`, `sourceValidated`,
`compatibilityNotApplicable`, `understatedMinimums`, and `failureReasons`. `notApplicable` is true only when
nothing was validated. An all-unpublished `check` compatibility step passes after successful
source validation, while baseline compatibility is N/A.

<a id="validate-multiple-countries"></a>

## Validate multiple versions and countries

`--bc-version` and `--bc-country` accept comma-separated lists. A version list can mix names and
builds, for example `28.3.12345.0,next-major`.

```bash
alwasp validate compatibility --project-root ./src --get-baseline-symbols \
  --bc-version minimum,current,next-minor --bc-country de,us,w1 \
  --max-parallel-processing 2
```

- Lists are not case-sensitive. Duplicates are removed. An empty entry fails.
- Each version and country combination runs separately, with its own source copy, package cache,
  compiler, and analyzers. Apps in one combination compile in dependency order.
- Baselines are downloaded one time and shared.
- The summary shows the combinations in the sequence that you gave. Progress lines name the
  combination, for example `[next-minor/US] Validating ...`.
- By default all combinations run at the same time, limited to half of the logical processors.
  `--max-parallel-processing <N>` sets the limit; `1` runs them one after the other.

Which failures fail the run:

| Combination | Result of a failure |
|---|---|
| `minimum`, `current`, or a pinned version | Always fails the run |
| `next-minor` or `next-major`, and the list includes `current` | Warning. Add `--fail-on-next` to fail the run |
| `next-minor` or `next-major`, and the list does not include `current` | Fails the run |

Structured results for more than one combination include `bcTargets`, `bcCountries`,
`maxParallelProcessing`, `failOnNext`, `failedCells`, `warningCells`, `failedCountries`, and
`countries`. Each `countries` entry includes `target`, `failurePolicy` (`fail` or `warn`), and
`toolchain`. A combination with a warning has the status failed.

### Cross-country Microsoft dependencies

Artifact validation stages only the Microsoft packages needed by the app, its baseline, and
cached partner dependencies, followed transitively, plus the platform. Unreadable package
manifests are still staged. Microsoft symbols normally come from the selected country's artifact.
If a localization app is absent there, ALWasp looks for the same AppId in another country artifact
of the same BC version, including its missing Microsoft dependencies. Other countries requested
by the run are tried first and downloaded if needed, then other already-cached countries.
If no country supplies the app, a warning identifies it before the compiler reports it missing.

### Artifact cache cleanup

Each artifact uses approximately 1 GB in `~/.alwasp/artifacts`, and a new Insider build is
published almost daily. After a compatibility validation that used an artifact, ALWasp cleans
that folder. It removes Insider artifacts, builds superseded by a newer cached build
of the same major/minor and country once unused for a day, and artifacts unused for 14 days.
Artifacts another process is using are retained. Temporary run directories left by interrupted
runs are removed once a day old. Structured results include `artifactCleanup` when cleanup runs.

Use `--keep-artifacts` to skip automatic artifact cleanup for one run, or set
`ALWASP_ARTIFACT_CLEANUP=off` to disable it. For cleanup on demand, use
[`artifacts prune`](/docs/cli-reference/#artifacts-prune), optionally with `--dry-run`,
`--older-than`, or `--all`.

Feed package metadata is shared across restores in a validation run, including the compatibility
step of `check`. This reduces repeated queries while preserving per-restore version selection;
failed feed queries are retried on the next restore.

## Published baselines in configuration

The top-level [`compatibility.baseline.source: publishedSymbols` policy](/docs/configuration/#published-compatibility-baselines)
enables latest stable baseline lookup for configured validation and `check`. Explicit per-app
baselines take precedence. Lookup matches AppId across renamed packages/publishers and selects
the highest stable version; equal versions prefer the current name. Authentication/feed errors
and mismatched embedded AppIds fail validation.
