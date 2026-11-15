---
title: App Packages
description: Pack a compiled, deployable .app into a NuGet package and push it to a feed for your deployment pipeline.
group: Guides
order: 15
---

# App Packages

`alwasp app pack`, `push`, and `publish` put the **full, deployable `.app`** on a NuGet feed. Use
them when you distribute compiled apps through a feed, for example to a release pipeline or a
deployment tool.

```text
compiled .app  ->  app pack  ->  .nupkg  ->  app push  ->  NuGet feed  ->  your deployment pipeline
```

`app publish` runs pack, then push. These commands do not connect to Business Central. To install
the app in an environment, use your deployment tooling. `alwasp build` never packs or pushes.

## App package or symbol package

| | Symbol package ([`alwasp symbols`](/docs/symbol-packages/)) | App package (`alwasp app`) |
|---|---|---|
| Content | Symbol-only `.app`, no implementation | The compiled `.app`, or a runtime package |
| Package ID | `{Publisher}.{Name}.symbols.{AppId}` | `{Publisher}.{Name}.{AppId}` |
| Purpose | Compile against the app (`alwasp restore`) | Deploy the app |

The IDs are different, so the two packages of one app can be on the same feed. Restore asks for
the `.symbols.` ID and gets the symbol package. Publish the symbol package too when other
repositories compile against the app.

> A full app contains the implementation. It also contains the source code when the app is built
> with source included. Select the feed and its read permissions accordingly.

## Pack

```bash
alwasp app pack ./output/Contoso_MyApp_2.1.0.5.app --output ./packages
```

The package data comes from the app's manifest:

| Field | Value |
|---|---|
| Package ID | `{Publisher}.{Name}.{AppId}`. Publisher and name keep only `[A-Za-z0-9_]`; the app ID is the lowercase GUID |
| Version | The app version in NuGet form: `2.1.0.5` stays, `3.0.0.0` becomes `3.0.0` |
| Dependencies | One for each AL dependency, as `{package ID} [minVersion, )`, sorted by ID |
| Content | The app at the package root as `{Publisher}_{Name}_{Version}.app` |
| File | `{ID}.{version}.nupkg` in `--output`, or adjacent to the app |

Dependency package IDs:

- A dependency gets the app package ID of that app.
- A dependency with the publisher `Microsoft` gets its **symbol** package ID, because Microsoft
  publishes its apps on NuGet only as symbol packages.
- `--dependency-package-id <appId>=<packageId>` (repeatable) gives a different ID. The ID is used
  as you write it. A mapping for an app that is not a dependency, an invalid GUID, or an invalid
  package ID fails.
- `application` and `platform` are not package dependencies.

## The app check

`pack` checks its input, and `push` checks the `.app` in the package:

- The manifest must declare the app identity.
- A runtime package is accepted. The result reports `runtimePackage: true`.
- A symbol-only app is refused. Use `alwasp symbols pack` for it. In the same way,
  `alwasp symbols` refuses a full app.

ALTool makes this check, so jobs that only pack or push also need the AL tools. If your ALTool
does not have the necessary commands, run `alwasp tools update`.

## Push

```bash
alwasp app push ./packages/Contoso.MyApp.11111111-2222-3333-4444-555555555555.2.1.0.5.nupkg \
  --source https://pkgs.dev.azure.com/contoso/_packaging/al-apps/nuget/v3/index.json \
  --api-key az --skip-duplicate
```

Before the push, the package must contain exactly one `.app` that passes the app check and has the
package version. A package ID that ends in an app ID must end in the ID of this app. An ordinary
NuGet package and a symbol package are refused.

`--source` is necessary: a NuGet v3 index URL, a `nuget.config` source name, or a local folder.
The other options (`--api-key`, `--skip-duplicate`, `--nuget-config`, `--auth-mode`,
`--feed-token-env`, `--pat`) and the credentials are the same as for `symbols push`. See
[Authentication](/docs/authentication/#package-publication).

## Publish in one command

```bash
alwasp app publish ./output/Contoso_MyApp_2.1.0.5.app \
  --source https://pkgs.dev.azure.com/contoso/_packaging/al-apps/nuget/v3/index.json \
  --api-key az --output ./packages
```

`--output` is the folder for the package; the default is the folder of the app. The command stops
at the first stage that fails and exits `1`.

| Result data | Contents |
|---|---|
| `failedStage` | `pack` or `push`, after a failure |
| On success | `appPath`, `packagePath`, `packageId`, `packageVersion`, `appId`, `publisher`, `name`, `version`, `runtimePackage`, `dependencies`, `source` |
| NDJSON | An `app.stage` event when each stage starts |
