import type { NodeRow } from '@/server/db/database';

let nextId = 1;

/** A NodeRow with sane defaults; override only what a test cares about. */
export function node(overrides: Partial<NodeRow> = {}): NodeRow {
  const at = new Date('2026-08-21T10:00:00Z');
  return {
    id: nextId++,
    network: 'main',
    host: '203.0.113.1',
    port: 32749,
    first_seen_at: at,
    last_seen_at: at,
    last_online_at: at,
    ptr: null,
    ptr_checked_at: null,
    cc: null,
    asn: null,
    asn_org: null,
    geo_checked_at: null,
    status: 'online',
    last_probe_at: at,
    last_probe_ok_at: at,
    probe_fail_streak: 0,
    next_probe_at: at,
    pinned: 0,
    excluded: 0,
    label: null,
    notes: null,
    ...overrides,
  } as NodeRow;
}

export function resetIds(): void {
  nextId = 1;
}
