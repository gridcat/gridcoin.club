// Equirectangular projection for the node map.
//
// Kept apart from the component so the maths is testable without a DOM, the
// same split DailyUptimeChart's callers get. Everything here is pure.
//
// Plate carrée: longitude is x, latitude is y, nothing else. It distorts area
// badly towards the poles, which for a map whose job is "roughly where are
// these machines" costs nothing — and it means every node is on screen at
// once, with no projection maths between a country and its dot.

export interface View {
  width: number;
  height: number;
}

// The window on the world. Antarctica is 14 million km² of guaranteed
// emptiness and dropping it takes the map from 2:1 to a shape that sits well
// as a page-wide banner; 84° north keeps Svalbard and the whole of Greenland.
export const LAT_TOP = 84;
export const LAT_BOTTOM = -58;

export const ASPECT = 360 / (LAT_TOP - LAT_BOTTOM);

export interface Point {
  x: number;
  y: number;
}

export function project(lon: number, lat: number, view: View): Point {
  return {
    x: ((lon + 180) / 360) * view.width,
    // SVG y grows downward, so north has to end up at the top.
    y: ((LAT_TOP - lat) / (LAT_TOP - LAT_BOTTOM)) * view.height,
  };
}

/**
 * One flat [lon, lat, ...] ring as SVG path data.
 *
 * The only real hazard here is the antimeridian. A ring with a point at 179
 * followed by one at -179 is a step of two degrees across the Pacific, but in
 * projected space it is the full width of the map — drawn naively it lays a
 * horizontal streak across the whole image. Natural Earth splits most
 * geometry at the date line already; this breaks the path at any jump wider
 * than half the world so the ones it misses cannot draw that streak.
 */
