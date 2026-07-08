<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import type { Card, JlptLevel, NativeLang } from '@shared/types';
import { clearCards, deleteCard, getAllCards } from '@shared/storage';
import { JLPT_LEVELS, NATIVE_LANGS, NATIVE_LANG_LABELS } from '@shared/settings';
import { useI18n } from 'vue-i18n';

const { t } = useI18n({ useScope: 'global' });

const cards = ref<Card[]>([]);
const loading = ref(true);
const expandedId = ref<string | null>(null);
const confirmingId = ref<string | null>(null);
const confirmingClear = ref(false);

const isEmpty = computed(() => !loading.value && cards.value.length === 0);

const jlptLabel = (lv: JlptLevel): string => (lv === 'entry' ? t('jlpt.entry') : lv);

// 卡片按生成时的 JLPT 等级归类；旧数据(含 null/未知)归入门
const KNOWN_LEVELS = new Set<string>(JLPT_LEVELS);
function levelOf(card: Card): JlptLevel {
  const lv = card.jlptLevel as unknown as string;
  return KNOWN_LEVELS.has(lv) ? (lv as JlptLevel) : 'entry';
}
// 两个筛选维度：JLPT 等级、讲解语言（'all' = 不筛选）
const filterLevel = ref<JlptLevel | 'all'>('all');
const filterLang = ref<NativeLang | 'all'>('all');

// 筛选项只列出卡片中实际出现过的值，避免空选项
const presentLevels = computed(() =>
  JLPT_LEVELS.filter((lv) => cards.value.some((c) => levelOf(c) === lv)),
);
const presentLangs = computed(() =>
  NATIVE_LANGS.filter((l) => cards.value.some((c) => c.nativeLang === l)),
);

const filteredCards = computed(() =>
  cards.value.filter(
    (c) =>
      (filterLevel.value === 'all' || levelOf(c) === filterLevel.value) &&
      (filterLang.value === 'all' || c.nativeLang === filterLang.value),
  ),
);

const groups = computed(() =>
  JLPT_LEVELS.map((level) => ({
    level,
    label: jlptLabel(level),
    cards: filteredCards.value.filter((c) => levelOf(c) === level),
  })).filter((g) => g.cards.length > 0),
);

async function reload(): Promise<void> {
  cards.value = await getAllCards();
}

onMounted(async () => {
  await reload();
  loading.value = false;
});

function toggle(id: string): void {
  expandedId.value = expandedId.value === id ? null : id;
}

async function remove(id: string): Promise<void> {
  await deleteCard(id);
  confirmingId.value = null;
  await reload();
}

async function clearAll(): Promise<void> {
  await clearCards();
  confirmingClear.value = false;
  await reload();
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleString();
}
</script>

