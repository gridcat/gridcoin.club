import { describe, expect, it } from 'vitest';
import {
  ASPECT, graticule, LAT_BOTTOM, LAT_TOP, layout, project, ringPath,
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
    key: string, cc: string | null, status = 'online', network: 'main' | 'test' = 'main',
  ): MapNode => ({
    key, cc, status, network,
  });

  it('places one dot per node, not one per country', () => {
    const { placed } = layout([
      node('a', 'US'), node('b', 'US'), node('c', 'DE'),
    ], centroids, view);
    expect(placed).toHaveLength(3);
  });

  it('puts a country with a single node exactly on its centroid', () => {
    const { placed } = layout([node('a', 'DE')], centroids, view);
    const centre = project(10, 51, view);
    expect(placed[0].x).toBeCloseTo(centre.x);
    expect(placed[0].y).toBeCloseTo(centre.y);
  });

  it('spreads a crowded country without letting it swamp the map', () => {
    const many = Array.from({ length: 400 }, (_, i) => node(`n${i}`, 'US'));
    const { placed } = layout(many, centroids, view);
    const centre = project(-99, 39, view);
    for (const p of placed) {
      expect(Math.hypot(p.x - centre.x, p.y - centre.y)).toBeLessThanOrEqual(18.001);
    }
  });

  it('gives every node in a country a distinct seat', () => {
    const { placed } = layout(
      Array.from({ length: 12 }, (_, i) => node(`n${i}`, 'US')), centroids, view,
    );
    const seats = new Set(placed.map((p) => `${p.x.toFixed(4)}:${p.y.toFixed(4)}`));
    expect(seats.size).toBe(12);
  });

  it('is deterministic: the same set lays out the same way twice', () => {
    const nodes = [node('c', 'US'), node('a', 'US'), node('b', 'US')];
    const first = layout(nodes, centroids, view).placed;
    // Input order must not matter — the table re-sorts constantly.
    const second = layout(nodes.slice().reverse(), centroids, view).placed;
    const seat = (list: typeof first, key: string) => list.find((p) => p.key === key)!;
    for (const key of ['a', 'b', 'c']) {
      expect(seat(first, key).x).toBeCloseTo(seat(second, key).x);
      expect(seat(first, key).y).toBeCloseTo(seat(second, key).y);
    }
  });

  it('shrinks the dots as a country fills up', () => {
    const few = layout([node('a', 'US'), node('b', 'US')], centroids, view).placed;
    const many = layout(
      Array.from({ length: 200 }, (_, i) => node(`n${i}`, 'US')), centroids, view,
    ).placed;
    expect(many[0].r).toBeLessThan(few[0].r);
  });

  it('draws answering nodes last so they are not buried under dead ones', () => {
    const { placed } = layout([
      node('a', 'US', 'online'), node('b', 'US', 'dead'), node('c', 'US', 'dead'),
    ], centroids, view);
    expect(placed[placed.length - 1].status).toBe('online');
  });

  it('counts nodes it cannot place rather than dropping them silently', () => {
    const { placed, unplaced } = layout([
      node('a', null), node('b', 'ZZ'), node('c', 'US'),
    ], centroids, view);
    expect(unplaced).toBe(2);
    expect(placed).toHaveLength(1);
  });
});
