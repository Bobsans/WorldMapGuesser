<template>
  <section class="welcome-screen">
    <img class="welcome-logo" src="@assets/images/logo.png" alt="World Map Guesser" />
    <form class="welcome-form" @submit.prevent="start">
      <label class="visually-hidden" for="nickname">Nickname</label>
      <input id="nickname" v-model="nickname" name="nickname" type="text" placeholder="Nickname" maxlength="64" autocomplete="nickname" autofocus />
      <button type="submit" :disabled="loading || Boolean(error) || !nickname.trim()">
        START
      </button>
    </form>
    <p v-if="loading" class="status-message" role="status">Loading map…</p>
    <div v-if="error" class="status-message status-error" role="alert">
      <p>{{ error }}</p>
      <button type="button" @click="emit('retry')">Reload map</button>
    </div>
    <div class="welcome-help">
      <section class="welcome-rules">
        <h2>Rules</h2>
        <p>Find and click the current country on the map.</p>
        <p>
          You have 3 lives. If you click wrong, the correct country turns red
          and you lose 1 life.
        </p>
        <p>Good luck!</p>
      </section>
      <section class="welcome-controls">
        <h2>Controls</h2>
        <p><img src="@assets/images/controls/pan.png" alt="" />Drag to pan</p>
        <p>
          <img src="@assets/images/controls/zoom.png" alt="" />Scroll or pinch
          to zoom
        </p>
        <p>
          <img src="@assets/images/controls/change-country.png" alt="" />Arrows
          to change country
        </p>
      </section>
    </div>
    <score-table :countries="countries" />
  </section>
</template>

<script setup lang="ts">
  import { ref } from 'vue';
  import type { Countries } from '@/types';
  import ScoreTable from '@/components/ScoreTable.vue';

  const props = defineProps<{
    countries: Countries;
    loading: boolean;
    error: string;
  }>();

  const emit = defineEmits<{
    start: [nickname: string];
    retry: [];
  }>();

  const nickname = ref('');

  const start = (): void => {
    if (!props.loading && !props.error && nickname.value.trim()) {
      emit('start', nickname.value.trim());
    }
  };
</script>

<style lang="scss">
  .welcome-screen {
    display: flex;
    flex-direction: column;
    min-height: 0;

    > :not(.score-table) {
      flex-shrink: 0;
    }

    .welcome-logo {
      display: block;
      width: min(100%, 340px);
      height: 120px;
      margin: 0 auto 16px;
      object-fit: contain;
    }

    .welcome-form {
      display: grid;
      gap: 10px;
      width: min(100%, 280px);
      margin: 0 auto;

      input {
        width: 100%;
        text-align: center;
      }
    }

    .welcome-help {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-top: 24px;
      font-size: 13px;
      line-height: 1.6;

      h2 {
        margin-top: 0;
        font-size: 16px;
      }

      .welcome-controls {
        p {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        img {
          width: 40px;
          height: 40px;
          object-fit: contain;
        }
      }
    }

    @media (width <= 480px) {
      .welcome-logo {
        height: 90px;
      }

      .welcome-help {
        grid-template-columns: 1fr;
        gap: 8px;

        h2 {
          margin-bottom: 8px;
        }

        p {
          margin: 8px 0;
        }
      }
    }
  }
</style>
