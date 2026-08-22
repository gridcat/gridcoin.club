import { describe, expect, it } from 'vitest';
import {
  ASPECT, clampViewport, graticule, LAT_BOTTOM, LAT_TOP, layout, MAX_SCALE,
  MIN_SCALE, project, ringPath, viewBoxOf, zoomAbout,
  type MapNode, type View,
} from '@/lib/worldMap';

const view: View = { width: 1000, height: Math.round(1000 / ASPECT) };

describe('project', () => {
  it('puts the prime meridian at the horizontal centre', () => {
    expect(project(0, 0, view).x).toBeCloseTo(500);
  });

  it('maps the date line to the two edges', () => {
    expect(project(-180, 0, view).x).toBeCloseTo(0);
    expect(project(180, 0, view).x).toBeCloseTo(1000);
  });

  it('puts north at the top, not the bottom', () => {
    expect(project(0, LAT_TOP, view).y).toBeCloseTo(0);
    expect(project(0, LAT_BOTTOM, view).y).toBeCloseTo(view.height);
    expect(project(0, 60, view).y).toBeLessThan(project(0, 20, view).y);
  });

  it('keeps every in-window coordinate inside the frame', () => {
    for (let lon = -180; lon <= 180; lon += 15) {
      for (let lat = LAT_BOTTOM; lat <= LAT_TOP; lat += 10) {
        const p = project(lon, lat, view);
        expect(p.x).toBeGreaterThanOrEqual(-0.001);
        expect(p.x).toBeLessThanOrEqual(view.width + 0.001);
        expect(p.y).toBeGreaterThanOrEqual(-0.001);
        expect(p.y).toBeLessThanOrEqual(view.height + 0.001);
      }
    }
  });
});

describe('ringPath', () => {
  const square = [-10, -10, 10, -10, 10, 10, -10, 10];

  it('closes a simple ring', () => {
    const d = ringPath(square, view);
    expect(d).toBeTruthy();
    expect(d!.startsWith('M')).toBe(true);
    expect(d!.endsWith('Z')).toBe(true);
  });

  it('breaks a ring at the date line instead of streaking across the map', () => {
    // Two degrees apart across the antimeridian, but the full map width apart
    // once projected.
    const d = ringPath([170, 0, 179, 5, -179, 5, -170, 0, -175, -5, 175, -5], view)!;
    expect(d).toBeTruthy();
    // A break means more than one subpath, so more than one M.
    expect((d.match(/M/g) ?? []).length).toBeGreaterThan(1);
  });

  it('ignores a degenerate ring', () => {
    expect(ringPath([0, 0, 1, 1], view)).toBeNull();
  });
});

describe('graticule', () => {
  it('draws straight lines, which is the point of this projection', () => {
    const paths = graticule(view);
    expect(paths.length).toBeGreaterThan(0);
    for (const d of paths) {
      // Exactly one move and one line, no curves and no closing.
      expect(d).toMatch(/^M[\d.]+ [\d.]+L[\d.]+ [\d.]+$/);
    }
  });
});

