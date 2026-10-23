<template>
  <section class="score-table" aria-label="Leaderboard">
    <p v-if="loading" class="status-message" role="status">
      Loading leaderboard…
    </p>
    <div v-else-if="error" class="status-message status-error" role="alert">
      <p>{{ error }}</p>
      <button type="button" @click="reload">Reload leaderboard</button>
    </div>
    <div v-if="scores.length" class="score-table-scroll">
      <table>
        <caption class="visually-hidden">
          Top 10 players
        </caption>
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Player</th>
            <th scope="col">Score</th>
            <th scope="col">Time</th>
            <th scope="col">Map</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, index) in scores" :key="index">
            <td>{{ index + 1 }}</td>
            <td>{{ item.user }}</td>
            <td>{{ item.result }}</td>
            <td>{{ secondsToTime(item.time) }}</td>
            <td>
              <button
                class="score-table-preview"
                type="button"
                :aria-label="`View map for ${item.user}`"
                :disabled="!ids.length"
                @click="preview = { ...item, position: index + 1 }"
              >
                <img src="@assets/images/search.svg" alt="" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <teleport to="body">
      <transition name="game-modal" appear>
        <modal v-if="preview" label="Saved game map" dismissible @close="preview = null">
          <div class="score-preview-map">
            <world-map :countries="countries" :ids="ids" :rights="preview.rights" :wrongs="preview.wrongs" />
          </div>
          <dl class="score-preview-info">
            <div>
              <dt>Position</dt>
              <dd>{{ preview.position }}</dd>
            </div>
            <div>
              <dt>Player</dt>
              <dd>{{ preview.user }}</dd>
            </div>
            <div>
              <dt>Result</dt>
              <dd>{{ preview.result }}</dd>
            </div>
            <div>
              <dt>Time</dt>
              <dd>{{ secondsToTime(preview.time) }}</dd>
            </div>
          </dl>
        </modal>
      </transition>
    </teleport>
  </section>
</template>

<script setup lang="ts">
  import { computed, onBeforeUnmount, ref, shallowRef, watch } from 'vue';
  import type { Countries, Score } from '@/types';
  import { getScores } from '@/api/client';
  import { secondsToTime } from '@/utils/time';
  import Modal from '@/components/Modal.vue';
  import WorldMap from '@/components/WorldMap.vue';

  const props = withDefaults(defineProps<{
    countries: Countries;
    revision?: number;
  }>(), { revision: 0 });

  const scores = shallowRef<Score[]>([]);
  const loading = ref(false);
  const error = ref('');
  const preview = shallowRef<(Score & { position: number }) | null>(null);
  const ids = computed(() => Object.keys(props.countries));
  let controller: AbortController | undefined;

  const reload = async (): Promise<void> => {
    controller?.abort();
    const request = new AbortController();
    controller = request;
    loading.value = true;
    error.value = '';

    try {
      const data = await getScores(request.signal);

      if (!request.signal.aborted) {
        scores.value = data;
      }
    } catch (failure) {
      if (!request.signal.aborted) {
        error.value = failure instanceof Error ? failure.message : 'The leaderboard could not be loaded.';
      }
    } finally {
      if (!request.signal.aborted) {
        loading.value = false;
      }
    }
  };

  watch(() => props.revision, () => {
    void reload();
  }, { immediate: true });

  onBeforeUnmount(() => controller?.abort());
</script>

<style lang="scss">
  @use '@/styles/variables' as v;

  .score-table {
    display: flex;
    flex-direction: column;
    min-height: 84px;
    margin-top: 20px;
    overflow-wrap: anywhere;

    .score-table-scroll {
      min-height: 0;
      max-height: min(240px, 30dvh);
      overflow: auto;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }

    th,
    td {
      padding: 6px 4px;
      text-align: center;
      border-bottom: v.$border;
    }

    th {
      position: sticky;
      top: 0;
      background: v.$white;
    }

    td:nth-child(2) {
      max-width: 180px;
    }

    .score-table-preview {
      padding: 8px;
      background: transparent;
      border: 0;

      img {
        width: 18px;
        height: 18px;
      }
    }

    @media (width <= 480px) {
      table {
        font-size: 12px;
      }
    }
  }

  // Preview dialogs are teleported outside the leaderboard.
  .score-preview-map {
    height: min(60dvh, 500px);
    margin-top: 24px;

    .world-map {
      height: 100%;
    }

    @media (width <= 480px) {
      margin-top: 32px;
    }
  }

  .score-preview-info {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
    text-align: center;

    dt {
      margin-bottom: 8px;
      font-size: 12px;
    }

    dd {
      margin: 0;
      overflow-wrap: anywhere;
    }

    @media (width <= 480px) {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
</style>
