import { describe, expect, it } from 'vitest';
import {
  classifyHost, diversityKey, formatEndpoint, inCidr, isRoutable, parseEndpoint,
  parseIpv4, parseIpv6,
} from '@/server/addnodes/addr';

describe('parseIpv4', () => {
  it('accepts a dotted quad', () => {
    expect(parseIpv4('203.0.113.7')).toEqual([203, 0, 113, 7]);
  });

  it('rejects out-of-range octets', () => {
    expect(parseIpv4('256.0.0.1')).toBeNull();
  });

  it('rejects zero-padded octets, which some resolvers read as octal', () => {
    expect(parseIpv4('010.0.0.1')).toBeNull();
    expect(parseIpv4('1.2.3.04')).toBeNull();
  });
});

describe('parseIpv6', () => {
  it('expands a compressed address', () => {
    expect(parseIpv6('::1')).toEqual([...Array(15).fill(0), 1]);
  });

  it('parses a full address', () => {
    expect(parseIpv6('2001:db8::1')?.slice(0, 4)).toEqual([0x20, 0x01, 0x0d, 0xb8]);
  });

  it('handles a trailing dotted quad', () => {
    expect(parseIpv6('::ffff:192.0.2.128')?.slice(12)).toEqual([192, 0, 2, 128]);
  });

  it('rejects two compression markers', () => {
    expect(parseIpv6('1::2::3')).toBeNull();
  });

  it('ignores a zone id', () => {
    expect(parseIpv6('fe80::1%eth0')).not.toBeNull();
  });
});

describe('isRoutable', () => {
  // The table that matters: a malicious report listing any of these would
  // otherwise make us probe ourselves or scan a private network.
  const nonRoutable = [
    '0.0.0.0', '10.1.2.3', '127.0.0.1', '169.254.1.1', '172.16.0.1', '172.31.255.255',
    '192.168.1.1', '100.64.0.1', '100.127.255.255', '224.0.0.1', '255.255.255.255',
    '198.18.0.1', '::1', '::', 'fe80::1', 'fc00::1', 'fd12:3456::1', 'ff02::1',
    '::ffff:127.0.0.1', '::ffff:10.0.0.1',
    // RFC 3849 documentation space, the v6 counterpart of TEST-NET.
    '2001:db8::1',
  ];

  it.each(nonRoutable)('rejects %s', (host) => {
    expect(isRoutable(host)).toBe(false);
  });

  const routable = ['8.8.8.8', '172.32.0.1', '172.15.0.1', '100.63.255.255', '100.128.0.1', '2606:4700:4700::1111'];

  it.each(routable)('accepts %s', (host) => {
    expect(isRoutable(host)).toBe(true);
  });
});

describe('classifyHost', () => {
  it('tells the three kinds apart', () => {
    expect(classifyHost('8.8.8.8')).toBe('ipv4');
    expect(classifyHost('2001:db8::1')).toBe('ipv6');
    expect(classifyHost('seed.gridcoin.pl')).toBe('hostname');
    expect(classifyHost('not a host')).toBeNull();
  });
});

