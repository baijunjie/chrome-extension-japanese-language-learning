<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useVirtualizer } from '@tanstack/vue-virtual';
import type { Card, JlptLevel, NativeLang } from '@shared/types';
import type { FuriganaSegment } from '@shared/furigana';
import { clearCards, deleteCard, deleteCards, getAllCards } from '@shared/storage';
import { JLPT_LEVELS, NATIVE_LANGS, NATIVE_LANG_LABELS } from '@shared/settings';
import { useI18n } from 'vue-i18n';
import { speakJa, ttsSupported } from '@shared/tts';
import FuriganaText from '@shared/FuriganaText.vue';
import ReviewListRow, { type Row } from './ReviewListRow.vue';

const { t } = useI18n({ useScope: 'global' });
const canSpeak = ttsSupported();

const cards = ref<Card[]>([]);
const loading = ref(true);
const confirming = ref<'all' | 'current' | null>(null);
const selectedId = ref<string | null>(null);

const isEmpty = computed(() => !loading.value && cards.value.length === 0);
const jlptLabel = (lv: JlptLevel): string => (lv === 'entry' ? t('jlpt.entry') : lv);

// 卡片按生成时的 JLPT 等级归类；旧数据(含 null/未知)归入门
const KNOWN_LEVELS = new Set<string>(JLPT_LEVELS);
function levelOf(card: Card): JlptLevel {
  const lv = card.jlptLevel as unknown as string;
  return KNOWN_LEVELS.has(lv) ? (lv as JlptLevel) : 'entry';
}

// 两个筛选维度：JLPT 等级、讲解语言（'all' = 不筛选）；选项仅列出实际出现过的值
const filterLevel = ref<JlptLevel | 'all'>('all');
const filterLang = ref<NativeLang | 'all'>('all');
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
const hasFilter = computed(() => filterLevel.value !== 'all' || filterLang.value !== 'all');

// 按等级分组后拍平成行（表头行 / 卡片行），供虚拟列表消费
const rows = computed<Row[]>(() => {
  const out: Row[] = [];
  for (const level of JLPT_LEVELS) {
    const list = filteredCards.value.filter((c) => levelOf(c) === level);
    if (!list.length) continue;
    out.push({ type: 'header', id: `h:${level}`, label: jlptLabel(level), count: list.length });
    for (const c of list) out.push({ type: 'card', id: c.id, card: c });
  }
  return out;
});

const selectedCard = computed(() => filteredCards.value.find((c) => c.id === selectedId.value) ?? null);

// 选中项失效（被筛掉/删除/首次加载）时自动选第一条
watch(filteredCards, (list) => {
  if (!list.some((c) => c.id === selectedId.value)) {
    selectedId.value = list[0]?.id ?? null;
  }
});

// —— 虚拟滚动：只渲染可见行，滚动容器为左侧 aside ——
const listEl = ref<HTMLElement | null>(null);
const rowVirtualizer = useVirtualizer(
  computed(() => ({
    count: rows.value.length,
    getScrollElement: () => listEl.value,
    estimateSize: () => 76,
    overscan: 10,
    getItemKey: (index: number) => rows.value[index]?.id ?? index,
  })),
);
const virtualRows = computed(() => rowVirtualizer.value.getVirtualItems());
const totalSize = computed(() => rowVirtualizer.value.getTotalSize());
function measure(el: unknown): void {
  if (el instanceof Element) rowVirtualizer.value.measureElement(el);
}

// —— 详情假名：优先卡片里 AI 存的 furigana，缺失时懒加载 kuromoji 兜底 ——
const segments = ref<FuriganaSegment[]>([]);
function storedSegments(card: Card): FuriganaSegment[] | null {
  const fg = card.analysis.furigana;
  if (fg && fg.length && fg.map((p) => p.text).join('') === card.text) {
    return fg.map((p) => ({ surface: p.text, reading: p.reading || undefined }));
  }
  return null;
}
watch(
  selectedCard,
  async (card) => {
    segments.value = [];
    if (!card) return;
    const stored = storedSegments(card);
    if (stored) {
      segments.value = stored;
      return;
    }
    try {
      const { initTokenizer, toFuriganaSegments } = await import('@shared/furigana');
      const tokenizer = await initTokenizer(chrome.runtime.getURL('assets/dict'));
      if (selectedCard.value?.id === card.id) segments.value = toFuriganaSegments(tokenizer, card.text);
    } catch {
      // 兜底失败：详情用纯文本
    }
  },
  { immediate: true },
);

async function reload(): Promise<void> {
  cards.value = await getAllCards();
}
onMounted(async () => {
  await reload();
  loading.value = false;
});

async function remove(id: string): Promise<void> {
  await deleteCard(id);
  await reload();
}
async function clearAll(): Promise<void> {
  await clearCards();
  confirming.value = null;
  await reload();
}

