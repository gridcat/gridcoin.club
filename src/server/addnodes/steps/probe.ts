// Reachability probing and the backoff ladder.
//
// Liveness is the whole product, so this is the step that has to be right.
// Once a node exists it is probed forever, whatever introduced it, including
// long-dead ones — a host that comes back must be rediscovered rather than
// stranded in `dead` because we stopped looking.
//
// The probe itself is a plain TCP connect to the port carried in the address.
// Never assume 32749/32748: prod testnet listens on 32749, and a node is free
// to listen anywhere. A completed handshake would be stronger evidence, but a
// connect is what cycy's list has always meant by "online" and it costs one
// round trip instead of a protocol implementation.

import { createConnection } from 'node:net';
import type { NodeRow, NodeStatus } from '../../db/database';
import type { NodeStateUpdate } from '../repository';

export const PROBE_TIMEOUT_MS = 3000;
export const PROBE_CONCURRENCY = 20;
/**
 * Ceiling on probes per run. `getnodeaddresses` dumps the entire address
 * manager — thousands of entries — and probing all of them every 15 minutes
 * would not finish inside the tick. Whatever is skipped is logged: a silently
 * truncated queue reads as "everything is dead".
 */
export const PROBE_BUDGET = 1500;

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

export interface ProbeOutcome {
  node: NodeRow;
  ok: boolean;
  at: Date;
}

/**
 * How long until this node is probed again.
 *
 * A brand-new node is probed on the run that discovers it. A healthy one
 * hourly, which is what the hourly uptime bar needs. A failing one backs off
 * exponentially so a dead host stops costing us a slot. A long-dead one still
 * gets a daily slot — that is the line that lets a returning node come back.
 */
export function nextProbeDelayMs(status: NodeStatus, failStreak: number): number {
  if (status === 'dead') return 24 * HOUR;
  if (failStreak <= 0) return HOUR;
  const ladder = [1, 2, 4, 8, 16];
  const idx = Math.min(failStreak, ladder.length) - 1;
  return ladder[idx] * HOUR;
}

/**
 * Choose what to probe this run: overdue nodes, never-probed ones first.
 *
 * Pure, so the budget and ordering are testable without a socket.
 */
export function selectProbeQueue(
  nodes: NodeRow[],
  now: Date,
  budget = PROBE_BUDGET,
): { queue: NodeRow[]; skipped: number } {
  const due = nodes.filter((n) => new Date(n.next_probe_at).getTime() <= now.getTime());
  due.sort((a, b) => {
    const aNew = a.last_probe_at === null ? 0 : 1;
    const bNew = b.last_probe_at === null ? 0 : 1;
    if (aNew !== bNew) return aNew - bNew;
    return new Date(a.next_probe_at).getTime() - new Date(b.next_probe_at).getTime();
  });
  return { queue: due.slice(0, budget), skipped: Math.max(0, due.length - budget) };
}

/** One TCP connect. Resolves true only on an established connection. */
export function tcpProbe(
  host: string,
  port: number,
  timeoutMs = PROBE_TIMEOUT_MS,
): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      try { socket.destroy(); } catch { /* already gone */ }
      resolve(ok);
    };
    const socket = createConnection({ host, port });
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
  });
}

type ProbeFn = (host: string, port: number) => Promise<boolean>;

/** Run the queue with a bounded worker pool. */
export async function runProbes(
  queue: NodeRow[],
  at: Date,
  probe: ProbeFn = (h, p) => tcpProbe(h, p),
  concurrency = PROBE_CONCURRENCY,
): Promise<ProbeOutcome[]> {
  const outcomes: ProbeOutcome[] = [];
  let cursor = 0;

  async function worker(): Promise<void> {
    for (;;) {
      const idx = cursor;
      cursor += 1;
      if (idx >= queue.length) return;
      const node = queue[idx];
      const ok = await probe(node.host, node.port);
      outcomes.push({ node, ok, at });
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, queue.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return outcomes;
}

/**
 * Classify from probe history alone.
 *
 * Reporter sightings deliberately do not feed this. They can introduce a node
 * and they are shown on the page, but only a successful probe of our own puts
 * an address in front of a wallet — which is what makes report poisoning
 * pointless.
 */
export function classify(
  node: Pick<NodeRow, 'last_probe_ok_at' | 'last_probe_at'>,
  ok: boolean,
  now: Date,
): NodeStatus {
  if (ok) return 'online';
  const lastOk = node.last_probe_ok_at ? new Date(node.last_probe_ok_at).getTime() : null;
  if (lastOk !== null && now.getTime() - lastOk < 7 * 24 * HOUR) return 'unreachable';
  return 'dead';
}

/** Turn probe outcomes into the node-row updates they imply. */
export function planNodeUpdates(outcomes: ProbeOutcome[]): NodeStateUpdate[] {
  return outcomes.map(({ node, ok, at }) => {
    const failStreak = ok ? 0 : Number(node.probe_fail_streak ?? 0) + 1;
    const status = classify(node, ok, at);
    return {
      id: Number(node.id),
      status,
      lastProbeAt: at,
      ...(ok ? { lastProbeOkAt: at, lastOnlineAt: at } : {}),
      probeFailStreak: failStreak,
      nextProbeAt: new Date(at.getTime() + nextProbeDelayMs(status, failStreak)),
    };
  });
}
