---
title: Translation Preparation
description: Prepare translation packages for a translator or an agent, validate the returned XLIFF, and apply it to your apps.
group: Guides
order: 18
---

# Translation Preparation

ALWasp can package generated AL translation sources for a human translator, an external
translation service, or an AI agent. It then validates the returned XLIFF and applies it to your
project files. ALWasp does not translate text, does not connect to AI services, and needs no AI
credentials.

```text
translation prepare  ->  translator or agent edits the package  ->  translation validate  ->  translation apply
```

To let an AI agent do these steps, see [Translation Skill](/docs/translation-skill/).

Build each app first with `TranslationFile` enabled in `app.json`, and include the target locale
in `supportedLocales`. Preparation requires exactly one generated `Translations/*.g.xlf` per
eligible app and never modifies project files.

```bash
alwasp translation prepare fr-FR --context de-DE
```

Give `.alwasp/translation/fr-FR` to the translator. Keep returned translations outside that
directory because rerunning preparation replaces the generated package.

## Package contents

Each app directory uses its name from `app.json` for direct selection, or its configured `id`
for `alwasp.json` selection. Unsafe filename characters are replaced and reserved names are made
safe. Names that collide ignoring case receive a GUID suffix. Duplicate app GUIDs fail preparation.

| File | Purpose |
|---|---|
| `source.xlf` | Authoritative generated source, copied byte-for-byte |
| `<App Name>.<language>.xlf` | Target template and return filename, with valid unchanged translations preserved |
| `existing-target.xlf` | Existing target file, when present; stale content is reference only |
| `context.<locale>.xlf` | Optional secondary-language context |
| `units.json` | Ordered units, status, reason, markup, notes, placeholders, length constraints, glossary rules, terminology, and context |
| `glossary.json` | Optional approved locale glossary copied for return validation |
| `terminology.json` | Matched Base Application and dependency terms, provenance, resolved artifact, and warnings |
| `instructions.md` | Instructions for the translator |

The package root contains `manifest.json` and package-level instructions. Each manifest project
records its original app GUID, directory, full `appName`, and `translationFile`. The translation
filename uses the full app name even when the directory uses a configured ID, with unsafe filename
characters made safe; for example, `Sales App.fr-FR.xlf`.

JSON files use camelCase, readable Unicode, and `schemaVersion: "1.0"`; timestamps and
machine-specific paths are excluded, making equivalent inputs produce deterministic output.
A failed preparation leaves the previous valid package intact.

The manifest also records `terminologyVersion`, `terminologyCountry`, `requestedBcVersion`,
`expectedBcVersion`, `fileStyle`, `glossarySha256`, `sourceInputsSha256`, and `sourceRevision`
when available.
Git revision metadata records commit, branch (null for detached HEAD), and dirty state; source
hashes remain authoritative for integrity. Work reasons also include `target-too-long` and `glossary`.

## Project selection

Use one of the direct selection modes, or use the existing ALWasp configuration:

```bash
alwasp translation prepare fr-FR --project ./MyApp
alwasp translation prepare fr-FR --project-root ./src
alwasp translation prepare fr-FR --workspace ./Apps.code-workspace
alwasp translation prepare fr-FR --config ./alwasp.json --profile release
```

The modes are mutually exclusive. With no selection option, ALWasp uses `alwasp.json` and its
default target when present; otherwise it treats the current directory as one app. Configured test
projects and apps with `translations.enabled: false` are skipped.

Project-root/workspace discovery also excludes confirmed source test apps. Unknown source stays
eligible with warnings; explicit `--project` selection retains test apps. Explicit valid inventory
classification takes precedence. Workspace folders must contain app.json directly; discovery
does not recurse.

An app is also skipped unless `app.json` lists the target language in `supportedLocales`, using
a case-insensitive exact locale match (`fr` does not match `fr-FR`). Missing, null, or empty lists
skip the app before generated XLIFF is required or terminology is requested. The optional context
language is not subject to this filter.

An app whose generated source language is the target language is skipped, because there is
nothing to translate. Apps with no units requiring translation are skipped before terminology
lookup. Regeneration removes the folders of apps that need no work. If all apps are skipped, preparation
succeeds with an empty manifest project list and no app folders.

## Existing translations and context

Valid, unchanged translations are reused in `<App Name>.<language>.xlf`. Units needing work have an empty target
in the template while their previous content remains available in `units.json` and
`existing-target.xlf`. An optional `--context <locale>` adds a secondary translation only when its
source and placeholders still match and it is not marked for review.