// 仅清空当前 filter 匹配的记录
async function clearCurrent(): Promise<void> {
  await deleteCards(filteredCards.value.map((c) => c.id));
  confirming.value = null;
  await reload();
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 顶部：条数 + 清空 -->
    <div class="mb-4 flex shrink-0 items-center justify-between">
      <span class="text-sm text-gray-500">{{ t('review.total', { n: filteredCards.length }) }}</span>
      <div v-if="cards.length" class="flex items-center gap-3">
        <template v-if="confirming">
          <span class="text-sm text-red-600">
            {{ confirming === 'all' ? t('review.confirmClear') : t('review.confirmClearCurrent') }}
          </span>
          <button
            class="text-sm text-red-600 hover:underline"
            @click="confirming === 'all' ? clearAll() : clearCurrent()"
          >
            {{ t('common.confirm') }}
          </button>
          <button class="text-sm text-gray-500 hover:underline" @click="confirming = null">
            {{ t('common.cancel') }}
          </button>
        </template>
        <template v-else>
          <button
            v-if="hasFilter"
            class="text-sm text-gray-500 hover:text-red-600"
            @click="confirming = 'current'"
          >
            {{ t('review.clearCurrent') }}
          </button>
          <button class="text-sm text-gray-500 hover:text-red-600" @click="confirming = 'all'">
            {{ t('review.clearAll') }}
          </button>
        </template>
      </div>
    </div>

    <!-- 筛选 -->
    <div v-if="cards.length" class="mb-5 flex shrink-0 flex-wrap items-center gap-4">
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

    <!-- 两列：左列表（虚拟滚动，滚动仅在此栏内）/ 右详情 -->
    <div v-else class="grid min-h-0 flex-1 grid-cols-[320px_1fr] items-stretch gap-6">
      <!-- 左：虚拟列表 -->
      <aside ref="listEl" class="h-full overflow-y-auto pr-1">
        <div :style="{ height: `${totalSize}px`, position: 'relative', width: '100%' }">
          <div
            v-for="vr in virtualRows"
            :key="String(vr.key)"
            :ref="measure"
            :data-index="vr.index"
            :style="{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${vr.start}px)`,
            }"
          >
            <ReviewListRow
              :row="rows[vr.index]"
              :selected="rows[vr.index].id === selectedId"
              @select="selectedId = rows[vr.index].id"
            />
          </div>
        </div>
      </aside>

      <!-- 右：详情（与 popup 一致：原文 + 注音 + 喇叭 + 翻译 + 讲解） -->
      <section class="h-full overflow-y-auto rounded-lg border border-gray-200 bg-white p-6">
        <div v-if="selectedCard" class="divide-y divide-gray-100">
          <!-- 原文 + 假名 + 喇叭 -->
          <div class="pb-4 text-xl leading-loose text-gray-900">
            <FuriganaText
              v-if="segments.length"
              :segments="segments"
              rt-class="text-[0.5em] font-normal text-gray-500"
            />
            <span v-else>{{ selectedCard.text }}</span>
            <button
              v-if="canSpeak"
              class="ml-2 cursor-pointer align-middle text-lg opacity-70 hover:opacity-100"
              :title="t('popup.speak')"
              @click="speakJa(selectedCard.text)"
            >
              🔊
            </button>
          </div>

          <!-- 翻译 -->
          <div class="py-4">
            <div class="text-xs font-bold uppercase tracking-wide text-indigo-600">
              {{ t('sec.translation') }}
            </div>
            <div class="mt-1 text-sm text-gray-700">{{ selectedCard.analysis.translation }}</div>
          </div>

          <!-- 语法 -->
          <div v-if="selectedCard.analysis.grammar_points.length" class="py-4">
            <div class="text-xs font-bold uppercase tracking-wide text-indigo-600">
              {{ t('sec.grammar') }}
            </div>
            <ul class="mt-1 space-y-2">
              <li v-for="(g, i) in selectedCard.analysis.grammar_points" :key="i" class="text-sm">
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

          <!-- 词汇 -->
          <div v-if="selectedCard.analysis.vocabulary.length" class="py-4">
            <div class="text-xs font-bold uppercase tracking-wide text-indigo-600">
              {{ t('sec.vocabulary') }}
            </div>
            <ul class="mt-1 space-y-1">
              <li v-for="(v, i) in selectedCard.analysis.vocabulary" :key="i" class="text-sm">
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

          <!-- 补充 -->
          <div v-if="selectedCard.analysis.notes" class="py-4">
            <div class="text-xs font-bold uppercase tracking-wide text-indigo-600">
              {{ t('sec.notes') }}
            </div>
            <div class="mt-1 text-sm text-gray-700">{{ selectedCard.analysis.notes }}</div>
          </div>

          <!-- 来源 + 删除 -->
          <div class="flex items-center justify-between pt-4 text-xs text-gray-400">
            <a
              v-if="selectedCard.sourceUrl"
              :href="selectedCard.sourceUrl"
              target="_blank"
              rel="noopener"
              class="max-w-[70%] truncate hover:text-indigo-600"
              :title="selectedCard.sourceTitle || selectedCard.sourceUrl"
            >
              {{ selectedCard.sourceTitle || selectedCard.sourceUrl }}
            </a>
            <span v-else></span>
            <button class="cursor-pointer hover:text-red-600" @click="remove(selectedCard.id)">
              {{ t('common.delete') }}
            </button>
          </div>
        </div>

        <div v-else class="py-16 text-center text-sm text-gray-400">{{ t('review.selectHint') }}</div>
      </section>
    </div>
  </div>
</template>
