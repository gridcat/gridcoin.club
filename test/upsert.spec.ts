import { describe, expect, it } from 'vitest';
import { indexNodes, planUpsert } from '@/server/addnodes/steps/upsert';
import { toRules } from '@/server/addnodes/blocklist';
import { node } from './helpers';

const at = new Date('2026-08-21T10:00:00Z');

describe('planUpsert', () => {
  it('folds a known endpoint onto the existing row rather than inserting', () => {
    const existing = indexNodes([node({ id: 7, host: '203.0.113.1', port: 32749 })]);
    const plan = planUpsert({
      existing,
      candidates: [{ network: 'main', host: '203.0.113.1', port: 32749 }],
      source: 'report',
      at,
      blockRules: [],
    });

    expect(plan.toInsert).toHaveLength(0);
    expect(plan.toTouch).toEqual([7]);
    expect(plan.sourceHits).toEqual([{ nodeId: 7, source: 'report', at }]);
  });

  it('inserts an endpoint we have never seen', () => {
    const plan = planUpsert({
      existing: indexNodes([]),
      candidates: [{ network: 'test', host: '198.51.100.4', port: 32748 }],
      source: 'daemon',
      at,
      blockRules: [],
    });

    expect(plan.toInsert).toEqual([{
      network: 'test', host: '198.51.100.4', port: 32748, at,
    }]);
  });

  it('treats the same host on a different network as a different node', () => {
    const existing = indexNodes([node({ id: 7, network: 'main', host: '203.0.113.1', port: 32749 })]);
    const plan = planUpsert({
      existing,
      candidates: [{ network: 'test', host: '203.0.113.1', port: 32749 }],
      source: 'daemon',
      at,
      blockRules: [],
    });

    expect(plan.toInsert).toHaveLength(1);
    expect(plan.toTouch).toHaveLength(0);
  });

  it('de-duplicates repeats within one batch', () => {
    const plan = planUpsert({
      existing: indexNodes([node({ id: 3, host: '203.0.113.1' })]),
      candidates: [
        { network: 'main', host: '203.0.113.1', port: 32749 },
        { network: 'main', host: '203.0.113.1', port: 32749 },
        { network: 'main', host: '198.51.100.9', port: 32749 },
        { network: 'main', host: '198.51.100.9', port: 32749 },
      ],
      source: 'report',
      at,
      blockRules: [],
    });

    expect(plan.toTouch).toEqual([3]);
    expect(plan.sourceHits).toHaveLength(1);
    expect(plan.toInsert).toHaveLength(1);
  });

  it('drops blocked hosts and counts them', () => {
    const plan = planUpsert({
      existing: indexNodes([]),
      candidates: [
        { network: 'main', host: '203.0.113.1', port: 32749 },
        { network: 'main', host: '198.51.100.9', port: 32749 },
      ],
      source: 'report',
      at,
      blockRules: toRules([{ kind: 'ip', pattern: '203.0.113.1' }]),
    });

    expect(plan.blocked).toBe(1);
    expect(plan.toInsert).toHaveLength(1);
    expect(plan.toInsert[0].host).toBe('198.51.100.9');
  });

  it('lets every source annotate the same row, which is the whole model', () => {
    const existing = indexNodes([node({ id: 42, host: '203.0.113.1', port: 32749 })]);
    const candidate = [{ network: 'main' as const, host: '203.0.113.1', port: 32749 }];

    const hits = (['report', 'daemon', 'seed', 'probe'] as const).flatMap(
      (source) => planUpsert({
        existing, candidates: candidate, source, at, blockRules: [],
      }).sourceHits,
    );

    expect(hits.map((h) => h.source)).toEqual(['report', 'daemon', 'seed', 'probe']);
    // One node, four provenance rows — never four competing records.
    expect(new Set(hits.map((h) => h.nodeId))).toEqual(new Set([42]));
  });
});
