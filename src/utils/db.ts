import { openDB, DBSchema, IDBPDatabase } from 'idb';
export function isQuotaExceededError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const error = err as Record<string, any>;
  return (
    error.name === 'QuotaExceededError' ||
    error.code === 22 ||
    error.number === -2147024882 ||
    error.name === 'NS_ERROR_DOM_QUOTA_REACHED'
  );
}

import {
  Transaction,
  Category,
  Budget,
  EmergencyFund,
  Investment,
  DreamGoal,
  AISettings,
  AIHealthReport,
  Contact,
  SettlementRecord,
  TombstoneRecord,
  SyncableStoreName,
  RecurringPayment,
  RecurringPaymentLog,
  GamificationState,
} from '../types/finance';

export interface UserPreferences {
  id: string; // 'general'
  darkMode: boolean;
  notRecurringTxIds: string[]; // Set of transaction IDs marked as not recurring
  updatedAt?: string;
}

export interface DhanVedaDBSchema extends DBSchema {
  transactions: {
    key: string;
    value: Transaction;
    indexes: {
      'by-date': string;
      'by-category': string;
      'by-type': string;
    };
  };
  categories: {
    key: string;
    value: Category;
  };
  budgets: {
    key: string;
    value: Budget;
  };
  emergencyFund: {
    key: string;
    value: EmergencyFund & { id: string };
  };
  investments: {
    key: string;
    value: Investment;
  };
  dreams: {
    key: string;
    value: DreamGoal;
  };
  aiSettings: {
    key: string;
    value: AISettings & { id: string };
  };
  aiReports: {
    key: string;
    value: AIHealthReport;
  };
  userPreferences: {
    key: string;
    value: UserPreferences;
  };
  contacts: {
    key: string;
    value: Contact;
  };
  settlements: {
    key: string;
    value: SettlementRecord;
    indexes: {
      'by-contactId': string;
      'by-date': string;
    };
  };
  tombstones: {
    key: string;
    value: TombstoneRecord & { compositeId?: string };
    indexes: {
      'by-store': string;
      'by-deletedAt': string;
    };
  };
  recurringPayments: {
    key: string;
    value: RecurringPayment;
  };
  recurringPaymentLogs: {
    key: string;
    value: RecurringPaymentLog;
    indexes: {
      'by-recurringPaymentId': string;
      'by-dueDate': string;
    };
  };
  gamification: {
    key: string;
    value: GamificationState & { id: string };
  };
}

const DB_NAME = 'dhanveda_db';
const DB_VERSION = 6;

let dbPromise: Promise<IDBPDatabase<DhanVedaDBSchema>> | null = null;
let cachedDB: IDBPDatabase<DhanVedaDBSchema> | null = null;

export function getCachedDB(): IDBPDatabase<DhanVedaDBSchema> | null {
  return cachedDB;
}

