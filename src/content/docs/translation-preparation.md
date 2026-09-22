---
title: Translation Preparation
description: Prepare deterministic packages for external translators and validate returned XLIFF.
order: 6.7
---

# Translation Preparation

ALWasp can package generated AL translation sources for a human or external translation service,
then strictly validate the returned XLIFF. It does not translate text, connect to AI services, or
require AI credentials.

Build each app first with `TranslationFile` enabled in `app.json`. Preparation requires exactly
one generated `Translations/*.g.xlf` per selected app and never modifies project files.

```bash
alwasp translation prepare fr-FR --context de-DE
```

Give `.output/translation/fr-FR` to the translator. Keep returned translations outside that
directory because rerunning preparation replaces the generated package.

## Package contents

Each app is stored below a directory named with its app GUID, preventing projects with matching
names or filenames from overwriting one another. Duplicate app GUIDs fail preparation.

| File | Purpose |
|---|---|
| `source.xlf` | Authoritative generated source, copied byte-for-byte |
| `target.xlf` | Target template with valid unchanged translations preserved |
| `existing-target.xlf` | Existing target file, when present; stale content is reference only |
| `context.<locale>.xlf` | Optional secondary-language context |
| `units.json` | Ordered units, status, reason, markup, notes, placeholders, terminology, and context |
| `terminology.json` | Matched Microsoft terms, provenance, resolved artifact, and warnings |
| `instructions.md` | Instructions for the translator |

The package root contains `manifest.json` and package-level instructions. JSON files use camelCase
and `schemaVersion: "1.0"`; timestamps and machine-specific paths are excluded, making equivalent
inputs produce deterministic output. A failed preparation leaves the previous valid package intact.

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

## Existing translations and context

Valid, unchanged translations are reused in `target.xlf`. Units needing work have an empty target
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

By default, ALWasp selects the latest released artifact in each app's application major/minor
line. Use `--bc-version` to pin a released version or prefix, or `--bc-target next-minor|next-major`
for an Insider artifact. `--bc-country` overrides `restore.country` and otherwise defaults to
`W1`. No terminology or an unavailable artifact produces a warning but does not fail preparation.
Pin a concrete version when terminology output must be reproducible.

## Validate returned XLIFF

Validate one returned target file before copying it into the app's `Translations` directory:

```bash
alwasp translation validate ./MyApp.fr-FR.xlf
alwasp translation validate ./MyApp.fr-FR.xlf --project ./MyApp
alwasp translation validate ./MyApp.fr-FR.xlf \
  --source ./source.xlf \
  --language fr-FR
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
format items such as `{0}` or `{1:N2}` are compared as exact multisets. Review flags are warnings;
terminology differences do not fail validation.

| Exit code | Meaning |
|---|---|
| `0` | Valid, possibly with warnings |
| `1` | Invalid command input or read failure |
| `2` | Returned-XLIFF validation errors |

Both commands support `--verbose`, `--quiet`, `--format`, and `--result-file`. Text output shows at
most ten validation findings, while structured output retains all findings. This workflow does not
replace [`alwasp validate translations`](/docs/translations/), which remains the coverage and
release-gating command across complete projects and language sets.