describe('parseEndpoint', () => {
  it('parses host:port', () => {
    expect(parseEndpoint('8.8.8.8:32749')).toEqual({ host: '8.8.8.8', port: 32749 });
  });

  it('parses a bracketed IPv6 endpoint', () => {
    expect(parseEndpoint('[2606:4700:4700::1111]:32749'))
      .toEqual({ host: '2606:4700:4700::1111', port: 32749 });
  });

  it('accepts a bare IPv6 literal when a default port is supplied', () => {
    expect(parseEndpoint('2606:4700:4700::1111', { defaultPort: 32749 }))
      .toEqual({ host: '2606:4700:4700::1111', port: 32749 });
  });

  it('rejects documentation space, which no real peer uses', () => {
    expect(parseEndpoint('[2001:db8::1]:32749')).toBeNull();
    expect(parseEndpoint('203.0.113.7:32749')).toBeNull();
  });

  it('refuses a hostname unless the caller opts in', () => {
    expect(parseEndpoint('seed.gridcoin.pl:32749')).toBeNull();
    expect(parseEndpoint('seed.gridcoin.pl:32749', { allowHostname: true }))
      .toEqual({ host: 'seed.gridcoin.pl', port: 32749 });
  });

  it('requires a port when there is no default', () => {
    expect(parseEndpoint('8.8.8.8')).toBeNull();
  });

  it('rejects an out-of-range port', () => {
    expect(parseEndpoint('8.8.8.8:0')).toBeNull();
    expect(parseEndpoint('8.8.8.8:70000')).toBeNull();
  });

  it('rejects non-routable addresses whatever the port', () => {
    expect(parseEndpoint('127.0.0.1:32749')).toBeNull();
    expect(parseEndpoint('192.168.0.5:32749')).toBeNull();
  });

  it('lowercases and strips a trailing dot', () => {
    expect(parseEndpoint('Seed.Gridcoin.PL.:32749', { allowHostname: true }))
      .toEqual({ host: 'seed.gridcoin.pl', port: 32749 });
  });
});

describe('formatEndpoint', () => {
  it('brackets IPv6 and leaves IPv4 alone', () => {
    expect(formatEndpoint({ host: '8.8.8.8', port: 1 })).toBe('8.8.8.8:1');
    expect(formatEndpoint({ host: '2001:db8::1', port: 1 })).toBe('[2001:db8::1]:1');
  });
});

describe('parseEndpoint / formatEndpoint round trip', () => {
  // The wire format has to survive a round trip, because the ingest route
  // stores what formatEndpoint produced and the job re-parses it later. An
  // unbracketed IPv6 host:port does not, and would silently lose every v6
  // peer between the two.
  it.each([
    '8.8.8.8:32749',
    '[2606:4700:4700::1111]:32749',
    '[2606:4700:4700::1111]:40000',
  ])('%s survives parse then format', (wire) => {
    const parsed = parseEndpoint(wire);
    expect(parsed).not.toBeNull();
    const formatted = formatEndpoint(parsed!);
    expect(formatted).toBe(wire);
    expect(parseEndpoint(formatted)).toEqual(parsed);
  });
});

describe('diversityKey', () => {
  it('groups an IPv4 /16', () => {
    expect(diversityKey('203.0.113.1')).toBe(diversityKey('203.0.9.9'));
    expect(diversityKey('203.0.113.1')).not.toBe(diversityKey('203.1.113.1'));
  });

  it('groups an IPv6 /32', () => {
    expect(diversityKey('2001:db8::1')).toBe(diversityKey('2001:db8:ffff::9'));
    expect(diversityKey('2001:db8::1')).not.toBe(diversityKey('2001:db9::1'));
  });

  it('groups hostnames by their suffix', () => {
    expect(diversityKey('a.example.net')).toBe(diversityKey('b.example.net'));
  });
});

describe('inCidr', () => {
  it('matches inside an IPv4 range', () => {
    expect(inCidr('203.0.113.7', '203.0.113.0/24')).toBe(true);
    expect(inCidr('203.0.114.7', '203.0.113.0/24')).toBe(false);
  });

  it('handles a non-byte-aligned prefix', () => {
    expect(inCidr('203.0.113.100', '203.0.113.64/26')).toBe(true);
    expect(inCidr('203.0.113.200', '203.0.113.64/26')).toBe(false);
  });

  it('matches inside an IPv6 range', () => {
    expect(inCidr('2001:db8::5', '2001:db8::/32')).toBe(true);
    expect(inCidr('2001:db9::5', '2001:db8::/32')).toBe(false);
  });

  it('never matches across families', () => {
    expect(inCidr('203.0.113.7', '2001:db8::/32')).toBe(false);
  });

  it('rejects a malformed cidr rather than throwing', () => {
    expect(inCidr('203.0.113.7', 'nonsense')).toBe(false);
    expect(inCidr('203.0.113.7', '203.0.113.0/999')).toBe(false);
  });
});
