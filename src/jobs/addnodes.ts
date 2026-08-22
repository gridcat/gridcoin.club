#!/usr/bin/env node
// The addnodes job.
//
//   node dist/jobs/addnodes.js run                     regenerate everything
//   node dist/jobs/addnodes.js block <pattern> [...]   delisting fallback
//   node dist/jobs/addnodes.js unblock <pattern>
//   node dist/jobs/addnodes.js blocks
//
// Invoked by a systemd timer every 15 minutes as a oneshot, using the hub's
// own image with the entrypoint overridden. Nothing runs between ticks, which
// is why the hub can grow a backend without gaining an always-on process.
//
// Blocking normally happens in grc-control; the CLI exists for when the panel
// is not available, because a delisting request should never wait on a UI.
//
// Exit codes matter: a failed run must exit non-zero so the journal shows it
// rather than reporting a clean oneshot.

import * as path from 'node:path';
import { closeDb, getDb, now as clockNow } from '../server/db';
import { migrateToLatest } from '../server/db/migrate';
import { log } from '../server/log';
import { isBlocked, toRules, type BlockRule } from '../server/addnodes/blocklist';
import { GeoLookup } from '../server/addnodes/geo';
import type { Network, NodeRow } from '../server/db/database';
import type { RpcConfig } from '../server/addnodes/gridcoin';
import {
  acquireRunLock, bumpDaily, countUnprocessedReports, finishRun, latestEventPerNode,
  loadAllNodes, loadBlocklist, loadNodeSources, observationsSince, prune, pruneOrphans,
  recordAdminAction, recordEvents, recordProbeObservations, recordSources, releaseRunLock,
  startRun, updateNodes,
} from '../server/addnodes/repository';
import { runIntake } from '../server/addnodes/steps/intake';
import { runHarvest } from '../server/addnodes/steps/harvest';
import { runSeed } from '../server/addnodes/steps/seed';
import {
  planNodeUpdates, PROBE_BUDGET, runProbes, selectProbeQueue,
} from '../server/addnodes/steps/probe';
import { mergeDaily, planTransitions } from '../server/addnodes/steps/history';
import { runEnrich } from '../server/addnodes/steps/enrich';
import { buildUptime } from '../server/addnodes/uptime';
import { select, withStats } from '../server/addnodes/steps/score';
import {
  cleanTemps, netFile, publishFiles, publishGate, readPreviousCounts, readPreviousStatus,
  renderAllJson, renderCappedJson, renderLlmsTxt, renderRobotsTxt, renderStatus, renderTxt,
  type StatusPayload,
} from '../server/addnodes/steps/render';

const NETWORKS: Network[] = ['main', 'test'];

/**
 * Drop rows covered by the blocklist.
 *
 * planUpsert already stops blocked candidates becoming nodes, but a host can
 * be blocked long after its row exists — which is the normal case, since
 * blocking is what we do when someone asks to be delisted. Applying it here
 * as well is what makes the promise real: a blocked node is not probed, not
 * enriched, and not published anywhere.
 */
function withoutBlocked(nodes: NodeRow[], rules: BlockRule[]): NodeRow[] {
  if (!rules.length) return nodes;
  return nodes.filter((n) => !isBlocked(n.host, rules));
}

function outDir(): string {
  const fromArg = process.argv.find((a) => a.startsWith('--out='));
  if (fromArg) return fromArg.slice('--out='.length);
  return process.env.ADDNODES_OUT_DIR || path.join(process.cwd(), 'out');
}

function rpcFor(network: Network): RpcConfig | undefined {
  const prefix = network === 'main' ? 'MAINNET' : 'TESTNET';
  const host = process.env[`${prefix}_RPC_HOST`] || process.env.GRC_RPC_HOST;
  const user = process.env[`${prefix}_RPC_USER`] || process.env.GRC_RPC_USER;
  const password = process.env[`${prefix}_RPC_PASSWORD`] || process.env.GRC_RPC_PASSWORD;
  const port = Number(process.env[`${prefix}_RPC_PORT`] || process.env.GRC_RPC_PORT || 47812);
  if (!host || !user || !password) return undefined;
  return {
    host, port, user, password,
  };
}

async function reportsIngestedLast24h(): Promise<number> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const res = await getDb().selectFrom('reports')
    .select((eb) => eb.fn.countAll<number>().as('n'))
    .where('received_at', '>=', since)
    .executeTakeFirst();
  return Number(res?.n ?? 0);
}

