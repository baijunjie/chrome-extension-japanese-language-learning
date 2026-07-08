<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import type { AppSettings, JlptLevel } from '@shared/types';
import {
  JLPT_LEVELS,
  NATIVE_LANGS,
  NATIVE_LANG_LABELS,
  loadSettings,
  makeDefaults,
  saveSettings,
} from '@shared/settings';
import { testConnection } from '@shared/ai';
import { useI18n } from 'vue-i18n';
import { setLocale } from '@shared/i18n';
import ComboBox, { type ComboOption } from './ComboBox.vue';

const { t } = useI18n({ useScope: 'global' });

const settings = reactive<AppSettings>(makeDefaults());
const loading = ref(true);
const saved = ref(false);
const showKey = ref(false);

type SettingsTab = 'learner' | 'model';
const tab = ref<SettingsTab>('learner');
const tabs: { key: SettingsTab; labelKey: string }[] = [
  { key: 'learner', labelKey: 'settings.learner' },
  { key: 'model', labelKey: 'settings.modelTab' },
];

type TestState = 'idle' | 'testing' | 'ok' | 'error';
const testState = ref<TestState>('idle');
const testError = ref('');

// entry 走 i18n 文案，N5-N1 语言无关直接显示
const jlptLabel = (lv: JlptLevel): string => (lv === 'entry' ? t('jlpt.entry') : lv);

// 服务商预设：{ name, baseURL(不带结尾斜杠), models }，与参考项目 realtime-translator 对齐。
// Base URL 与 Model 均可下拉选或手输。末尾追加本地推理服务（需自行运行）。
interface ProviderPreset {
  name: string;
  baseURL: string;
  models: string[];
}
const providerPresets: ProviderPreset[] = [
  {
    name: 'OpenAI',
    baseURL: 'https://api.openai.com/v1',
    models: ['gpt-4o-mini', 'gpt-4.1-mini', 'gpt-4.1-nano', 'gpt-5-mini'],
  },
  // Anthropic 的 OpenAI 兼容端点（原生接口为 /v1/messages，本扩展只走兼容端点）
  {
    name: 'Claude',
    baseURL: 'https://api.anthropic.com/v1',
    models: ['claude-haiku-4-5', 'claude-sonnet-4-6'],
  },
  {
    name: 'DeepSeek',
    baseURL: 'https://api.deepseek.com/v1',
    models: ['deepseek-v4-flash', 'deepseek-chat'],
  },
  {
    name: 'Gemini',
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
    models: ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-2.0-flash'],
  },
  {
    name: '通义千问 Qwen',
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    // 移除 qwen-mt-*（机器翻译专用模型，不能做语法讲解），仅保留通用指令模型
    models: ['qwen-flash', 'qwen-plus'],
  },
  {
    name: '智谱 GLM',
    baseURL: 'https://open.bigmodel.cn/api/paas/v4',
    models: ['glm-4.7-flash', 'glm-4-flash', 'glm-4.6'],
  },
  {
    name: 'MiniMax',
    baseURL: 'https://api.minimax.io/v1',
    models: ['MiniMax-M2.7-highspeed', 'MiniMax-M2.5-highspeed', 'MiniMax-M2.5'],
  },
  {
    name: '硅基流动 SiliconFlow',
    baseURL: 'https://api.siliconflow.cn/v1',
    models: ['Qwen/Qwen2.5-7B-Instruct', 'deepseek-ai/DeepSeek-V3', 'THUDM/glm-4-9b-chat'],
  },
  // 本地推理服务（需自行运行）：OpenAI 兼容，免 API Key
  {
    name: 'Ollama（本地）',
    baseURL: 'http://localhost:11434/v1',
    models: ['qwen2.5:7b', 'qwen2.5:14b'],
  },
  { name: 'LM Studio（本地）', baseURL: 'http://localhost:1234/v1', models: [] },
];

const normalizeUrl = (u: string): string => u.trim().replace(/\/+$/, '').toLowerCase();

const baseUrlOptions = computed<ComboOption[]>(() =>
  providerPresets.map((p) => ({ value: p.baseURL, label: p.name, hint: p.baseURL })),
);

// Model 候选：随当前 Base URL 联动到对应服务商模型；未匹配则用全部预设模型去重兜底
const modelOptions = computed<ComboOption[]>(() => {
  const base = normalizeUrl(settings.model.baseURL);
  const provider = providerPresets.find((p) => normalizeUrl(p.baseURL) === base);
  const models = provider ? provider.models : [...new Set(providerPresets.flatMap((p) => p.models))];
  return models.map((m) => ({ value: m, label: m }));
});

const canTest = computed(
  () =>
    settings.model.baseURL.trim() !== '' &&
    settings.model.model.trim() !== '' &&
    testState.value !== 'testing',
);

function snapshot(): AppSettings {
  return JSON.parse(JSON.stringify(settings)) as AppSettings;
}

// 修改即保存：文本输入频繁触发，做防抖批量写入
let saveTimer: ReturnType<typeof setTimeout> | undefined;
function scheduleSave(): void {
  saved.value = false;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    await saveSettings(snapshot());
    saved.value = true;
    setTimeout(() => (saved.value = false), 1500);
  }, 400);
}

