import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  cleanTemps, confComment, confTarget, publishFiles, publishGate, readPreviousCounts,
  renderAllJson, renderCappedJson, renderTxt,
} from '@/server/addnodes/steps/render';
import type { UptimeStats } from '@/server/addnodes/uptime';
import { node } from './helpers';
import type { NodeRow } from '@/server/db/database';

const generatedAt = new Date('2026-08-21T10:15:02Z');

const stats: UptimeStats = {
  series: '1'.repeat(168), ratio: 1, probes: 168, successes: 168, reporters24h: 2,
};

function candidate(n: NodeRow) {
  return { node: n, stats };
}

describe('confTarget', () => {
  it('prefers a forward-confirmed PTR over the raw address', () => {
    expect(confTarget(node({ host: '203.0.113.1', ptr: 'node.example.net' })))
      .toBe('node.example.net');
  });

  it('omits the port when it is the network default', () => {
    expect(confTarget(node({ network: 'main', host: '203.0.113.1', port: 32749 })))
      .toBe('203.0.113.1');
    expect(confTarget(node({ network: 'test', host: '203.0.113.1', port: 32748 })))
      .toBe('203.0.113.1');
  });

  it('emits the port when it is not the default', () => {
    expect(confTarget(node({ network: 'main', host: '203.0.113.1', port: 40000 })))
      .toBe('203.0.113.1:40000');
  });

  it('brackets an IPv6 host that needs a port', () => {
    expect(confTarget(node({ host: '2001:db8::1', port: 40000, ptr: null })))
      .toBe('[2001:db8::1]:40000');
  });
});

describe('confComment', () => {
  it('lets an operator label win over the geo lookup', () => {
    expect(confComment(node({ label: 'US-central', cc: 'DE' }))).toBe('US-central');
  });

  it('falls back to the country', () => {
    expect(confComment(node({ label: null, cc: 'SE' }))).toMatch(/Sweden|SE/);
  });

  it('has nothing to say about an unlabelled, ungeolocated node', () => {
    expect(confComment(node({ label: null, cc: null }))).toBeNull();
  });
});