async function runOnce(): Promise<void> {
  const startedAt = clockNow();
  const dir = outDir();

  let runId = 0;
  let failure: Error | null = null;
  let skipped = false;
  let reportsIngested = 0;
  let nodesProbed = 0;
  const published: Record<Network, number> = { main: 0, test: 0 };
  const counts: StatusPayload['networks'] = {};

  // Everything, migrations included, sits inside the try: a database that is
  // simply unreachable fails on the very first statement, and status.json
  // still has to be written or a dead generator looks healthy forever.
  try {
    // Migrations are owned by this job, never by the Next server: a
    // page-render process must not race DDL.
    await migrateToLatest();

    if (!(await acquireRunLock())) {
      // A slow run is still going. Not a failure, and not ours to report on
      // — the run holding the lock will write status.json itself.
      log.warn('another run holds the lock, skipping this tick');
      skipped = true;
    }
  } catch (err) {
    failure = err instanceof Error ? err : new Error(String(err));
    log.error('run could not start', { error: failure.message });
  }

  // NOT an early return: `return` inside a try still runs the finally block
  // but skips everything after it, which would swallow the rethrow at the end
  // and let a failed run exit 0.
  const shouldRun = !failure && !skipped;

  try {
    if (shouldRun) {
      runId = await startRun(startedAt);
      await cleanTemps(dir);

      const blockRules = toRules(await loadBlocklist());
      let nodes: NodeRow[] = await loadAllNodes();

      // --- inputs: every source folds onto the same rows -------------------
      const intake = await runIntake(startedAt, blockRules, nodes);
      nodes = intake.nodes;
      reportsIngested = intake.reports;

      const daemons: Partial<Record<Network, RpcConfig>> = {};
      for (const network of NETWORKS) {
        const rpc = rpcFor(network);
        if (rpc) daemons[network] = rpc;
      }
      const harvest = await runHarvest(startedAt, blockRules, nodes, daemons);
      nodes = harvest.nodes;

      const seeded = await runSeed(startedAt, blockRules, nodes);
      nodes = seeded.nodes;

      // --- probe: the only thing that decides what gets published ----------
      const probeable = withoutBlocked(nodes, blockRules);
      const { queue, skipped: deferred } = selectProbeQueue(probeable, startedAt, PROBE_BUDGET);
      if (deferred > 0) {
        log.warn('probe budget exhausted, deferring the rest', { budget: PROBE_BUDGET, deferred });
      }
      const outcomes = await runProbes(queue, startedAt);
      nodesProbed = outcomes.length;

      await recordProbeObservations(
        outcomes.map((o) => ({ nodeId: Number(o.node.id), ok: o.ok, at: o.at })),
      );
      await recordSources(
        outcomes.filter((o) => o.ok)
          .map((o) => ({ nodeId: Number(o.node.id), source: 'probe' as const, at: o.at })),
      );

      // --- history: transitions come from probe results, never from reports -
      const latestEvents = await latestEventPerNode();
      const { events, daily } = planTransitions(outcomes, latestEvents);
      await recordEvents(events);
      await bumpDaily(mergeDaily(daily));

      await updateNodes(planNodeUpdates(outcomes));

      // Re-read so scoring sees this run's statuses rather than last run's.
      nodes = await loadAllNodes();

      // --- enrichment: cosmetic, allowed to fail ---------------------------
      const geo = GeoLookup.fromEnv();
      await updateNodes(await runEnrich(withoutBlocked(nodes, blockRules), startedAt, geo));
      nodes = await loadAllNodes();

      // --- project the database into the seven published files -------------
      const weekAgo = new Date(startedAt.getTime() - 168 * 3600_000);
      const stats = buildUptime(await observationsSince(weekAgo), startedAt);

      const sourceRows = await loadNodeSources();
      const sourcesByNode = new Map<number, string[]>();
      for (const row of sourceRows) {
        const id = Number(row.node_id);
        const list = sourcesByNode.get(id) ?? [];
        list.push(row.source);
        sourcesByNode.set(id, list);
      }

      const publishable = withoutBlocked(nodes, blockRules);
      const files = new Map<string, string>();

      for (const network of NETWORKS) {
        const forNetwork = publishable.filter((n) => n.network === network);
        const candidates = withStats(forNetwork, stats);
        const selection = select(candidates);

        const previous = await readPreviousCounts(dir, network);
        const gate = publishGate(selection.online.length, previous);
        counts[network] = {
          online: selection.online.length,
          unreachable: selection.unreachable.length,
          total: forNetwork.length,
        };

        if (!gate.publish) {
          // Holding back is a failure, not a quiet skip: the previous files
          // stay, and the run is marked so the panel shows it.
          failure = new Error(`publish gate held ${network}: ${gate.reason}`);
          log.error('publish gate held back a network', { network, reason: gate.reason });
          continue;
        }

        const base = netFile(network);
        files.set(`${base}.txt`, renderTxt(selection, startedAt));
        files.set(`${base}.json`, renderCappedJson(network, selection, startedAt));
        files.set(`${base}-all.json`, renderAllJson(network, candidates, sourcesByNode, startedAt));
        published[network] = selection.online.length;
      }

      if (files.size) {
        // Static companions ride along with a successful publish so the web
        // root is always complete, never half-populated.
        files.set('robots.txt', renderRobotsTxt());
        files.set('llms.txt', renderLlmsTxt());
        await publishFiles(dir, files);
      }
    }
  } catch (err) {
    if (!failure && !skipped) {
      failure = err instanceof Error ? err : new Error(String(err));
      log.error('run failed', { error: failure.message });
    }
  } finally {
    // status.json is the one file always written, even on a failed run: a
    // stale status is exactly what would hide a broken generator. It never
    // depends on the database, so it survives the case that broke the run.
    const previousStatus = skipped ? null : await readPreviousStatus(dir);
    const lastSuccessAt = failure
      ? (previousStatus?.lastSuccessAt ?? null)
      : startedAt.toISOString();
    let ingested24h = 0;
    try {
      ingested24h = await reportsIngestedLast24h();
    } catch {
      ingested24h = Number(previousStatus?.reportsIngested24h ?? 0);
    }

    const status: StatusPayload = {
      ok: !failure,
      error: failure ? failure.message.slice(0, 200) : null,
      generatedAt: startedAt.toISOString(),
      lastSuccessAt,
      ageSeconds: lastSuccessAt
        ? Math.round((Date.now() - new Date(lastSuccessAt).getTime()) / 1000)
        : null,
      reportsIngested24h: ingested24h,
      lastRunSeconds: Math.round((Date.now() - startedAt.getTime()) / 1000),
      networks: Object.keys(counts).length
        ? counts
        : (previousStatus?.networks ?? {}),
    };
    if (!skipped) {
      try {
        await publishFiles(dir, new Map([['status.json', renderStatus(status)]]));
      } catch (err) {
        log.error('could not write status.json', { error: String(err) });
      }
    }

    // Pruning is housekeeping: it only makes sense on a run that actually
    // reached the database, and it must never be what fails a run.
    if (!skipped && !failure) {
      try {
        const pruned = await prune(startedAt);
        await pruneOrphans();
        log.info('pruned', pruned as unknown as Record<string, unknown>);
      } catch (err) {
        log.warn('prune failed', { error: String(err) });
      }
    }

    try {
      await finishRun(runId, {
        durationMs: Date.now() - startedAt.getTime(),
        reportsIngested,
        nodesProbed,
        publishedMain: published.main,
        publishedTest: published.test,
        error: failure ? failure.message : null,
      });
    } catch {
      // The run row is an audit nicety; never let it mask the real error.
    }
    await releaseRunLock().catch(() => undefined);
  }

  if (failure) throw failure;
  if (skipped) return;
  log.info('run complete', {
    reportsIngested, nodesProbed, published, backlog: await countUnprocessedReports(),
  });
}

