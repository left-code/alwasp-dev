---
title: Structured Output
description: The --format json and ndjson output, the result document, the record stream, and the --result-file option.
group: Reference
order: 32
---

# Structured Output

Each command accepts `--format` and `--result-file`. Use them when a script or a pipeline must
read the result.

| `--format` | Standard output | Human output |
|---|---|---|
| `text` (default) | Human-readable lines | Standard output; errors on standard error |
| `json` | One result document | Moved to standard error |
| `ndjson` (alias `jsonl`) | One JSON record for each line, written while the command runs | In `log` records |

The exit code is the same for all formats.

```bash
alwasp restore --format json | jq '.data.packagesFolder'
alwasp validate translations --format json | jq '.data.report.projects[].coverage'
alwasp build release --format json --result-file .alwasp/build-result.json
```

## Use `--result-file` for builds

`--result-file <path>` writes the JSON or NDJSON output to a file. The console then shows the
normal text output.

**`build`, `check`, and `workspace build` need `--result-file`** for clean machine-readable
output. The AL compiler writes directly to the console, and ALWasp cannot redirect that output
into the JSON stream.

With `--format json` and no `--result-file`, the CI annotations of `workspace build` move to
standard error with the other human output. Pipelines that use the annotations must use `text`,
`ndjson`, or `--result-file`.

## The result document

`--format json` prints one document. `--format ndjson` ends with the same document in a `result`
record.

```json
{
  "schemaVersion": 1,
  "command": "build",
  "success": true,
  "exitCode": 0,
  "startedAtUtc": "2026-07-31T09:12:03.114+00:00",
  "completedAtUtc": "2026-07-31T09:14:52.881+00:00",
  "durationMs": 169767,
  "data": { "mode": "config", "profiles": ["appsource"], "build": { } },
  "warnings": [],
  "errors": []
}
```

`data` is different for each command:

| Command | `data` |
|---|---|
| `restore` | The packages folder and the download counts |
| `build` | The build manifest (profiles, groups, project versions), also without `--manifest`, and `effectiveConfiguration` |
| `workspace build` | `alSettings`, `effectiveConfiguration`, compile groups, and `compilerFailure` after a failure |
| `check` | `target`, `profile`, `profiles`, `projects`, `selectedProjects`, `planFile`, `changedSince`, and `steps` |
| `validate compatibility` | The verdicts for each app, `selectedProjects`, `projectClassifications`, `understatedMinimums`, `failureReasons`, `toolchain`, and for more than one version or country `countries` |
| `compare`, `validate translations`, `analyze` | The report |
| `version resolve` / `apply` | The current and the next version of each project, with `wouldUpdate` or `updated` |
| `artifacts resolve` | `target`, `version`, `country`, `source`, and `artifacts.application` / `artifacts.platform`; without a version, `results` for the three names |
| `artifacts prune` | The removed artifacts and `stateDirectoriesRemoved` |
| `symbols` / `app` `pack`, `push`, `publish` | Paths, package ID and version, dependencies, source, and `failedStage` after a failure |
| `app set-package-id` | The old and the new package ID |

The guide of each command gives the details of its data.

## The NDJSON record stream

| `type` | Meaning |
|---|---|
| `log` | A line of human output. Lines from the AL compiler have `"stream": "stdout"` or `"stderr"` |
| `event` | A progress event, for example `profileStarted`, `groupCompleted`, `profileCompleted`, `symbols.stage`, `app.stage`, `artifactResolved` |
| `warning`, `error` | A warning or an error. These are also in the result document |
| `result` | The result document. It is always the last record |

```json
{"type":"event","timestampUtc":"...","command":"build","event":"profileStarted","data":{"profile":"appsource","projects":["Base"]}}
```

```bash
jq -r 'select(.type=="event") | .event' .alwasp/build-result.ndjson
```

## Other JSON files

These files are separate from `--format`:

| File | Written by | Contents |
|---|---|---|
| Build manifest | `build --manifest`, `workspace build --manifest` | See [Build manifest](/docs/build/#build-manifest) |
| Plan | `alwasp plan` | See [Plan-based builds](/docs/build/#plan-based-builds) |
| Reports | `compare --json`, `analyze --json`, `validate translations --json` | The report of that command |

## Clickable paths and failure artifacts

In an interactive terminal, the text output can show file paths and URLs as links.
`ALWASP_HYPERLINKS=auto|always|never` controls this; the default is `auto`. Output that is
redirected, and output in CI, is always plain. JSON, NDJSON, result files, and log files never
contain link sequences.

A failed command ends its text output with a `Failure artifacts` list when compiler logs, a build
manifest, or a translation coverage report are available. This list is text only. It adds no
fields or records to the structured output.
