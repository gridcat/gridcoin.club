// Data access for the addnodes job.
//
// Shape note: the whole `nodes` table is a few thousand rows, so the job
// loads it into memory once per run, works out the deltas, and writes them
// back in batches. That is far cheaper than a round trip per peer — the
// daemon's addrman alone hands us thousands of candidates every run — and it
// makes the pipeline steps pure enough to test without a database.

import { sql, type Kysely } from 'kysely';
import { getDb, hourBucket, dayKey } from '../db';
import type {
  AdminAction, BlocklistRow, Database, Network, NodeEvent, NodeRow, NodeSource, NodeStatus,
  ReportRow, RunRow,
} from '../db/database';

const CHUNK = 500;

function chunked<T>(items: T[], size = CHUNK): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export function endpointKey(network: Network, host: string, port: number): string {
  return `${network}|${host}|${port}`;
}

/* ------------------------------------------------------------------ runs */

/**
 * A run takes a named MariaDB lock so a slow run is skipped rather than
 * stacked behind the next timer tick. `GET_LOCK(..., 0)` returns immediately.
 * The lock is connection-scoped and released when the pool closes, so a
 * crashed job cannot wedge the next one.
 */
export async function acquireRunLock(db = getDb()): Promise<boolean> {
  const res = await sql<{ got: number }>`select get_lock('addnodes_run', 0) as got`.execute(db);
  return res.rows[0]?.got === 1;
}

export async function releaseRunLock(db = getDb()): Promise<void> {
  await sql`select release_lock('addnodes_run')`.execute(db);
}

export async function startRun(startedAt: Date, db = getDb()): Promise<number> {
  const res = await db.insertInto('runs').values({ started_at: startedAt }).executeTakeFirst();
  return Number(res.insertId ?? 0);
}

export interface RunOutcome {
  durationMs: number;
  reportsIngested: number;
  nodesProbed: number;
  publishedMain: number;
  publishedTest: number;
  error: string | null;
}

export async function finishRun(id: number, outcome: RunOutcome, db = getDb()): Promise<void> {
  if (!id) return;
  await db.updateTable('runs')
    .set({
      duration_ms: outcome.durationMs,
      reports_ingested: outcome.reportsIngested,
      nodes_probed: outcome.nodesProbed,
      published_main: outcome.publishedMain,
      published_test: outcome.publishedTest,
      error: outcome.error ? outcome.error.slice(0, 255) : null,
    })
    .where('id', '=', id)
    .execute();
}

export function recentRuns(limit = 50, db = getDb()): Promise<RunRow[]> {
  return db.selectFrom('runs').selectAll().orderBy('started_at', 'desc').limit(limit).execute();
}

/* ------------------------------------------------------------- blocklist */

export function loadBlocklist(db = getDb()): Promise<BlocklistRow[]> {
  return db.selectFrom('blocklist').selectAll().orderBy('created_at', 'desc').execute();
}

/* ------------------------------------------------------------------ nodes */

export function loadAllNodes(db = getDb()): Promise<NodeRow[]> {
  return db.selectFrom('nodes').selectAll().execute();
}

export function loadNodesForNetwork(network: Network, db = getDb()): Promise<NodeRow[]> {
  return db.selectFrom('nodes').selectAll().where('network', '=', network).execute();
}

export interface NewNodeInput {
  network: Network;
  host: string;
  port: number;
  at: Date;
}

/**
 * Insert nodes we have never seen. `ignore` on the duplicate key rather than
 * an update: two sources in the same run can legitimately surface the same
 * new peer, and the caller has already de-duplicated in memory, so a
 * collision here means a concurrent writer and the existing row wins.
 *
 * New nodes get `next_probe_at = at`, i.e. they are probed on this very run.
 */
export async function insertNodes(rows: NewNodeInput[], db = getDb()): Promise<number> {
  if (!rows.length) return 0;
  let inserted = 0;
  for (const batch of chunked(rows)) {
    const res = await db.insertInto('nodes')
      .values(batch.map((r) => ({
        network: r.network,
        host: r.host,
        port: r.port,
        first_seen_at: r.at,
        last_seen_at: r.at,
        next_probe_at: r.at,
        status: 'new' as NodeStatus,
      })))
      .ignore()
      .executeTakeFirst();
    inserted += Number(res.numInsertedOrUpdatedRows ?? 0);
  }
  return inserted;
}

