<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import SettingsView from './SettingsView.vue';

const { t } = useI18n({ useScope: 'global' });

// 复习记录是独立整页，点击在新的扩展页面打开
function openReview(): void {
  chrome.runtime.openOptionsPage();
}
</script>

<template>
  <div class="w-[420px] bg-white text-gray-900">
    <header
      class="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3"
    >
      <div class="min-w-0">
        <h1 class="text-sm font-semibold leading-tight">{{ t('appName') }}</h1>
        <p class="mt-0.5 text-xs text-gray-400">{{ t('slogan') }}</p>
      </div>
      <button
        class="shrink-0 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
        @click="openReview"
      >
        {{ t('tab.review') }}
      </button>
    </header>

    <div class="max-h-[520px] overflow-y-auto p-4">
      <SettingsView />
    </div>
  </div>
</template>
