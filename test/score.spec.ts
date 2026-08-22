import { describe, expect, it } from 'vitest';
import { MAX_PER_ASN, MAX_PER_PREFIX, select, withStats } from '@/server/addnodes/steps/score';
import type { UptimeStats } from '@/server/addnodes/uptime';
import { node } from './helpers';
import type { NodeRow } from '@/server/db/database';

function stats(ratio: number | null, reporters = 0): UptimeStats {
  return {
    series: '-'.repeat(168), ratio, probes: ratio === null ? 0 : 10, successes: 0, reporters24h: reporters,
  };
}

function candidate(n: NodeRow, ratio: number | null = 1, reporters = 0) {
  return { node: n, stats: stats(ratio, reporters) };
}

describe('select', () => {
  it('publishes only nodes that answered a probe', () => {
    const online = node({ status: 'online' });
    const unreachable = node({ status: 'unreachable', host: '198.51.100.1' });
    const dead = node({ status: 'dead', host: '192.0.2.1' });
    const brandNew = node({ status: 'new', host: '203.0.113.9' });

    const result = select([online, unreachable, dead, brandNew].map((n) => candidate(n)));

    expect(result.online.map((c) => c.node.id)).toEqual([online.id]);
    expect(result.unreachable.map((c) => c.node.id)).toEqual([unreachable.id]);
  });

  it('never publishes a node with reporter sightings but no successful probe', () => {
    // This is what makes report poisoning pointless: the worst a malicious
    // reporter achieves is making us spend one TCP connect.
    const vouched = node({ status: 'dead', host: '203.0.113.50' });
    const result = select([candidate(vouched, null, 99)]);
    expect(result.online).toHaveLength(0);
  });

  it('drops excluded nodes', () => {
    const kept = node({ status: 'online', host: '203.0.113.1' });
    const dropped = node({ status: 'online', host: '198.51.100.1', excluded: 1 });
    const result = select([kept, dropped].map((n) => candidate(n)));
    expect(result.online.map((c) => c.node.id)).toEqual([kept.id]);
  });

  it('ranks by uptime, then by how long we have known it', () => {
    const best = node({ status: 'online', host: '203.0.113.1' });
    const worst = node({ status: 'online', host: '198.51.100.1' });
    const result = select([candidate(worst, 0.2), candidate(best, 0.99)]);
    expect(result.online[0].node.id).toBe(best.id);
  });

  it('uses reporter count only to break an exact tie', () => {
    const at = new Date('2026-01-01T00:00:00Z');
    const few = node({ status: 'online', host: '203.0.113.1', first_seen_at: at });
    const many = node({ status: 'online', host: '198.51.100.1', first_seen_at: at });
    const result = select([candidate(few, 0.9, 1), candidate(many, 0.9, 8)]);
    expect(result.online[0].node.id).toBe(many.id);
  });

  it('caps how many nodes one /16 can contribute', () => {
    const sameBlock = Array.from({ length: 5 }, (_, i) => node({
      status: 'online', host: `203.0.113.${i + 1}`,
    }));
    const result = select(sameBlock.map((n) => candidate(n)));
    expect(result.online).toHaveLength(MAX_PER_PREFIX);
  });

  it('caps how many nodes one ASN can contribute', () => {
    const sameAsn = Array.from({ length: 6 }, (_, i) => node({
      status: 'online', host: `203.${i}.113.1`, asn: 64500,
    }));
    const result = select(sameAsn.map((n) => candidate(n)));
    expect(result.online).toHaveLength(MAX_PER_ASN);
  });

  it('honours the hard cap', () => {
    const many = Array.from({ length: 60 }, (_, i) => node({
      status: 'online', host: `203.${i}.113.1`,
    }));
    const result = select(many.map((n) => candidate(n)), 25);
    expect(result.online).toHaveLength(25);
  });

  it('lifts a pinned node past the diversity caps', () => {
    const block = Array.from({ length: 4 }, (_, i) => node({
      status: 'online', host: `203.0.113.${i + 1}`, pinned: i === 3 ? 1 : 0,
    }));
    const result = select(block.map((n) => candidate(n)));
    const ids = result.online.map((c) => c.node.id);
    expect(ids).toContain(block[3].id);
    // Pinned entries still consume cap budget so the remainder stays diverse.
    expect(result.online.length).toBeLessThanOrEqual(MAX_PER_PREFIX + 1);
  });

  it('still keeps a pinned node out when it is not answering', () => {
    // An operator override must not be able to publish a dead address —
    // that is the one failure that actively hurts people using the list.
    const pinnedDead = node({ status: 'dead', pinned: 1 });
    expect(select([candidate(pinnedDead)]).online).toHaveLength(0);
  });

  it('limits the unreachable section separately', () => {
    const many = Array.from({ length: 30 }, (_, i) => node({
      status: 'unreachable', host: `203.${i}.113.1`,
    }));
    expect(select(many.map((n) => candidate(n))).unreachable).toHaveLength(10);
  });
});

describe('withStats', () => {
  it('falls back to empty stats for a node we have never observed', () => {
    const [c] = withStats([node({ id: 99 })], new Map());
    expect(c.stats.ratio).toBeNull();
    expect(c.stats.series).toHaveLength(168);
  });
});
