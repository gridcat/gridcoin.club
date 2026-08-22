import { describe, expect, it } from 'vitest';
import {
  clientAddress, hashReporter, MAX_PEERS_PER_REPORT, validateReport,
} from '@/server/addnodes/ingest';

const reporter = 'a'.repeat(32);

function body(overrides: Record<string, unknown> = {}) {
  return {
    v: 1,
    reporter,
    client: 'gridcoinresearch-tui/1.4.2',
    network: 'main',
    peers: ['45.33.32.156:32749'],
    ...overrides,
  };
}

describe('validateReport', () => {
  it('accepts a well-formed report', () => {
    const result = validateReport(body());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.report.network).toBe('main');
    expect(result.report.peers).toEqual(['45.33.32.156:32749']);
    expect(result.report.accepted).toBe(1);
    expect(result.report.rejected).toBe(0);
  });

  it('never stores the reporter id the client holds', () => {
    const result = validateReport(body());
    if (!result.ok) throw new Error('expected ok');
    expect(result.report.reporterHash).not.toBe(reporter);
    expect(result.report.reporterHash).toHaveLength(16);
    expect(result.report.reporterHash).toBe(hashReporter(reporter));
  });

  it('rejects a body that is not an object', () => {
    expect(validateReport(null)).toMatchObject({ error: 'bad_json' });
    expect(validateReport('nope')).toMatchObject({ error: 'bad_json' });
    expect(validateReport([])).toMatchObject({ error: 'bad_json' });
  });

  it('rejects an unknown protocol version', () => {
    expect(validateReport(body({ v: 2 }))).toMatchObject({ error: 'unsupported_version' });
    expect(validateReport(body({ v: undefined }))).toMatchObject({ error: 'unsupported_version' });
  });

  it('rejects a malformed reporter id', () => {
    expect(validateReport(body({ reporter: 'short' }))).toMatchObject({ error: 'bad_reporter' });
    expect(validateReport(body({ reporter: 'z'.repeat(32) }))).toMatchObject({ error: 'bad_reporter' });
    expect(validateReport(body({ reporter: 42 }))).toMatchObject({ error: 'bad_reporter' });
  });

  it('accepts an upper-case reporter id, since hex is hex', () => {
    expect(validateReport(body({ reporter: 'A'.repeat(32) })).ok).toBe(true);
  });

  it('rejects a client string with control or exotic characters', () => {
    expect(validateReport(body({ client: '' }))).toMatchObject({ error: 'bad_client' });
    expect(validateReport(body({ client: 'a'.repeat(65) }))).toMatchObject({ error: 'bad_client' });
    expect(validateReport(body({ client: 'evil\n<script>' }))).toMatchObject({ error: 'bad_client' });
  });

  it('rejects an unknown network', () => {
    expect(validateReport(body({ network: 'regtest' }))).toMatchObject({ error: 'bad_network' });
  });

  it('rejects a peers field that is not an array', () => {
    expect(validateReport(body({ peers: '203.0.113.1:32749' }))).toMatchObject({ error: 'bad_peers' });
  });

  it('rejects an oversized peer list outright', () => {
    const peers = Array.from({ length: MAX_PEERS_PER_REPORT + 1 }, (_, i) => `45.33.${i}.1:32749`);
    expect(validateReport(body({ peers }))).toMatchObject({ error: 'bad_peers' });
  });

  it('drops non-routable peers and counts them as rejected', () => {
    const result = validateReport(body({
      peers: [
        '45.33.32.156:32749',
        '127.0.0.1:32749',
        '192.168.1.5:32749',
        '10.0.0.1:32749',
        '100.64.0.1:32749',
        'not-an-address',
      ],
    }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.report.peers).toEqual(['45.33.32.156:32749']);
    expect(result.report.rejected).toBe(5);
  });

  it('refuses a report with nothing usable left', () => {
    expect(validateReport(body({ peers: ['127.0.0.1:32749'] })))
      .toMatchObject({ error: 'no_valid_peers' });
    expect(validateReport(body({ peers: [] }))).toMatchObject({ error: 'no_valid_peers' });
  });

  it('de-duplicates repeated peers', () => {
    const result = validateReport(body({
      peers: ['45.33.32.156:32749', '45.33.32.156:32749'],
    }));
    if (!result.ok) throw new Error('expected ok');
    expect(result.report.peers).toHaveLength(1);
  });

  it('normalises an IPv6 peer', () => {
    const result = validateReport(body({ peers: ['[2606:4700:4700::1111]:32749'] }));
    if (!result.ok) throw new Error('expected ok');
    expect(result.report.peers).toEqual(['[2606:4700:4700::1111]:32749']);
  });
});

describe('clientAddress', () => {
  it('prefers the Cloudflare header', () => {
    expect(clientAddress({
      'cf-connecting-ip': '203.0.113.9',
      'x-forwarded-for': '198.51.100.1',
    }, '127.0.0.1')).toBe('203.0.113.9');
  });

  it('falls back to the first forwarded hop', () => {
    expect(clientAddress({ 'x-forwarded-for': '198.51.100.1, 10.0.0.1' }, '127.0.0.1'))
      .toBe('198.51.100.1');
  });

  it('falls back to the socket when there are no headers', () => {
    expect(clientAddress({}, '127.0.0.1')).toBe('127.0.0.1');
  });

  it('never returns empty, so a limiter key is always well-formed', () => {
    expect(clientAddress({})).toBe('unknown');
    expect(clientAddress({ 'x-forwarded-for': '' })).toBe('unknown');
  });
});
