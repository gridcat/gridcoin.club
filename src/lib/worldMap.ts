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
  /** Stable identity, only used to order a country's dots deterministically. */
  key: string;
  cc: string | null;
  status: string;
  network: 'main' | 'test';
}

export interface PlacedNode extends MapNode {
  cc: string;
  x: number;
  y: number;
  /** Dot radius, shrinking as a country's cluster gets crowded. */
  r: number;
}

// How far a country's cluster may spread from its centroid, in user units.
// Europe is the constraint: much wider and Germany's cluster reaches into
// Poland's, which would read as nodes that are not there.
const CLUSTER_RADIUS = 18;
const MAX_DOT = 3.4;
const MIN_DOT = 1.1;

// Golden angle. Successive dots land in the gaps left by the previous ones,
// which is why sunflower seeds pack the way they do and why this beats random
// jitter: it is even at every count, and it is obviously a arrangement rather
// than a claim about where anything is.
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/**
 * Place every node on the map.
 *
 * We geolocate to the country and no finer, so a country's nodes all share
 * one coordinate. Drawing them there would stack forty discs into one, so
 * each country's nodes are spread over a small phyllotactic disc around its
 * centroid. The spread carries no information — it is legibility, not
 * position, and the caption under the map says so.
 *
 * `unplaced` counts nodes whose address has no country yet: never enriched,
 * or an ASN table miss. They genuinely cannot go on the map.
 */
export function layout(
  nodes: MapNode[],
  centroids: Record<string, [number, number]>,
  view: View,
): { placed: PlacedNode[]; unplaced: number } {
  const byCc = new Map<string, MapNode[]>();
  let unplaced = 0;

  for (const node of nodes) {
    if (!node.cc || !centroids[node.cc]) {
      unplaced += 1;
      continue;
    }
    const group = byCc.get(node.cc) ?? [];
    group.push(node);
    byCc.set(node.cc, group);
  }

  const placed: PlacedNode[] = [];

  for (const [cc, group] of Array.from(byCc.entries())) {
    const [lon, lat] = centroids[cc];
    const centre = project(lon, lat, view);
    // Sorted so the arrangement is stable: the same node keeps the same seat
    // whenever the same set is drawn.
    const ordered = group.slice().sort((a, b) => a.key.localeCompare(b.key));
    const n = ordered.length;
    const dot = Math.max(MIN_DOT, Math.min(MAX_DOT, CLUSTER_RADIUS / Math.sqrt(n)));

    ordered.forEach((node, i) => {
      // Normalised by the count, so a country with eight hundred nodes packs
      // into the same disc as one with eight rather than swamping a continent.
      const t = n > 1 ? Math.sqrt(i / (n - 1)) : 0;
      const angle = i * GOLDEN_ANGLE;
      placed.push({
        ...node,
        cc,
        x: centre.x + CLUSTER_RADIUS * t * Math.cos(angle),
        y: centre.y + CLUSTER_RADIUS * t * Math.sin(angle),
        r: dot,
      });
    });
  }

  // Offline first so the ones that answered paint on top of them.
  placed.sort((a, b) => Number(a.status === 'online') - Number(b.status === 'online'));
  return { placed, unplaced };
}
