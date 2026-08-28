'use client';

import React, { useEffect, useState } from 'react';
import { Typography, Box } from '@mui/material';
import { useInterval } from '@/hooks';
import type { ServiceEntity } from '@/entities/ServiceEntity';
import type { LiveStats } from '@/lib/sources';

interface LiveStatProps {
  label: string;
  value: string;
  // ISO timestamp from the server. Re-formatted client-side every minute as
  // a relative time ("2m ago"). Purely cosmetic — no network calls.
  relativeTime?: string | null;
  unavailable?: boolean;
  // Drops the relative time and shrinks the type. For the hive, where the
  // stat has to fit the width of a hexagon.
  compact?: boolean;
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const now = Date.now();
  const seconds = Math.max(1, Math.round((now - then) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export function LiveStat({
  label, value, relativeTime, unavailable, compact,
}: LiveStatProps) {
  // Re-render every minute so relative time stays fresh while the user is
  // on the page. The dep on `relativeTime` resets the cadence on prop change.
  const [, setTick] = useState(0);
  useInterval(() => setTick((t) => t + 1), relativeTime ? 60_000 : null);
  useEffect(() => { setTick(0); }, [relativeTime]);

  if (unavailable) {
    return (
      <Typography
        variant="body2"
        sx={{ color: 'text.disabled', fontStyle: 'italic', ...(compact && { fontSize: 'inherit' }) }}
      >
        {compact ? 'unavailable' : `${label}: status unavailable`}
      </Typography>
    );
  }
  const rel = relativeTime && !compact ? formatRelative(relativeTime) : null;
  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: compact ? 0.5 : 1,
        alignItems: 'baseline',
        justifyContent: compact ? 'center' : 'flex-start',
        ...(compact && { fontSize: 'inherit', lineHeight: 1.25 }),
      }}
    >
      <Typography variant="body2" sx={{ fontWeight: 600, ...(compact && { fontSize: 'inherit' }) }}>
        {value}
      </Typography>
      <Typography
        variant="caption"
        sx={{ color: 'text.secondary', ...(compact && { fontSize: 'inherit' }) }}
      >
        {label}
      </Typography>
      {rel && (
        <Typography variant="caption" sx={{ color: 'text.disabled' }}>
          ·
          {' '}
          {rel}
        </Typography>
      )}
    </Box>
  );
}

function formatNumber(n: number | null | undefined): string {
  if (typeof n !== 'number') return '—';
  return n.toLocaleString('en-US');
}

// Maps a service's `liveSource` onto a rendered stat. Lives here rather than
// in a card so the home page's tiles and the hive's cells show the same
// numbers without either owning the mapping.
export function ServiceLiveStat(
  { service, stats, compact }: { service: ServiceEntity; stats: LiveStats; compact?: boolean },
) {
  if (!service.liveSource) return null;
  switch (service.liveSource) {
    case 'stamp': {
      const s = stats.stamp;
      if (!s || s.total == null) return <LiveStat label="stamp" value="" unavailable compact={compact} />;
      return <LiveStat label="stamps" value={formatNumber(s.total)} relativeTime={s.latestAt} compact={compact} />;
    }
    case 'explorer': {
      const s = stats.explorer;
      if (!s || s.height == null) return <LiveStat label="explorer" value="" unavailable compact={compact} />;
      return <LiveStat label="block height" value={formatNumber(s.height)} relativeTime={s.latestBlockTime} compact={compact} />;
    }
    case 'grcpay': {
      const s = stats.grcpay;
      if (!s || !s.ok) return <LiveStat label="grcpay" value="" unavailable compact={compact} />;
      return <LiveStat label="API" value={s.version ? `up · v${s.version}` : 'up'} compact={compact} />;
    }
    case 'addnodes': {
      const s = stats.addnodes;
      if (!s || s.total == null) return <LiveStat label="addnodes" value="" unavailable compact={compact} />;
      return <LiveStat label="nodes" value={formatNumber(s.total)} relativeTime={s.lastSuccessAt} compact={compact} />;
    }
    default:
      return null;
  }
}
