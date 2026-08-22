import React, { useMemo, useState } from 'react';
import {
  Alert, Box, Chip, Container, MenuItem, Paper, Stack, Table, TableBody, TableCell,
  TableHead, TablePagination, TableRow, TableSortLabel, TextField, ToggleButton,
  ToggleButtonGroup, Typography,
} from '@mui/material';
import { Header } from '@/components/Header/Header';
import { Footer } from '@/components/Footer/Footer';
import { GradientLine } from '@/components/GradientLine';
import {
  Seo, SITE_NAME, breadcrumbLd, datasetLd,
} from '@/components/Seo';
import { PageWrapper } from '@/components/PageWrapper';
import { ScrollTopFab } from '@/components/ScrollTopFab/ScrollTopFab';
import { NextMuiLink } from '@/components/NextMuiLink';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { NodeStatusChip } from '@/components/NodeStatusChip';
import { UptimeBar } from '@/components/UptimeBar';
import {
  ADDNODES_PUBLIC_URL,
  type BothNetworks, type NodeStatus, type PublishedNode,
} from '@/lib/sources/addnodes';
import { percent, timeAgo, utc } from '@/lib/nodeFormat';
import { NodeMap } from '@/components/NodeMap';
import type { MapNode } from '@/lib/worldMap';

type Row = PublishedNode & { network: 'main' | 'test' };
type SortKey = 'address' | 'network' | 'where' | 'status' | 'uptime' | 'lastOnline';

export interface AllNodesPageProps extends BothNetworks {
  renderedAt: string;
}

const STATUS_ORDER: Record<NodeStatus, number> = {
  online: 0, unreachable: 1, new: 2, dead: 3,
};

function flatten({ main, test }: BothNetworks): Row[] {
  return [
    ...(main?.nodes ?? []).map((n) => ({ ...n, network: 'main' as const })),
    ...(test?.nodes ?? []).map((n) => ({ ...n, network: 'test' as const })),
  ];
}

function whereOf(n: Row): string {
  return [n.label, n.cc, n.asnOrg].filter(Boolean).join(' ');
}

function compare(a: Row, b: Row, key: SortKey): number {
  switch (key) {
    case 'address': return a.addnode.localeCompare(b.addnode);
    case 'network': return a.network.localeCompare(b.network);
    case 'where': return whereOf(a).localeCompare(whereOf(b));
    case 'status': return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    case 'uptime': return (a.uptime7d ?? -1) - (b.uptime7d ?? -1);
    case 'lastOnline':
      return new Date(a.lastOnlineAt ?? 0).getTime() - new Date(b.lastOnlineAt ?? 0).getTime();
    default: return 0;
  }
}

type ColumnSpec = {
  key: SortKey;
  label: string;
  align?: 'right';
  /** Hidden below this breakpoint so narrow viewports never need to scroll. */
  hideBelow?: 'sm' | 'md' | 'lg';
};

const COLUMNS: ColumnSpec[] = [
  { key: 'address', label: 'Address' },
  { key: 'network', label: 'Network' },
  { key: 'where', label: 'Where', hideBelow: 'md' },
  { key: 'status', label: 'Status' },
  { key: 'uptime', label: 'Uptime 7 d', align: 'right' },
  { key: 'lastOnline', label: 'Last online', align: 'right', hideBelow: 'sm' },
];

/** `display` rules for a column that only appears from a breakpoint up. */
function hiddenBelow(bp?: 'sm' | 'md' | 'lg') {
  return bp ? { display: { xs: 'none', [bp]: 'table-cell' } } : {};
}

// 48 hours rather than the full week: at this column width 168 cells are
// under a pixel each and the bar renders as an empty smudge. The whole week
// is on the node's own page, where it has room.
const SPARK_HOURS = 48;

/** What the map needs off a row. `key` only orders a country's dots. */
function toMapNode(n: Row): MapNode {
  return {
    key: n.addnode,
    cc: n.cc,
    status: n.status,
    network: n.network,
    lat: n.lat,
    lon: n.lon,
  };
}

