// Regenerates src/data/world.ts from Natural Earth 110m admin-0 countries.
//
// Run by hand, not by the build: national borders change on a timescale of
// years, the output is small enough to commit, and a build that reaches the
// network to draw a map is a build that fails when GitHub does. The iptoasn
// tables in scripts/fetch-geo.sh are the opposite case — 39 MB and stale
// within a week — which is why those are fetched and gitignored instead.
//
//   node scripts/build-world.mjs
//
// Source: github.com/nvkelso/natural-earth-vector (public domain, no
// attribution required).

import { writeFileSync } from 'node:fs';

const SRC = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson';
const OUT = new URL('../src/data/world.ts', import.meta.url);

// Douglas-Peucker tolerance in degrees. 0.4 is about 45 km at the equator —
// invisible on a map a thousand units wide, and it takes the payload from
// ~800 KB to ~40.
const TOLERANCE = 0.4;
// Rings smaller than this (rough deg², latitude-corrected) are dropped. Small
// islands cost more bytes than they contribute pixels.
const MIN_AREA = 1.2;
// One decimal is ~11 km. Nothing on this map resolves finer.
const PRECISION = 1;

function perpDistance([x, y], [x1, y1], [x2, y2]) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx === 0 && dy === 0) return Math.hypot(x - x1, y - y1);
  const t = ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy);
  const c = Math.max(0, Math.min(1, t));
  return Math.hypot(x - (x1 + c * dx), y - (y1 + c * dy));
}

function simplify(points, tolerance) {
  if (points.length < 3) return points;
  let maxDist = 0;
  let index = 0;
  for (let i = 1; i < points.length - 1; i += 1) {
    const d = perpDistance(points[i], points[0], points[points.length - 1]);
    if (d > maxDist) { maxDist = d; index = i; }
  }
  if (maxDist <= tolerance) return [points[0], points[points.length - 1]];
  return [
    ...simplify(points.slice(0, index + 1), tolerance).slice(0, -1),
    ...simplify(points.slice(index), tolerance),
  ];
}

/** Shoelace area, scaled by cos(latitude) so high-latitude rings are not
 *  inflated by the degree grid narrowing towards the poles. */
function area(ring) {
  let sum = 0;
  let latSum = 0;
  for (let i = 0; i < ring.length; i += 1) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % ring.length];
    sum += x1 * y2 - x2 * y1;
    latSum += y1;
  }
  return Math.abs(sum / 2) * Math.cos((latSum / ring.length) * Math.PI / 180);
}

/** Area-weighted centroid of a single ring. */
function centroid(ring) {
  let cx = 0;
  let cy = 0;
  let a = 0;
  for (let i = 0; i < ring.length; i += 1) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % ring.length];
    const f = x1 * y2 - x2 * y1;
    a += f;
    cx += (x1 + x2) * f;
    cy += (y1 + y2) * f;
  }
  if (a === 0) return ring[0];
  return [cx / (3 * a), cy / (3 * a)];
}

const round = (n) => Number(n.toFixed(PRECISION));

// Places Natural Earth 110m has no feature for at all — every one of them is
// below the dataset's resolution, and between them they host a lot of VPS
// capacity. Coordinates are the obvious point on each; they only ever have to
// be right to the nearest degree at this scale. Gap-fill only: anything Natural
// Earth does supply wins.
const EXTRA_CENTROIDS = {
  SG: [103.8, 1.4],   HK: [114.2, 22.3],  MO: [113.5, 22.2],  MT: [14.4, 35.9],
  BH: [50.6, 26.1],   LI: [9.5, 47.2],    MC: [7.4, 43.7],    SM: [12.5, 43.9],
  AD: [1.5, 42.5],    GI: [-5.4, 36.1],   JE: [-2.1, 49.2],   GG: [-2.6, 49.5],
  IM: [-4.5, 54.2],   MV: [73.5, 4.2],    SC: [55.5, -4.7],   MU: [57.6, -20.3],
  BM: [-64.8, 32.3],  KY: [-81.3, 19.3],  VG: [-64.6, 18.4],  CW: [-69.0, 12.2],
  AW: [-70.0, 12.5],  BB: [-59.6, 13.2],  AG: [-61.8, 17.1],  LC: [-61.0, 13.9],
};

const geo = await (await fetch(SRC)).json();

const land = [];
const centroids = {};

for (const feature of geo.features) {
  const props = feature.properties;
  // ISO_A2_EH rather than ISO_A2: the latter is "-99" for France, Norway and
  // a handful of others, which is exactly the set a node list runs into.
  const cc = props.ISO_A2_EH && props.ISO_A2_EH !== '-99' ? props.ISO_A2_EH : null;

  const polygons = feature.geometry.type === 'Polygon'
    ? [feature.geometry.coordinates]
    : feature.geometry.coordinates;

  let biggest = null;
  let biggestArea = 0;

  for (const polygon of polygons) {
    // Outer ring only. Holes (Lesotho inside South Africa) are not worth the
    // bytes or the even-odd fill rule at this size.
    const ring = simplify(polygon[0].map(([x, y]) => [x, y]), TOLERANCE);
    const ringArea = area(ring);

    // The centroid is taken BEFORE the size filter. Singapore, Hong Kong,
    // Luxembourg and Malta are all too small to draw at this scale and all
    // full of hosting — dropping their outline is fine, dropping their
    // marker would silently strand every node in them.
    if (ringArea > biggestArea) { biggestArea = ringArea; biggest = ring; }

    if (ring.length < 4 || ringArea < MIN_AREA) continue;
    land.push(ring.flatMap(([x, y]) => [round(x), round(y)]));
  }

  // The country's mark goes on its largest landmass, not the average of its
  // territories — otherwise France sits in the Atlantic and the US in the
  // Pacific, pulled out to sea by overseas holdings.
  if (cc && biggest) {
    const [x, y] = centroid(biggest);
    centroids[cc] = [round(x), round(y)];
  }
}

for (const [cc, point] of Object.entries(EXTRA_CENTROIDS)) {
  if (!centroids[cc]) centroids[cc] = point;
}

const body = `// GENERATED by scripts/build-world.mjs — do not edit by hand.
//
// Natural Earth 110m admin-0 countries, simplified to ${TOLERANCE}° and rounded
// to ${PRECISION} decimal. Public domain; no attribution required.
//
// LAND is one flat [lon, lat, lon, lat, ...] array per landmass outline.
// Flat numbers rather than [lon, lat] pairs because this ships in the client
// bundle for hydration, and the brackets were a third of the payload.
//
// CENTROIDS maps ISO 3166-1 alpha-2 to a point on that country's largest
// landmass. Country resolution is deliberate — see the note under the map.

export const LAND: number[][] = ${JSON.stringify(land)};

export const CENTROIDS: Record<string, [number, number]> = ${JSON.stringify(centroids)};
`;

writeFileSync(OUT, body);
console.log(`rings: ${land.length}  countries: ${Object.keys(centroids).length}  bytes: ${body.length}`);
