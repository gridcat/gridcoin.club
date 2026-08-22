import type { GetServerSidePropsContext } from 'next';
import { NodeDetailPage } from '@/routes/nodes/detail';
import { withThemeDataServerSide } from '@/lib/modeDataServer';
import { loadNodeDetail } from '@/server/addnodes/queries';
import { confTarget } from '@/server/addnodes/steps/render';
import { log } from '@/server/log';

export const getServerSideProps = withThemeDataServerSide(
  async (context: GetServerSidePropsContext) => {
    const id = Number(context.params?.id);
    const now = new Date();

    let detail;
    try {
      detail = await loadNodeDetail(id, now);
    } catch (err) {
      // The two list pages read static JSON and survive a database outage;
      // this one cannot. Fail as "not found" rather than a 500 with a stack.
      log.error('node detail unavailable', { id, error: String(err) });
      return { notFound: true };
    }

    // A blocked host is not browsable either: delisting means it disappears,
    // not that it disappears from the text file.
    if (!detail || detail.blocked) return { notFound: true };

    const { node } = detail;
    context.res.setHeader(
      'Cache-Control',
      'public, s-maxage=300, stale-while-revalidate=900',
    );

    return {
      props: {
        renderedAt: now.toISOString(),
        node: {
          id: Number(node.id),
          network: node.network,
          addnode: confTarget(node),
          host: node.host,
          port: Number(node.port),
          ptr: node.ptr,
          label: node.label,
          notes: node.notes,
          cc: node.cc,
          asn: node.asn === null ? null : Number(node.asn),
          asnOrg: node.asn_org,
          status: node.status,
          firstSeen: new Date(node.first_seen_at).toISOString(),
          lastSeen: new Date(node.last_seen_at).toISOString(),
          lastOnlineAt: node.last_online_at ? new Date(node.last_online_at).toISOString() : null,
          pinned: Number(node.pinned) === 1,
          excluded: Number(node.excluded) === 1,
        },
        uptime: detail.stats.series,
        uptime7d: detail.stats.ratio,
        probes7d: detail.stats.probes,
        currentStreakMs: detail.currentStreakMs,
        sources: detail.sources.map((s) => ({
          source: s.source,
          firstSeen: new Date(s.first_seen_at).toISOString(),
          lastSeen: new Date(s.last_seen_at).toISOString(),
          hits: Number(s.hits),
        })),
        timeline: detail.timeline.map((t) => ({
          event: t.event,
          from: t.from.toISOString(),
          to: t.to ? t.to.toISOString() : null,
          durationMs: t.durationMs,
        })),
        daily: detail.daily.map((d) => ({
          day: new Date(d.day).toISOString().slice(0, 10),
          probes: Number(d.probes),
          successes: Number(d.successes),
        })),
      },
    };
  },
);

export default NodeDetailPage;
