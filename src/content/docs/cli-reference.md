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
  plain-text mode; required for `build`/`workspace build`, whose `altool` output cannot itself be
  redirected

```bash
alwasp restore --format json | jq '.data.packagesFolder'
alwasp build release --format ndjson | jq -r 'select(.type=="event") | .event'
alwasp build release --format json --result-file .output/build-result.json
```

The exit code and default text output are unchanged by `--format`; the result document just makes
them explainable. `compare --json` and config-driven build manifests are separate,
command-specific JSON outputs.

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

## build

```bash
alwasp build [targetOrPath]
```

With `alwasp.json`, `targetOrPath` is a target or profile name. Without config, it is a path to `app.json`.

Config-driven options include:

- `--config <path>`
- `--profile <name>`
- `--manifest [path]`
- `--continue-on-error`
- `--changed-since <ref>`
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

## init

```bash
alwasp init
alwasp init --force
alwasp init --include-tests-by-name
```

Creates an `alwasp.json` starter config in the current directory.

## config validate

```bash
alwasp config validate
alwasp config validate --config path/to/alwasp.json
```

Exits `0` when valid and `1` when errors are found.

## version apply

```bash
alwasp version apply [targetOrProfile]
alwasp version apply --profile appsource
alwasp version apply --changed-since latest:v*
alwasp version apply --changed-since "latest-merge:version-increase"
```

Permanently writes calculated versions and configured internal dependency version updates to selected projects' `app.json` files. It does not restore, compile, commit, tag, or push.

`versioning.releaseType` accepts `Release`, `Preview`, or `None`. Release and Preview periods switch on the Friday closest to the 15th of each month; see [Release and Preview periods](/docs/configuration/#release-and-preview-periods) for the calculation table and boundary example.

Both `build --changed-since` and `version apply --changed-since` accept `latest`, `latest:<glob>`, `latest-merge:<text>`, or an explicit tag, branch, or commit. `latest-merge` searches the head's first-parent history for the nearest matching merge message.

## analyze

```bash
alwasp analyze
alwasp analyze ci --changed-since latest
alwasp analyze --project src/Core --json out/analysis.json
```

Options:

- `--project <dir>` / `--project-root <dir>` for direct or discovery-mode selection, or `[targetOrProfile]` / `--config` / `--profile` for config-driven selection
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
```

Options include:

- `--project <dir>` and `--baseline <app>` for one direct project
- `--project-root <dir>` and `--baseline-directory <dir>` for recursive multi-app discovery
- `--packages <dir>` for current dependency packages
- `--ruleset <file>` for compiler diagnostic severity overrides
- `--config <file>` / `--profile <name>` in config-driven mode
- restore/feed/authentication options
- `-v|--verbose` and `-q|--quiet`

The command recompiles source with AppSourceCop and remains separate from normal builds.

## validate translations

```bash
alwasp validate translations
alwasp validate translations release
alwasp validate translations --project src/Core --languages da-DK,de-DE
alwasp validate translations --project-root ./src --json output/translations.json
```

Options:

- `--project <dir>` / `--project-root <dir>`, or `[targetOrProfile]` / `--config` / `--profile`
- `--languages <tag,...>` required language tags, overriding `translations.languages`
- `--check-placeholders` requires matching `%1`/`{0}`/`#`-style placeholders between source and target
- `--fail-on <none|missing-language|missing-unit|untranslated|needs-review>` — default `untranslated`
- `--min-coverage <percent>` per-language coverage floor
- `--require-generated` fails a project with no generated `.g.xlf` instead of only warning
- `--changed-since <ref>` scopes checked projects to the changed set
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

Common `workspace build` options:

- `--restore`
- `--packages <path>`
- `--outfolder <dir>`
- `--max-cpu-count <int>`
- `--nowarn <code>`
- `--ruleset <file>`
- `--log-directory <dir>`
- `--diagnostics`
- `--manifest [path]`

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
