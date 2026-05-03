import type { ToolEntity } from '@/entities/ToolEntity';

// Open-source developer tools we maintain on github.com/gridcat. These are
// libraries / GitHub Actions / CLIs — not hosted services, hence a separate
// bucket from src/data/services.ts. Edits via PR. Set status:'hidden' to
// stage entries before they go public.
export const tools: ToolEntity[] = [
  {
    slug: 'gridcoin-rpc',
    name: 'gridcoin-rpc',
    blurb: 'Promise-based JSON-RPC client for the Gridcoin wallet daemon. Typed methods, thin proxy over the daemon RPC.',
    repo: 'https://github.com/gridcat/gridcoin-rpc',
    tags: ['library', 'typescript', 'rpc'],
    status: 'live',
  },
  {
    slug: 'gridcoin-stamp-action',
    name: 'gridcoin-stamp-action',
    blurb: 'GitHub Action that timestamps your release artifacts on the Gridcoin blockchain via stamp.gridcoin.club, with byte-stable proofs.',
    repo: 'https://github.com/gridcat/gridcoin-stamp-action',
    tags: ['github-action', 'typescript', 'ci', 'stamping'],
    status: 'live',
  },
  {
    slug: 'gridcoinresearch-tui',
    name: 'gridcoinresearch-tui',
    blurb: 'Terminal UI wrapper for a running Gridcoin Research wallet — balance, staking status, send. Single static Go binary.',
    repo: 'https://github.com/gridcat/gridcoinresearch-tui',
    tags: ['cli', 'tui', 'go', 'wallet'],
    status: 'live',
  },
];
