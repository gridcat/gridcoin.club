import {
  Alert,
  Box,
  Chip,
  Container,
  Divider,
  Grid,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { Header } from '@/components/Header/Header';
import { Footer } from '@/components/Footer/Footer';
import { Seo, SITE_NAME } from '@/components/Seo';
import { PageWrapper } from '@/components/PageWrapper';
import { ScrollTopFab } from '@/components/ScrollTopFab/ScrollTopFab';
import { SectionHeading } from '@/components/SectionHeading';
import { NextMuiLink } from '@/components/NextMuiLink';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { NodeStatusChip } from '@/components/NodeStatusChip';
import { UptimeBar } from '@/components/UptimeBar';
import { DailyUptimeChart, type DailyPoint } from '@/components/DailyUptimeChart';
import type { NodeStatus } from '@/lib/sources/addnodes';
import {
  humanDuration, networkLabel, percent, timeAgo, utc,
} from '@/lib/nodeFormat';

export interface TimelineEntry {
  event: 'discovered' | 'up' | 'down';
  from: string;
  to: string | null;
  durationMs: number | null;
}

export interface NodeDetailProps {
  renderedAt: string;
  node: {
    id: number;
    network: 'main' | 'test';
    addnode: string;
    host: string;
    port: number;
    ptr: string | null;
    label: string | null;
    notes: string | null;
    cc: string | null;
    asn: number | null;
    asnOrg: string | null;
    status: NodeStatus;
    firstSeen: string | null;
    lastSeen: string | null;
    lastOnlineAt: string | null;
    pinned: boolean;
    excluded: boolean;
  };
  uptime: string;
  uptime7d: number | null;
  probes7d: number;
  currentStreakMs: number | null;
  sources: Array<{ source: string; firstSeen: string; lastSeen: string; hits: number }>;
  timeline: TimelineEntry[];
  daily: DailyPoint[];
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
      <Typography variant="overline" sx={{ color: 'text.secondary', display: 'block', lineHeight: 1.4 }}>
        {label}
      </Typography>
      <Typography variant="body2" component="div">{children}</Typography>
    </Grid>
  );
}

const EVENT_LABEL: Record<TimelineEntry['event'], string> = {
  discovered: 'Discovered',
  up: 'Online',
  down: 'No answer',
};

