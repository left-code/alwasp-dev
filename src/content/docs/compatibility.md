---
title: Compatibility
description: Compare compiled AL packages or validate current source against previous packages with AppSourceCop.
order: 5
---

# Compatibility

ALWasp provides two separate compatibility workflows. Neither one is part of a normal `build` command.

| Command | Inputs | Compiler required | Purpose |
|---|---|---:|---|
| `alwasp compare` | Previous `.app` + current `.app` | No | Structural public-symbol comparison |
| `alwasp validate compatibility` | Previous `.app` + current AL source | Yes | Microsoft's AppSourceCop baseline validation |

These checks do not prove that an extension upgrade is runtime-safe. Publish/sync/upgrade testing, data migration, upgrade code, permissions, and changed business behavior still require an appropriate Business Central environment and test suite.

## Compare compiled packages

```bash
alwasp compare previous/MyApp.app output/MyApp.app
alwasp compare previous/MyApp.app output/MyApp.app --json output/compare.json
```

The console output is titled **ALWasp compare report** and groups public-symbol changes into breaking, review-required, and non-breaking sections. The reader uses each package's manifest and `SymbolReference.json`; it does not require AL compiler tools, a container, or a sandbox.

The default failure threshold is `breaking`:

| Option | Exit code `2` when |
|---|---|
| `--fail-on breaking` | At least one breaking change exists |
| `--fail-on potentially-breaking` | A breaking or review-required change exists |
| `--fail-on none` | Never; report-only mode |

Package/read/argument failures return exit code `1`. A ruleset does not apply to `compare`; use `--fail-on` because comparison findings are ALWasp classifications, not compiler diagnostics.

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

## Validate a dynamic multi-app repository

```powershell
alwasp validate compatibility `
  --project-root .\src `
  --baseline-directory .\latest `
  --ruleset .\dyce.ruleset.json
```

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

Compatibility validation always enables AppSourceCop for this command. It remains separate from `alwasp build`, so running both stages intentionally compiles the source twice.

## Microsoft symbol cache safety

When a symbols feed lags behind a preview or artifact-provided Business Central version, ALWasp may resolve an older fallback package from the feed. A newer compatible Microsoft `.app` already staged in the package cache is retained; the older feed fallback cannot downgrade it. Equal or genuinely newer resolved packages can still replace cached entries when canonical/localized package selection requires it.

If a direct dependency allows an older package but a transitive dependency requires a newer one,
ALWasp resolves the package again at the stricter minimum. Repeated AppIds are skipped only when
the version already restored satisfies the later requirement.