export function getDB(): Promise<IDBPDatabase<DhanVedaDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<DhanVedaDBSchema>(DB_NAME, DB_VERSION, {
      terminated() {
        console.error('[DB] IndexedDB connection terminated abnormally');
        dbPromise = null;
        cachedDB = null;
      },
      upgrade(db, oldVersion) {
        // Transactions store
        if (!db.objectStoreNames.contains('transactions')) {
          const txStore = db.createObjectStore('transactions', { keyPath: 'id' });
          txStore.createIndex('by-date', 'date');
          txStore.createIndex('by-category', 'category');
          txStore.createIndex('by-type', 'type');
        }

        // Categories store
        if (!db.objectStoreNames.contains('categories')) {
          db.createObjectStore('categories', { keyPath: 'id' });
        }

        // Budgets store
        if (!db.objectStoreNames.contains('budgets')) {
          db.createObjectStore('budgets', { keyPath: 'id' });
        }

        // Emergency fund store (single record with id: 'current')
        if (!db.objectStoreNames.contains('emergencyFund')) {
          db.createObjectStore('emergencyFund', { keyPath: 'id' });
        }

        // Investments store
        if (!db.objectStoreNames.contains('investments')) {
          db.createObjectStore('investments', { keyPath: 'id' });
        }

        // Dreams / Goals store
        if (!db.objectStoreNames.contains('dreams')) {
          db.createObjectStore('dreams', { keyPath: 'id' });
        }

        // AI Settings store (single record with id: 'current')
        if (!db.objectStoreNames.contains('aiSettings')) {
          db.createObjectStore('aiSettings', { keyPath: 'id' });
        }

        // AI Reports history store
        if (!db.objectStoreNames.contains('aiReports')) {
          db.createObjectStore('aiReports', { keyPath: 'id' });
        }

        // User preferences store
        if (!db.objectStoreNames.contains('userPreferences')) {
          db.createObjectStore('userPreferences', { keyPath: 'id' });
        }

        // Contacts store
        if (!db.objectStoreNames.contains('contacts')) {
          db.createObjectStore('contacts', { keyPath: 'id' });
        }

        // Settlements store
        if (!db.objectStoreNames.contains('settlements')) {
          const setStore = db.createObjectStore('settlements', { keyPath: 'id' });
          setStore.createIndex('by-contactId', 'contactId');
          setStore.createIndex('by-date', 'date');
        }

        // Tombstones store (version 6 uses compositeId: `${store}:${id}`)
        if (oldVersion < 6 && db.objectStoreNames.contains('tombstones')) {
          db.deleteObjectStore('tombstones');
        }
        if (!db.objectStoreNames.contains('tombstones')) {
          const tombStore = db.createObjectStore('tombstones', { keyPath: 'compositeId' });
          tombStore.createIndex('by-store', 'store');
          tombStore.createIndex('by-deletedAt', 'deletedAt');
        }

        // Recurring payments store (version 4)
        if (!db.objectStoreNames.contains('recurringPayments')) {
          db.createObjectStore('recurringPayments', { keyPath: 'id' });
        }

        // Recurring payment logs store (version 4)
        if (!db.objectStoreNames.contains('recurringPaymentLogs')) {
          const logStore = db.createObjectStore('recurringPaymentLogs', { keyPath: 'id' });
          logStore.createIndex('by-recurringPaymentId', 'recurringPaymentId');
          logStore.createIndex('by-dueDate', 'dueDate');
        }

        // Gamification store (version 5)
        if (!db.objectStoreNames.contains('gamification')) {
          db.createObjectStore('gamification', { keyPath: 'id' });
        }
      },
    })
      .then(db => {
        cachedDB = db;
        return db;
      })
      .catch(err => {
        dbPromise = null;
        cachedDB = null;
        throw err;
      });
  }
  return dbPromise;
}

/**
 * Lossless one-time migration from localStorage (v2 and v1 prefixes) to IndexedDB
 */
