// POST /api/nodes/report — the peer-sharing endpoint.
//
// Reached from the wallet as https://addnodes.gridcoin.club/v1/reports, which
// nginx proxies here; nothing else on that vhost touches an application.
//
// This handler does as little as possible on purpose. It validates, it writes
// one row, it answers. Everything expensive — probing, geo, rendering — is the
// job's problem, so a burst of reports can never slow a page render or hold a
// database connection open doing work.

import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb, now } from '@/server/db';
import { log } from '@/server/log';
import { rateLimit } from '@/server/rateLimit';
import {
  clientAddress, MAX_BODY_BYTES, NEXT_REPORT_AFTER_SECONDS, validateReport,
} from '@/server/addnodes/ingest';
import { countUnprocessedReports, isReporterBanned, recordReporter } from '@/server/addnodes/repository';

/**
 * If the job has died, reports pile up unread. Refusing past this point stops
 * us accumulating a table nobody will ever process, and makes the failure
 * visible to the client rather than silent.
 */
const MAX_UNPROCESSED_BACKLOG = 5000;

const PER_REPORTER_PER_HOUR = 6;
const PER_IP_PER_HOUR = 30;
const HOUR_MS = 3600_000;

interface Ack {
  ok: boolean;
  accepted?: number;
  rejected?: number;
  next_report_after?: number;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Ack>,
): Promise<void> {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ ok: false, error: 'method_not_allowed' });
    return;
  }

  // The real cap is `client_max_body_size 16k` on the nginx location: this
  // version of Next only accepts `runtime` and `maxDuration` in a route's
  // config export, so there is no way to configure the body parser here.
  // A report is a few dozen "host:port" strings; anything larger is not a
  // wallet being chatty, it is someone probing for a hole.
  const declared = Number(req.headers['content-length'] ?? 0);
  if (declared > MAX_BODY_BYTES) {
    res.status(413).json({ ok: false, error: 'payload_too_large' });
    return;
  }

  const validation = validateReport(req.body);
  if (!validation.ok) {
    res.status(400).json({ ok: false, error: validation.error });
    return;
  }
  const { report } = validation;

  const ip = clientAddress(req.headers as never, req.socket?.remoteAddress);
  const byReporter = rateLimit(`report:r:${report.reporterHash}`, PER_REPORTER_PER_HOUR, HOUR_MS);
  const byIp = rateLimit(`report:i:${ip}`, PER_IP_PER_HOUR, HOUR_MS);
  if (!byReporter.allowed || !byIp.allowed) {
    const retry = Math.max(byReporter.retryAfterSeconds, byIp.retryAfterSeconds);
    res.setHeader('Retry-After', String(retry));
    res.status(429).json({ ok: false, error: 'rate_limited', next_report_after: retry });
    return;
  }

  try {
    if (await isReporterBanned(report.reporterHash)) {
      res.status(403).json({ ok: false, error: 'reporter_banned' });
      return;
    }

    if (await countUnprocessedReports() > MAX_UNPROCESSED_BACKLOG) {
      log.error('report backlog exceeded, generator is probably dead');
      res.status(503).json({ ok: false, error: 'unavailable' });
      return;
    }

    const at = now();
    await getDb().insertInto('reports').values({
      received_at: at,
      reporter_hash: report.reporterHash,
      client: report.client,
      network: report.network,
      // Stored as given; the job re-parses each entry before trusting it.
      peers: JSON.stringify(report.peers),
      processed_at: null,
    }).execute();
    await recordReporter(report.reporterHash, at);

    res.status(200).json({
      ok: true,
      accepted: report.accepted,
      rejected: report.rejected,
      next_report_after: NEXT_REPORT_AFTER_SECONDS,
    });
  } catch (err) {
    // A database that is down costs new reports and nothing else: the
    // published list keeps serving from static files. Say so plainly rather
    // than leaking a 500 with a stack.
    log.error('report ingest failed', { error: String(err) });
    res.status(503).json({ ok: false, error: 'unavailable' });
  }
}
