import React, { useState, useRef, useEffect } from 'react';
import {
 Settings as SettingsIcon,
 Shield,
 Download,
 Upload,
 RefreshCw,
 Trash2,
 Key,
 CheckCircle,
 AlertCircle,
 Sparkles,
 Cloud,
 CloudOff,
 UploadCloud,
 Activity,
 Eye,
 EyeOff,
 RotateCcw,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { AIProvider } from '../../types/finance';
import { DEFAULT_AI_MODELS } from '../../services/aiService';
import { googleAuthService } from '../../services/googleAuth';
import { GoogleSyncSetupModal } from './GoogleSyncSetupModal';
import { getTodayString } from '../../utils/date';
import { StatementImportView } from '../import/StatementImportView';
import { useToast } from '../../context/ToastContext';

export const SettingsView: React.FC = () => {
 const { showToast } = useToast();
 const {
 aiSettings,
 updateAISettings,
 resetToDemoData,
 clearAllData,
 exportBackupJSON,
 importBackupJSON,
 transactions,
 budgets,
 investments,
 dreams,
 categories,
 syncStatus,
 lastSyncedAt,
 syncError,
 isDriveConnected,
 driveUserEmail,
 triggerSync,
 connectDrive,
 disconnectDrive,
 currentView,
 } = useFinance();

 const fileInputRef = useRef<HTMLInputElement | null>(null);

 const [activeTab, setActiveTab] = useState<'settings' | 'import'>(
 currentView === 'import' ? 'import' : 'settings'
 );
 const [provider, setProvider] = useState<AIProvider>(aiSettings.provider || 'gemini');
 const [apiKey, setApiKey] = useState(aiSettings.apiKey || '');
 const [saveSuccess, setSaveSuccess] = useState(false);
 const [importStatus, setImportStatus] = useState<string | null>(null);
 const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
 const [isManualSyncing, setIsManualSyncing] = useState(false);
 const [motionPref, setMotionPref] = useState<'system' | 'standard' | 'reduced'>(() => {
 if (typeof window === 'undefined') return 'system';
 try {
 const stored = localStorage.getItem('dhanveda_motion');
 if (stored === 'off') return 'reduced';
 if (stored === 'on') return 'standard';
 } catch {}
 const attr = document.documentElement.dataset.motion;
 if (attr === 'off') return 'reduced';
 if (attr === 'on') return 'standard';
 return 'system';
 });

 const handleMotionChange = (pref: 'system' | 'standard' | 'reduced') => {
 setMotionPref(pref);
 if (typeof window === 'undefined') return;
 try {
 if (pref === 'system') {
 delete document.documentElement.dataset.motion;
 localStorage.removeItem('dhanveda_motion');
 } else if (pref === 'standard') {
 document.documentElement.dataset.motion = 'on';
 localStorage.setItem('dhanveda_motion', 'on');
 } else if (pref === 'reduced') {
 document.documentElement.dataset.motion = 'off';
 localStorage.setItem('dhanveda_motion', 'off');
 }
 window.dispatchEvent(new CustomEvent('dhanveda-motion-change'));
 } catch (err) {
 console.error('Failed to update motion preference:', err);
 }
 };

 const [isPrivacy, setIsPrivacy] = useState(() => {
   if (typeof window === 'undefined') return false;
   try {
     return localStorage.getItem('dhanveda_privacy') === 'on';
   } catch {
     return false;
   }
 });

 const [isCalmMode, setIsCalmMode] = useState(() => {
   if (typeof window === 'undefined') return false;
   try {
     return localStorage.getItem('dhanveda_calm_mode') === 'true';
   } catch {
     return false;
   }
 });

 useEffect(() => {
   const handlePrivacyEvent = () => {
     setIsPrivacy(typeof window !== 'undefined' && localStorage.getItem('dhanveda_privacy') === 'on');
   };
   const handleCalmEvent = () => {
     setIsCalmMode(typeof window !== 'undefined' && localStorage.getItem('dhanveda_calm_mode') === 'true');
   };
   const handleStorageEvent = (e: StorageEvent) => {
     if (e.key === 'dhanveda_privacy') {
       const on = e.newValue === 'on';
       setIsPrivacy(on);
       if (on) {
         document.documentElement.setAttribute('data-privacy', 'on');
       } else {
         document.documentElement.removeAttribute('data-privacy');
       }
     }
     if (e.key === 'dhanveda_calm_mode') {
       const calm = e.newValue === 'true';
       setIsCalmMode(calm);
       if (calm) {
         document.documentElement.setAttribute('data-calm', 'true');
       } else {
         document.documentElement.removeAttribute('data-calm');
       }
     }
     if (e.key === 'dhanveda_motion') {
       const val = e.newValue;
       if (val === 'off') setMotionPref('reduced');
       else if (val === 'on') setMotionPref('standard');
       else setMotionPref('system');
     }
   };
   window.addEventListener('dhanveda-privacy-change', handlePrivacyEvent);
   window.addEventListener('dhanveda-calm-change', handleCalmEvent);
   window.addEventListener('storage', handleStorageEvent);
   return () => {
     window.removeEventListener('dhanveda-privacy-change', handlePrivacyEvent);
     window.removeEventListener('dhanveda-calm-change', handleCalmEvent);
     window.removeEventListener('storage', handleStorageEvent);
   };
 }, []);

 const handlePrivacyToggle = () => {
   const next = !isPrivacy;
   setIsPrivacy(next);
   try {
     if (next) {
       localStorage.setItem('dhanveda_privacy', 'on');
       document.documentElement.setAttribute('data-privacy', 'on');
     } else {
       localStorage.setItem('dhanveda_privacy', 'off');
       document.documentElement.removeAttribute('data-privacy');
     }
     window.dispatchEvent(new CustomEvent('dhanveda-privacy-change'));
   } catch (err) {
     console.error('Failed to toggle privacy mode:', err);
   }
 };

 const handleCalmModeToggle = () => {
   const next = !isCalmMode;
   setIsCalmMode(next);
   try {
     localStorage.setItem('dhanveda_calm_mode', next ? 'true' : 'false');
     if (next) {
       document.documentElement.setAttribute('data-calm', 'true');
     } else {
       document.documentElement.removeAttribute('data-calm');
     }
     window.dispatchEvent(new CustomEvent('dhanveda-calm-change'));
   } catch (err) {
     console.error('Failed to toggle calm mode:', err);
   }
 };

 const handleSaveAI = (e: React.FormEvent) => {
 e.preventDefault();
 updateAISettings({
 provider,
 apiKey: apiKey.trim(),
 model: DEFAULT_AI_MODELS[provider],
 });
 setSaveSuccess(true);
 setTimeout(() => setSaveSuccess(false), 2500);
 };

 const handleExportBackup = () => {
 const jsonStr = exportBackupJSON();
 const blob = new Blob([jsonStr], { type: 'application/json' });
 const url = URL.createObjectURL(blob);
 const a = document.createElement('a');
 a.href = url;
 a.download = `dhanveda_backup_${getTodayString()}.json`;
 a.click();
 URL.revokeObjectURL(url);
 };

 const MAX_BACKUP_SIZE_BYTES = 25 * 1024 * 1024; // 25MB limit

 const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (!file) return;

 if (file.size > MAX_BACKUP_SIZE_BYTES) {
 showToast('danger', 'File Too Large', 'Backup file exceeds 25MB limit.');
 setImportStatus('Backup file exceeds 25MB limit.');
 if (fileInputRef.current) fileInputRef.current.value = '';
 return;
 }

 const reader = new FileReader();
 reader.onload = event => {
 try {
 const content = event.target?.result;
 if (typeof content !== 'string' || !content.trim()) {
 showToast('danger', 'Invalid Backup', 'The selected backup file is empty.');
 setImportStatus('Backup file is empty.');
 return;
 }

 const ok = importBackupJSON(content, { onToast: showToast });
 if (ok) {
 setImportStatus('Backup restored successfully!');
 } else {
 setImportStatus('Restore was cancelled or rejected.');
 }
 } catch (err) {
 console.error('Restore error:', err);
 setImportStatus('Invalid JSON file format.');
 showToast('danger', 'Parse Error', 'The selected file could not be parsed as valid JSON.');
 } finally {
 if (fileInputRef.current) {
 fileInputRef.current.value = '';
 }
 }
 };
 reader.onerror = () => {
 setImportStatus('Failed to read file from disk.');
 showToast('danger', 'Read Error', 'Could not read backup file from disk.');
 if (fileInputRef.current) {
 fileInputRef.current.value = '';
 }
 };
 reader.readAsText(file);
 };

 const handleManualSync = async () => {
 setIsManualSyncing(true);
 await triggerSync(true);
 setIsManualSyncing(false);
 };

 return (
 <div className="space-y-6 max-w-7xl mx-auto pb-16">
 {/* Settings vs Statement Import Tabs */}
 <div className="flex items-center p-1 bg-sunken rounded-2xl border border-line max-w-md shadow-xs">
 <button
 type="button"
 onClick={() => setActiveTab('settings')}
 className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-colors ${
 activeTab === 'settings'
 ? 'bg-surface text-ink-1 dark:text-reward shadow-xs'
 : 'text-ink-3 hover:text-ink-1'
 }`}
 >
 <SettingsIcon className="w-4 h-4" />
 <span>General & Sync</span>
 </button>
 <button
 type="button"
 onClick={() => setActiveTab('import')}
 className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-colors ${
 activeTab === 'import'
 ? 'bg-surface text-ink-1 dark:text-reward shadow-xs'
 : 'text-ink-3 hover:text-ink-1'
 }`}
 >
 <UploadCloud className="w-4 h-4" />
 <span>Statement Import</span>
 </button>
 </div>

 {activeTab === 'import' ? (
 <StatementImportView />
 ) : (
 <>
 {/* Privacy Guarantee Header: Mineral Card with Gold Security Highlight */}
 <div className="relative overflow-hidden rounded-2xl bg-surface text-ink-1 p-6 sm:p-8 border border-line shadow-sm">
 <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-reward-fill to-transparent opacity-80" />
 <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
 <div>
 <div className="flex items-center gap-2 mb-2">
 <span className="flex h-6 w-6 items-center justify-center rounded-xl bg-primary-tint text-primary">
 <Shield className="h-4 w-4" />
 </span>
 <span className="text-xs font-bold uppercase tracking-wider text-ink-3">
 DATA SOVEREIGNTY &amp; ARCHITECTURE
 </span>
 </div>
 <p className="text-xs text-ink-3 mb-1">
 Client-Side Storage Guarantee
 </p>
 <div className="flex items-baseline gap-3">
 <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-ink-1">
 100% Local-First
 </h2>
 <span className="text-sm font-semibold text-positive">
 Private IndexedDB
 </span>
 </div>
 <p className="mt-2 text-xs text-ink-3">
 All financial records, goals, and API keys are stored solely inside your browser's private database.
 </p>
 </div>

 <div className="flex flex-wrap items-center gap-3">
 <button
 type="button"
 onClick={handleExportBackup}
 className="inline-flex items-center gap-2 rounded-xl bg-primary hover:opacity-95 text-on-primary px-5 py-3 text-sm font-bold shadow-sm transition-colors active:scale-[0.98]"
 >
 <Download className="h-4 w-4 stroke-[2.5]" />
 <span>Export Full Backup</span>
 </button>
 </div>
 </div>

 {/* 4-column summary strip */}
 <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-line">
 <div className="rounded-2xl bg-sunken p-3.5 border border-line">
 <span className="text-xs text-ink-3">Local Engine</span>
 <p className="text-lg font-bold font-numeric text-ink-1 mt-0.5">IndexedDB v4</p>
 </div>
 <div className="rounded-2xl bg-sunken p-3.5 border border-line">
 <span className="text-xs text-ink-3">Cloud Sync</span>
 <p className={`text-lg font-bold mt-0.5 ${isDriveConnected ? 'text-positive' : 'text-ink-3'}`}>
 {isDriveConnected ? 'Drive Connected' : 'Offline Mode'}
 </p>
 </div>
 <div className="rounded-2xl bg-sunken p-3.5 border border-line">
 <span className="text-xs text-ink-3">Ledger Count</span>
 <p className="text-lg font-bold font-numeric text-ink-1 mt-0.5">{transactions.length} records</p>
 </div>
 <div className="rounded-2xl bg-sunken p-3.5 border border-line">
 <span className="text-xs text-ink-3">Categories</span>
 <p className="text-lg font-bold font-numeric text-ink-1 mt-0.5">{categories.length} types</p>
 </div>
 </div>
 </div>

 {/* Section Header: Cloud Sync */}
 <div className="flex items-center justify-between">
 <div>
 <h3 className="text-lg font-bold text-ink-1 tracking-tight">
 Google Drive Cloud Sync
 </h3>
 <p className="text-xs text-ink-3">
 Multi-device automatic synchronization using your own Google Drive storage
 </p>
 </div>
 <span className="text-xs font-semibold text-ink-3">
 {isDriveConnected ? 'Active' : 'Disconnected'}
 </span>
 </div>

 {/* Google Drive Cross-Device Sync */}
 <div className="bg-surface rounded-2xl p-6 shadow-sm border border-line space-y-4">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
 <div className="flex items-center gap-3">
 <div className="p-2.5 rounded-xl bg-primary-tint text-primary shrink-0">
 <Cloud className="w-5 h-5" />
 </div>
 <div>
 <h3 className="text-base font-bold text-ink-1 flex items-center gap-2">
 <span>Google Drive Cloud Sync &amp; Multi-Device</span>
 {isDriveConnected ? (
 <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-positive-tint text-positive">
 <span className="w-1.5 h-1.5 rounded-full bg-positive animate-pulse"></span>
 Connected
 </span>
 ) : (
 <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-sunken text-ink-3 border border-line">
 Not Connected
 </span>
 )}
 </h3>
 <p className="text-xs text-ink-3 mt-0.5">
 Sync peer-to-cloud across mobile and desktop using your private Google Drive app folder.
 </p>
 </div>
 </div>

 <button
 type="button"
 onClick={() => setIsSetupModalOpen(true)}
 className="self-start sm:self-auto flex items-center gap-1.5 px-3.5 py-2.5 min-h-[44px] bg-sunken hover:bg-sunken/80 text-ink-2 border border-line rounded-xl text-xs font-bold transition-colors shrink-0"
 >
 <Key className="w-3.5 h-3.5" />
 <span>Setup Guide / Client ID</span>
 </button>
 </div>

 {/* Sync Info Banner */}
 <div className="p-4 rounded-2xl border border-line bg-sunken space-y-3">
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
 <div>
 <span className="text-ink-3 font-semibold block">Google Account</span>
 <span className="text-ink-1 font-bold mt-0.5 truncate block">
 {isDriveConnected ? driveUserEmail || 'Connected' : 'None'}
 </span>
 </div>
 <div>
 <span className="text-ink-3 font-semibold block">Last Synced</span>
 <span className="text-ink-1 font-bold font-numeric mt-0.5 block">
 {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : 'Never'}
 </span>
 </div>
 <div>
 <span className="text-ink-3 font-semibold block">Status</span>
 <span className="text-ink-1 font-bold mt-0.5 block">
 {syncStatus === 'syncing' || isManualSyncing
 ? 'Syncing changes...'
 : syncError
 ? `Error: ${syncError}`
 : isDriveConnected
 ? 'Up to date'
 : googleAuthService.hasClientId()
 ? 'Ready to connect'
 : 'Needs Client ID'}
 </span>
 </div>
 </div>

 {syncError && (
 <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
 <AlertCircle className="w-4 h-4 shrink-0" />
 <span>{syncError}</span>
 </div>
 )}

 <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-line">
 <div className="flex items-center gap-1.5 text-xs text-ink-3">
 <Shield className="w-3.5 h-3.5 text-emerald-500" />
 <span>Drive folder: <code>appDataFolder</code>. AI API keys are stored locally &amp; never synced.</span>
 </div>

 <div className="flex items-center gap-2">
 {isDriveConnected ? (
 <>
 <button
 type="button"
 onClick={handleManualSync}
 disabled={syncStatus === 'syncing' || isManualSyncing}
 className="press flex items-center gap-1.5 px-3.5 py-1.5 bg-primary hover:opacity-95 text-on-primary shadow-xs rounded-xl text-xs font-bold transition-colors disabled:opacity-50 shadow-sm"
 >
 <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === 'syncing' || isManualSyncing ? 'animate-spin' : ''}`} />
 <span>{syncStatus === 'syncing' || isManualSyncing ? 'Syncing...' : 'Sync Now'}</span>
 </button>
 <button
 type="button"
 onClick={() => {
 if (window.confirm('Disconnect Google Drive? Your local financial records will remain completely intact.')) {
 disconnectDrive();
 }
 }}
 className="press flex items-center gap-1.5 px-3.5 py-2.5 min-h-[44px] bg-sunken hover:bg-negative-tint hover:text-negative text-ink-2 rounded-xl text-xs font-bold transition-colors"
 >
 <CloudOff className="w-3.5 h-3.5" />
 <span>Disconnect</span>
 </button>
 </>
 ) : (
 <button
 type="button"
 onClick={() => {
 if (!googleAuthService.hasClientId()) {
 setIsSetupModalOpen(true);
 } else {
 connectDrive();
 }
 }}
 className="press flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] bg-primary hover:opacity-95 text-on-primary shadow-xs rounded-xl text-xs font-bold transition-colors shadow-sm"
 >
 <Cloud className="w-3.5 h-3.5" />
 <span>{googleAuthService.hasClientId() ? 'Connect Google Drive' : 'Configure Client ID'}</span>
 </button>
 )}
 </div>
 </div>
 </div>
 </div>

 {/* Appearance & Motion Preferences (Task E.5) */}
 <div className="bg-surface rounded-2xl p-6 shadow-sm border border-line space-y-4">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
 <div className="flex items-center gap-3">
 <div className="p-2.5 rounded-xl bg-primary-tint text-primary shrink-0">
 <Activity className="w-5 h-5" />
 </div>
 <div>
 <h3 className="text-base font-bold text-ink-1">
 Appearance &amp; Motion
 </h3>
 <p className="text-xs text-ink-3 mt-0.5">
 Control UI animation speed, count-up tweens, chart transitions, and celebration effects.
 </p>
 </div>
 </div>
 <span className="text-xs font-semibold text-primary px-3 py-1 rounded-full bg-primary-tint self-start sm:self-auto">
 {motionPref === 'system' ? 'System Driven' : motionPref === 'standard' ? 'Full Dynamic Motion' : 'Calm / Reduced'}
 </span>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
 <button
 type="button"
 onClick={() => handleMotionChange('system')}
 className={`p-4 rounded-2xl border text-left transition-[color,background-color,border-color,box-shadow] press ${
 motionPref === 'system'
 ? 'border-primary/70 bg-primary-tint ring-1 ring-primary/30 shadow-xs'
 : 'border-line bg-sunken hover:border-line-input'
 }`}
 >
 <div className="flex items-center justify-between mb-1.5">
 <span className={`text-xs font-bold uppercase tracking-wider ${
 motionPref === 'system' ? 'text-primary' : 'text-ink-3'
 }`}>
 Auto
 </span>
 {motionPref === 'system' && <CheckCircle className="w-4 h-4 text-primary" />}
 </div>
 <p className="text-sm font-bold text-ink-1">System Default</p>
 <p className="text-xs text-ink-3 mt-1">
 Synchronizes automatically with your device operating system accessibility settings.
 </p>
 </button>

 <button
 type="button"
 onClick={() => handleMotionChange('standard')}
 className={`p-4 rounded-2xl border text-left transition-[color,background-color,border-color,box-shadow] press ${
 motionPref === 'standard'
 ? 'border-primary/70 bg-primary-tint ring-1 ring-primary/30 shadow-xs'
 : 'border-line bg-sunken hover:border-line-input'
 }`}
 >
 <div className="flex items-center justify-between mb-1.5">
 <span className={`text-xs font-bold uppercase tracking-wider ${
 motionPref === 'standard' ? 'text-primary' : 'text-ink-3'
 }`}>
 Rich
 </span>
 {motionPref === 'standard' && <CheckCircle className="w-4 h-4 text-primary" />}
 </div>
 <p className="text-sm font-bold text-ink-1">Standard Motion</p>
 <p className="text-xs text-ink-3 mt-1">
 Fluid count-ups, staggered list entries, celebration confetti, and smooth card lifts.
 </p>
 </button>

 <button
 type="button"
 onClick={() => handleMotionChange('reduced')}
 className={`p-4 rounded-2xl border text-left transition-[color,background-color,border-color,box-shadow] press ${
 motionPref === 'reduced'
 ? 'border-primary/70 bg-primary-tint ring-1 ring-primary/30 shadow-xs'
 : 'border-line bg-sunken hover:border-line-input'
 }`}
 >
 <div className="flex items-center justify-between mb-1.5">
 <span className={`text-xs font-bold uppercase tracking-wider ${
 motionPref === 'reduced' ? 'text-primary' : 'text-ink-3'
 }`}>
 Calm
 </span>
 {motionPref === 'reduced' && <CheckCircle className="w-4 h-4 text-primary" />}
 </div>
 <p className="text-sm font-bold text-ink-1">Reduced Motion</p>
 <p className="text-xs text-ink-3 mt-1">
 Instant view transitions, static chart renders, zero looped animations for calm focus.
 </p>
 </button>
 </div>

 {/* Privacy & Calm Mode Experience Controls */}
 <div className="pt-4 border-t border-line space-y-3">
 <h4 className="text-xs font-bold uppercase tracking-wider text-ink-3">
 Privacy &amp; Focus Preferences
 </h4>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 {/* Privacy Mode Toggle */}
 <div className="p-4 rounded-2xl border border-line bg-sunken flex items-start justify-between gap-4">
 <div className="space-y-1 pr-2">
 <div className="flex items-center gap-2">
 {isPrivacy ? <EyeOff className="w-4 h-4 text-reward" /> : <Eye className="w-4 h-4 text-ink-2" />}
 <span className="text-sm font-bold text-ink-1">Privacy Mode</span>
 </div>
 <p className="text-xs text-ink-3 leading-relaxed">
 Blur all monetary amounts on screen for privacy when sharing.
 </p>
 </div>
 <button
 type="button"
 role="switch"
 aria-checked={isPrivacy}
 aria-label="Toggle Privacy Mode"
 onClick={handlePrivacyToggle}
 className={`press relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary ${
 isPrivacy ? 'bg-primary' : 'bg-line'
 }`}
 >
 <span
 className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
 isPrivacy ? 'translate-x-5' : 'translate-x-0'
 }`}
 />
 </button>
 </div>

 {/* Calm Mode Toggle */}
 <div className="p-4 rounded-2xl border border-line bg-sunken flex items-start justify-between gap-4">
 <div className="space-y-1 pr-2">
 <div className="flex items-center gap-2">
 <Sparkles className={`w-4 h-4 ${isCalmMode ? 'text-primary' : 'text-ink-2'}`} />
 <span className="text-sm font-bold text-ink-1">Calm Mode</span>
 </div>
 <p className="text-xs text-ink-3 leading-relaxed">
 Suppress confetti and celebration particles for a tranquil experience.
 </p>
 </div>
 <button
 type="button"
 role="switch"
 aria-checked={isCalmMode}
 aria-label="Toggle Calm Mode"
 onClick={handleCalmModeToggle}
 className={`press relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary ${
 isCalmMode ? 'bg-primary' : 'bg-line'
 }`}
 >
 <span
 className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
 isCalmMode ? 'translate-x-5' : 'translate-x-0'
 }`}
 />
 </button>
 </div>
 </div>

 {/* Reset Setup Checklist Action */}
 <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
 <p className="text-xs text-ink-3">
 Want to revisit the onboarding checklist on your dashboard?
 </p>
 <button
 type="button"
 onClick={() => {
 localStorage.removeItem('dhanveda_setup_checklist_dismissed');
 window.dispatchEvent(new CustomEvent('dhanveda-checklist-reset'));
 alert('Setup checklist reset. Return to Dashboard to view.');
 }}
 className="press self-start sm:self-auto px-3.5 py-2.5 min-h-[44px] rounded-xl border border-line bg-surface hover:bg-sunken text-xs font-bold text-ink-1 transition-colors flex items-center gap-1.5 shadow-xs"
 >
 <RotateCcw className="w-3.5 h-3.5 text-ink-3" />
 <span>Reset Setup Checklist</span>
 </button>
 </div>
 </div>
 </div>

 {/* Currency & Locale Preferences */}
 <div className="bg-surface rounded-2xl p-6 shadow-sm border border-line space-y-4">
 <h3 className="text-base font-bold text-ink-1 flex items-center gap-2">
 <span>Currency & Regional Formats</span>
 </h3>

 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
 <div className="p-4 bg-sunken rounded-2xl border border-line">
 <span className="text-ink-3 font-semibold block">Currency Symbol</span>
 <span className="text-base font-extrabold text-ink-1 mt-1 block font-numeric">
 ₹ (INR - Indian Rupee)
 </span>
 </div>

 <div className="p-4 bg-sunken rounded-2xl border border-line">
 <span className="text-ink-3 font-semibold block">Numbering Standard</span>
 <span className="text-base font-extrabold text-ink-1 mt-1 block font-numeric">
 Indian Comma (1,25,000)
 </span>
 </div>

 <div className="p-4 bg-sunken rounded-2xl border border-line">
 <span className="text-ink-3 font-semibold block">Compact Units</span>
 <span className="text-base font-extrabold text-ink-1 mt-1 block">
 L (Lakhs) & Cr (Crores)
 </span>
 </div>
 </div>
 </div>

 {/* AI Key Settings */}
 <div className="bg-surface rounded-2xl p-6 shadow-sm border border-line space-y-4">
 <div className="flex items-center justify-between">
 <h3 className="text-base font-bold text-ink-1 flex items-center gap-2">
 <Sparkles className="w-4 h-4 text-primary" />
 <span>AI Assistant Settings (BYOK)</span>
 </h3>
 {saveSuccess && (
 <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
 <CheckCircle className="w-3.5 h-3.5" />
 <span>Saved!</span>
 </span>
 )}
 </div>

 <form onSubmit={handleSaveAI} className="space-y-4">
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div>
 <label className="block text-xs font-bold uppercase tracking-wider text-ink-3 mb-1.5">
 AI Provider
 </label>
 <select
 value={provider}
 onChange={e => setProvider(e.target.value as AIProvider)}
 className="w-full py-2.5 px-3 bg-sunken border border-line rounded-xl text-sm font-semibold text-ink-1 focus:outline-none focus:ring-1 focus:ring-primary"
 >
 <option value="gemini">Google Gemini (Recommended Free Tier)</option>
 <option value="openai">OpenAI (ChatGPT)</option>
 <option value="anthropic">Anthropic (Claude)</option>
 </select>
 </div>

 <div>
 <label className="block text-xs font-bold uppercase tracking-wider text-ink-3 mb-1.5">
 API Key
 </label>
 <input
 type="password"
 value={apiKey}
 onChange={e => setApiKey(e.target.value)}
 placeholder="Paste API Key..."
 className="w-full py-2.5 px-3 bg-sunken border border-line rounded-xl text-sm font-mono text-ink-1 focus:outline-none focus:ring-1 focus:ring-primary"
 />
 </div>
 </div>

 <div className="flex justify-end">
 <button
 type="submit"
 className="press px-5 py-2.5 min-h-[44px] bg-primary hover:opacity-95 text-on-primary shadow-xs rounded-xl text-xs font-bold transition-colors shadow-sm"
 >
 Update AI Key
 </button>
 </div>
 </form>
 </div>

 {/* Data Backup, Restore & Demo Reset */}
 <div className="bg-surface rounded-2xl p-6 shadow-sm border border-line space-y-4">
 <h3 className="text-base font-bold text-ink-1">
 Data Backup & Management
 </h3>
 <p className="text-xs text-ink-3 font-numeric">
 Currently tracking {transactions.length} transactions, {budgets.length} budgets, {investments.length} investment holdings, and {dreams.length} goals.
 </p>

 {importStatus && (
 <div className="p-3 bg-sunken border border-line rounded-2xl text-xs font-semibold text-ink-1">
 {importStatus}
 </div>
 )}

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
 {/* Export JSON */}
 <div className="p-5 rounded-2xl border border-line bg-sunken flex flex-col justify-between">
 <div>
 <h4 className="font-bold text-sm text-ink-1">
 Export Full Backup (JSON)
 </h4>
 <p className="text-xs text-ink-3 mt-1">
 Save a complete JSON file with all your finances to keep an offline backup or migrate between devices.
 </p>
 </div>
 <button
 type="button"
 onClick={handleExportBackup}
 className="press mt-4 flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[44px] bg-primary hover:opacity-95 text-on-primary shadow-xs rounded-xl text-xs font-bold transition-colors shadow-sm"
 >
 <Download className="w-3.5 h-3.5" />
 <span>Download JSON Backup</span>
 </button>
 </div>

 {/* Import JSON */}
 <div className="p-5 rounded-2xl border border-line bg-sunken flex flex-col justify-between">
 <div>
 <h4 className="font-bold text-sm text-ink-1">
 Restore From Backup (JSON)
 </h4>
 <p className="text-xs text-ink-3 mt-1">
 Load your previously saved JSON file to restore your transactions and goals.
 </p>
 </div>
 <div>
 <input
 ref={fileInputRef}
 type="file"
 accept=".json, application/json"
 onChange={handleImportFile}
 className="hidden"
 />
 <button
 type="button"
 onClick={() => fileInputRef.current?.click()}
 className="press mt-4 w-full flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[44px] bg-sunken hover:bg-sunken/80 text-ink-1 rounded-xl text-xs font-bold transition-colors"
 >
 <Upload className="w-3.5 h-3.5" />
 <span>Select Backup File</span>
 </button>
 </div>
 </div>

 {/* Bank & Credit Card Statement Import */}
 <div className="sm:col-span-2 p-4 rounded-2xl border border-primary/20 bg-primary/5 dark:bg-primary-tint flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
 <div>
 <h4 className="font-bold text-sm text-ink-1 flex items-center gap-2">
 <UploadCloud className="w-4 h-4 text-primary" />
 <span>Bank &amp; Credit Card Statement Import</span>
 </h4>
 <p className="text-xs text-ink-3 mt-0.5">
 Auto-parse and categorize statements from HDFC, SBI, ICICI, Axis &amp; UPI (CSV or PDF).
 </p>
 </div>
 <button
 type="button"
 onClick={() => setActiveTab('import')}
 className="press flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] bg-primary hover:opacity-95 text-on-primary shadow-xs rounded-xl text-xs font-bold transition-colors shadow-xs shrink-0"
 >
 <span>Open Statement Importer</span>
 <UploadCloud className="w-3.5 h-3.5" />
 </button>
 </div>
 </div>

 {/* Reset / Demo options */}
 <div className="pt-4 border-t border-line flex flex-col sm:flex-row items-center justify-between gap-3">
 <button
 type="button"
 onClick={() => {
 if (window.confirm('Reset app state to realistic Indian sample demo data? (Swiggy, Zepto, HDFC Salary, SIPs, Gold, Goals)')) {
 resetToDemoData();
 alert('Demo data loaded successfully!');
 }
 }}
 className="flex items-center gap-1.5 text-xs font-bold text-primary hover:underline min-h-[44px]"
 >
 <RefreshCw className="w-3.5 h-3.5" />
 <span>Reset with Realistic Indian Sample Data</span>
 </button>

 <button
 type="button"
 onClick={() => {
 if (window.confirm('WARNING: Are you sure you want to permanently clear all data from this browser?')) {
 clearAllData();
 alert('All data has been cleared.');
 }
 }}
 className="flex items-center gap-1.5 text-xs font-bold text-negative hover:underline min-h-[44px]"
 >
 <Trash2 className="w-3.5 h-3.5" />
 <span>Clear All Local Data</span>
 </button>
 </div>
 </div>

 {/* Google Cloud Drive Sync Setup Modal */}
 <GoogleSyncSetupModal
 isOpen={isSetupModalOpen}
 onClose={() => setIsSetupModalOpen(false)}
 />
 </>
 )}
 </div>
 );
};