/** Bump `last_seen_at` for nodes a source mentioned again this run. */
export async function touchNodes(ids: number[], at: Date, db = getDb()): Promise<void> {
  if (!ids.length) return;
  for (const batch of chunked(ids)) {
    await db.updateTable('nodes').set({ last_seen_at: at }).where('id', 'in', batch).execute();
  }
}

export interface SourceHit {
  nodeId: number;
  source: NodeSource;
  at: Date;
}

/**
 * Record which inputs have vouched for a node. This is the provenance trail
 * that makes the single-row model honest: five sources, one node, five rows
 * here rather than five competing records.
 */
export async function recordSources(hits: SourceHit[], db = getDb()): Promise<void> {
  if (!hits.length) return;
  for (const batch of chunked(hits)) {
    await db.insertInto('node_sources')
      .values(batch.map((h) => ({
        node_id: h.nodeId,
        source: h.source,
        first_seen_at: h.at,
        last_seen_at: h.at,
        hits: 1,
      })))
      .onDuplicateKeyUpdate({
        // MariaDB's VALUES(col) refers to the row that would have been
        // inserted. Kysely has no typed helper for it, hence the raw sql.
        last_seen_at: sql<Date>`values(last_seen_at)`,
        hits: sql<number>`hits + 1`,
      })
      .execute();
  }
}

export interface NodeSourceRow {
  node_id: number;
  source: NodeSource;
  first_seen_at: Date;
  last_seen_at: Date;
  hits: number;
}

export function loadNodeSources(db = getDb()): Promise<NodeSourceRow[]> {
  return db.selectFrom('node_sources').selectAll().execute() as unknown as Promise<NodeSourceRow[]>;
}

/* ----------------------------------------------------------- observations */

export async function bumpReporterObservation(
  nodeId: number,
  at: Date,
  reporters: number,
  db = getDb(),
): Promise<void> {
  await db.insertInto('observations')
    .values({
      node_id: nodeId,
      hour_bucket: hourBucket(at),
      probe_ok: null,
      distinct_reporters: reporters,
    })
    .onDuplicateKeyUpdate({
      // Reports arrive throughout the hour; keep the highest count seen
      // rather than the last, so a quiet tick cannot erase a busy one.
      distinct_reporters: sql<number>`greatest(distinct_reporters, values(distinct_reporters))`,
    })
    .execute();
}

export interface ProbeRecord {
  nodeId: number;
  ok: boolean;
  at: Date;
}

export async function recordProbeObservations(records: ProbeRecord[], db = getDb()): Promise<void> {
  if (!records.length) return;
  for (const batch of chunked(records)) {
    await db.insertInto('observations')
      .values(batch.map((r) => ({
        node_id: r.nodeId,
        hour_bucket: hourBucket(r.at),
        probe_ok: r.ok ? 1 : 0,
        distinct_reporters: 0,
      })))
      .onDuplicateKeyUpdate({
        // Within one hour a node may be probed more than once (a forced
        // probe from the admin panel, say). One success in the hour counts
        // as up: we are measuring reachability, not flakiness at minute
        // resolution.
        probe_ok: sql<number>`greatest(coalesce(probe_ok, 0), values(probe_ok))`,
      })
      .execute();
  }
}

export interface HourObservation {
  node_id: number;
  hour_bucket: Date;
  probe_ok: number | null;
  distinct_reporters: number;
}

export function observationsSince(since: Date, db = getDb()): Promise<HourObservation[]> {
  return db.selectFrom('observations')
    .selectAll()
    .where('hour_bucket', '>=', since)
    .execute() as unknown as Promise<HourObservation[]>;
}

export function observationsForNode(
  nodeId: number,
  since: Date,
  db = getDb(),
): Promise<HourObservation[]> {
  return db.selectFrom('observations')
    .selectAll()
    .where('node_id', '=', nodeId)
    .where('hour_bucket', '>=', since)
    .orderBy('hour_bucket', 'asc')
    .execute() as unknown as Promise<HourObservation[]>;
}

/* ------------------------------------------------------------ node_daily */

export interface DailyDelta {
  nodeId: number;
  day: string;
  probes: number;
  successes: number;
  downtimeMinutes: number;
}