export async function migrateFromLocalStorage(): Promise<boolean> {
  try {
    const db = await getDB();
    const prefixes = ['dhanveda_finances_v2_', 'dhanveda_finances_v1_'];
    let migratedCount = 0;

    for (const prefix of prefixes) {
      // 1. Transactions
      const txKey = `${prefix}transactions`;
      const rawTx = localStorage.getItem(txKey);
      if (rawTx) {
        try {
          const parsed = JSON.parse(rawTx);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const tx = db.transaction('transactions', 'readwrite');
            for (const item of parsed) {
              if (item && item.id) {
                await tx.store.put(item);
              }
            }
            await tx.done;
          }
          localStorage.removeItem(txKey);
          migratedCount++;
        } catch (e) {
          console.error(`[DB Migration] Failed parsing ${txKey}:`, e);
        }
      }

      // 2. Categories
      const catKey = `${prefix}categories`;
      const rawCat = localStorage.getItem(catKey);
      if (rawCat) {
        try {
          const parsed = JSON.parse(rawCat);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const tx = db.transaction('categories', 'readwrite');
            for (const item of parsed) {
              if (item && item.id) {
                await tx.store.put(item);
              }
            }
            await tx.done;
          }
          localStorage.removeItem(catKey);
          migratedCount++;
        } catch (e) {
          console.error(`[DB Migration] Failed parsing ${catKey}:`, e);
        }
      }

      // 3. Budgets
      const bKey = `${prefix}budgets`;
      const rawBudgets = localStorage.getItem(bKey);
      if (rawBudgets) {
        try {
          const parsed = JSON.parse(rawBudgets);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const tx = db.transaction('budgets', 'readwrite');
            for (const item of parsed) {
              if (item && item.id) {
                await tx.store.put(item);
              }
            }
            await tx.done;
          }
          localStorage.removeItem(bKey);
          migratedCount++;
        } catch (e) {
          console.error(`[DB Migration] Failed parsing ${bKey}:`, e);
        }
      }

      // 4. Emergency Fund
      const emKey = `${prefix}emergency_fund`;
      const rawEm = localStorage.getItem(emKey);
      if (rawEm) {
        try {
          const parsed = JSON.parse(rawEm);
          if (parsed && typeof parsed === 'object') {
            await db.put('emergencyFund', { ...parsed, id: 'current' });
          }
          localStorage.removeItem(emKey);
          migratedCount++;
        } catch (e) {
          console.error(`[DB Migration] Failed parsing ${emKey}:`, e);
        }
      }

      // 5. Investments
      const invKey = `${prefix}investments`;
      const rawInv = localStorage.getItem(invKey);
      if (rawInv) {
        try {
          const parsed = JSON.parse(rawInv);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const tx = db.transaction('investments', 'readwrite');
            for (const item of parsed) {
              if (item && item.id) {
                await tx.store.put(item);
              }
            }
            await tx.done;
          }
          localStorage.removeItem(invKey);
          migratedCount++;
        } catch (e) {
          console.error(`[DB Migration] Failed parsing ${invKey}:`, e);
        }
      }

      // 6. Dreams
      const dreamKey = `${prefix}dreams`;
      const rawDreams = localStorage.getItem(dreamKey);
      if (rawDreams) {
        try {
          const parsed = JSON.parse(rawDreams);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const tx = db.transaction('dreams', 'readwrite');
            for (const item of parsed) {
              if (item && item.id) {
                await tx.store.put(item);
              }
            }
            await tx.done;
          }
          localStorage.removeItem(dreamKey);
          migratedCount++;
        } catch (e) {
          console.error(`[DB Migration] Failed parsing ${dreamKey}:`, e);
        }
      }

      // 7. AI Settings
      const aiSetKey = `${prefix}ai_settings`;
      const rawAISet = localStorage.getItem(aiSetKey);
      if (rawAISet) {
        try {
          const parsed = JSON.parse(rawAISet);
          if (parsed && typeof parsed === 'object') {
            await db.put('aiSettings', { ...parsed, id: 'current' });
          }
          localStorage.removeItem(aiSetKey);
          migratedCount++;
        } catch (e) {
          console.error(`[DB Migration] Failed parsing ${aiSetKey}:`, e);
        }
      }

      // 8. AI Reports
      const aiRepKey = `${prefix}ai_reports`;
      const rawAIRep = localStorage.getItem(aiRepKey);
      if (rawAIRep) {
        try {
          const parsed = JSON.parse(rawAIRep);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const tx = db.transaction('aiReports', 'readwrite');
            for (const item of parsed) {
              if (item && item.id) {
                await tx.store.put(item);
              }
            }
            await tx.done;
          }
          localStorage.removeItem(aiRepKey);
          migratedCount++;
        } catch (e) {
          console.error(`[DB Migration] Failed parsing ${aiRepKey}:`, e);
        }
      }

      // 9. Dark Mode Preference
      const darkKey = `${prefix}dark_mode`;
      const rawDark = localStorage.getItem(darkKey);
      if (rawDark !== null) {
        try {
          const isDark = JSON.parse(rawDark);
          const currentPrefs = (await db.get('userPreferences', 'general')) || {
            id: 'general',
            darkMode: Boolean(isDark),
            notRecurringTxIds: [],
          };
          await db.put('userPreferences', { ...currentPrefs, darkMode: Boolean(isDark) });
          localStorage.removeItem(darkKey);
          migratedCount++;
        } catch (e) {
          console.error(`[DB Migration] Failed parsing ${darkKey}:`, e);
        }
      }
    }

    // Also run split data normalization
    await normalizeSplitData();

    return migratedCount > 0;
  } catch (error) {
    console.error('[DB Migration] Overall migration encountered error:', error);
    return false;
  }
}