Each unit is classified as `translated`, `needs-translation`, or `locked`. Work reasons distinguish
missing units or targets, source changes, review state, untranslated markers, placeholder mismatch,
and inline-code mismatch. Selected configuration and profile values for
`translations.untranslatedPlaceholders` are honored; an explicitly empty profile list disables the
markers.

## Microsoft terminology

Business Central translations provide terminology and reference context; ALWasp never inserts
them as automatic extension translations. Exact source matching is preferred, followed by bounded
normalized phrase matching. Conflicting translations retain their provenance rather than being
chosen without evidence.

```bash
alwasp translation prepare fr-FR \
  --context de-DE \
  --bc-country FR \
  --bc-version 28.0
```

| `--bc-version` | Terminology source |
|---|---|
| Not given | The latest released artifact of each app's `application` major.minor |
| `current` | The latest released artifact for the country |
| `next-minor`, `next-major` | The Insider artifact |
| A version or version prefix | That released artifact |

`--bc-country` has priority over `restore.country`; the default is `W1`. The resolved version is
printed and recorded in the manifest as `terminologyVersion`. If there is no terminology, or the
artifact is not available, preparation gives a warning and continues. Pin a version when the
terminology output must be the same in each run.

Microsoft terminology comes only from Base Application for the selected target locale.

## Dependency translation context

Direct and transitive non-Microsoft dependencies can supply terminology from local source projects
or embedded XLIFF in restored `.app` packages. Dependencies are matched by app ID. Local projects
take precedence; otherwise ALWasp uses the highest cached package version meeting the dependency
minimum. Config selection considers all configured apps, including those outside the selected
profile, and honors `restore.packagesFolder`; direct selection also uses project/shared
`.alpackages` folders.

Supply additional parent source repositories without building or publishing them:

```bash
alwasp translation prepare fr-FR --project ./ChildApp \
  --parent-source-folder ../ParentRepo \
  --parent-source-folder ../OtherParents
```

`--parent-source-folder` is repeatable and works with every selection mode. Paths are relative to
the current directory and searched recursively for `app.json`. Missing folders fail preparation;
overlapping folders are deduplicated. Only matching dependencies contribute context, and parent
folders never add output apps. Their current `Translations/*.xlf` files need no generated `.g.xlf`.
Explicit parent folders take precedence over configured sources; for duplicate source app IDs,
the first encountered project is used.

Only valid translated units matching the source and target locales contribute context. Matches
appear in `units.json` and `terminology.json` with dependency app IDs and translation-file
provenance. Conflicting translations remain available to the translator. Dependency context is
still available if Microsoft terminology lookup fails.

Run restore first when dependency packages are missing. Preparation does not download third-party
dependencies and continues with a notice when they are unavailable.

## Validate returned XLIFF

Validate one returned target file before copying it into the app's `Translations` directory:

```bash
alwasp translation validate ./MyApp.fr-FR.xlf
alwasp translation validate ./MyApp.fr-FR.xlf --project ./MyApp
alwasp translation validate ./MyApp.fr-FR.xlf \
  --source ./source.xlf \
  --language fr-FR
alwasp translation validate .alwasp/translation/fr-FR --expected-bc-version 28.5
```

Validation can discover a project when the returned file already resides in its translations
directory. `--source` supplies the authoritative generated source directly and cannot be combined
with project selection. Without an authoritative source, ALWasp warns and can check only the
returned file's internal consistency; use `--source` in acceptance gates. The expected language is
inferred from a locale suffix when possible or set explicitly with `--language`.

The validator supports AL XLIFF 1.2 with one `<file>` element per app. It rejects malformed XML,
DTDs, duplicate IDs, missing or extra units, changed source text or markup, missing targets,
structural metadata or developer-note changes, incorrect language metadata, invalid inline-code
pairing or nesting, and placeholder changes. `%1`, AL hash fields such as `#1##`, and composite
format items such as `{0}` or `{1:N2}` are compared as exact multisets. Review flags and reference
terminology differences are warnings; explicit glossary errors fail validation.

Source `maxwidth`/`maxWidth` limits with `size-unit="char"` (or omitted size unit) are enforced
using UTF-16 code units, so a supplementary Unicode character counts as two. Invalid limits
fail input validation; other size units warn. Overlength returned targets fail and existing
overlength translations are reopened during preparation. Text is never truncated.

Package-directory validation uses the manifest and packaged sources and cannot be combined with
project selection or `--source`. It checks every nonempty translatable target in included apps,
including reused translations. Keep returned files outside the generated directory while editing;
copy them to their manifest filenames in the package for this check before regenerating.

