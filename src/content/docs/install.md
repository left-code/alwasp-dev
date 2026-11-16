---
title: Installation
description: Install, update, pin, and remove the ALWasp .NET tool.
group: Start
order: 2
---

# Installation

ALWasp is one .NET tool package, `left-code.AlWasp`, published on NuGet.org. The command is
`alwasp`. The package contains all commands. ALWasp is free to use under its
[license agreement](/docs/license/); no license key is necessary.

**Requirement:** the .NET 10 SDK or runtime.

## Install the newest version

```bash
dotnet tool install --global left-code.AlWasp
alwasp --version
```

## Update or remove

```bash
dotnet tool update --global left-code.AlWasp
dotnet tool uninstall --global left-code.AlWasp
```

After an update, read the [Release Notes](/docs/release-notes/). Entries marked **Migration** or
**Behavior change** can require a change in your scripts.

## Install a specified version

Pin the version in CI so that all runs use the same tool:

```bash
dotnet tool install --global left-code.AlWasp --version <version>
dotnet tool update --global left-code.AlWasp --version <version>
```

The version that this documentation describes is shown in the page footer.

## Isolated tool path

An explicit tool path keeps the installation separate from the global tools. This is useful on
shared build agents and for a test on a clean machine.

### Windows PowerShell

```powershell
$Tool = Join-Path $HOME ".alwasp-tools\alwasp"

dotnet tool install left-code.AlWasp --tool-path $Tool
& (Join-Path $Tool "alwasp.exe") --version

dotnet tool update left-code.AlWasp --tool-path $Tool
dotnet tool uninstall left-code.AlWasp --tool-path $Tool
```

### Linux and macOS

```bash
TOOL="$HOME/.alwasp-tools/alwasp"

dotnet tool install left-code.AlWasp --tool-path "$TOOL"
"$TOOL/alwasp" --version

dotnet tool update left-code.AlWasp --tool-path "$TOOL"
dotnet tool uninstall left-code.AlWasp --tool-path "$TOOL"
```

## What the installation does not include

The AL compiler is not in the package. ALWasp downloads it from NuGet.org on the first build and
keeps it in `~/.alwasp/tools`. See [AL compiler selection](/docs/bc-version/#al-compiler-selection)
and [Files and folders](/docs/reference/#files-and-folders).

## The former Pro package

If `left-code.AlWasp.Pro` is installed, uninstall it and install `left-code.AlWasp`. All commands
of the former Pro package are in `left-code.AlWasp`.
