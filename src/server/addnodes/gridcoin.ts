// Minimal Gridcoin JSON-RPC client.
//
// Hand-rolled rather than pulling in `gridcoin-rpc`, which the rest of the
// family uses: this job needs exactly two read-only methods, and the apex
// image is one place where an extra dependency is worth avoiding. If a third
// caller ever appears, swap this for the package.
//
// Failure here is NOT fatal to a run — if a daemon is unreachable we skip
// harvest and carry on from rows already in the table (see the failure
// grading in the plan). So every method resolves to null rather than throwing.

import { log } from '../log';

export interface RpcConfig {
  host: string;
  port: number;
  user: string;
  password: string;
}

/** One entry from `getnodeaddresses`: an addrman record, unverified gossip. */
export interface NodeAddress {
  time: number;
  services: number;
  address: string;
  port: number;
}

/** The subset of `getpeerinfo` we use. `addr` is host:port. */
export interface PeerInfo {
  addr: string;
  inbound: boolean;
}

const TIMEOUT_MS = 15_000;

async function call<T>(cfg: RpcConfig, method: string, params: unknown[] = []): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`http://${cfg.host}:${cfg.port}/`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'content-type': 'application/json',
        authorization: `Basic ${Buffer.from(`${cfg.user}:${cfg.password}`).toString('base64')}`,
      },
      body: JSON.stringify({
        jsonrpc: '1.0', id: 'addnodes', method, params,
      }),
    });
    // The daemon answers 500 with a populated JSON-RPC error body, so the
    // envelope is more informative than the HTTP status. Parse first.
    const body = await res.json() as { result?: T; error?: { message?: string } };
    if (body.error) {
      log.warn('rpc error', { method, error: body.error.message });
      return null;
    }
    return (body.result ?? null) as T | null;
  } catch (err) {
    log.warn('rpc unreachable', { method, host: cfg.host, error: String(err) });
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * How many addrman entries to ask for. NOT zero: Bitcoin reads 0 as
 * "everything", but Gridcoin's rpc/net.cpp rejects it —
 * `if (count <= 0) throw ... "Address count out of range"` — and defaults to
 * **1** when the argument is omitted. Either way the bulk source silently
 * yields nothing, which is exactly what happened here.
 *
 * There is no upper bound to trip over. The RPC returns
 * `min(count, vAddr.size())`, and `addrman.GetAddr()` has already applied its
 * own ADDRMAN_GETADDR_MAX / _MAX_PCT ceilings, so any count at or above that
 * ceiling means "the whole pool" and asking for more is harmless.
 */
const ADDRMAN_ALL = 10000;

/**
 * Dump the daemon's address manager. This is the bulk source: addrman holds
 * thousands of gossiped entries, not just the handful we are connected to.
 */
export function getNodeAddresses(cfg: RpcConfig): Promise<NodeAddress[] | null> {
  return call<NodeAddress[]>(cfg, 'getnodeaddresses', [ADDRMAN_ALL]);
}

/**
 * Currently connected peers. Only the outbound ones are useful as addnodes:
 * for those, `addr` is the address we dialled, so it is provably reachable
 * and carries the peer's real listening port. An inbound peer's `addr` has
 * an ephemeral source port and is worthless as a seed.
 */
export function getPeerInfo(cfg: RpcConfig): Promise<PeerInfo[] | null> {
  return call<PeerInfo[]>(cfg, 'getpeerinfo');
}
