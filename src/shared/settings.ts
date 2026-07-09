// 设置的默认值、校验与持久化（chrome.storage.local）。
import type { AppSettings, JlptLevel, NativeLang } from './types';

const STORAGE_KEY = 'settings';

// 下拉渲染顺序：按 key 字母序
export const NATIVE_LANGS: NativeLang[] = [
  'de',
  'en',
  'es',
  'fr',
  'ko',
  'pt',
  'ru',
  'zh-CN',
  'zh-TW',
];
// 语言名用各自母语书写（endonym），不随 UI 语言变化
export const NATIVE_LANG_LABELS: Record<NativeLang, string> = {
  de: 'Deutsch',
  en: 'English',
  es: 'Español',
  fr: 'Français',
  ko: '한국어',
  pt: 'Português',
  ru: 'Русский',
  'zh-CN': '简体中文',
  'zh-TW': '繁體中文',
};

// 由低到高；entry 为入门（零基础），默认值
export const JLPT_LEVELS: JlptLevel[] = ['entry', 'N5', 'N4', 'N3', 'N2', 'N1'];
export const JLPT_LABELS: Record<JlptLevel, string> = {
  entry: '入门（零基础）',
  N5: 'N5',
  N4: 'N4',
  N3: 'N3',
  N2: 'N2',
  N1: 'N1',
};

/** 默认英语；若浏览器偏好语言（按其优先级顺序）命中支持项则选中它 */
export function detectNativeLang(): NativeLang {
  const prefs = (
    (typeof navigator !== 'undefined' && navigator.languages?.length
      ? navigator.languages
      : [typeof navigator !== 'undefined' ? navigator.language : 'en']) ?? ['en']
  ).map((l) => (l || '').toLowerCase());
  for (const pref of prefs) {
    // 中文按繁简区分：含 hant 或港澳台地区码归繁体，其余归简体
    if (pref.startsWith('zh')) {
      return /hant|tw|hk|mo/.test(pref) ? 'zh-TW' : 'zh-CN';
    }
    const base = pref.split('-')[0];
    const hit = NATIVE_LANGS.find((l) => l === base);
    if (hit) return hit;
  }
  return 'en';
}

export function makeDefaults(): AppSettings {
  return {
    nativeLang: detectNativeLang(),
    jlptLevel: 'entry',
    autoRecord: true,
    model: { baseURL: '', apiKey: '', model: '' },
  };
}

function asNativeLang(v: unknown, fallback: NativeLang): NativeLang {
  return typeof v === 'string' && (NATIVE_LANGS as string[]).includes(v)
    ? (v as NativeLang)
    : fallback;
}

function asJlptLevel(v: unknown): JlptLevel {
  // 非法值（含旧版本的 null）一律回落入门
  return typeof v === 'string' && (JLPT_LEVELS as string[]).includes(v) ? (v as JlptLevel) : 'entry';
}

/** 补齐缺省字段并校验，非法值回落默认 */
export function withDefaults(raw: unknown): AppSettings {
  const d = makeDefaults();
  const s = (raw ?? {}) as Record<string, unknown>;
  const model = (s.model ?? {}) as Record<string, unknown>;
  return {
    nativeLang: asNativeLang(s.nativeLang, d.nativeLang),
    jlptLevel: asJlptLevel(s.jlptLevel),
    autoRecord: typeof s.autoRecord === 'boolean' ? s.autoRecord : d.autoRecord,
    model: {
      baseURL: typeof model.baseURL === 'string' ? model.baseURL : '',
      apiKey: typeof model.apiKey === 'string' ? model.apiKey : '',
      model: typeof model.model === 'string' ? model.model : '',
    },
  };
}

export async function loadSettings(): Promise<AppSettings> {
  const obj = await chrome.storage.local.get(STORAGE_KEY);
  return withDefaults(obj[STORAGE_KEY]);
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: settings });
}

/** 监听设置变更（跨扩展页面同步用），返回取消监听函数 */
export function onSettingsChanged(cb: (settings: AppSettings) => void): () => void {
  const listener = (
    changes: Record<string, chrome.storage.StorageChange>,
    area: string,
  ): void => {
    if (area === 'local' && changes[STORAGE_KEY]) {
      cb(withDefaults(changes[STORAGE_KEY].newValue));
    }
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}
