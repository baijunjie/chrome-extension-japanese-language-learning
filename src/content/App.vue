<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { ui, resetUi } from './store';
import { initTokenizer, toFuriganaSegments, type FuriganaSegment } from '@shared/furigana';
import { requestAnalyze, requestPeekCache, requestSaveCard } from '@shared/messaging';
import { loadSettings, onSettingsChanged } from '@shared/settings';
import type { Analysis } from '@shared/types';
import { useI18n } from 'vue-i18n';
import { setLocale } from '@shared/i18n';

const { t } = useI18n({ useScope: 'global' });

const POPUP_WIDTH = 380;

const segments = ref<FuriganaSegment[]>([]);
const furiganaLoading = ref(false);
const furiganaError = ref('');

// 界面语言跟随母语设置
onMounted(async () => {
  const settings = await loadSettings();
  setLocale(settings.nativeLang);
});
onSettingsChanged((s) => setLocale(s.nativeLang));

const iconStyle = computed(() => ({
  top: `${ui.rect.bottom + 4}px`,
  left: `${ui.rect.right + 4}px`,
}));

const popupStyle = computed(() => {
  const minLeft = window.scrollX + 12;
  const maxLeft = window.scrollX + window.innerWidth - POPUP_WIDTH - 12;
  const left = Math.max(minLeft, Math.min(ui.rect.left, maxLeft));
  return {
    top: `${ui.rect.bottom + 8}px`,
    left: `${left}px`,
    width: `${POPUP_WIDTH}px`,
  };
});

const analysis = computed(() => (ui.analysis.status === 'done' ? ui.analysis.analysis : null));
const saved = computed(() => ui.analysis.status === 'done' && ui.analysis.saved);

// 内容脚本上下文是否仍有效：扩展重载后，旧页面里的 chrome.runtime 会失效
function extensionAlive(): boolean {
  return typeof chrome !== 'undefined' && !!chrome.runtime && !!chrome.runtime.id;
}

function openPopup(): void {
  ui.mode = 'popup';
}

async function runFurigana(text: string): Promise<void> {
  segments.value = [];
  furiganaError.value = '';
  furiganaLoading.value = true;
  try {
    if (!extensionAlive()) throw new Error(t('popup.contextInvalid'));
    const tokenizer = await initTokenizer(chrome.runtime.getURL('assets/dict'));
    segments.value = toFuriganaSegments(tokenizer, text);
  } catch (e) {
    furiganaError.value = (e as Error).message;
  } finally {
    furiganaLoading.value = false;
  }
}

// 用 AI 校正后的假名覆盖本地 kuromoji 结果（拼接校验与原文一致才替换，避免错位）
function applyAiFurigana(a: Analysis): void {
  if (!a.furigana || !a.furigana.length) return;
  if (a.furigana.map((p) => p.text).join('') !== ui.text) return;
  segments.value = a.furigana.map((p) => ({ surface: p.text, reading: p.reading || undefined }));
}

async function runAnalyze(text: string, forceRefresh = false): Promise<void> {
  ui.analysis = { status: 'loading' };
  try {
    if (!extensionAlive()) throw new Error(t('popup.contextInvalid'));
    const reply = await requestAnalyze({
      text,
      sourceUrl: location.href,
      sourceTitle: document.title,
      forceRefresh,
    });
    if (reply.ok) {
      ui.analysis = { status: 'done', analysis: reply.analysis, saved: reply.savedCardId !== null };
      applyAiFurigana(reply.analysis);
    } else {
      ui.analysis = { status: 'error', message: reply.error };
    }
  } catch (e) {
    ui.analysis = { status: 'error', message: (e as Error).message };
  }
}

// popup 打开时查缓存：命中则直接展示已有分析结果（不调用 AI）
async function peekCache(text: string): Promise<void> {
  if (!extensionAlive()) return;
  try {
    const reply = await requestPeekCache(text);
    if (reply.ok && reply.analysis) {
      ui.analysis = { status: 'done', analysis: reply.analysis, saved: reply.savedCardId !== null };
      applyAiFurigana(reply.analysis);
    }
  } catch {
    // 忽略，保持 idle 状态
  }
}

