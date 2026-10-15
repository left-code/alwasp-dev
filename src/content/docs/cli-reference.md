---
title: CLI Reference
description: Reference for root commands, arguments, common options, validation behavior, and examples.
order: 7
---

# CLI Reference

## Global

```bash
alwasp --help
alwasp --version
```

Every command also accepts:

- `--format <text|json|ndjson>` — `text` (default) is unchanged human output; `json` prints one
  result document to stdout with human output moved to stderr; `ndjson` (alias `jsonl`) streams
  one JSON record per line as the command runs
- `--result-file <path>` — writes the json/ndjson output to a file and leaves the console in
  plain-text mode; required for `build`/`check`/`workspace build`, whose `altool` output cannot itself be
  redirected

```bash
alwasp restore --format json | jq '.data.packagesFolder'
alwasp build release --format ndjson --result-file .alwasp/build-result.ndjson
jq -r 'select(.type=="event") | .event' .alwasp/build-result.ndjson
alwasp build release --format json --result-file .output/build-result.json
```

The exit code and default text output are unchanged by `--format`; the result document just makes
them explainable. `compare --json` and config-driven build manifests are separate,
command-specific JSON outputs.

### Terminal links and failure artifacts

Interactive human output can show clickable file/directory paths and public URLs. Set
`ALWASP_HYPERLINKS=auto|always|never` to control links; the default is `auto`. `never` disables
links, while `always` also enables them for an interactive terminal reporting `TERM=dumb`.
Even with `always`, redirected streams and CI output remain plain. JSON/NDJSON records and result
files never contain terminal link escape sequences; any separate human console stream follows
its own terminal capabilities.

Failed commands show a deduplicated `Failure artifacts` section when diagnostic logs, build
manifests, or translation coverage reports are available. This is human output only; it does not
add fields or records to structured results. Successful commands and failures without available
artifacts do not show the section.

## restore

```bash
alwasp restore [appJsonPath]
```

Common options:

- `--latest`
- `--output <path>`
- `--feed <url>`
- `--nuget-config <path>`
- `--auth-mode <Auto|Interactive|NonInteractive>`
- `--feed-token-env <feedUrl=ENV_VAR>`
- `--pat <token>`
- `--config <path>`
- `-v|--verbose`
- `-q|--quiet`

## symbols

```bash
alwasp symbols create <app> [--output <file-or-folder>]
alwasp symbols pack <symbolApp> [--output <folder>]
alwasp symbols push <package> --source <feed-or-folder>
alwasp symbols publish <app> --source <feed-or-folder> [--output <folder>]
```

`create` uses ALTool to produce a verified symbol-only app. `pack` wraps it in a NuGet package
using the app identity/version and explicit dependencies. `push` validates and publishes an
existing package; `publish` runs all three stages and stops on the first failure. `build` never
publishes automatically.

- `pack` / `publish`: repeatable `--dependency-package-id <appId=packageId>` for dependencies
  published under non-standard IDs.
- `push` / `publish`: required `--source`, optional `--api-key` (fallback
  `ALWASP_NUGET_API_KEY`, then `nuget.config`), `--skip-duplicate`, `--nuget-config`,
  `--auth-mode`, `--feed-token-env`, and `--pat`.
- All four support verbose/quiet and global structured-output options. Failures report
  `failedStage`; NDJSON includes `symbols.stage` events.

See [Symbol Packages](/docs/symbol-packages/) for defaults, validation rules, dependency
mapping, and examples. The standalone visual CLI reference includes the full option lists.

## build

```bash
alwasp build [targetOrPath]
```

With `alwasp.json`, `targetOrPath` is a target or profile name. Without config, it is a path to `app.json`.

Config-driven options include:

- `--config <path>`
- `--profile <name>`
- `--manifest [path]` — defaults to `.alwasp/build-manifest.json` when the path is omitted
- `--continue-on-error`
- `--diagnostics` (alias `--diagnostic`) — list individual compiler errors and analyzer warnings
- `--changed-since <ref>`
- `--plan <path>` — consume a plan from `alwasp plan` instead of resolving selection directly;
  cannot be combined with a positional target or `--profile`; `--changed-since` may be supplied
  only to resolve changed-only versioning and must match the plan's recorded base
- `--clean` — remove prior ALWasp package cache, compiled output, compiler log, and
  build-manifest artifacts before restoring and compiling
- restore/feed options

Single-project options include:

