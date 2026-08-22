// Rendering and publishing the seven output files.
//
// The .txt is the load-bearing one. Wallet entrypoints `cat` it straight into
// gridcoinresearch.conf (see grc-wallet/entrypoint.sh), so it must stay valid
// conf syntax: `addnode=` lines and `#` comments, nothing else. The byte shape
// mirrors addnodes.cycy.me so an existing config migrates with a hostname edit
// and nothing more.
//
// Publishing is all-or-nothing and never destructive. A failed run leaves the
// previous files exactly as they were — a list an hour stale still bootstraps
// a wallet, a missing one does not, and a missing one breaks image builds,
// which is the problem this service exists to fix.

import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { classifyHost } from '../addr';
import { MAINNET_P2P_PORT, TESTNET_P2P_PORT } from '../addr';
import type { Network, NodeRow } from '../../db/database';
import type { Candidate, Selection } from './score';
import type { UptimeStats } from '../uptime';

export const CONF_COMMENT_COLUMN = 51;

/** Resolve a region label without shipping an ISO 3166 table. */
let regionNames: Intl.DisplayNames | null = null;
try {
  regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
} catch {
  // Node built without full ICU. Country codes are still perfectly readable.
  regionNames = null;
}

export function countryLabel(cc: string | null): string | null {
  if (!cc) return null;
  try {
    return regionNames?.of(cc) ?? cc;
  } catch {
    return cc;
  }
}

export function defaultPort(network: Network): number {
  return network === 'main' ? MAINNET_P2P_PORT : TESTNET_P2P_PORT;
}

/**
 * What a wallet should actually connect to.
 *
 * A forward-confirmed PTR is preferred over the raw address: it is friendlier,
 * it survives the operator changing IP, and it publishes a name the operator
 * chose rather than one they did not. The port is emitted only when it is not
 * the network default, keeping the common case identical to cycy's lines.
 */
export function confTarget(node: Pick<NodeRow, 'host' | 'port' | 'ptr' | 'network'>): string {
  const host = node.ptr || node.host;
  const needsPort = Number(node.port) !== defaultPort(node.network);
  if (!needsPort) return host;
  return classifyHost(host) === 'ipv6' ? `[${host}]:${node.port}` : `${host}:${node.port}`;
}

/** The trailing `# ...` note: an operator label wins over the geo lookup. */
export function confComment(node: Pick<NodeRow, 'label' | 'cc'>): string | null {
  if (node.label) return node.label;
  return countryLabel(node.cc);
}

function confLine(c: Candidate): string {
  const left = `addnode=${confTarget(c.node)}`;
  const comment = confComment(c.node);
  if (!comment) return left;
  const pad = Math.max(1, CONF_COMMENT_COLUMN - left.length);
  return `${left}${' '.repeat(pad)}# ${comment}`;
}

function header(generatedAt: Date): string {
  const stamp = generatedAt.toUTCString().replace('GMT', 'UTC');
  const line = (text: string) => `# ${text.padEnd(75)} #`;
  return [
    '#'.repeat(79),
    line(''),
    line('Gridcoin Addnodes'),
    line(`Last updated: ${stamp}`),
    line(''),
    line('Regenerated every 15 minutes. Copy the addnodes you want into'),
    line('gridcoinresearch.conf in:'),
    line(''),
    line('  Windows: C:\\Users\\<username>\\AppData\\Roaming\\GridcoinResearch'),
    line('  macOS:   /Users/<username>/Library/Application Support/GridcoinResearch'),
    line('  Linux:   /home/<username>/.GridcoinResearch'),
    line(''),
    line('https://gridcoin.club/nodes'),
    line('Delisting and contact: https://gridcoin.club/about'),
    line(''),
    '#'.repeat(79),
  ].join('\n');
}

/**
 * The conf file. Verified-reachable entries ONLY.
 *
 * This deliberately does not carry the `unreachable` tier, even though the
 * JSON does. The file gets `cat`ed straight into gridcoinresearch.conf, and
 * the wallet ignores `#` comments: every addnode= line is a peer it will
 * spend connection attempts on, whichever heading sat above it. Publishing
 * addresses we know did not answer would quietly spend those attempts on
 * hosts we already know are not listening, and we have a large surplus of
 * ones that did answer.
 *
 * A tool that wants the second tier can read it from mainnet.json, where the
 * distinction survives because the consumer can see it.
 */