<template>
  <div>
    <div class="mb-4 flex items-center justify-between">
      <span class="text-sm text-gray-500">{{ t('review.total', { n: filteredCards.length }) }}</span>
      <div v-if="cards.length" class="flex items-center gap-2">
        <template v-if="confirmingClear">
          <span class="text-sm text-red-600">{{ t('review.confirmClear') }}</span>
          <button class="text-sm text-red-600 hover:underline" @click="clearAll">
            {{ t('common.confirm') }}
          </button>
          <button class="text-sm text-gray-500 hover:underline" @click="confirmingClear = false">
            {{ t('common.cancel') }}
          </button>
        </template>
        <button
          v-else
          class="text-sm text-gray-500 hover:text-red-600"
          @click="confirmingClear = true"
        >
          {{ t('review.clearAll') }}
        </button>
      </div>
    </div>

    <!-- 筛选：JLPT 等级 + 讲解语言（选项仅列出实际出现过的值） -->
    <div v-if="cards.length" class="mb-5 flex flex-wrap items-center gap-4">
      <label class="flex items-center gap-2 text-sm text-gray-600">
        {{ t('review.filterLevel') }}
        <select
          v-model="filterLevel"
          class="rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none"
        >
          <option value="all">{{ t('common.all') }}</option>
          <option v-for="lv in presentLevels" :key="lv" :value="lv">{{ jlptLabel(lv) }}</option>
        </select>
      </label>
      <label class="flex items-center gap-2 text-sm text-gray-600">
        {{ t('review.filterLang') }}
        <select
          v-model="filterLang"
          class="rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none"
        >
          <option value="all">{{ t('common.all') }}</option>
          <option v-for="l in presentLangs" :key="l" :value="l">{{ NATIVE_LANG_LABELS[l] }}</option>
        </select>
      </label>
    </div>

    <div v-if="loading" class="text-sm text-gray-400">{{ t('settings.loading') }}</div>

    <div
      v-else-if="isEmpty"
      class="rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center text-gray-400"
    >
      {{ t('review.empty') }}
    </div>

    <div v-else class="space-y-8">
      <section v-for="group in groups" :key="group.level">
        <h3 class="mb-3 flex items-center gap-2">
          <span class="rounded bg-indigo-600 px-2 py-0.5 text-xs font-medium text-white">
            {{ group.label }}
          </span>
          <span class="text-xs text-gray-400">{{ t('review.count', { n: group.cards.length }) }}</span>
        </h3>
        <ul class="space-y-3">
          <li
            v-for="card in group.cards"
            :key="card.id"
            class="rounded-lg border border-gray-200 bg-white p-4"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0 flex-1">
                <div class="mb-1 flex items-center gap-2 text-xs text-gray-400">
                  <span>{{ formatTime(card.createdAt) }}</span>
                  <a
                    v-if="card.sourceUrl"
                    :href="card.sourceUrl"
                    target="_blank"
                    rel="noopener"
                    class="max-w-[16rem] truncate text-gray-400 hover:text-indigo-600"
                    :title="card.sourceTitle || card.sourceUrl"
                  >
                    {{ card.sourceTitle || card.sourceUrl }}
                  </a>
                </div>
                <div class="text-base text-gray-900">{{ card.text }}</div>
                <div class="mt-1 text-sm text-gray-600">{{ card.analysis.translation }}</div>
              </div>

              <div class="flex shrink-0 flex-col items-end gap-1">
                <template v-if="confirmingId === card.id">
                  <button class="text-xs text-red-600 hover:underline" @click="remove(card.id)">
                    {{ t('review.confirmDelete') }}
                  </button>
                  <button
                    class="text-xs text-gray-400 hover:underline"
                    @click="confirmingId = null"
                  >
                    {{ t('common.cancel') }}
                  </button>
                </template>
                <button
                  v-else
                  class="text-xs text-gray-400 hover:text-red-600"
                  @click="confirmingId = card.id"
                >
                  {{ t('common.delete') }}
                </button>
              </div>
            </div>

            <button
              class="mt-2 text-xs font-medium text-indigo-600 hover:underline"
              @click="toggle(card.id)"
            >
              {{ expandedId === card.id ? t('review.collapse') : t('review.expand') }}
            </button>

            <div
              v-if="expandedId === card.id"
              class="mt-3 space-y-3 border-t border-gray-100 pt-3"
            >
              <div v-if="card.analysis.grammar_points.length">
                <div class="text-xs font-bold uppercase tracking-wide text-indigo-600">
                  {{ t('sec.grammar') }}
                </div>
                <ul class="mt-1 space-y-2">
                  <li v-for="(g, i) in card.analysis.grammar_points" :key="i" class="text-sm">
                    <span class="font-semibold text-gray-900">{{ g.point }}</span>
                    <span
                      v-if="g.level"
                      class="ml-2 rounded bg-indigo-50 px-1.5 py-0.5 text-xs text-indigo-600"
                    >
                      {{ g.level }}
                    </span>
                    <div class="text-gray-700">{{ g.explanation }}</div>
                  </li>
                </ul>
              </div>

              <div v-if="card.analysis.vocabulary.length">
                <div class="text-xs font-bold uppercase tracking-wide text-indigo-600">
                  {{ t('sec.vocabulary') }}
                </div>
                <ul class="mt-1 space-y-1">
                  <li v-for="(v, i) in card.analysis.vocabulary" :key="i" class="text-sm">
                    <span class="font-semibold text-gray-900">{{ v.word }}</span>
                    <span v-if="v.reading" class="text-xs text-gray-500">［{{ v.reading }}］</span>
                    <span
                      v-if="v.pos"
                      class="ml-1 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500"
                    >
                      {{ v.pos }}
                    </span>
                    <span class="text-gray-700"> {{ v.meaning }}</span>
                  </li>
                </ul>
              </div>

              <div v-if="card.analysis.notes">
                <div class="text-xs font-bold uppercase tracking-wide text-indigo-600">
                  {{ t('sec.notes') }}
                </div>
                <div class="text-sm text-gray-700">{{ card.analysis.notes }}</div>
              </div>
            </div>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>