describe('layout', () => {
  const centroids: Record<string, [number, number]> = {
    US: [-99, 39], DE: [10, 51],
  };
  const node = (
    key: string,
    cc: string | null,
    extra: Partial<MapNode> = {},
  ): MapNode => ({
    key, cc, status: 'online', network: 'main', ...extra,
  });

  it('places one dot per node, not one per country', () => {
    const { placed } = layout([
      node('a', 'US'), node('b', 'US'), node('c', 'DE'),
    ], centroids, view);
    expect(placed).toHaveLength(3);
  });

  it('uses the node coordinates when it has them', () => {
    const { placed } = layout(
      [node('a', 'DE', { lat: 50.11, lon: 8.68 })], centroids, view,
    );
    const frankfurt = project(8.68, 50.11, view);
    expect(placed[0].x).toBeCloseTo(frankfurt.x);
    expect(placed[0].y).toBeCloseTo(frankfurt.y);
    expect(placed[0].precise).toBe(true);
  });

  it('falls back to the country centroid without coordinates', () => {
    const { placed } = layout([node('a', 'DE')], centroids, view);
    const centre = project(10, 51, view);
    expect(placed[0].x).toBeCloseTo(centre.x);
    expect(placed[0].precise).toBe(false);
  });

  it('fans a city pin more tightly than a whole country', () => {
    const city = layout(
      Array.from({ length: 20 }, (_, i) => node(`n${i}`, 'DE', { lat: 50.11, lon: 8.68 })),
      centroids, view,
    ).placed;
    const country = layout(
      Array.from({ length: 20 }, (_, i) => node(`n${i}`, 'DE')), centroids, view,
    ).placed;

    const spread = (list: typeof city) => {
      const cx = list[0].x;
      const cy = list[0].y;
      return Math.max(...list.map((p) => Math.hypot(p.x - cx, p.y - cy)));
    };
    expect(spread(city)).toBeLessThan(spread(country));
  });

  it('keeps a crowded pin from swamping its neighbourhood', () => {
    const many = Array.from({ length: 400 }, (_, i) => node(`n${i}`, 'US'));
    const { placed } = layout(many, centroids, view);
    const centre = project(-99, 39, view);
    for (const p of placed) {
      expect(Math.hypot(p.x - centre.x, p.y - centre.y)).toBeLessThanOrEqual(18.001);
    }
  });

  it('gives co-located nodes distinct seats', () => {
    const { placed } = layout(
      Array.from({ length: 12 }, (_, i) => node(`n${i}`, 'US')), centroids, view,
    );
    const seats = new Set(placed.map((p) => `${p.x.toFixed(4)}:${p.y.toFixed(4)}`));
    expect(seats.size).toBe(12);
  });

  it('is deterministic, and independent of input order', () => {
    const nodes = [node('c', 'US'), node('a', 'US'), node('b', 'US')];
    const first = layout(nodes, centroids, view).placed;
    const second = layout(nodes.slice().reverse(), centroids, view).placed;
    const seat = (list: typeof first, key: string) => list.find((p) => p.key === key)!;
    for (const key of ['a', 'b', 'c']) {
      expect(seat(first, key).x).toBeCloseTo(seat(second, key).x);
      expect(seat(first, key).y).toBeCloseTo(seat(second, key).y);
    }
  });

  it('draws answering nodes last so they are not buried under dead ones', () => {
    const { placed } = layout([
      node('a', 'US', { status: 'online' }),
      node('b', 'US', { status: 'dead' }),
      node('c', 'US', { status: 'dead' }),
    ], centroids, view);
    expect(placed[placed.length - 1].status).toBe('online');
  });

  it('counts nodes with neither coordinates nor a known country', () => {
    const { placed, unplaced } = layout([
      node('a', null), node('b', 'ZZ'), node('c', 'US'),
    ], centroids, view);
    expect(unplaced).toBe(2);
    expect(placed).toHaveLength(1);
  });

  it('still places a node whose country is unknown but has coordinates', () => {
    const { placed, unplaced } = layout(
      [node('a', null, { lat: 1.35, lon: 103.8 })], centroids, view,
    );
    expect(unplaced).toBe(0);
    expect(placed).toHaveLength(1);
  });
});

describe('viewport', () => {
  it('starts showing the whole world', () => {
    const home = { scale: 1, cx: view.width / 2, cy: view.height / 2 };
    expect(viewBoxOf(home, view))
      .toBe(`0.00 0.00 ${view.width.toFixed(2)} ${view.height.toFixed(2)}`);
  });

  it('refuses to zoom out past the whole world, or in past the limit', () => {
    expect(clampViewport({ scale: 0.2, cx: 500, cy: 200 }, view).scale).toBe(MIN_SCALE);
    expect(clampViewport({ scale: 500, cx: 500, cy: 200 }, view).scale).toBe(MAX_SCALE);
  });

  it('will not pan off the edge of the map', () => {
    const v = clampViewport({ scale: 4, cx: -9999, cy: -9999 }, view);
    expect(v.cx).toBeCloseTo(view.width / 8);
    expect(v.cy).toBeCloseTo(view.height / 8);

    const far = clampViewport({ scale: 4, cx: 9999, cy: 9999 }, view);
    expect(far.cx).toBeCloseTo(view.width - view.width / 8);
    expect(far.cy).toBeCloseTo(view.height - view.height / 8);
  });

  it('keeps the anchored point under the cursor while zooming', () => {
    const start = { scale: 1, cx: view.width / 2, cy: view.height / 2 };
    const anchorX = 300;
    const anchorY = 120;
    const zoomed = zoomAbout(start, 2, anchorX, anchorY, view);

    // Where the anchor sits inside the view, as a fraction, must not move.
    const fraction = (v: typeof start, ax: number) => (
      (ax - (v.cx - view.width / (2 * v.scale))) / (view.width / v.scale)
    );
    expect(fraction(zoomed, anchorX)).toBeCloseTo(fraction(start, anchorX), 5);
  });

  it('clamps rather than escaping when zooming near an edge', () => {
    const start = { scale: 1, cx: view.width / 2, cy: view.height / 2 };
    const corner = zoomAbout(start, 8, 0, 0, view);
    expect(corner.cx).toBeGreaterThanOrEqual(view.width / (2 * corner.scale) - 0.001);
    expect(corner.cy).toBeGreaterThanOrEqual(view.height / (2 * corner.scale) - 0.001);
  });
});
