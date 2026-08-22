import {
  useCallback, useMemo, useRef, useState,
} from 'react';
import type React from 'react';
import {
  Box, IconButton, Stack, Tooltip, Typography, useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import ZoomOutMapIcon from '@mui/icons-material/ZoomOutMap';
import { CENTROIDS, LAND } from '@/data/world';
import {
  ASPECT, clampViewport, graticule, layout, MAX_SCALE, MIN_SCALE, ringPath,
  viewBoxOf, zoomAbout, type MapNode, type View, type Viewport,
} from '@/lib/worldMap';
import { trackEvent } from '@/lib/plausible';

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
const HOME: Viewport = { scale: 1, cx: WIDTH / 2, cy: HEIGHT / 2 };

// Computed once at import, not per render: the coastlines do not depend on
// the data, the theme or anything else on the page.
const LAND_PATHS = LAND.map((ring) => ringPath(ring, VIEW)).filter(Boolean) as string[];
const GRID = graticule(VIEW);

const STEP = 1.6;

// Inline SVG rather than a mapping library: it server-renders, needs no
// client JavaScript to show up, adds nothing to the CSP surface, and costs
// 40 KB of geometry instead of a tile provider and a third-party connection.
// Zoom is layered on top — the first paint is the whole world, which is also
// what a reader with JavaScript off keeps.
export function NodeMap({ nodes }: Props) {
  const theme = useTheme();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [viewport, setViewport] = useState<Viewport>(HOME);
  const drag = useRef<{ x: number; y: number; cx: number; cy: number } | null>(null);

  const { placed } = useMemo(() => layout(nodes, CENTROIDS, VIEW), [nodes]);

  const countries = new Set(placed.map((n) => n.cc).filter(Boolean)).size;
  const online = placed.filter((n) => n.status === 'online').length;
  const label = `${placed.length} nodes across ${countries} countries, `
    + `${online} answering their last check`;

  /** Pointer position in user units, which is what the viewport maths wants. */
  const toUser = useCallback((clientX: number, clientY: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || !rect.width) return null;
    const w = WIDTH / viewport.scale;
    const h = HEIGHT / viewport.scale;
    return {
      x: (viewport.cx - w / 2) + ((clientX - rect.left) / rect.width) * w,
      y: (viewport.cy - h / 2) + ((clientY - rect.top) / rect.height) * h,
    };
  }, [viewport]);

  // Wheel and drag are not tracked. They fire continuously, and a hundred
  // events for one gesture tells you nothing the button counts do not.
  const onWheel = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
    const at = toUser(e.clientX, e.clientY);
    if (!at) return;
    setViewport((v) => zoomAbout(v, e.deltaY < 0 ? STEP : 1 / STEP, at.x, at.y, VIEW));
  }, [toUser]);

  const onPointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    const at = toUser(e.clientX, e.clientY);
    if (!at) return;
    drag.current = { x: at.x, y: at.y, cx: viewport.cx, cy: viewport.cy };
    e.currentTarget.setPointerCapture(e.pointerId);
  }, [toUser, viewport]);

  const onPointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    const start = drag.current;
    if (!start) return;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || !rect.width) return;
    // Deliberately not toUser(): that resolves against the CURRENT centre,
    // which the drag is moving, and the two chase each other into a runaway.
    const dx = ((e.clientX - rect.left) / rect.width) * (WIDTH / viewport.scale);
    const dy = ((e.clientY - rect.top) / rect.height) * (HEIGHT / viewport.scale);
    const originX = (start.cx - WIDTH / (2 * viewport.scale));
    const originY = (start.cy - HEIGHT / (2 * viewport.scale));
    setViewport((v) => clampViewport({
      scale: v.scale,
      cx: start.cx - ((originX + dx) - start.x),
      cy: start.cy - ((originY + dy) - start.y),
    }, VIEW));
  }, [viewport.scale]);

  const endDrag = useCallback(() => { drag.current = null; }, []);

  const step = useCallback((factor: number) => {
    trackEvent('Map Zoom', { control: factor > 1 ? 'in' : 'out' });
    setViewport((v) => zoomAbout(v, factor, v.cx, v.cy, VIEW));
  }, []);

  const reset = useCallback(() => {
    trackEvent('Map Zoom', { control: 'reset' });
    setViewport(HOME);
  }, []);

  const water = alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.07 : 0.05);
  const landFill = alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.20 : 0.12);
  const gridLine = alpha(theme.palette.text.primary, 0.06);

  // Marks keep their on-screen size as the map zooms, the way a pin does.
  const k = viewport.scale;

  const legend: Array<{ label: string; colour: string }> = [
    { label: 'mainnet', colour: theme.palette.primary.main },
    { label: 'testnet', colour: TESTNET },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Box sx={{ position: 'relative', width: '100%' }}>
        <Box
          component="svg"
          ref={svgRef}
          role="img"
          aria-label={label}
          viewBox={viewBoxOf(viewport, VIEW)}
          onWheel={onWheel}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          sx={{
            width: '100%',
            height: 'auto',
            display: 'block',
            touchAction: 'none',
            cursor: viewport.scale > MIN_SCALE ? 'grab' : 'default',
          }}
        >
          <rect x={0} y={0} width={WIDTH} height={HEIGHT} fill={water} />

          {GRID.map((d) => (
            <path key={d} d={d} fill="none" stroke={gridLine} strokeWidth={0.8 / k} />
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
                r={node.r / k}
                fill={answering ? accent : alpha(accent, 0.13)}
                stroke={alpha(accent, answering ? 0 : 0.5)}
                strokeWidth={0.8 / k}
              />
            );
          })}
        </Box>

        <Stack
          direction="column"
          spacing={0.5}
          sx={{
            position: 'absolute', top: 8, right: 8,
          }}
        >
          <Tooltip title="Zoom in" placement="left">
            <span>
              <IconButton
                size="small"
                onClick={() => step(STEP)}
                disabled={viewport.scale >= MAX_SCALE}
                sx={{ bgcolor: 'background.paper', '&:hover': { bgcolor: 'background.paper' } }}
              >
                <AddIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Zoom out" placement="left">
            <span>
              <IconButton
                size="small"
                onClick={() => step(1 / STEP)}
                disabled={viewport.scale <= MIN_SCALE}
                sx={{ bgcolor: 'background.paper', '&:hover': { bgcolor: 'background.paper' } }}
              >
                <RemoveIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Whole world" placement="left">
            <span>
              <IconButton
                size="small"
                onClick={reset}
                disabled={viewport.scale <= MIN_SCALE}
                sx={{ bgcolor: 'background.paper', '&:hover': { bgcolor: 'background.paper' } }}
              >
                <ZoomOutMapIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
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
