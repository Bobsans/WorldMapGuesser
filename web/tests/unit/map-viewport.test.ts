import { describe, expect, it } from 'vitest';
import {
  MAX_ZOOM,
  WORLD,
  limitViewBox,
  panViewBox,
  pinchViewBox,
  screenToMap,
  zoomViewBox,
} from '@/scripts/map-viewport';

const rect = { left: 20, top: 30, width: 1000, height: 1000 };
const center = { x: WORLD.width / 2, y: WORLD.height / 2 };
describe('SVG viewport math', () => {
  it('accounts for SVG letterboxing and page offsets', () => {
    expect(screenToMap({ x: 520, y: 530 }, WORLD, rect).x).toBeCloseTo(
      center.x,
    );
    expect(screenToMap({ x: 520, y: 530 }, WORLD, rect).y).toBeCloseTo(
      center.y,
    );
  });
  it('keeps the zoom anchor at the same screen position', () => {
    const anchor = { x: 400, y: 300 };
    const box = zoomViewBox(WORLD, anchor, 2);
    expect((anchor.x - box.x) / box.width).toBeCloseTo(anchor.x / WORLD.width);
    expect((anchor.y - box.y) / box.height).toBeCloseTo(
      anchor.y / WORLD.height,
    );
  });
  it('limits zoom and never loses the map beyond its boundaries', () => {
    const max = zoomViewBox(WORLD, center, 1e6);
    expect(max.width).toBeCloseTo(WORLD.width / MAX_ZOOM);
    expect(zoomViewBox(WORLD, center, 0.01)).toEqual(WORLD);
    const pan = panViewBox(max, { x: 1e6, y: -1e6 }, rect);
    expect(pan.x).toBe(0);
    expect(pan.y).toBeCloseTo(WORLD.height - max.height);
    expect(limitViewBox({ ...WORLD, x: -50, y: 100 })).toEqual(WORLD);
  });
  it('translates screen distances using the current SVG scale', () => {
    const box = zoomViewBox(WORLD, center, 4);
    const pan = panViewBox(box, { x: 20, y: 0 }, rect);
    expect(box.x - pan.x).toBeCloseTo((20 * box.width) / rect.width);
  });
  it('zooms with two fingers and follows a moving pinch center', () => {
    const initial: [
      {
        x: number;
        y: number;
      },
      {
        x: number;
        y: number;
      },
    ] = [
      { x: 420, y: 530 },
      { x: 620, y: 530 },
    ];
    const current: typeof initial = [
      { x: 340, y: 530 },
      { x: 740, y: 530 },
    ];
    const box = pinchViewBox(WORLD, initial, current, rect);
    expect(box.width).toBeCloseTo(WORLD.width / 2);
    const point = screenToMap({ x: 540, y: 530 }, box, rect);
    expect(point.x).toBeCloseTo(center.x);
    expect(point.y).toBeCloseTo(center.y);
  });
  it('safely ignores invalid scales and zero-sized viewports', () => {
    expect(zoomViewBox(WORLD, center, Number.NaN)).toBe(WORLD);
    expect(zoomViewBox(WORLD, center, 0)).toBe(WORLD);
    expect(panViewBox(WORLD, { x: 1, y: 1 }, { ...rect, width: 0 })).toBe(
      WORLD,
    );
  });
});
