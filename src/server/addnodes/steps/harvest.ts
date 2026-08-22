// Our own daemons as a data source.
//
// This is the bulk of the candidate pool and the reason the list is useful on
// day one, before anyone has opted into sharing anything. Two RPC calls per
// network:
//
//   getnodeaddresses  the whole address manager — thousands of gossiped
//                     entries, unverified, but a fine thing to go and probe
//   getpeerinfo       currently connected peers, filtered to OUTBOUND only
//
// The inbound filter is not an optimisation. For an outbound connection
// `addr` is the address we dialled, so it is a real listening endpoint. For an
// inbound one it carries the peer's ephemeral source port, which is useless as
// an addnode and would poison the list with unconnectable entries.
//
// A daemon being unreachable is not fatal: we log it, skip harvest, and carry
// on from rows already in the table.

import { parseEndpoint } from '../addr';
import type { BlockRule } from '../blocklist';
import type { Network, NodeRow } from '../../db/database';
import { getNodeAddresses, getPeerInfo, type RpcConfig } from '../gridcoin';
import { insertNodes, loadAllNodes, recordSources, touchNodes } from '../repository';
import { log } from '../../log';
import { indexNodes, planUpsert, type Candidate } from './upsert';

export interface HarvestResult {
  candidates: number;
  inserted: number;
  blocked: number;
  networksReached: Network[];
  nodes: NodeRow[];
}

export async function collectFromDaemon(
  network: Network,
  rpc: RpcConfig,
): Promise<{ candidates: Candidate[]; reached: boolean }> {
  const [addresses, peers] = await Promise.all([
    getNodeAddresses(rpc),
    getPeerInfo(rpc),
  ]);

  if (addresses === null && peers === null) {
    return { candidates: [], reached: false };
  }

  const candidates: Candidate[] = [];

  for (const a of addresses ?? []) {
    const endpoint = parseEndpoint(`${a.address}:${a.port}`);
    if (endpoint) candidates.push({ network, ...endpoint });
  }

  for (const p of peers ?? []) {
    if (p.inbound) continue;
    const endpoint = parseEndpoint(String(p.addr));
    if (endpoint) candidates.push({ network, ...endpoint });
  }

  return { candidates, reached: true };
}

export async function runHarvest(
  at: Date,
  blockRules: BlockRule[],
  existingNodes: NodeRow[],
  daemons: Partial<Record<Network, RpcConfig>>,
): Promise<HarvestResult> {
  const candidates: Candidate[] = [];
  const networksReached: Network[] = [];

  for (const network of Object.keys(daemons) as Network[]) {
    const rpc = daemons[network];
    if (!rpc) continue;
    const { candidates: found, reached } = await collectFromDaemon(network, rpc);
    if (reached) networksReached.push(network);
    candidates.push(...found);
    log.info('harvested from daemon', { network, reached, candidates: found.length });
  }

  const plan = planUpsert({
    existing: indexNodes(existingNodes), candidates, source: 'daemon', at, blockRules,
  });

  const inserted = await insertNodes(plan.toInsert);
  await touchNodes(plan.toTouch, at);

  let nodes = existingNodes;
  if (inserted > 0) {
    nodes = await loadAllNodes();
    const late = planUpsert({
      existing: indexNodes(nodes),
      candidates: plan.toInsert.map((n) => ({ network: n.network, host: n.host, port: n.port })),
      source: 'daemon',
      at,
      blockRules,
    });
    plan.sourceHits.push(...late.sourceHits);
  }

  await recordSources(plan.sourceHits);

  return {
    candidates: candidates.length,
    inserted,
    blocked: plan.blocked,
    networksReached,
    nodes,
  };
}