export async function bumpDaily(deltas: DailyDelta[], db = getDb()): Promise<void> {
  if (!deltas.length) return;
  for (const batch of chunked(deltas)) {
    await db.insertInto('node_daily')
      .values(batch.map((d) => ({
        node_id: d.nodeId,
        day: d.day,
        probes: d.probes,
        successes: d.successes,
        downtime_minutes: d.downtimeMinutes,
      })))
      .onDuplicateKeyUpdate({
        probes: sql<number>`probes + values(probes)`,
        successes: sql<number>`successes + values(successes)`,
        downtime_minutes: sql<number>`downtime_minutes + values(downtime_minutes)`,
      })
      .execute();
  }
}

export interface DailyRow {
  node_id: number;
  day: Date;
  probes: number;
  successes: number;
  downtime_minutes: number;
}

export function dailyForNode(nodeId: number, since: Date, db = getDb()): Promise<DailyRow[]> {
  return db.selectFrom('node_daily')
    .selectAll()
    .where('node_id', '=', nodeId)
    .where('day', '>=', since)
    .orderBy('day', 'asc')
    .execute() as unknown as Promise<DailyRow[]>;
}

/* ----------------------------------------------------------- node_events */

export interface EventInput {
  nodeId: number;
  at: Date;
  event: NodeEvent;
  prevEventAt: Date | null;
}

export async function recordEvents(events: EventInput[], db = getDb()): Promise<void> {
  if (!events.length) return;
  for (const batch of chunked(events)) {
    await db.insertInto('node_events')
      .values(batch.map((e) => ({
        node_id: e.nodeId,
        at: e.at,
        event: e.event,
        prev_event_at: e.prevEventAt,
      })))
      .execute();
  }
}

export interface EventRow {
  id: number;
  node_id: number;
  at: Date;
  event: NodeEvent;
  prev_event_at: Date | null;
}

/**
 * The newest event per node, needed to decide whether this run's probe result
 * is a genuine transition. One query rather than N: a correlated subquery on
 * a few thousand rows is cheap and keeps the step synchronous in shape.
 */
export async function latestEventPerNode(db = getDb()): Promise<Map<number, EventRow>> {
  const rows = await sql<EventRow>`
    select e.* from node_events e
    join (
      select node_id, max(at) as max_at
      from node_events
      group by node_id
    ) m on m.node_id = e.node_id and m.max_at = e.at
  `.execute(db);
  const out = new Map<number, EventRow>();
  for (const r of rows.rows) out.set(Number(r.node_id), r);
  return out;
}

export function eventsForNode(nodeId: number, limit = 200, db = getDb()): Promise<EventRow[]> {
  return db.selectFrom('node_events')
    .selectAll()
    .where('node_id', '=', nodeId)
    .orderBy('at', 'desc')
    .limit(limit)
    .execute() as unknown as Promise<EventRow[]>;
}

/* --------------------------------------------------------------- reports */

export function claimReports(limit = 5000, db = getDb()): Promise<ReportRow[]> {
  return db.selectFrom('reports')
    .selectAll()
    .where('processed_at', 'is', null)
    .orderBy('id', 'asc')
    .limit(limit)
    .execute();
}

export async function markReportsProcessed(ids: number[], at: Date, db = getDb()): Promise<void> {
  if (!ids.length) return;
  for (const batch of chunked(ids)) {
    await db.updateTable('reports').set({ processed_at: at }).where('id', 'in', batch).execute();
  }
}

export async function countUnprocessedReports(db = getDb()): Promise<number> {
  const res = await db.selectFrom('reports')
    .select((eb) => eb.fn.countAll<number>().as('n'))
    .where('processed_at', 'is', null)
    .executeTakeFirst();
  return Number(res?.n ?? 0);
}

/* ------------------------------------------------------------- reporters */

export async function recordReporter(hash: string, at: Date, db = getDb()): Promise<void> {
  await db.insertInto('reporters')
    .values({
      reporter_hash: hash, first_seen_at: at, last_seen_at: at, report_count: 1, banned: 0,
    })
    .onDuplicateKeyUpdate({
      last_seen_at: at,
      report_count: sql<number>`report_count + 1`,
    })
    .execute();
}

export async function isReporterBanned(hash: string, db = getDb()): Promise<boolean> {
  const row = await db.selectFrom('reporters')
    .select('banned')
    .where('reporter_hash', '=', hash)
    .executeTakeFirst();
  return Number(row?.banned ?? 0) === 1;
}

/* ------------------------------------------------------------ node writes */

export interface NodeStateUpdate {
  id: number;
  status?: NodeStatus;
  lastOnlineAt?: Date | null;
  lastProbeAt?: Date;
  lastProbeOkAt?: Date | null;
  probeFailStreak?: number;
  nextProbeAt?: Date;
  ptr?: string | null;
  ptrCheckedAt?: Date;
  cc?: string | null;
  asn?: number | null;
  asnOrg?: string | null;
  geoCheckedAt?: Date;
}

