// Rolling uptime, derived from the hourly observations.
//
// The published series is 168 CHARACTERS, not a bitmask, because the probe
// backoff means some hours were never probed and a bitmask cannot say so. A
// week bar that draws "we did not look" as "down" would libel every node on a
// long backoff. Three states: '1' up, '0' down, '-' not probed.
//
// For the same reason the ratio is successes over *probes*, not over 168.

import { hourBucket } from '../db';
import type { HourObservation } from './repository';

export const WEEK_HOURS = 168;

export const UP = '1';
export const DOWN = '0';
export const UNPROBED = '-';

export interface UptimeStats {
  /** 168 chars, oldest hour first, current hour last. */
  series: string;
  /** successes / probes, or null when we never probed it in the window. */
  ratio: number | null;
  probes: number;
  successes: number;
  /** Highest distinct-reporter count seen in the last 24 hours. */
  reporters24h: number;
}

export const EMPTY_STATS: UptimeStats = {
  series: UNPROBED.repeat(WEEK_HOURS),
  ratio: null,
  probes: 0,
  successes: 0,
  reporters24h: 0,
};

/**
 * Build per-node stats from a flat list of observations covering the window.
 *
 * One pass over the rows rather than a query per node: the whole 7-day window
 * for every node is a few hundred thousand rows at worst and we already have
 * to load it to render the full inventory.
 */
export function buildUptime(
  observations: HourObservation[],
  now: Date,
): Map<number, UptimeStats> {
  const endBucket = hourBucket(now).getTime();
  const startBucket = endBucket - (WEEK_HOURS - 1) * 3600_000;
  const dayStart = endBucket - 23 * 3600_000;

  const slots = new Map<number, string[]>();
  const tallies = new Map<number, { probes: number; successes: number; reporters: number }>();

  for (const obs of observations) {
    const nodeId = Number(obs.node_id);
    const bucket = new Date(obs.hour_bucket).getTime();
    if (bucket < startBucket || bucket > endBucket) continue;

    const idx = Math.round((bucket - startBucket) / 3600_000);
    if (idx < 0 || idx >= WEEK_HOURS) continue;

    let row = slots.get(nodeId);
    if (!row) {
      row = new Array<string>(WEEK_HOURS).fill(UNPROBED);
      slots.set(nodeId, row);
    }
    let tally = tallies.get(nodeId);
    if (!tally) {
      tally = { probes: 0, successes: 0, reporters: 0 };
      tallies.set(nodeId, tally);
    }

    if (obs.probe_ok !== null && obs.probe_ok !== undefined) {
      const ok = Number(obs.probe_ok) === 1;
      row[idx] = ok ? UP : DOWN;
      tally.probes += 1;
      if (ok) tally.successes += 1;
    }
    if (bucket >= dayStart) {
      tally.reporters = Math.max(tally.reporters, Number(obs.distinct_reporters ?? 0));
    }
  }

  const out = new Map<number, UptimeStats>();
  for (const [nodeId, row] of Array.from(slots.entries())) {
    const tally = tallies.get(nodeId) ?? { probes: 0, successes: 0, reporters: 0 };
    out.set(nodeId, {
      series: row.join(''),
      ratio: tally.probes > 0 ? tally.successes / tally.probes : null,
      probes: tally.probes,
      successes: tally.successes,
      reporters24h: tally.reporters,
    });
  }
  return out;
}
