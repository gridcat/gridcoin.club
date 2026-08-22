// The single place a candidate endpoint becomes (or updates) a node row.
//
// Every input path funnels through here — reports, the daemon's addrman, the
// daemon's outbound peers, the seed file — which is what makes the
// one-row-per-endpoint model true rather than aspirational. A source never
// creates its own record; it annotates the shared one and leaves a
// `node_sources` trail behind.
//
// `planUpsert` is pure so the whole fan-in can be tested with a plain object
// map and no database.

import type { Network, NodeRow, NodeSource } from '../../db/database';
import { endpointKey, type NewNodeInput, type SourceHit } from '../repository';
import { isBlocked, type BlockRule } from '../blocklist';

export interface Candidate {
  network: Network;
  host: string;
  port: number;
}

export interface UpsertPlan {
  toInsert: NewNodeInput[];
  toTouch: number[];
  sourceHits: SourceHit[];
  /** Candidates dropped because a blocklist entry covers the host. */
  blocked: number;
}

export interface PlanOptions {
  existing: Map<string, NodeRow>;
  candidates: Candidate[];
  source: NodeSource;
  at: Date;
  blockRules: BlockRule[];
}

export function planUpsert({
  existing, candidates, source, at, blockRules,
}: PlanOptions): UpsertPlan {
  const toInsert: NewNodeInput[] = [];
  const toTouch: number[] = [];
  const sourceHits: SourceHit[] = [];
  const seenNew = new Set<string>();
  const seenNode = new Set<number>();
  let blocked = 0;

  for (const c of candidates) {
    if (isBlocked(c.host, blockRules)) {
      blocked += 1;
      continue;
    }
    const key = endpointKey(c.network, c.host, c.port);
    const row = existing.get(key);
    if (row) {
      const id = Number(row.id);
      if (!seenNode.has(id)) {
        seenNode.add(id);
        toTouch.push(id);
        sourceHits.push({ nodeId: id, source, at });
      }
    } else if (!seenNew.has(key)) {
      seenNew.add(key);
      toInsert.push({
        network: c.network, host: c.host, port: c.port, at,
      });
    }
  }

  return {
    toInsert, toTouch, sourceHits, blocked,
  };
}

/** Index existing rows by the composite endpoint key. */
export function indexNodes(rows: NodeRow[]): Map<string, NodeRow> {
  const map = new Map<string, NodeRow>();
  for (const r of rows) map.set(endpointKey(r.network, r.host, r.port), r);
  return map;
}
