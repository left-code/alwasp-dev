---
title: Getting Started
description: Install ALWasp, create alwasp.json, restore symbols, and make your first build in about five minutes.
group: Start
order: 1
---

# Getting Started

ALWasp is a command-line tool for Microsoft Dynamics 365 Business Central AL projects. It restores
symbol packages from NuGet feeds, compiles one project or a full repository, and verifies the
result before a release. It needs no container, no Business Central server, and no Business
Central credentials.

## Before you start

- The .NET 10 SDK or runtime.
- A folder with one or more AL projects (each project has an `app.json`).
- Access to NuGet.org. ALWasp downloads the AL compiler automatically.

## 1. Install

```bash
dotnet tool install --global left-code.AlWasp
alwasp --version
```

ALWasp is free to use under its [license agreement](/docs/license/). No license key is necessary.
See [Installation](/docs/install/) for a pinned version, an isolated tool path, and updates.

## 2. Select your route

| Your repository | Use | Needs `alwasp.json` |
|---|---|---|
| Many apps and test apps, built in CI | Config-driven build (recommended) | Yes |
| A folder of apps, no configuration wanted | `alwasp build --project-root <dir>` | No |
| One app | `alwasp build` in the app folder | No |
| A VS Code `.code-workspace` file | `alwasp workspace build <file>` | No |

## 3. Make the first build

### Config-driven repository

Run these commands in the folder that contains your app folders:

```bash
alwasp config init        # find the projects and write alwasp.json
alwasp config validate    # report all configuration errors
alwasp build              # restore symbols and build the default target
alwasp build ci           # build the target with the name "ci"
```

`config init` reads the AL source of each direct child folder to classify it. A project with a
test codeunit is a test app; folder names and app names are not used. Test apps are not written to
the file unless you pass `--include-tests`. Projects that ALWasp cannot classify go into `apps`
with a warning. Examine the generated file before you use it for a release.

```bash
alwasp config init --include-tests
```

Continue with [Configuration](/docs/configuration/) to define profiles and targets.

### Without configuration

```bash
alwasp build                                   # the app.json in the current folder
alwasp build --project-root ./src              # all apps below ./src, in dependency order
alwasp build --project-root ./src --app Core   # one app and the local apps it needs
```

The build restores symbols first. You do not have to run `alwasp restore` separately.

## 4. Verify before a release

```bash
alwasp check ci
```

[`check`](/docs/check/) runs the configured gates on one project selection: configuration,
restore, build, compiler diagnostics, compatibility, and translation coverage.

## What to read next

| Task | Page |
|---|---|
| Understand where symbols come from | [Restore](/docs/restore/) |
| Build modes, output folders, manifests | [Build](/docs/build/) |
| Build against a specified Business Central version | [Business Central versions](/docs/bc-version/) |
| Validate for AppSource | [Compatibility](/docs/compatibility/) |
| Use a private NuGet feed | [Authentication](/docs/authentication/) |
| Run in GitHub Actions or Azure Pipelines | [CI/CD](/docs/ci-cd/) |
| Find a command or an option | [CLI Reference](/docs/cli-reference/) |
| Solve a problem | [Troubleshooting](/docs/troubleshooting/) |

## What ALWasp does not do

ALWasp stops when a `.app` file is on disk or, when you ask for it, when a package is on a NuGet
feed. These tasks stay with your deployment tooling, for example
[BC-DevX](https://github.com/left-code/BC-DevX):

- Publishing or installing apps in a Business Central environment.
- Creating containers or sandboxes.
- Running AL tests. Test apps are compiled, not run.
- Git commits, tags, and pushes. ALWasp only reads Git history.
