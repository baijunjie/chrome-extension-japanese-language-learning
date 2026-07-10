// content script ↔ service worker 的消息协议与发送辅助。
// AI 调用、结果缓存与卡片写库都在 SW（扩展 origin）完成；content script 通过消息请求。
import type { Analysis } from './types';

export interface AnalyzeMessage {
  type: 'analyze';
  text: string;
  sourceUrl: string;
  sourceTitle: string;
  /** true 时跳过缓存，强制重新调用 AI（"重新分析"） */
  forceRefresh?: boolean;
}

/** 仅查缓存、不调用 AI：popup 打开时用它判断是否已有分析结果可直接展示 */
export interface PeekCacheMessage {
  type: 'peekCache';
  text: string;
  sourceUrl: string;
  sourceTitle: string;
}

export interface SaveCardMessage {
  type: 'saveCard';
  text: string;
  sourceUrl: string;
  sourceTitle: string;
  analysis: Analysis;
}

export type RuntimeMessage = AnalyzeMessage | PeekCacheMessage | SaveCardMessage;

// 方向与上面相反：service worker → content script。
// 右键菜单点击后，由 SW 通知选区所在 frame 直接打开讲解 popup。
export interface ContextMenuTriggerMessage {
  type: 'contextMenuTrigger';
  /** 菜单触发时的选中文字，仅作实时选区取不到时的兜底 */
  selectionText: string;
}

interface ErrReply {
  ok: false;
  error: string;
}

/** savedCardId 非空表示该内容已在复习记录中 */
export interface AnalyzeOkReply {
  ok: true;
  analysis: Analysis;
  savedCardId: string | null;
}
export type AnalyzeReply = AnalyzeOkReply | ErrReply;

/** analysis 为 null 表示无缓存 */
export interface PeekOkReply {
  ok: true;
  analysis: Analysis | null;
  savedCardId: string | null;
}
export type PeekReply = PeekOkReply | ErrReply;

export interface SaveOkReply {
  ok: true;
  cardId: string;
}
export type SaveReply = SaveOkReply | ErrReply;

export async function requestAnalyze(msg: Omit<AnalyzeMessage, 'type'>): Promise<AnalyzeReply> {
  return chrome.runtime.sendMessage({ type: 'analyze', ...msg } satisfies AnalyzeMessage);
}

export async function requestPeekCache(
  msg: Omit<PeekCacheMessage, 'type'>,
): Promise<PeekReply> {
  return chrome.runtime.sendMessage({ type: 'peekCache', ...msg } satisfies PeekCacheMessage);
}

export async function requestSaveCard(msg: Omit<SaveCardMessage, 'type'>): Promise<SaveReply> {
  return chrome.runtime.sendMessage({ type: 'saveCard', ...msg } satisfies SaveCardMessage);
}
