// Regenerates src/data/world.ts from Natural Earth 50m admin-0 countries.
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

const SRC = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson';
const OUT = new URL('../src/data/world.ts', import.meta.url);

// Douglas-Peucker tolerance in degrees. This is set by the map's maximum
// zoom, not by taste: at 12x on a 1000-unit-wide map one CSS pixel is about
// 3.3 km, so 0.06 degrees (~6.7 km) lands inside roughly two pixels of error
// at the closest the reader can get. Coarser than that and the coastlines
// visibly facet when zoomed in.
//
// The source matters as much as the tolerance. Natural Earth 110m saturates
// around 122 KB however little you simplify it, because the dataset itself
// has no more detail to give; 50m keeps improving. 50m at 0.06 costs 267 KB
// raw, 99 KB gzipped, which is the price of a map that survives zooming.
const TOLERANCE = 0.06;
// Rings smaller than this (rough deg², latitude-corrected) are dropped. Small
// islands cost more bytes than they contribute pixels. Lower than the 110m
// era, because at this zoom range small islands are actually visible.
const MIN_AREA = 0.15;
// Two decimals is ~1.1 km, comfortably sub-pixel even at maximum zoom.
const PRECISION = 2;

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

// Gap-fill for places Natural Earth has no feature for at all. At 50m that is
// only Gibraltar; at 110m it was two dozen, including Singapore and Hong Kong,
// which between them host a lot of VPS capacity. The mechanism stays because
// the dataset's coverage of micro-territories is not a guarantee, and a node
// in a country with no centroid silently vanishes from the map.
//
// Anything Natural Earth does supply wins over this.
const EXTRA_CENTROIDS = {
  GI: [-5.35, 36.14],
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
    const full = polygon[0].map(([x, y]) => [x, y]);

    // The centroid comes off the FULL ring, before simplification and before
    // the size filter. Both would lose it: a territory narrower than the
    // tolerance collapses to two points, whose area is zero, and it would end
    // up with no marker at all. Macao and Gibraltar are exactly that case,
    // and a country with no centroid silently drops every node in it.
    const fullArea = area(full);
    if (fullArea > biggestArea) { biggestArea = fullArea; biggest = full; }

    const ring = simplify(full, TOLERANCE);
    if (ring.length < 4 || area(ring) < MIN_AREA) continue;
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
// Natural Earth 50m admin-0 countries, simplified to ${TOLERANCE}° and rounded
// to ${PRECISION} decimals. Public domain; no attribution required.
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
