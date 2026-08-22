// Address parsing, normalisation and routability checks.
//
// Shared by every input path: the ingest route validates reported peers with
// it, the harvest step filters the daemon's addrman with it, and the seed
// importer runs hostnames through it. Keeping one implementation matters —
// a peer that the ingest route accepts but the harvester rejects would show
// up as two different nodes.
//
// Everything here is a pure function so it can be unit-tested without a
// database or a socket.

export const MAINNET_P2P_PORT = 32749;
export const TESTNET_P2P_PORT = 32748;

export interface Endpoint {
  host: string;
  port: number;
}

export interface ParseOptions {
  /** Seeds are hostnames; reports and addrman entries are always literal IPs. */
  allowHostname?: boolean;
  /** Used when the input carries no port, e.g. a bare seed hostname. */
  defaultPort?: number;
}

const IPV4_RE = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
// Deliberately permissive on shape; correctness comes from parseIpv6 below.
const HOSTNAME_RE = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;

/** Parse dotted-quad to 4 bytes, or null if it is not an IPv4 literal. */
export function parseIpv4(value: string): number[] | null {
  const m = IPV4_RE.exec(value);
  if (!m) return null;
  const bytes = m.slice(1).map((p) => {
    // Reject "01" and "0000" style octets: they are ambiguous (some
    // resolvers read them as octal) and never appear in real peer data.
    if (p.length > 1 && p.startsWith('0')) return -1;
    return Number(p);
  });
  if (bytes.some((b) => b < 0 || b > 255)) return null;
  return bytes;
}

/** Parse an IPv6 literal to 16 bytes, handling `::` and trailing IPv4. */
export function parseIpv6(value: string): number[] | null {
  if (!value.includes(':')) return null;
  // Strip a zone id ("fe80::1%eth0"); it is meaningless to us.
  const raw = value.split('%')[0];

  const halves = raw.split('::');
  if (halves.length > 2) return null;

  const toGroups = (part: string): number[][] | null => {
    if (part === '') return [];
    const out: number[][] = [];
    const pieces = part.split(':');
    for (let i = 0; i < pieces.length; i += 1) {
      const piece = pieces[i];
      if (piece === '') return null;
      // A trailing dotted-quad ("::ffff:1.2.3.4") occupies two groups.
      if (piece.includes('.')) {
        if (i !== pieces.length - 1) return null;
        const v4 = parseIpv4(piece);
        if (!v4) return null;
        out.push([v4[0], v4[1]], [v4[2], v4[3]]);
        continue;
      }
      if (!/^[0-9a-f]{1,4}$/i.test(piece)) return null;
      const n = parseInt(piece, 16);
      out.push([(n >> 8) & 0xff, n & 0xff]);
    }
    return out;
  };

  const head = toGroups(halves[0]);
  if (head === null) return null;

  if (halves.length === 1) {
    if (head.length !== 8) return null;
    return head.flat();
  }

  const tail = toGroups(halves[1]);
  if (tail === null) return null;
  const missing = 8 - head.length - tail.length;
  if (missing < 1) return null;
  const zeros = Array.from({ length: missing }, () => [0, 0]);
  return [...head, ...zeros, ...tail].flat();
}

export type IpKind = 'ipv4' | 'ipv6' | 'hostname';

export function classifyHost(host: string): IpKind | null {
  if (parseIpv4(host)) return 'ipv4';
  if (parseIpv6(host)) return 'ipv6';
  if (HOSTNAME_RE.test(host)) return 'hostname';
  return null;
}

/**
 * Is this address one we could plausibly reach over the public internet?
 *
 * Hostnames pass — we cannot know without resolving, and the prober will
 * find out soon enough. Literal addresses are checked against the ranges
 * that could never be a public peer, which is the part that matters: a
 * malicious reporter listing 127.0.0.1 or 10.0.0.0/8 would otherwise make
 * us probe ourselves or scan someone's LAN from inside their network.
 */
export function isRoutable(host: string): boolean {
  const v4 = parseIpv4(host);
  if (v4) return isRoutableV4(v4);
  const v6 = parseIpv6(host);
  if (v6) return isRoutableV6(v6);
  return HOSTNAME_RE.test(host);
}

function isRoutableV4(b: number[]): boolean {
  const [a, c] = b;
  if (a === 0) return false;                        // 0.0.0.0/8 "this network"
  if (a === 10) return false;                       // RFC1918
  if (a === 127) return false;                      // loopback
  if (a === 169 && c === 254) return false;         // link-local
  if (a === 172 && c >= 16 && c <= 31) return false; // RFC1918
  if (a === 192 && c === 168) return false;         // RFC1918
  if (a === 192 && c === 0) return false;           // 192.0.0.0/24 + 192.0.2.0/24 TEST-NET-1
  if (a === 198 && (c === 18 || c === 19)) return false; // benchmarking
  if (a === 198 && c === 51) return false;          // TEST-NET-2
  if (a === 203 && c === 0) return false;           // TEST-NET-3
  if (a === 100 && c >= 64 && c <= 127) return false; // CGNAT
  if (a >= 224) return false;                       // multicast + reserved + broadcast
  return true;
}