async function blockPattern(argv: string[]): Promise<void> {
  const pattern = argv[0];
  if (!pattern) throw new Error('usage: block <pattern> [--kind host|ip|cidr] [--reason "..."]');
  const kindArg = argv.find((a) => a.startsWith('--kind='))?.slice('--kind='.length);
  const reason = argv.find((a) => a.startsWith('--reason='))?.slice('--reason='.length) ?? null;
  const kind = (kindArg as 'host' | 'ip' | 'cidr' | undefined)
    ?? (pattern.includes('/') ? 'cidr' : /^[\d.]+$|:/.test(pattern) ? 'ip' : 'host');

  await migrateToLatest();
  await getDb().insertInto('blocklist').values({
    pattern: pattern.toLowerCase(),
    kind,
    reason,
    created_at: clockNow(),
    created_by: 'cli',
  }).ignore().execute();
  await recordAdminAction({
    actor: 'cli', action: 'block', targetKind: 'pattern', target: pattern, detail: { kind, reason },
  }, clockNow());
  log.info('blocked', { pattern, kind });
}

async function unblockPattern(argv: string[]): Promise<void> {
  const pattern = argv[0];
  if (!pattern) throw new Error('usage: unblock <pattern>');
  await migrateToLatest();
  await getDb().deleteFrom('blocklist').where('pattern', '=', pattern.toLowerCase()).execute();
  await recordAdminAction({
    actor: 'cli', action: 'unblock', targetKind: 'pattern', target: pattern,
  }, clockNow());
  log.info('unblocked', { pattern });
}

async function listBlocks(): Promise<void> {
  await migrateToLatest();
  const rows = await loadBlocklist();
  if (!rows.length) {
    process.stdout.write('blocklist is empty\n');
    return;
  }
  for (const r of rows) {
    process.stdout.write(
      `${r.kind.padEnd(5)} ${r.pattern.padEnd(40)} ${r.reason ?? ''}\n`,
    );
  }
}

async function main(): Promise<void> {
  const [command = 'run', ...rest] = process.argv.slice(2).filter((a) => !a.startsWith('--out='));
  switch (command) {
    case 'run':
      await runOnce();
      break;
    case 'block':
      await blockPattern(rest);
      break;
    case 'unblock':
      await unblockPattern(rest);
      break;
    case 'blocks':
      await listBlocks();
      break;
    default:
      throw new Error(`unknown command: ${command}`);
  }
}

main()
  .then(() => closeDb())
  .then(() => process.exit(0))
  .catch(async (err) => {
    log.error('job failed', { error: err instanceof Error ? err.message : String(err) });
    await closeDb().catch(() => undefined);
    process.exit(1);
  });