describe('renderTxt', () => {
  const selection = {
    online: [
      candidate(node({ host: '203.0.113.1', ptr: 'gridhost.example.net', cc: 'GB' })),
      candidate(node({ host: '198.51.100.7', label: 'US-central' })),
    ],
    unreachable: [candidate(node({ host: '192.0.2.9', cc: 'SE' }))],
  };

  it('emits only addnode= lines and # comments, so it can be cat into a conf', () => {
    const txt = renderTxt(selection, generatedAt);
    for (const line of txt.split('\n')) {
      if (line.trim() === '') continue;
      expect(line.startsWith('#') || line.startsWith('addnode=')).toBe(true);
    }
  });

  it('keeps the cycy section headers so existing readers still parse it', () => {
    const txt = renderTxt(selection, generatedAt);
    expect(txt).toContain('# Online (');
    expect(txt).toContain('# Unreachable (');
    expect(txt).toContain('Gridcoin Addnodes');
    expect(txt).toContain('Last updated:');
  });

  it('points at the delisting page in the header', () => {
    // A URL rather than the address itself: this file gets copied into
    // wallet configs all over the network, and the contact address lives in
    // exactly one place on the site.
    const txt = renderTxt(selection, generatedAt);
    expect(txt).toContain('https://gridcoin.club/about');
    expect(txt).not.toContain('@proton.me');
  });

  it('writes the entries with aligned trailing comments', () => {
    const txt = renderTxt(selection, generatedAt);
    expect(txt).toContain('addnode=gridhost.example.net');
    expect(txt).toMatch(/addnode=198\.51\.100\.7\s+# US-central/);
  });

  it('says so plainly when a section is empty', () => {
    const txt = renderTxt({ online: [], unreachable: [] }, generatedAt);
    expect(txt).toContain('# (none)');
  });
});

describe('renderCappedJson / renderAllJson', () => {
  it('reports the published count', () => {
    const parsed = JSON.parse(renderCappedJson('main', {
      online: [candidate(node({}))], unreachable: [],
    }, generatedAt));
    expect(parsed.count).toBe(1);
    expect(parsed.network).toBe('main');
  });

  it('sends the whole 168-hour series and the provenance in the full inventory', () => {
    const n = node({ id: 4 });
    const parsed = JSON.parse(renderAllJson(
      'main',
      [candidate(n)],
      new Map([[4, ['report', 'probe']]]),
      generatedAt,
    ));
    expect(parsed.nodes[0].uptime).toHaveLength(168);
    expect(parsed.nodes[0].sources).toEqual(['report', 'probe']);
  });
});

describe('publishGate', () => {
  it('publishes freely when there is nothing to compare against', () => {
    expect(publishGate(0, null).publish).toBe(true);
    expect(publishGate(5, { online: 0, total: 0 }).publish).toBe(true);
  });

  it('refuses to replace a working list with an empty one', () => {
    const gate = publishGate(0, { online: 12, total: 12 });
    expect(gate.publish).toBe(false);
    expect(gate.reason).toContain('zero');
  });

  it('refuses a drop of more than 70% in one tick', () => {
    expect(publishGate(3, { online: 20, total: 20 }).publish).toBe(false);
  });

  it('allows an ordinary fluctuation', () => {
    expect(publishGate(15, { online: 20, total: 20 }).publish).toBe(true);
    expect(publishGate(30, { online: 20, total: 20 }).publish).toBe(true);
  });
});

describe('publishFiles', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'addnodes-'));
  });

  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  it('writes every file and leaves no temp behind', async () => {
    await publishFiles(dir, new Map([['a.txt', 'A'], ['b.json', '{}']]));
    const entries = await fs.readdir(dir);
    expect(entries.sort()).toEqual(['a.txt', 'b.json']);
  });

  it('replaces an existing file atomically', async () => {
    await publishFiles(dir, new Map([['a.txt', 'old']]));
    await publishFiles(dir, new Map([['a.txt', 'new']]));
    expect(await fs.readFile(path.join(dir, 'a.txt'), 'utf8')).toBe('new');
  });

  it('leaves the previous files untouched when a write fails part-way', async () => {
    await publishFiles(dir, new Map([['a.txt', 'original']]));

    // A directory where a file should go makes the second write fail.
    await fs.mkdir(path.join(dir, '.tmp-b.txt.' + process.pid), { recursive: true });

    await expect(
      publishFiles(dir, new Map([['a.txt', 'replacement'], ['b.txt', 'new']])),
    ).rejects.toThrow();

    // This is the guarantee that matters: a stale list still bootstraps a
    // wallet, a truncated or missing one does not.
    expect(await fs.readFile(path.join(dir, 'a.txt'), 'utf8')).toBe('original');
    expect(await fs.readdir(dir)).not.toContain('b.txt');
  });

  it('sweeps temp files a crashed run left behind', async () => {
    await fs.writeFile(path.join(dir, '.tmp-stale.txt.999'), 'junk');
    await fs.writeFile(path.join(dir, 'keep.txt'), 'keep');
    await cleanTemps(dir);
    expect(await fs.readdir(dir)).toEqual(['keep.txt']);
  });
});

describe('readPreviousCounts', () => {
  it('reads the count out of the previous publication', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'addnodes-'));
    await fs.writeFile(path.join(dir, 'mainnet.json'), JSON.stringify({ count: 12 }));
    expect(await readPreviousCounts(dir, 'main')).toEqual({ online: 12, total: 12 });
    await fs.rm(dir, { recursive: true, force: true });
  });

  it('returns null on a first run rather than throwing', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'addnodes-'));
    expect(await readPreviousCounts(dir, 'main')).toBeNull();
    await fs.rm(dir, { recursive: true, force: true });
  });
});
