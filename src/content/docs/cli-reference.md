---
title: CLI Reference
description: All ALWasp commands with their arguments and primary options, with links to the complete option lists and the guides.
group: Reference
order: 30
---

# CLI Reference

This page gives the syntax and the primary options of each command. The
[visual CLI reference](/alwasp-cli-reference.html) contains the complete, generated help text of
each command. `alwasp <command> --help` prints the same text.

## Command tree

```text
alwasp
├── restore [appJsonPath]
├── build [targetOrPath]
├── plan [targetOrProfile] --changed-since <ref>
├── check [targetOrProfile]
├── config
│   ├── init
│   └── validate
├── version
│   ├── resolve [targetOrProfile]
│   └── apply [targetOrProfile]
├── analyze [targetOrProfile]
├── compare <baseline> <current>
├── validate
│   ├── compatibility [targetOrProfile]
│   └── translations [targetOrProfile]
├── translation
│   ├── prepare <language>
│   ├── validate <path>
│   └── apply <package>
├── artifacts
│   ├── resolve
│   ├── download
│   └── prune
├── symbols
│   ├── create <app>
│   ├── pack <symbolApp>
│   ├── push <package>
│   └── publish <app>
├── app
│   ├── set-package-id <appPath>
│   ├── pack <app>
│   ├── push <package>
│   └── publish <app>
├── skills
│   └── install <skill>
├── tools
│   └── update
└── workspace
    ├── restore [workspacePath]
    └── build [workspacePath]
```

## Options that many commands share

### All commands

| Option | Effect |
|---|---|
| `--format <text\|json\|ndjson>` | Output format. See [Structured Output](/docs/structured-output/) |
| `--result-file <path>` | Write the JSON or NDJSON output to a file |
| `-v`, `--verbose` | More log output |
| `-q`, `--quiet` | Minimal output |
| `-h`, `--help` | Show the help text |

`alwasp --version` prints the tool version.

### Feeds and authentication

Accepted by `restore`, `build`, `check`, `validate compatibility`, `version`, and the `workspace`
commands. See [Authentication](/docs/authentication/).

| Option | Effect |
|---|---|
| `--feed <url>` | Add a NuGet feed. Repeatable |
| `--nuget-config <path>` | The `nuget.config` for sources and credentials |
| `--auth-mode <Auto\|Interactive\|NonInteractive>` | How to authenticate on private feeds |
| `--feed-token-env <feedUrl=ENV_VAR>` | Take the token of a feed from an environment variable. Repeatable |
| `--pat <token>` | Personal access token. Default: `ALWASP_PAT` |

### Project selection

| Option | Selects | Needs `alwasp.json` |
|---|---|---|
| `[targetOrProfile]`, `--profile <name>`, `--config <path>` | The projects of a configured target or profile | Yes |
| `--project <dir>` | One project folder | No |
| `--project-root <dir>` | All projects below a folder | No |
| `--workspace <file>` | The folders of a `.code-workspace` file that contain `app.json` directly | No |
| `--app <name\|appId\|path>` | Specified apps in `--project-root` or `--workspace` mode. Repeatable | No |
| `--changed-since <ref>` | Projects that changed after a Git reference | No |
| `--include-dependents` | With `--changed-since`: also the apps that depend on a changed app | No |

The selection modes cannot be combined. Each command accepts only the modes in its help text.

`--changed-since` accepts `latest` (the newest local tag), `latest:<glob>` (the newest tag that
matches, for example `latest:v*`), `latest-merge:<text>` (the nearest merge commit on the
first-parent history whose message contains the text), or a tag, branch, or commit. ALWasp reads
the local Git history and does not fetch.

### Business Central version

`--bc-version` and `--bc-country` are accepted by `build`, `workspace build`,
`validate compatibility`, `artifacts resolve`, `artifacts download`, and `translation prepare`.
See [Business Central Versions](/docs/bc-version/). `--bc-target` is a deprecated alias of
`--bc-version`.

## Restore and build

### restore

```bash
alwasp restore [appJsonPath] [--latest] [--output <path>]
```