- `--out <file>`
- `--outfolder <dir>`
- `--warnaserror`
- `--nowarn <code>`
- `--errorlog <file>`
- `--ruleset <file>`
- `--target <Cloud|OnPrem|...>`
- `--parallel`
- `--max-parallelism <int>`
- `--define <symbol>`
- `--features <feature>`
- analyzer flags

Direct dependency-aware builds accept `--project <dir>` or recursive `--project-root <dir>`.
Root mode also accepts repeatable `--app <name|appId|relativePath>`, `--changed-since`, and
`--include-dependents`. Required local dependencies compile but are not collected as selected
outputs. Direct options exclude positional target/path, `--config`, `--profile`, and `--plan`;
`--outfolder` sets output and `--out` is rejected. `build` has no `--workspace` option.

Direct and configured modes accept `--bc-target current|next-minor|next-major`, `--bc-version`,
and exactly one `--bc-country` (default `restore.country`, else `W1`). `current` retains NuGet
symbols; pinned/Insider builds use one artifact's Microsoft symbols/compiler/analyzers.
These options are rejected for positional app.json builds. See [Build](/docs/build/).

## plan

```bash
alwasp plan ci --changed-since origin/main --plan-file .alwasp/alwasp-plan.json
alwasp build --plan .alwasp/alwasp-plan.json
```

Options:

- `--config <path>` / `--profile <name>`
- `--changed-since <ref>` (required)
- `--plan-file <path>` — defaults to `.alwasp/alwasp-plan.json`; relative paths resolve from the
  current directory

