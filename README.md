# Gridcoin Club

**Apex hub at [gridcoin.club](https://gridcoin.club) — directory of our tools plus a curated list of fellow Gridcoin projects.**

This Nx monorepo houses the front door for the Gridcoin Club family. It is a server-rendered Next.js site that lists the services we run under `*.gridcoin.club` (stamp, grcpay, explorer, …) alongside an old-web "links to friends" directory of community projects, and points to gridcat's repos.

Every page is server-rendered with fresh stats pulled from sibling APIs at request time, so first paint already shows real numbers — no client hydration flash, no JS-required content, fully indexable.

## Packages

| Package | Description |
|---|---|
| [`packages/grc-hub-frontend`](packages/grc-hub-frontend) | Public site — Next.js 16 / React 19 / MUI 9. SSR + ISR home page, curated `/projects` directory, `/about`. |

## Local development

Requires Node 22.16.0 (see `.nvmrc`) and npm 10.9.0.

```bash
# Install root devDeps + Nx
npm install

# Frontend (port 3003) — separate terminal
cd packages/grc-hub-frontend && npm install && npm run dev
```

## Workspace commands

Nx targets are wired up in each package's `project.json`. Run them across all packages from the repo root:

```bash
npm run dev:typecheck     # nx run-many --target=typecheck --all
npm run dev:test:lint     # nx run-many --target=test:lint --all
npm run dev:test:unit     # nx run-many --target=test:unit --all
npm run dev:test          # unit + lint
```

## Adding a project to the directory

Edit `packages/grc-hub-frontend/src/data/projects.ts` (curated external projects) or `services.ts` (our own *.gridcoin.club tools). Each entry has a `status` field:

- `live` — visible on the site
- `soon` — rendered as a "coming soon" tile
- `hidden` — filtered out at build (use this to stage entries before they are public)

Submit via PR.

## Conventional commits

This repo uses [Conventional Commits](https://www.conventionalcommits.org/). Use `npm run commit` (commitizen) inside each package for an interactive prompt, or follow the `type(scope): subject` convention manually.

## CI/CD

- **CircleCI** runs lint, typecheck, unit tests on every push, and builds Docker images on `grc-hub-frontend-v*` tags (`ghcr.io/gridcat/grc-hub-frontend`).
- **GitHub Actions** stamps each release on the Gridcoin blockchain via [gridcat/gridcoin-stamp-action](https://github.com/gridcat/gridcoin-stamp-action) (we eat our own dog food).

## License

MIT — see [LICENSE](./LICENSE).
