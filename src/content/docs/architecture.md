---
title: How ALWasp Works
description: "What each command does in sequence: restore, config-driven build, version commands, compatibility, source analysis, and translation checks."
group: Reference
order: 36
---

# How ALWasp Works

ALWasp is one command-line program. It reads your AL projects, gets symbols from NuGet feeds or
Business Central artifacts, starts Microsoft's AL compiler, and reports the result. It has no
server part, and it does not connect to a Business Central environment.

| ALWasp connects to | Purpose |
|---|---|
| NuGet feeds | Read symbol packages; write packages only with `symbols push`/`publish` and `app push`/`publish` |
| NuGet.org | Download the AL compiler tools |
| Microsoft's Business Central artifact storage | Download artifacts when you use `--bc-version` |
| Your local Git repository | Read tags, refs, and diffs for change detection. ALWasp does not fetch, commit, tag, or push |

## Restore

1. Read `app.json`.
2. Collect the explicit dependencies and add the implicit Microsoft dependencies.
3. Make the feed list: `--feed` entries, built-in public feeds, `nuget.config` feeds.
4. Resolve each dependency, then the dependencies of each package, level by level.
5. Download the packages and put the `.app` files in the packages folder.
6. Record what was restored, so that the next restore downloads only what is new.

`workspace restore` does this one time for all projects of the workspace. It removes duplicates
and does not restore a dependency that is a project of the workspace.

See [Restore](/docs/restore/).

## Config-driven build

1. Load and validate `alwasp.json`.
2. Resolve the target or profile, or read the plan.
3. Restore `app.json` files that an interrupted run left changed.
4. Find changed projects from Git, when change detection is active.
5. Plan, for each profile and project: version, dependency versions, Application Insights,
   resource exposure, and preprocessor symbols.
6. Restore symbols for the selected projects and apply package overrides.
7. For each profile: change the `app.json` files, compile the groups in dependency order, and move
   the compiled apps to the output folder.
8. Restore the original `app.json` files. This is also done after a failure.
9. Write the manifest and print the summary.

See [Build](/docs/build/).

<a id="version-apply-pipeline"></a>

## Version commands

`version resolve` and `version apply` use the same selection, change detection, and version
calculation as the build. `resolve` only reports. `apply` writes the calculated `version` and the
versions of dependencies on selected projects into `app.json` permanently. Only these values are
replaced; all other text in the file stays the same. The commands do not restore, compile, or use
Git to write.

See [Configuration](/docs/configuration/#versioning).

## Compatibility

`alwasp compare` reads two compiled packages and lists the differences in their public symbols.
It does not start the compiler.

`alwasp validate compatibility` compiles your current source:

1. Select the apps and find their baselines by app ID.
2. For each app, in dependency order, prepare a separate package cache with the symbols of the
   selected Business Central version, or of the app's minimum supported release.
3. Compile with AppSourceCop against the baseline. An app without a baseline is compiled with the
   other analyzers.
4. Keep the compiled app available for the apps that depend on it.
5. Print the verdict for each app, the reasons for failures, and the summary.

Your `AppSourceCop.json` and `app.json` files are restored to their original bytes afterwards.

See [Compatibility](/docs/compatibility/).

## Source analysis

`alwasp analyze` reads `.al` files and Git only. It parses the declared objects and the references
between them, compares changed files object by object, and follows the references from each
changed object to the apps and test codeunits that it reaches. Equal input gives equal output.

See [Source Analysis](/docs/analyze/).

## Translation checks

`alwasp validate translations` reads only XLIFF files. For each project it compares the generated
`.g.xlf` with each language file by unit ID and reports units that are missing, not translated,
or out of date.

See [Translation Coverage](/docs/translations/).

<a id="tool-acquisition"></a>

## Compiler

ALWasp does not contain the AL compiler. It uses the compiler of a Business Central artifact, a
path that you configure, or the AL tools package from NuGet.org. See
[AL compiler selection](/docs/bc-version/#al-compiler-selection).

## Secrets

Feed credentials, tokens, API keys, and Application Insights values are secrets. ALWasp removes
them from logs, error messages, manifests, and structured output. For Application Insights, only
the fact that a value was applied and the property name are recorded.

## Files

See [Files and folders](/docs/reference/#files-and-folders) for all locations that ALWasp writes
to.
