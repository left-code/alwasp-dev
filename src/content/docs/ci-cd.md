---
title: CI/CD
description: GitHub Actions and Azure Pipelines patterns for private feeds, manifests, diagnostics, and version application.
order: 9
---

# CI/CD

ALWasp is designed to run cleanly in noninteractive CI.

## GitHub Actions

```yaml
name: Build

on:
  push:
    branches: [main]
  pull_request:

jobs:
  build:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-dotnet@v4
        with:
          dotnet-version: 8.0.x

      - name: Install ALWasp
        run: dotnet tool install --global left-code.AlWasp

      - name: Validate config
        run: alwasp config validate

      - name: Check AL tool cache
        run: alwasp tools update --check
        continue-on-error: true

      - name: Build
        env:
          ALWASP_PAT: ${{ secrets.AZURE_ARTIFACTS_PAT }}
        run: alwasp build ci --auth-mode noninteractive --manifest output/build-manifest.json

      - name: Upload manifest
        uses: actions/upload-artifact@v4
        with:
          name: build-manifest
          path: output/build-manifest.json
```

## Azure Pipelines

```yaml
steps:
  - task: UseDotNet@2
    inputs:
      version: 8.x

  - task: NuGetAuthenticate@1

  - script: dotnet tool install --global left-code.AlWasp
    displayName: Install ALWasp

  - script: alwasp config validate
    displayName: Validate alwasp.json

  - script: alwasp tools update --check
    displayName: Check AL tool cache
    continueOnError: true

  - script: |
      alwasp build ci \
        --auth-mode noninteractive \
        --pat $(System.AccessToken) \
        --manifest output/build-manifest.json
    displayName: Build AL apps
```

## Change detection

Use local git refs to restrict versioning:

```bash
alwasp build ci --changed-since latest
alwasp build ci --changed-since latest:v*
alwasp build ci --changed-since "latest-merge:version-increase"
```

`latest-merge:<text>` searches the configured head's first-parent history for the nearest merge commit whose message contains the text. It is useful when a version-increase or release merge should be the baseline for the next cycle even though the release tag points to an earlier commit.

ALWasp does not fetch refs or history. Make sure your pipeline checks out the tags, branches, and commits that `--changed-since` needs. For GitHub Actions, use `fetch-depth: 0` when using tag or merge-history baselines:

```yaml
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
```

## Permanent version updates

Use `version apply` as a separate step when you want version changes committed by your pipeline:

```bash
alwasp version apply release --changed-since latest:v*
```

ALWasp writes the calculated project versions and eligible internal dependency versions to `app.json`. Your pipeline owns `git commit`, tags, and push.

With `versioning.includeDependencies: true` (the default), dependencies on selected internal projects are updated by app GUID. The default `dependencyUpdateScope: directlyChanged` propagates only versions of projects changed directly in git; use `allVersioned` when versions assigned to dependents should cascade through the whole selected graph.

## Compatibility gates

Keep build, AppSourceCop validation, and compiled-package comparison as explicit pipeline stages:

```yaml
      - name: Build
        run: alwasp build release

      - name: Validate AppSource compatibility
        run: >-
          alwasp validate compatibility
          --project-root ./src
          --baseline-directory ./latest
          --packages ./.alpackages
          --ruleset ./rulesets/AppSourceCop.ruleset.json

      - name: Compare release package
        run: >-
          alwasp compare
          ./latest/MyApp.app
          ./output/MyApp.app
          --json ./output/compare.json
          --fail-on breaking
```

The validation stage recompiles source. The compare stage reads already-built packages and can be used independently when compiler validation is not required.