| Exit code | Meaning |
|---|---|
| `0` | Valid, possibly with warnings |
| `1` | Invalid command input or read failure |
| `2` | Returned-XLIFF validation errors |

All translation commands support `--verbose`, `--quiet`, `--format`, and `--result-file`. Text output shows at
most ten validation findings, while structured output retains all findings. This workflow does not
replace [`alwasp validate translations`](/docs/translations/), which remains the coverage and
release-gating command across complete projects and language sets.

## Apply returned translations

`translation apply` writes the validated translations from a package into the target XLIFF files
of your apps. It is the only translation command that changes project files.

```bash
alwasp translation apply .alwasp/translation/fr-FR --project-root . --dry-run
alwasp translation apply .alwasp/translation/fr-FR --project-root .
```

Use the same project selection as for `prepare`. `--dry-run` reports the units and files that
would change and writes nothing.

Only units with the status `needs-translation` and one of these reasons are applied:

| Reason | Meaning |
|---|---|
| `missing-unit` | A new unit that is not in the target file |
| `missing-target` | A unit without a target |
| `untranslated` | An empty target, an untranslated state, or a marker such as `%EMPTY%` |
| `source-changed` | The source text or markup changed after the translation was written |

All other units stay as they are. Units with review, placeholder, inline-code, length, or
glossary findings are listed for manual review and keep their text.

Safety rules:

- Apps are matched by app ID. A package app that is not found, or found more than one time, blocks
  the run.
- A package is stale when the generated `.g.xlf`, an `.al` file, `app.json`, or the target file
  changed after `prepare`. A stale package is refused; run `translation prepare` again.
- The scope is calculated again from the packaged source and target. An edited `units.json` that
  does not agree blocks the run.
- The package is validated again. An error on a unit to apply, a unit that is returned with a
  review flag, a file-level error, or a change to a unit outside the scope blocks the run.
- Only the applied `<trans-unit>` elements are changed. All other bytes, the BOM, the line
  endings, and the unit sequence stay the same.
- Nothing is written unless all apps of the package can be applied.

| Exit code | Meaning |
|---|---|
| `0` | Applied, or nothing to apply |
| `1` | Invalid input |
| `2` | Blocked, also for a stale package |

The structured result lists for each app the file, the applied unit IDs with their reason, the
number of preserved units, the manual-review units, the obsolete units, and the findings.

## Approved glossary and consistency review

```bash
alwasp translation prepare fr-FR --glossary glossary.fr-FR.json --expected-bc-version 28.5
alwasp translation validate MyApp.fr-FR.xlf --source source.xlf --glossary glossary.fr-FR.json
alwasp translation validate .alwasp/translation/fr-FR
```

```json
{
  "schemaVersion": "1.0",
  "targetLanguage": "fr-FR",
  "entries": [
    { "source": "Process", "target": "Traitement" },
    { "source": "Process", "target": "Traiter", "noteContains": "Action RunProcess" },
    { "source": "Entry No.", "target": "N° séquence", "allowedTargets": ["N° écriture"] },
    { "source": "Time Recording", "target": "Enregistrement de temps", "severity": "warning" }
  ]
}
```

Rules match whole English source units exactly, including case. Optional `unitId`, `noteContains`,
and `app` (the XLIFF file's `original`) restrict context, in that priority order. More specific
rules override general ones; equally specific rules all apply. `allowedTargets` accepts approved
alternatives. Severity defaults to `error`; `warning` is advisory. Matching source/target text
can protect a product name. These rules do not replace substrings within sentences.

Glossary rules take precedence over terminology suggestions. Preparation reopens violating
translations. Package validation uses the copied glossary and its hash; a missing/modified copy
fails, unless `--glossary` explicitly supplies a replacement. Comparisons ignore surrounding
whitespace, Unicode normalization differences, and straight/curly apostrophe differences.

Package validation warns about differences from reference terminology and inconsistent renderings
of identical source text across included apps, with app/unit references. Approved contextual
alternatives do not trigger generic consistency warnings. Skipped apps are not audited.

`--expected-bc-version` on prepare or package validation warns when terminology is unavailable
or comes from another version line. It does not choose artifacts. Preparation also checks an
explicit `--bc-version` and saves its expectation for return validation.

## File conventions

Templates preserve existing UTF-8 target BOM, newlines, and XML declaration presence/standalone
setting, falling back to generated-source conventions. XML serialization is not a byte-for-byte
formatting round trip; source/reference copies retain their original bytes.

Apostrophe guidance follows existing unit/file style without rewriting text. Mixed files keep
per-unit conventions; files without apostrophes establish no inferred style. Package validation
warns about edited apostrophe style and BOM/newline/declaration drift.
