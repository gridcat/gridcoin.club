import { describe, expect, it } from 'vitest';
import { buildUptime, WEEK_HOURS } from '@/server/addnodes/uptime';
import type { HourObservation } from '@/server/addnodes/repository';

const now = new Date('2026-08-21T10:30:00Z');
const HOUR = 3600_000;

function obs(hoursAgo: number, probeOk: number | null, reporters = 0): HourObservation {
  const bucket = new Date(Date.UTC(2026, 7, 21, 10, 0, 0) - hoursAgo * HOUR);
  return {
    node_id: 1, hour_bucket: bucket, probe_ok: probeOk, distinct_reporters: reporters,
  };
}

describe('buildUptime', () => {
  it('returns a 168-character series ending at the current hour', () => {
    const stats = buildUptime([obs(0, 1)], now);
    const s = stats.get(1)!;
    expect(s.series).toHaveLength(WEEK_HOURS);
    expect(s.series[WEEK_HOURS - 1]).toBe('1');
  });

  it('distinguishes down from never-probed', () => {
    const stats = buildUptime([obs(0, 1), obs(1, 0)], now);
    const s = stats.get(1)!;
    expect(s.series[WEEK_HOURS - 1]).toBe('1');
    expect(s.series[WEEK_HOURS - 2]).toBe('0');
    // Every other hour was never probed and must not read as an outage.
    expect(s.series[WEEK_HOURS - 3]).toBe('-');
  });

  it('divides successes by probes, not by 168', () => {
    // Three probes across the week, two of them successful. A node on a long
    // backoff must not be punished for the hours we chose not to look.
    const stats = buildUptime([obs(0, 1), obs(20, 1), obs(50, 0)], now);
    const s = stats.get(1)!;
    expect(s.probes).toBe(3);
    expect(s.successes).toBe(2);
    expect(s.ratio).toBeCloseTo(2 / 3);
  });

  it('reports a null ratio when we never probed in the window', () => {
    const stats = buildUptime([obs(0, null, 4)], now);
    expect(stats.get(1)!.ratio).toBeNull();
  });

  it('takes the highest reporter count from the last 24 hours only', () => {
    const stats = buildUptime([obs(1, null, 3), obs(5, null, 7), obs(40, null, 99)], now);
    expect(stats.get(1)!.reporters24h).toBe(7);
  });

  it('ignores observations older than the window', () => {
    const stats = buildUptime([obs(0, 1), obs(500, 1)], now);
    expect(stats.get(1)!.probes).toBe(1);
  });

  it('keeps nodes separate', () => {
    const stats = buildUptime(
      [obs(0, 1), { ...obs(0, 0), node_id: 2 }],
      now,
    );
    expect(stats.get(1)!.successes).toBe(1);
    expect(stats.get(2)!.successes).toBe(0);
  });
});
