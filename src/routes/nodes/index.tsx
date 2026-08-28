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
import {
  Seo, SITE_NAME, breadcrumbLd, datasetLd,
} from '@/components/Seo';
import { PageWrapper } from '@/components/PageWrapper';
import { ScrollTopFab } from '@/components/ScrollTopFab/ScrollTopFab';
import { SectionHeading } from '@/components/SectionHeading';
import { CodeBlock } from '@/components/CodeBlock/CodeBlock';
import { NextMuiLink } from '@/components/NextMuiLink';
import { NodeStatusDot } from '@/components/NodeStatusChip';
import type { BothNetworks, NodeList, PublishedNode } from '@/lib/sources/addnodes';
import { percent, timeAgo, utc } from '@/lib/nodeFormat';


export interface NodesPageProps extends BothNetworks {
  baseUrl: string;
  renderedAt: string;
}

function NodeTable({ list, now }: { list: NodeList | null; now: Date }) {
  // The published file has an Online section and an Unreachable one, so the
  // page shows both. Without the unreachable rows a status dot would be
  // green on every line and tell the reader nothing.
  const rows: PublishedNode[] = list
    ? [...list.nodes, ...(list.unreachable ?? [])]
    : [];

  if (!rows.length) {
    return (
      <Typography variant="body2" sx={{ color: 'text.secondary', py: 2 }}>
        No entries published right now.
      </Typography>
    );
  }
  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Address</TableCell>
            <TableCell>Where</TableCell>
            <TableCell align="right">Uptime&nbsp;7&nbsp;d</TableCell>
            <TableCell align="right">Last online</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((n: PublishedNode) => (
            // No rule under the final row: the card's own edge is the
            // boundary, and a second line just doubles it up.
            <TableRow key={n.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
              <TableCell sx={{ fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <NodeStatusDot status={n.status} />
                  <NextMuiLink href={`/nodes/${n.id}`}>{n.addnode}</NextMuiLink>
                </Box>
              </TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>
                {n.label || n.cc || '—'}
                {n.asnOrg ? (
                  <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                    {n.asnOrg}
                  </Typography>
                ) : null}
              </TableCell>
              <TableCell align="right">{percent(n.uptime7d)}</TableCell>
              <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                {timeAgo(n.lastOnlineAt, now)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}

export function NodesPage({
  main, test, status, baseUrl, renderedAt,
}: NodesPageProps) {
  const now = new Date(renderedAt);
  const stale = status?.ageSeconds !== null && status?.ageSeconds !== undefined
    && status.ageSeconds > 3600;

  return (
    <>
      <Seo
        title={`Gridcoin addnodes — ${SITE_NAME}`}
        description="A continuously checked list of reachable Gridcoin peers, in the addnode= format wallets already understand. Free, no signup, updated every 15 minutes."
        path="/nodes"
        jsonLd={[
          breadcrumbLd([
            { name: 'Home', path: '/' },
            { name: 'Addnodes', path: '/nodes' },
          ]),
          datasetLd({
            name: 'Gridcoin addnodes list',
            description: 'Reachable Gridcoin peer-to-peer nodes, verified by direct connection and republished every 15 minutes in gridcoinresearch.conf syntax.',
            path: '/nodes',
            modified: status?.lastSuccessAt ?? null,
            distributions: [
              { name: 'Mainnet, conf format', url: `${baseUrl}/mainnet.txt`, encodingFormat: 'text/plain' },
              { name: 'Testnet, conf format', url: `${baseUrl}/testnet.txt`, encodingFormat: 'text/plain' },
              { name: 'Mainnet, JSON', url: `${baseUrl}/mainnet.json`, encodingFormat: 'application/json' },
              { name: 'Testnet, JSON', url: `${baseUrl}/testnet.json`, encodingFormat: 'application/json' },
            ],
          }),
        ]}
      />
      <PageWrapper>
        <Header />
        <Container maxWidth="lg" sx={{ flexGrow: 1, py: { xs: 4, md: 6 } }}>
          <Typography variant="h3" component="h1" sx={{ fontWeight: 800, pb: 1 }}>
            Addnodes
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary', pb: 4, maxWidth: 720 }}>
            Gridcoin peers that answered a connection just now, in addnode= format.
          </Typography>


          {status && !status.ok ? (
            <Alert severity="warning" sx={{ mb: 3 }}>
              The list below is being served from the last good run. Our
              generator has not completed since
              {' '}
              {utc(status.lastSuccessAt)}
              .
            </Alert>
          ) : null}
          {stale ? (
            <Alert severity="info" sx={{ mb: 3 }}>
              Last updated
              {' '}
              {timeAgo(status?.lastSuccessAt ?? null, now)}
              .
            </Alert>
          ) : null}

          <SectionHeading>Use it</SectionHeading>
          <Typography variant="body1" sx={{ pb: 2 }}>
            Append the list to your
            {' '}
            <code>gridcoinresearch.conf</code>
            . It is plain text: only
            {' '}
            <code>addnode=</code>
            {' '}
            lines and comments, so it is safe to
            concatenate straight into the file.
          </Typography>

          <CodeBlock
            language="bash"
            caption="shell · mainnet"
            code={`wget -O - ${baseUrl} >> ~/.GridcoinResearch/gridcoinresearch.conf`}
          />
          <CodeBlock
            language="bash"
            caption="shell · testnet"
            code={`wget -O - ${baseUrl}/testnet >> ~/.GridcoinResearch/testnet/gridcoinresearch.conf`}
          />

          <Typography variant="body2" sx={{ color: 'text.secondary', pb: 2 }}>
            There is JSON too, if you are building something:
            {' '}
            <code>/mainnet.json</code>
            ,
            {' '}
            <code>/testnet.json</code>
            , the full inventory at
            {' '}
            <code>/mainnet-all.json</code>
            , and
            {' '}
            <code>/status.json</code>
            .
          </Typography>

          <SectionHeading>Published right now</SectionHeading>
          <Typography variant="body2" sx={{ color: 'text.secondary', pb: 2 }}>
            {status?.lastSuccessAt
              ? `Regenerated every 15 minutes. Last run ${timeAgo(status.lastSuccessAt, now)}.`
              : 'Regenerated every 15 minutes.'}
            {' '}
            <NextMuiLink href="/nodes/all">See every node we know about →</NextMuiLink>
          </Typography>

          <Grid container spacing={4}>
            {([['Mainnet', main], ['Testnet', test]] as const).map(([label, list]) => (
              <Grid key={label} size={{ xs: 12 }}>
                <Stack direction="row" spacing={1} sx={{ pb: 1, alignItems: 'center' }}>
                  <Typography variant="h6" component="h3" sx={{ fontWeight: 600 }}>
                    {label}
                  </Typography>
                  <Chip size="small" color="success" label={`${list?.count ?? 0} online`} />
                  {list?.unreachable?.length ? (
                    <Chip
                      size="small"
                      color="warning"
                      variant="outlined"
                      label={`${list.unreachable.length} unreachable`}
                    />
                  ) : null}
                </Stack>
                <Paper variant="outlined" sx={{ p: 1 }}>
                  <NodeTable list={list} now={now} />
                </Paper>
              </Grid>
            ))}
          </Grid>

          <SectionHeading>How we build the list</SectionHeading>
          <Typography variant="body1" component="div">
            <p>
              Nodes come from three places: the address books of our own
              nodes, a small seed list, and, if you opt in, the peers
              your TUI wallet is connected to.
            </p>
            <p>
              None of that is enough to be published. Every candidate is
              connected to on a schedule, and only addresses that answered
              make it into the list. A node that stops answering is checked
              with a growing backoff, and a node that has been dead for months
              is still checked daily, so it reappears by itself if it comes
              back.
            </p>
            <p>
              The published list is capped at about 25 entries per network and
              spread across different networks and hosting providers.
              It is useless to add hundreds
              {' '}
              <code>addnode=</code>
              {' '}
              lines, a short list is a much smaller footprint for the
              people running those nodes.
            </p>
          </Typography>

          <SectionHeading>Sharing your peers</SectionHeading>
          <Typography variant="body1" component="div">
            <p>
              <strong>Off by default.</strong>
              {' '}
              gridcoinresearch-tui can share the addresses of the peers your
              node connected to, which tells us whether a node is reachable
              from somewhere that is not our server. This is opt-in feature. 
              It is possible to change the settings at any time later.
            </p>
            <p>
              A report contains the IP and port of the node, a random
              identifier your wallet made up locally, and the wallet version.
              It does not contain your wallet addresses, your balances, your
              transactions, your CPID, or your own IP address. We store a hash
              of that random identifier rather than the identifier itself.
              Shall you still worry please check the source code of the tui wallet.
            </p>
          </Typography>

          <Divider sx={{ my: 4 }} />

          <SectionHeading>Running a node and want off the list?</SectionHeading>
          <Typography variant="body1">
            These are publicly announced peer-to-peer endpoints, and they are
            already spreaded around the network by design. But, if you run
            one and still does not want it to be listed here,
            {' '}
            <NextMuiLink href="/about#contact">contact us</NextMuiLink>
            {' '}
            and we will remove it from the lists, the JSON and these pages,
            and stop checking it.
          </Typography>
        </Container>
        <Footer />
      </PageWrapper>
      <ScrollTopFab />
    </>
  );
}
