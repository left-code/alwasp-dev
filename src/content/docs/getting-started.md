---
title: Getting Started
description: Install ALWasp, initialize an alwasp.json file, validate it, restore symbols, and run your first build.
order: 1
---

# Getting Started

ALWasp is a .NET 8 CLI for Microsoft Dynamics 365 Business Central AL projects. It restores symbol packages from NuGet feeds and compiles single-project, workspace, and config-driven AL repositories.

## Install

```bash
dotnet tool install --global left-code.AlWasp
alwasp --help
```

## Recommended multi-project flow

```bash
alwasp init
alwasp config validate
alwasp restore
alwasp build
alwasp build ci
```

`alwasp init` scans direct child folders for `app.json` files and writes an `alwasp.json` starter config. It places every discovered project in `apps` by default, so move test projects to `tests` before building.

Use `--include-tests-by-name` only when your test project folders consistently end in `Test` or `Tests`.

```bash
alwasp init --include-tests-by-name
```

## Command model

```text
alwasp
├── restore [appJsonPath]
├── build [targetOrPath]
├── init
├── config
│   └── validate
├── version
│   └── apply [targetOrProfile]
├── compare <baseline.app> <current.app>
├── validate
│   └── compatibility [targetOrProfile]
├── tools
│   └── update [--clean] [--check]
├── app
│   └── set-package-id <appPath>
└── workspace
    ├── restore [workspacePath]
    └── build [workspacePath]
```

For repositories with `alwasp.json`, `alwasp build` runs config-driven targets and profiles. Without `alwasp.json`, it falls back to single-project `alc` compilation from `app.json`.

`alwasp tools update` manages the cached AL compiler tools that `build` uses automatically. `alwasp app set-package-id` is a low-level utility for assigning a fresh deployment package ID to an already compiled `.app` file before re-uploading it to a Business Central sandbox.

Use `alwasp compare` for a fast compiled-package public-symbol report. Use `alwasp validate compatibility` when current source must be recompiled against an older package with AppSourceCop. See [Compatibility](/docs/compatibility/) for direct, multi-app, and config-driven workflows.

## What ALWasp does not do

ALWasp focuses on restore and compilation. Publishing to Business Central, deploying environments, executing AL test suites, and writing git commits or tags belong in BC-DevX or your surrounding pipeline.
