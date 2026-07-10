<script lang="ts">
// 虚拟列表行：按等级分组拍平后的判别联合（表头行 / 卡片行）
import type { Card } from '@shared/types';

export type Row =
  | { type: 'header'; id: string; label: string; count: number }
  | { type: 'card'; id: string; card: Card };
</script>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

defineProps<{ row: Row; selected: boolean }>();
defineEmits<{ select: [] }>();

const { t } = useI18n({ useScope: 'global' });

function formatTime(ts: number): string {
  return new Date(ts).toLocaleString();
}
</script>

<template>
  <!-- 表头行 -->
  <h3 v-if="row.type === 'header'" class="flex items-center gap-2 pb-2 pt-3">
    <span class="rounded bg-indigo-600 px-2 py-0.5 text-xs font-medium text-white">
      {{ row.label }}
    </span>
    <span class="text-xs text-gray-400">{{ t('review.count', { n: row.count }) }}</span>
  </h3>

  <!-- 卡片行 -->
  <div v-else class="pb-1.5">
    <button
      class="w-full cursor-pointer rounded-lg border px-3 py-2 text-left transition"
      :class="
        selected ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 bg-white hover:border-gray-300'
      "
      @click="$emit('select')"
    >
      <div class="mb-0.5 truncate text-xs text-gray-400">
        {{ formatTime(row.card.createdAt)
        }}<template v-if="row.card.sourceTitle || row.card.sourceUrl">
          · {{ row.card.sourceTitle || row.card.sourceUrl }}</template
        >
      </div>
      <div class="line-clamp-2 text-sm text-gray-900">{{ row.card.text }}</div>
    </button>
  </div>
</template>
