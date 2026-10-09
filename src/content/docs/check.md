---
title: Verification with check
description: Run configuration, build, compatibility, and translation gates over one deterministic selection.
order: 4.5
---

# Verification with check

`alwasp check` verifies a configured repository using one target/profile selection. It validates
configuration, runs the build and its restore, checks compiler diagnostics, validates configured
compatibility baselines, and applies translation coverage policy. Test apps are compiled; running
Business Central tests remains a separate pipeline step.

```bash
alwasp check ci
alwasp check --profile appsource
alwasp check ci --changed-since origin/main
alwasp plan ci --changed-since origin/main
alwasp check --plan .alwasp/alwasp-plan.json
alwasp check ci --format json --result-file .alwasp/check-result.json
```

The command requires `alwasp.json`. Without an argument it uses `defaultTarget`.
`--profile` cannot be combined with a positional target. Feed and authentication options match
build; `--continue-on-error` continues remaining build groups/profiles after a failure.

## Selection and plans

`--changed-since` uses the same selection as `alwasp plan`: changed projects, their dependents,
affected test apps, and prerequisites needed to compile them. This differs from standalone
compatibility's changed-app-only default. A selection with no relevant changes succeeds without
restore or compilation.

`--plan` is authoritative and validated before work begins. A stale plan fails the check.
It cannot be combined with a positional target or `--profile`. If `--changed-since` is also
supplied, it must resolve to the plan's recorded base. See [CI plans](/docs/ci-cd/#deterministic-ci-plans).

## Gates and results

Each step reports `passed`, `failed`, `skipped` with a reason, `notConfigured`, or `notApplicable`.
The exit code is `0` only when no step failed. A restore failure skips compilation; independent
translation checks still run after a build failure. The summary includes elapsed time, failed
compatibility/translation app counts and IDs, and available failure artifacts. Workflow message
totals exclude compiler diagnostics, which have their own counts.

Compatibility uses explicit per-app baselines or the configured
[`publishedSymbols` policy](/docs/configuration/#published-compatibility-baselines). Missing
baselines do not exempt selected production apps: their current source is compiled and analyzed
without AppSourceCop. A successful source check passes the step while compatibility itself is
N/A; source/analyzer failures fail the step. Without a configured baseline policy or per-app
baseline, the compatibility step is `notConfigured`.

Translation coverage uses the selected apps' configured policy. Configure languages, coverage,
placeholder checking, and generated-file requirements as described in
[Translation Coverage](/docs/translations/).

For JSON or NDJSON, supply `--result-file` because compiler output cannot be redirected into
structured stdout. Tests reported as compiled are never reported as executed.