export async function normalizeSplitData(): Promise<void> {
  try {
    const db = await getDB();
    const txStore = db.transaction('transactions', 'readwrite');
    const allTxs = await txStore.store.getAll();

    const txToSplitEntryIdMap = new Map<string, string>();

    for (const tx of allTxs) {
      if (tx.splitWith && !Array.isArray(tx.splitWith) && typeof tx.splitWith === 'object') {
        const oldSplit = tx.splitWith as any;
        const splitId = oldSplit.id || `split-${tx.id}-1`;
        tx.splitWith = [{
          id: splitId,
          contactId: oldSplit.contactId,
          label: oldSplit.label,
          amount: oldSplit.amount,
          direction: oldSplit.direction || 'they_owe_me',
          settled: Boolean(oldSplit.settled),
        }];
        txToSplitEntryIdMap.set(tx.id, splitId);
        await txStore.store.put(tx);
      } else if (Array.isArray(tx.splitWith) && tx.splitWith.length > 0) {
        if (tx.splitWith[0]?.id) {
          txToSplitEntryIdMap.set(tx.id, tx.splitWith[0].id);
        }
      }
    }
    await txStore.done;

    const setStore = db.transaction('settlements', 'readwrite');
    const allSets = await setStore.store.getAll();
    for (const s of allSets) {
      if (s.sourceTransactionId && !s.sourceSplitEntryId) {
        const mappedSplitId = txToSplitEntryIdMap.get(s.sourceTransactionId);
        if (mappedSplitId) {
          s.sourceSplitEntryId = mappedSplitId;
          await setStore.store.put(s);
        }
      }
    }
    await setStore.done;
  } catch (e) {
    console.error('[DB Migration] normalizeSplitData error:', e);
  }
}

// Storage helpers
export async function getAllFromStore<T>(
  storeName: 'transactions' | 'categories' | 'budgets' | 'investments' | 'dreams' | 'aiReports' | 'contacts' | 'settlements' | 'recurringPayments' | 'recurringPaymentLogs'
): Promise<T[]> {
  const db = await getDB();
  return (await db.getAll(storeName)) as T[];
}

export type ArrayStoreName =
  | 'transactions'
  | 'categories'
  | 'budgets'
  | 'investments'
  | 'dreams'
  | 'aiReports'
  | 'contacts'
  | 'settlements'
  | 'recurringPayments'
  | 'recurringPaymentLogs';

export async function saveAllToStore<T extends { id: string }>(
  storeName: ArrayStoreName,
  items: T[]
): Promise<void> {
  if (!Array.isArray(items)) return;
  const validItems = items.filter(item => item && typeof item.id === 'string' && item.id.length > 0);
  try {
    const db = await getDB();
    const tx = db.transaction(storeName, 'readwrite');
    await tx.store.clear();
    for (const item of validItems) {
      await tx.store.put(item as any);
    }
    await tx.done;
  } catch (err) {
    if (isQuotaExceededError(err)) {
      console.error(`[DB] Storage quota exceeded while saving to "${storeName}":`, err);
    } else {
      console.error(`[DB] Error saving to "${storeName}":`, err);
    }
    throw err;
  }
}

function hasItemChanged(a: any, b: any): boolean {
  if (a === b) return false;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return true;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return true;
  for (const key of keysA) {
    const valA = a[key];
    const valB = b[key];
    if (valA === valB) continue;
    if (typeof valA === 'object' && valA !== null && typeof valB === 'object' && valB !== null) {
      if (JSON.stringify(valA) !== JSON.stringify(valB)) return true;
    } else {
      return true;
    }
  }
  return false;
}