export function renderTxt(selection: Selection, generatedAt: Date): string {
  const parts = [header(generatedAt), ''];

  parts.push('# Answered a connection when this file was generated:');
  if (selection.online.length) {
    parts.push(...selection.online.map(confLine));
  } else {
    parts.push('# (none)');
  }
  parts.push('');

  return `${parts.join('\n')}\n`;
}

function isoOrNull(value: Date | null | undefined): string | null {
  return value ? new Date(value).toISOString() : null;
}

function publicNode(c: Candidate) {
  return {
    id: Number(c.node.id),
    host: c.node.host,
    port: Number(c.node.port),
    addnode: confTarget(c.node),
    ptr: c.node.ptr,
    label: c.node.label,
    cc: c.node.cc,
    city: c.node.city,
    // DECIMAL comes back from MariaDB as a string; coerce at the edge so the
    // published JSON carries numbers, not quoted numbers.
    lat: c.node.lat === null ? null : Number(c.node.lat),
    lon: c.node.lon === null ? null : Number(c.node.lon),
    asn: c.node.asn === null ? null : Number(c.node.asn),
    asnOrg: c.node.asn_org,
    status: c.node.status,
    uptime7d: c.stats.ratio,
    firstSeen: isoOrNull(c.node.first_seen_at as unknown as Date),
    lastSeen: isoOrNull(c.node.last_seen_at as unknown as Date),
    lastOnlineAt: isoOrNull(c.node.last_online_at as unknown as Date),
  };
}

export function renderCappedJson(
  network: Network,
  selection: Selection,
  generatedAt: Date,
): string {
  return `${JSON.stringify({
    generatedAt: generatedAt.toISOString(),
    network,
    count: selection.online.length,
    nodes: selection.online.map(publicNode),
    unreachable: selection.unreachable.map(publicNode),
  }, null, 2)}\n`;
}

export interface AllJsonEntry extends ReturnType<typeof publicNode> {
  uptime: string;
  sources: string[];
}

export function renderAllJson(
  network: Network,
  candidates: Candidate[],
  sources: Map<number, string[]>,
  generatedAt: Date,
): string {
  const nodes = candidates.map((c) => ({
    ...publicNode(c),
    // 168 chars, one per hour: '1' up, '0' down, '-' not probed. Sent whole
    // so the page can draw a week bar without a second request.
    uptime: c.stats.series,
    sources: sources.get(Number(c.node.id)) ?? [],
  }));
  return `${JSON.stringify({
    generatedAt: generatedAt.toISOString(),
    network,
    count: nodes.length,
    nodes,
  }, null, 2)}\n`;
}

/**
 * Static companions to the generated lists.
 *
 * Written by the job rather than dropped in the web root by hand, so a wiped
 * or freshly provisioned directory comes back complete on the next run
 * instead of quietly serving 503 for them.
 */
export function renderRobotsTxt(): string {
  return [
    '# https://addnodes.gridcoin.club',
    'User-agent: *',
    'Allow: /$',
    'Allow: /mainnet.txt',
    'Allow: /mainnet.json',
    'Allow: /mainnet-all.json',
    '# Testnet data is noise for a search index.',
    'Disallow: /testnet',
    'Disallow: /testnet.txt',
    'Disallow: /testnet.json',
    'Disallow: /testnet-all.json',
    '# The ingest endpoint takes POSTs from wallets; there is nothing to crawl.',
    'Disallow: /v1/',
    '',
    'llms.txt: https://addnodes.gridcoin.club/llms.txt',
    '',
  ].join('\n');
}

