/**
 * Google Drive Cross-Device Sync Engine
 * 
 * Synchronizes client data using a single JSON snapshot stored in the private 'appDataFolder'.
 * Conflict resolution: Per-record Last-Write-Wins (LWW) using ISO `updatedAt` timestamps
 * with deterministic `deviceId` tie-breaking and 90-day tombstone tracking for deletions.
 * 
 * SECURITY: aiSettings.apiKey is strictly excluded from Drive snapshots and preserved locally.
 */

import {
  SyncPayload,
  TombstoneRecord,
  Transaction,
  Category,
  Budget,
  Investment,
  DreamGoal,
  Contact,
  SettlementRecord,
  AIHealthReport,
  EmergencyFund,
  EmergencyContribution,
  DreamContribution,
  AISettings,
  SyncableStoreName,
  RecurringPayment,
  RecurringPaymentLog,
} from '../types/finance';
import {
  getAllFromStore,
  saveAllToStore,
  getSingleRecord,
  saveSingleRecord,
  getTombstones,
  saveTombstones,
  purgeOldTombstones,
  getDeviceId,
  UserPreferences,
} from '../utils/db';
import { googleAuthService } from './googleAuth';

const SYNC_FILE_NAME = 'dhanveda-sync.json';
const DRIVE_FILES_URL = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files';

export const CLOCK_SKEW_WINDOW_MS = 3000; // 3 seconds tolerance window for device clock skew

export function compareTimestampsWithSkew(
  timeAStr?: string,
  timeBStr?: string
): { diffMs: number; isSkewTied: boolean } {
  const timeA = new Date(timeAStr || '1970-01-01').getTime();
  const timeB = new Date(timeBStr || '1970-01-01').getTime();
  const validA = !isNaN(timeA) ? timeA : 0;
  const validB = !isNaN(timeB) ? timeB : 0;
  const diffMs = validA - validB;
  const isSkewTied = Math.abs(diffMs) <= CLOCK_SKEW_WINDOW_MS;
  return { diffMs, isSkewTied };
}

export function isRecordDeletedByTombstone(recordTimeStr?: string, tombstone?: TombstoneRecord): boolean {
  if (!tombstone || !tombstone.deletedAt) return false;
  const tombTime = new Date(tombstone.deletedAt).getTime();
  const recTime = new Date(recordTimeStr || '1970-01-01').getTime();
  if (isNaN(tombTime)) return false;
  if (isNaN(recTime)) return true;

  // If tombstone deletedAt is later OR within clock skew tolerance (3s) of record updatedAt,
  // deletion wins to avoid resurrecting deleted records due to device clock skew.
  return tombTime >= (recTime - CLOCK_SKEW_WINDOW_MS);
}

export class DriveSyncService {
  private syncInProgress = false;
  private lastSyncedAt: string | null = null;
  private lastError: string | null = null;
  private cachedFileId: string | null = null;
  private syncListeners: Array<(isSyncing: boolean, lastSyncedAt: string | null, error: string | null) => void> = [];

  constructor() {
    this.lastSyncedAt = localStorage.getItem('dhanveda_last_synced_at');
  }

  public getLastSyncedAt(): string | null {
    return this.lastSyncedAt;
  }

  public getLastError(): string | null {
    return this.lastError;
  }

  public isSyncing(): boolean {
    return this.syncInProgress;
  }

