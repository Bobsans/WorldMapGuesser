<template>
  <main class="game-app">
    <header-bar
      :playing="game.status === 'playing'"
      :lives="game.lives"
      :time="elapsed"
      :right="game.rights.length"
      :total="ids.length"
      :current="current"
      @navigate="navigate"
      @restart="start()"
    />
    <world-map
      :key="generation"
      :countries="countries"
      :ids="game.ids"
      :rights="game.rights"
      :wrongs="game.wrongs"
      :interactive="game.status === 'playing'"
      @answer="answer"
    />
    <modal v-if="game.status === 'ready'" label="Welcome to World Map Guesser" size="small">
      <welcome :countries="countries" :loading="loading" :error="loadError" @start="start" @retry="reloadMap" />
    </modal>
    <modal v-else-if="outcome" label="Game result">
      <result
        :outcome="outcome"
        :user="nickname"
        :right="game.rights.length"
        :total="ids.length"
        :time="elapsed"
        :countries="countries"
        :save-status="saveStatus"
        :save-error="saveError"
        :score-revision="scoreRevision"
        @restart="start()"
      />
    </modal>
  </main>
</template>

<script setup lang="ts">
  import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue';
  import type { Countries, CountryId, Direction, Outcome, SaveStatus } from '@/types';
  import { loadCountries, sendScore } from '@/api/client';
  import { answerCountry, changeCurrent, createGame, startGame } from '@/game/state';
  import HeaderBar from '@/components/HeaderBar.vue';
  import WorldMap from '@/components/WorldMap.vue';
  import Modal from '@/components/Modal.vue';
  import Welcome from '@/components/Welcome.vue';
  import Result from '@/components/Result.vue';

  const countries = shallowRef<Countries>({});
  const ids = computed(() => Object.keys(countries.value));
  const game = shallowRef(createGame());
  const nickname = ref('');
  const loading = ref(true);
  const loadError = ref('');
  const saveStatus = ref<SaveStatus>('idle');
  const saveError = ref('');
  const scoreRevision = ref(0);
  const elapsed = ref(0);

  const current = computed(() => game.value.currentId ? countries.value[game.value.currentId] : undefined);
  const outcome = computed<Outcome | null>(() => game.value.status === 'win' || game.value.status === 'loss' ? game.value.status : null);

  let timer: ReturnType<typeof setInterval> | undefined;
  let startedAt = 0;
  let generation = 0;
  let mapRequest: AbortController | undefined;
  let scoreRequest: AbortController | undefined;

  const stopClock = (): void => {
    clearInterval(timer);
    timer = undefined;
  };

  const updateClock = (): void => {
    elapsed.value = Math.floor((performance.now() - startedAt) / 1000);
  };

  const reloadMap = async (): Promise<void> => {
    mapRequest?.abort();

    const request = new AbortController();

    mapRequest = request;
    loading.value = true;
    loadError.value = '';

    try {
      const data = await loadCountries(request.signal);

      if (request.signal.aborted) {
        return;
      }

      countries.value = data;
      game.value = createGame(Object.keys(data));
    } catch (error) {
      if (!request.signal.aborted) {
        loadError.value = error instanceof Error ? error.message : 'The map could not be loaded.';
      }
    } finally {
      if (!request.signal.aborted) {
        loading.value = false;
      }
    }
  };

  const start = (user = nickname.value): void => {
    const name = user.trim();

    if (!name || loading.value || !ids.value.length) {
      return;
    }

    generation++;
    scoreRequest?.abort();
    stopClock();
    nickname.value = name;
    game.value = startGame(ids.value);
    elapsed.value = 0;
    saveStatus.value = 'idle';
    saveError.value = '';
    startedAt = performance.now();
    timer = setInterval(updateClock, 250);
  };

  const saveResult = async (): Promise<void> => {
    const currentGeneration = generation;
    const request = new AbortController();

    scoreRequest = request;
    saveStatus.value = 'saving';

    try {
      await sendScore({
        user: nickname.value,
        result: game.value.rights.length,
        time: elapsed.value,
        rights: [...game.value.rights],
        wrongs: [...game.value.wrongs],
      }, request.signal);

      if (currentGeneration === generation && !request.signal.aborted) {
        saveStatus.value = 'saved';
        scoreRevision.value++;
      }
    } catch (error) {
      if (currentGeneration === generation && !request.signal.aborted) {
        saveStatus.value = 'error';
        saveError.value = error instanceof Error ? error.message : 'The result could not be saved.';
      }
    }
  };

  const answer = (id: CountryId): void => {
    if (game.value.status !== 'playing') {
      return;
    }

    game.value = answerCountry(game.value, id);

    if (game.value.status !== 'playing') {
      updateClock();
      stopClock();
      void saveResult();
    }
  };

  const navigate = (direction: Direction): void => {
    game.value = changeCurrent(game.value, direction);
  };

  const onKeydown = (event: KeyboardEvent): void => {
    const target = event.target;

    if (
      game.value.status !== 'playing' || event.altKey || event.ctrlKey || event.metaKey || target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      (target instanceof HTMLElement && target.isContentEditable)
    ) {
      return;
    }

    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      navigate(event.key === 'ArrowLeft' ? 'prev' : 'next');
    }
  };

  onMounted(() => {
    void reloadMap();
    window.addEventListener('keydown', onKeydown);
  });

  onBeforeUnmount(() => {
    stopClock();
    mapRequest?.abort();
    scoreRequest?.abort();
    window.removeEventListener('keydown', onKeydown);
  });
</script>

<style lang="scss">
  .game-app {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    width: 100%;
    height: 100%;
    height: 100dvh;
    overflow: hidden;
  }
</style>
