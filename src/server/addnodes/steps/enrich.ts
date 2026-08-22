// Reverse DNS and geo enrichment.
//
// Two independent labels, both cosmetic and both allowed to fail:
//
//   ptr  a reverse-DNS name, kept ONLY when it forward-confirms back to the
//        same address. An unconfirmed PTR is attacker-controlled — anyone can
//        point a PTR at "gridcoin.org" — and we publish this string into
//        people's wallet configs, so an unverified name is not acceptable.
//
//   cc / asn  from the CSVs baked into the image. Purely a comment on a line.
//
// Both are re-checked every 30 days rather than once: hosting moves, and a
// stale country note is a small lie that compounds.

import { promises as dns } from 'node:dns';
import type { NodeRow } from '../../db/database';
import { classifyHost } from '../addr';
import type { GeoLookup } from '../geo';
import type { NodeStateUpdate } from '../repository';
import { log } from '../../log';

export const ENRICH_BUDGET = 300;
export const ENRICH_CONCURRENCY = 10;
export const RECHECK_AFTER_DAYS = 30;
const DNS_TIMEOUT_MS = 3000;

function stale(checkedAt: Date | null | undefined, now: Date): boolean {
  if (!checkedAt) return true;
  const age = now.getTime() - new Date(checkedAt).getTime();
  return age > RECHECK_AFTER_DAYS * 24 * 60 * 60 * 1000;
}

export function selectEnrichQueue(
  nodes: NodeRow[],
  now: Date,
  budget = ENRICH_BUDGET,
): NodeRow[] {
  return nodes
    .filter((n) => stale(n.ptr_checked_at as Date | null, now)
      || stale(n.geo_checked_at as Date | null, now))
    // Nodes we can actually reach are worth labelling first; the rest can
    // wait for a later run.
    .sort((a, b) => {
      const rank = (n: NodeRow) => (n.status === 'online' ? 0 : n.status === 'unreachable' ? 1 : 2);
      return rank(a) - rank(b);
    })
    .slice(0, budget);
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    p.catch(() => null),
    new Promise<null>((resolve) => { setTimeout(() => resolve(null), ms).unref?.(); }),
  ]);
}

/**
 * The address to geolocate.
 *
 * Seed entries are hostnames, and most of the published list comes from the
 * seed file, so geolocating only IP literals would leave the country blank on
 * exactly the rows people see. Resolve the name first and locate where it
 * actually points.
 */
export async function geoTarget(host: string): Promise<string | null> {
  const kind = classifyHost(host);
  if (kind === 'ipv4' || kind === 'ipv6') return host;
  if (kind !== 'hostname') return null;

  const v4 = await withTimeout(dns.resolve4(host), DNS_TIMEOUT_MS);
  if (v4 && v4.length) return v4[0];
  const v6 = await withTimeout(dns.resolve6(host), DNS_TIMEOUT_MS);
  if (v6 && v6.length) return v6[0];
  return null;
}

/**
 * Reverse lookup, then forward-confirm. Returns null unless some PTR name
 * resolves back to the address we started from.
 */
export async function forwardConfirmedPtr(host: string): Promise<string | null> {
  const kind = classifyHost(host);
  if (kind !== 'ipv4' && kind !== 'ipv6') return null;

  const names = await withTimeout(dns.reverse(host), DNS_TIMEOUT_MS);
  if (!names || !names.length) return null;

  for (const name of names.slice(0, 3)) {
    const forward = kind === 'ipv4'
      ? await withTimeout(dns.resolve4(name), DNS_TIMEOUT_MS)
      : await withTimeout(dns.resolve6(name), DNS_TIMEOUT_MS);
    if (forward && forward.some((a) => a.toLowerCase() === host.toLowerCase())) {
      return name.replace(/\.$/, '').toLowerCase();
    }
  }
  return null;
}

export async function runEnrich(
  nodes: NodeRow[],
  now: Date,
  geo: GeoLookup,
  budget = ENRICH_BUDGET,
): Promise<NodeStateUpdate[]> {
  const queue = selectEnrichQueue(nodes, now, budget);
  if (!queue.length) return [];

  const updates: NodeStateUpdate[] = [];
  let cursor = 0;

  async function worker(): Promise<void> {
    for (;;) {
      const idx = cursor;
      cursor += 1;
      if (idx >= queue.length) return;
      const node = queue[idx];
      const update: NodeStateUpdate = { id: Number(node.id) };

      if (stale(node.ptr_checked_at as Date | null, now)) {
        update.ptr = await forwardConfirmedPtr(node.host);
        update.ptrCheckedAt = now;
      }

      if (geo.available && stale(node.geo_checked_at as Date | null, now)) {
        const target = await geoTarget(node.host);
        const info = target
          ? geo.lookup(target)
          : { cc: null, asn: null, asnOrg: null };
        update.cc = info.cc;
        update.asn = info.asn;
        update.asnOrg = info.asnOrg;
        update.geoCheckedAt = now;
      }

      if (Object.keys(update).length > 1) updates.push(update);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(ENRICH_CONCURRENCY, queue.length) }, () => worker()),
  );

  log.info('enrichment complete', { queued: queue.length, updated: updates.length });
  return updates;
}