export async function persistDiff<T extends { id: string }>(
  storeName: ArrayStoreName,
  prevItems: T[],
  nextItems: T[]
): Promise<boolean> {
  const prev = Array.isArray(prevItems) ? prevItems : [];
  const next = Array.isArray(nextItems) ? nextItems : [];

  const prevMap = new Map<string, T>();
  for (const item of prev) {
    if (item && typeof item.id === 'string' && item.id.length > 0) {
      prevMap.set(item.id, item);
    }
  }

  const nextMap = new Map<string, T>();
  for (const item of next) {
    if (item && typeof item.id === 'string' && item.id.length > 0) {
      nextMap.set(item.id, item);
    }
  }

  const toDelete: string[] = [];
  for (const [id] of prevMap) {
    if (!nextMap.has(id)) {
      toDelete.push(id);
    }
  }

  const toPut: T[] = [];
  for (const [id, nextItem] of nextMap) {
    const prevItem = prevMap.get(id);
    if (!prevItem) {
      toPut.push(nextItem);
    } else if (prevItem !== nextItem && hasItemChanged(prevItem, nextItem)) {
      toPut.push(nextItem);
    }
  }

  if (toDelete.length === 0 && toPut.length === 0) {
    return false;
  }

  try {
    const db = await getDB();
    const tx = db.transaction(storeName, 'readwrite');
    for (const id of toDelete) {
      await tx.store.delete(id);
    }
    for (const item of toPut) {
      await tx.store.put(item as any);
    }
    await tx.done;
    return true;
  } catch (err) {
    if (isQuotaExceededError(err)) {
      console.error(`[DB] Storage quota exceeded while persisting diff to "${storeName}":`, err);
    } else {
      console.error(`[DB] Error persisting diff to "${storeName}":`, err);
    }
    throw err;
  }
}

export function persistDiffSync<T extends { id: string }>(
  db: IDBPDatabase<DhanVedaDBSchema>,
  storeName: ArrayStoreName,
  prevItems: T[],
  nextItems: T[]
): void {
  const prev = Array.isArray(prevItems) ? prevItems : [];
  const next = Array.isArray(nextItems) ? nextItems : [];

  const prevMap = new Map<string, T>();
  for (const item of prev) {
    if (item && typeof item.id === 'string' && item.id.length > 0) {
      prevMap.set(item.id, item);
    }
  }

  const nextMap = new Map<string, T>();
  for (const item of next) {
    if (item && typeof item.id === 'string' && item.id.length > 0) {
      nextMap.set(item.id, item);
    }
  }

  const toDelete: string[] = [];
  for (const [id] of prevMap) {
    if (!nextMap.has(id)) {
      toDelete.push(id);
    }
  }

  const toPut: T[] = [];
  for (const [id, nextItem] of nextMap) {
    const prevItem = prevMap.get(id);
    if (!prevItem) {
      toPut.push(nextItem);
    } else if (prevItem !== nextItem && hasItemChanged(prevItem, nextItem)) {
      toPut.push(nextItem);
    }
  }

  if (toDelete.length === 0 && toPut.length === 0) {
    return;
  }

  try {
    const tx = db.transaction(storeName, 'readwrite');
    for (const id of toDelete) {
      tx.store.delete(id);
    }
    for (const item of toPut) {
      tx.store.put(item as any);
    }
  } catch (err) {
    console.error(`[DB] Error in persistDiffSync for "${storeName}":`, err);
  }
}


export async function getSingleRecord<T>(
  storeName: 'emergencyFund' | 'aiSettings' | 'userPreferences' | 'gamification',
  id = 'current'
): Promise<T | undefined> {
  const db = await getDB();
  return (await db.get(storeName, id)) as T | undefined;
}

export async function saveSingleRecord<T extends { id: string }>(
  storeName: 'emergencyFund' | 'aiSettings' | 'userPreferences' | 'gamification',
  data: T
): Promise<void> {
  try {
    const db = await getDB();
    await db.put(storeName, data as any);
  } catch (err) {
    if (isQuotaExceededError(err)) {
      console.error(`[DB] Storage quota exceeded while saving "${storeName}":`, err);
    } else {
      console.error(`[DB] Error saving "${storeName}":`, err);
    }
    throw err;
  }
}

export async function getGamificationState(): Promise<GamificationState | null> {
  const record = await getSingleRecord<GamificationState & { id: string }>('gamification', 'current');
  return record || null;
}

export async function saveGamificationState(state: GamificationState): Promise<void> {
  return saveSingleRecord('gamification', { ...state, id: 'current' });
}

