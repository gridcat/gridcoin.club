// Choosing what actually goes in the published list.
//
// A wallet gains nothing from 400 `addnode=` lines — they are persistent
// connection attempts, and cycy's list has always been a couple of dozen
// entries. A short list is also a far smaller privacy footprint, since the
// browsable inventory already exists for anyone who wants everything.
//
// Pure by construction: it takes rows and returns rows, so the caps and the
// ordering are testable without a database or a socket.

import { diversityKey } from '../addr';
import type { NodeRow } from '../../db/database';
import type { UptimeStats } from '../uptime';
import { EMPTY_STATS } from '../uptime';

export const PUBLISH_LIMIT = 25;
export const UNREACHABLE_LIMIT = 10;
/** At most this many from one IPv4 /16, IPv6 /32, or hostname suffix. */
export const MAX_PER_PREFIX = 2;
export const MAX_PER_ASN = 3;

export interface Candidate {
  node: NodeRow;
  stats: UptimeStats;
}

export interface Selection {
  online: Candidate[];
  unreachable: Candidate[];
}

export function withStats(
  nodes: NodeRow[],
  stats: Map<number, UptimeStats>,
): Candidate[] {
  return nodes.map((node) => ({
    node,
    stats: stats.get(Number(node.id)) ?? EMPTY_STATS,
  }));
}

/**
 * Best first: highest 7-day uptime, then longest known, then most independent
 * reporters. The reporter count is only ever a tie-breaker — it never
 * promotes a node past one we have actually probed more successfully.
 */
export function rank(a: Candidate, b: Candidate): number {
  const ratioA = a.stats.ratio ?? 0;
  const ratioB = b.stats.ratio ?? 0;
  if (ratioA !== ratioB) return ratioB - ratioA;

  const seenA = new Date(a.node.first_seen_at).getTime();
  const seenB = new Date(b.node.first_seen_at).getTime();
  if (seenA !== seenB) return seenA - seenB;

  return b.stats.reporters24h - a.stats.reporters24h;
}

interface CapState {
  prefix: Map<string, number>;
  asn: Map<number, number>;
}

function takeWithCaps(
  candidates: Candidate[],
  limit: number,
  caps: CapState,
): Candidate[] {
  const out: Candidate[] = [];
  for (const c of candidates) {
    if (out.length >= limit) break;
    const pkey = diversityKey(c.node.host);
    const usedPrefix = caps.prefix.get(pkey) ?? 0;
    if (usedPrefix >= MAX_PER_PREFIX) continue;

    const asn = c.node.asn === null ? null : Number(c.node.asn);
    const usedAsn = asn === null ? 0 : (caps.asn.get(asn) ?? 0);
    if (asn !== null && usedAsn >= MAX_PER_ASN) continue;

    caps.prefix.set(pkey, usedPrefix + 1);
    if (asn !== null) caps.asn.set(asn, usedAsn + 1);
    out.push(c);
  }
  return out;
}

/**
 * Pick the published set for one network.
 *
 * Pinned nodes jump the queue and skip the diversity caps — that is what an
 * operator override is for. They do NOT skip the probe gate: a pinned node
 * that is not answering stays out, because publishing a dead address is the
 * one failure that actively hurts the people using this list.
 */
export function select(
  candidates: Candidate[],
  limit = PUBLISH_LIMIT,
  unreachableLimit = UNREACHABLE_LIMIT,
): Selection {
  const eligible = candidates.filter((c) => Number(c.node.excluded ?? 0) === 0);

  const onlineAll = eligible.filter((c) => c.node.status === 'online').sort(rank);
  const pinned = onlineAll.filter((c) => Number(c.node.pinned ?? 0) === 1);
  const rest = onlineAll.filter((c) => Number(c.node.pinned ?? 0) !== 1);

  const caps: CapState = { prefix: new Map(), asn: new Map() };
  // Pinned entries still consume cap budget so the remainder stays diverse,
  // they just are not subject to it themselves.
  for (const c of pinned.slice(0, limit)) {
    const pkey = diversityKey(c.node.host);
    caps.prefix.set(pkey, (caps.prefix.get(pkey) ?? 0) + 1);
    const asn = c.node.asn === null ? null : Number(c.node.asn);
    if (asn !== null) caps.asn.set(asn, (caps.asn.get(asn) ?? 0) + 1);
  }

  const online = [
    ...pinned.slice(0, limit),
    ...takeWithCaps(rest, Math.max(0, limit - pinned.length), caps),
  ];

  const unreachable = takeWithCaps(
    eligible.filter((c) => c.node.status === 'unreachable').sort(rank),
    unreachableLimit,
    { prefix: new Map(), asn: new Map() },
  );

  return { online, unreachable };
}
