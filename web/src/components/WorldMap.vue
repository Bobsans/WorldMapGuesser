<template>
  <section class="world-map" aria-label="World map">
    <svg
      ref="svg"
      class="world-map-svg"
      :viewBox="viewBox"
      aria-label="Country map"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="cancelPointer"
      @lostpointercapture="cancelPointer"
      @wheel.prevent="onWheel"
    >
      <path
        v-for="id in drawOrder"
        :key="id"
        :d="countries[id]?.path"
        :data-country="id"
        :class="{
          'map-right': rights.includes(id),
          'map-wrong': wrongs.includes(id),
        }"
      >
        <title>
          {{ interactive ? 'Country' : countries[id]?.name }}
        </title>
      </path>
    </svg>
    <div class="world-map-toolbar" aria-label="Map controls">
      <button type="button" aria-label="Zoom in" @click="zoom(1.5)">+</button>
      <button type="button" aria-label="Zoom out" @click="zoom(1 / 1.5)">
        −
      </button>
      <button type="button" aria-label="Fit world map" @click="fit">Fit</button>
    </div>
  </section>
</template>

<script setup lang="ts">
  import { computed, onBeforeUnmount, ref, useTemplateRef } from 'vue';
  import type { Countries, CountryId } from '@/types';
  import {
    DRAG_THRESHOLD,
    WORLD,
    distance,
    midpoint,
    panViewBox,
    pinchViewBox,
    screenToMap,
    zoomViewBox,
  } from '@/scripts/map-viewport';
  import type { Point, ViewBox } from '@/scripts/map-viewport';

  const props = withDefaults(
    defineProps<{
      countries: Countries;
      ids: readonly CountryId[];
      rights: readonly CountryId[];
      wrongs: readonly CountryId[];
      interactive?: boolean;
    }>(),
    { interactive: false },
  );

  const emit = defineEmits<{
    answer: [id: CountryId];
  }>();

  const svg = useTemplateRef<SVGSVGElement>('svg');
  const box = ref<ViewBox>({ ...WORLD });
  const viewBox = computed(
    () =>
      `${box.value.x} ${box.value.y} ${box.value.width} ${box.value.height}`,
  );
  const answered = computed(() => new Set([...props.rights, ...props.wrongs]));
  const drawOrder = computed(() =>
    [...props.ids]
      .reverse()
      .filter((id) => !answered.value.has(id))
      .concat(props.wrongs, props.rights),
  );
  const pointers = new Map<number, Point>();
  let initialPoints: Point[] = [];
  let initialBox: ViewBox = { ...WORLD };
  let moved = false;
  let selected: CountryId | null = null;
  const point = (event: PointerEvent): Point => {
    return { x: event.clientX, y: event.clientY };
  };
  const countryAt = (target: EventTarget | null): CountryId | null => {
    return target instanceof Element
      ? (target.closest<SVGPathElement>('[data-country]')?.dataset.country ??
        null)
      : null;
  };
  const resetGesture = (): void => {
    initialPoints = [...pointers.values()];
    initialBox = { ...box.value };
  };
  const onPointerDown = (event: PointerEvent): void => {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }
    pointers.set(event.pointerId, point(event));
    svg.value?.setPointerCapture(event.pointerId);
    if (pointers.size === 1) {
      moved = false;
      selected = countryAt(event.target);
    } else {
      moved = true;
      selected = null;
    }
    resetGesture();
  };
  const onPointerMove = (event: PointerEvent): void => {
    if (!pointers.has(event.pointerId) || !svg.value) {
      return;
    }
    pointers.set(event.pointerId, point(event));
    const current = [...pointers.values()];
    const rect = svg.value.getBoundingClientRect();
    if (current.length >= 2 && initialPoints.length >= 2) {
      moved = true;
      box.value = pinchViewBox(
        initialBox,
        [initialPoints[0]!, initialPoints[1]!],
        [current[0]!, current[1]!],
        rect,
      );
    } else if (initialPoints[0] && current[0]) {
      moved ||= distance(initialPoints[0], current[0]) > DRAG_THRESHOLD;
      if (moved) {
        box.value = panViewBox(
          initialBox,
          {
            x: current[0].x - initialPoints[0].x,
            y: current[0].y - initialPoints[0].y,
          },
          rect,
        );
      }
    }
  };
  const onPointerUp = (event: PointerEvent): void => {
    if (!pointers.has(event.pointerId)) {
      return;
    }
    const click =
      pointers.size === 1 &&
      !moved &&
      initialPoints[0] &&
      distance(initialPoints[0], point(event)) <= DRAG_THRESHOLD;
    const target = countryAt(
      document.elementFromPoint(event.clientX, event.clientY),
    );
    const id = click && target === selected ? selected : null;
    pointers.delete(event.pointerId);
    if (svg.value?.hasPointerCapture(event.pointerId)) {
      svg.value.releasePointerCapture(event.pointerId);
    }
    selected = null;
    moved = pointers.size > 0;
    resetGesture();
    if (id && props.interactive && !answered.value.has(id)) {
      emit('answer', id);
    }
  };
  const cancelPointer = (event: PointerEvent): void => {
    if (!pointers.delete(event.pointerId)) {
      return;
    }
    selected = null;
    moved = true;
    resetGesture();
  };
  const onWheel = (event: WheelEvent): void => {
    if (!svg.value || pointers.size > 0) {
      return;
    }
    const rect = svg.value.getBoundingClientRect();
    const pixels =
      event.deltaY *
      (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? rect.height : 1);
    box.value = zoomViewBox(
      box.value,
      screenToMap({ x: event.clientX, y: event.clientY }, box.value, rect),
      Math.exp(-pixels * 0.002),
    );
  };
  const zoom = (factor: number): void => {
    const center = midpoint(box.value, {
      x: box.value.x + box.value.width,
      y: box.value.y + box.value.height,
    });
    box.value = zoomViewBox(box.value, center, factor);
  };
  const fit = (): void => {
    box.value = { ...WORLD };
  };
  onBeforeUnmount(() => {
    const ids = [...pointers.keys()];
    pointers.clear();
    for (const id of ids) {
      if (svg.value?.hasPointerCapture(id)) {
        svg.value.releasePointerCapture(id);
      }
    }
  });
</script>

<style lang="scss">
  @use 'sass:color';
  @use '@assets/styles/variables' as v;

  .world-map {
    position: relative;
    min-width: 0;
    min-height: 0;
    background: v.$water;

    .world-map-svg {
      display: block;
      width: 100%;
      height: 100%;
      min-height: 120px;
      touch-action: none;
      user-select: none;

      path {
        fill: v.$white;
        stroke: v.$white;
        stroke-width: 1px;
        vector-effect: non-scaling-stroke;
      }

      .map-right {
        fill: v.$right;
        stroke: color.adjust(v.$right, $lightness: -20%);
      }

      .map-wrong {
        fill: v.$wrong;
        stroke: color.adjust(v.$wrong, $lightness: -20%);
      }
    }

    .world-map-toolbar {
      position: absolute;
      right: max(12px, env(safe-area-inset-right));
      bottom: max(12px, env(safe-area-inset-bottom));
      display: flex;
      gap: 4px;

      button {
        color: v.$ink;
        background: v.$white;
        border-color: #ddd;
        box-shadow: v.$shadow;
      }
    }
  }
</style>
