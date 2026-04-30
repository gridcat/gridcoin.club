# Gridcoin Club

**Apex hub at [gridcoin.club](https://gridcoin.club) — directory of our tools plus a curated list of fellow Gridcoin projects.**

A server-rendered Next.js site that lists the services we run under `*.gridcoin.club` (stamp, grcpay, explorer, …) alongside an old-web "links to friends" directory of community projects, and points to gridcat's repos.

Every page is server-rendered with fresh stats pulled from sibling APIs at request time, so first paint already shows real numbers — no client hydration flash, no JS-required content, fully indexable.

Stack: Next.js 16 / React 19 / MUI 9 / Emotion / TypeScript.

## Local development

Requires Node 22.16.0 (see `.nvmrc`) and npm 10.9.0.

```bash
npm install
npm run dev          # http://localhost:3003
```

## Scripts

```bash
npm run build        # production build
npm run start        # serve the built app
npm run test:lint    # eslint
npm run typecheck    # tsc --noEmit
npm run test:unit    # vitest
```

## Adding a project to the directory

Edit `src/data/projects.ts` (curated external projects) or `src/data/services.ts` (our own *.gridcoin.club tools). Each entry has a `status` field:

- `live` — visible on the site
- `soon` — rendered as a "coming soon" tile
- `hidden` — filtered out at build (use this to stage entries before they are public)

Submit via PR.

## Conventional commits

This repo uses [Conventional Commits](https://www.conventionalcommits.org/). Use `npm run commit` (commitizen) for an interactive prompt, or follow the `type(scope): subject` convention manually.

## CI/CD

- **CircleCI** runs lint, typecheck, and unit tests on every push, then `semantic-release` on `master`. Docker images are built on `grc-hub-frontend-v*` tags and pushed to `ghcr.io/gridcat/grc-hub-frontend`.
- **GitHub Actions** stamps each release on the Gridcoin blockchain via [gridcat/gridcoin-stamp-action](https://github.com/gridcat/gridcoin-stamp-action) (we eat our own dog food).

## License

MIT — see [LICENSE](./LICENSE).