export function AllNodesPage(props: AllNodesPageProps) {
  const { status, renderedAt } = props;
  const now = new Date(renderedAt);
  const all = useMemo(() => flatten(props), [props]);

  // The server already emits the default order, so the table is complete and
  // correctly sorted with JavaScript switched off. State here only layers
  // re-sorting on top.
  const [sortKey, setSortKey] = useState<SortKey>('status');
  const [asc, setAsc] = useState(true);
  const [network, setNetwork] = useState<'all' | 'main' | 'test'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | NodeStatus>('all');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(50);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter((n) => {
      if (network !== 'all' && n.network !== network) return false;
      if (statusFilter !== 'all' && n.status !== statusFilter) return false;
      if (!q) return true;
      return `${n.addnode} ${n.host} ${n.ptr ?? ''} ${whereOf(n)}`.toLowerCase().includes(q);
    });
  }, [all, network, statusFilter, query]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      const primary = compare(a, b, sortKey) * (asc ? 1 : -1);
      // Uptime is the sensible second key for everything else: within a
      // status, the node that answers more often is the more useful one.
      return primary !== 0 ? primary : (b.uptime7d ?? -1) - (a.uptime7d ?? -1);
    });
    return copy;
  }, [filtered, sortKey, asc]);

  const visible = sorted.slice(page * perPage, page * perPage + perPage);
  const mapNodes = useMemo(() => filtered.map(toMapNode), [filtered]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setAsc((v) => !v);
    else {
      setSortKey(key);
      setAsc(key !== 'uptime' && key !== 'lastOnline');
    }
    setPage(0);
  };

  return (
    <>
      <Seo
        title={`Every Gridcoin node we know — ${SITE_NAME}`}
        description="The full inventory of Gridcoin peers we track: reachability, a week of uptime history, country and hosting provider."
        path="/nodes/all"
        jsonLd={[
          breadcrumbLd([
            { name: 'Home', path: '/' },
            { name: 'Addnodes', path: '/nodes' },
            { name: 'Every node', path: '/nodes/all' },
          ]),
          datasetLd({
            name: 'Gridcoin node inventory',
            description: 'Every Gridcoin peer we track, reachable or not, with a 168-hour reachability series, country and hosting provider.',
            path: '/nodes/all',
            modified: status?.lastSuccessAt ?? null,
            distributions: [
              { name: 'Mainnet inventory', url: `${ADDNODES_PUBLIC_URL}/mainnet-all.json`, encodingFormat: 'application/json' },
              { name: 'Testnet inventory', url: `${ADDNODES_PUBLIC_URL}/testnet-all.json`, encodingFormat: 'application/json' },
            ],
          }),
        ]}
      />
      <PageWrapper>
        <Header />
        <Container maxWidth="lg" sx={{ flexGrow: 1, py: { xs: 4, md: 6 } }}>
          <GradientLine />
          <Breadcrumbs
            items={[
              { label: 'Home', href: '/' },
              { label: 'Nodes', href: '/nodes' },
              { label: 'Every node' },
            ]}
          />
          <Typography variant="h3" component="h1" sx={{ fontWeight: 800, pb: 1 }}>
            Every node we know
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary', pb: 4, maxWidth: 720 }}>
            Every node we track, including the ones that are not answering.
          </Typography>

          {status && !status.ok ? (
            <Alert severity="warning" sx={{ mb: 3 }}>
              Showing the last good snapshot, from
              {' '}
              {utc(status.lastSuccessAt)}
              .
            </Alert>
          ) : null}

          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            sx={{ pb: 2, alignItems: { md: 'center' } }}
          >
            <ToggleButtonGroup
              size="small"
              exclusive
              value={network}
              onChange={(_e, v) => { if (v) { setNetwork(v); setPage(0); } }}
            >
              <ToggleButton value="all">All</ToggleButton>
              <ToggleButton value="main">Mainnet</ToggleButton>
              <ToggleButton value="test">Testnet</ToggleButton>
            </ToggleButtonGroup>

            <TextField
              select
              size="small"
              label="Status"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value as never); setPage(0); }}
              sx={{ minWidth: 160 }}
            >
              <MenuItem value="all">Any</MenuItem>
              <MenuItem value="online">Online</MenuItem>
              <MenuItem value="unreachable">Unreachable</MenuItem>
              <MenuItem value="dead">Dead</MenuItem>
              <MenuItem value="new">New</MenuItem>
            </TextField>

            <TextField
              size="small"
              label="Search address, hostname or provider"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(0); }}
              sx={{ flexGrow: 1, minWidth: 240 }}
            />

            <Chip label={`${filtered.length} of ${all.length}`} />
          </Stack>

          {/* Fed from `filtered`, not `visible`: the table pages, the map does
              not. Narrowing the filters narrows both together, but turning to
              page two should not empty the map. */}
          <Box sx={{ pb: 1 }}>
            <NodeMap nodes={mapNodes} />
          </Box>
          <Typography
            variant="body2"
            sx={{
              color: 'text.secondary', textAlign: 'center', pb: 4, mx: 'auto', maxWidth: 660,
            }}
          >
            One dot per node, placed by city where the address resolves to one
            and at the centre of its country where it does not. Machines
            sharing a location are fanned out around it so they do not stack
            into a single dot — that fan is spacing, not position. Scroll or
            use the buttons to zoom, drag to pan. IP geolocation is inexact by
            nature and none of this is verified against the operator.
            {' '}
            <NextMuiLink href="https://db-ip.com">IP Geolocation by DB-IP</NextMuiLink>
            .
          </Typography>

          <Paper variant="outlined">
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {COLUMNS.map((c) => (
                      <TableCell
                        key={c.key}
                        align={c.align}
                        sx={{ whiteSpace: 'nowrap', ...hiddenBelow(c.hideBelow) }}
                      >
                        <TableSortLabel
                          active={sortKey === c.key}
                          direction={sortKey === c.key && !asc ? 'desc' : 'asc'}
                          onClick={() => toggleSort(c.key)}
                        >
                          {c.label}
                        </TableSortLabel>
                      </TableCell>
                    ))}
                    <TableCell
                      sx={{ minWidth: 140, ...hiddenBelow('lg') }}
                    >
                      Last 48 h
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {visible.map((n) => (
                    <TableRow key={`${n.network}-${n.id}`} hover>
                      <TableCell
                        title={n.addnode}
                        sx={{
                          fontFamily: 'monospace',
                          whiteSpace: 'nowrap',
                          maxWidth: { xs: 160, sm: 220, md: 260 },
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        <NextMuiLink href={`/nodes/${n.id}`}>{n.addnode}</NextMuiLink>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          variant="outlined"
                          color={n.network === 'main' ? 'primary' : 'warning'}
                          label={n.network === 'main' ? 'main' : 'test'}
                        />
                      </TableCell>
                      <TableCell sx={{ maxWidth: 200, ...hiddenBelow('md') }}>
                        {n.label || n.cc || '—'}
                        {n.asnOrg ? (
                          <Typography
                            variant="caption"
                            sx={{ display: 'block', color: 'text.secondary' }}
                            noWrap
                          >
                            {n.asnOrg}
                          </Typography>
                        ) : null}
                      </TableCell>
                      <TableCell><NodeStatusChip status={n.status} /></TableCell>
                      <TableCell align="right">{percent(n.uptime7d)}</TableCell>
                      <TableCell
                        align="right"
                        sx={{ whiteSpace: 'nowrap', ...hiddenBelow('sm') }}
                      >
                        {timeAgo(n.lastOnlineAt, now)}
                      </TableCell>
                      <TableCell sx={hiddenBelow('lg')}>
                        {n.uptime
                          ? <UptimeBar series={n.uptime} hours={SPARK_HOURS} endsAt={now} />
                          : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {visible.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={COLUMNS.length + 1}>
                        <Typography variant="body2" sx={{ color: 'text.secondary', py: 3, textAlign: 'center' }}>
                          {all.length === 0
                            ? 'The node list is not available right now.'
                            : 'Nothing matches those filters.'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </Box>
            <TablePagination
              component="div"
              count={filtered.length}
              page={page}
              onPageChange={(_e, p) => setPage(p)}
              rowsPerPage={perPage}
              onRowsPerPageChange={(e) => { setPerPage(Number(e.target.value)); setPage(0); }}
              rowsPerPageOptions={[25, 50, 100]}
            />
          </Paper>

          <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', pt: 2 }}>
            Status comes from our own connection attempts, never from what
            anyone reports. Run one of these and want it delisted?
            {' '}
            <NextMuiLink href="/about#contact">Contact us</NextMuiLink>
            .
          </Typography>
        </Container>
        <Footer />
      </PageWrapper>
      <ScrollTopFab />
    </>
  );
}
