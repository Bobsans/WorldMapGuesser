<template>
  <teleport to="body">
    <dialog ref="dialog" class="game-modal" :class="`game-modal-${size}`" :aria-label="label" @cancel.prevent="close" @click="onBackdrop">
      <button v-if="dismissible" class="game-modal-close" type="button" aria-label="Close map preview" @click="close">
        ×
      </button>
      <slot />
    </dialog>
  </teleport>
</template>

<script setup lang="ts">
  import { onBeforeUnmount, onMounted, useTemplateRef } from 'vue';

  const props = withDefaults(defineProps<{
    label: string;
    size?: 'small' | 'large';
    dismissible?: boolean;
  }>(), {
    size: 'large',
    dismissible: false,
  });

  const emit = defineEmits<{
    close: [];
  }>();

  const dialog = useTemplateRef<HTMLDialogElement>('dialog');

  const close = (): void => {
    if (props.dismissible) {
      emit('close');
    }
  };

  const onBackdrop = (event: MouseEvent): void => {
    if (event.target !== dialog.value || !dialog.value) {
      return;
    }

    const rect = dialog.value.getBoundingClientRect();

    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) {
      close();
    }
  };

  onMounted(() => dialog.value?.showModal());
  onBeforeUnmount(() => dialog.value?.close());
</script>

<style lang="scss">
  @use '@/styles/variables' as v;

  .game-modal {
    position: fixed;
    width: min(800px, calc(100% - 24px));
    max-width: none;
    max-height: calc(100dvh - 24px);
    padding: 24px;
    overflow: auto;
    color: v.$ink;
    background: v.$white;
    border: 0;
    border-radius: v.$radius;
    box-shadow: v.$shadow;

    &::backdrop {
      background: rgb(0 0 0 / 15%);
    }

    &.game-modal-small {
      width: min(600px, calc(100% - 24px));
    }

    .game-modal-close {
      position: absolute;
      top: 4px;
      right: 4px;
      z-index: 1;
      color: v.$ink;
      background: v.$white;
      border: 0;
      font-size: 28px;
    }

    @media (width <= 480px) {
      padding: 16px;
    }
  }
</style>
