---
title: Source Analysis
description: alwasp analyze — dependency and object graphs, changed objects, public API, and impacted tests from source and git alone.
order: 6.5
---

# Source Analysis

`alwasp analyze` is a **Pro** command. See [Editions & Licensing](/docs/editions/).

It answers "what did this change actually touch, and what has to be rebuilt, reviewed, or
re-tested because of it?" — from `.al` source and git alone. It never invokes a compiler,
restores symbols, or reaches the network, so it runs in seconds on a fresh checkout and returns
the same answer every time for the same input.

```bash
alwasp analyze                                    # whole config, no change detection
alwasp analyze ci --changed-since latest          # everything a release tag's diff implies
alwasp analyze --project src/Core --json out/analysis.json
alwasp analyze ci --changed-since main --include impacted-tests,affected-apps
```

## Sections

| Section | What it answers |
|---|---|
| `affected-apps` | Which apps a change reaches, and by which of three routes |
| `dependency-graph` | App-level dependencies, build order by level, and any cycles |
| `object-graph` | Every declared object, where it lives, and how connected it is |
| `changed-objects` | Which objects were added, modified, removed, or merely moved |
| `public-api` | The surface another app can bind to, per object |
| `references` | Which object references which, what is external, and what could not be resolved |
| `impacted-tests` | Which test codeunits a change reaches, and the chain that proves it |

Every section is produced by default; `--include` narrows the report to the named sections
(repeat the option or pass a comma-separated list). A section that wasn't requested is *absent*
from the JSON rather than empty, so a consumer can tell "not asked for" from "nothing found".
`schemaVersion`, `scope`, `summary`, and `diagnostics` are not sections — they're always present
and `--include` never affects them.

## Changed objects, not changed files

