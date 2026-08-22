// The bootstrap seed list.
//
// Parses the same conf syntax we emit, so a snapshot of any existing addnodes
// list can be dropped into data/seeds/ verbatim. The shipped files come from
// the cycy snapshots already in this tree
// (grc-wallet/.GridcoinResearch/gridcoinresearch.conf and its testnet
// sibling), which is what makes the service useful the first time it runs.
//
// Seeds are hostnames, not literal addresses, so this is the one path where
// parseEndpoint is allowed to accept a name. They are candidates like any
// other: a seed still has to answer a probe before it is published.

import { existsSync, readFileSync } from 'node:fs';
import * as path from 'node:path';
import { parseEndpoint, MAINNET_P2P_PORT, TESTNET_P2P_PORT } from '../addr';
import type { BlockRule } from '../blocklist';
import type { Network, NodeRow } from '../../db/database';
import { insertNodes, loadAllNodes, recordSources, touchNodes } from '../repository';
import { log } from '../../log';
import { indexNodes, planUpsert, type Candidate } from './upsert';

export function seedDir(): string {
  return process.env.ADDNODES_SEED_DIR || path.join(process.cwd(), 'data', 'seeds');
}

/** Pull the `addnode=` targets out of a conf-format file. */
export function parseSeedFile(contents: string, network: Network): Candidate[] {
  const port = network === 'main' ? MAINNET_P2P_PORT : TESTNET_P2P_PORT;
  const out: Candidate[] = [];
  for (const rawLine of contents.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    if (!line.toLowerCase().startsWith('addnode=')) continue;
    // Strip a trailing comment: `addnode=host    # Sweden`
    const value = line.slice('addnode='.length).split('#')[0].trim();
    if (!value) continue;
    const endpoint = parseEndpoint(value, { allowHostname: true, defaultPort: port });
    if (endpoint) out.push({ network, ...endpoint });
  }
  return out;
}

export async function runSeed(
  at: Date,
  blockRules: BlockRule[],
  existingNodes: NodeRow[],
): Promise<{ inserted: number; nodes: NodeRow[] }> {
  const dir = seedDir();
  const candidates: Candidate[] = [];

  for (const [network, file] of [['main', 'mainnet.txt'], ['test', 'testnet.txt']] as const) {
    const full = path.join(dir, file);
    if (!existsSync(full)) {
      log.warn('seed file missing', { file: full });
      continue;
    }
    candidates.push(...parseSeedFile(readFileSync(full, 'utf8'), network));
  }

  if (!candidates.length) return { inserted: 0, nodes: existingNodes };

  const plan = planUpsert({
    existing: indexNodes(existingNodes), candidates, source: 'seed', at, blockRules,
  });

  const inserted = await insertNodes(plan.toInsert);
  await touchNodes(plan.toTouch, at);

  let nodes = existingNodes;
  if (inserted > 0) {
    nodes = await loadAllNodes();
    const late = planUpsert({
      existing: indexNodes(nodes),
      candidates: plan.toInsert.map((n) => ({ network: n.network, host: n.host, port: n.port })),
      source: 'seed',
      at,
      blockRules,
    });
    plan.sourceHits.push(...late.sourceHits);
  }

  await recordSources(plan.sourceHits);
  log.info('seeds imported', { candidates: candidates.length, inserted });
  return { inserted, nodes };
}
