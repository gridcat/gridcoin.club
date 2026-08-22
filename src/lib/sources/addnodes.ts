// SSR source for the published node lists.
//
// Reads the same static JSON that nginx serves to everyone else, rather than
// the database. That is the point: the list pages keep rendering through a
// MariaDB outage, and they can never disagree with what a wallet fetching the
// text file would see, because they are reading the same projection.

import { serverFetch } from '../serverFetch';

export type NodeStatus = 'new' | 'online' | 'unreachable' | 'dead';
export type NetworkKey = 'main' | 'test';

export interface PublishedNode {
  id: number;
  host: string;
  port: number;
  addnode: string;
  ptr: string | null;
  label: string | null;
  cc: string | null;
  asn: number | null;
  asnOrg: string | null;
  status: NodeStatus;
  uptime7d: number | null;
  firstSeen: string | null;
  lastSeen: string | null;
  lastOnlineAt: string | null;
  /** Only present in the full inventory: 168 chars, '1' up, '0' down, '-' not probed. */
  uptime?: string;
  sources?: string[];
}

export interface NodeList {
  generatedAt: string;
  network: NetworkKey;
  count: number;
  nodes: PublishedNode[];
  unreachable?: PublishedNode[];
}

export interface AddnodesStatus {
  ok: boolean;
  error?: string | null;
  generatedAt: string;
  lastSuccessAt: string | null;
  ageSeconds: number | null;
  reportsIngested24h: number;
  networks: Record<string, { online: number; unreachable: number; total: number }>;
}

export const ADDNODES_BASE_URL = process.env.ADDNODES_BASE_URL
  || 'https://addnodes.gridcoin.club';

/** The public host, used for the copy-paste wget snippets on the page. */
export const ADDNODES_PUBLIC_URL = process.env.NEXT_PUBLIC_ADDNODES_URL
  || 'https://addnodes.gridcoin.club';

function url(file: string): string {
  return `${ADDNODES_BASE_URL.replace(/\/$/, '')}/${file}`;
}

// The published inventory is ~125 KB; the 2s default in serverFetch is aimed
// at small status pings, so give these a little more room.
const LIST_TIMEOUT_MS = 4000;

export function fetchPublished(network: NetworkKey): Promise<NodeList | null> {
  return serverFetch<NodeList>(url(`${network === 'main' ? 'mainnet' : 'testnet'}.json`), {
    timeoutMs: LIST_TIMEOUT_MS,
  });
}

export function fetchInventory(network: NetworkKey): Promise<NodeList | null> {
  return serverFetch<NodeList>(url(`${network === 'main' ? 'mainnet' : 'testnet'}-all.json`), {
    timeoutMs: LIST_TIMEOUT_MS,
  });
}

export function fetchStatus(): Promise<AddnodesStatus | null> {
  return serverFetch<AddnodesStatus>(url('status.json'));
}

export interface BothNetworks {
  main: NodeList | null;
  test: NodeList | null;
  status: AddnodesStatus | null;
}

/**
 * allSettled so one missing file degrades that network's table rather than
 * the whole page — the same posture as the home page's sibling stats.
 */
export async function fetchPublishedBoth(): Promise<BothNetworks> {
  const [main, test, status] = await Promise.allSettled([
    fetchPublished('main'), fetchPublished('test'), fetchStatus(),
  ]);
  return {
    main: main.status === 'fulfilled' ? main.value : null,
    test: test.status === 'fulfilled' ? test.value : null,
    status: status.status === 'fulfilled' ? status.value : null,
  };
}

export async function fetchInventoryBoth(): Promise<BothNetworks> {
  const [main, test, status] = await Promise.allSettled([
    fetchInventory('main'), fetchInventory('test'), fetchStatus(),
  ]);
  return {
    main: main.status === 'fulfilled' ? main.value : null,
    test: test.status === 'fulfilled' ? test.value : null,
    status: status.status === 'fulfilled' ? status.value : null,
  };
}

export interface AddnodesStats {
  /** Every node we track, both networks. */
  total: number | null;
  /** How many of those answered their most recent check. */
  online: number | null;
  lastSuccessAt: string | null;
}

export async function fetchAddnodesStats(): Promise<AddnodesStats> {
  const status = await fetchStatus();
  if (!status) return { total: null, online: null, lastSuccessAt: null };

  const networks = Object.values(status.networks ?? {});
  const sum = (pick: (n: { online: number; total: number }) => number) => (
    networks.length ? networks.reduce((acc, n) => acc + (pick(n) || 0), 0) : null
  );

  return {
    total: sum((n) => n.total),
    online: sum((n) => n.online),
    lastSuccessAt: status.lastSuccessAt,
  };
}
