// 基于 kuromoji 的本地假名标注：分词 → 生成可渲染为 ruby 的片段。
// 词典从扩展内加载（dicPath 由调用方用 chrome.runtime.getURL('assets/dict') 传入）。
import kuromoji, { type IpadicFeatures, type Tokenizer } from '@sglkc/kuromoji';

// 汉字（含 CJK 扩展 A 与「々」重复符号）
const KANJI_RE = /[々一-龯㐀-䶿]/;

/**
 * furigana 片段：reading 为空表示纯文本（不加 ruby），
 * 非空表示 surface 上方标注 reading（平假名）。
 */
export interface FuriganaSegment {
  surface: string;
  reading?: string;
}

let tokenizerPromise: Promise<Tokenizer<IpadicFeatures>> | null = null;

/** 懒加载并缓存 tokenizer 单例（词典加载/构建仅一次） */
export function initTokenizer(dicPath: string): Promise<Tokenizer<IpadicFeatures>> {
  if (!tokenizerPromise) {
    tokenizerPromise = new Promise((resolve, reject) => {
      kuromoji.builder({ dicPath }).build((err, tokenizer) => {
        if (err) reject(err instanceof Error ? err : new Error(String(err)));
        else resolve(tokenizer);
      });
    });
  }
  return tokenizerPromise;
}

/** 片假名转平假名 */
function kataToHira(s: string): string {
  return s.replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60));
}

/**
 * 将单个词切成片段：把与读音一致的首尾送假名(kana)剥离，
 * 使 ruby 只覆盖汉字核心（如 食べる → 食[た]べる 而非 食べる[たべる]）。
 */
function tokenToSegments(surface: string, readingKata?: string): FuriganaSegment[] {
  if (!KANJI_RE.test(surface) || !readingKata || readingKata === '*') {
    return [{ surface }];
  }
  const reading = kataToHira(readingKata);
  const surfHira = kataToHira(surface); // 便于与读音比较

  let start = 0;
  while (
    start < surface.length &&
    start < reading.length &&
    !KANJI_RE.test(surface[start]) &&
    surfHira[start] === reading[start]
  ) {
    start++;
  }

  let endS = surface.length;
  let endR = reading.length;
  while (
    endS > start &&
    endR > start &&
    !KANJI_RE.test(surface[endS - 1]) &&
    surfHira[endS - 1] === reading[endR - 1]
  ) {
    endS--;
    endR--;
  }

  const pre = surface.slice(0, start);
  const core = surface.slice(start, endS);
  const post = surface.slice(endS);
  const coreReading = reading.slice(start, endR);

  const segments: FuriganaSegment[] = [];
  if (pre) segments.push({ surface: pre });
  if (core) {
    segments.push(coreReading ? { surface: core, reading: coreReading } : { surface: core });
  }
  if (post) segments.push({ surface: post });
  return segments;
}

/** 对一段日语分词并生成 furigana 片段序列 */
export function toFuriganaSegments(
  tokenizer: Tokenizer<IpadicFeatures>,
  text: string,
): FuriganaSegment[] {
  const tokens = tokenizer.tokenize(text);
  return tokens.flatMap((t) => tokenToSegments(t.surface_form, t.reading));
}
