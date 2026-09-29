---
title: Translation Preparation
description: Prepare deterministic packages for external translators and validate returned XLIFF.
order: 6.7
---

# Translation Preparation

ALWasp can package generated AL translation sources for a human or external translation service,
then strictly validate the returned XLIFF. It does not translate text, connect to AI services, or
require AI credentials.

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
| `units.json` | Ordered units, status, reason, markup, notes, placeholders, terminology, and context |
| `terminology.json` | Matched Base Application and dependency terms, provenance, resolved artifact, and warnings |
| `instructions.md` | Instructions for the translator |

The package root contains `manifest.json` and package-level instructions. Each manifest project
records its original app GUID, directory, full `appName`, and `translationFile`. The translation
filename uses the full app name even when the directory uses a configured ID, with unsafe filename
characters made safe; for example, `Sales App.fr-FR.xlf`.

JSON files use camelCase, readable Unicode, and `schemaVersion: "1.0"`; timestamps and
machine-specific paths are excluded, making equivalent inputs produce deterministic output.
A failed preparation leaves the previous valid package intact.

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

An app is also skipped unless `app.json` lists the target language in `supportedLocales`, using
a case-insensitive exact locale match (`fr` does not match `fr-FR`). Missing, null, or empty lists
skip the app before generated XLIFF is required or terminology is requested. The optional context
language is not subject to this filter.

Apps with no units requiring translation are skipped before terminology lookup. Regeneration
removes stale folders for apps that no longer need work. If all apps are skipped, preparation
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

By default, ALWasp selects the latest released artifact in each app's application major/minor
line. Use `--bc-version` to pin a released version or prefix, or `--bc-target next-minor|next-major`
for an Insider artifact. `--bc-country` overrides `restore.country` and otherwise defaults to
`W1`. No terminology or an unavailable artifact produces a warning but does not fail preparation.
Pin a concrete version when terminology output must be reproducible.

Microsoft terminology comes only from Base Application for the selected target locale. Large
Base Application translation files are supported without the earlier 64 MiB whole-file limit.

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

## Updating automation from 0.4.0

Update consumers of `.output/translation/<language>`, GUID directory names, and `target.xlf`.
Read `directory` and `translationFile` from the package manifest instead of constructing paths.
Ensure each app declares the requested target locale in `supportedLocales`, and keep edited or
returned translations outside the generated package before rerunning preparation.

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
