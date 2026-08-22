---
title: Translation Coverage
description: alwasp validate translations — XLIFF coverage checking, placeholder validation, and release gating.
order: 6.6
---

# Translation Coverage

It answers the pre-release question "is everything translated?" by comparing each project's
generated `Translations/<App>.g.xlf` against the language files beside it. No compiler, symbol
restore, or Business Central environment is involved — it only reads XLIFF files.

```bash
alwasp validate translations                       # current directory or alwasp.json
alwasp validate translations release                # configured target or profile
alwasp validate translations --project src/Core --languages da-DK,de-DE
alwasp validate translations --project-root ./src --json output/translations.json
```

## Findings

A non-empty `--languages` / `translations.languages` list is both the required set and the
*scope* of the check: translation files for languages outside that list are excluded from
validation entirely rather than being checked and potentially failing on their own account.
Leaving the list empty or omitted checks every discovered language, as before.

| Finding | Meaning |
|---|---|
| missing language file | A required language (`--languages` / `translations.languages`) has no `.xlf` file |
| missing unit | A translatable unit of the `.g.xlf` is absent from a language file — usually a new caption never synced |
| untranslated | The unit exists but has no usable translation: no `<target>`, an empty one, or state `new`, `needs-translation`, `needs-adaptation`, `needs-l10n` |
| outdated | The unit is translated, but its `<source>` no longer matches the generated one — the caption was reworded while its unit id stayed the same |
| unverifiable | The unit has no `<source>` at all, so nothing can be checked against it |
| needs review | Translated, but state is `needs-review-*` |
| obsolete | The language file still carries a unit the `.g.xlf` no longer contains (reported, never fails) |

Units marked `translate="no"` and units without source text are excluded from the generated
file's baseline. In a *language* file only `translate="no"` is skipped: a unit that carries a
target but no `<source>` is still matched by id, so it counts as translated rather than being
misreported as missing.

Outdated translations count against coverage and fail at the same level as untranslated ones.
Source texts are compared exactly apart from line endings, since AL writes trans-units with
`xml:space="preserve"`. Only the accepted `<target>` of a trans-unit is read — an `<alt-trans>`
translation-memory proposal never counts as a translation.

A project may also hold translation files for *another* app (`<file original="OtherApp">`).
Those are grouped by `original` plus language, checked on their own for untranslated units, and
labelled `[for OtherApp]` in the report; they never satisfy a required language for the current
app.

A translation artifact that can't be trusted fails the gate rather than passing quietly: a
second file for the same app and language, a file whose language can't be determined, a file
missing the required `<file original>` attribute, or more than one `.g.xlf` in the folder (which
one is the baseline would be ambiguous). Only `.xlf` files are considered.

## Working with XLIFF Sync and similar tooling

The check is designed to agree with how
[XLIFF Sync](https://github.com/rvanbekkum/vsc-xliff-sync) maintains AL translation files:

- Its `state="needs-adaptation"` marking (XLIFF 1.2) counts as untranslated — the same verdict
  the tool intends.
- Its `detectSourceTextChanges` does at sync time what the outdated check does at gate time, so a
  synced repository and this command agree on which translations went stale.
- An `xliffSync:needsWork` sub-state, or a note explaining why a unit was flagged, is reported as
  needing review rather than counted as finished.
- Its `missingTranslation` setting decides what goes into a new target. The default `%EMPTY%`
  means "leave it empty" and is recognized as untranslated by default; a configured literal
  placeholder needs to be listed explicitly:

```json
{
  "translations": {
    "untranslatedPlaceholders": ["%EMPTY%", "(!TODO!)"]
  }
}
```

Omit the setting to keep the default (`["%EMPTY%"]`), or set it to `[]` to disable the check. A
configured list replaces the defaults, so include every marker your tooling writes.

## Placeholder rule

Borrowed from XLIFF Sync's technical translation rules: a translation must use the same format
placeholders as its source. Dropping `%2` from `Order %1 was posted on %2` produces text that
renders wrong at runtime, no matter how complete the coverage report looks.

```bash
alwasp validate translations --check-placeholders
```

```json
{ "translations": { "checkPlaceholders": true } }
```

`%1`-style, `{0}`-style, and AL `#` fields (`#1`, `###2`, as filled by `Text.StrSubstNo`) are
recognized and compared as a set, so a translation may reorder them but may not drop, add, or
renumber any. For `#` fields only the parameter number matters — padding sets display width,
which a translation may legitimately change. This also treats ordinary text such as `Order #5`
as a placeholder, which is one reason the rule is opt-in (default `false`) and doesn't affect the
coverage percentage.

`alwasp validate translations` only reads files — it never syncs or rewrites them. Pair it with
XLIFF Sync (or its [PowerShell module](https://github.com/rvanbekkum/ps-xliff-sync)) to *create*
and maintain translations, and use this command as the release gate that verifies the result.

## Warning or error

`--fail-on` sets where warnings turn into a failure, cumulative from lenient to strict: `none`,
`missing-language`, `missing-unit`, `untranslated` (default), `needs-review`. Findings below the
threshold are still reported — they just don't fail the command.

```bash
alwasp validate translations --fail-on none          # report only, always exit 0
alwasp validate translations --fail-on needs-review  # strictest release gate
alwasp validate translations --min-coverage 95       # per-language coverage floor
```

| Exit code | Meaning |
|---|---|
| `0` | Clean, or every finding was below the `--fail-on` threshold |
| `1` | Bad usage or an unreadable file |
| `2` | The gate failed |

Selecting only apps with `translations.enabled: false` is valid, not an error — the command
reports that it skipped them and exits `0`. `--require-generated` is a per-project requirement,
so it also fails a project with no translation files at all.

Under GitHub Actions or Azure Pipelines, findings are also emitted as build annotations — errors
for whatever fails the gate, warnings for the rest. A language below `--min-coverage` is
annotated as an error too, even when `--fail-on` alone would let it pass.

The generated `.g.xlf` is a build output and is often not committed; when it's absent, each
language file is checked on its own and a warning says so. Pass `--require-generated` to make
that a failure instead — run this check after a build with the `TranslationFile` feature enabled
for a complete picture.

## Configuration

```json
{
  "translations": {
    "languages": ["da-DK", "de-DE"],
    "failOn": "untranslated",
    "minCoverage": 95,
    "requireGeneratedFile": false
  },
  "apps": [
    { "id": "Broker", "path": "./Broker" },
    {
      "id": "HappyTexts",
      "path": "./HappyTexts",
      "translations": { "languages": ["da-DK"] }
    },
    {
      "id": "Internal",
      "path": "./Internal",
      "translations": { "enabled": false }
    }
  ]
}
```

Strictness (`failOn`, `minCoverage`, `requireGeneratedFile`) is repository-wide. An app may only
opt out of the check or declare its own language list, which replaces the shared one and scopes
validation to it the same way. CLI options override configured values. Projects selected by a target or profile follow the same `include`
model as `build`, so `alwasp validate translations ci` checks exactly the projects that target
builds. Required languages apply to `apps` entries only — test projects are checked solely on the
translation files they actually contain.

## Scoping to changed projects

When `changeDetection.mode: git` is active (or `--changed-since` is passed), `validate
translations` uses the same changed-project set as `build` and `version apply` as its filter by
default: unchanged apps are skipped, and a run with no changed apps succeeds without performing
any translation checks. Direct `--project` / `--project-root` validation is unaffected. See
[Configuration](/docs/configuration/#changedetection).

```bash
alwasp validate translations ci --changed-since latest
```
