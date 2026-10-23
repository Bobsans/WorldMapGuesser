<template>
  <section class="game-result">
    <h1 :class="{ 'game-result-win': outcome === 'win' }">
      {{ outcome === 'win' ? 'YOU WIN!' : 'YOU LOSE!' }}
    </h1>
    <p>{{ user }}</p>
    <div class="game-result-scores">
      <p>
        Score:<strong>{{ right }} / {{ total }}</strong>
      </p>
      <p>
        Time:<strong>{{ secondsToTime(time) }}</strong>
      </p>
    </div>
    <p v-if="saveStatus === 'saving'" class="status-message" role="status">
      Saving result…
    </p>
    <p v-else-if="saveStatus === 'error'" class="status-message status-error" role="alert">
      {{ saveError }}
    </p>
    <score-table :countries="countries" :revision="scoreRevision" />
    <button class="game-result-restart" type="button" @click="emit('restart')">
      RESTART
    </button>
  </section>
</template>

<script setup lang="ts">
  import type { Countries, Outcome, SaveStatus } from '@/types';
  import { secondsToTime } from '@/utils/time';
  import ScoreTable from '@/components/ScoreTable.vue';

  defineProps<{
    outcome: Outcome;
    user: string;
    right: number;
    total: number;
    time: number;
    countries: Countries;
    saveStatus: SaveStatus;
    saveError: string;
    scoreRevision: number;
  }>();

  const emit = defineEmits<{
    restart: [];
  }>();
</script>

<style lang="scss">
  .game-result {
    display: flex;
    flex-direction: column;
    min-height: 0;
    text-align: center;

    > :not(.score-table) {
      flex-shrink: 0;
    }

    h1 {
      margin: 20px 0;
      font-size: clamp(28px, 6vw, 48px);
    }

    .game-result-win {
      color: #27823B;
    }

    .game-result-scores {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;

      strong {
        display: block;
        margin-top: 10px;
        font-size: clamp(20px, 4vw, 32px);
      }
    }

    .game-result-restart {
      align-self: center;
      margin-top: 24px;
    }
  }
</style>
