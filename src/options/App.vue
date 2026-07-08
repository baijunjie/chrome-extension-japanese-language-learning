<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import ReviewView from './ReviewView.vue';

const { t } = useI18n({ useScope: 'global' });
</script>

<template>
  <div class="min-h-screen bg-gray-50 text-gray-900">
    <header class="border-b border-gray-200 bg-white">
      <div class="mx-auto max-w-3xl px-6 py-4">
        <h1 class="text-lg font-semibold">{{ t('review.title') }}</h1>
      </div>
    </header>

    <main class="mx-auto max-w-3xl px-6 py-8">
      <ReviewView />
    </main>
  </div>
</template>
