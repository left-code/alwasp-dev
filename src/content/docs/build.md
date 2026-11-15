---
title: Build
description: Compile configured targets, discovered project folders, one project, or a VS Code workspace, and control output, rulesets, manifests, and diagnostics.
group: Guides
order: 11
---

# Build

## Build modes

| Mode | Command | Needs `alwasp.json` | Compiler call |
|---|---|---|---|
| [Config-driven](#config-driven-build) | `alwasp build [target-or-profile]` | Yes | `altool workspace compile` |
| [Direct](#direct-build) | `alwasp build --project <dir>` or `--project-root <dir>` | No | `altool workspace compile` |
| [Single project](#single-project-build) | `alwasp build [path/to/app.json]` | No | `alc` |
| [Workspace](#workspace-build) | `alwasp workspace build [file.code-workspace]` | No | `altool workspace compile` |

`alwasp build` without options uses config-driven mode when `alwasp.json` is in the current
folder, and single-project mode when it is not. `--project` and `--project-root` always select
direct mode.

All modes restore symbols before they compile. See [Restore](/docs/restore/).

## Config-driven build

```bash
alwasp build                      # defaultTarget from alwasp.json
alwasp build ci                   # a target: its profiles, in sequence
alwasp build --profile appsource  # one profile
```

For each profile, ALWasp restores the symbols of the selected projects, puts projects with the
same compiler settings into one group, and compiles each group in dependency order. See
[Configuration](/docs/configuration/) for profiles, targets, and settings.

### Temporary app.json changes

A config-driven build can change `app.json` for the compile and restore the original file
afterwards, also when the build fails or is cancelled.

| Configuration | Written to `app.json` |
|---|---|
| `versioning` | `version`, and the `version` of dependencies on other selected projects |
| `resourceExposurePolicy` | `resourceExposurePolicy` |
| `applicationInsights` | `applicationInsightsConnectionString` or `applicationInsightsKey` |
| `defines` | `preprocessorSymbols`, added to the symbols already in the file |

- The backup is kept outside the repository, in `~/.alwasp/state/<project-key>/app.json.bak`. If a
  run was interrupted, the next build or `version apply` restores the file first.
- Version changes replace only the version values. Comments, indentation, and line endings stay
  as they are. Dependencies are matched by app ID; external packages are never changed.
- **Each profile gets its own changes.** When a project is in more than one profile of a target,
  it is compiled in each profile with that profile's `versioning`, `applicationInsights`,
  `resourceExposurePolicy`, and `defines`. The build output names such projects and the settings
  that differ, never the values.
- Because `defines` go into `app.json` and not into a compiler argument, projects that differ
  only in their defines can compile in one group.

### Warnings as errors

`altool workspace compile` has no option to treat warnings as errors. ALWasp reads the compiler
logs after each group. With `warningPolicy.treatWarningsAsErrors`, a group with warnings that are
not suppressed fails, and the warnings are printed.

```json
{
  "defaults": {
    "warningPolicy": { "treatWarningsAsErrors": true }
  }
}
```

### Compatibility in the build

A profile with `compatibility.enabled: true` compiles the apps that have a
`compatibility.baseline` with AppSourceCop against that baseline. See
[Compatibility](/docs/compatibility/#profile-bound-baseline-validation).

### Build manifest

The manifest is a JSON file that describes the build: selected projects, compile groups,
effective settings, diagnostics, and for each project the original and effective version.

```bash
alwasp build ci --manifest                      # .alwasp/build-manifest.json
alwasp build ci --manifest output/manifest.json
```

The path comes from the first of these that is set: `profile.manifest`, `workspace.manifest`,
`--manifest`. A target with more than one profile writes one combined manifest.

| Manifest data | Contents |
|---|---|
| `projects[]` | Each project with its role, versions, and `internalDependencyVersions`. Describes the first profile that builds the project |
| `profiles[]` | Each profile with `artifactType` (`apps`, `tests`, or `mixed`) and its compile groups |
| `profiles[].projects[]` | The `app.json` changes that this profile compiled each project with |
| `effectiveConfiguration` | The settings that were used and where each came from, including `businessCentral.toolchain` |

Secret values are never written. For Application Insights, the manifest records only that a value
was applied, the property name, the mode, and the source.

## Direct build

Direct mode builds project folders in dependency order without `alwasp.json`.

```bash
alwasp build --project ./src/Core
alwasp build --project-root ./src
alwasp build --project-root ./src --app Core --app Sales
alwasp build --project-root ./src --changed-since origin/main
alwasp build --project-root ./src --changed-since origin/main --include-dependents
```

- `--project` selects one project folder. `--project-root` finds all projects below a folder.
- `--app` (repeatable, with `--project-root`) selects apps by name, app ID, or path relative to
  the root. A name that is not found, or that matches more than one app, fails.
- Local apps that a selected app depends on are compiled, but they are not copied to the output
  folder.
- `--changed-since` selects the apps whose own files changed. Add `--include-dependents` to build
  the apps that depend on them too. If nothing changed, the command succeeds and compiles nothing.
- Test apps are included.

Direct mode takes precedence when `alwasp.json` exists. You cannot combine it with a positional
argument, `--profile`, `--plan`, `--config`, or `--out`.

## Single-project build

```bash
alwasp build
alwasp build path/to/app.json
alwasp build --out ./artifacts/MyApp.app
alwasp build --codecop --appsourcecop --ptecop --uicop
```

This mode compiles one `app.json` with `alc` and accepts the compiler options directly:
`--warnaserror`, `--nowarn`, `--errorlog`, `--ruleset`, `--target`, `--parallel`,
`--max-parallelism`, `--define`, `--features`, the analyzer options, and `--custom-analyzers`.

## Workspace build

```bash
alwasp workspace build ./MyWorkspace.code-workspace
alwasp workspace build --max-cpu-count 4 --ruleset ./ruleset.json
alwasp workspace build --outfolder ./output --manifest
```

`workspace build` compiles the folders of a `.code-workspace` file. Without a path, it uses the
workspace file in the current folder. It reads its settings from options and from VS Code AL
settings, not from `alwasp.json`. For a repository with profiles and CI targets, use the
config-driven build.

### VS Code AL settings

`workspace build` reads the `settings` of the workspace file and each project's
`.vscode/settings.json`. The sequence of precedence is: command-line option, project settings,
workspace settings, default.

| Setting | Effect |
|---|---|
| `al.packageCachePath` | Text or list of symbol folders. The first folder is the shared cache that ALWasp writes to. The others are read-only |
| `al.ruleSetPath` | Ruleset for the project. An empty value disables the workspace ruleset |
| `al.enableCodeAnalysis`, `al.codeAnalyzers` | The listed analyzers run only when code analysis is enabled |
| `al.compilationOptions.maxDegreeOfParallelism` | Compile parallelism, a positive integer |
| `al.compilationOptions.outFolder`, `al.packageOutputPath` | Output folder for the project. The first setting has priority |

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

- Relative paths are relative to each project folder, also when the setting is in the workspace
  file. Comments and trailing commas are accepted.
- An explicit `false` or empty value in the project settings stops the workspace value.
- An analyzer option on the command line replaces only the related setting.
- Projects with different rulesets, analyzers, or parallelism compile in separate groups, in
  dependency order. A failed group stops the groups after it.
- A ruleset file or analyzer assembly that is not found, an unknown analyzer name, or a
  parallelism that is not positive fails before the compile. A settings file that cannot be read
  gives a warning.
- `al.nugetFeeds` and `al.symbolsCountryRegion` are recognized but not applied. Use the feed and
  country options.
- An artifact build (`--bc-version`) uses its own package cache and does not use the
  settings-defined caches.

The settings that were applied, and their source, are in `alSettings` in the structured result.

## Output folders

| Mode | Sequence of precedence |
|---|---|
| Config-driven | `profile.outFolder`, then `defaults.outFolder` |
| Direct | `--outfolder`, then the VS Code output setting, then `<root>/.output` |
| Single project | `--out` or `--outfolder`, then the VS Code output setting, then the project folder |
| Workspace | `--outfolder` (all apps in one folder), then each project's VS Code output setting |

The VS Code output setting is `al.compilationOptions.outFolder`, then `al.packageOutputPath`, from
the project's `.vscode/settings.json`. A relative path is relative to the project folder.

In direct mode, all selected projects must give the same folder. If they differ, or if some have a
setting and others do not, the build fails before the compile. Align the settings or pass
`--outfolder`.

`--outfolder` is relative to the current folder.

## Business Central version

Without `--bc-version`, a build uses NuGet symbols and the NuGet compiler. With it, one Business
Central artifact supplies the Microsoft symbols, the compiler, and the analyzers.

```bash
alwasp build ci --bc-version current --bc-country DE
alwasp build --project-root ./src --bc-version 27.5 --bc-country DE
alwasp workspace build --bc-version next-minor
```

See [Business Central Versions](/docs/bc-version/) for all values, the country rules, and the
compiler selection.

## Rulesets

In the modes without `alwasp.json`, ALWasp finds the ruleset of each project in this sequence:

1. `--ruleset` on the command line.
2. `ruleset.json`, then the first `*.ruleset.json`, in the project folder.
3. `al.ruleSetPath` in the project's `.vscode/settings.json`.
4. `al.ruleSetPath` in the nearest `.code-workspace` file above the project whose `folders` list
   the project.

- A workspace file that does not list the project is ignored. Workspace files farther up are not
  used to fill gaps.
- If more than one workspace file at the same level has AL settings, none is applied and a
  diagnostic tells you. Keep the AL settings in one workspace file.
- A configured path to a file that does not exist fails the command.
- `--ruleset` without a value, or with an empty value, is the same as no option. This is useful
  for an empty pipeline variable.

Config-driven builds use the `ruleset` setting from `defaults`, the profile, or the override.

## Plan-based builds

A plan selects only what a change makes necessary, and makes that selection repeatable across
pipeline jobs.

```bash
alwasp plan ci --changed-since origin/main
alwasp build --plan .alwasp/alwasp-plan.json
alwasp check --plan .alwasp/alwasp-plan.json
```

`alwasp plan` compiles nothing. It writes `.alwasp/alwasp-plan.json` (or `--plan-file <path>`)
with:

- the changed projects, the apps that depend on them, the affected test apps, and the local apps
  necessary to compile them;
- the build levels and the deployment order;
- the commit IDs, hashes of the changed files, a hash of the configuration, and a fingerprint.

A change to `alwasp.json`, to a configured NuGet config, or to an active ruleset selects the
complete target. No related change gives an empty plan, which is a success. A dependency cycle
fails.

`build --plan` and `check --plan` use the plan as the selection. They fail if the plan no longer
agrees with the repository: a different configuration, HEAD commit, changed-file set or content,
profile, or app ID. An empty plan succeeds without restore or compile.

`--plan` cannot be combined with a positional target or `--profile`. You can add `--changed-since`
only for `versioning.applyTo: changedOnly`; it must resolve to the base that the plan recorded.

A build with `--changed-since` and no plan builds the complete target. There, the option only
controls change-related versioning.

## Clean builds

```bash
alwasp build --clean
alwasp build ci --clean
alwasp workspace build --clean
```

`--clean` removes what ALWasp made in an earlier run before it restores and compiles: the package
cache contents, the compiled output, the compiler logs, and the build manifest.

- Files in the output and log folders that ALWasp did not make stay.
- An output folder that comes from a VS Code setting stays, because other projects or the AL
  extension can use it.
- For `workspace build`, `--clean` also clears the artifact package caches of that packages
  folder, for all versions and countries. A cache that another ALWasp process uses is skipped
  with a warning.

## Parallel compile

When more than one project can compile at the same time, ALWasp compiles one dependency level
after the other. Independent projects of a level compile in parallel. Each finished `.app` is
moved into the package cache only when it is complete, so that a different compile cannot read an
incomplete file.

`maxCpuCount: 1` or `--max-cpu-count 1` compiles everything in one serial compiler call. For such
a serial config-driven build, `workspace.isolateDependencyLevels: true` requests the split by
dependency level.

Commands that write to the same packages folder wait for each other. See
[Troubleshooting](/docs/troubleshooting/#al1028-or-al1023-during-a-build).

## Build output and diagnostics

Each build prints the symbol source and the Business Central version that it compiles against:

```text
Symbols: NuGet feeds -> /repo/.alpackages
Compiling against Business Central: Base Application 27.5.38214.0, System 27.0.38180.0 (app.json application 27.0)
```

The summary at the end shows the effective settings with their source (`cli`, `config`,
`profile`, `project`, `discovered`, `default`, `resolved`, or `notResolved`), the settings of each
project, the totals of compiler and analyzer findings, the output folders, and, after a failure,
the stage that failed. Compile groups with the same settings are shown as one line; a failed group
always has its own line. `--quiet` hides the summary of a successful build.

To list each finding, use `--diagnostics` or `workspace.diagnostics: true`.

In GitHub Actions and Azure Pipelines, compiler findings are also written as annotations.

Credentials, secret URL parameters, bearer tokens, and connection strings are removed from all
output.

### Compiler logs

By default, compiler logs go to `~/.alwasp/state/<workspace-key>/logs`, outside the repository.
Set `workspace.logDirectory` or `--log-directory` to select a different folder.

A failed command ends with a `Failure artifacts` list of the logs and manifests that are
available.

### Compiler failures

A failed compile is one of three kinds:

| `kind` | Meaning |
|---|---|
| `abnormalTermination` | The compiler crashed, for example exit code 134 (`SIGABRT`) on Linux or `0xE0434352` on Windows |
| `compilationErrors` | The logs contain AL errors. The error count is reported |
| `noErrorsReported` | The compiler ended with an error code, but the logs contain no AL error |

The message gives the compiler path, the Business Central artifact or the NuGet source, the exit
code, and the host. ALWasp does not try again with a different compiler or version after a crash.
Look for the stack trace in the compiler output.

In structured output, a failed compile group has `compilerFailure` with `kind`, `exitCode`,
`compiler`, `businessCentral`, `host`, and, when available, `exitCodeMeaning` and `errorCount`.
See [Structured Output](/docs/structured-output/).
