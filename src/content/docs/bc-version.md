---
title: Business Central Versions
description: How --bc-version and --bc-country select Microsoft symbols, the AL compiler, and analyzers, and which compiler ALWasp uses.
group: Reference
order: 31
---

# Business Central Versions

`--bc-version` is the one option that selects a Business Central version. It decides where the
Microsoft symbols come from and which AL compiler and analyzers compile your apps.

## The two sources

| Source | When | Microsoft symbols | Compiler and analyzers |
|---|---|---|---|
| **NuGet** | You do not pass `--bc-version` | NuGet symbol packages | See [AL compiler selection](#al-compiler-selection) |
| **Artifact** | You pass `--bc-version` | One Business Central artifact | The same artifact |

An artifact is a complete Business Central build from Microsoft. It supplies symbols, compiler,
and analyzers that belong together. Partner dependencies always come from NuGet feeds, with your
feed and authentication options.

## Values

| Value | Selects |
|---|---|
| `current` | The latest released artifact for the country |
| `next-minor` | The Insider artifact of the next minor release |
| `next-major` | The Insider artifact of the next major release |
| `29.0` or `29.0.12345` | The latest released build that starts with this version |
| `29.0.12345.0` | Exactly this build. Released artifacts are searched first, then Insider artifacts |
| `minimum` | Only for `validate compatibility`: the lowest release that each app supports. See [Compatibility](/docs/compatibility/#minimum-supported-release) |

Values are not case-sensitive. A version prefix never selects an Insider build. If an artifact is
not available, the command fails. It does not change to NuGet or to a different version.

To see which builds the names mean today, without a download:

```bash
alwasp artifacts resolve
alwasp artifacts resolve --bc-version next-major --bc-country DE
```

## Behavior for each command

| Command | Without `--bc-version` | Number of values |
|---|---|---|
| `build` (configured, `--project`, `--project-root`) | NuGet | One |
| `workspace build` | NuGet | One |
| `validate compatibility` | NuGet, each app at its minimum supported release | A comma-separated list |
| `artifacts resolve` | Resolves `current`, `next-minor`, and `next-major` | One |
| `artifacts download` | A value is necessary: `next-minor`, `next-major`, or a full build | One |
| `translation prepare` | The latest released build of each app's `application` major.minor | One |

`build` with a positional `app.json` path does not accept these options.

```bash
alwasp build ci --bc-version current --bc-country DE
alwasp build --project-root ./src --bc-version 27.5 --bc-country DE
alwasp workspace build --bc-version next-minor
alwasp validate compatibility --project-root ./src --bc-version minimum,current,next-minor
```

## Country

`--bc-country` is a country code such as `DE`. It is not case-sensitive.

| Command | Default |
|---|---|
| `build`, `translation prepare` | `restore.country` in `alwasp.json`, then `W1` |
| `workspace build`, `validate compatibility` (directory mode), `artifacts` | `W1` |
| `validate compatibility` (configured) | `restore.country`, then `W1` |

- With `--bc-version`, the country selects the artifact.
- Without `--bc-version`, the country selects only the localized NuGet symbol packages. It never
  selects an artifact.
- Only `validate compatibility` accepts a country list (`--bc-country de,us,w1`).

## Deprecated option

`--bc-target` is a deprecated alias of `--bc-version`. It accepts the same values and reports a
deprecation warning. A command that receives the two options fails with
`Use --bc-version only; do not combine --bc-target and --bc-version.`

Result and manifest field names such as `bcTarget`, `bcTargets`, and `resolvedBcVersion` did not
change.

## Where artifact data is kept

| Folder | Contents |
|---|---|
| `~/.alwasp/artifacts` | Downloaded artifacts, approximately 1 GB each |
| `~/.alwasp/state/<packages-key>/bc/<version>-<country>` | The symbol package cache of one artifact build |

Artifact symbols are never put in your repository. The VS Code AL extension continues to read your
usual packages folder, and the build output tells you the two locations:

```text
Symbols and compiler: BC released 28.4.200.0 (DE) -> /home/me/.alwasp/state/repo_.alpackages-1a2b3c4d5e6f/bc/28.4.200.0-de
The VS Code AL extension does not use these symbols. It uses: /repo/.alpackages
```

An artifact build stages only the Microsoft packages that the selected apps and their restored
partner dependencies need, plus `System` and `Application`. This keeps the compile fast.

For an artifact build without `--outfolder` or a VS Code output setting, direct builds write to
`.output/<version>-<country>`.

A `--bc-version` whose major.minor differs from a configured `workspace.bcVersion` fails
validation.

See [artifact cache cleanup](/docs/compatibility/#artifact-cache-cleanup) to control disk use.

## AL compiler selection

`build`, `workspace build`, `validate compatibility`, and `check` use one rule.

| Request | Compiler and analyzers |
|---|---|
| `--bc-version` is given | The compiler and analyzers of that artifact. Overrides are not used |
| No `--bc-version` | 1. `tooling.alcPath` / `tooling.altoolPath` in `alwasp.json` 2. `ALC_PATH` / `AL_PATH` 3. The AL tools NuGet package |

- `tooling.altoolPath` applies to configured `build` and `check`. `tooling.alcPath` applies to
  configured `validate compatibility`. The paths are relative to the `alwasp.json` folder. The
  commands that use `--project`, `--project-root`, or `workspace build` do not read them.
- An explicit path that does not exist, or that cannot start on this computer, fails the command.
  ALWasp does not continue with the next source.
- The NuGet package is the newest `Microsoft.Dynamics.BusinessCentral.Development.Tools`,
  prereleases included. It is kept in `~/.alwasp/tools/<version>/`. ALWasp uses the binary for
  your operating system and CPU with the highest .NET version that your runtime can run.
- An artifact that has no compiler for workspace compilation fails the build. ALWasp never
  combines artifact symbols with a different compiler.
- Single-project `build` and `validate compatibility` run `alc`. The multi-project builds run
  `altool workspace compile`.

Manage the NuGet tool cache with `alwasp tools update`:

```bash
alwasp tools update           # download the newest version if necessary
alwasp tools update --check   # only report; exit code 2 if an update is available
alwasp tools update --clean   # also remove older cached versions
```

## Which compiler ran: `toolchain`

Each build and compatibility run reports the compiler that it used. Builds print two summary
lines and put `toolchain` in `effectiveConfiguration.businessCentral` and in the build manifest.
`validate compatibility` puts it in its result, for each version and country combination in
`countries[].toolchain`.

| Field | Meaning |
|---|---|
| `invocation` | `alc` or `altool` |
| `launcherPath` | The binary that ALWasp starts |
| `alcPath` | The `alc` that compiles, or `unknown` |
| `origin` | `artifact`, `config`, `environment`, `nuget-cache`, or `nuget-download` |
| `originDetail` | The artifact source, the `tooling.*` key, the environment variable, or the NuGet package ID |
| `toolsPackageVersion` | The NuGet tools package version (NuGet origins only) |
| `artifactVersion` | The artifact version (artifact origin only) |
| `compilerVersion` | The file version of the `alc` assembly, or `unknown` |
| `analyzersDirectory` | The analyzer folder adjacent to the compiler, if there is one |
