---
title: Authentication
description: Configure public and private NuGet feeds with PATs, feed-token environment mappings, nuget.config, and credential providers.
order: 6
---

# Authentication

ALWasp supports public Business Central feeds and private NuGet feeds, including Azure Artifacts.

## Public feeds

Built-in Business Central symbol feeds are always added as anonymous sources. PAT injection is not applied to these built-in feeds.

## Private feeds

Add private feeds with `--feed`:

```bash
alwasp restore --feed https://pkgs.dev.azure.com/org/_packaging/feed/nuget/v3/index.json
```

Credentials can come from:

- `--feed-token-env`
- `--pat` or `ALWASP_PAT`
- `nuget.config`
- NuGet credential providers

## PAT

```bash
alwasp restore --feed <feed-url> --pat "$MY_PAT"
```

Or use the environment fallback:

```bash
export ALWASP_PAT="$MY_PAT"
alwasp restore --feed <feed-url>
```

`--pat` takes precedence over `ALWASP_PAT` and is applied only to feeds without existing credentials.

## Feed-token environment mapping

```bash
export MY_FEED_PAT="$TOKEN"
alwasp restore \
  --feed https://pkgs.dev.azure.com/org/_packaging/feed/nuget/v3/index.json \
  --feed-token-env https://pkgs.dev.azure.com/org/_packaging/feed/nuget/v3/index.json=MY_FEED_PAT
```

Mappings must use `feedUrl=ENV_VAR`. URL matching trims trailing slashes. If the mapped environment variable is missing or empty, the command fails.

## Auth modes

| Mode | Behavior |
|---|---|
| `Auto` | Interactive locally, noninteractive in CI |
| `Interactive` | Enables credential-provider browser/device-code flows |
| `NonInteractive` | Sets `NUGET_EXE_NO_PROMPT=true` |

CI is detected from `CI`, `TF_BUILD`, `GITHUB_ACTIONS`, or `BUILD_BUILDID`. Forcing `--auth-mode interactive` in CI fails immediately.

## Credential precedence

For each source:

1. Feed-specific `--feed-token-env`
2. Existing credentials from config/provider state
3. PAT fallback