Creates a deterministic, timestamp-free CI plan without compiling: directly changed projects,
downstream applications, affected test apps, and the internal prerequisites needed to compile
them, plus dependency build levels, deployment order, repository commit IDs, changed-file hashes,
the configuration hash, and an input fingerprint. A change to `alwasp.json`, a configured NuGet
config, or an active ruleset selects the complete requested target; no relevant changes produce a
successful empty plan; dependency cycles fail plan creation. Consume the plan with
`alwasp build --plan <path>`. See [CI/CD](/docs/ci-cd/#deterministic-ci-plans).

## check

```bash
alwasp check ci
alwasp check --profile appsource --changed-since origin/main
alwasp check --plan .alwasp/alwasp-plan.json
alwasp check ci --format json --result-file .alwasp/check-result.json
```

Runs configured verification gates over one resolved selection: configuration, restore/build,
compiler diagnostics, compatibility, and translation coverage. Tests compile but are not executed.
Requires `alwasp.json`; options include `--config`, `--profile`, `--changed-since`, `--plan`,
`--continue-on-error`, and feed/authentication options. Plan conflicts and stale-plan checks match
build. Independent translation checks continue after build failure. Exit `0` requires no failed
step. See [Verification with check](/docs/check/).

## context search / object / usages / prepare

```bash
alwasp context search "sales release" --project ./App
alwasp context object 'table "Sales Header"' --workspace Apps.code-workspace
alwasp context usages 'codeunit "Release Sales Document"' --project ./App
alwasp context prepare --task story.md --project-root ./src
```

Offline discovery over selected source and restored dependencies. All four accept `--project`,
`--project-root`, or `--workspace`, alternatively `--config` / `--profile` / `--target`, plus
`--packages-folder` and repeatable `--dependency-source-folder`. Direct and configured selection
cannot be combined. Search/prepare accept `--max-candidates`; prepare also accepts `--max-depth`,
`--max-objects`, and `--output` (default `.alwasp/context/`). Object/usages return `2` for ambiguity.
See [Agent Context](/docs/context/) for bounds, schemas, diagnostics, and usage limitations.

<a id="init"></a>

## config init

```bash
alwasp config init
alwasp config init --force
alwasp config init --include-tests
```

Creates an `alwasp.json` starter config in the current directory.
Since 0.5.8, the top-level `init` command is removed with no alias; use `config init`.

Scans direct child projects and classifies source. Confirmed tests are omitted by default;
`--include-tests` puts them in `tests`. Unknown source enters `apps` with a review warning.
Folder names are not classification evidence. The old `--include-tests-by-name` option has no alias.

## config validate

```bash
alwasp config validate
alwasp config validate --config path/to/alwasp.json
```

Exits `0` when valid and `1` when errors are found.

<a id="version-apply"></a>
<a id="version-resolve"></a>

## version resolve / apply

```bash
alwasp version apply [targetOrProfile]
alwasp version apply --profile appsource
alwasp version apply --changed-since latest:v*
alwasp version apply --changed-since "latest-merge:version-increase"
alwasp version resolve --project-root ./src --release-type Preview
alwasp version apply --project ./App --release-type Dev
```

`version apply` permanently writes calculated versions and configured internal dependency version updates to selected projects' `app.json` files. It does not restore, compile, commit, tag, or push.

`version resolve` uses the same selection and calculation without applying changes. Its structured
result reports current/next versions and `wouldUpdate` instead of `updated`.

Both commands support configured target/profile selection or direct `--project <dir>` /
recursive `--project-root <dir>` selection without `alwasp.json`. Direct selection excludes a
positional target/profile, `--profile`, and `--config`. Root mode accepts repeatable
`--app <name|appId|relativePath>`. Each project is calculated from its own current version.

Policy options override configured `versioning` fields:

- `--release-type <Release|Preview|Dev|None>`; direct default `Release`
- `--version-source <AppJson|Nuget>`; direct default `AppJson`. `Nuget` uses the latest published
  version on the configured feeds, falling back to app.json by default; feed/auth options apply.
  Explicit versions belong in configuration.
- `--no-dependency-update` disables internal dependency version updates
- `--dependency-update-scope <DirectlyChanged|AllVersioned>`; default `DirectlyChanged`

In direct mode, `--changed-since` versions only apps whose own files changed;
`--include-dependents` adds transitive dependents and requires `--changed-since`. Configured mode
retains `versioning.applyTo` and `changeDetection` policy.

`versioning.releaseType` accepts `Release`, `Preview`, `Dev`, or `None`. Release and Preview periods switch on the Friday closest to the 15th of each month; see [Release and Preview periods](/docs/configuration/#release-and-preview-periods) for the calculation table and boundary example.

Both `build --changed-since` and `version apply --changed-since` accept `latest`, `latest:<glob>`, `latest-merge:<text>`, or an explicit tag, branch, or commit. `latest-merge` searches the head's first-parent history for the nearest matching merge message.

## analyze

```bash
alwasp analyze
alwasp analyze ci --changed-since latest
alwasp analyze --project src/Core --json out/analysis.json
```

Options:

- `--project <dir>` / `--project-root <dir>` / `--workspace <file>` for direct selection, or `[targetOrProfile]` / `--config` / `--profile` for config-driven selection
- `--changed-since <ref>` activates object-level change detection
- `--include <section,...>` narrows the report to named sections (repeatable or comma-separated)
- `--max-depth <int>` caps impact propagation for `impacted-tests`
- `--max-items <int>` caps console entries per section; `0` or `--verbose` lists everything
- `--json <path>` writes the full versioned report

Static source analysis over `.al` files and git only — no compiler, no symbol restore, no
network. See [Source Analysis](/docs/analyze/) for the seven report sections, object identity
rules, diagnostics, and the report contract.

## compare

```bash
alwasp compare <baseline.app> <current.app>
```

Options:

- `--json <path>` writes the compare report as JSON

`compare` is an informational public-symbol change log, not a compatibility gate: it groups
findings by namespace as `REMOVED`, `CHANGED`, or `ADDED`, and a completed comparison always
exits `0`. Unreadable packages, mismatched app IDs, invalid arguments, or a report-write failure
exit `1`. There is no `--fail-on` option — use `validate compatibility` for an authoritative
compatibility gate. See [Compatibility](/docs/compatibility/) for classifications, limitations,
and examples.

## validate compatibility

```bash
alwasp validate compatibility [targetOrProfile]
alwasp validate compatibility --project <dir> --baseline <previous.app>
alwasp validate compatibility --project-root <dir> --baseline-directory <dir>
alwasp validate compatibility --project-root <dir> --get-baseline-symbols [feed-url]
```

Options include:

- `--project <dir>` and `--baseline <app>` for one direct project
- `--project-root <dir>` and `--baseline-directory <dir>` for recursive multi-app discovery
- `--workspace <file>` selects only folders directly containing `app.json`, without recursion;
  baseline directories or published symbols are supported
- `--app <name|id|path>` selects a validation root in project-root/workspace mode; repeat for multiple
  apps. Required local dependencies still compile. Unknown or ambiguous selectors fail.
- `--get-baseline-symbols [feed-url]` downloads each selected app's latest stable baseline;
  omit the URL to use Microsoft AppSourceSymbols
- `--changed-since <ref>` limits project-root/workspace validation to apps whose own files changed;
  accepts `latest`, `latest:<glob>`, `latest-merge:<text>`, or a Git ref
- `--include-dependents` also validates transitive dependents with `--changed-since`
- `--packages <dir>` for current dependency packages
- `--ruleset <file>` for compiler diagnostic severity overrides
- `--bc-target <current|next-minor|next-major>` (also comma-separated lists), `--bc-version <version>`, and
  `--bc-country <code,...>` select the Business Central artifacts used for validation
- `--max-parallel-processing <N>` bounds concurrent target/country combinations (positive;
  default all combinations, capped at half the logical processors; `1` runs sequentially)
- `--fail-on-next` makes Insider failures fatal when the target list includes `current`;
  otherwise they warn. Runs without `current` fail on any combination failure.
- `--keep-artifacts` skips automatic artifact cleanup for this run
- `--config <file>` / `--profile <name>` in config-driven mode
- restore/feed/authentication options
- `-v|--verbose` and `-q|--quiet`

Apps with baselines compile with AppSourceCop. Project-root/workspace mode permits no baseline
source; apps lacking baselines still compile with non-baseline analyzers and report compatibility
N/A. Discovered confirmed tests are excluded; explicit selection and configuration take precedence.
Target lists exclude `--bc-version`. See [Compatibility](/docs/compatibility/#validate-multiple-targets-and-countries)
for isolation, failure policy, result fields, and artifact cleanup.

## translation prepare / validate

```bash
alwasp translation prepare fr-FR --context de-DE
alwasp translation validate ./MyApp.fr-FR.xlf
```

`translation prepare` creates deterministic packages for a human or external translation service;
`translation validate` checks returned XLIFF against its authoritative source. ALWasp does not
translate text or connect to an AI service. See [Translation Preparation](/docs/translation-preparation/)
for selection modes, package contents, terminology, and validation rules.

Preparation accepts `--project`, `--project-root`, `--workspace`, or `--config` / `--profile`
selection, optional `--context <locale>`, and repeatable `--parent-source-folder <dir>` for
dependency source context. `--bc-target current|next-minor|next-major`, `--bc-version`, and
`--bc-country` select Microsoft terminology. Output is `.alwasp/translation/<language>`;
apps must list the target locale in `app.json`'s `supportedLocales` and have translation work.
Edit and return the manifest's `translationFile`, named `<App Name>.<language>.xlf`.

`--glossary <json>` supplies approved locale terminology to prepare or validate.
`--expected-bc-version <version>` warns about terminology-version mismatches without changing
artifact selection. `translation validate <package-directory>` checks all returned apps using
packaged sources, glossary, and terminology; it excludes project selection and `--source`.

## artifacts download

```bash
alwasp artifacts download --bc-target next-major --bc-country DE
alwasp artifacts download --bc-version 27.1.0.0
```

Downloads, verifies, and caches Business Central artifacts independently of compatibility
validation. Use `--bc-target <next-minor|next-major>` or pin a concrete four-part
`--bc-version <version>`; `--bc-country <code>` selects localization and defaults to `W1`.
There is no `--output` option; artifacts use the shared artifact cache.


## artifacts resolve

```bash
alwasp artifacts resolve
alwasp artifacts resolve --bc-target next-major --bc-country DE
alwasp artifacts resolve --bc-version 28.0 --bc-country DE
alwasp artifacts resolve --verbose
alwasp artifacts resolve --format json --result-file resolved.json
```

Read-only lookup of concrete Business Central versions and matching Application/Platform artifact
URLs. Only artifact indexes are read; no artifact is downloaded, extracted, or cached.

- `--bc-target <current|next-minor|next-major>` resolves one target; omit it for all three.
- `--bc-version <version>` resolves one pinned version: a two-/three-part prefix selects the
  newest released match; a full four-part version selects that build. It excludes non-current
  `--bc-target`. Released artifacts are tried first; an exact build may fall back to Insider artifacts.
- `--bc-country <code>` selects one country, case-insensitively; default `W1`.
- `-v|--verbose` includes URLs in the all-target text table; single-target text always includes them.
- `-q|--quiet`, `--format text|json|ndjson`, and `--result-file <path>` follow standard output controls.

`current` resolves the newest released version with matching country and platform artifacts.
This lookup does not change `build --bc-target current` or `workspace build --bc-target current`,
which retain NuGet symbols and tools. Insider targets use the same resolution as artifact builds
and may resolve to the same version. Each URL pair belongs to one concrete version.

One-target JSON exposes `data.target`, `version`, `country`, `source`, and
`artifacts.application` / `artifacts.platform`. All-target JSON uses `data.results` in the order
`current`, `next-minor`, `next-major`; failed entries contain `target` and `error`.
NDJSON emits an `artifactResolved` event per successful target and a final result.
Exit `0` means all requested targets resolved; exit `1` means failure. In all-target mode,
failures are reported individually and any failed target fails the command.

```bash
VERSION=$(alwasp artifacts resolve --bc-target next-major --format json | jq -r .data.version)
```

## artifacts prune

```bash
alwasp artifacts prune --dry-run
alwasp artifacts prune --older-than 7
alwasp artifacts prune --all
```

Cleans `~/.alwasp/artifacts`: builds superseded in the same major/minor line and country once
unused for a day, artifacts unused for `--older-than <days>` (positive, default `14`), and
abandoned downloads older than a day. `--all` removes every completed artifact not in use;
`--dry-run` reports without deleting. Artifacts used by another ALWasp process are retained.
Non-dry runs also remove stale ALWasp temporary run directories older than a day.
JSON/NDJSON and standard logging options are supported. Removal failures exit `1`.

Automatic compatibility cleanup additionally removes Insider artifacts; see
[Artifact cache cleanup](/docs/compatibility/#artifact-cache-cleanup).

## validate translations

```bash
alwasp validate translations
alwasp validate translations release
alwasp validate translations --project src/Core --languages da-DK,de-DE
alwasp validate translations --project-root ./src --json output/translations.json
```

Options:

- `--project <dir>` / `--project-root <dir>` / `--workspace <file>`, or `[targetOrProfile]` / `--config` / `--profile`
- `--languages <tag,...>` required language tags, overriding `translations.languages`; when
  non-empty, also scopes the check to just these languages
- `--check-placeholders` requires matching `%1`/`{0}`/`#`-style placeholders between source and target
- `--fail-on <none|missing-language|missing-unit|untranslated|needs-review>` — default `untranslated`
- `--min-coverage <percent>` per-language coverage floor
- `--require-generated` fails a project with no generated `.g.xlf` instead of only warning
- `--changed-since <ref>` scopes configured projects to the changed set (config-driven only)
- `--json <path>` writes the coverage report

Compares each project's generated XLIFF against its language files; no compiler or symbol
restore involved. Exit codes: `0` clean, `1` bad usage/unreadable file, `2` gate failed. See
[Translation Coverage](/docs/translations/) for finding types, XLIFF Sync interop, and
configuration.

## workspace

```bash
alwasp workspace restore [workspacePath]
alwasp workspace build [workspacePath]
```

Workspace commands operate directly on `.code-workspace` files. They remain useful as low-level operations, but config-driven `alwasp build` is preferred for multi-project repositories.

Supported VS Code AL settings are read per project; explicit CLI options win. See
[Workspace settings](/docs/build/#vs-code-al-settings-for-workspace-builds).

Common `workspace build` options:

- `--bc-target <current|next-minor|next-major>` — `current` uses NuGet symbols/tools;
  Insider targets use artifacts; excludes `--bc-version`
- `--bc-version <version>` — exact four-part released build or latest match for a two-/three-part
  version; excludes `--bc-target`
- `--bc-country <code>` — artifact country, default `W1`; country alone selects the latest
  released build in the highest workspace application major/minor line
- `--restore`
- `--packages <path>`
- `--outfolder <dir>`
- `--max-cpu-count <int>`
- `--nowarn <code>`
- `--ruleset <file>`
- `--log-directory <dir>`
- `--diagnostics`
- `--manifest [path]` — defaults to `.alwasp/build-manifest.json` when the path is omitted
- `--clean` — remove prior ALWasp package cache, compiled output, compiler log, and
  build-manifest artifacts before restoring and compiling

Artifact selection uses matching Microsoft symbols and tools, with partner dependencies restored
through NuGet. `--clean` also clears the workspace's other artifact package caches, skipping
caches in use. See [Workspace build](/docs/build/#business-central-artifact-selection) for cache
paths and compiler requirements.

## tools update

```bash
alwasp tools update
alwasp tools update --check
alwasp tools update --clean
```

Checks NuGet.org for the latest `Microsoft.Dynamics.BusinessCentral.Development.Tools` package and ensures the latest `alc` / `altool` binaries are cached under `~/.alwasp/tools/<version>/`.

Options:

- `--check` reports whether a newer version is available without downloading or deleting anything; exits `2` when an update exists
- `--clean` removes older cached tool versions after the latest version is present
- `-v|--verbose`
- `-q|--quiet`

## app set-package-id

```bash
alwasp app set-package-id <appPath>
alwasp app set-package-id <appPath> --out <path>
```

Assigns a new random deployment package ID to a compiled `.app` file so the same artifact can be re-uploaded to a Business Central sandbox. The app identity from `app.json` is unchanged.

By default the file is rewritten in place. Use `--out` to write a modified copy and leave the original untouched.
