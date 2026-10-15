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
          dotnet-version: 10.0.x

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
      version: 10.x

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

## Symbol-package publication

Keep publishing separate from compilation. A build job can prepare packages without feed
credentials, then upload the `.nupkg` files as pipeline artifacts:

```bash
alwasp symbols create ./output/MyApp.app --output ./symbols
alwasp symbols pack ./symbols/MyApp.symbols.app --output ./packages
```

In a protected release job, download those artifacts, install ALWasp, and push each package:

```yaml
      - name: Publish symbol packages
        shell: pwsh
        env:
          ALWASP_PAT: ${{ secrets.AZURE_ARTIFACTS_PAT }}
        run: |
          foreach ($package in Get-ChildItem ./packages/*.nupkg) {
            alwasp symbols push $package.FullName --source https://pkgs.dev.azure.com/org/_packaging/feed/nuget/v3/index.json --auth-mode noninteractive --api-key az --skip-duplicate
            if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
          }
```

Packing and pushing also require ALTool for symbol-only/runtime validation; pre-cache compatible
tools with `alwasp tools update` when needed. `symbols publish` combines all three stages when
one job owns the complete workflow. `build` never publishes implicitly. See
[Symbol Packages](/docs/symbol-packages/) for dependency ID mappings, validation, and stage results.

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

## Deterministic CI plans

`build --changed-since` still builds the full selected target; use `plan` for an explicit
changed-only CI selection instead:

```bash
alwasp plan ci --changed-since origin/main --plan-file .alwasp/alwasp-plan.json
alwasp build --plan .alwasp/alwasp-plan.json
```

`alwasp plan` writes a deterministic, timestamp-free JSON document selecting directly changed
projects, downstream applications, affected test apps, and the internal prerequisites needed to
compile them, along with dependency build levels, deployment order, repository commit IDs,
changed-file hashes, the configuration hash, and an input fingerprint. A change to `alwasp.json`,
a configured NuGet config, or an active ruleset selects the complete requested target; no relevant
changes produce a successful empty plan; dependency cycles fail plan creation.

`alwasp build --plan <path>` consumes that plan and fails closed if the schema, fingerprint,
configuration, repository HEAD, changed-file set/content, or planned profiles/project App IDs have
drifted since the plan was created — so a stale plan can never silently build the wrong thing. It
cannot be combined with a positional target or `--profile`. `--changed-since` is allowed only for
the consuming build's changed-only version calculation and must resolve to the plan's recorded base.

## Default output paths and diagnostics

Since 0.4.1, plans default to `.alwasp/alwasp-plan.json` and `--manifest` without a path uses
`.alwasp/build-manifest.json`. Update artifact upload paths when relying on these defaults.
Explicit paths such as `output/build-manifest.json` in the examples above remain unchanged.

On failure, human logs can end with a `Failure artifacts` section pointing to available logs,
manifests, or translation coverage reports. The section does not become a JSON/NDJSON record.
CI and redirected output remain plain even when `ALWASP_HYPERLINKS=always` is set; interactive
local runs can use clickable paths. See [CLI output controls](/docs/cli-reference/#terminal-links-and-failure-artifacts).

## Permanent version updates

Use `version apply` as a separate step when you want version changes committed by your pipeline:

```bash
alwasp version resolve release --changed-since latest:v*
alwasp version apply release --changed-since latest:v*
```

ALWasp writes the calculated project versions and eligible internal dependency versions to `app.json`. Your pipeline owns `git commit`, tags, and push.

`version resolve` previews the changes without applying them. Without configuration, use
`--project-root ./src --changed-since origin/main`, with optional `--include-dependents` and
`--release-type`. For compatibility target/country matrices, Insider failures warn when `current`
is included; add `--fail-on-next` when previews must block CI. Use `--max-parallel-processing`
to bound workers and `--keep-artifacts` when the next run should reuse Insider artifacts.

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
```

The validation stage recompiles source and is the compatibility gate. The compare stage reads
already-built packages and reports an informational change log — it always exits `0` on a
completed comparison, so it never fails the pipeline by itself; read its JSON output or console
report to review what changed.

## Translation gate

```yaml
      - name: Validate translations
        run: >-
          alwasp validate translations ci
          --changed-since latest
          --fail-on needs-review
          --min-coverage 95
```

See [Translation Coverage](/docs/translations/) for the complete behavior. Findings are also emitted as build annotations under
GitHub Actions and Azure Pipelines, so missing or stale translations surface in the pipeline UI
without reading the log.

## Unified verification

Use [`alwasp check`](/docs/check/) to run configured build, compatibility, and translation gates
over one selection. Independent translation checks continue after a build failure.

```bash
alwasp check ci --auth-mode noninteractive --format json --result-file .alwasp/check-result.json
alwasp plan ci --changed-since origin/main
alwasp check --plan .alwasp/alwasp-plan.json
```

Archive the result file and reported failure artifacts. Check compiles test apps but does not run
Business Central tests. Standalone compatibility changed-only validation now needs
`--include-dependents` to include downstream apps; `check` and `plan` retain their existing
dependent/test/prerequisite selection.
