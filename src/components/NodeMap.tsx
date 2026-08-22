import { useMemo } from 'react';
import {
  Box, Stack, Typography, useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { LAND } from '@/data/world';
import {
  ASPECT, graticule, layout, ringPath, type MapNode, type View,
} from '@/lib/worldMap';
import { CENTROIDS } from '@/data/world';

interface Props {
  /** Already filtered by the caller — the map shows exactly what the table
   *  below it is showing, minus paging. */
  nodes: MapNode[];
}

// User units. The SVG scales to its container; this is only the coordinate
// space the paths are computed in.
const WIDTH = 1000;
const HEIGHT = Math.round(WIDTH / ASPECT);

// The family testnet orange. Hardcoded rather than taken from the theme
// because this map shows BOTH chains at once on a mainnet-themed page —
// theme.palette.primary is "this build's network", which is exactly the
// distinction the map has to draw instead of inherit.
const TESTNET = '#ef6c00';

const VIEW: View = { width: WIDTH, height: HEIGHT };

// Computed once at import, not per render: the coastlines do not depend on
// the data, the theme or anything else on the page. Every request and every
// re-render reuses the same 200 path strings.
const LAND_PATHS = LAND.map((ring) => ringPath(ring, VIEW)).filter(Boolean) as string[];
const GRID = graticule(VIEW);

// Inline SVG rather than a mapping library: it server-renders, needs no
// client JavaScript to show up, adds nothing to the CSP surface, and costs
// 40 KB of geometry instead of a tile provider and a third-party connection.
export function NodeMap({ nodes }: Props) {
  const theme = useTheme();
  const { placed } = useMemo(() => layout(nodes, CENTROIDS, VIEW), [nodes]);

  const countries = new Set(placed.map((n) => n.cc)).size;
  const online = placed.filter((n) => n.status === 'online').length;
  const label = `${placed.length} nodes across ${countries} countries, `
    + `${online} answering their last check`;

  const water = alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.07 : 0.05);
  const landFill = alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.20 : 0.12);
  const gridLine = alpha(theme.palette.text.primary, 0.06);

  const legend: Array<{ label: string; colour: string }> = [
    { label: 'mainnet', colour: theme.palette.primary.main },
    { label: 'testnet', colour: TESTNET },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Box
        component="svg"
        role="img"
        aria-label={label}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        sx={{ width: '100%', height: 'auto', display: 'block' }}
      >
        <rect x={0} y={0} width={WIDTH} height={HEIGHT} fill={water} rx={6} />

        {GRID.map((d) => (
          <path key={d} d={d} fill="none" stroke={gridLine} strokeWidth={0.8} />
        ))}

        {LAND_PATHS.map((d) => (
          <path key={d} d={d} fill={landFill} stroke="none" />
        ))}

        {placed.map((node) => {
          const accent = node.network === 'test' ? TESTNET : theme.palette.primary.main;
          const answering = node.status === 'online';

          // Filled for the ones that answered, hollow for the rest. Same
          // encoding the status dots in the table use, so the two read
          // together.
          return (
            <circle
              key={`${node.network}:${node.key}`}
              cx={node.x}
              cy={node.y}
              r={node.r}
              fill={answering ? accent : alpha(accent, 0.13)}
              stroke={alpha(accent, answering ? 0 : 0.5)}
              strokeWidth={0.8}
            />
          );
        })}
      </Box>

      <Stack
        direction="row"
        spacing={3}
        sx={{ pt: 1.5, flexWrap: 'wrap', justifyContent: 'center' }}
      >
        {legend.map((item) => (
          <Stack key={item.label} direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
            <Box
              sx={{
                width: 10, height: 10, borderRadius: '50%', bgcolor: item.colour,
              }}
            />
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {item.label}
            </Typography>
          </Stack>
        ))}
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          filled = answering
        </Typography>
      </Stack>
    </Box>
  );
}
