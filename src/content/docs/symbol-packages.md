---
title: Symbol Packages
description: Create symbol-only AL apps, pack NuGet dependencies, and explicitly publish to a feed or folder.
order: 3.5
---

# Symbol Packages

Since 0.5.9, the `symbols` commands produce the packages that [Restore](/docs/restore/)
consumes. They transform compiled apps into symbol-only apps, wrap them in NuGet packages,
and publish them to a feed or local folder. No Business Central container, server, or BC
credentials are required. These commands do not deploy apps into Business Central.

```text
compiled .app -> symbols create -> symbol-only .app -> symbols pack -> .nupkg
                                                                    |
                                                               symbols push
                                                                    |
                                                               NuGet feed
                                                                    |
                                                              alwasp restore
```

`symbols publish` runs create → pack → push. `build` never publishes; keep publication as an
explicit release step with its own write credentials.

## Create a symbol-only app

```bash
alwasp symbols create ./output/MyApp.app
alwasp symbols create ./output/MyApp.app --output ./symbols
```

The default output is `MyApp.symbols.app` beside the input. `--output` accepts a `.app` file
path or a folder receiving `<input name>.symbols.app`. The input cannot be overwritten.
Once ALTool is resolved, an existing output file is deleted before generation so a failed
run cannot report a stale artifact as its result.

ALWasp invokes ALTool's `CreateSymbolPackage`, then verifies that the output preserves the
input's app ID, publisher, name, and version. ALTool resolves through `AL_PATH`, then the
cached/downloaded `Microsoft.Dynamics.BusinessCentral.Development.Tools` package. If the
required operation is unavailable, run `alwasp tools update` or point `AL_PATH` to a newer
ALTool. See [Tool acquisition](/docs/architecture/#tool-acquisition).

## Symbol package validation

`create` checks its output, `pack` checks its input, and `push` checks the app inside the
NuGet package. Every app must have:

- A manifest and usable `SymbolReference.json` agreeing on app ID, publisher, name, and version.
- ALTool confirmation that `IsSymbolOnly` is `True` and `IsRuntimePackage` is `False`.

Missing source files alone do not prove an app is symbol-only. A runtime package is rejected,
and an ALTool lacking the verification operations fails rather than using a weaker check.
Consequently, even jobs that only pack or push need access to a compatible ALTool.

## Pack a NuGet package

```bash
alwasp symbols pack ./symbols/MyApp.symbols.app --output ./packages
```

Package metadata comes from the symbol app's manifest:

| Field | Value |
|---|---|
| Package ID | `{Publisher}.{Name}.symbols.{AppId}`; publisher and name keep only `[A-Za-z0-9_]`, and the GUID is lowercase |
| Version | The app version in normalized NuGet form; `2.1.0.5` remains unchanged, while `3.0.0.0` becomes `3.0.0` |
| Dependencies | Explicit AL dependencies, each with its package ID and minimum version range `[minVersion, )`, sorted by ID |
| Content | One symbol app at the package root as `{Publisher}_{Name}_{Version}.app` |
| Output | `{ID}.{version}.nupkg` in `--output`, or beside the input when omitted |

Malformed app versions, prerelease versions, and empty or malformed dependency versions fail
packing. `application` and `platform` are not added as package dependencies: consumers restore
their own implicit Microsoft requirements, including their localization choices.

For a dependency published under a non-standard package ID, supply its exact ID:

```bash
alwasp symbols pack ./symbols/MyApp.symbols.app --output ./packages \
  --dependency-package-id 11111111-2222-3333-4444-555555555555=Contoso.Base-Core.symbols
```

The option is repeatable and preserves the mapped ID without normalization. Invalid GUIDs,
invalid package IDs, or mappings for apps not in the dependency list fail. The package is read
back and verified before success is reported. Identity, layout, and dependency ordering are
deterministic, but archive bytes are not guaranteed to be byte-for-byte reproducible.

## Push to a feed or folder

```bash
alwasp symbols push ./packages/Contoso.MyApp.symbols.11111111-2222-3333-4444-555555555555.1.0.0.nupkg \
  --source ./local-feed --skip-duplicate
```

`--source` is required and accepts a NuGet v3 index URL, a `nuget.config` source name, or a
local folder, which is created if missing. Before sending anything, ALWasp requires exactly
one valid symbol-only `.app` and a package version matching the app version. Non-standard
package IDs are preserved, allowing existing symbol packages to move between feeds. If an ID
ends in an app GUID, that GUID must match the contained app. Ordinary NuGet packages are refused.

- `--api-key` falls back to `ALWASP_NUGET_API_KEY`, then `nuget.config` API keys.
- `--skip-duplicate` treats an existing package version (HTTP 409) as success.
- `--nuget-config`, `--auth-mode`, `--feed-token-env`, and `--pat` use the restore credential
  options, applied only to the push source. `ALWASP_PAT` remains the PAT fallback.
- An HTTP source requires `allowInsecureConnections="true"` on its `nuget.config` entry.

See [Authentication](/docs/authentication/#symbol-package-publication) for write credentials
and CI behavior. Publication can require authentication even when consumers read anonymously.

## Publish in one command

```bash
alwasp symbols publish ./output/MyApp.app --output ./symbols --source ./local-feed \
  --skip-duplicate --format json --result-file ./symbol-publish.json
```

`--output` is always a folder for both the symbol app and NuGet package, defaulting to the
input's folder. Dependency ID mappings and push/authentication options work as above.

Publication stops at the first failing stage and exits `1`, recording `failedStage` as
`create`, `pack`, or `push`. Successful structured results include `appPath`, `symbolAppPath`,
`packagePath`, `packageId`, `packageVersion`, `dependencies`, and `source`. NDJSON emits a
`symbols.stage` event as each stage starts. Normal success exits `0`.

## Consume the packages

```bash
alwasp restore --feed ./local-feed
```

Add the source with `--feed` or `nuget.config`. The generated IDs follow the existing restore
convention, and package dependencies are followed transitively. Existing restore and NuGet
version-source behavior is unchanged. The AL Language extension can also use the feed through
`al.nugetFeeds`; ALWasp recognizes that VS Code setting but does not apply it automatically.

For separating package preparation from a protected publication job, see
[CI/CD](/docs/ci-cd/#symbol-package-publication).