function isRoutableV6(b: number[]): boolean {
  const allZero = b.every((x) => x === 0);
  if (allZero) return false;                        // ::
  if (b.slice(0, 15).every((x) => x === 0) && b[15] === 1) return false; // ::1
  if (b[0] === 0xff) return false;                  // multicast
  if ((b[0] & 0xfe) === 0xfc) return false;         // fc00::/7 unique-local
  if (b[0] === 0xfe && (b[1] & 0xc0) === 0x80) return false; // fe80::/10 link-local
  // 2001:db8::/32 is documentation space, the v6 counterpart of the TEST-NET
  // ranges rejected above. A real peer is never there.
  if (b[0] === 0x20 && b[1] === 0x01 && b[2] === 0x0d && b[3] === 0xb8) return false;
  // IPv4-mapped (::ffff:a.b.c.d) and IPv4-compatible: judge the embedded v4,
  // otherwise 127.0.0.1 sneaks past dressed as ::ffff:7f00:1.
  const v4Mapped = b.slice(0, 10).every((x) => x === 0) && b[10] === 0xff && b[11] === 0xff;
  const v4Compat = b.slice(0, 12).every((x) => x === 0);
  if (v4Mapped || v4Compat) return isRoutableV4(b.slice(12));
  return true;
}

/** Canonical lowercase form; IPv6 keeps whatever compression it arrived with. */
export function normaliseHost(host: string): string {
  return host.trim().toLowerCase().replace(/\.$/, '');
}

/**
 * Parse "host", "host:port" or "[v6]:port" into an endpoint.
 * Returns null for anything malformed, out of range or non-routable.
 */
export function parseEndpoint(input: string, options: ParseOptions = {}): Endpoint | null {
  const { allowHostname = false, defaultPort } = options;
  const value = String(input ?? '').trim();
  if (!value || value.length > 300) return null;

  let host: string;
  let portPart: string | undefined;

  if (value.startsWith('[')) {
    const close = value.indexOf(']');
    if (close < 0) return null;
    host = value.slice(1, close);
    const rest = value.slice(close + 1);
    if (rest.startsWith(':')) portPart = rest.slice(1);
    else if (rest !== '') return null;
  } else {
    const colons = value.split(':').length - 1;
    if (colons > 1) {
      // Bare IPv6 with no port.
      host = value;
    } else if (colons === 1) {
      [host, portPart] = value.split(':');
    } else {
      host = value;
    }
  }

  host = normaliseHost(host);
  if (!host) return null;

  const kind = classifyHost(host);
  if (!kind) return null;
  if (kind === 'hostname' && !allowHostname) return null;
  if (!isRoutable(host)) return null;

  let port: number;
  if (portPart === undefined || portPart === '') {
    if (defaultPort === undefined) return null;
    port = defaultPort;
  } else {
    if (!/^\d{1,5}$/.test(portPart)) return null;
    port = Number(portPart);
  }
  if (!Number.isInteger(port) || port < 1 || port > 65535) return null;

  return { host, port };
}

/** Render an endpoint back to the wire form, bracketing IPv6. */
export function formatEndpoint(e: Endpoint): string {
  const needsBrackets = classifyHost(e.host) === 'ipv6';
  return needsBrackets ? `[${e.host}]:${e.port}` : `${e.host}:${e.port}`;
}

/**
 * The grouping key used to stop one hoster dominating the published list:
 * IPv4 /16, IPv6 /32, and hostnames by their registrable-ish suffix.
 */
export function diversityKey(host: string): string {
  const v4 = parseIpv4(host);
  if (v4) return `v4:${v4[0]}.${v4[1]}`;
  const v6 = parseIpv6(host);
  if (v6) return `v6:${v6.slice(0, 4).map((x) => x.toString(16).padStart(2, '0')).join('')}`;
  const parts = host.split('.');
  return `dns:${parts.slice(-2).join('.')}`;
}

/** Does `host` fall inside `a.b.c.d/len` (or the v6 equivalent)? */
export function inCidr(host: string, cidr: string): boolean {
  const slash = cidr.lastIndexOf('/');
  if (slash < 0) return false;
  const network = normaliseHost(cidr.slice(0, slash));
  const lenRaw = cidr.slice(slash + 1);
  if (!/^\d{1,3}$/.test(lenRaw)) return false;
  const len = Number(lenRaw);

  const hostBytes = parseIpv4(host) ?? parseIpv6(host);
  const netBytes = parseIpv4(network) ?? parseIpv6(network);
  if (!hostBytes || !netBytes) return false;
  if (hostBytes.length !== netBytes.length) return false;
  if (len > hostBytes.length * 8) return false;

  const fullBytes = Math.floor(len / 8);
  for (let i = 0; i < fullBytes; i += 1) {
    if (hostBytes[i] !== netBytes[i]) return false;
  }
  const remaining = len % 8;
  if (remaining === 0) return true;
  const mask = (0xff << (8 - remaining)) & 0xff;
  return (hostBytes[fullBytes] & mask) === (netBytes[fullBytes] & mask);
}