export async function clearAllStores(): Promise<void> {
  const db = await getDB();
  await Promise.all([
    db.clear('transactions'),
    db.clear('categories'),
    db.clear('budgets'),
    db.clear('investments'),
    db.clear('dreams'),
    db.clear('aiReports'),
    db.clear('aiSettings'),
    db.clear('userPreferences'),
    db.clear('contacts'),
    db.clear('settlements'),
    db.clear('recurringPayments'),
    db.clear('recurringPaymentLogs'),
    db.clear('gamification'),
    db.clear('tombstones'),
    db.put('emergencyFund', {
      id: 'current',
      targetMonths: 6,
      monthlyExpenseBaseline: 50000,
      currentSaved: 0,
      contributions: [],
    }),
  ]);
}

/**
 * Record a tombstone when a record is deleted so the deletion propagates across devices during sync.
 */
export async function addTombstone(store: SyncableStoreName, id: string): Promise<void> {
  try {
    if (typeof localStorage !== 'undefined' && localStorage.getItem('dhanveda_drive_sync_enabled') !== 'true') {
      return;
    }
    const db = await getDB();
    const tombstone: TombstoneRecord & { compositeId: string } = {
      compositeId: `${store}:${id}`,
      id,
      store,
      deletedAt: new Date().toISOString(),
    };
    await db.put('tombstones', tombstone as any);
  } catch (err) {
    console.error('[DB] Error recording tombstone:', err);
  }
}

/**
 * Remove tombstones from IndexedDB when a deletion is undone.
 */
export async function removeTombstones(
  keys: Array<{ store: SyncableStoreName; id: string } | string>
): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction('tombstones', 'readwrite');
    for (const item of keys) {
      if (typeof item === 'string') {
        if (item.includes(':')) {
          await tx.store.delete(item);
        } else {
          const candidateStores: SyncableStoreName[] = ['transactions', 'settlements'];
          for (const s of candidateStores) {
            await tx.store.delete(`${s}:${item}`);
          }
        }
      } else if (item && item.store && item.id) {
        await tx.store.delete(`${item.store}:${item.id}`);
      }
    }
    await tx.done;
  } catch (err) {
    console.error('[DB] Error removing tombstones:', err);
  }
}


/**
 * Get all active tombstones from IndexedDB.
 */
export async function getTombstones(): Promise<TombstoneRecord[]> {
  try {
    const db = await getDB();
    return await db.getAll('tombstones');
  } catch (err) {
    console.error('[DB] Error getting tombstones:', err);
    return [];
  }
}

/**
 * Save merged tombstones to IndexedDB.
 */
export async function saveTombstones(records: TombstoneRecord[]): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction('tombstones', 'readwrite');
    for (const record of records) {
      if (record && record.id && record.store) {
        const item = {
          ...record,
          compositeId: `${record.store}:${record.id}`,
        };
        await tx.store.put(item as any);
      }
    }
    await tx.done;
  } catch (err) {
    console.error('[DB] Error saving tombstones:', err);
  }
}

/**
 * Purge tombstones older than the retention window (defaults to 90 days).
 */
export async function purgeOldTombstones(retentionDays = 90): Promise<void> {
  try {
    const db = await getDB();
    const cutoffTime = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
    const allTombstones = await db.getAll('tombstones');
    const tx = db.transaction('tombstones', 'readwrite');
    for (const t of allTombstones) {
      if (t.deletedAt < cutoffTime) {
        const key = (t as any).compositeId || `${t.store}:${t.id}`;
        await tx.store.delete(key);
      }
    }
    await tx.done;
  } catch (err) {
    console.error('[DB] Error purging old tombstones:', err);
  }
}

/**
 * Generates and returns a persistent unique Device ID for this client installation.
 * Used for deterministic tie-breaking in Last-Write-Wins merge.
 */
export function getDeviceId(): string {
  const STORAGE_KEY = 'dhanveda_device_id';
  let deviceId = localStorage.getItem(STORAGE_KEY);
  if (!deviceId) {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      deviceId = crypto.randomUUID();
    } else {
      deviceId = 'dev-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 9);
    }
    localStorage.setItem(STORAGE_KEY, deviceId);
  }
  return deviceId;
}

