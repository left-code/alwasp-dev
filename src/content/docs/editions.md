---
title: Editions & Licensing
description: What Free and Pro each include, installing both side by side, and configuring a Pro license.
order: 1.5
---

# Editions & Licensing

ALWasp ships as two separate .NET tool packages that both expose the `alwasp` command:

| Edition | Package ID | Source |
|---|---|---|
| Free | `left-code.AlWasp` | NuGet.org |
| Pro | `left-code.AlWasp.Pro` | A customer-specific authenticated Azure Artifacts feed |

Pro includes every Free command with identical behavior, plus the capabilities below. Do not
install both editions globally or into the same `--tool-path`; use separate explicit tool paths
when a machine needs both.

## What's in each edition

| Capability | Free | Pro |
|---|:---:|:---:|
| `restore`, `build`, `init`, `config validate`, `version apply`, `tools update`, `app set-package-id`, `workspace restore`/`build` | ✓ | ✓ |
| `compare` (informational package change log) and its `--json` output | ✓ | ✓ |
| `validate compatibility` (AppSourceCop baseline validation) | ✓ | ✓ |
| `alwasp analyze` — static source analysis, dependency/object graphs, impacted tests | | ✓ |
| `alwasp validate translations` — XLIFF translation coverage gate | | ✓ |
| Universal `--format json\|ndjson` and `--result-file` on every command | | ✓ |

Command-specific JSON output that predates the edition split — `compare --json` and config-driven
build manifests — stays in both editions. It's the universal `--format`/`--result-file` machinery
introduced afterward that's Pro-only. See [Source Analysis](/docs/analyze/) and
[Translation Coverage](/docs/translations/) for what each Pro command does.

## Installing Free

```bash
dotnet tool install --global left-code.AlWasp
alwasp --version
```

```bash
dotnet tool update --global left-code.AlWasp
dotnet tool uninstall --global left-code.AlWasp
```

For CI or side-by-side use, install to an explicit path instead:

```bash
dotnet tool install left-code.AlWasp --tool-path ~/.alwasp-tools/free
~/.alwasp-tools/free/alwasp --version
```

## Installing Pro

Pro package access and a Pro license are separate controls: a feed credential lets the machine
download `left-code.AlWasp.Pro`, but it does not by itself authorize paid commands.

Add the Pro feed with your customer-specific, read-only Azure Artifacts PAT, then install to an
explicit tool path:

```bash
dotnet nuget add source https://pkgs.dev.azure.com/left-code/_packaging/AlWasp.Pro/nuget/v3/index.json \
  --name AlWaspPro \
  --username alwasp-feed-reader \
  --password "$ALWASP_PRO_FEED_PAT" \
  --store-password-in-clear-text \
  --configfile ~/.alwasp/pro-nuget/NuGet.Config

dotnet tool install left-code.AlWasp.Pro \
  --tool-path ~/.alwasp-tools/pro \
  --configfile ~/.alwasp/pro-nuget/NuGet.Config

~/.alwasp-tools/pro/alwasp --version
```

Do not put the PAT in source, a checked-in `NuGet.Config`, shell history, or CI logs — read it
from a secret manager into an environment variable, as above. Restrict the generated
`NuGet.Config` to the current user and delete it when the feed credential is no longer needed;
rotate the PAT independently of any ALWasp license.

Upgrade and remove the same way:

```bash
dotnet tool update left-code.AlWasp.Pro --tool-path ~/.alwasp-tools/pro --configfile ~/.alwasp/pro-nuget/NuGet.Config
dotnet tool uninstall left-code.AlWasp.Pro --tool-path ~/.alwasp-tools/pro
```

### Side by side

Both packages expose `alwasp`. Invoke each through its own tool path (or your own distinct
wrapper names) rather than adding both directories to `PATH` — path order is not a reliable way
to pick an edition, and it can change silently when shell configuration changes.

## Configuring a Pro license

A Pro paid command discovers a license from the first source present, in this fixed order:

1. `--license-path <file>`
2. `ALWASP_LICENSE` — the full license envelope, inline
3. `ALWASP_LICENSE_PATH` — a file path
4. workspace file `.alwasp/license.json`
5. user file — `%APPDATA%\alwasp\license.json` (Windows) or `~/.config/alwasp/license.json` (Linux)
6. machine file — `%ProgramData%\alwasp\license.json` (Windows) or `/etc/alwasp/license.json` (Linux)

```bash
export ALWASP_LICENSE_PATH="/run/secrets/alwasp/license.json"
alwasp analyze
```

For CI, prefer a secret-mounted file and `ALWASP_LICENSE_PATH`. Never print the license, commit
it, or upload it as a build artifact.

A paid command with no usable license fails closed with the reserved exit code `3` before any
handler side effects run — it never falls back to a degraded or Free-equivalent result.

| Exit code | Meaning |
|---|---|
| `3` | Pro command requires a license and none was found or verified |

License verification is fully offline: the license file is a signed envelope checked locally
against ALWasp's embedded public key, with no network call and no phone-home.
