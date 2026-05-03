import type { ToolEntity } from '@/entities/ToolEntity';

// Open-source developer tools we maintain on github.com/gridcat. These are
// libraries / GitHub Actions / CLIs — not hosted services, hence a separate
// bucket from src/data/services.ts. Edits via PR. Set status:'hidden' to
// stage entries before they go public.
export const tools: ToolEntity[] = [
  {
    slug: 'gridcoin-rpc',
    name: 'gridcoin-rpc',
    blurb: 'Promise-based JSON-RPC client for the Gridcoin wallet daemon with typed methods. The library is a thin proxy: validation happens at the daemon, not here.',
    repo: 'https://github.com/gridcat/gridcoin-rpc',
    tags: ['library', 'typescript', 'rpc'],
    status: 'live',
  },
  {
    slug: 'gridcoin-stamp-action',
    name: 'gridcoin-stamp-action',
    blurb: 'GitHub Action that timestamps your release artifacts on the Gridcoin blockchain via stamp.gridcoin.club. Re-uploads source archives as fixed assets first, so the bytes you stamp stay verifiable years later.',
    repo: 'https://github.com/gridcat/gridcoin-stamp-action',
    tags: ['github-action', 'typescript', 'ci', 'stamping'],
    status: 'live',
  },
  {
    slug: 'gridcoinresearch-tui',
    name: 'gridcoinresearch-tui',
    blurb: 'Terminal UI for a running Gridcoin Research wallet. Shows your balance, staking status, and recent transactions; sends GRC from there. Ships as a single static Go binary.',
    repo: 'https://github.com/gridcat/gridcoinresearch-tui',
    tags: ['cli', 'tui', 'go', 'wallet'],
    status: 'live',
  },
];
