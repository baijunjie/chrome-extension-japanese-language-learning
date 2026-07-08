// Service Worker：接收 content script 的消息，调用 AI 分析、缓存结果并按设置存卡。
import { analyze } from '@shared/ai';
import {
  addCard,
  findCardIdByContent,
  getCachedAnalysis,
  putCachedAnalysis,
  updateCardAnalysis,
} from '@shared/storage';
import { loadSettings } from '@shared/settings';
import { normalizeContent } from '@shared/text';
import type {
  AnalyzeMessage,
  AnalyzeReply,
  PeekCacheMessage,
  PeekReply,
  RuntimeMessage,
  SaveCardMessage,
  SaveReply,
} from '@shared/messaging';
import type { Analysis, AppSettings, Card, JlptLevel, NativeLang } from '@shared/types';

// 缓存键：归一化内容 + 等级 + 母语（分析结果随这三者变化）。
// 归一化让仅相差首尾标点/空白的选区命中同一缓存。
function contentKey(text: string, level: JlptLevel, lang: NativeLang): string {
  return `${normalizeContent(text)}␟${level}␟${lang}`;
}

function makeCard(
  msg: { text: string; sourceUrl: string; sourceTitle: string },
  analysis: Analysis,
  settings: AppSettings,
): Card {
  return {
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    sourceUrl: msg.sourceUrl,
    sourceTitle: msg.sourceTitle,
    text: msg.text,
    jlptLevel: settings.jlptLevel,
    nativeLang: settings.nativeLang,
    analysis,
  };
}

async function handleAnalyze(msg: AnalyzeMessage): Promise<AnalyzeReply> {
  const settings = await loadSettings();
  const key = contentKey(msg.text, settings.jlptLevel, settings.nativeLang);

  // 非强制刷新时优先复用缓存
  let analysis = msg.forceRefresh ? null : await getCachedAnalysis(key);
  if (!analysis) {
    analysis = await analyze(msg.text, settings);
    await putCachedAnalysis(key, analysis);
  }

  // 保存状态：已有卡片优先；强制重分析时同步更新卡片内容
  let savedCardId = await findCardIdByContent(msg.text, settings.jlptLevel, settings.nativeLang);
  if (savedCardId) {
    if (msg.forceRefresh) await updateCardAnalysis(savedCardId, analysis);
  } else if (settings.autoRecord) {
    const card = makeCard(msg, analysis, settings);
    await addCard(card);
    savedCardId = card.id;
  }

  return { ok: true, analysis, savedCardId };
}

async function handlePeekCache(msg: PeekCacheMessage): Promise<PeekReply> {
  const settings = await loadSettings();
  const key = contentKey(msg.text, settings.jlptLevel, settings.nativeLang);
  const analysis = await getCachedAnalysis(key);
  const savedCardId = await findCardIdByContent(msg.text, settings.jlptLevel, settings.nativeLang);
  return { ok: true, analysis, savedCardId };
}

async function handleSaveCard(msg: SaveCardMessage): Promise<SaveReply> {
  const settings = await loadSettings();
  // 避免同一内容重复保存
  const existing = await findCardIdByContent(msg.text, settings.jlptLevel, settings.nativeLang);
  if (existing) return { ok: true, cardId: existing };
  const card = makeCard(msg, msg.analysis, settings);
  await addCard(card);
  return { ok: true, cardId: card.id };
}

chrome.runtime.onMessage.addListener((msg: RuntimeMessage, _sender, sendResponse) => {
  const run = async (): Promise<AnalyzeReply | PeekReply | SaveReply> => {
    if (msg.type === 'analyze') return handleAnalyze(msg);
    if (msg.type === 'peekCache') return handlePeekCache(msg);
    if (msg.type === 'saveCard') return handleSaveCard(msg);
    return { ok: false, error: '未知消息类型' };
  };
  run()
    .then(sendResponse)
    .catch((e: unknown) =>
      sendResponse({ ok: false, error: e instanceof Error ? e.message : String(e) }),
    );
  // 异步响应：保持消息通道开启
  return true;
});
