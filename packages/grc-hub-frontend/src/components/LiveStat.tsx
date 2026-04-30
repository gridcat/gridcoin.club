'use client';

import React, { useEffect, useState } from 'react';
import { Typography, Box } from '@mui/material';
import { useInterval } from '@/hooks';

interface LiveStatProps {
  label: string;
  value: string;
  // ISO timestamp from the server. Re-formatted client-side every minute as
  // a relative time ("2m ago"). Purely cosmetic — no network calls.
  relativeTime?: string | null;
  unavailable?: boolean;
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
  label, value, relativeTime, unavailable,
}: LiveStatProps) {
  // Re-render every minute so relative time stays fresh while the user is
  // on the page. The dep on `relativeTime` resets the cadence on prop change.
  const [, setTick] = useState(0);
  useInterval(() => setTick((t) => t + 1), relativeTime ? 60_000 : null);
  useEffect(() => { setTick(0); }, [relativeTime]);

  if (unavailable) {
    return (
      <Typography variant="body2" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>
        {label}
        : status unavailable
      </Typography>
    );
  }
  const rel = relativeTime ? formatRelative(relativeTime) : null;
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'baseline' }}>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {value}
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
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
