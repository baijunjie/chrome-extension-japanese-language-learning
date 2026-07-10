// 复习卡片 + AI 分析结果缓存（IndexedDB，经 idb 封装）。
// 注意：必须在扩展 origin（service worker / options / popup）中调用；
// content script 的 IndexedDB 属于宿主页 origin，不能用来存这些数据。
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Analysis, Card, JlptLevel, NativeLang } from './types';
import { contentKey } from './text';

const DB_NAME = 'jp-learner';
const DB_VERSION = 3;
const CARDS = 'cards';
const CACHE = 'analysisCache';

// 分析缓存条数上限：超过按最旧淘汰，防止长期使用无限膨胀
const CACHE_MAX = 500;

interface CacheEntry {
  key: string;
  analysis: Analysis;
  createdAt: number;
}

interface CardsDB extends DBSchema {
  cards: {
    key: string;
    value: Card;
    indexes: { 'by-createdAt': number; 'by-contentKey': string };
  };
  analysisCache: {
    key: string;
    value: CacheEntry;
    indexes: { 'by-createdAt': number };
  };
}

let dbPromise: Promise<IDBPDatabase<CardsDB>> | null = null;

function getDb(): Promise<IDBPDatabase<CardsDB>> {
  if (!dbPromise) {
    dbPromise = openDB<CardsDB>(DB_NAME, DB_VERSION, {
      async upgrade(db, oldVersion, _newVersion, tx) {
        if (oldVersion < 1) {
          const store = db.createObjectStore(CARDS, { keyPath: 'id' });
          store.createIndex('by-createdAt', 'createdAt');
        }
        if (oldVersion < 2) {
          db.createObjectStore(CACHE, { keyPath: 'key' });
        }
        if (oldVersion < 3) {
          // contentKey 索引：把"该内容是否已记录"从全表扫描变成索引查询
          const cards = tx.objectStore(CARDS);
          cards.createIndex('by-contentKey', 'contentKey');
          tx.objectStore(CACHE).createIndex('by-createdAt', 'createdAt');
          // 旧卡片回填 contentKey（新装库无数据，循环直接结束）
          let cursor = await cards.openCursor();
          while (cursor) {
            const card = cursor.value;
            if (!card.contentKey) {
              card.contentKey = contentKey(card.text, card.jlptLevel, card.nativeLang);
              await cursor.update(card);
            }
            cursor = await cursor.continue();
          }
        }
      },
    });
    // 打开/迁移失败不缓存 rejected promise，允许下次调用重试
    dbPromise.catch(() => {
      dbPromise = null;
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

/** 批量删除指定卡片（单事务） */
export async function deleteCards(ids: string[]): Promise<void> {
  if (!ids.length) return;
  const db = await getDb();
  const tx = db.transaction(CARDS, 'readwrite');
  await Promise.all([...ids.map((id) => tx.store.delete(id)), tx.done]);
}

/** 查找与给定内容（原文 + 等级 + 母语）匹配的卡片 id，用于判断"是否已记录" */
export async function findCardIdByContent(
  text: string,
  jlptLevel: JlptLevel,
  nativeLang: NativeLang,
): Promise<string | null> {
  const db = await getDb();
  const id = await db.getKeyFromIndex(
    CARDS,
    'by-contentKey',
    contentKey(text, jlptLevel, nativeLang),
  );
  return id ?? null;
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
  // 超上限时按 createdAt 从最旧开始淘汰
  const excess = (await db.count(CACHE)) - CACHE_MAX;
  if (excess > 0) {
    const tx = db.transaction(CACHE, 'readwrite');
    let cursor = await tx.store.index('by-createdAt').openCursor();
    for (let i = 0; i < excess && cursor; i++) {
      await cursor.delete();
      cursor = await cursor.continue();
    }
    await tx.done;
  }
}
