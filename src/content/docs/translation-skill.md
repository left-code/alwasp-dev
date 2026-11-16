---
title: Translation Skill
description: Install the alwasp-translate agent skill for Codex and Claude Code to translate only the XLIFF units that need work.
group: Guides
order: 19
---

# Translation Skill

`alwasp-translate` is an agent skill for Codex and Claude Code. It translates **only** the XLIFF
units of a target language that need work: new units, missing or untranslated targets, and units
whose source text changed. All valid translations stay as they are.

The skill only runs ALWasp commands in the correct sequence. The translation comes from the agent
that you use. ALWasp has no AI provider and no AI credentials, and it does not translate.

| Part | Responsibility |
|---|---|
| ALWasp | `build`, `validate translations`, `translation prepare`, `translation validate`, `translation apply`. The results are the same in CI |
| AI agent with the skill | Reads the package, translates the permitted units, shows the dry run, applies after your confirmation, and reports. It does not commit or push |
| CI | Runs only the final gate: `alwasp validate translations --languages <language> ...` |

## Install

The skill is in the `left-code.AlWasp` package, so it always agrees with the installed tool. Run
this in your AL repository:

```bash
alwasp skills install alwasp-translate
```

| File written | Read by |
|---|---|
| `.agents/skills/alwasp-translate/SKILL.md` | Codex, and the Claude Code adapter |
| `.claude/skills/alwasp-translate/SKILL.md` | Claude Code |

The files go to the root of the Git repository that contains the current folder. Commit them to
share the skill with your team.

| Option | Effect |
|---|---|
| `--user` | Install into your user profile (`~/.agents/skills`, `~/.claude/skills`) and not into the repository |
| `--check` | Write nothing. Exit code `0` when the installed skill is current; `2` when it is missing, outdated, or edited |
| `--force` | Replace files that were edited after the installation |

Prerequisites:

- `alwasp` is on `PATH`.
- Each app has `"features": ["TranslationFile"]` and lists the target language in
  `supportedLocales`.
- `.alwasp/` is in `.gitignore`.

### Update

```bash
dotnet tool update --global left-code.AlWasp
alwasp skills install alwasp-translate
```

Each installed file records the ALWasp version and a hash of its content. The skill stops and asks
for this update when its version is different from `alwasp --version`. Use `--check` in CI to keep
a committed copy current.

Do not edit the installed files. An edited file is never replaced: the install writes nothing,
names the file, and exits `2`, unless you pass `--force`.

## Use

Ask the agent, for example:

- Codex: `$alwasp-translate review fr-FR for --project-root .`
- Claude Code: `/alwasp-translate apply German (de-DE) for the workspace MyApps.code-workspace`

Give the target language, one project selection (`--project`, `--project-root`, `--workspace`, or
`--config`/`--profile`), and the mode:

| Mode | Effect |
|---|---|
| `review` (default) | Stop after the dry run |
| `apply` | Write the files after you confirm the dry run |

The skill asks for inputs that you do not give:

| Input | When you do not give it |
|---|---|
| Target language | The skill asks and offers the `supportedLocales` of the selected apps |
| Context language | The skill uses the one other language that the apps have translation files for. With more than one, it asks. With none, it works without context |
| Glossary | The skill asks. It proposes a glossary JSON when it finds exactly one. A terminology file in a different format is used as a background reference |
| Background references | None. You can give issue keys, URLs, files, or text that explain the change. The skill shows the guidance that it takes from them before it translates |
| Country | The region of the target language: `fr-FR` gives `FR`, `de-AT` gives `AT` |

You can give more than one target language. The skill builds one time and then does the languages
one after the other, each with its own package, dry run, and confirmation.

## What the skill runs

Example for `fr-FR` with `de-DE` as the context language. The skill stops at the first failure.

```text
alwasp build --project-root .
alwasp validate translations --project apps/MyApp --languages de-DE --fail-on none --check-placeholders
alwasp translation prepare fr-FR --project-root . --context de-DE --bc-version current --bc-country FR
(the agent translates the permitted units)
alwasp translation validate .alwasp/translation/fr-FR
alwasp translation apply .alwasp/translation/fr-FR --project-root . --dry-run
alwasp translation apply .alwasp/translation/fr-FR --project-root .
alwasp build --project-root .
alwasp validate translations --project apps/MyApp --languages fr-FR --fail-on needs-review --min-coverage 100 --require-generated --check-placeholders
```

- The build compiles only the target apps and the local apps that they depend on. A configured
  profile builds all that it selects.
- Apps without the target language in `supportedLocales`, usually test apps, are reported as
  skipped and are not checked.
- Gaps in the context language are warnings. They do not stop the run.
- A `--workspace` selection can include folders of other repositories. The skill names those apps
  and groups the changed files by repository.

## What is translated

A unit is translated only when it needs translation for one of these reasons: `missing-unit`,
`missing-target`, `untranslated`, or `source-changed`. See
[Apply returned translations](/docs/translation-preparation/#apply-returned-translations) for the
meaning of each reason and for the safety rules of the write step.

These stay as they are:

- Valid translations, also when the current Business Central terminology uses a different word.
- Units with review, placeholder, inline-code, length, or glossary findings. They are listed for
  manual review. The final gate can fail because of them; the skill then reports that the
  translation is not ready for release.
- Locked units (`translate="no"`), obsolete units, the generated `.g.xlf`, `app.json`, and the
  context-language file.

**Limit:** an AL change that does not change the generated source text, for example new behavior
behind the same caption, is not found as a source change.

## Terminology

The skill uses the latest released Business Central terminology of the target language
(`--bc-version current`). `prepare` prints the resolved version and records it in the package
manifest. If the terminology is not available, `prepare` gives a warning and continues, and the
skill reports that no Microsoft terminology was supplied. It does not change to a different
version or country.

See [Translation Preparation](/docs/translation-preparation/) for the package contents.