export function NodeDetailPage({
  node, uptime, uptime7d, probes7d, currentStreakMs, sources, timeline, daily, renderedAt,
}: NodeDetailProps) {
  const now = new Date(renderedAt);

  return (
    <>
      <Seo
        title={`${node.addnode} — ${SITE_NAME}`}
        description={`Reachability history for the Gridcoin ${networkLabel(node.network)} peer ${node.addnode}.`}
        path={`/nodes/${node.id}`}
        // Thousands of thin pages listing IP addresses is a doorway pattern
        // search engines dislike, and indexing them amplifies an exposure we
        // gain nothing from. Linkable and shareable, just not indexed.
        noindex
      />
      <PageWrapper>
        <Header />
        <Container maxWidth="lg" sx={{ flexGrow: 1, py: { xs: 4, md: 6 } }}>

          <Breadcrumbs
            items={[
              { label: 'Home', href: '/' },
              { label: 'Nodes', href: '/nodes' },
              { label: 'Every node', href: '/nodes/all' },
              { label: node.addnode },
            ]}
          />

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            sx={{ pb: 1, alignItems: { sm: 'center' } }}
          >
            <Typography
              variant="h4"
              component="h1"
              sx={{
                fontWeight: 800,
                fontFamily: 'monospace',
                wordBreak: 'break-all',
                // Addresses run to 40+ characters; let long ones shrink
                // rather than wrap across the status chip.
                fontSize: { xs: '1.35rem', sm: 'clamp(1.35rem, 3.2vw, 2rem)' },
              }}
            >
              {node.addnode}
            </Typography>
            <NodeStatusChip status={node.status} />
          </Stack>

          <Stack direction="row" spacing={1} sx={{ pb: 3, flexWrap: 'wrap', gap: 1 }}>
            <Chip
              size="small"
              variant="outlined"
              color={node.network === 'main' ? 'primary' : 'warning'}
              label={networkLabel(node.network)}
            />
            {node.pinned ? <Chip size="small" color="info" label="Pinned" /> : null}
            {node.excluded ? <Chip size="small" color="default" label="Not published" /> : null}
          </Stack>

          {node.excluded ? (
            <Alert severity="info" sx={{ mb: 3 }}>
              This node is tracked but deliberately kept out of the published
              list.
            </Alert>
          ) : null}

          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Grid container spacing={2}>
              <Fact label="Currently">
                {node.status === 'online' ? 'Online' : 'Not answering'}
                {currentStreakMs !== null ? ` for ${humanDuration(currentStreakMs)}` : ''}
              </Fact>
              <Fact label="Last online">{timeAgo(node.lastOnlineAt, now)}</Fact>
              <Fact label="First seen">{utc(node.firstSeen)}</Fact>
              <Fact label="Uptime, last 7 days">
                {percent(uptime7d)}
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                  {`over ${probes7d} ${probes7d === 1 ? 'check' : 'checks'}`}
                </Typography>
              </Fact>
              <Fact label="Endpoint">
                {node.host}
                :
                {node.port}
              </Fact>
              <Fact label="Reverse DNS">{node.ptr ?? 'none confirmed'}</Fact>
              <Fact label="Country">{node.cc ?? '—'}</Fact>
              <Fact label="Network operator">
                {node.asnOrg ?? '—'}
                {node.asn ? (
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                    AS
                    {node.asn}
                  </Typography>
                ) : null}
              </Fact>
              <Fact label="Label">{node.label ?? '—'}</Fact>
            </Grid>
          </Paper>

          <SectionHeading>Last 48 hours</SectionHeading>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <UptimeBar series={uptime} hours={48} height={40} endsAt={now} />
            <Typography variant="caption" sx={{ color: 'text.secondary', pt: 1, display: 'block' }}>
              One block per hour, oldest on the left. Grey means we did not
              check that hour. A node that keeps failing is checked less often,
              so gaps are expected.
            </Typography>
          </Paper>

          <SectionHeading>Last 90 days</SectionHeading>
          <Paper variant="outlined" sx={{ p: 2 }}>
            {daily.length ? (
              <DailyUptimeChart points={daily} />
            ) : (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                No daily history yet.
              </Typography>
            )}
            <Typography variant="caption" sx={{ color: 'text.secondary', pt: 1, display: 'block' }}>
              Bar height is the share of checks that got an answer that day.
            </Typography>
          </Paper>

          <SectionHeading>Up and down</SectionHeading>
          <Paper variant="outlined">
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>State</TableCell>
                    <TableCell>From</TableCell>
                    <TableCell>Until</TableCell>
                    <TableCell align="right">For</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {timeline.map((t) => (
                    <TableRow key={`${t.event}-${t.from}`} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                      <TableCell>{EVENT_LABEL[t.event]}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{utc(t.from)}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        {t.to ? utc(t.to) : 'now'}
                      </TableCell>
                      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                        {humanDuration(t.durationMs)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {timeline.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4}>
                        <Typography variant="body2" sx={{ color: 'text.secondary', py: 2 }}>
                          Nothing recorded yet.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </Box>
          </Paper>
          <Typography variant="caption" sx={{ color: 'text.secondary', pt: 1, display: 'block' }}>
            Transitions only, kept indefinitely, so this reaches back
            further than the charts above.
          </Typography>

          <SectionHeading>How we know about it</SectionHeading>
          <Paper variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Source</TableCell>
                  <TableCell>First</TableCell>
                  <TableCell>Most recent</TableCell>
                  <TableCell align="right">Times</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sources.map((s) => (
                  <TableRow key={s.source} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                    <TableCell>{s.source}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{utc(s.firstSeen)}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{utc(s.lastSeen)}</TableCell>
                    <TableCell align="right">{s.hits}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>

          <Divider sx={{ my: 4 }} />
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Run this node and would rather it was not listed?
            {' '}
            <NextMuiLink href="/about#contact">Contact us</NextMuiLink>
            {' '}
            and we will remove it and stop checking it.
          </Typography>
        </Container>
        <Footer />
      </PageWrapper>
      <ScrollTopFab />
    </>
  );
}
