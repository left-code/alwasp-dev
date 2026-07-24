---
title: Architecture
description: High-level architecture for restore, build, configuration, versioning, change detection, and compiler tool acquisition.
order: 8
---

# Architecture

ALWasp is a CLI orchestration layer over dependency discovery, NuGet feed resolution, incremental restore, compiler tool acquisition, and build runners.

```text
Program.cs
├── RestoreOrchestrator
├── AlcRunner
├── WorkspaceRunner
├── ConfigBuildProjectPlanner
├── AppJsonTransformer
├── AppVersionResolver / AppVersionCalculator
├── ApplicationInsightsResolver
├── ChangeDetectionResolver / GitChangeDetector
├── ConfigBuildManifestWriter
├── AlcToolsProvider
├── Compatibility/AppPackageReader / CompatibilityComparer
├── Compatibility/AppSourceCopConfiguration
├── Compatibility/CompatibilityWorkspaceDiscovery
└── AppPackageIdRewriter
```

## Restore pipeline

1. Read `app.json`
2. Parse target Business Central major
3. Build dependency queue from explicit and implicit dependencies
4. Create feed repositories
5. Traverse dependencies breadth-first
6. Resolve, download, and extract `.app` files
7. Append restored package entries to `.alwasp-packages`

Workspace restore aggregates dependencies across all workspace projects, emits implicit dependencies once, deduplicates by GUID/package ID, and skips dependencies whose GUID matches a workspace project.

## Config-driven build pipeline

1. Load and validate `alwasp.json`
2. Resolve target/profile names
3. Validate paths and output locations
4. Recover stale `app.json.alwasp.bak` files
5. Resolve change detection through local git
6. Plan versioning, Application Insights, resource exposure, and preprocessor symbol changes
7. Run restore for selected projects
8. Temporarily patch required `app.json` files
9. Compile grouped temporary workspaces
10. Restore original `app.json` files
11. Write manifest and print summary

## Version apply pipeline

`alwasp version apply` shares the same selection, validation, change detection, and version planning code as config-driven build. It differs in one critical way: it permanently writes the calculated `version` to `app.json` and does not restore, compile, or touch git.

## Compatibility pipelines

`alwasp compare` reads the NAVX ZIP payload, normalizes public symbols from `SymbolReference.json`, compares baseline/current models, and writes a console or JSON report. It never invokes the compiler.

`alwasp validate compatibility` prepares an isolated current package cache and a historical AppSourceCop baseline cache, temporarily overlays `AppSourceCop.json`, and invokes `alc`. Multi-app directory mode discovers projects and packages by app ID, calculates the required local dependency closure, and validates in topological order.

## Tool acquisition

`AlcToolsProvider` resolves compiler tools in this order:

1. Environment override: `ALC_PATH` for `alc`, `AL_PATH` for `altool`
2. Cache under `~/.alwasp/tools/<version>/`
3. Download `Microsoft.Dynamics.BusinessCentral.Development.Tools` from NuGet.org

On Unix-like systems, extracted binaries are marked executable.

`alwasp tools update` uses the same provider to check, download, and optionally clean cached compiler versions.

## App package ID rewrite

`alwasp app set-package-id` rewrites only the deployment package ID stored in the NAVX header of a compiled `.app` file. The ZIP payload and the app identity inside `app.json` remain unchanged.

## Secret safety

Application Insights values are treated as secrets. ALWasp records only presence flags and property names in logs and manifests, never the connection string or instrumentation key.
