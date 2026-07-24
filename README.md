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

## License

[MIT](./LICENSE).
