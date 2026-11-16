---
title: Troubleshooting
description: Causes and solutions for restore, authentication, compiler, build, and compatibility problems.
group: Reference
order: 34
---

# Troubleshooting

Start with `--verbose`. It shows the feeds, the resolved packages, and the compiler call. After a
failure, the `Failure artifacts` list at the end of the output gives the paths of the compiler
logs and the manifest.

## Restore

### A package is not found

- Make sure that the feed that contains the package is in the feed list. The sequence is: `--feed`
  entries, the built-in public Business Central feeds, then the feeds of `nuget.config`.
- ALWasp looks for `{Publisher}.{Name}.symbols.{AppId}` and then searches the feeds for the app
  ID. A package with a different ID is found only when the feed supports that search.
- For a Microsoft localization, examine `restore.country` or `--bc-country`.
- For a dependency of your own that is not yet on a feed, use
  [`restore.overridesFolder`](/docs/restore/#package-overrides).

### 401 or 403 from a feed

- In CI, `--auth-mode auto` is non-interactive. Supply a token with `ALWASP_PAT`, `--pat`, or
  `--feed-token-env`.
- A variable that `--feed-token-env` names must exist and must not be empty.
- For interactive sign-in on your computer, install the credential provider of the feed, for
  example the Azure Artifacts Credential Provider.
- `--pat` is applied only to feeds that have no other credentials. It is never sent to the
  built-in public feeds.

See [Authentication](/docs/authentication/).

## Compiler

### The compiler is not found or cannot start

- Without `--bc-version`, ALWasp downloads the compiler from NuGet.org. Make sure that the
  computer can reach NuGet.org, or run `alwasp tools update` on a computer that can and cache
  `~/.alwasp/tools`.
- A path in `tooling.alcPath`, `tooling.altoolPath`, `ALC_PATH`, or `AL_PATH` must exist and must
  be a program that can start on this computer. ALWasp does not continue with a different source
  when such a path is wrong.
- With `--bc-version`, the artifact must contain the compiler. These overrides are not used.

See [AL compiler selection](/docs/bc-version/#al-compiler-selection). The `toolchain` data in the
build summary shows which compiler ran.

### The compiler crashed

A crash is reported as `abnormalTermination` with the exit code. ALWasp does not try again with a
different compiler. Look for the stack trace in the compiler output, and try a different
`--bc-version` or tools version to find out if the crash belongs to one compiler version.

### A symbols or app command says that ALTool does not have a command

Run `alwasp tools update`, or point `AL_PATH` to a newer `altool`.

## Build

### `alwasp build` selects no projects

- `alwasp.json` must be in the current folder, or pass `--config`.
- The `include` values of the profile must be `apps`, `tests`, or IDs from `apps`/`tests`.
- The target must name profiles that exist. Run `alwasp config validate`.

### AL1028 or AL1023 during a build

`AL1028` ("the process cannot access the file") and `AL1023` ("package file is not valid") mean
that a different process had a compiled `.app` open while the compiler wrote or read it.

ALWasp prevents this between its own processes: it removes the old output before the compile,
commands on the same packages folder wait for each other (up to 15 minutes), and parallel compiles
write to a private folder first.

If the error continues:

- Close programs that hold `.app` files in the packages folder open, for example a second VS Code
  window or a virus scanner that scans the folder. The message gives the path of the file.
- Use `--max-cpu-count 1` to find out if parallel compile is related.

### A command waits for the package cache

A different ALWasp command is writing to the same packages folder. The message names the folder.
If no command runs, a command was stopped by force; the next command removes the lock that stayed.

### Different output folders in a direct build

The selected projects have different VS Code output settings. Align them or pass `--outfolder`.

### `app.json` was changed after an interrupted build

Run the build or `alwasp version apply` again. ALWasp restores the original file from its backup
before it does other work.

## Compatibility

### AL0161 "inaccessible due to its protection level" only in `validate compatibility`

The app uses an API that is not public in the lowest release that the app declares. Increase
`application` in `app.json`, or do not use the API. See
[Minimum supported release](/docs/compatibility/#minimum-supported-release).

### A warning about an understated minimum

A dependency needs a newer release than `application`/`platform` in `app.json`. The table at the
end of the run shows the necessary values. Correct `app.json`.

### An artifact is not found

- `alwasp artifacts resolve` shows which builds `current`, `next-minor`, and `next-major` mean
  for a country.
- A version prefix such as `28.0` selects only released builds. For an Insider build, give the
  full four-part version or use `next-minor` / `next-major`.

### A Microsoft localization app is missing in an artifact run

A localization app such as `E-Document for Germany` is only in the artifact of its country. Add
that country to the run (`--bc-country de,us`) so that ALWasp can take the app from it.

### The disk is full

Each artifact uses approximately 1 GB. Run `alwasp artifacts prune`, or `alwasp artifacts prune
--all` to remove all artifacts that are not in use.

## Structured output

### The JSON output of a build contains other text

Use `--result-file`. See [Structured Output](/docs/structured-output/#use---result-file-for-builds).

## Get help

If the problem continues, [open an issue](https://github.com/left-code/alwasp-dev/issues/new/choose).
Include the ALWasp version (`alwasp --version`), the command, and the output with `--verbose`.
Remove secrets and private feed URLs first.
