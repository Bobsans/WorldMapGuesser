<template>
  <header class="game-header">
    <img class="game-header-logo" src="@assets/images/logo.png" alt="World Map Guesser" />
    <div v-if="playing" class="game-header-controls">
      <button class="game-header-restart" type="button" title="Restart" aria-label="Restart game" @click="emit('restart')">
        <img src="@assets/images/restart.png" alt="" />
      </button>
      <div class="game-header-selector">
        <button type="button" aria-label="Previous country" @click="emit('navigate', 'prev')">
          ‹
        </button>
        <span class="game-header-country" aria-live="polite">{{
          current?.name
        }}</span>
        <button type="button" aria-label="Next country" @click="emit('navigate', 'next')">
          ›
        </button>
      </div>
      <div class="game-header-details">
        <div class="game-header-lives" :aria-label="`${lives} lives remaining`">
          <img v-for="life in 3" :key="life" :src="life <= lives ? heart : emptyHeart" alt="" />
        </div>
        <span class="game-header-score" aria-label="Score">{{ right }}/{{ total }}</span>
        <time class="game-header-time" aria-label="Elapsed time">{{
          secondsToTime(time)
        }}</time>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
  import type { Country, Direction } from '@/types';
  import { secondsToTime } from '@/utils/time';
  import heart from '@assets/images/heart.svg';
  import emptyHeart from '@assets/images/heart-black.svg';

  defineProps<{
    playing: boolean;
    total: number;
    right: number;
    current?: Country;
    lives: number;
    time: number;
  }>();

  const emit = defineEmits<{
    navigate: [direction: Direction];
    restart: [];
  }>();
</script>

<style lang="scss">
  @use '@/styles/variables' as v;

  .game-header {
    z-index: 1;
    display: flex;
    align-items: center;
    min-height: 80px;
    padding: 8px max(12px, env(safe-area-inset-right)) 8px max(12px, env(safe-area-inset-left));
    background: v.$white;
    box-shadow: v.$shadow;

    .game-header-logo {
      width: 160px;
      height: 60px;
      object-fit: contain;
    }

    .game-header-controls {
      display: flex;
      flex: 1;
      gap: 12px;
      align-items: center;
      min-width: 0;

      .game-header-restart {
        margin-left: auto;
        background: transparent;
        border: 0;

        img {
          width: 22px;
          height: 22px;
        }
      }

      .game-header-selector {
        display: grid;
        grid-template-columns: 44px minmax(0, 300px) 44px;
        align-items: center;
        text-align: center;

        button {
          padding: 0;
          color: v.$ink;
          background: transparent;
          border: 0;
          font-size: 32px;
        }

        .game-header-country {
          font-size: clamp(16px, 2vw, 24px);
          overflow-wrap: anywhere;
        }
      }

      .game-header-details {
        display: flex;
        gap: 24px;
        align-items: center;
        font-size: 20px;
        white-space: nowrap;

        .game-header-time {
          flex: 0 0 8ch;
          width: 8ch;
          font-variant-numeric: tabular-nums;
          text-align: right;
        }

        .game-header-lives {
          display: flex;
          gap: 4px;

          img {
            width: 20px;
            height: 20px;
          }
        }
      }
    }

    @media (width <= 900px) {
      flex-wrap: wrap;
      justify-content: center;

      .game-header-logo {
        width: 120px;
        height: 44px;
      }

      .game-header-controls {
        flex-wrap: wrap;
        justify-content: center;

        .game-header-selector {
          flex: 1;
          grid-template-columns: 44px minmax(0, 1fr) 44px;
        }

        .game-header-details {
          justify-content: center;
          width: 100%;
          gap: 24px;
          font-size: 16px;
        }
      }
    }

    @media (width <= 480px) {
      .game-header-logo {
        display: none;
      }

      .game-header-controls {
        gap: 4px;

        .game-header-restart {
          margin: 0;
        }
      }
    }
  }
</style>