Change detection reuses the same `--changed-since` / `changeDetection` configuration as `build`
and `version apply` — see [Configuration](/docs/configuration/#changedetection). Where a build
maps changed *files* to projects, `analyze` goes one level deeper: it parses each changed file at
both refs and compares them object by object. Editing one codeunit in a file that declares three
does not report the other two as changed, and moving an object to another file — with its text
unchanged — is reported as `Moved` and impacts nothing. Moving source into `.alpackages` or `bin`
takes it out of analyzable scope and is reported as `Removed`.

Deleting an object propagates too: the head revision has no node for it, but the objects that
still name it do, so removing a public object while a downstream app or test still references it
reports those dependents and warns that the references no longer resolve.

## Impacted tests

Impact propagates along the object graph in the direction changes travel — from an object to
everything that references it. A test codeunit (`Subtype = Test`, or any codeunit with a `[Test]`
procedure) reached this way is reported with the chain that reached it:

```text
Impacted tests (1 codeunit(s), 2 test procedure(s)):
  sales-tests: codeunit "Sales Post Tests" — 2 test(s), distance 2
      via codeunit "Wasp Mgt" -> codeunit "Sales Poster" -> codeunit "Sales Post Tests"
```

The path is the evidence for the verdict, so a result is reviewable rather than taken on faith.
`--max-depth` caps how far impact propagates.

## What counts as a reference

Only forms that can only mean a reference are counted: `extends`/`implements`, a declared type
(a variable, a table field, a parameter or return type), an object-id expression
(`Codeunit::"Foo"`, `Database::"Customer"`), an `[EventSubscriber]` binding, and the properties
whose value names an object — `SourceTable`, `TableRelation`, `CalcFormula`, `RunObject`,
`Permissions`, `IncludedPermissionSets`, and a report/query `dataitem`. Names are never guessed
from text; anything inside a comment or string literal is not source.

### Reference kinds

| `kind` | The form that produced it |
|---|---|
| `Extends` | An extension object's `extends` target |
| `Implements` | An `implements` interface, or a page customization's `customizes` target |
| `DeclaredType` | A declared type outside a member signature — a variable, a table field |
| `ParameterType` | A declared type in a procedure's parameter list |
| `ReturnType` | A procedure's declared return type |
| `ObjectIdExpression` | `Codeunit::"Foo"`, `Database::"Customer"` |
| `EventSubscriber` | The publisher named by an `[EventSubscriber]` attribute |
| `PropertyReference` | A typed object in a property value, e.g. `RunObject = Page "X"` |
| `SourceTable` | A page/query/report `SourceTable` |
| `TableRelation` | A `TableRelation` target table |
| `CalcFormula` | A table named by a field's `CalcFormula` |
| `DataItem` | A report or query `dataitem` table |
| `Permission` | A `Permissions` entry or an `IncludedPermissionSets` member |

### Reference resolution

Every reference also carries what's actually *known* about its target, so a parser limitation,
invalid source, and a legitimate external reference are never mistaken for one another.

| `resolution` | Meaning | Where it appears |
|---|---|---|
| `Resolved` | The target is declared exactly once in the analyzed source | `references.resolved` |
| `External` | Not declared in the analyzed source — the base application, or a dependency outside the selection. Never diagnosed | `references.external` |
| `Ambiguous` | The name is declared more than once; the edge points at the first declaration | `references.resolved` |
| `Invalid` | The reference form is present but names no target | `references.unresolvable` |
| `Unsupported` | A form that cannot be resolved without a compiler | `references.unresolvable` |

## Object identity

Identity is the object's **kind plus name**, compared case-insensitively — the same identity AL
resolves a reference by. The declared object number is *not* part of it, so:

- **Renaming an object is a `Removed` plus an `Added`**, because that's what it is for every
  referrer of the old name. When a removal and an addition share a kind and object number, an
  `ObjectRenamed` diagnostic (info) names both sides.
- **Renumbering keeps the identity.** The object is `Modified`; `id` and `previousId` carry both
  numbers, and an `ObjectIdChanged` diagnostic (warning) reports it.
- **Changing an object's kind creates a new identity** — removal plus addition, with an
  `ObjectTypeChanged` diagnostic (warning) when name and number are otherwise the same.
- **A declaration crossing an app boundary** is `Moved` or `Modified` with `previousApp` set and
  an `ObjectMovedBetweenApps` diagnostic (warning); both apps are directly affected.
- **Two declarations of one identity** is invalid AL: both are reported as a duplicate, the graph
  resolves the name to the first, every reference to it becomes `Ambiguous`, and a
  `DuplicateObjectIdentity` diagnostic (error) is emitted.

## Diagnostics

`diagnostics` is always present and `--include` never gates it. Codes are stable and suitable
for pipeline policy:

| Code | Severity | Meaning |
|---|---|---|
| `SourceFileUnreadable` | error | A file inside a selected project could not be read |
| `UnterminatedObjectBody` | error | An object declaration has no closing brace |
| `DuplicateObjectIdentity` | error | Two declarations share one kind + name |
| `RemovedObjectStillReferenced` | error | A deleted object is still named by source that remains |
| `DependencyCycle` | error | The analyzed apps form a dependency cycle |
| `ChangeDetectionFailed` | error | The git diff behind change detection failed |
| `AmbiguousObjectReference` | warning | A reference whose target is declared more than once |
| `UnsupportedObjectReference` | warning | A reference site the analyzer cannot resolve without a compiler |
| `InvalidObjectReference` | warning | A reference form that names no target |
| `ObjectIdChanged` | warning | An object kept its identity but changed its object number |
| `ObjectTypeChanged` | warning | One name and number, two different object kinds |
| `ObjectMovedBetweenApps` | warning | A declaration moved from one analyzed app to another |
| `BaseRevisionUnavailable` | warning | A file in the diff could not be read at the base ref |
| `ObjectRenamed` | info | A removal and an addition share a kind and an object number |
| `RemovedObjectUnreferenced` | info | An object was removed and nothing analyzed still references it |

**Severity classifies the finding; it does not set the exit code.** `analyze` exits `0` whenever
the analysis completed, and non-zero only for a usage or I/O error — a pipeline decides its own
policy from the codes.

## Documented limitations

`analyze` reads source and git, never symbols, so some things it deliberately can't answer —
each is reported rather than silently dropped:

- Objects resolve by **name**, not by number — `Codeunit::50100` is `Unsupported`, not an edge.
- `[EventSubscriber]` publishers must be a **static** `<ObjectType>::"<Name>"` expression; a
  variable or constant in that slot is `Unsupported`.
- A duplicated name resolves to the **first** declaration; the choice is reported as `Ambiguous`
  rather than hidden.
- A reference to an undeclared name is assumed **external** — without symbol packages there's no
  way to prove it belongs to the base application rather than a typo.
- `#if` branches are **all kept** — impact analysis wants the superset.
- Identity-change diagnostics are **scoped to one app**, since object numbers repeat across apps.

## Affected apps

An app is affected for one of three reasons, reported strongest-evidence-first:

- `DirectlyChanged` — a file inside the project changed (source or not: `app.json`, XLIFF, and
  permission XML count).
- `ReferencesChangedObject` — one of its objects references a changed object.
- `DependsOnChangedApp` — its `app.json` depends, transitively, on a directly changed app, even
  with no object-level reference.

## Output

The console form is a summary capped at `--max-items` entries per section (`0` or `--verbose`
lists everything). `--json <path>` writes the complete report, as does `--format json`, which
carries it in the result document's `data.report`.

`analyze` is a reporting command: it exits `0` whenever the analysis completed. Everything it
found — duplicate object names, dependency cycles, unreadable files, unresolvable references — is
reported in `diagnostics`, never by an exit code.

## Report contract

The report is a versioned contract meant to be read by CI pipelines, other tools, and agents.

- `schemaVersion` identifies the **JSON contract**, not the ALWasp package version. It's currently
  `"1.0"`. **MAJOR** changes when a consumer of the previous version can break; **MINOR** changes
  when the document is extended in a way an existing consumer can ignore.
- The full document is described by a checked-in JSON Schema,
  `schemas/alwasp-analyze-report.schema.json`, covering all seven sections plus `scope`,
  `summary`, and `diagnostics`, with `additionalProperties: false` and every enum value
  enumerated.

### Determinism

The report carries no timestamps, no durations, no absolute paths, and no random identifiers.
Paths are repository-relative with forward slashes, so a report produced on Windows and one
produced on Linux compare equal byte for byte. Every collection has one documented, enforced
order, built only from values the document itself carries — ordinal comparisons only, never
file-system enumeration, hash iteration, OS, culture, or thread scheduling.
