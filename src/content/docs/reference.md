---
title: Exit Codes, Variables, and Files
description: The exit codes of all commands, the environment variables that ALWasp reads, and the files and folders that it writes.
group: Reference
order: 33
---

# Exit Codes, Variables, and Files

## Exit codes

For all commands, `0` is success and `1` is a failure or invalid input. Some commands also use
`2`:

| Command | `0` | `1` | `2` |
|---|---|---|---|
| Most commands (`restore`, `build`, `check`, `plan`, `version`, `artifacts`, `symbols`, `app`, `workspace`) | Success | Failure | Not used |
| `config validate` | Valid | Errors found | Not used |
| `compare` | Comparison completed, with or without changes | Package cannot be read, different app IDs, invalid arguments | Not used |
| `analyze` | Analysis completed, with or without findings | Invalid input | Not used |
| `validate compatibility` | All validated apps passed, or nothing to validate | An app failed | Not used |
| `validate translations` | No finding at or above `--fail-on` | Invalid input or a file that cannot be read | The gate failed |
| `translation validate` | Valid, possibly with warnings | Invalid input or read failure | Validation errors |
| `translation apply` | Applied, or nothing to apply | Invalid input | Blocked, also for a stale package |
| `tools update --check` | No update | Failure | An update is available |
| `skills install` | Installed or current | Failure | With `--check`: missing, outdated, or edited. Without: an edited file blocks the install |

`check` exits `1` when one or more steps failed. In `validate compatibility` with a version list
that includes `current`, a failure on `next-minor` or `next-major` is a warning and does not
change the exit code, unless you pass `--fail-on-next`.

## Environment variables

| Variable | Effect |
|---|---|
| `ALWASP_PAT` | Personal access token for private feeds when `--pat` is not given |
| `ALWASP_NUGET_API_KEY` | API key for `symbols push` and `app push` when `--api-key` is not given |
| `ALC_PATH` | Path to `alc` when no `--bc-version` and no `tooling.alcPath` applies |
| `AL_PATH` | Path to `altool` when no `--bc-version` and no `tooling.altoolPath` applies |
| `ALWASP_HYPERLINKS` | `auto` (default), `always`, or `never`: clickable paths in terminal output |
| `ALWASP_ARTIFACT_CLEANUP` | `off` disables the automatic artifact cleanup after `validate compatibility` |
| `CI`, `TF_BUILD`, `GITHUB_ACTIONS`, `BUILD_BUILDID` | When one is set, `--auth-mode auto` is non-interactive |
| `ARTIFACT` | Fallback Business Central version for Application Insights `mode: auto` when the app has no `runtime` and `workspace.bcVersion` is not set |

Variables that you name in `--feed-token-env`, `restore.feedTokenEnv`, or
`applicationInsights.environmentVariable(s)` are also read.

## Files and folders

ALWasp writes into your repository only what you ask for, and the symbol folder that the VS Code
AL extension also reads.

### In the repository

| Path | Contents |
|---|---|
| `alwasp.json` | Configuration, written by you or by `alwasp config init` |
| `.alpackages/*.app` | Restored symbols. While a command runs, also `.alwasp.lock` |
| `.output/`, your `outFolder`, `--outfolder`, or the VS Code output folder | Compiled apps |
| `.alwasp/alwasp-plan.json` | Plan file of `alwasp plan`, when you do not give `--plan-file` |
| `.alwasp/build-manifest.json` | Build manifest, when you pass `--manifest` without a path |
| `.alwasp/translation/<language>` | Translation package of `translation prepare` |
| Paths that you configure | Manifest, log directory, result file, reports |

Add `.alwasp/` and `.output/` to `.gitignore`.

During a config-driven build, `app.json` files can be changed and are restored at the end. See
[Temporary app.json changes](/docs/build/#temporary-appjson-changes).

### In your user profile

| Path | Contents |
|---|---|
| `~/.alwasp/tools/<version>/` | AL compiler tools downloaded from NuGet |
| `~/.alwasp/artifacts/` | Business Central artifacts, approximately 1 GB each |
| `~/.alwasp/state/<name>-<hash>/` | State for one folder: the restore manifest, artifact symbol caches (`bc/<version>-<country>`), default compiler logs (`logs/`), and the temporary `app.json` backup |

- The `<name>-<hash>` key comes from the name and the full path of the folder that the state
  belongs to, so that two folders never share state.
- `alwasp artifacts prune` removes old artifacts and the state of folders that no longer exist.
  `--dry-run` shows what it would remove.
- On an account without a user profile, such as a service account, the folder is
  `<temp>/alwasp-home-<account>`. ALWasp makes sure that this folder is private to the account
  and fails with a message if it is not.
