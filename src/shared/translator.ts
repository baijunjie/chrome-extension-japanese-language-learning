// Chrome 内置端上翻译 API（Translator）的最小封装：日语 → 用户母语。
// 端上运行、免费、离线（首次下载语言包）；不可用时返回 null（降级：不显示速译）。
import type { NativeLang } from './types';

interface BuiltinTranslator {
  translate(text: string): Promise<string>;
}
interface BuiltinTranslatorStatic {
  availability(o: { sourceLanguage: string; targetLanguage: string }): Promise<string>;
  create(o: { sourceLanguage: string; targetLanguage: string }): Promise<BuiltinTranslator>;
}

// 本项目 NativeLang → Chrome Translator 语言码。中文需转换：zh-CN→zh、zh-TW→zh-Hant。
const TARGET_CODE: Partial<Record<NativeLang, string>> = {
  'zh-CN': 'zh',
  'zh-TW': 'zh-Hant',
};
function targetCode(l: NativeLang): string {
  return TARGET_CODE[l] ?? l;
}

function api(): BuiltinTranslatorStatic | null {
  const g = globalThis as unknown as { Translator?: BuiltinTranslatorStatic };
  return g.Translator ?? null;
}

export function builtinTranslatorSupported(): boolean {
  return api() !== null;
}

// 按目标语言缓存 translator 实例
const cache = new Map<string, Promise<BuiltinTranslator>>();

export async function translateJaTo(text: string, native: NativeLang): Promise<string | null> {
  const Tr = api();
  if (!Tr || !text.trim()) return null;
  const target = targetCode(native);
  try {
    const avail = await Tr.availability({ sourceLanguage: 'ja', targetLanguage: target });
    if (avail === 'unavailable') return null;
    let p = cache.get(target);
    if (!p) {
      p = Tr.create({ sourceLanguage: 'ja', targetLanguage: target });
      cache.set(target, p);
    }
    const translator = await p;
    return await translator.translate(text);
  } catch {
    cache.delete(target); // 失败（如需用户激活下载）时清缓存，下次重试
    return null;
  }
}
