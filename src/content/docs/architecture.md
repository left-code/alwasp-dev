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
├── InternalDependencyVersionPlanner
├── ApplicationInsightsResolver
├── ChangeDetectionResolver / GitChangeDetector
├── ConfigBuildManifestWriter
├── AlcToolsProvider
├── Compatibility/AppPackageReader / CompatibilityComparer
├── Compatibility/AppSourceCopConfiguration
├── Compatibility/CompatibilityWorkspaceDiscovery
├── AppPackageIdRewriter
├── AnalysisEngine (Pro)
├── TranslationCoverageValidator (Pro)
└── ProCommandGuard / LicenseVerifier (Pro)
```

## Editions and product composition

Starting with `0.2.0`, the codebase is split so the shipped Free and Pro packages are two
distinct, separately composed hosts rather than one binary with feature flags:

| Assembly | Role |
|---|---|
| `AlWasp.Core` | CLI-independent implementation shared by every edition — restore, build, versioning, compatibility |
| `AlWasp.Cli` | Command composition contracts shared by both hosts |
| `AlWasp.Analysis` | `alwasp analyze` — Pro only |
| `AlWasp.Translations` | `alwasp validate translations` — Pro only |
| `AlWasp.Automation` | Universal `--format json/ndjson` and `--result-file` — Pro only |
| `AlWasp.Licensing` | License envelope parsing, ECDSA verification, discovery — referenced only by `AlWasp.Pro` |
| `AlWasp.Free` | The packable Free host (`left-code.AlWasp`); registers no Analysis, Translations, or Automation module |
| `AlWasp.Pro` | The packable Pro host (`left-code.AlWasp.Pro`); Free's command surface plus the Pro-classified modules |

`AlWasp.Pro`'s Free-surface prefix is required to be the exact same ordered sequence of
`AlWasp.Cli` module types Free registers, so a Free command behaves identically whichever
package runs it. See [Editions & Licensing](/docs/editions/) for the resulting command boundary.

## Licensing

`AlWasp.Licensing` verifies a signed license envelope entirely offline — no network call, no
phone-home. Verification: parse a bounded envelope/payload (duplicate-key rejection, size cap),
resolve the envelope's `keyId`/algorithm against a small embedded key ring, verify an ECDSA
P-256/SHA-256 signature over the byte-exact canonical payload encoding via the .NET BCL, then
check product/edition/validity against an injectable UTC clock. The result is always one of a
fixed set of `LicenseStatus` values, and diagnostics never carry the organization name, license
ID, or raw envelope/payload/signature bytes.

`ProCommandGuard` combines discovery (the fixed six-source precedence — see
[Editions & Licensing](/docs/editions/)) and verification behind one call that a Pro command
handler gates its side effects on. A missing or failing license produces the reserved exit code
`3` before any handler side effect runs.

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
6. Plan project versions, internal dependency versions, Application Insights, resource exposure, and preprocessor symbol changes
7. Run restore for selected projects
8. Temporarily patch required `app.json` files
9. Compile grouped temporary workspaces
10. Restore original `app.json` files
11. Write manifest and print summary

## Version apply pipeline

`alwasp version apply` shares the same selection, validation, change detection, project-version, and internal-dependency planning code as config-driven build. It permanently writes the calculated top-level `version` and eligible internal `dependencies[].version` values to `app.json`; it does not restore, compile, or touch git.

`InternalDependencyVersionPlanner` matches selected projects by app GUID and controls propagation through `dependencyUpdateScope`. External dependencies are excluded. The transformer performs targeted text replacements so version application preserves unrelated JSON text exactly.

Release-period planning switches on the Friday closest to the 15th of each month. Before the switch, `Release` targets the previous month and `Preview` the current month; from the switch onward, they target the current and next month respectively. `Hotfix` is no longer a supported release type.

## Compatibility pipelines

`alwasp compare` reads the NAVX ZIP payload, normalizes public symbols from `SymbolReference.json`, compares baseline/current models, and writes a console or JSON report. It never invokes the compiler.

`alwasp validate compatibility` prepares an isolated current package cache and a historical AppSourceCop baseline cache, temporarily overlays `AppSourceCop.json`, and invokes `alc`. Multi-app directory mode discovers projects and packages by app ID, calculates the required local dependency closure, and validates in topological order.

## Source analysis pipeline (Pro)

`AnalysisEngine` reads `.al` source through a tokenizer and git alone — it never invokes a
compiler or restores symbols. For each selected project it parses every file at the head
revision (and, when change detection is active, the base revision too) into declared objects,
then extracts references only from forms that can only mean a reference — a declared type, an
object-id expression, an `[EventSubscriber]` binding, or a property whose value names an object.
Changed files are compared object by object rather than whole-file, so identity (kind + name,
case-insensitive) rather than declared object number drives what counts as `Added`, `Removed`,
`Modified`, or merely `Moved`. Impact then propagates forward along the resulting object graph —
from a changed object to everything that references it — to produce the affected-apps,
impacted-tests, and public-API sections. See [Source Analysis](/docs/analyze/) for the full
section list, object identity rules, and the versioned report contract.

## Translation validation pipeline (Pro)

`TranslationCoverageValidator` reads only XLIFF files — no compiler, symbol restore, or Business
Central environment. For each selected project it parses the generated `Translations/<App>.g.xlf`
into a baseline of translatable units (excluding `translate="no"` and source-less units), then
compares every configured language file against that baseline by unit id, checking presence,
non-empty state, and (with `<source>` compared exactly apart from line endings) whether the
translation has gone stale since the caption was last reworded. See
[Translation Coverage](/docs/translations/) for finding types and configuration.

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
