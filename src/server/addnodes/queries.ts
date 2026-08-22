// Read queries behind the node detail page.
//
// This is the ONE place the hub reads the addnodes database in a request path.
// The two list pages deliberately read the published static JSON instead, so
// they keep working when MariaDB does not; a per-node history page cannot,
// because writing a file per node every 15 minutes does not scale and the data
// is naturally relational.

import { getDb } from '../db';
import type { NodeRow } from '../db/database';
import {
  dailyForNode, eventsForNode, observationsForNode,
  type DailyRow, type EventRow, type HourObservation, type NodeSourceRow,
} from './repository';
import { toIntervals, type Interval } from './steps/history';
import { buildUptime, EMPTY_STATS, type UptimeStats } from './uptime';

export interface NodeDetail {
  node: NodeRow;
  sources: NodeSourceRow[];
  /** Newest first, already paired into durations. */
  timeline: Interval[];
  /** Last 48 hours of hourly samples, oldest first. */
  recent: HourObservation[];
  /** Up to 90 days of rollups, oldest first. */
  daily: DailyRow[];
  stats: UptimeStats;
  /** How long the node has been in its current up/down state. */
  currentStreakMs: number | null;
  blocked: boolean;
}

const DAY_MS = 24 * 3600_000;

export async function findNode(id: number): Promise<NodeRow | null> {
  if (!Number.isInteger(id) || id <= 0) return null;
  const row = await getDb().selectFrom('nodes').selectAll().where('id', '=', id).executeTakeFirst();
  return row ?? null;
}

export async function loadNodeDetail(id: number, now: Date): Promise<NodeDetail | null> {
  const node = await findNode(id);
  if (!node) return null;

  const weekAgo = new Date(now.getTime() - 168 * 3600_000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * DAY_MS);

  const db = getDb();
  const [sources, events, observations, daily] = await Promise.all([
    db.selectFrom('node_sources').selectAll().where('node_id', '=', id)
      .execute() as unknown as Promise<NodeSourceRow[]>,
    eventsForNode(id),
    observationsForNode(id, weekAgo),
    dailyForNode(id, ninetyDaysAgo),
  ]);

  const timeline = toIntervals(events as EventRow[], now);
  const stats = buildUptime(observations, now).get(id) ?? EMPTY_STATS;

  // The newest event is the start of the current state; a node we have never
  // probed has no streak to speak of.
  const currentStreakMs = timeline.length ? timeline[0].durationMs : null;

  // A blocked host must not be browsable either — the delisting promise is
  // "you disappear", not "you disappear from the text file".
  const blocklist = await db.selectFrom('blocklist').select(['kind', 'pattern']).execute();
  const { isBlocked, toRules } = await import('./blocklist');
  const blocked = isBlocked(node.host, toRules(blocklist));

  const twoDaysAgo = new Date(now.getTime() - 2 * DAY_MS);
  return {
    node,
    sources,
    timeline,
    recent: observations.filter((o) => new Date(o.hour_bucket) >= twoDaysAgo),
    daily,
    stats,
    currentStreakMs,
    blocked,
  };
}
