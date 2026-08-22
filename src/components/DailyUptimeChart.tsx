import { Box, useTheme } from '@mui/material';

export interface DailyPoint {
  day: string;
  probes: number;
  successes: number;
}

interface Props {
  points: DailyPoint[];
  /** How many days the axis spans, including days with no data at all. */
  days?: number;
  height?: number;
}

// Inline SVG rather than a charting library: it renders server-side, needs no
// client JavaScript, and adds nothing to the page's CSP surface. The shape is
// simple enough that a library would be the more complicated option.
export function DailyUptimeChart({ points, days = 90, height = 120 }: Props) {
  const theme = useTheme();
  const byDay = new Map(points.map((p) => [p.day, p]));
  const today = new Date();
  const columns: Array<{ day: string; ratio: number | null }> = [];

  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(today.getTime() - i * 24 * 3600_000);
    const key = d.toISOString().slice(0, 10);
    const point = byDay.get(key);
    columns.push({
      day: key,
      // A day we never probed is a gap, not a zero. Drawing it as zero would
      // invent an outage that never happened.
      ratio: point && point.probes > 0 ? point.successes / point.probes : null,
    });
  }

  const width = 100;
  const barWidth = width / columns.length;

  return (
    <Box sx={{ width: '100%', overflowX: 'auto' }}>
      <Box
        component="svg"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`Daily reachability over the last ${days} days`}
        sx={{ width: '100%', height, display: 'block' }}
      >
        {columns.map((c, idx) => {
          const x = idx * barWidth;
          if (c.ratio === null) {
            return (
              <Box
                component="rect"
                key={c.day}
                x={x}
                y={height - 2}
                width={Math.max(barWidth - 0.15, 0.2)}
                height={2}
                // fill takes a literal colour: sx does not resolve palette
                // paths for it the way it does for bgcolor.
                sx={{ fill: theme.palette.action.disabledBackground }}
              >
                <title>{`${c.day} — not checked`}</title>
              </Box>
            );
          }
          const h = Math.max(2, c.ratio * height);
          return (
            <Box
              component="rect"
              key={c.day}
              x={x}
              y={height - h}
              width={Math.max(barWidth - 0.15, 0.2)}
              height={h}
              sx={{
                fill: c.ratio >= 0.99
                  ? theme.palette.success.main
                  : c.ratio >= 0.5
                    ? theme.palette.warning.main
                    : theme.palette.error.main,
              }}
            >
              <title>{`${c.day} — ${(c.ratio * 100).toFixed(0)}% of ${byDay.get(c.day)?.probes ?? 0} checks`}</title>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