Restores the symbols of one project. `--latest` uses the newest dependency versions. `--output`
sets the packages folder. [Guide](/docs/restore/) · [All options](/alwasp-cli-reference.html#c-restore)

### build

```bash
alwasp build [targetOrProfile]                 # config-driven
alwasp build --project <dir>                   # direct
alwasp build --project-root <dir> [--app <app>]...
alwasp build [path/to/app.json]                # single project
```

| Options | Mode |
|---|---|
| `--config`, `--profile`, `--manifest [path]`, `--continue-on-error`, `--changed-since`, `--plan <path>` | Config-driven |
| `--project`, `--project-root`, `--app`, `--changed-since`, `--include-dependents`, `--outfolder` | Direct |
| `--out`, `--outfolder`, `--warnaserror`, `--nowarn`, `--errorlog`, `--ruleset`, `--target`, `--parallel`, `--max-parallelism`, `--define`, `--features`, `--codecop`, `--appsourcecop`, `--ptecop`, `--uicop`, `--custom-analyzers` | Single project |
| `--bc-version`, `--bc-country` | Config-driven and direct |
| `--clean`, `--restore`, `--latest`, `--packages`, `--diagnostics` | All |

[Guide](/docs/build/) · [All options](/alwasp-cli-reference.html#c-build)

### plan

```bash
alwasp plan [targetOrProfile] --changed-since <ref> [--plan-file <path>] [--config <path>]
```

Writes a changed-only build and test plan and compiles nothing. `--changed-since` is necessary.
The default file is `.alwasp/alwasp-plan.json`.
[Guide](/docs/build/#plan-based-builds) · [All options](/alwasp-cli-reference.html#c-plan)

### check

```bash
alwasp check [targetOrProfile] [--profile <name>] [--changed-since <ref>] [--plan <path>]
```

Runs the configured gates on one selection: configuration, restore, build, compiler diagnostics,
compatibility, and translations. Needs `alwasp.json`. Also accepts `--continue-on-error` and the
feed options. [Guide](/docs/check/) · [All options](/alwasp-cli-reference.html#c-check)

### workspace restore

```bash
alwasp workspace restore [workspacePath] [--latest] [--packages <path>]
```

Restores the symbols of all projects of a `.code-workspace` file into one packages folder.
[Guide](/docs/restore/#workspace-vs-code-package-caches) · [All options](/alwasp-cli-reference.html#c-workspace-restore)

### workspace build

```bash
alwasp workspace build [workspacePath] [--outfolder <dir>] [--max-cpu-count <n>]
```

| Options | Purpose |
|---|---|
| `--bc-version`, `--bc-country` | Business Central version |
| `--packages`, `--restore`, `--latest`, `--clean` | Symbols |
| `--ruleset`, `--nowarn` (not together), the analyzer options, `--custom-analyzers`, `--define`, `--features` | Compiler |
| `--max-cpu-count <n>` | Number of projects that compile at the same time |
| `--outfolder <dir>`, `--manifest [path]`, `--log-directory <dir>`, `--diagnostics` | Output |
| `--source-url <url>`, `--source-commit <id>` | Source repository data that is put into the compiled packages |

[Guide](/docs/build/#workspace-build) · [All options](/alwasp-cli-reference.html#c-workspace-build)

## Configuration and versions

<a id="init"></a>

### config init

```bash
alwasp config init [--force] [--include-tests]
```

Writes a starter `alwasp.json` in the current folder from the projects in its direct child
folders. `--force` replaces a file that exists. `--include-tests` adds the test apps to `tests`.
[Guide](/docs/configuration/#inventory-classification) · [All options](/alwasp-cli-reference.html#c-config-init)

### config validate

```bash
alwasp config validate [--config <path>]
```

Reports all configuration errors in one run. Exit code `0` when valid, `1` when not.
[Guide](/docs/configuration/#validate) · [All options](/alwasp-cli-reference.html#c-config-validate)

<a id="version-apply"></a>
<a id="version-resolve"></a>

### version resolve / version apply

```bash
alwasp version resolve [targetOrProfile]
alwasp version apply [targetOrProfile] [--changed-since <ref>]
alwasp version resolve --project-root ./src --release-type Preview
alwasp version apply --project ./App --release-type Dev
```

`resolve` reports the calculated versions. `apply` writes them, and the versions of dependencies
on selected projects, into `app.json` permanently. The commands do not restore, compile, commit,
or tag.

| Option | Effect |
|---|---|
| `--release-type <Release\|Preview\|Dev\|None>` | Replaces `versioning.releaseType`. Without configuration the default is `Release` |
| `--version-source <AppJson\|Nuget>` | Replaces `versioning.source`. `Nuget` uses the newest published version on the feeds and `app.json` when there is none. Without configuration the default is `AppJson` |
| `--no-dependency-update` | Do not update dependency versions |
| `--dependency-update-scope <DirectlyChanged\|AllVersioned>` | Replaces `versioning.dependencyUpdateScope` |
| `--project`, `--project-root`, `--app`, `--include-dependents` | Direct selection without `alwasp.json` |

In direct mode, `--changed-since` selects only the apps whose own files changed. In configured
mode, `versioning.applyTo` and `changeDetection` apply.
[Guide](/docs/configuration/#versioning) · [All options](/alwasp-cli-reference.html#c-version-apply)

## Verification

### validate compatibility

```bash
alwasp validate compatibility [targetOrProfile]
alwasp validate compatibility --project <dir> --baseline <previous.app>
alwasp validate compatibility --project-root <dir> [--baseline-directory <dir>]
alwasp validate compatibility --project-root <dir> --get-baseline-symbols [feed-url]
alwasp validate compatibility --workspace <file> [--app <app>]...
```

| Option | Effect |
|---|---|
| `--baseline <app>` | The previous package, for `--project` |
| `--baseline-directory <dir>` | A folder with baseline packages, matched by app ID |
| `--get-baseline-symbols [feed-url]` | Download the latest stable baseline of each selected app. Default feed: Microsoft AppSourceSymbols |
| `--changed-since <ref>`, `--include-dependents` | Validate only changed apps, and optionally their dependents |
| `--packages <dir>` | The folder with the current dependency packages |
| `--ruleset <file>` | Ruleset for diagnostic severities |
| `--bc-version <list>` | `minimum` (default), `current`, `next-minor`, `next-major`, or a version. Accepts a comma-separated list |
| `--bc-country <list>` | Country code or a comma-separated list |
| `--max-parallel-processing <n>` | Number of version and country combinations that run at the same time |
| `--fail-on-next` | Make Insider failures fail the run when the list includes `current` |
| `--keep-artifacts` | Do not clean the artifact cache after this run |

[Guide](/docs/compatibility/) · [All options](/alwasp-cli-reference.html#c-validate-compatibility)

### compare

```bash
alwasp compare <baseline.app> <current.app> [--json <path>]
```

Lists the public-symbol changes between two compiled packages as `REMOVED`, `CHANGED`, or `ADDED`.
It is a change report, not a gate: a completed comparison exits `0`.
[Guide](/docs/compatibility/#compare-compiled-packages) · [All options](/alwasp-cli-reference.html#c-compare)

### analyze

```bash
alwasp analyze [targetOrProfile] [--changed-since <ref>] [--include <section,...>] [--json <path>]
```

| Option | Effect |
|---|---|
| `--include <section,...>` | Report only these sections |
| `--max-depth <n>` | Limit how far impact is followed for `impacted-tests` |
| `--max-items <n>` | Limit the console entries of each section; `0` or `--verbose` lists all |
| `--json <path>` | Write the full report |

[Guide](/docs/analyze/) · [All options](/alwasp-cli-reference.html#c-analyze)

### validate translations

```bash
alwasp validate translations [targetOrProfile] [--languages <tag,...>] [--fail-on <level>]
```

| Option | Effect |
|---|---|
| `--languages <tag,...>` | The necessary languages; also limits the check to these languages |
| `--fail-on <none\|missing-language\|missing-unit\|untranslated\|needs-review>` | The level from which findings fail the command. Default `untranslated` |
| `--min-coverage <percent>` | Minimum coverage for each language |
| `--require-generated` | Fail a project that has no generated `.g.xlf` |
| `--check-placeholders` | The translation must have the same placeholders as the source |
| `--max-issues <n>` | Number of issues listed for each language. Default `10`; `0` lists all |
| `--json <path>` | Write the coverage report |

Exit codes: `0` passed, `1` invalid input, `2` the gate failed.
[Guide](/docs/translations/) · [All options](/alwasp-cli-reference.html#c-validate-translations)

## Translation

### translation prepare

```bash
alwasp translation prepare <language> [--context <locale>] [--glossary <json>]
```

Writes a translation package to `.alwasp/translation/<language>`. Also accepts
`--parent-source-folder <dir>` (repeatable), `--bc-version`, `--bc-country`, and
`--expected-bc-version <version>`.
[Guide](/docs/translation-preparation/) · [All options](/alwasp-cli-reference.html#c-translation-prepare)

### translation validate

```bash
alwasp translation validate <file.xlf | package-directory> [--source <source.xlf>] [--language <tag>]
```

Validates a returned XLIFF file or a full package. Also accepts `--glossary` and
`--expected-bc-version`. Exit codes: `0` valid, `1` invalid input, `2` validation errors.
[Guide](/docs/translation-preparation/#validate-returned-xliff) · [All options](/alwasp-cli-reference.html#c-translation-validate)

### translation apply

```bash
alwasp translation apply <package> [--dry-run]
```

Writes the validated new, missing, and source-changed units of a package into the target XLIFF
files. Exit codes: `0` applied, `1` invalid input, `2` blocked.
[Guide](/docs/translation-preparation/#apply-returned-translations) · [All options](/alwasp-cli-reference.html#c-translation-apply)

### skills install

```bash
alwasp skills install alwasp-translate [--user] [--check] [--force]
```

Installs or updates an agent skill that is in the tool package.
[Guide](/docs/translation-skill/) · [All options](/alwasp-cli-reference.html#c-skills-install)

## Packages

### symbols create / pack / push / publish

```bash
alwasp symbols create <app> [--output <file-or-folder>]
alwasp symbols pack <symbolApp> [--output <folder>] [--dependency-package-id <appId=packageId>]...
alwasp symbols push <package> --source <feed-or-folder> [--api-key <key>] [--skip-duplicate]
alwasp symbols publish <app> --source <feed-or-folder> [--output <folder>]
```

Makes a symbol-only app, packs it into a NuGet package, and pushes it to a feed. `publish` runs
the three stages. [Guide](/docs/symbol-packages/) · [All options](/alwasp-cli-reference.html#c-symbols)

### app pack / push / publish

```bash
alwasp app pack <app> [--output <folder>] [--dependency-package-id <appId=packageId>]...
alwasp app push <package> --source <feed-or-folder> [--api-key <key>] [--skip-duplicate]
alwasp app publish <app> --source <feed-or-folder> [--output <folder>]
```

Packs the full compiled app into a NuGet package and pushes it to a feed. `publish` runs the two
stages. [Guide](/docs/app-packages/) · [All options](/alwasp-cli-reference.html#c-app)

`push` and `publish` of the two groups accept `--source` (necessary), `--api-key`,
`--skip-duplicate`, `--nuget-config`, `--auth-mode`, `--feed-token-env`, and `--pat`.

### app set-package-id

```bash
alwasp app set-package-id <appPath> [--out <path>]
```

Gives a compiled `.app` a new random deployment package ID, so that you can upload the same app to
a Business Central sandbox again. The app ID in `app.json` does not change. Without `--out`, the
file is changed in place. The command changes a local file and uses no network.
[All options](/alwasp-cli-reference.html#c-app-set-package-id)

## Artifacts and tools

### artifacts resolve

```bash
alwasp artifacts resolve [--bc-version <version>] [--bc-country <code>]
```

Shows the Business Central version and the artifact URLs that a name or version means. It reads
only the artifact indexes; nothing is downloaded or cached. Without `--bc-version`, it resolves
`current`, `next-minor`, and `next-major`; if one of them fails, the command fails. `--verbose`
adds the URLs to the table.

```bash
VERSION=$(alwasp artifacts resolve --bc-version next-major --format json | jq -r .data.version)
```

[Guide](/docs/bc-version/) · [All options](/alwasp-cli-reference.html#c-artifacts-resolve)

### artifacts download

```bash
alwasp artifacts download --bc-version <next-minor|next-major|build> [--bc-country <code>]
```

Downloads and verifies one artifact into `~/.alwasp/artifacts`. There is no output option.
[All options](/alwasp-cli-reference.html#c-artifacts-download)

### artifacts prune

```bash
alwasp artifacts prune [--dry-run] [--older-than <days>] [--all]
```

Cleans `~/.alwasp/artifacts` and the state of folders that no longer exist.

| Removed | Condition |
|---|---|
| Superseded builds | A newer build of the same major.minor and country is cached, and the build was not used for one day |
| Unused artifacts | Not used for `--older-than` days (default `14`) |
| Incomplete downloads and temporary run folders | Older than one day |
| All completed artifacts | With `--all` |
| State of a folder that no longer exists | Not used for `--older-than` days, or immediately when its parent folder is also gone |

Artifacts and caches that a running ALWasp process uses stay. `--dry-run` only reports.
[Guide](/docs/compatibility/#artifact-cache-cleanup) · [All options](/alwasp-cli-reference.html#c-artifacts-prune)

### tools update

```bash
alwasp tools update [--check] [--clean]
```

Downloads the newest AL compiler tools package into `~/.alwasp/tools/<version>/`. `--check` only
reports and exits `2` when an update is available. `--clean` removes older cached versions.
[Guide](/docs/bc-version/#al-compiler-selection) · [All options](/alwasp-cli-reference.html#c-tools-update)

## More reference

- [Exit codes, environment variables, and files](/docs/reference/)
- [Structured Output](/docs/structured-output/)
