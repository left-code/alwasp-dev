---
title: Compatibility
description: Compare compiled AL packages or validate current source against previous packages with AppSourceCop.
order: 5
---

# Compatibility

ALWasp provides two separate compatibility workflows. Neither one is part of a normal `build` command.

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

Use `--bc-target current|next-minor|next-major` to choose the Business Central release used for
validation, `--bc-version` to pin a concrete release, and `--bc-country` to select localized
artifacts (default `W1`). ALWasp downloads and caches the matching platform, application symbols,
and compiler. The same artifact workflow is available separately through `alwasp artifacts download`.

## Validate a dynamic multi-app repository

```powershell
alwasp validate compatibility `
  --project-root .\src `
  --baseline-directory .\latest `
  --ruleset .\dyce.ruleset.json
```

To validate only apps changed since a Git reference, add `--changed-since`. Downstream apps that
depend on a changed app are validated too. An unchanged local app needed only to compile a selected
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
- reports unmatched projects as new and skips them unless a matched app depends on them;
- compiles required new local dependency apps first without AppSourceCop;
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

The final summary separates validation results, prepared local dependencies, skipped new apps, failures, and total processing time.

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
removed after the run. Apps without a published stable baseline are reported and skipped; no
matches or a feed/download error fails the command. Baseline versions are independent of the
current app version and `--bc-target`.

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

Compatibility validation always enables AppSourceCop for this command. By default it remains separate from `alwasp build`, so running both stages intentionally compiles the source twice — unless the profile opts into build-integrated validation, below.

`validate compatibility` temporarily applies the effective build-time `applicationInsights`
setting to each selected project's `app.json` before compiling, and restores the original file
afterward. This matches the `app.json` state the following `build` will produce, so AppSourceCop
does not raise a false `AS0092` warning about a connection string or instrumentation key that is
intentionally injected by the build.

## Profile-bound baseline validation

A profile can fold compatibility validation directly into its normal `alwasp build`, so the build
output *is* the compatibility-validated artifact instead of a separate, duplicate compile:

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
successful package is collected through the profile's ordinary `outFolder`/`outputSuffix` flow —
eliminating the `validate compatibility` followed by `build` loop. Selected apps without a
baseline are compiled normally, not skipped. Compatibility is scoped to the profile: other
profiles keep their configured `appSourceCop` setting and are never implicitly baseline-checked.
Historical dependencies use an isolated temporary cache, and a user-owned `AppSourceCop.json` is
restored byte-for-byte after every compile group.

Use the standalone `alwasp validate compatibility [targetOrProfile]` command instead when
compatibility must be checked independently of — or more often than — the build itself.

## Microsoft symbol cache safety

When a symbols feed lags behind a preview or artifact-provided Business Central version, ALWasp may resolve an older fallback package from the feed. A newer compatible Microsoft `.app` already staged in the package cache is retained; the older feed fallback cannot downgrade it. Equal or genuinely newer resolved packages can still replace cached entries when canonical/localized package selection requires it.

If a direct dependency allows an older package but a transitive dependency requires a newer one,
ALWasp resolves the package again at the stricter minimum. Repeated AppIds are skipped only when
the version already restored satisfies the later requirement.
