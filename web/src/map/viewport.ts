export interface Point {
  x: number;
  y: number;
}

export interface ViewBox extends Point {
  width: number;
  height: number;
}

export interface MapRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export const WORLD: Readonly<ViewBox> = {
  x: 0,
  y: 0,
  width: 1009.6727,
  height: 665.96301,
};

export const MAX_ZOOM = 100;
export const DRAG_THRESHOLD = 6;

export const limitViewBox = (box: ViewBox): ViewBox => {
  const width = Math.max(WORLD.width / MAX_ZOOM, Math.min(WORLD.width, box.width));
  const height = (width * WORLD.height) / WORLD.width;

  return {
    x: Math.max(0, Math.min(WORLD.width - width, box.x)),
    y: Math.max(0, Math.min(WORLD.height - height, box.y)),
    width,
    height,
  };
};

export const mapScale = (box: ViewBox, rect: MapRect): number => {
  return Math.min(rect.width / box.width, rect.height / box.height);
};

export const screenToMap = (point: Point, box: ViewBox, rect: MapRect): Point => {
  const scale = mapScale(box, rect);

  if (scale <= 0) {
    return { x: box.x, y: box.y };
  }

  return {
    x: box.x + (point.x - rect.left - (rect.width - box.width * scale) / 2) / scale,
    y: box.y + (point.y - rect.top - (rect.height - box.height * scale) / 2) / scale,
  };
};

export const zoomViewBox = (box: ViewBox, anchor: Point, factor: number): ViewBox => {
  if (!Number.isFinite(factor) || factor <= 0) {
    return box;
  }

  const width = Math.max(WORLD.width / MAX_ZOOM, Math.min(WORLD.width, box.width / factor));
  const ratio = width / box.width;

  return limitViewBox({
    x: anchor.x - (anchor.x - box.x) * ratio,
    y: anchor.y - (anchor.y - box.y) * ratio,
    width,
    height: box.height * ratio,
  });
};

export const panViewBox = (box: ViewBox, delta: Point, rect: MapRect): ViewBox => {
  const scale = mapScale(box, rect);

  if (scale <= 0) {
    return box;
  }

  return limitViewBox({
    ...box,
    x: box.x - delta.x / scale,
    y: box.y - delta.y / scale,
  });
};

export const midpoint = (a: Point, b: Point): Point => {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
};

export const distance = (a: Point, b: Point): number => {
  return Math.hypot(a.x - b.x, a.y - b.y);
};

export const pinchViewBox = (box: ViewBox, initial: [Point, Point], current: [Point, Point], rect: MapRect): ViewBox => {
  const initialDistance = distance(...initial);

  if (initialDistance === 0) {
    return box;
  }

  const initialCenter = midpoint(...initial);
  const currentCenter = midpoint(...current);
  const zoomed = zoomViewBox(box, screenToMap(initialCenter, box, rect), distance(...current) / initialDistance);

  return panViewBox(zoomed, {
    x: currentCenter.x - initialCenter.x,
    y: currentCenter.y - initialCenter.y,
  }, rect);
};
