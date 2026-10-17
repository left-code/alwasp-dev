---
title: Context commands removed
description: Migration notice for the context command group removed in ALWasp 0.6.0.
order: 6.6
---

# Context commands removed

ALWasp 0.6.0 removes `alwasp context search`, `object`, `usages`, and `prepare`,
their `--dependency-source-folder` option, and the context package schema. Remove these commands
from agent workflows and scripts before upgrading. Context packages from earlier releases are
no longer a supported output contract.

For source dependency/object graphs, references, public APIs, and impacted tests, use
[Source Analysis](/docs/analyze/). Analysis reads source and Git; it does not replace the removed
restored-symbol inspection or context package preparation workflow.

See [0.6.0 release notes](/docs/release-notes/#060--2026-10-17).
