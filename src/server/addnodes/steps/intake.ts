// Turning queued TUI reports into node rows.
//
// The hub's ingest route does the validating and drops a row in `reports`;
// nothing else happens in the request path. This step claims those rows,
// folds each reported peer onto its node row with source `report`, and counts
// how many DISTINCT reporters vouched for it this hour.
//
// That distinct count is the one thing our own box cannot produce: a node
// reachable from Berlin may be firewalled from elsewhere, and a report is a
// vantage point we do not otherwise have. It never publishes anything on its
// own — only a successful probe does that — but it decides tie-breaks and it
// surfaces on the page.

import { parseEndpoint } from '../addr';
import type { BlockRule } from '../blocklist';
import type { Network, NodeRow } from '../../db/database';
import {
  bumpReporterObservation, claimReports, insertNodes, loadAllNodes,
  markReportsProcessed, recordSources, touchNodes,
} from '../repository';
import { log } from '../../log';
import { indexNodes, planUpsert, type Candidate } from './upsert';

export interface IntakeResult {
  reports: number;
  peers: number;
  inserted: number;
  blocked: number;
  /** Refreshed node index, since intake may have created rows. */
  nodes: NodeRow[];
}

export async function runIntake(
  at: Date,
  blockRules: BlockRule[],
  existingNodes: NodeRow[],
): Promise<IntakeResult> {
  const reports = await claimReports();
  if (!reports.length) {
    return {
      reports: 0, peers: 0, inserted: 0, blocked: 0, nodes: existingNodes,
    };
  }

  const candidates: Candidate[] = [];
  // endpoint key -> set of reporter hashes, so two reports from the same
  // wallet do not read as two independent vantage points.
  const vouchers = new Map<string, Set<string>>();

  for (const report of reports) {
    const network = report.network as Network;
    const peers = Array.isArray(report.peers) ? report.peers : [];
    for (const raw of peers) {
      const endpoint = parseEndpoint(String(raw));
      if (!endpoint) continue;
      candidates.push({ network, host: endpoint.host, port: endpoint.port });
      const key = `${network}|${endpoint.host}|${endpoint.port}`;
      let set = vouchers.get(key);
      if (!set) {
        set = new Set();
        vouchers.set(key, set);
      }
      set.add(report.reporter_hash);
    }
  }

  let index = indexNodes(existingNodes);
  const plan = planUpsert({
    existing: index, candidates, source: 'report', at, blockRules,
  });

  const inserted = await insertNodes(plan.toInsert);
  await touchNodes(plan.toTouch, at);

  // Re-read once if we created rows: the source trail and the observation
  // counts both need ids that did not exist a moment ago.
  let nodes = existingNodes;
  if (inserted > 0) {
    nodes = await loadAllNodes();
    index = indexNodes(nodes);
    const late = planUpsert({
      existing: index,
      candidates: plan.toInsert.map((n) => ({ network: n.network, host: n.host, port: n.port })),
      source: 'report',
      at,
      blockRules,
    });
    plan.sourceHits.push(...late.sourceHits);
  }

  await recordSources(plan.sourceHits);

  // Array.from rather than iterating the Map directly: the root tsconfig
  // targets es5 for the browser bundle and will not downlevel a Map iterator.
  for (const [key, set] of Array.from(vouchers.entries())) {
    const row = index.get(key);
    if (!row) continue;
    await bumpReporterObservation(Number(row.id), at, set.size);
  }

  await markReportsProcessed(reports.map((r) => Number(r.id)), at);

  log.info('intake complete', {
    reports: reports.length,
    peers: candidates.length,
    inserted,
    blocked: plan.blocked,
  });

  return {
    reports: reports.length,
    peers: candidates.length,
    inserted,
    blocked: plan.blocked,
    nodes,
  };
}