  public subscribe(listener: (isSyncing: boolean, lastSyncedAt: string | null, error: string | null) => void): () => void {
    this.syncListeners.push(listener);
    listener(this.syncInProgress, this.lastSyncedAt, this.lastError);
    return () => {
      this.syncListeners = this.syncListeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.syncListeners.forEach(l => l(this.syncInProgress, this.lastSyncedAt, this.lastError));
  }

  /**
   * Resilient HTTP fetch helper with exponential backoff and finite retries (max 3).
   * Fast-fails immediately on 401/403 or offline state to prevent infinite retry loops.
   */
  private async fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
    const initialDelay = 1000;
    let attempt = 0;

    while (attempt < maxRetries) {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        throw new Error('Device is offline');
      }

      try {
        const res = await fetch(url, options);

        // Fast-fail on auth errors (401 / 403)
        if (res.status === 401) {
          googleAuthService.clearCachedToken();
          throw new Error('Google Drive authorization expired (401). Please re-authenticate.');
        }

        if (res.status === 403) {
          throw new Error('Google Drive permission denied (403).');
        }

        // Retry on 429 (rate limit) or 5xx server errors
        if ((res.status === 429 || res.status >= 500) && attempt < maxRetries - 1) {
          attempt++;
          const backoff = initialDelay * Math.pow(2, attempt - 1) + Math.random() * 200;
          await new Promise(r => setTimeout(r, backoff));
          continue;
        }

        return res;
      } catch (err: any) {
        // Fast-fail without retry on 401, 403, or offline
        if (
          err?.message?.includes('401') ||
          err?.message?.includes('403') ||
          err?.message?.includes('offline') ||
          attempt >= maxRetries - 1
        ) {
          throw err;
        }

        attempt++;
        const backoff = initialDelay * Math.pow(2, attempt - 1) + Math.random() * 200;
        await new Promise(r => setTimeout(r, backoff));
      }
    }

