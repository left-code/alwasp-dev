---
title: Agent Context
description: Discover local AL objects and restored dependencies, then prepare bounded evidence for an external coding agent.
order: 6.8
---

# Agent Context

The four `context` commands search local AL source and already restored dependency symbols.
They work offline and produce deterministic evidence for a developer or external coding agent.
Restore dependencies first; these commands do not restore packages, change source, or call an AI service.

```bash
alwasp context search "sales release" --project ./App
alwasp context object 'codeunit "Release Sales Document"' --project ./App
alwasp context usages 'table "Sales Header"' --project ./App
alwasp context prepare --task story.md --project-root ./src
```

## Select projects and packages

Every command accepts `--project`, recursive `--project-root`, or `--workspace <file>`.
Workspace selection includes only folders directly containing `app.json`; it does not recurse.
Alternatively use `--config`, `--profile`, and `--target`. Direct selection cannot be combined
with configured selection. Without options, `alwasp.json` and its default target apply; without
configuration, the current directory must contain `app.json`.

Only selected local projects are searched. Include separate test apps through a suitable
profile, project root, or workspace. Configured dependencies use `restore.packagesFolder`
relative to the config file, defaulting to shared `.alpackages`; direct/workspace projects use
their own `.alpackages`. `--packages-folder` overrides this relative to the current directory.

Dependency evidence follows the declared transitive closure and minimum versions. Unrelated
cached apps are excluded. Exact package versions and SHA-256 hashes stay visible. Multiple
matching packages are reported as ambiguous rather than selected by filename or timestamp.
Missing/unreadable packages leave local discovery available with diagnostics.

## Search, object inspection, and usages

Search ranks names, phrases, members, namespaces, types, and one structural relationship hop
using fixed weights and stable ordering. Candidates include reasons, origin (`local` or
`dependency`), test status, and dependency identity. Scores describe relevance, not confidence.

Object/usages queries accept a name, typed name or numeric ID, namespace-qualified name, or
full candidate key. A unique object returns `0`, no match returns `1`, and ambiguity returns `2`
with all candidates. Use a candidate key to disambiguate.

```bash
alwasp context object 'table Microsoft.Sales."Sales Header"' --project ./App
alwasp context usages 'codeunit "Release Sales Document"::OnBeforeRelease' --project ./App
```

Usages describe structural parser evidence such as event subscriptions, table relations,
permissions, and extension targets, with file, line, kind, and resolution status. Member queries
filter known event subscriptions. They do not provide a general procedure call graph; empty
results do not prove that a member has no callers. Unresolved and ambiguous references remain explicit.

## Prepare an evidence package

`context prepare --task <UTF-8-file>` writes `.alwasp/context/`; `--output` chooses another
directory. Output within a selected project must be in an excluded source directory such as
`.alwasp`, so copied AL files cannot become compiler inputs.

| Option | Default | Range |
|---|---:|---|
| `--max-candidates` | 20 | 1–100; also available for search |
| `--max-depth` | 1 | 0–2 structural hops |
| `--max-objects` | 100 | At least the candidate limit, at most 500 |

Tasks are limited to 1 MiB; packages to 16 MiB. Preparation keeps the highest-ranked candidates
that fit, warns about omissions, and sets `sizeLimitReached`. If the first candidate cannot fit,
it fails without publishing partial output. Selection limits can omit related tests.

| Path | Contents |
|---|---|
| `manifest.json` | Schema, bounds, task/output hashes, selected source mapping |
| `task.md` | Original task bytes |
| `environment.json` | Apps, manifest hashes, requirements, exact dependency identities and diagnostics |
| `candidates.json` | Terms, phrases, rankings, selection reasons |
| `graph.json` | Structural usages, including unresolved or ambiguous evidence |
| `tests.json` | Selected local tests and reasons |
| `instructions.md` | Guidance and limitations |
| `local/*.al` | Complete selected source files with original bytes and line numbers |
| `dependencies/*.json` | Selected symbol-object details |

Generated JSON preserves readable Unicode and contains no generation timestamp or absolute
machine path. Identical inputs/options/packages produce identical content after relocation.
Replacement is staged with rollback and a sibling lock. Unmanaged directories, symbolic links,
unsupported manifests, and modified or added package files are refused; preserve edited content
elsewhere before regenerating. Failed/cancelled preparation preserves the previous package.

## Add verified dependency source

All four commands accept repeatable `--dependency-source-folder <dir>`:

```bash
alwasp context prepare --task story.md --project ./App \
  --dependency-source-folder ../CoreApps --dependency-source-folder ../FrameworkApps
```

Folders are searched recursively and supply dependency implementation evidence, without adding
selected root projects. Paths resolve from the current directory. Restored symbols remain
authoritative for API, identity, exact version, and package hash. Source AppId, name, publisher,
and four-part version must match the restored package. Ambiguous/mismatched source is diagnosed
and ignored; unrelated source cannot add packages or dependency edges.

Verified evidence uses origin `dependency-source`. Parsed implementation members are separate
from symbol API members; implementation-only objects have `implementation.symbolBacked: false`.
Source and manifest hashes record provenance. Selected source files are copied to
`dependency-source/<sha256>.al`, within the same 16 MiB bound. Whole repositories are not copied.

Symbol-only packages use schema `1.0`; supplying dependency source uses `1.1`.
The [context manifest schema](/schema/alwasp-context.schema.json) validates both versions.

## Output and diagnostics

All commands accept `--format text|json|ndjson`, `--result-file`, `--verbose`, and `--quiet`.
Structured command data is under `context` in the standard result envelope.

| Code | Meaning |
|---|---|
| `ALWCTX001` | Unreadable restored package |
| `ALWCTX002` | Missing matching restored dependency |
| `ALWCTX003` | Multiple matching restored packages |
| `ALWCTX004` | Unsupported or invalid structural reference |
| `ALWCTX005` | Workspace folder has no direct app.json or local path |
| `ALWCTX006` | Lower-ranked candidates omitted at the package size limit |
| `ALWCTX007` | Reachable source has no matching restored package |
| `ALWCTX008` | Source name/publisher mismatch |
| `ALWCTX009` | Source version mismatch |
| `ALWCTX010` | Multiple exact source projects |
| `ALWCTX011` | Unreadable or invalid source manifest |
| `ALWCTX012` | Ambiguous source/symbol object match |

Inspect candidates and diagnostics before using the package, then verify changes with the
repository's build and [check](/docs/check/) workflow.
