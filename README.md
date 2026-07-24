# alwasp-dev

Public home for **ALWasp** — documentation, the `alwasp.json` config schema, examples, and
user support.

- 📖 **Docs:** <https://alwasp.dev>
- 🧩 **Config schema:** <https://alwasp.dev/schema/alwasp.schema.json>
  (reference it from your `alwasp.json` via `"$schema"`)
- 🐛 **Issues / questions:** use this repo's [Issues](../../issues) and
  [Discussions](../../discussions)

ALWasp is a .NET command-line tool for Business Central AL symbol restore and build
workflows. Install it from NuGet:

```bash
dotnet tool install --global left-code.AlWasp
```

## This repository

This is an [Astro](https://astro.build) site, deployed to GitHub Pages at `alwasp.dev`.

Prerequisites:

- Node.js `18.20.8`, `20.3.0` or newer in the Node 20 line, or Node.js 22+
- npm `9.6.5` or newer

```bash
npm ci          # install dependencies
npm run dev     # local dev server
npm run build   # production build to ./dist
npm run preview # preview the production build
```

| Path | Contents |
|---|---|
| `src/content/docs/` | Documentation pages (Markdown content collection) |
| `src/pages/` | Site pages (home, examples, docs routes) |
| `public/schema/alwasp.schema.json` | Published config JSON Schema |
| `public/CNAME` | GitHub Pages custom domain (`alwasp.dev`) |

The config schema published here is a copy of the canonical schema maintained alongside the
ALWasp tool; it is kept in sync on each tool release.

## Release synchronization

The version in `package.json` and `package-lock.json` is the ALWasp tool version documented by this
site, not an independently versioned npm release. This repository is marked `private` and must not
be published to npm.

For every ALWasp release:

1. Copy the canonical `schemas/alwasp.schema.json` from the tool repository to
   `public/schema/alwasp.schema.json`.
2. Update documentation and examples for all behavior changes since the previous matching tag.
3. Set the exact tool version without creating an npm-generated tag:

   ```bash
   npm version <tool-version> --no-git-tag-version
   ```

4. Run `npm ci` and `npm run build`.
5. Commit the synchronized site and tag that commit with the same `v<tool-version>` tag used in the
   tool repository.

For example, tool version `0.1.0-preview.13` corresponds to documentation package version
`0.1.0-preview.13` and git tag `v0.1.0-preview.13`. Matching tags keep documentation history aligned
with the exact CLI and schema it describes and give the next release a clear comparison baseline.

## License

[MIT](./LICENSE).
