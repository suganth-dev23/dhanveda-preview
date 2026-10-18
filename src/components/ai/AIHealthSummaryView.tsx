import React, { useState } from 'react';
import {
 Sparkles,
 Key,
 Bot,
 AlertCircle,
 CheckCircle,
 Copy,
 Download,
 Trash2,
 ExternalLink,
 ShieldCheck,
 RefreshCw,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { useToast } from '../../context/ToastContext';
import { AIProvider } from '../../types/finance';
import { DEFAULT_AI_MODELS, generateFinancialSummary } from '../../services/aiService';
import { formatDateTime, getTodayString } from '../../utils/date';
import { formatINR } from '../../utils/currency';
import { copyToClipboard } from '../../utils/clipboard';

const PROVIDER_INFO: Record<AIProvider, { name: string; tag: string; link: string; defaultModel: string; note: string }> = {
 gemini: {
 name: 'Google Gemini',
 tag: 'Recommended (Generous Free Tier)',
 link: 'https://aistudio.google.com/app/apikey',
 defaultModel: DEFAULT_AI_MODELS.gemini,
 note: 'Google AI Studio offers a free tier with high limits and zero backend needed. 100% direct client communication.',
 },
 openai: {
 name: 'OpenAI (ChatGPT)',
 tag: 'Requires API Credits',
 link: 'https://platform.openai.com/api-keys',
 defaultModel: DEFAULT_AI_MODELS.openai,
 note: 'Requires an active OpenAI developer account with billing or prepaid trial credits.',
 },
 anthropic: {
 name: 'Anthropic (Claude)',
 tag: 'Requires API Credits',
 link: 'https://console.anthropic.com/settings/keys',
 defaultModel: DEFAULT_AI_MODELS.anthropic,
 note: 'Requires an active Anthropic Console account with prepaid API credits. Direct browser mode is supported.',
 },
};

export const AIHealthSummaryView: React.FC = () => {
 const {
 aiSettings,
 updateAISettings,
 aiReports,
 saveAIReport,
 deleteAIReport,
 getAggregatesForAI,
 currentMonthIncome,
 currentMonthExpense,
 currentMonthSavingsRate,
 totalInvestmentValue,
 emergencyFundRunwayMonths,
 } = useFinance();
 const { showToast } = useToast();

 const [provider, setProvider] = useState<AIProvider>(aiSettings.provider || 'gemini');
 const [apiKey, setApiKey] = useState(aiSettings.apiKey || '');
 const [showKey, setShowKey] = useState(false);
 const [loading, setLoading] = useState(false);
 const [errorMsg, setErrorMsg] = useState<string | null>(null);
 const [copied, setCopied] = useState(false);

 const selectedProviderInfo = PROVIDER_INFO[provider];

 const safeRunwayDisplay = emergencyFundRunwayMonths === Infinity
   ? '∞ mos'
   : `${(Number.isFinite(emergencyFundRunwayMonths) ? emergencyFundRunwayMonths : 0).toFixed(1)} mos`;

 const safeSavingsRateDisplay = `${(Number.isFinite(currentMonthSavingsRate) ? currentMonthSavingsRate : 0).toFixed(1)}%`;

 const handleSaveKey = () => {
   if (!apiKey.trim()) {
     showToast('warning', 'API Key Required', 'Please enter a valid API key.');
     return;
   }
   updateAISettings({
     provider,
     apiKey: apiKey.trim(),
     model: PROVIDER_INFO[provider].defaultModel,
   });
   showToast('success', 'API Key Stored', 'Key stored securely in browser local storage.');
 };

 const handleGenerate = async () => {
   if (!apiKey.trim()) {
     const msg = `Please enter and save your ${selectedProviderInfo.name} API key first.`;
     setErrorMsg(msg);
     showToast('warning', 'API Key Missing', msg);
     return;
   }

   setLoading(true);
   setErrorMsg(null);

   try {
     const defaultModel = PROVIDER_INFO[provider].defaultModel;
     updateAISettings({
       provider,
       apiKey: apiKey.trim(),
       model: defaultModel,
     });

     const aggregates = getAggregatesForAI();
     const summaryText = await generateFinancialSummary(
       { provider, apiKey: apiKey.trim(), model: defaultModel },
       aggregates
     );

     saveAIReport({
       provider,
       model: defaultModel,
       summaryText,
       financialSnapshot: {
         monthlyIncome: currentMonthIncome,
         monthlyExpense: currentMonthExpense,
         savingsRate: currentMonthSavingsRate,
         topExpenseCategory: aggregates.categorySpending[0]?.category || 'N/A',
         emergencyFundMonths: emergencyFundRunwayMonths,
         totalInvestments: totalInvestmentValue,
         activeGoalsCount: aggregates.goals.length,
       },
     });
     showToast('success', 'Health Assessment Generated', 'Your private financial analysis is ready.');
   } catch (err: any) {
     const msg = err.message || `Couldn't reach ${selectedProviderInfo.name}. Please check your API key in Settings.`;
     setErrorMsg(msg);
     showToast('danger', 'AI Generation Failed', msg);
   } finally {
     setLoading(false);
   }
 };

 const activeReport = aiReports[0];

 const handleCopy = async (text: string) => {
   const success = await copyToClipboard(text);
   if (success) {
     setCopied(true);
     showToast('success', 'Copied to Clipboard', 'Report content copied.');
     setTimeout(() => setCopied(false), 2000);
   }
 };

 const handleDownload = (text: string) => {
   const blob = new Blob([text], { type: 'text/markdown' });
   const url = URL.createObjectURL(blob);
   const a = document.createElement('a');
   a.href = url;
   a.download = `dhanveda_ai_financial_summary_${getTodayString()}.md`;
   a.click();
   URL.revokeObjectURL(url);
   showToast('info', 'Report Exported', 'Downloaded markdown report file.');
 };

 const handleDeleteReport = (id: string) => {
   deleteAIReport(id);
   showToast('info', 'Report Removed', 'Historical assessment report deleted.');
 };

 return (
 <div className="space-y-6 max-w-7xl mx-auto pb-16">
 {/* Hero Overview: Mineral Card with Gold AI Highlight */}
 <div className="relative overflow-hidden rounded-2xl bg-surface text-ink-1 p-3.5 sm:p-8 border border-line shadow-sm">
 <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-reward-fill to-transparent opacity-80" />
 <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
 <div>
 <div className="flex items-center gap-2 mb-2">
 <span className="flex h-6 w-6 items-center justify-center rounded-xl bg-primary-tint text-primary">
 <Sparkles className="h-4 w-4" />
 </span>
 <span className="text-xs font-bold uppercase tracking-wider text-ink-3">
 FINANCIAL HEALTH INTELLIGENCE
 </span>
 </div>
 <p className="text-xs text-ink-3 mb-1">
 Private Client-Side Intelligence Engine
 </p>
 <div className="flex items-baseline gap-3">
 <h2 className="text-3xl sm:text-4xl font-black font-numeric tracking-tight text-ink-1">
 Zero-Telemetry
 </h2>
 <span className="text-sm font-semibold text-positive">
 100% private in-browser
 </span>
 </div>
 <p className="mt-2 text-xs text-ink-3">
 Direct client-to-API inference with Gemini, Claude, or ChatGPT • Zero server-side telemetry
 </p>
 </div>

 <div className="flex flex-wrap items-center gap-3">
 <button
 onClick={handleGenerate}
 disabled={loading}
 className="inline-flex items-center gap-2 rounded-xl bg-primary hover:opacity-95 text-on-primary px-5 py-3 text-sm font-bold shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-slate-900 transition-colors active:scale-[0.98] disabled:opacity-50"
 >
 {loading ? (
 <>
 <RefreshCw className="h-4 w-4 animate-spin" />
 <span>Synthesizing...</span>
 </>
 ) : (
 <>
 <Sparkles className="h-4 w-4 stroke-[2.5]" />
 <span>Generate Health Assessment</span>
 </>
 )}
 </button>
 </div>
 </div>

 {/* 4-column summary strip */}
 <div className="mt-6 grid grid-cols-1 min-[360px]:grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-line">
 <div className="rounded-2xl bg-sunken p-3.5 border border-line">
 <span className="text-xs text-ink-3">Monthly Inflow</span>
 <p className="text-lg font-bold font-numeric text-positive mt-0.5">
 +{formatINR(currentMonthIncome)}
 </p>
 </div>

 <div className="rounded-2xl bg-sunken p-3.5 border border-line">
 <span className="text-xs text-ink-3">Monthly Outflow</span>
 <p className="text-lg font-bold font-numeric text-negative mt-0.5">
 -{formatINR(currentMonthExpense)}
 </p>
 </div>

 <div className="rounded-2xl bg-sunken p-3.5 border border-line">
 <span className="text-xs text-ink-3">Savings Rate</span>
 <p className="text-lg font-bold font-numeric text-ink-1 mt-0.5">
 {safeSavingsRateDisplay}
 </p>
 </div>

 <div className="rounded-2xl bg-sunken p-3.5 border border-line">
 <span className="text-xs text-ink-3">Liquid Runway</span>
 <p className="text-lg font-bold font-numeric text-teal-600 dark:text-teal-400 mt-0.5">
 {safeRunwayDisplay}
 </p>
 </div>
 </div>
 </div>

 {/* Section Header */}
 <div className="flex items-center justify-between">
 <div>
 <h3 className="text-lg font-bold text-ink-1 tracking-tight">
 AI Engine Configuration
 </h3>
 <p className="text-xs text-ink-3">
 Direct client integration. Sent data is strictly high-level aggregates (monthly income/expense, top categories, savings rate, budget velocity); raw transaction descriptions and payee details are never transmitted. Keys are stored locally on this device.
 </p>
 </div>
 <span className="text-xs font-semibold text-positive flex items-center gap-1.5">
 <ShieldCheck className="w-3.5 h-3.5" />
 <span>Zero-Telemetry</span>
 </span>
 </div>

 {/* BYOK Settings Card */}
 <div className="rounded-2xl bg-surface text-ink-1 p-3.5 sm:p-7 border border-line shadow-sm space-y-6">
 {/* Provider Tabs */}
 <div>
 <label className="block text-xs font-bold uppercase tracking-wider text-ink-3 mb-3">
 Select AI Intelligence Engine
 </label>
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
 {(Object.keys(PROVIDER_INFO) as AIProvider[]).map(pKey => {
 const info = PROVIDER_INFO[pKey];
 const isSelected = provider === pKey;

 return (
 <button
 key={pKey}
 type="button"
 onClick={() => {
 setProvider(pKey);
 if (aiSettings.provider === pKey) {
 setApiKey(aiSettings.apiKey || '');
 }
 }}
 className={`press p-4 rounded-2xl text-left border transition-colors duration-200 ${
 isSelected
 ? 'border-line bg-primary-tint ring-1 ring-primary/40'
 : 'border-line bg-sunken hover:border-line-input'
 }`}
 >
 <div className="flex items-center justify-between">
 <span className="font-bold text-sm text-ink-1">
 {info.name}
 </span>
 {pKey === 'gemini' && (
 <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-positive-tint text-positive border border-positive/30">
 FREE TIER
 </span>
 )}
 </div>
 <p className="text-xs text-ink-3 mt-1.5 line-clamp-1">{info.tag}</p>
 </button>
 );
 })}
 </div>
 </div>

 {/* Provider Note & Key input */}
 <div className="p-4 sm:p-5 rounded-2xl bg-sunken border border-line space-y-3.5">
 <div className="flex items-start justify-between gap-2">
 <p className="text-xs text-ink-2 leading-relaxed">
 <span className="font-bold text-ink-1">{selectedProviderInfo.name}: </span>
 {selectedProviderInfo.note}
 </p>
 <a
 href={selectedProviderInfo.link}
 target="_blank"
 rel="noopener noreferrer"
 className="text-xs font-bold text-primary hover:underline flex items-center gap-1 shrink-0 min-h-[44px]"
 >
 <span>Get API Key</span>
 <ExternalLink className="w-3 h-3" />
 </a>
 </div>

 <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
 <div className="relative flex-1">
 <Key className="w-4 h-4 text-ink-3 absolute left-3.5 top-1/2 -translate-y-1/2" />
 <input
 type={showKey ? 'text' : 'password'}
 value={apiKey}
 onChange={e => setApiKey(e.target.value)}
 placeholder={`Paste your ${selectedProviderInfo.name} API Key...`}
 className="w-full pl-10 pr-20 py-2.5 bg-surface border border-line rounded-xl text-xs font-mono text-ink-1 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
 />
 <button
 type="button"
 onClick={() => setShowKey(!showKey)}
 className="absolute right-2 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] flex items-center justify-center text-xs font-semibold text-ink-3 hover:text-ink-1"
 >
 {showKey ? 'Hide' : 'Show'}
 </button>
 </div>

 <button
 onClick={handleSaveKey}
 className="px-5 py-2.5 min-h-[44px] rounded-xl bg-sunken hover:bg-sunken/80 text-ink-1 text-xs font-bold border border-line transition-colors flex items-center justify-center"
 >
 Save Key
 </button>
 </div>
 </div>

 {/* Generate Button & Context Pill */}
 <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-2 border-t border-line">
 <div className="text-xs text-ink-3 flex flex-wrap gap-2 items-center">
 <span>Context:</span>
 <span className="font-semibold text-ink-1 font-numeric">Income: {formatINR(currentMonthIncome)}</span>
 <span>•</span>
 <span className="font-semibold text-ink-1 font-numeric">Expenses: {formatINR(currentMonthExpense)}</span>
 <span>•</span>
 <span className="font-semibold text-positive font-numeric">Savings: {safeSavingsRateDisplay}</span>
 </div>

 <button
 onClick={handleGenerate}
 disabled={loading}
 className="flex items-center justify-center gap-2 px-6 py-3 min-h-[44px] rounded-2xl bg-primary hover:opacity-95 text-on-primary shadow-xs font-extrabold text-xs sm:text-sm shadow-md transition-colors duration-200 active:scale-95 disabled:opacity-50"
 >
 {loading ? (
 <>
 <RefreshCw className="w-4 h-4 animate-spin" />
 <span>Synthesizing Financial Telemetry...</span>
 </>
 ) : (
 <>
 <Sparkles className="w-4 h-4 text-on-primary" />
 <span>Generate Health Assessment</span>
 </>
 )}
 </button>
 </div>

 {errorMsg && (
 <div className="p-4 bg-negative-tint border border-negative/30 rounded-2xl flex items-start gap-3 text-xs text-negative">
 <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-negative" />
 <div className="flex-1">
 <span className="font-bold">Error: </span>
 {errorMsg}
 </div>
 </div>
 )}
 </div>

 {/* Generated Report Card */}
 {activeReport ? (
 <div className="bg-surface rounded-2xl p-6 sm:p-8 shadow-sm border border-line space-y-6">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-line">
 <div>
 <div className="flex items-center gap-2.5">
 <span className="p-2 rounded-xl bg-positive-tint text-positive">
 <CheckCircle className="w-5 h-5" />
 </span>
 <h3 className="text-base sm:text-lg font-bold text-ink-1">
 Latest Financial Health Assessment
 </h3>
 </div>
 <p className="text-xs text-ink-3 mt-1">
 Generated via {activeReport.provider.toUpperCase()} ({activeReport.model}) on {formatDateTime(activeReport.createdAt)}
 </p>
 </div>

 <div className="flex items-center gap-2">
 <button
 onClick={() => handleCopy(activeReport.summaryText)}
 className="flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-xl bg-sunken hover:bg-sunken/80 text-ink-2 text-xs font-semibold transition-colors border border-line"
 title="Copy Markdown"
 >
 <Copy className="w-3.5 h-3.5" />
 <span>{copied ? 'Copied!' : 'Copy'}</span>
 </button>

 <button
 onClick={() => handleDownload(activeReport.summaryText)}
 className="flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-xl bg-sunken hover:bg-sunken/80 text-ink-2 text-xs font-semibold transition-colors border border-line"
 title="Export as Markdown file"
 >
 <Download className="w-3.5 h-3.5" />
 <span>Export MD</span>
 </button>
 </div>
 </div>

 {/* Render Summary Content */}
 <div className="prose dark:prose-invert max-w-none text-sm text-ink-1 leading-relaxed whitespace-pre-wrap font-sans bg-sunken/50 p-6 rounded-2xl border border-line">
 {activeReport.summaryText}
 </div>
 </div>
 ) : (
 <div className="text-center py-12 bg-surface rounded-2xl border border-dashed border-line p-8">
 <Bot className="w-10 h-10 text-ink-3 mx-auto mb-2" />
 <h3 className="text-base font-bold text-ink-1">
 No summary generated yet
 </h3>
 <p className="text-xs text-ink-3 mt-1 max-w-sm mx-auto">
 Choose your AI provider above, paste your API key, and click "Generate Health Assessment".
 </p>
 </div>
 )}

 {/* Report History */}
 {aiReports.length > 1 && (
 <div className="bg-surface rounded-2xl p-6 shadow-sm border border-line">
 <h3 className="text-base font-bold text-ink-1 mb-4">
 Past Reports History ({aiReports.length})
 </h3>
 <div className="divide-y divide-line">
 {aiReports.slice(1).map(rep => (
 <div key={rep.id} className="py-3.5 flex items-center justify-between gap-4">
 <div>
 <p className="text-xs font-bold text-ink-1">
 Summary via {rep.provider.toUpperCase()}
 </p>
 <p className="text-xs text-ink-3 mt-0.5">
 {formatDateTime(rep.createdAt)}
 </p>
 </div>
 <div className="flex items-center gap-2">
 <button
 onClick={() => handleCopy(rep.summaryText)}
 className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-ink-3 hover:text-ink-1 hover:bg-sunken"
 title="Copy"
 >
 <Copy className="w-3.5 h-3.5" />
 </button>
 <button
 onClick={() => handleDeleteReport(rep.id)}
 className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-ink-3 hover:text-negative hover:bg-negative-tint"
 title="Delete"
 >
 <Trash2 className="w-3.5 h-3.5" />
 </button>
 </div>
 </div>
 ))}
 </div>
 </div>
 )}
 </div>
 );
};
