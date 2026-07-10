<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { ui, resetUi } from './store';
import { initTokenizer, toFuriganaSegments, type FuriganaSegment } from '@shared/furigana';
import { requestAnalyze, requestPeekCache, requestSaveCard } from '@shared/messaging';
import { loadSettings, onSettingsChanged } from '@shared/settings';
import type { Analysis, NativeLang } from '@shared/types';
import { useI18n } from 'vue-i18n';
import { setLocale } from '@shared/i18n';
import { speakJa, stopSpeaking, ttsSupported } from '@shared/tts';
import { builtinTranslatorSupported, translateJaTo } from '@shared/translator';
import FuriganaText from '@shared/FuriganaText.vue';

const { t } = useI18n({ useScope: 'global' });

const canSpeak = ttsSupported();

// 用户母语（内置翻译的目标语言）
const nativeLang = ref<NativeLang>('en');
// 免费"速译"：AI 分析前的占位翻译（浏览器内置端上翻译）
const freeTranslation = ref('');
const freeTranslating = ref(false);

const POPUP_WIDTH = 380;

const segments = ref<FuriganaSegment[]>([]);
const furiganaLoading = ref(false);
const furiganaError = ref('');

// 界面语言跟随母语设置
onMounted(async () => {
  const settings = await loadSettings();
  nativeLang.value = settings.nativeLang;
  setLocale(settings.nativeLang);
});
onSettingsChanged((s) => {
  nativeLang.value = s.nativeLang;
  setLocale(s.nativeLang);
});

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

// 翻译展示：有 AI 译文优先用 AI 的，否则用免费速译
const aiTranslation = computed(() => analysis.value?.translation ?? '');
const displayTranslation = computed(() => aiTranslation.value || freeTranslation.value);
const showFreeTag = computed(() => !aiTranslation.value && !!freeTranslation.value);

// 内容脚本上下文是否仍有效：扩展重载后，旧页面里的 chrome.runtime 会失效
function extensionAlive(): boolean {
  return typeof chrome !== 'undefined' && !!chrome.runtime && !!chrome.runtime.id;
}

// 异步结果落地前校验弹层上下文未变：快速关闭/换选区时丢弃过期回包，
// 避免旧文本的速译/分析结果错误地显示在新文本下。
function stillCurrent(text: string): boolean {
  return ui.mode === 'popup' && ui.text === text;
}

function openPopup(): void {
  ui.mode = 'popup';
}

function speak(): void {
  speakJa(ui.text);
}

function close(): void {
  stopSpeaking();
  resetUi();
}

// 免费速译：AI 前的占位（浏览器内置端上翻译）；不可用则不显示（降级）
async function runFreeTranslate(text: string): Promise<void> {
  freeTranslation.value = '';
  freeTranslating.value = false;
  if (!builtinTranslatorSupported()) return;
  freeTranslating.value = true;
  try {
    const result = (await translateJaTo(text, nativeLang.value)) ?? '';
    if (stillCurrent(text)) freeTranslation.value = result;
  } finally {
    if (stillCurrent(text)) freeTranslating.value = false;
  }
}

async function runFurigana(text: string): Promise<void> {
  segments.value = [];
  furiganaError.value = '';
  furiganaLoading.value = true;
  try {
    if (!extensionAlive()) throw new Error(t('popup.contextInvalid'));
    const tokenizer = await initTokenizer(chrome.runtime.getURL('assets/dict'));
    if (stillCurrent(text)) segments.value = toFuriganaSegments(tokenizer, text);
  } catch (e) {
    if (stillCurrent(text)) furiganaError.value = (e as Error).message;
  } finally {
    if (stillCurrent(text)) furiganaLoading.value = false;
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
  saveError.value = '';
  try {
    if (!extensionAlive()) throw new Error(t('popup.contextInvalid'));
    const reply = await requestAnalyze({
      text,
      sourceUrl: location.href,
      sourceTitle: document.title,
      forceRefresh,
    });
    if (!stillCurrent(text)) return;
    if (reply.ok) {
      ui.analysis = { status: 'done', analysis: reply.analysis, saved: reply.savedCardId !== null };
      applyAiFurigana(reply.analysis);
    } else {
      ui.analysis = { status: 'error', message: reply.error };
    }
  } catch (e) {
    if (stillCurrent(text)) ui.analysis = { status: 'error', message: (e as Error).message };
  }
}

// popup 打开时查缓存：命中则直接展示已有分析结果（不调用 AI）
async function peekCache(text: string): Promise<void> {
  if (!extensionAlive()) return;
  try {
    const reply = await requestPeekCache({
      text,
      sourceUrl: location.href,
      sourceTitle: document.title,
    });
    if (reply.ok && reply.analysis && stillCurrent(text)) {
      ui.analysis = { status: 'done', analysis: reply.analysis, saved: reply.savedCardId !== null };
      applyAiFurigana(reply.analysis);
    }
  } catch {
    // 忽略，保持 idle 状态
  }
}

const saveError = ref('');

async function save(): Promise<void> {
  if (ui.analysis.status !== 'done') return;
  const text = ui.text;
  saveError.value = '';
  try {
    if (!extensionAlive()) throw new Error(t('popup.contextInvalid'));
    const reply = await requestSaveCard({
      text,
      sourceUrl: location.href,
      sourceTitle: document.title,
      analysis: ui.analysis.analysis,
    });
    if (!stillCurrent(text)) return;
    if (reply.ok) {
      if (ui.analysis.status === 'done') ui.analysis = { ...ui.analysis, saved: true };
    } else {
      saveError.value = reply.error;
    }
  } catch (e) {
    if (stillCurrent(text)) saveError.value = (e as Error).message;
  }
}

// popup 打开：只做本地假名标注；AI 讲解改为用户点按钮主动触发
watch(
  () => (ui.mode === 'popup' ? ui.text : ''),
  async (text) => {
    if (!text) return;
    stopSpeaking(); // 换句时停掉上一段朗读
    saveError.value = '';
    void runFreeTranslate(text); // 免费速译（并行，不阻塞假名）
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
      <button class="jpl-close" @click="close">×</button>
    </div>

    <div class="jpl-body">
      <!-- 原文 + 假名 -->
      <div class="jpl-original">
        <span v-if="furiganaLoading" class="jpl-muted">{{ t('popup.parsing') }}</span>
        <span v-else-if="furiganaError">{{ ui.text }}</span>
        <FuriganaText v-else :segments="segments" />
        <button
          v-if="canSpeak && !furiganaLoading"
          class="jpl-speak"
          :title="t('popup.speak')"
          @click="speak"
        >
          🔊
        </button>
      </div>

      <!-- 翻译：常驻；有 AI 译文用 AI 的，否则显示内置速译 -->
      <div v-if="displayTranslation || freeTranslating" class="jpl-trans">
        <div class="jpl-label">
          {{ t('sec.translation') }}
          <span v-if="showFreeTag" class="jpl-trans-src">{{ t('popup.builtinTrans') }}</span>
        </div>
        <div v-if="displayTranslation" class="jpl-text">{{ displayTranslation }}</div>
        <div v-else class="jpl-muted jpl-trans-loading">{{ t('popup.parsing') }}</div>
      </div>

      <!-- AI 分析：idle / loading / error / done。各块均为 jpl-body 直接子元素，
           分割线由 `.jpl-body > * + *` 统一处理，块自身不带 border -->
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

        <div v-if="saveError" class="jpl-error">
          {{ t('popup.saveFail', { msg: saveError }) }}
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
</template>
