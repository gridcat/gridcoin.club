import type { ServiceEntity } from '@/entities/ServiceEntity';

// First-party services we run. Add new entries here as they come online;
// flip `status` from 'hidden' to 'soon' to reveal a coming-soon tile, or
// to 'live' to show the full SSR'd live-stat tile.
//
// Order is the order they appear in the hive on the home page, and the hive
// fills its rows 3-4-3, so the three live services lead the top row.
//
// `gradient` is each service's own mainnet primary.dark -> primary.light,
// copied from its theme.ts. grcdraw has no frontend yet, so its pair is set
// here first and its theme.ts should be made to match when one exists.
export const services: ServiceEntity[] = [
  {
    slug: 'stamp',
    name: 'Stamp',
    tagline: 'Notarize files on the Gridcoin blockchain. Hash never leaves your browser.',
    url: 'https://stamp.gridcoin.club',
    color: '#732DE2',
    gradient: ['#4c1ea4', '#953EF5'],
    mark: 'stamp',
    short: 'Notarize any file',
    status: 'live',
    liveSource: 'stamp',
  },
  {
    slug: 'addnodes',
    name: 'Addnodes',
    // Links to the hub page rather than a subdomain site, because
    // addnodes.gridcoin.club serves plain text to wallets.
    //
    // Magenta rather than the indigo it used to wear: addnodes has no site of
    // its own, so it is the one service free to move, and four of ten sat in
    // a 32-degree slice of blue. It was 5.0 dE from explorer where their
    // gradients met; it is 12.2 from its nearest neighbour now.
    liveSource: 'addnodes',
    tagline: 'A continuously checked list of reachable Gridcoin peers, in addnode= format.',
    url: '/nodes',
    color: '#ab2b9f',
    gradient: ['#700f67', '#dd64d1'],
    mark: 'addnodes',
    short: 'A live list of peers',
    status: 'live',
  },
  {
    slug: 'grcbazaar',
    name: 'grcbazaar',
    tagline: 'Community marketplace for Gridcoin. Buy and sell peer-to-peer, pay in GRC.',
    url: 'https://grcbazaar.com',
    color: '#2C74B0',
    gradient: ['#1E5180', '#4F92CE'],
    mark: 'grcbazaar',
    short: 'Buy and sell in GRC',
    status: 'live',
    // No liveSource: grcbazaar exposes no public stat endpoint, so the
    // tile renders without a live-stat line (ServiceCard handles a
    // missing source by omitting the stat row).
  },
  {
    slug: 'grcpay',
    name: 'GRCpay',
    tagline: 'Self-hosted payment facilitator. One-shot wallets, automatic forwarding.',
    url: 'https://grcpay.gridcoin.club',
    color: '#0a8f6b',
    gradient: ['#066047', '#33b58d'],
    mark: 'grcpay',
    short: 'One-shot wallets',
    status: 'soon',
    liveSource: 'grcpay',
  },
  {
    slug: 'explorer',
    name: 'Explorer',
    tagline: 'Block explorer for the Gridcoin mainnet.',
    url: 'https://explorer.gridcoin.club',
    color: '#1565c0',
    gradient: ['#003c8f', '#5e92f3'],
    mark: 'explorer',
    short: 'Blocks and beacons',
    status: 'soon',
    liveSource: 'explorer',
  },
  {
    slug: 'radio',
    name: 'Grid Radio',
    tagline: 'Every block hash compiles to ninety seconds of ambient music. Same block, same tune, forever.',
    url: 'https://radio.gridcoin.club',
    color: '#00838f',
    gradient: ['#005662', '#4fb3bf'],
    mark: 'radio',
    short: 'The chain as music',
    status: 'soon',
  },
  {
    slug: 'grcfeed',
    name: 'grcfeed',
    tagline: 'Live Gridcoin block feed over MQTT. Subscribe once and every new block arrives as it lands.',
    url: 'https://feed.gridcoin.club',
    color: '#c62828',
    gradient: ['#8e0000', '#ff5f52'],
    mark: 'grcfeed',
    short: 'Live blocks over MQTT',
    status: 'hidden',
  },
  {
    slug: 'grcfate',
    name: 'grcfate',
    tagline: 'Ask a yes-or-no question and let the blockchain answer. Commit-reveal, so nobody can fudge it.',
    url: 'https://fate.gridcoin.club',
    color: '#ad1457',
    gradient: ['#78002e', '#e35183'],
    mark: 'grcfate',
    short: 'Ask the chain a question',
    status: 'hidden',
  },
  {
    slug: 'faucet',
    name: 'Faucet',
    tagline: 'Free testnet GRC for anyone building against the Gridcoin testnet.',
    url: 'https://faucet.gridcoin.club',
    color: '#0288d1',
    gradient: ['#005b9f', '#5eb8ff'],
    mark: 'faucet',
    short: 'Free testnet GRC',
    status: 'hidden',
  },
  {
    slug: 'grcdraw',
    name: 'grcdraw',
    tagline: 'Provably fair random draws, anchored to the Gridcoin blockchain.',
    url: 'https://draw.gridcoin.club',
    color: '#7e57c2',
    gradient: ['#5b3a8e', '#a06fd6'],
    mark: 'grcdraw',
    short: 'Provably fair draws',
    status: 'hidden',
  },
];
