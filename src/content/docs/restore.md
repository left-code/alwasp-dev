---
title: Restore
description: Symbol restore behavior, dependency traversal, NuGet feed order, locked/latest resolution, and incremental manifests.
order: 3
---

# Restore

ALWasp restores AL symbol packages from NuGet feeds for a single project, a `.code-workspace`, or the selected projects in a config-driven build.

```bash
alwasp restore
alwasp restore path/to/app.json
alwasp workspace restore ./project.code-workspace
```

For localized Microsoft symbols, set `restore.country` in `alwasp.json`:

```json
{
  "restore": {
    "country": "DE"
  }
}
```

The configured localization is preferred for Microsoft symbols, including explicit test-library dependencies, with the unlocalized package as fallback. Omitting `country` or setting it to `W1` prefers unlocalized/W1 packages and never substitutes a different country.

## Dependency discovery

Explicit dependencies come from each project's `app.json` `dependencies` array.

ALWasp also injects implicit Microsoft dependencies:

| Dependency | Notes |
|---|---|
| System Application | Always added |
| Base Application | Always added |
| System | Uses `Microsoft.Platform.symbols` |
| Business Foundation | Added for Business Central 26+ |

For workspace restore, implicit dependencies are emitted once using the highest workspace app/platform version.

## Package ID generation

When a dependency has no package ID, ALWasp generates:

```text
{Publisher}.{Name}.symbols.{AppGuid}
```

It also tries canonical package ID variants, including inserted `.symbols.`, Microsoft application canonicalization, `Microsoft.Platform.symbols`, and a fallback GUID search across feeds.

## Resolution modes

| Mode | CLI | Behavior |
|---|---|---|
| Locked | default | Stable major-aware graph selection |
| LatestAll | `--latest` | Floating latest available graph |

Locked mode prefers versions matching the project/workspace target major, then dependency-declared major, then any available version.

If a feed is behind the requested Microsoft symbols version, ALWasp does not replace a newer compatible Microsoft `.app` already present in the package cache with the older fallback. This is especially important for preview versions and compatibility validation caches seeded from downloaded Business Central artifacts.

## Feed order

Repositories are searched in this order:

1. CLI `--feed` entries
2. Built-in public Business Central symbol feeds
3. Enabled feeds from `nuget.config` or default NuGet settings

Duplicate feed URLs are removed by normalized URL key.

## Incremental restore manifest

ALWasp writes:

```text
<packagesFolder>/.alwasp-packages
```

The manifest stores one `packageId@version` per line. Exact matches are skipped on later runs, while newer versions remain eligible.

## Examples

```bash
alwasp restore --latest
alwasp restore --output ./symbols
alwasp restore --feed https://pkgs.dev.azure.com/org/_packaging/feed/nuget/v3/index.json
alwasp workspace restore --packages ./shared/.alpackages
```

The same feed, auth, and country settings can be supplied through `alwasp.json` for config-driven builds, where restore runs before compilation unless disabled with `restore.enabled: false`.
