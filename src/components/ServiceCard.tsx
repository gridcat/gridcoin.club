import React from 'react';
import {
  Card, CardContent, Typography, Box, Button,
} from '@mui/material';
import { ServiceEntity } from '@/entities/ServiceEntity';
import type { LiveStats } from '@/lib/sources';
import { linkRel } from '@/lib/externalRel';
import { plausibleClass } from '@/lib/plausible';
import { LiveStat } from './LiveStat';

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
    default:
      return null;
  }
}

export function ServiceCard({ service, liveStats }: ServiceCardProps) {
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
            component="a"
            href={service.url}
            target="_blank"
            rel={linkRel(service.url, '_blank')}
            variant="text"
            color="primary"
            sx={{ pl: 0, fontWeight: 600 }}
            className={plausibleClass('Outbound Service', {
              service: service.slug,
              from: 'home-card',
            })}
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
