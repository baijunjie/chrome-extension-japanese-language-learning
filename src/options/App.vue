<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import ReviewView from './ReviewView.vue';

const { t } = useI18n({ useScope: 'global' });
</script>

<template>
  <div class="flex h-screen flex-col bg-gray-50 text-gray-900">
    <header class="shrink-0 border-b border-gray-200 bg-white">
      <div class="mx-auto max-w-6xl px-6 py-4">
        <h1 class="text-lg font-semibold">{{ t('review.title') }}</h1>
      </div>
    </header>

    <main class="mx-auto flex w-full max-w-6xl min-h-0 flex-1 flex-col px-6 py-6">
      <ReviewView />
    </main>
  </div>
</template>