    throw new Error(`Drive request failed after ${maxRetries} attempts.`);
  }

  /**
   * Find existing dhanveda-sync.json in appDataFolder
   */
  public async findSyncFile(token: string): Promise<string | null> {
    if (this.cachedFileId) return this.cachedFileId;

    const query = encodeURIComponent(`name = '${SYNC_FILE_NAME}' and trashed = false`);
    const url = `${DRIVE_FILES_URL}?spaces=appDataFolder&q=${query}&fields=files(id,name,modifiedTime)`;

    const res = await this.fetchWithRetry(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      throw new Error(`Drive search failed with status ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    if (data.files && data.files.length > 0) {
      this.cachedFileId = data.files[0].id;
      return this.cachedFileId;
    }

    return null;
  }

  /**
   * Download remote sync file
   */
  public async downloadSyncFile(fileId: string, token: string): Promise<SyncPayload | null> {
    const res = await this.fetchWithRetry(`${DRIVE_FILES_URL}/${fileId}?alt=media`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.status === 404) return null;

    if (!res.ok) {
      throw new Error(`Drive download failed with status ${res.status}: ${res.statusText}`);
    }

    try {
      const data = await res.json();
      return data as SyncPayload;
    } catch (err) {
      console.warn('[DriveSync] Corrupted or invalid JSON in Drive file:', err);
      return null;
    }
  }

  /**
   * Upload snapshot to Google Drive appDataFolder
   */
  public async uploadSyncFile(payload: SyncPayload, token: string): Promise<string> {
    const fileId = await this.findSyncFile(token);
    const content = JSON.stringify(payload, null, 2);

    if (fileId) {
      // Update existing file
      const res = await this.fetchWithRetry(`${DRIVE_UPLOAD_URL}/${fileId}?uploadType=media`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: content,
      });

      if (!res.ok) {
        throw new Error(`Drive update failed: ${res.statusText}`);
      }

      return fileId;
    } else {
      // Create new file with multipart upload in appDataFolder
      const metadata = {
        name: SYNC_FILE_NAME,
        parents: ['appDataFolder'],
        mimeType: 'application/json',
      };

      const boundary = '-------314159265358979323846';
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelim = `\r\n--${boundary}--`;

      const multipartBody =
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        content +
        closeDelim;

      const res = await this.fetchWithRetry(`${DRIVE_UPLOAD_URL}?uploadType=multipart`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartBody,
      });

      if (!res.ok) {
        throw new Error(`Drive file creation failed: ${res.statusText}`);
      }

      const fileData = await res.json();
      this.cachedFileId = fileData.id;
      return fileData.id;
    }
  }

  /**
   * Main synchronization procedure:
   * 1. Get authenticated Google Drive access token
   * 2. Download remote snapshot (if exists)
   * 3. Merge local and remote stores with per-record LWW + deterministic deviceId tiebreaker + tombstones
   * 4. Save merged data to local IndexedDB
   * 5. Upload merged snapshot back to Drive
   */
  public async sync(): Promise<boolean> {
    if (this.syncInProgress) return false;

    // Check offline status
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.lastError = 'Offline — sync will resume once reconnected';
      this.notify();
      return false;
    }

    const token = await googleAuthService.getValidAccessToken();
    if (!token) {
      this.lastError = 'Google Drive not connected';
      this.notify();
      return false;
    }

    this.syncInProgress = true;
    this.lastError = null;
    this.notify();

    try {
      const localDeviceId = getDeviceId();
      await purgeOldTombstones(90);

      // 1. Gather all local data
      const [
        localTransactions,
        localCategories,
        localBudgets,
        localInvestments,
        localDreams,
        localContacts,
        localSettlements,
        localAiReports,
        localEmergency,
        localPrefs,
        localAISettings,
        localTombstones,
        localRecurringPayments,
        localRecurringPaymentLogs,
      ] = await Promise.all([
        getAllFromStore<Transaction>('transactions'),
        getAllFromStore<Category>('categories'),
        getAllFromStore<Budget>('budgets'),
        getAllFromStore<Investment>('investments'),
        getAllFromStore<DreamGoal>('dreams'),
        getAllFromStore<Contact>('contacts'),
        getAllFromStore<SettlementRecord>('settlements'),
        getAllFromStore<AIHealthReport>('aiReports'),
        getSingleRecord<EmergencyFund & { id: string }>('emergencyFund', 'current'),
        getSingleRecord<UserPreferences>('userPreferences', 'general'),
        getSingleRecord<AISettings & { id: string }>('aiSettings', 'current'),
        getTombstones(),
        getAllFromStore<RecurringPayment>('recurringPayments'),
        getAllFromStore<RecurringPaymentLog>('recurringPaymentLogs'),
      ]);

      // 2. Fetch remote sync file
      const fileId = await this.findSyncFile(token);
      let remotePayload: SyncPayload | null = null;
      if (fileId) {
        remotePayload = await this.downloadSyncFile(fileId, token);
      }

      // If no remote file exists yet, upload current local snapshot directly
      if (!remotePayload || !remotePayload.stores) {
        const initialPayload: SyncPayload = {
          version: 3,
          deviceId: localDeviceId,
          lastModified: new Date().toISOString(),
          stores: {
            transactions: localTransactions,
            categories: localCategories,
            budgets: localBudgets,
            emergencyFund: localEmergency || {
              id: 'current',
              targetMonths: 6,
              monthlyExpenseBaseline: 50000,
              currentSaved: 0,
              contributions: [],
            },
            investments: localInvestments,
            dreams: localDreams,
            // Strip API key for security!
            aiSettings: {
              id: 'current',
              provider: localAISettings?.provider || 'gemini',
              model: localAISettings?.model || 'gemini-1.5-flash',
              customPromptPrefix: localAISettings?.customPromptPrefix || '',
              updatedAt: localAISettings?.updatedAt || new Date().toISOString(),
            },
            aiReports: localAiReports,
            userPreferences: localPrefs || {
              id: 'general',
              darkMode: false,
              notRecurringTxIds: [],
              updatedAt: new Date().toISOString(),
            },
            contacts: localContacts,
            settlements: localSettlements,
            recurringPayments: localRecurringPayments,
            recurringPaymentLogs: localRecurringPaymentLogs,
          },
          tombstones: localTombstones,
        };

        await this.uploadSyncFile(initialPayload, token);
        this.lastSyncedAt = new Date().toISOString();
        localStorage.setItem('dhanveda_last_synced_at', this.lastSyncedAt);
        this.syncInProgress = false;
        this.notify();
        return true;
      }

      // 3. MERGE ENGINE
      const remoteDeviceId = remotePayload.deviceId || 'unknown';

      // Merge tombstones (union by key, keep newer or tie-break deterministically)
      const mergedTombstonesMap = new Map<string, TombstoneRecord>();
      for (const t of [...localTombstones, ...(remotePayload.tombstones || [])]) {
        if (!t || !t.id) continue;
        const key = `${t.store}:${t.id}`;
        const existing = mergedTombstonesMap.get(key);
        if (!existing) {
          mergedTombstonesMap.set(key, t);
        } else {
          const { diffMs, isSkewTied } = compareTimestampsWithSkew(t.deletedAt, existing.deletedAt);
          if (!isSkewTied) {
            if (diffMs > 0) mergedTombstonesMap.set(key, t);
          } else {
            const tEpoch = new Date(t.deletedAt).getTime();
            const existEpoch = new Date(existing.deletedAt).getTime();
            if (tEpoch > existEpoch) {
              mergedTombstonesMap.set(key, t);
            }
          }
        }
      }
      const mergedTombstones = Array.from(mergedTombstonesMap.values());

      // Helper to merge array stores using LWW and tombstone checks with clock skew handling
      const mergeArrayStore = <T extends { id: string; updatedAt?: string; createdAt?: string }>(
        storeName: SyncableStoreName,
        localItems: T[],
        remoteItems: T[]
      ): T[] => {
        const itemMap = new Map<string, T>();
        const localMap = new Map(localItems.map(item => [item.id, item]));
        const remoteMap = new Map(remoteItems.map(item => [item.id, item]));
        const allIds = new Set([...localMap.keys(), ...remoteMap.keys()]);

        for (const id of allIds) {
          const localItem = localMap.get(id);
          const remoteItem = remoteMap.get(id);
          const tombstone = mergedTombstonesMap.get(`${storeName}:${id}`);

          if (localItem && remoteItem) {
            // Compare timestamps with clock skew tolerance
            const localTime = localItem.updatedAt || localItem.createdAt || '1970-01-01';
            const remoteTime = remoteItem.updatedAt || remoteItem.createdAt || '1970-01-01';
            const { diffMs, isSkewTied } = compareTimestampsWithSkew(localTime, remoteTime);

            let winner: T;
            if (!isSkewTied) {
              winner = diffMs > 0 ? localItem : remoteItem;
            } else {
              // If timestamps are tied or within clock skew tolerance (3s):
              // 1. Preserve record that contains splits
              const localSplits = (localItem as any).splitWith;
              const remoteSplits = (remoteItem as any).splitWith;
              const localHasSplits = Array.isArray(localSplits) && localSplits.length > 0;
              const remoteHasSplits = Array.isArray(remoteSplits) && remoteSplits.length > 0;
              if (localHasSplits && !remoteHasSplits) {
                winner = localItem;
              } else if (!localHasSplits && remoteHasSplits) {
                winner = remoteItem;
              } else {
                // 2. Deterministic tie-breaker using deviceId
                winner = localDeviceId.localeCompare(remoteDeviceId) >= 0 ? localItem : remoteItem;
              }
            }

            // Check if tombstone is newer than or within skew of winner
            const winnerTime = winner.updatedAt || winner.createdAt || '1970-01-01';
            if (!isRecordDeletedByTombstone(winnerTime, tombstone)) {
              itemMap.set(id, winner);
            }
          } else if (localItem) {
            const localTime = localItem.updatedAt || localItem.createdAt || '1970-01-01';
            if (!isRecordDeletedByTombstone(localTime, tombstone)) {
              itemMap.set(id, localItem);
            }
          } else if (remoteItem) {
            const remoteTime = remoteItem.updatedAt || remoteItem.createdAt || '1970-01-01';
            if (!isRecordDeletedByTombstone(remoteTime, tombstone)) {
              itemMap.set(id, remoteItem);
            }
          }
        }

        return Array.from(itemMap.values());
      };

      // Merge all multi-item stores
      const rawMergedTransactions = mergeArrayStore('transactions', localTransactions, remotePayload.stores.transactions || []);
      const mergedTransactions = rawMergedTransactions.map(t => {
        let cleanSplits: any[] | undefined = undefined;
        if (Array.isArray(t.splitWith) && t.splitWith.length > 0) {
          cleanSplits = t.splitWith.map((s, idx) => ({
            id: s.id || `split-${t.id}-${idx + 1}`,
            contactId: s.contactId ? String(s.contactId).trim() : undefined,
            label: s.label || (!s.contactId ? `Person ${idx + 1}` : undefined),
            amount: Number(s.amount) || 0,
            direction: s.direction === 'i_owe_them' ? 'i_owe_them' : 'they_owe_me',
            settled: Boolean(s.settled),
            settledAmount: typeof s.settledAmount === 'number' ? s.settledAmount : undefined,
            linkedTransactionId: s.linkedTransactionId || undefined,
          }));
        }
        return {
          ...t,
          amount: Number(t.amount) || 0,
          splitWith: cleanSplits,
        };
      });
      const mergedCategories = mergeArrayStore('categories', localCategories, remotePayload.stores.categories || []);
      const mergedBudgets = mergeArrayStore('budgets', localBudgets, remotePayload.stores.budgets || []);
      const rawMergedInvestments = mergeArrayStore('investments', localInvestments, remotePayload.stores.investments || []);
      const localInvestmentsMap = new Map((localInvestments || []).map(i => [i.id, i]));
      const remoteInvestmentsMap = new Map((remotePayload.stores.investments || []).map(i => [i.id, i]));
      const mergedInvestments = rawMergedInvestments.map(inv => {
        const localInv = localInvestmentsMap.get(inv.id);
        const remoteInv = remoteInvestmentsMap.get(inv.id);
        if (localInv && remoteInv) {
          const logMap = new Map<string, any>();
          for (const l of [...(localInv.logs || []), ...(remoteInv.logs || [])]) {
            if (!l) continue;
            const key = l.id || `${l.date}-${l.investedDelta}-${l.valueDelta}`;
            if (!logMap.has(key)) {
              logMap.set(key, l);
            }
          }
          const mergedLogs = Array.from(logMap.values())
            .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
          return {
            ...inv,
            createdAt: localInv.createdAt || remoteInv.createdAt || inv.createdAt,
            startDate: localInv.startDate || remoteInv.startDate || inv.startDate,
            logs: mergedLogs,
          };
        }
        return inv;
      });
      const mergedDreamsBase = mergeArrayStore('dreams', localDreams, remotePayload.stores.dreams || []);
      // Reconcile nested contribution arrays for each dream goal so contributions from neither device are clobbered
      const localDreamsMap = new Map((localDreams || []).map(d => [d.id, d]));
      const remoteDreamsMap = new Map((remotePayload.stores.dreams || []).map(d => [d.id, d]));
      const mergedDreams = mergedDreamsBase.map(goal => {
        const localGoal = localDreamsMap.get(goal.id);
        const remoteGoal = remoteDreamsMap.get(goal.id);
        if (localGoal && remoteGoal) {
          const contribMap = new Map<string, DreamContribution>();
          for (const c of [...(localGoal.contributions || []), ...(remoteGoal.contributions || [])]) {
            if (!c) continue;
            const key = c.id || `${c.date}-${c.amount}`;
            const existing = contribMap.get(key);
            if (!existing) {
              contribMap.set(key, c);
            } else {
              const cTime = c.updatedAt || c.createdAt || '1970-01-01';
              const eTime = existing.updatedAt || existing.createdAt || '1970-01-01';
              const { diffMs } = compareTimestampsWithSkew(cTime, eTime);
              if (diffMs > 0) {
                contribMap.set(key, c);
              }
            }
          }
          const mergedContributions = Array.from(contribMap.values())
            .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
          const totalSaved = mergedContributions.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
          return {
            ...goal,
            contributions: mergedContributions,
            currentSaved: mergedContributions.length > 0 ? totalSaved : goal.currentSaved,
          };
        }
        return goal;
      });
      const mergedContacts = mergeArrayStore('contacts', localContacts, remotePayload.stores.contacts || []);
      const mergedSettlements = mergeArrayStore('settlements', localSettlements, remotePayload.stores.settlements || []);
      const mergedAiReports = mergeArrayStore('aiReports', localAiReports, remotePayload.stores.aiReports || []);
      const mergedRecurringPayments = mergeArrayStore('recurringPayments', localRecurringPayments, remotePayload.stores.recurringPayments || []);
      const mergedRecurringPaymentLogs = mergeArrayStore('recurringPaymentLogs', localRecurringPaymentLogs, remotePayload.stores.recurringPaymentLogs || []);

      // Merge Single-Record Store: EmergencyFund
      const remoteEmergency = remotePayload.stores.emergencyFund;
      let mergedEmergency = localEmergency || {
        id: 'current',
        targetMonths: 6,
        monthlyExpenseBaseline: 50000,
        currentSaved: 0,
        contributions: [],
      };
      if (remoteEmergency) {
        const localTime = localEmergency?.updatedAt || '1970-01-01';
        const remoteTime = remoteEmergency.updatedAt || '1970-01-01';
        const { diffMs, isSkewTied } = compareTimestampsWithSkew(remoteTime, localTime);
        const remoteWins = !isSkewTied
          ? diffMs > 0
          : remoteDeviceId.localeCompare(localDeviceId) > 0;
        const winner = remoteWins
          ? remoteEmergency
          : (localEmergency || remoteEmergency);

        // Union-merge nested contribution arrays
        const localContribs = localEmergency?.contributions || [];
        const remoteContribs = remoteEmergency.contributions || [];
        const contribMap = new Map<string, EmergencyContribution>();

        for (const c of [...localContribs, ...remoteContribs]) {
          if (!c) continue;
          const key = c.id || `${c.date}-${c.amount}-${c.type}`;
          const existing = contribMap.get(key);
          if (!existing) {
            contribMap.set(key, c);
          } else {
            const cTime = c.updatedAt || c.createdAt || '1970-01-01';
            const eTime = existing.updatedAt || existing.createdAt || '1970-01-01';
            const { diffMs: cDiff } = compareTimestampsWithSkew(cTime, eTime);
            if (cDiff > 0) {
              contribMap.set(key, c);
            }
          }
        }
        const mergedContributions = Array.from(contribMap.values())
          .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

        // Recompute currentSaved from merged contributions replayed in chronological order
        const chronologicalContribs = [...mergedContributions].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
        let calculatedSaved = 0;
        chronologicalContribs.forEach(c => {
          if (c.type === 'deposit') calculatedSaved += Number(c.amount) || 0;
          else calculatedSaved = Math.max(0, calculatedSaved - (Number(c.amount) || 0));
        });

        mergedEmergency = {
          ...winner,
          contributions: mergedContributions,
          currentSaved: mergedContributions.length > 0 ? calculatedSaved : winner.currentSaved,
        };
      }

      // Merge Single-Record Store: UserPreferences
      const remotePrefs = remotePayload.stores.userPreferences;
      let mergedPrefs = localPrefs || {
        id: 'general',
        darkMode: false,
        notRecurringTxIds: [],
      };
      if (remotePrefs) {
        const localTime = localPrefs?.updatedAt || '1970-01-01';
        const remoteTime = remotePrefs.updatedAt || '1970-01-01';
        const { diffMs, isSkewTied } = compareTimestampsWithSkew(remoteTime, localTime);
        const remoteWins = !isSkewTied
          ? diffMs > 0
          : remoteDeviceId.localeCompare(localDeviceId) > 0;
        if (remoteWins) {
          mergedPrefs = remotePrefs;
        }
      }

      // Merge Single-Record Store: AISettings
      // CRITICAL: Always preserve local apiKey from localAISettings to avoid clobbering!
      const localKey = localAISettings?.apiKey || '';
      const remoteAISettings = remotePayload.stores.aiSettings;
      let mergedAiProvider = localAISettings?.provider || 'gemini';
      let mergedAiModel = localAISettings?.model || 'gemini-1.5-flash';
      let mergedAiPrompt = localAISettings?.customPromptPrefix || '';
      let mergedAiUpdatedAt = localAISettings?.updatedAt || new Date().toISOString();

      if (remoteAISettings) {
        const localTime = localAISettings?.updatedAt || '1970-01-01';
        const remoteTime = remoteAISettings.updatedAt || '1970-01-01';
        const { diffMs, isSkewTied } = compareTimestampsWithSkew(remoteTime, localTime);
        const remoteWins = !isSkewTied
          ? diffMs > 0
          : remoteDeviceId.localeCompare(localDeviceId) > 0;
        if (remoteWins) {
          mergedAiProvider = remoteAISettings.provider || mergedAiProvider;
          mergedAiModel = remoteAISettings.model || mergedAiModel;
          mergedAiPrompt = remoteAISettings.customPromptPrefix || '';
          mergedAiUpdatedAt = remoteAISettings.updatedAt || new Date().toISOString();
        }
      }

      const mergedAISettings: AISettings & { id: string } = {
        id: 'current',
        provider: mergedAiProvider,
        model: mergedAiModel,
        customPromptPrefix: mergedAiPrompt,
        updatedAt: mergedAiUpdatedAt,
        apiKey: localKey, // Safely preserved!
      };

      // 4. Upload consolidated snapshot to Google Drive first (Two-Phase Commit safety)
      const consolidatedPayload: SyncPayload = {
        version: 3,
        deviceId: localDeviceId,
        lastModified: new Date().toISOString(),
        stores: {
          transactions: mergedTransactions,
          categories: mergedCategories,
          budgets: mergedBudgets,
          emergencyFund: mergedEmergency,
          investments: mergedInvestments,
          dreams: mergedDreams,
          aiSettings: {
            id: 'current',
            provider: mergedAISettings.provider,
            model: mergedAISettings.model,
            customPromptPrefix: mergedAISettings.customPromptPrefix,
            updatedAt: mergedAISettings.updatedAt,
          },
          aiReports: mergedAiReports,
          userPreferences: mergedPrefs,
          contacts: mergedContacts,
          settlements: mergedSettlements,
          recurringPayments: mergedRecurringPayments,
          recurringPaymentLogs: mergedRecurringPaymentLogs,
        },
        tombstones: mergedTombstones,
      };

      await this.uploadSyncFile(consolidatedPayload, token);

      // 5. Commit merged results to local IndexedDB only after remote upload succeeds
      await Promise.all([
        saveAllToStore('transactions', mergedTransactions),
        saveAllToStore('categories', mergedCategories),
        saveAllToStore('budgets', mergedBudgets),
        saveAllToStore('investments', mergedInvestments),
        saveAllToStore('dreams', mergedDreams),
        saveAllToStore('contacts', mergedContacts),
        saveAllToStore('settlements', mergedSettlements),
        saveAllToStore('aiReports', mergedAiReports),
        saveAllToStore('recurringPayments', mergedRecurringPayments),
        saveAllToStore('recurringPaymentLogs', mergedRecurringPaymentLogs),
        saveSingleRecord('emergencyFund', mergedEmergency),
        saveSingleRecord('userPreferences', mergedPrefs),
        saveSingleRecord('aiSettings', mergedAISettings),
        saveTombstones(mergedTombstones),
      ]);

      this.lastSyncedAt = new Date().toISOString();
      localStorage.setItem('dhanveda_last_synced_at', this.lastSyncedAt);
      this.syncInProgress = false;
      this.lastError = null;
      this.notify();
      return true;
    } catch (err: any) {
      console.error('[DriveSync] Sync execution failed:', err);
      this.syncInProgress = false;
      this.lastError = err?.message || 'Sync failed';
      this.notify();
      return false;
    }
  }
}

export const driveSyncService = new DriveSyncService();