export function renderLlmsTxt(): string {
  return `# Gridcoin addnodes

> A continuously checked list of reachable Gridcoin peers, published in the
> \`addnode=\` format the Gridcoin wallet reads directly. Free, no signup, no
> API key. Regenerated every 15 minutes.

Every address is verified by connecting to it from our own infrastructure.
A peer only appears in a list after it answered; nodes that stop answering are
retried on a growing backoff, and long-dead ones are still retried daily so a
node that comes back is picked up again. Candidates come from our own Gridcoin
nodes' address books, a seed list, and optional peer reports from
gridcoinresearch-tui users.

## Lists

- [Mainnet](https://addnodes.gridcoin.club/): plain text, valid gridcoinresearch.conf syntax. Also at /mainnet.txt
- [Testnet](https://addnodes.gridcoin.club/testnet): the same for testnet. Also at /testnet.txt

## Machine-readable

- [Mainnet JSON](https://addnodes.gridcoin.club/mainnet.json): the published set with country, provider and 7-day uptime
- [Testnet JSON](https://addnodes.gridcoin.club/testnet.json): the same for testnet
- [Full mainnet inventory](https://addnodes.gridcoin.club/mainnet-all.json): every node tracked, including unreachable ones, with a 168-hour reachability series
- [Full testnet inventory](https://addnodes.gridcoin.club/testnet-all.json): the same for testnet
- [Status](https://addnodes.gridcoin.club/status.json): generator health and per-network counts

## Optional

- [About the list](https://gridcoin.club/nodes): what it is and how it is built
- [Every node we track](https://gridcoin.club/nodes/all): browsable inventory
- [Contact and delisting](https://gridcoin.club/about): ask for a node to be removed
`;
}

export interface StatusPayload {
  ok: boolean;
  error?: string | null;
  generatedAt: string;
  lastSuccessAt: string | null;
  ageSeconds: number | null;
  reportsIngested24h: number;
  lastRunSeconds: number | null;
  networks: Record<string, { online: number; unreachable: number; total: number }>;
}

export function renderStatus(payload: StatusPayload): string {
  return `${JSON.stringify(payload, null, 2)}\n`;
}

/* ------------------------------------------------------------ publishing */

const TMP_PREFIX = '.tmp-';

/**
 * Write every file to a temp name in the SAME directory, then rename each into
 * place. rename() does not cross filesystems, so the temps must live on the
 * output mount — never in /tmp — or a partially-written file becomes visible
 * to nginx.
 */
export async function publishFiles(dir: string, files: Map<string, string>): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
  const written: Array<{ tmp: string; final: string }> = [];
  try {
    for (const [name, contents] of Array.from(files.entries())) {
      const tmp = path.join(dir, `${TMP_PREFIX}${name}.${process.pid}`);
      await fs.writeFile(tmp, contents, 'utf8');
      written.push({ tmp, final: path.join(dir, name) });
    }
    for (const { tmp, final } of written) {
      await fs.rename(tmp, final);
    }
  } catch (err) {
    await Promise.all(written.map(({ tmp }) => fs.rm(tmp, { force: true })));
    throw err;
  }
}

/** Remove any temp files a previous crashed run left behind. */
export async function cleanTemps(dir: string): Promise<void> {
  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return;
  }
  await Promise.all(
    entries
      .filter((e) => e.startsWith(TMP_PREFIX))
      .map((e) => fs.rm(path.join(dir, e), { force: true })),
  );
}

export interface PreviousCounts {
  online: number;
  total: number;
}

export async function readPreviousCounts(
  dir: string,
  network: Network,
): Promise<PreviousCounts | null> {
  try {
    const raw = await fs.readFile(path.join(dir, `${netFile(network)}.json`), 'utf8');
    const parsed = JSON.parse(raw) as { count?: number; nodes?: unknown[] };
    const online = Number(parsed.count ?? parsed.nodes?.length ?? 0);
    return { online, total: online };
  } catch {
    return null;
  }
}

export async function readPreviousStatus(dir: string): Promise<Partial<StatusPayload> | null> {
  try {
    const raw = await fs.readFile(path.join(dir, 'status.json'), 'utf8');
    return JSON.parse(raw) as Partial<StatusPayload>;
  } catch {
    return null;
  }
}

export function netFile(network: Network): string {
  return network === 'main' ? 'mainnet' : 'testnet';
}

/**
 * Would publishing this set make the list worse than leaving it alone?
 *
 * A syntactically perfect but empty list is worse than a stale one, and so is
 * one that lost most of its entries in a single 15-minute tick — that is far
 * more likely to be our bug than the network's collapse.
 */
export function publishGate(
  nextOnline: number,
  previous: PreviousCounts | null,
): { publish: boolean; reason?: string } {
  if (!previous || previous.online === 0) return { publish: true };
  if (nextOnline === 0) {
    return { publish: false, reason: `would drop to zero from ${previous.online}` };
  }
  if (nextOnline < previous.online * 0.3) {
    return {
      publish: false,
      reason: `would drop from ${previous.online} to ${nextOnline}, more than 70%`,
    };
  }
  return { publish: true };
}
