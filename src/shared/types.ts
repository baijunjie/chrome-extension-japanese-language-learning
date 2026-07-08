// 全局共享类型定义。

/** 用户母语（讲解输出语言 + 界面语言）。日语是学习目标，不作为母语。 */
export type NativeLang = 'de' | 'en' | 'es' | 'fr' | 'ko' | 'pt' | 'ru' | 'zh' | 'zh-Hant';

/** 学习等级：entry(入门/零基础，N5 之下) 为最低，N5→N1 递增 */
export type JlptLevel = 'entry' | 'N5' | 'N4' | 'N3' | 'N2' | 'N1';

/** OpenAI 兼容端点配置；baseURL 指向 localhost 即为本地模型 */
export interface ModelConfig {
  baseURL: string;
  apiKey: string;
  model: string;
}

export interface AppSettings {
  nativeLang: NativeLang;
  jlptLevel: JlptLevel;
  /** 是否讲解后自动存卡；false 时 popup 底部显示手动保存按钮 */
  autoRecord: boolean;
  model: ModelConfig;
}

/** 语法点 */
export interface GrammarPoint {
  point: string;
  explanation: string;
  level: string;
}

/** 重点词汇 */
export interface VocabItem {
  word: string;
  reading: string;
  meaning: string;
  pos: string;
}

/** furigana 片段：text 为原文片段，reading 为其假名读音（平假名，纯假名/标点为空串） */
export interface FuriganaPart {
  text: string;
  reading: string;
}

/** AI 分析结果（受 JSON schema 强约束） */
export interface Analysis {
  translation: string;
  grammar_points: GrammarPoint[];
  vocabulary: VocabItem[];
  /** AI 校正后的假名切分（可选）；用于覆盖本地 kuromoji 的读音（修正多音字） */
  furigana?: FuriganaPart[];
  notes?: string;
}

/** 复习卡片（IndexedDB 记录） */
export interface Card {
  id: string;
  createdAt: number;
  sourceUrl: string;
  sourceTitle: string;
  text: string;
  jlptLevel: JlptLevel;
  nativeLang: NativeLang;
  analysis: Analysis;
}
