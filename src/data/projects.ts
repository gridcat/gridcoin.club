import type { ProjectEntity } from '@/entities/ProjectEntity';

// Curated list of fellow Gridcoin projects — old-web "links to friends".
// Edits via PR. Set status:'hidden' to stage entries before they go public,
// 'soon' to render a teaser without an outbound link, 'live' to ship.
//
// Logos live under public/projects/ and are vendored locally (no third-
// party hotlinks). When adding a new project, drop a square-ish image
// (PNG/JPG/SVG) into that folder and reference it via the `logo` field.
export const projects: ProjectEntity[] = [
  {
    name: 'gridcoin.us',
    url: 'https://gridcoin.us',
    blurb: 'Official project homepage and entry point for newcomers.',
    category: 'docs',
    tags: ['official'],
    status: 'live',
    logo: '/projects/gridcoin-us.png',
  },
  {
    name: 'Gridcoin Wiki',
    url: 'https://wiki.gridcoin.us',
    blurb: 'Community-maintained encyclopedia covering protocol, BOINC integration, and operations.',
    category: 'docs',
    tags: ['reference'],
    status: 'live',
    // Wiki redirects to gridcoin.us/wiki — same brand mark, same logo file.
    logo: '/projects/gridcoin-us.png',
  },
  {
    name: 'gridcoinstats.eu',
    url: 'https://gridcoinstats.eu',
    blurb: 'Long-running independent block explorer and network statistics dashboard, with a built-in faucet.',
    category: 'stats',
    tags: ['explorer', 'mainnet', 'faucet'],
    status: 'live',
  },
  {
    name: 'testnet.gridcoinstats.eu',
    url: 'https://testnet.gridcoinstats.eu',
    blurb: 'Testnet sibling of gridcoinstats.eu: block explorer, stats, and testnet faucet.',
    category: 'stats',
    tags: ['explorer', 'testnet', 'faucet'],
    status: 'live',
  },
  {
    name: 'Gridcoin.Network',
    url: 'https://gridcoin.network',
    blurb: 'Block explorer plus staking-time and price-conversion calculators for the Gridcoin mainnet.',
    category: 'stats',
    tags: ['explorer', 'mainnet', 'calculator'],
    status: 'live',
    logo: '/projects/gridcoin-network.svg',
  },
  {
    name: 'gridcoin-community on GitHub',
    url: 'https://github.com/gridcoin-community',
    blurb: 'Community organization hosting auxiliary tooling, plugins, and integrations.',
    category: 'community',
    tags: ['code'],
    status: 'live',
    logo: '/projects/gridcoin-community-github.png',
  },
  {
    name: 'BOINC',
    url: 'https://boinc.berkeley.edu',
    blurb: 'Volunteer computing platform. Gridcoin rewards participation with GRC.',
    category: 'mining',
    tags: ['boinc'],
    status: 'live',
    logo: '/projects/boinc.png',
  },
  {
    name: 'GRC Pool',
    url: 'https://www.grcpool.com',
    blurb: 'Long-running Gridcoin mining pool. Aggregates BOINC contributions and pays GRC rewards by magnitude share.',
    category: 'pools',
    tags: ['boinc'],
    status: 'live',
    // No logo vendored yet — falls back to the initial-letter chip.
  },
  {
    name: 'Gridcoin Switzerland',
    url: 'https://gridcoin.ch',
    blurb: 'Daily Gridcoin faucet plus network statistics dashboards. Free GRC every day for newcomers.',
    category: 'tool',
    tags: ['faucet', 'stats'],
    status: 'live',
    logo: '/projects/gridcoin-ch.png',
  },
  {
    name: 'Freegridco.in',
    url: 'https://freegridco.in',
    blurb: 'Gridcoin faucet bundled with open-source provably-fair on-chain games.',
    category: 'tool',
    tags: ['faucet'],
    status: 'live',
    // No logo vendored yet — falls back to the initial-letter chip.
  },
  {
    name: 'Gridcoin Plateaux',
    url: 'https://www.gridcoin.pl',
    blurb: 'Independent European node operator running DNS seeds, full nodes, and Tor hidden services for Gridcoin.',
    category: 'tool',
    tags: ['nodes', 'infrastructure'],
    status: 'live',
    // No logo vendored yet — falls back to the initial-letter chip.
  },
];
