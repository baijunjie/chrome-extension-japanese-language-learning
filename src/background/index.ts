// Service Worker：接收 content script 的消息，调用 AI 分析、缓存结果并按设置存卡；
// 同时注册选区右键菜单，点击后通知对应 frame 的 content script 打开讲解 popup。
import { analyze } from '@shared/ai';
import {
  addCard,
  deleteCard,
  findCardIdByContent,
  getCachedAnalysis,
  putCachedAnalysis,
} from '@shared/storage';
import { loadSettings } from '@shared/settings';
import { contentKey } from '@shared/text';
import type {
  AnalyzeMessage,
  AnalyzeReply,
  ContextMenuTriggerMessage,
  PeekCacheMessage,
  PeekReply,
  RuntimeMessage,
  SaveCardMessage,
  SaveReply,
} from '@shared/messaging';
import type { Analysis, AppSettings, Card } from '@shared/types';

const CONTEXT_MENU_ID = 'jpl-explain-selection';

chrome.runtime.onInstalled.addListener(() => {
  // 先 removeAll 再 create：reload/更新时保证幂等，避免重复 id 报错
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: CONTEXT_MENU_ID,
      // 文案含 %s，Chrome 自动填入截断后的选中文字
      title: chrome.i18n.getMessage('ctxMenuExplain'),
      contexts: ['selection'],
      // 仅在可注入 content script 的页面显示，排除 chrome:// 等
      documentUrlPatterns: ['http://*/*', 'https://*/*', 'file://*/*'],
    });
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== CONTEXT_MENU_ID || !tab?.id) return;
  const msg: ContextMenuTriggerMessage = {
    type: 'contextMenuTrigger',
    selectionText: info.selectionText ?? '',
  };
  // 发给选区所在 frame；旧标签页可能未注入 content script，失败静默
  chrome.tabs.sendMessage(tab.id, msg, { frameId: info.frameId ?? 0 }).catch(() => {});
});

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
    contentKey: contentKey(msg.text, settings.jlptLevel, settings.nativeLang),
    analysis,
  };
}

/** 该内容已有卡片则返回其 id；没有且开启自动记录则补存一张（否则返回 null） */
async function ensureCardSaved(
  msg: { text: string; sourceUrl: string; sourceTitle: string },
  analysis: Analysis,
  settings: AppSettings,
): Promise<string | null> {
  const existing = await findCardIdByContent(msg.text, settings.jlptLevel, settings.nativeLang);
  if (existing) return existing;
  if (!settings.autoRecord) return null;
  const card = makeCard(msg, analysis, settings);
  await addCard(card);
  return card.id;
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

  // 重新分析：先清除该内容的旧复习记录，随后按自动记录设置重新落一张新卡
  if (msg.forceRefresh) {
    const oldId = await findCardIdByContent(msg.text, settings.jlptLevel, settings.nativeLang);
    if (oldId) await deleteCard(oldId);
  }
  const savedCardId = await ensureCardSaved(msg, analysis, settings);
  return { ok: true, analysis, savedCardId };
}

async function handlePeekCache(msg: PeekCacheMessage): Promise<PeekReply> {
  const settings = await loadSettings();
  const key = contentKey(msg.text, settings.jlptLevel, settings.nativeLang);
  const analysis = await getCachedAnalysis(key);
  // 命中缓存时使自动记录同样生效（尚无卡片则补存一张）
  const savedCardId = analysis
    ? await ensureCardSaved(msg, analysis, settings)
    : await findCardIdByContent(msg.text, settings.jlptLevel, settings.nativeLang);
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
