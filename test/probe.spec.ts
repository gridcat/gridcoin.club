import { describe, expect, it } from 'vitest';
import {
  classify, nextProbeDelayMs, planNodeUpdates, runProbes, selectProbeQueue,
} from '@/server/addnodes/steps/probe';
import { node } from './helpers';

const HOUR = 3600_000;
const now = new Date('2026-08-21T10:00:00Z');

describe('nextProbeDelayMs', () => {
  it('checks a healthy node hourly', () => {
    expect(nextProbeDelayMs('online', 0)).toBe(HOUR);
  });

  it('backs off exponentially while a node keeps failing', () => {
    expect(nextProbeDelayMs('unreachable', 1)).toBe(1 * HOUR);
    expect(nextProbeDelayMs('unreachable', 2)).toBe(2 * HOUR);
    expect(nextProbeDelayMs('unreachable', 3)).toBe(4 * HOUR);
    expect(nextProbeDelayMs('unreachable', 4)).toBe(8 * HOUR);
    expect(nextProbeDelayMs('unreachable', 5)).toBe(16 * HOUR);
  });

  it('caps the ladder rather than growing without bound', () => {
    expect(nextProbeDelayMs('unreachable', 50)).toBe(16 * HOUR);
  });

  it('still gives a dead node a daily slot, so a return is noticed', () => {
    expect(nextProbeDelayMs('dead', 99)).toBe(24 * HOUR);
  });
});

describe('selectProbeQueue', () => {
  it('only takes nodes that are due', () => {
    const due = node({ next_probe_at: new Date(now.getTime() - HOUR) });
    const notDue = node({ next_probe_at: new Date(now.getTime() + HOUR) });
    const { queue } = selectProbeQueue([due, notDue], now);
    expect(queue.map((n) => n.id)).toEqual([due.id]);
  });

  it('puts never-probed nodes at the front of the queue', () => {
    const old = node({ last_probe_at: new Date(now.getTime() - 5 * HOUR), next_probe_at: new Date(0) });
    const fresh = node({ last_probe_at: null, next_probe_at: now });
    const { queue } = selectProbeQueue([old, fresh], now);
    expect(queue[0].id).toBe(fresh.id);
  });

  it('honours the budget and reports what it deferred', () => {
    const nodes = Array.from({ length: 10 }, () => node({ next_probe_at: new Date(0) }));
    const { queue, skipped } = selectProbeQueue(nodes, now, 4);
    expect(queue).toHaveLength(4);
    expect(skipped).toBe(6);
  });

  it('reports nothing skipped when everything fits', () => {
    const nodes = Array.from({ length: 3 }, () => node({ next_probe_at: new Date(0) }));
    expect(selectProbeQueue(nodes, now, 10).skipped).toBe(0);
  });
});

describe('classify', () => {
  it('a successful probe is online', () => {
    expect(classify({ last_probe_ok_at: null, last_probe_at: null }, true, now)).toBe('online');
  });

  it('a failure within a week of a success is unreachable, not dead', () => {
    const lastOk = new Date(now.getTime() - 3 * 24 * HOUR);
    expect(classify({ last_probe_ok_at: lastOk, last_probe_at: now }, false, now)).toBe('unreachable');
  });

  it('a failure with no success in a week is dead', () => {
    const lastOk = new Date(now.getTime() - 8 * 24 * HOUR);
    expect(classify({ last_probe_ok_at: lastOk, last_probe_at: now }, false, now)).toBe('dead');
  });

  it('a node that never answered is dead, not unreachable', () => {
    expect(classify({ last_probe_ok_at: null, last_probe_at: now }, false, now)).toBe('dead');
  });
});

describe('planNodeUpdates', () => {
  it('clears the fail streak and stamps the online times on success', () => {
    const n = node({ probe_fail_streak: 4, status: 'unreachable' });
    const [update] = planNodeUpdates([{ node: n, ok: true, at: now }]);

    expect(update.status).toBe('online');
    expect(update.probeFailStreak).toBe(0);
    expect(update.lastOnlineAt).toEqual(now);
    expect(update.lastProbeOkAt).toEqual(now);
    expect(update.nextProbeAt).toEqual(new Date(now.getTime() + HOUR));
  });

  it('grows the streak and does not touch the online times on failure', () => {
    const n = node({ probe_fail_streak: 1, last_probe_ok_at: new Date(now.getTime() - HOUR) });
    const [update] = planNodeUpdates([{ node: n, ok: false, at: now }]);

    expect(update.probeFailStreak).toBe(2);
    expect(update.status).toBe('unreachable');
    expect(update.lastOnlineAt).toBeUndefined();
    expect(update.lastProbeOkAt).toBeUndefined();
    expect(update.nextProbeAt).toEqual(new Date(now.getTime() + 2 * HOUR));
  });

  it('a returning node keeps its identity and flips straight back to online', () => {
    const n = node({
      status: 'dead',
      probe_fail_streak: 40,
      first_seen_at: new Date('2026-01-01T00:00:00Z'),
      last_probe_ok_at: new Date('2026-02-01T00:00:00Z'),
    });
    const [update] = planNodeUpdates([{ node: n, ok: true, at: now }]);

    expect(update.id).toBe(Number(n.id));
    expect(update.status).toBe('online');
    expect(update.probeFailStreak).toBe(0);
  });
});

describe('runProbes', () => {
  it('probes every queued node exactly once', async () => {
    const nodes = Array.from({ length: 25 }, (_, i) => node({ host: `203.0.113.${i + 1}` }));
    const seen: string[] = [];
    const outcomes = await runProbes(nodes, now, async (host) => {
      seen.push(host);
      return host.endsWith('1');
    }, 5);

    expect(seen).toHaveLength(25);
    expect(new Set(seen).size).toBe(25);
    expect(outcomes).toHaveLength(25);
    expect(outcomes.filter((o) => o.ok).length).toBeGreaterThan(0);
  });

  it('does nothing on an empty queue', async () => {
    expect(await runProbes([], now, async () => true)).toEqual([]);
  });
});
