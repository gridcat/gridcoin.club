import type { ServiceEntity } from '@/entities/ServiceEntity';

// First-party services we run. Add new entries here as they come online;
// flip `status` from 'hidden' to 'soon' to reveal a coming-soon tile, or
// to 'live' to show the full SSR'd live-stat tile.
//
// Status today: only stamp is publicly live; the rest render as "coming
// soon" tiles until their public launches. The `liveSource` is preserved
// on coming-soon entries so the wiring is ready to flip to 'live' once
// each service is announced.
export const services: ServiceEntity[] = [
  {
    slug: 'stamp',
    name: 'Stamp',
    tagline: 'Notarize files on the Gridcoin blockchain. Hash never leaves your browser.',
    url: 'https://stamp.gridcoin.club',
    color: '#732DE2',
    status: 'live',
    liveSource: 'stamp',
  },
  {
    slug: 'grcpay',
    name: 'GRCpay',
    tagline: 'Self-hosted payment facilitator. One-shot wallets, automatic forwarding.',
    url: 'https://grcpay.gridcoin.club',
    color: '#0a8f6b',
    status: 'soon',
    liveSource: 'grcpay',
  },
  {
    slug: 'explorer',
    name: 'Explorer',
    tagline: 'Block explorer for the Gridcoin mainnet.',
    url: 'https://explorer.gridcoin.club',
    color: '#1565c0',
    status: 'soon',
    liveSource: 'explorer',
  },
  {
    slug: 'grcbazaar',
    name: 'grcbazaar',
    tagline: 'Community marketplace for Gridcoin. Buy and sell peer-to-peer, pay in GRC.',
    url: 'https://grcbazaar.com',
    color: '#2C74B0',
    status: 'live',
    // No liveSource: grcbazaar exposes no public stat endpoint, so the
    // tile renders without a live-stat line (ServiceCard handles a
    // missing source by omitting the stat row).
  },
];
