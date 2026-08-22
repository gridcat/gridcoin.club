import { describe, expect, it } from 'vitest';
import { mergeDaily, planTransitions, toIntervals } from '@/server/addnodes/steps/history';
import type { EventRow } from '@/server/addnodes/repository';
import { node } from './helpers';

const now = new Date('2026-08-21T10:00:00Z');
const HOUR = 3600_000;

function event(overrides: Partial<EventRow>): EventRow {
  return {
    id: 1, node_id: 1, at: now, event: 'up', prev_event_at: null, ...overrides,
  };
}

describe('planTransitions', () => {
  it('records discovery and the first reading for a brand-new node', () => {
    const n = node({ id: 5, last_probe_at: null });
    const { events } = planTransitions([{ node: n, ok: true, at: now }], new Map());

    expect(events.map((e) => e.event)).toEqual(['discovered', 'up']);
    expect(events[0].prevEventAt).toBeNull();
  });

  it('writes nothing when a node stays up, which is the point of an event table', () => {
    const n = node({ id: 5 });
    const latest = new Map([[5, event({ node_id: 5, event: 'up' })]]);
    const { events } = planTransitions([{ node: n, ok: true, at: now }], latest);

    expect(events).toHaveLength(0);
  });

  it('records a down event when a node stops answering', () => {
    const n = node({ id: 5 });
    const previousAt = new Date(now.getTime() - 5 * HOUR);
    const latest = new Map([[5, event({ node_id: 5, event: 'up', at: previousAt })]]);
    const { events } = planTransitions([{ node: n, ok: false, at: now }], latest);

    expect(events).toHaveLength(1);
    expect(events[0].event).toBe('down');
    // prev_event_at is what makes a row know its own duration without a
    // window function on read.
    expect(events[0].prevEventAt).toEqual(previousAt);
  });

  it('records an up event when a node comes back', () => {
    const n = node({ id: 5, status: 'dead' });
    const latest = new Map([[5, event({ node_id: 5, event: 'down' })]]);
    const { events } = planTransitions([{ node: n, ok: true, at: now }], latest);

    expect(events.map((e) => e.event)).toEqual(['up']);
  });

  it('treats a bare discovered event as no reachability claim', () => {
    const n = node({ id: 5 });
    const latest = new Map([[5, event({ node_id: 5, event: 'discovered' })]]);
    const { events } = planTransitions([{ node: n, ok: false, at: now }], latest);

    expect(events.map((e) => e.event)).toEqual(['down']);
  });

  it('counts a probe and a success per outcome', () => {
    const { daily } = planTransitions(
      [
        { node: node({ id: 1 }), ok: true, at: now },
        { node: node({ id: 2 }), ok: false, at: now },
      ],
      new Map(),
    );

    expect(daily[0]).toMatchObject({ probes: 1, successes: 1, day: '2026-08-21' });
    expect(daily[1]).toMatchObject({ probes: 1, successes: 0 });
  });

  it('books downtime from the gap since the last probe', () => {
    const n = node({ id: 1, last_probe_at: new Date(now.getTime() - 2 * HOUR) });
    const { daily } = planTransitions([{ node: n, ok: false, at: now }], new Map());
    expect(daily[0].downtimeMinutes).toBe(120);
  });

  it('caps booked downtime at a day, so a long backoff cannot inflate it', () => {
    const n = node({ id: 1, last_probe_at: new Date(now.getTime() - 40 * 24 * HOUR) });
    const { daily } = planTransitions([{ node: n, ok: false, at: now }], new Map());
    expect(daily[0].downtimeMinutes).toBe(24 * 60);
  });

  it('books no downtime for a success', () => {
    const n = node({ id: 1, last_probe_at: new Date(now.getTime() - 5 * HOUR) });
    const { daily } = planTransitions([{ node: n, ok: true, at: now }], new Map());
    expect(daily[0].downtimeMinutes).toBe(0);
  });
});

describe('mergeDaily', () => {
  it('collapses repeat probes of one node on one day', () => {
    const merged = mergeDaily([
      {
        nodeId: 1, day: '2026-08-21', probes: 1, successes: 1, downtimeMinutes: 0,
      },
      {
        nodeId: 1, day: '2026-08-21', probes: 1, successes: 0, downtimeMinutes: 30,
      },
      {
        nodeId: 2, day: '2026-08-21', probes: 1, successes: 1, downtimeMinutes: 0,
      },
    ]);

    expect(merged).toHaveLength(2);
    expect(merged[0]).toMatchObject({ probes: 2, successes: 1, downtimeMinutes: 30 });
  });

  it('keeps separate days apart', () => {
    const merged = mergeDaily([
      {
        nodeId: 1, day: '2026-08-20', probes: 1, successes: 1, downtimeMinutes: 0,
      },
      {
        nodeId: 1, day: '2026-08-21', probes: 1, successes: 1, downtimeMinutes: 0,
      },
    ]);
    expect(merged).toHaveLength(2);
  });
});

describe('toIntervals', () => {
  it('closes each interval with the next event and leaves the newest open', () => {
    const down = new Date('2026-08-18T09:11:00Z');
    const up = new Date('2026-08-19T14:03:00Z');
    const intervals = toIntervals(
      [event({ at: up, event: 'up' }), event({ at: down, event: 'down' })],
      now,
    );

    expect(intervals[0].event).toBe('up');
    expect(intervals[0].to).toBeNull();
    expect(intervals[1].event).toBe('down');
    expect(intervals[1].to).toEqual(up);
    expect(intervals[1].durationMs).toBe(up.getTime() - down.getTime());
  });

  it('measures the open interval against now', () => {
    const at = new Date(now.getTime() - 3 * HOUR);
    const [interval] = toIntervals([event({ at })], now);
    expect(interval.durationMs).toBe(3 * HOUR);
  });

  it('sorts newest first even when given events out of order', () => {
    const older = new Date('2026-08-01T00:00:00Z');
    const newer = new Date('2026-08-10T00:00:00Z');
    const intervals = toIntervals(
      [event({ at: older, event: 'down' }), event({ at: newer, event: 'up' })],
      now,
    );
    expect(intervals[0].from).toEqual(newer);
  });
});
