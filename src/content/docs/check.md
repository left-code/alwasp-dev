---
title: Verification with check
description: Run configuration, build, compatibility, and translation gates over one deterministic selection.
group: Guides
order: 12
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
affected test apps, and prerequisites needed to compile them. Standalone `validate compatibility`
is different: it validates only the changed apps unless you add `--include-dependents`. A selection with no relevant changes succeeds without
restore or compilation.

`--plan` is authoritative and validated before work begins. A stale plan fails the check.
It cannot be combined with a positional target or `--profile`. If `--changed-since` is also
supplied, it must resolve to the plan's recorded base. See [Plan-based builds](/docs/build/#plan-based-builds).

## Steps

| Step | What runs | Not configured or not applicable when |
|---|---|---|
| `configuration` | Loads and validates `alwasp.json`, the target or profile, and a plan | Never |
| `restore` | The symbol restore of the build, with package overrides | `restore.enabled: false` |
| `build` | `alwasp build` for the selection, with analyzers, rulesets, and warning policy | No projects are selected |
| `compilerDiagnostics` | The error and warning totals from the compiler logs | The compiler wrote no logs |
| `compatibility` | `validate compatibility` for the selected apps with a baseline | No baseline policy and no per-app baseline |
| `translations` | `validate translations` for the selection | No `translations` section, or it is disabled for all selected projects |
| `testApps` | Counts the selected test apps that compiled | No test apps are selected |

An invalid configuration stops all steps. A restore failure skips the build. The compatibility
step needs a build that passed. The translation step does not.

## Results

Each step reports `passed`, `failed`, `skipped` with a reason, `notConfigured`, or `notApplicable`.
The exit code is `0` only when no step failed. A restore failure skips compilation; independent
translation checks still run after a build failure. The summary includes elapsed time, failed
compatibility/translation app counts and IDs, and available failure artifacts. Workflow message
totals exclude compiler diagnostics, which have their own counts.

A failed compile is reported as a crash, as AL errors, or as an error exit without AL errors. See
[Compiler failures](/docs/build/#compiler-failures).

The compatibility step always runs `validate compatibility` for the selected apps that have a
baseline. Each app is compiled against the Microsoft symbols of the lowest release that it
supports, as AppSource does. See [Minimum supported release](/docs/compatibility/#minimum-supported-release).
This is also done for apps that a `compatibility.enabled` profile checked during the build, so
those apps are compiled two times in one `check` run. The overview lists why each app failed and
shows the table of apps whose `application`/`platform` is lower than their dependencies need.

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
