// 复习卡片 + AI 分析结果缓存（IndexedDB，经 idb 封装）。
// 注意：必须在扩展 origin（service worker / options / popup）中调用；
// content script 的 IndexedDB 属于宿主页 origin，不能用来存这些数据。
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Analysis, Card, JlptLevel, NativeLang } from './types';
import { normalizeContent } from './text';

const DB_NAME = 'jp-learner';
const DB_VERSION = 2;
const CARDS = 'cards';
const CACHE = 'analysisCache';

interface CacheEntry {
  key: string;
  analysis: Analysis;
  createdAt: number;
}

interface CardsDB extends DBSchema {
  cards: {
    key: string;
    value: Card;
    indexes: { 'by-createdAt': number };
  };
  analysisCache: {
    key: string;
    value: CacheEntry;
  };
}

let dbPromise: Promise<IDBPDatabase<CardsDB>> | null = null;

function getDb(): Promise<IDBPDatabase<CardsDB>> {
  if (!dbPromise) {
    dbPromise = openDB<CardsDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const store = db.createObjectStore(CARDS, { keyPath: 'id' });
          store.createIndex('by-createdAt', 'createdAt');
        }
        if (oldVersion < 2) {
          db.createObjectStore(CACHE, { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
}

// —— 复习卡片 ——

export async function addCard(card: Card): Promise<void> {
  const db = await getDb();
  await db.put(CARDS, card);
}

/** 按创建时间倒序（最新在前）返回全部卡片 */
export async function getAllCards(): Promise<Card[]> {
  const db = await getDb();
  const cards = await db.getAllFromIndex(CARDS, 'by-createdAt');
  return cards.reverse();
}

export async function deleteCard(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(CARDS, id);
}

export async function clearCards(): Promise<void> {
  const db = await getDb();
  await db.clear(CARDS);
}

export async function updateCardAnalysis(id: string, analysis: Analysis): Promise<void> {
  const db = await getDb();
  const card = await db.get(CARDS, id);
  if (card) {
    card.analysis = analysis;
    await db.put(CARDS, card);
  }
}

/** 查找与给定内容（原文 + 等级 + 母语）匹配的卡片 id，用于判断"是否已记录" */
export async function findCardIdByContent(
  text: string,
  jlptLevel: JlptLevel,
  nativeLang: NativeLang,
): Promise<string | null> {
  const db = await getDb();
  const all = await db.getAll(CARDS);
  const norm = normalizeContent(text);
  const hit = all.find(
    (c) =>
      normalizeContent(c.text) === norm &&
      c.jlptLevel === jlptLevel &&
      c.nativeLang === nativeLang,
  );
  return hit ? hit.id : null;
}

// —— AI 分析结果缓存（同一内容复用，避免重复调用 AI） ——

export async function getCachedAnalysis(key: string): Promise<Analysis | null> {
  const db = await getDb();
  const rec = await db.get(CACHE, key);
  return rec ? rec.analysis : null;
}

export async function putCachedAnalysis(key: string, analysis: Analysis): Promise<void> {
  const db = await getDb();
  await db.put(CACHE, { key, analysis, createdAt: Date.now() });
}
