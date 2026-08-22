import React from 'react';
import {
  Card, CardContent, Typography, Box, Button,
} from '@mui/material';
import { ServiceEntity } from '@/entities/ServiceEntity';
import type { LiveStats } from '@/lib/sources';
import { isExternal, linkRel } from '@/lib/externalRel';
import { plausibleClass } from '@/lib/plausible';
import { LiveStat } from './LiveStat';
import { NextMuiLink } from './NextMuiLink';

interface ServiceCardProps {
  service: ServiceEntity;
  liveStats: LiveStats;
}

function formatNumber(n: number | null | undefined): string {
  if (typeof n !== 'number') return '—';
  return n.toLocaleString('en-US');
}

function renderLiveStat(service: ServiceEntity, stats: LiveStats): React.ReactNode {
  if (!service.liveSource) return null;
  switch (service.liveSource) {
    case 'stamp': {
      const s = stats.stamp;
      if (!s || s.total == null) return <LiveStat label="stamp" value="" unavailable />;
      return (
        <LiveStat
          label="stamps notarized"
          value={formatNumber(s.total)}
          relativeTime={s.latestAt}
        />
      );
    }
    case 'explorer': {
      const s = stats.explorer;
      if (!s || s.height == null) return <LiveStat label="explorer" value="" unavailable />;
      return (
        <LiveStat
          label="block height"
          value={formatNumber(s.height)}
          relativeTime={s.latestBlockTime}
        />
      );
    }
    case 'grcpay': {
      const s = stats.grcpay;
      if (!s || !s.ok) return <LiveStat label="grcpay" value="" unavailable />;
      return (
        <LiveStat
          label="API"
          value={s.version ? `up · v${s.version}` : 'up'}
        />
      );
    }
    case 'addnodes': {
      const s = stats.addnodes;
      if (!s || s.total == null) return <LiveStat label="addnodes" value="" unavailable />;
      return (
        <LiveStat
          label="nodes tracked"
          value={formatNumber(s.total)}
          relativeTime={s.lastSuccessAt}
        />
      );
    }
    default:
      return null;
  }
}

export function ServiceCard({ service, liveStats }: ServiceCardProps) {
  // Most services live on their own subdomain and open in a new tab. Some
  // are pages on this site, and those should route in place: a new tab for
  // a same-host link costs a full page load and strands the reader with a
  // back button that goes nowhere.
  const external = isExternal(service.url);
  const linkProps = external
    ? { component: 'a' as const, target: '_blank', rel: linkRel(service.url, '_blank') }
    : { component: NextMuiLink };

  return (
    <Card
      variant="outlined"
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
        transition: '0.2s ease-out',
        ':hover': { boxShadow: 4, transform: 'translateY(-2px)' },
      }}
    >
      <Box sx={{ height: 4, backgroundColor: service.color }} />
      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Typography variant="h6" component="h2" sx={{ fontWeight: 700 }}>
          {service.name}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', pt: 1, pb: 2 }}>
          {service.tagline}
        </Typography>
        <Box sx={{ pb: 2, minHeight: 40 }}>
          {renderLiveStat(service, liveStats)}
        </Box>
        <Box sx={{ mt: 'auto' }}>
          <Button
            {...linkProps}
            href={service.url}
            variant="text"
            color="primary"
            sx={{ pl: 0, fontWeight: 600 }}
            className={plausibleClass(
              external ? 'Outbound Service' : 'Internal Service',
              { service: service.slug, from: 'home-card' },
            )}
          >
            Open
            {' '}
            {service.name}
            {' →'}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}