async function save(): Promise<void> {
  if (ui.analysis.status !== 'done') return;
  const reply = await requestSaveCard({
    text: ui.text,
    sourceUrl: location.href,
    sourceTitle: document.title,
    analysis: ui.analysis.analysis,
  });
  if (reply.ok) ui.analysis = { ...ui.analysis, saved: true };
}

// popup 打开：只做本地假名标注；AI 讲解改为用户点按钮主动触发
watch(
  () => (ui.mode === 'popup' ? ui.text : ''),
  async (text) => {
    if (!text) return;
    // 先本地假名，再查缓存；顺序保证缓存命中的 AI 假名不被 kuromoji 结果覆盖
    await runFurigana(text);
    await peekCache(text);
  },
);
</script>

<template>
  <button
    v-if="ui.mode === 'icon'"
    class="jpl-icon"
    :style="iconStyle"
    :title="t('popup.title')"
    @click="openPopup"
  >
    あ
  </button>

  <div v-else-if="ui.mode === 'popup'" class="jpl-popup" :style="popupStyle">
    <div class="jpl-header">
      <span class="jpl-title">{{ t('popup.title') }}</span>
      <button class="jpl-close" @click="resetUi()">×</button>
    </div>

    <div class="jpl-body">
      <!-- 原文 + 假名 -->
      <div class="jpl-original">
        <span v-if="furiganaLoading" class="jpl-muted">{{ t('popup.parsing') }}</span>
        <span v-else-if="furiganaError">{{ ui.text }}</span>
        <template v-else>
          <template v-for="(seg, i) in segments" :key="i">
            <ruby v-if="seg.reading">{{ seg.surface }}<rt>{{ seg.reading }}</rt></ruby>
            <span v-else>{{ seg.surface }}</span>
          </template>
        </template>
      </div>

      <!-- AI 分析 -->
      <div class="jpl-analysis">
        <button
          v-if="ui.analysis.status === 'idle'"
          class="jpl-analyze"
          @click="runAnalyze(ui.text)"
        >
          {{ t('popup.analyze') }}
        </button>

        <div v-else-if="ui.analysis.status === 'loading'" class="jpl-loading">
          <span class="jpl-spinner"></span>
          <span class="jpl-muted">{{ t('popup.analyzing') }}</span>
        </div>

        <div v-else-if="ui.analysis.status === 'error'" class="jpl-error">
          <div>{{ t('popup.analyzeFail', { msg: ui.analysis.message }) }}</div>
          <button class="jpl-retry" @click="runAnalyze(ui.text)">{{ t('common.retry') }}</button>
        </div>

        <template v-else-if="analysis">
          <div class="jpl-section">
            <div class="jpl-label">{{ t('sec.translation') }}</div>
            <div class="jpl-text">{{ analysis.translation }}</div>
          </div>

          <div v-if="analysis.grammar_points.length" class="jpl-section">
            <div class="jpl-label">{{ t('sec.grammar') }}</div>
            <ul class="jpl-list">
              <li v-for="(g, i) in analysis.grammar_points" :key="i">
                <span class="jpl-point">{{ g.point }}</span>
                <span v-if="g.level" class="jpl-badge">{{ g.level }}</span>
                <div class="jpl-text">{{ g.explanation }}</div>
              </li>
            </ul>
          </div>

          <div v-if="analysis.vocabulary.length" class="jpl-section">
            <div class="jpl-label">{{ t('sec.vocabulary') }}</div>
            <ul class="jpl-list">
              <li v-for="(v, i) in analysis.vocabulary" :key="i">
                <span class="jpl-point">{{ v.word }}</span>
                <span v-if="v.reading" class="jpl-reading">［{{ v.reading }}］</span>
                <span v-if="v.pos" class="jpl-badge">{{ v.pos }}</span>
                <span class="jpl-text"> {{ v.meaning }}</span>
              </li>
            </ul>
          </div>

          <div v-if="analysis.notes" class="jpl-section">
            <div class="jpl-label">{{ t('sec.notes') }}</div>
            <div class="jpl-text">{{ analysis.notes }}</div>
          </div>

          <div class="jpl-foot">
            <span v-if="saved" class="jpl-saved">{{ t('popup.saved') }}</span>
            <button v-else class="jpl-save" @click="save">{{ t('popup.save') }}</button>
            <button class="jpl-reanalyze" @click="runAnalyze(ui.text, true)">
              {{ t('popup.reanalyze') }}
            </button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