onMounted(async () => {
  Object.assign(settings, await loadSettings());
  loading.value = false;
  // 在初始回填之后再注册监听，避免回填本身触发保存
  watch(settings, scheduleSave, { deep: true });
});

// 母语变化 → 界面语言实时跟随
watch(
  () => settings.nativeLang,
  (l) => setLocale(l),
);

async function runTest(): Promise<void> {
  if (!canTest.value) return;
  testState.value = 'testing';
  testError.value = '';
  try {
    await testConnection(snapshot());
    testState.value = 'ok';
  } catch (e) {
    testState.value = 'error';
    testError.value = (e as Error).message;
  }
}

// 模型配置任一字段变化 → 作废上次测试结果（旧结果不再对应当前配置）
watch(
  () => [settings.model.baseURL, settings.model.apiKey, settings.model.model],
  () => {
    testState.value = 'idle';
    testError.value = '';
  },
);

const labelCls = 'block text-sm font-medium text-gray-700';
const inputCls =
  'mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none';
</script>

<template>
  <div v-if="!loading">
    <!-- 分区 Tab：学习者 / 模型 -->
    <div class="mb-5 flex gap-1 rounded-lg bg-gray-100 p-1">
      <button
        v-for="tb in tabs"
        :key="tb.key"
        class="flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition"
        :class="
          tab === tb.key ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
        "
        @click="tab = tb.key"
      >
        {{ t(tb.labelKey) }}
      </button>
    </div>

    <!-- 学习者 -->
    <div v-if="tab === 'learner'" class="space-y-5">
      <label class="block">
        <span :class="labelCls">{{ t('settings.nativeLang') }}</span>
        <select v-model="settings.nativeLang" :class="inputCls">
          <option v-for="l in NATIVE_LANGS" :key="l" :value="l">{{ NATIVE_LANG_LABELS[l] }}</option>
        </select>
      </label>

      <label class="block">
        <span :class="labelCls">{{ t('settings.jlptLevel') }}</span>
        <select v-model="settings.jlptLevel" :class="inputCls">
          <option v-for="lv in JLPT_LEVELS" :key="lv" :value="lv">{{ jlptLabel(lv) }}</option>
        </select>
      </label>

      <label class="flex items-start gap-3">
        <input
          v-model="settings.autoRecord"
          type="checkbox"
          class="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
        />
        <span class="text-sm text-gray-700">{{ t('settings.autoRecord') }}</span>
      </label>
    </div>

    <!-- 模型 -->
    <div v-else class="space-y-4">
      <p class="text-xs leading-relaxed text-gray-500">{{ t('settings.modelHint') }}</p>

      <div>
        <span :class="labelCls">Base URL</span>
        <div class="mt-1">
          <ComboBox
            v-model="settings.model.baseURL"
            :options="baseUrlOptions"
            placeholder="https://api.openai.com/v1"
          />
        </div>
      </div>

      <div>
        <span :class="labelCls">Model</span>
        <div class="mt-1">
          <ComboBox
            v-model="settings.model.model"
            :options="modelOptions"
            placeholder="gpt-4o-mini"
          />
        </div>
      </div>

      <div>
        <span :class="labelCls">API Key</span>
        <div class="mt-1 flex gap-2">
          <input
            v-model.trim="settings.model.apiKey"
            :type="showKey ? 'text' : 'password'"
            :placeholder="t('settings.apiKeyPlaceholder')"
            class="w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm focus:border-indigo-500 focus:outline-none"
          />
          <button
            type="button"
            class="shrink-0 rounded-md border border-gray-300 px-3 text-sm text-gray-600 hover:bg-gray-50"
            @click="showKey = !showKey"
          >
            {{ showKey ? t('common.hide') : t('common.show') }}
          </button>
        </div>
      </div>

      <div class="pt-1">
        <div class="flex items-center gap-3">
          <button
            class="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            :disabled="!canTest"
            @click="runTest"
          >
            {{ testState === 'testing' ? t('settings.testing') : t('settings.testConn') }}
          </button>
          <span v-if="testState === 'ok'" class="text-sm font-medium text-green-600">
            {{ t('settings.testOk') }}
          </span>
          <span v-else-if="testState === 'error'" class="text-sm font-medium text-red-600">
            {{ t('settings.testFail') }}
          </span>
        </div>
        <p v-if="testState === 'error' && testError" class="mt-1 break-words text-xs text-red-500">
          {{ testError }}
        </p>
      </div>
    </div>

    <!-- 修改即自动保存的轻量提示 -->
    <Transition name="jpl-fade">
      <div
        v-if="saved"
        class="fixed bottom-4 right-4 rounded-md bg-gray-900 px-3 py-1.5 text-sm text-white shadow-lg"
      >
        {{ t('settings.saved') }}
      </div>
    </Transition>
  </div>

  <div v-else class="text-sm text-gray-400">{{ t('settings.loading') }}</div>
</template>

<style scoped>
.jpl-fade-enter-active,
.jpl-fade-leave-active {
  transition: opacity 0.2s ease;
}
.jpl-fade-enter-from,
.jpl-fade-leave-to {
  opacity: 0;
}
</style>