export function ringPath(ring: number[], view: View): string | null {
  const count = ring.length / 2;
  if (count < 3) return null;

  const parts: string[] = [];
  let current = '';
  let previousLon: number | null = null;

  for (let i = 0; i < count; i += 1) {
    const lon = ring[i * 2];
    const lat = ring[i * 2 + 1];

    if (previousLon !== null && Math.abs(lon - previousLon) > 180) {
      if (current !== '') parts.push(`${current}Z`);
      current = '';
    }

    const p = project(lon, lat, view);
    current += `${current === '' ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    previousLon = lon;
  }

  if (current !== '') parts.push(`${current}Z`);
  return parts.length ? parts.join('') : null;
}

/** Meridians and parallels as straight lines — the whole benefit of this
 *  projection is that they are straight. */
export function graticule(view: View, stepDeg = 30): string[] {
  const paths: string[] = [];

  for (let lon = -180 + stepDeg; lon < 180; lon += stepDeg) {
    const x = project(lon, 0, view).x.toFixed(1);
    paths.push(`M${x} 0L${x} ${view.height.toFixed(1)}`);
  }

  for (let lat = -30; lat <= 60; lat += stepDeg) {
    const y = project(0, lat, view).y.toFixed(1);
    paths.push(`M0 ${y}L${view.width.toFixed(1)} ${y}`);
  }

  return paths;
}

export interface MapNode {
  /** Stable identity, only used to order co-located dots deterministically. */
  key: string;
  cc: string | null;
  status: string;
  network: 'main' | 'test';
  /** City-level coordinates when we have them; null falls back to the
   *  country centroid. */
  lat?: number | null;
  lon?: number | null;
}

export interface PlacedNode extends MapNode {
  x: number;
  y: number;
  /** Dot radius in user units, shrinking as a spot gets crowded. */
  r: number;
  /** True when this came from a city lookup rather than a country centroid.
   *  The caption distinguishes the two, because they are not the same claim. */
  precise: boolean;
}

// How far co-located nodes may spread from their shared point, in user units.
// A city pin only has to separate machines in one datacentre; a country
// centroid is standing in for a whole country and Europe is the constraint —
// much wider and Germany's cluster reaches into Poland's.
const CITY_SPREAD = 5;
const COUNTRY_SPREAD = 18;
const MAX_DOT = 3.4;
const MIN_DOT = 1.1;

// Golden angle. Successive dots land in the gaps left by the previous ones,
// which is why sunflower seeds pack the way they do and why this beats random
// jitter: it is even at every count, and it is obviously an arrangement
// rather than a claim about where anything is.
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/**
 * Place every node on the map.
 *
 * Nodes that resolved to a city sit on their own coordinates. Nodes that did
 * not fall back to the centroid of their country. Either way anything sharing
 * a point — a whole country's worth, or one rack's worth — is spread over a
 * small phyllotactic disc so the dots do not stack into one.
 *
 * `unplaced` counts nodes with neither: no coordinates and no country.
 */
export function layout(
  nodes: MapNode[],
  centroids: Record<string, [number, number]>,
  view: View,
): { placed: PlacedNode[]; unplaced: number } {
  interface Spot { lon: number; lat: number; precise: boolean; members: MapNode[] }
  const spots = new Map<string, Spot>();
  let unplaced = 0;

  for (const node of nodes) {
    const precise = typeof node.lat === 'number' && typeof node.lon === 'number';
    const centroid = node.cc ? centroids[node.cc] : undefined;

    let lon: number;
    let lat: number;
    if (precise) {
      lon = node.lon as number;
      lat = node.lat as number;
    } else if (centroid) {
      [lon, lat] = centroid;
    } else {
      unplaced += 1;
      continue;
    }

    // Three decimals is ~100 m: anything closer than that is the same pin as
    // far as this map is concerned.
    const key = `${lon.toFixed(3)}:${lat.toFixed(3)}`;
    const spot = spots.get(key) ?? { lon, lat, precise, members: [] };
    spot.members.push(node);
    spots.set(key, spot);
  }

  const placed: PlacedNode[] = [];

  for (const spot of Array.from(spots.values())) {
    const centre = project(spot.lon, spot.lat, view);
    const spread = spot.precise ? CITY_SPREAD : COUNTRY_SPREAD;
    // Sorted so the arrangement is stable: the same node keeps the same seat
    // whenever the same set is drawn.
    const ordered = spot.members.slice().sort((a, b) => a.key.localeCompare(b.key));
    const n = ordered.length;
    const dot = Math.max(MIN_DOT, Math.min(MAX_DOT, spread / Math.sqrt(n)));

    ordered.forEach((node, i) => {
      // Normalised by the count, so forty nodes on one pin pack into the same
      // disc as four rather than swamping the neighbourhood.
      const t = n > 1 ? Math.sqrt(i / (n - 1)) : 0;
      const angle = i * GOLDEN_ANGLE;
      placed.push({
        ...node,
        x: centre.x + spread * t * Math.cos(angle),
        y: centre.y + spread * t * Math.sin(angle),
        r: dot,
        precise: spot.precise,
      });
    });
  }

  // Offline first so the ones that answered paint on top of them.
  placed.sort((a, b) => Number(a.status === 'online') - Number(b.status === 'online'));
  return { placed, unplaced };
}

export interface Viewport {
  /** 1 is the whole world; larger zooms in. */
  scale: number;
  /** Centre of the view, in user units. */
  cx: number;
  cy: number;
}

export const MIN_SCALE = 1;
export const MAX_SCALE = 12;

/** Keep the view inside the map: no panning off into blank space, and no
 *  zooming out past the whole world. */
export function clampViewport(v: Viewport, view: View): Viewport {
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.scale));
  const halfW = view.width / (2 * scale);
  const halfH = view.height / (2 * scale);
  return {
    scale,
    cx: Math.min(view.width - halfW, Math.max(halfW, v.cx)),
    cy: Math.min(view.height - halfH, Math.max(halfH, v.cy)),
  };
}

export function viewBoxOf(v: Viewport, view: View): string {
  const w = view.width / v.scale;
  const h = view.height / v.scale;
  return `${(v.cx - w / 2).toFixed(2)} ${(v.cy - h / 2).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)}`;
}

/**
 * Zoom about a fixed point, so the spot under the cursor stays under it.
 * Without this, wheel-zoom drifts and feels broken.
 */
export function zoomAbout(
  v: Viewport,
  factor: number,
  anchorX: number,
  anchorY: number,
  view: View,
): Viewport {
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.scale * factor));
  const ratio = v.scale / scale;
  return clampViewport({
    scale,
    cx: anchorX + (v.cx - anchorX) * ratio,
    cy: anchorY + (v.cy - anchorY) * ratio,
  }, view);
}
