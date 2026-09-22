---
title: Installation
description: Install, upgrade, and remove the single ALWasp .NET tool package.
order: 1.5
---

# Installation

ALWasp is one .NET tool package, `left-code.AlWasp`, exposing the command `alwasp`. It includes
restore, build, static AL source analysis, XLIFF translation coverage validation, and structured
JSON/NDJSON output. None of its commands requires a license.

The documented package version is `0.4.0`, published to NuGet.org. Version 0.4.0 targets
`net10.0`; install the .NET 10 SDK or runtime before installing or upgrading ALWasp.

## Global install

```bash
dotnet tool install --global left-code.AlWasp --version 0.4.0
alwasp --version
```

Upgrade or uninstall the global tool with the same package ID:

```bash
dotnet tool update --global left-code.AlWasp --version 0.4.0
dotnet tool uninstall --global left-code.AlWasp
```

## Explicit tool path

For CI and clean-machine validation, an explicit tool path keeps the installation isolated.

### Windows PowerShell

```powershell
$Version = "0.4.0"
$Tool = Join-Path $HOME ".alwasp-tools\alwasp"

dotnet tool install left-code.AlWasp --version $Version --tool-path $Tool
& (Join-Path $Tool "alwasp.exe") --version

dotnet tool update left-code.AlWasp --version $Version --tool-path $Tool
dotnet tool uninstall left-code.AlWasp --tool-path $Tool
```

### Linux

```bash
VERSION="0.4.0"
TOOL="$HOME/.alwasp-tools/alwasp"

dotnet tool install left-code.AlWasp --version "$VERSION" --tool-path "$TOOL"
"$TOOL/alwasp" --version

dotnet tool update left-code.AlWasp --version "$VERSION" --tool-path "$TOOL"
dotnet tool uninstall left-code.AlWasp --tool-path "$TOOL"
```

If you previously used `left-code.AlWasp.Pro`, uninstall that package and install
`left-code.AlWasp`. The former Pro-only commands are now included unconditionally.
