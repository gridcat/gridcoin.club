// Up/down history.
//
// Three tiers, each answering a different question:
//   observations  hourly samples, 30 days   — "what did the last week look like"
//   node_daily    one row per day, 2 years  — "how has it trended"
//   node_events   transitions only, forever — "when did it go down, for how long"
//
// Only transitions land in node_events, so a rock-stable node costs a handful
// of rows a year and we can still answer the last question long after the
// sampled tiers have been pruned. It is the one table never pruned.
//
// Everything here is pure: it takes this run's probe outcomes plus the newest
// known event per node and returns rows to write.

import { dayKey } from '../../db';
import type { NodeEvent } from '../../db/database';
import type { DailyDelta, EventInput, EventRow } from '../repository';
import type { ProbeOutcome } from './probe';

export interface TransitionPlan {
  events: EventInput[];
  daily: DailyDelta[];
}

function isUp(event: NodeEvent | undefined): boolean | undefined {
  if (event === 'up') return true;
  if (event === 'down') return false;
  return undefined; // 'discovered' carries no reachability claim
}

/**
 * Work out which probe results represent a genuine flip.
 *
 * A node with no event history at all gets `discovered` plus its first
 * up/down, so its birthday survives even after every observation covering it
 * has been pruned. A node whose state is unchanged produces nothing — that is
 * the whole point of an event table over a sample table.
 */
export function planTransitions(
  outcomes: ProbeOutcome[],
  latestEvents: Map<number, EventRow>,
): TransitionPlan {
  const events: EventInput[] = [];
  const daily: DailyDelta[] = [];

  for (const { node, ok, at } of outcomes) {
    const nodeId = Number(node.id);
    const previous = latestEvents.get(nodeId);
    const previousUp = isUp(previous?.event);

    if (!previous) {
      events.push({
        nodeId, at, event: 'discovered', prevEventAt: null,
      });
      events.push({
        nodeId, at, event: ok ? 'up' : 'down', prevEventAt: at,
      });
    } else if (previousUp !== ok) {
      events.push({
        nodeId,
        at,
        event: ok ? 'up' : 'down',
        prevEventAt: previous.at ? new Date(previous.at) : null,
      });
    }

    // Downtime is attributed at the moment we observe it: a failed probe
    // means the node was unreachable for the interval we were not looking,
    // bounded by how long ago we last looked. Bounding matters — without it a
    // node on a 24h backoff would book a day of downtime per probe.
    let downtimeMinutes = 0;
    if (!ok) {
      const lastProbe = node.last_probe_at ? new Date(node.last_probe_at).getTime() : null;
      const gapMs = lastProbe === null ? 0 : Math.max(0, at.getTime() - lastProbe);
      downtimeMinutes = Math.min(Math.round(gapMs / 60000), 24 * 60);
    }

    daily.push({
      nodeId,
      day: dayKey(at),
      probes: 1,
      successes: ok ? 1 : 0,
      downtimeMinutes,
    });
  }

  return { events, daily };
}

/**
 * Collapse the per-outcome daily deltas so one node contributes one row per
 * day, even when a forced probe makes it appear twice in a run.
 */
export function mergeDaily(deltas: DailyDelta[]): DailyDelta[] {
  const map = new Map<string, DailyDelta>();
  for (const d of deltas) {
    const key = `${d.nodeId}|${d.day}`;
    const existing = map.get(key);
    if (existing) {
      existing.probes += d.probes;
      existing.successes += d.successes;
      existing.downtimeMinutes += d.downtimeMinutes;
    } else {
      map.set(key, { ...d });
    }
  }
  return Array.from(map.values());
}

export interface Interval {
  event: NodeEvent;
  from: Date;
  to: Date | null;
  durationMs: number | null;
}

/**
 * Turn a node's event rows into the human timeline the detail page shows:
 * "Down 2026-08-18 09:11 → 2026-08-19 14:02 · 28 h 52 m".
 *
 * Takes events newest-first (as stored) and returns intervals newest-first.
 */
export function toIntervals(events: EventRow[], now: Date): Interval[] {
  const ordered = [...events].sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
  );
  return ordered.map((e, idx) => {
    const from = new Date(e.at);
    const to = idx === 0 ? null : new Date(ordered[idx - 1].at);
    const end = to ?? now;
    return {
      event: e.event,
      from,
      to,
      durationMs: Math.max(0, end.getTime() - from.getTime()),
    };
  });
}