export async function updateNodes(updates: NodeStateUpdate[], db = getDb()): Promise<void> {
  // Row-at-a-time on purpose: each node's next_probe_at and streak differ, so
  // there is no shared SET clause to batch. Volume is bounded by the probe
  // budget (1500) plus the enrichment budget, both small.
  for (const u of updates) {
    const set: Record<string, unknown> = {};
    if (u.status !== undefined) set.status = u.status;
    if (u.lastOnlineAt !== undefined) set.last_online_at = u.lastOnlineAt;
    if (u.lastProbeAt !== undefined) set.last_probe_at = u.lastProbeAt;
    if (u.lastProbeOkAt !== undefined) set.last_probe_ok_at = u.lastProbeOkAt;
    if (u.probeFailStreak !== undefined) set.probe_fail_streak = u.probeFailStreak;
    if (u.nextProbeAt !== undefined) set.next_probe_at = u.nextProbeAt;
    if (u.ptr !== undefined) set.ptr = u.ptr;
    if (u.ptrCheckedAt !== undefined) set.ptr_checked_at = u.ptrCheckedAt;
    if (u.cc !== undefined) set.cc = u.cc;
    if (u.asn !== undefined) set.asn = u.asn;
    if (u.asnOrg !== undefined) set.asn_org = u.asnOrg;
    if (u.geoCheckedAt !== undefined) set.geo_checked_at = u.geoCheckedAt;
    if (!Object.keys(set).length) continue;
    await db.updateTable('nodes').set(set as never).where('id', '=', u.id).execute();
  }
}

/* ----------------------------------------------------------------- prune */

export interface PruneResult {
  observations: number;
  reports: number;
  daily: number;
  nodes: number;
}

export async function prune(
  now: Date,
  db = getDb(),
): Promise<PruneResult> {
  const days = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);

  const obs = await db.deleteFrom('observations').where('hour_bucket', '<', days(30)).executeTakeFirst();
  const rep = await db.deleteFrom('reports')
    .where('processed_at', 'is not', null)
    .where('received_at', '<', days(30))
    .executeTakeFirst();
  const daily = await db.deleteFrom('node_daily').where('day', '<', days(730)).executeTakeFirst();

  // Only junk is purged: a node that has EVER answered is kept forever, so
  // that a host returning after months keeps its original first_seen_at and
  // its event history rather than looking brand new. Never-once-reachable
  // rows are gossip noise and go after 30 days.
  const nodes = await db.deleteFrom('nodes')
    .where('last_probe_ok_at', 'is', null)
    .where('first_seen_at', '<', days(30))
    .executeTakeFirst();

  return {
    observations: Number(obs?.numDeletedRows ?? 0),
    reports: Number(rep?.numDeletedRows ?? 0),
    daily: Number(daily?.numDeletedRows ?? 0),
    nodes: Number(nodes?.numDeletedRows ?? 0),
  };
}

/**
 * node_sources / node_events / observations have no FK cascade (MariaDB
 * FKs on a shared instance are more trouble than they are worth here), so
 * orphan rows are swept after the node delete.
 */
export async function pruneOrphans(db: Kysely<Database> = getDb()): Promise<void> {
  await sql`delete s from node_sources s left join nodes n on n.id = s.node_id where n.id is null`.execute(db);
  await sql`delete o from observations o left join nodes n on n.id = o.node_id where n.id is null`.execute(db);
  await sql`delete e from node_events e left join nodes n on n.id = e.node_id where n.id is null`.execute(db);
  await sql`delete d from node_daily d left join nodes n on n.id = d.node_id where n.id is null`.execute(db);
}

/* --------------------------------------------------------- admin actions */

export interface AdminActionInput {
  actor: string;
  action: AdminAction;
  targetKind: 'node' | 'reporter' | 'pattern';
  target: string;
  detail?: unknown;
}

export async function recordAdminAction(
  input: AdminActionInput,
  at: Date,
  db = getDb(),
): Promise<void> {
  await db.insertInto('admin_actions').values({
    at,
    actor: input.actor.slice(0, 64),
    action: input.action,
    target_kind: input.targetKind,
    target: input.target.slice(0, 255),
    detail: input.detail === undefined ? null : JSON.stringify(input.detail),
  }).execute();
}
