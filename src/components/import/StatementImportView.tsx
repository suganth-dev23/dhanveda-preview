import React, { useState, useRef } from 'react';
import {
 UploadCloud,
 FileSpreadsheet,
 FileText,
 AlertCircle,
 CheckCircle2,
 ArrowRight,
 Download,
 RefreshCw,
 FileCheck,
 SlidersHorizontal,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { useToast } from '../../context/ToastContext';
import { StagedTransaction } from '../../types/finance';
import { parseCSVStatement } from '../../utils/csvParser';
import { parsePDFStatement } from '../../utils/pdfParser';
import { flagDuplicates } from '../../utils/deduplicator';
import { sanitizeDateString, getTodayString } from '../../utils/date';
import { roundCurrency } from '../../utils/currency';
import { getCustomAutoRules, suggestCategory } from '../../utils/categoryMatcher';
import { ReviewStagingTable } from './ReviewStagingTable';
import { AutoRuleManagerModal } from './AutoRuleManagerModal';

export const StatementImportView: React.FC = () => {
 const {
 transactions,
 categories,
 addMultipleTransactions,
 setCurrentView,
 } = useFinance();
 const { showToast } = useToast();

 const fileInputRef = useRef<HTMLInputElement | null>(null);

 const [isDragging, setIsDragging] = useState(false);
 const [parsing, setParsing] = useState(false);
 const [pdfProgress, setPdfProgress] = useState<{ page: number; totalPages: number } | null>(null);
 const [parseError, setParseError] = useState<string | null>(null);
 const [stagedList, setStagedList] = useState<StagedTransaction[] | null>(null);
 const [fileName, setFileName] = useState<string>('');
 const [successMessage, setSuccessMessage] = useState<string | null>(null);
 const [isAutoRuleModalOpen, setIsAutoRuleModalOpen] = useState<boolean>(false);

 const handleFileProcess = async (file: File) => {
 if (!file) return;
 const isCsv = file.name.endsWith('.csv') || file.type.includes('csv');
 const isPdf = file.name.endsWith('.pdf') || file.type.includes('pdf');

 if (!isCsv && !isPdf) {
 const err = 'Please upload a valid .CSV or .PDF statement file.';
 setParseError(err);
 showToast('danger', 'Unsupported File', err);
 return;
 }

 setParsing(true);
 setPdfProgress(null);
 setParseError(null);
 setFileName(file.name);

 try {
 let rawParsed: StagedTransaction[] = [];

 if (isCsv) {
 const result = await parseCSVStatement(file);
 if (result.errors.length > 0 && result.transactions.length === 0) {
 throw new Error(result.errors.join(', '));
 }
 rawParsed = result.transactions;
 } else {
 const result = await parsePDFStatement(file, progress => {
 setPdfProgress(progress);
 });
 if (result.errors.length > 0 && result.transactions.length === 0) {
 throw new Error(result.errors.join(', '));
 }
 rawParsed = result.transactions;
 }

 if (rawParsed.length === 0) {
 throw new Error('No transaction rows could be extracted from this document. Please check the file format or try a CSV statement.');
 }

 // Check duplicates against existing state
 const flagged = flagDuplicates(rawParsed, transactions);
 setStagedList(flagged);
 showToast('success', 'Statement Parsed', `${flagged.length} transactions ready for review`, 3000);
 } catch (err: any) {
 const msg = err?.message || 'Failed to parse file.';
 setParseError(msg);
 showToast('danger', 'Import Failed', msg, 6000);
 } finally {
 setParsing(false);
 setPdfProgress(null);
 }
 };

 const handleDrop = (e: React.DragEvent) => {
 e.preventDefault();
 setIsDragging(false);
 if (e.dataTransfer.files && e.dataTransfer.files[0]) {
 handleFileProcess(e.dataTransfer.files[0]);
 }
 };

 const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
 if (e.target.files && e.target.files[0]) {
 handleFileProcess(e.target.files[0]);
 }
 };

 const handleToggleSelect = (tempId: string) => {
 setStagedList(prev =>
 prev ? prev.map(t => (t.tempId === tempId ? { ...t, selected: !t.selected } : t)) : null
 );
 };

 const handleToggleSelectAll = () => {
 setStagedList(prev => {
 if (!prev) return null;
 const allSelected = prev.every(t => t.selected);
 return prev.map(t => ({ ...t, selected: !allSelected }));
 });
 };

 const handleUpdateRow = (tempId: string, updated: Partial<StagedTransaction>) => {
  setStagedList(prev =>
    prev
      ? prev.map(t =>
          t.tempId === tempId
            ? {
                ...t,
                ...updated,
                // If user manually altered description, amount, or date, clear duplicate flag
                ...(updated.description !== undefined || updated.amount !== undefined || updated.date !== undefined
                  ? { isDuplicate: false, duplicateReason: undefined }
                  : {}),
              }
            : t
        )
      : null
  );
 };

 const handleRulesUpdated = () => {
  setStagedList(prev => {
    if (!prev || prev.length === 0) return prev;
    const rules = getCustomAutoRules();
    return prev.map(row => {
      const match = suggestCategory(row.description, rules);
      return {
        ...row,
        category: match.category !== 'Others' ? match.category : row.category,
        paymentMethod: match.paymentMethod ?? row.paymentMethod,
        type: match.suggestedType ?? row.type,
      };
    });
  });
  showToast('info', 'Rules Applied', 'Re-categorized staged transactions with updated rules', 2500);
 };

 const handleRemoveRow = (tempId: string) => {
 setStagedList(prev => (prev ? prev.filter(t => t.tempId !== tempId) : null));
 };

 const handleExcludeDuplicates = () => {
 setStagedList(prev =>
 prev ? prev.map(t => (t.isDuplicate ? { ...t, selected: false } : t)) : null
 );
 };

 const handleInvertAllTypes = () => {
 setStagedList(prev =>
 prev ? prev.map(t => ({
 ...t,
 type: t.type === 'credit' ? 'debit' : 'credit',
 })) : null
 );
  showToast('info', 'Flipped Transaction Types', 'Inverted inflow (credit) and outflow (debit) across all staged rows', 3000);
 };

 const handleRemoveSelected = () => {
  setStagedList(prev => (prev ? prev.filter(t => !t.selected) : null));
  showToast('info', 'Rows Excluded', 'Excluded selected rows from staging', 3000);
 };

 const handleBulkSetCategory = (catName: string) => {
  setStagedList(prev =>
   prev ? prev.map(t => (t.selected ? { ...t, category: catName } : t)) : null
  );
  showToast('success', 'Categories Updated', `Updated category to "${catName}" for selected transactions`, 3000);
 };

 const handleFinalImport = () => {
  if (!stagedList) return;
  const selected = stagedList.filter(t => t.selected);

  if (selected.length === 0) {
   alert('Please select at least one transaction row to import.');
   return;
  }

  const invalidRow = selected.find(s => isNaN(s.amount) || s.amount <= 0);
  if (invalidRow) {
   alert('All transactions to import must have an amount greater than ₹0.');
   return;
  }

  const payload = selected.map(s => ({
   date: sanitizeDateString(s.date) || getTodayString(),
   amount: roundCurrency(s.amount),
   type: s.type,
   category: s.category,
   paymentMethod: s.paymentMethod,
   description: s.description.trim() || 'Imported Transaction',
   source: 'imported' as const,
   referenceId: s.referenceId,
  }));

  addMultipleTransactions(payload);
  showToast('success', 'Import Successful', `Imported ${selected.length} transactions into your ledger`, 4000);
  setSuccessMessage(`Successfully imported ${selected.length} transactions!`);
  setStagedList(null);
  setTimeout(() => {
   setCurrentView('transactions');
  }, 1500);
 };

 const handleDownloadSampleCSV = () => {
 const sampleCsv = `Date,Narration,Chq/Ref Number,Withdrawal Amt,Deposit Amt,Balance
2026-08-28,UPI-SWIGGY-19283 Bangalore,UPI-89218273,480.00,,45200.00
2026-08-27,ZEPTO INSTANT GROCERIES,UPI-98218281,640.00,,45680.00
2026-08-26,HDFC SALARY TECH CORP,ACH-098219,,145000.00,46320.00
2026-08-25,ZERODHA BROKING SIP,ACH-981291,15000.00,,191320.00
2026-08-24,HP PETROL PUMP WHITEFIELD,POS-882199,2400.00,,206320.00
2026-08-23,AMAZON PAY INDIA E-COM,ECOM-44812,3850.00,,208720.00
2026-08-22,CRED CARD REWARD CASHBACK,CRED-99812,,1250.00,212570.00
2026-08-20,NETFLIX INDIA STREAMING,ECOM-0012,649.00,,211320.00`;

 const blob = new Blob([sampleCsv], { type: 'text/csv;charset=utf-8;' });
 const url = URL.createObjectURL(blob);
 const a = document.createElement('a');
 a.href = url;
 a.download = 'sample_indian_bank_statement.csv';
 a.click();
 URL.revokeObjectURL(url);
 };

 return (
 <div className="space-y-6 max-w-7xl mx-auto pb-16">
 {/* Hero Overview: Mineral Card with Gold Import Highlight */}
 <div className="relative overflow-hidden rounded-2xl bg-surface text-ink-1 p-6 sm:p-8 border border-line shadow-sm">
 <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-reward-fill to-transparent opacity-80" />
 <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
 <div>
 <div className="flex items-center gap-2 mb-2">
 <span className="flex h-6 w-6 items-center justify-center rounded-xl bg-primary-tint text-primary">
 <UploadCloud className="h-4 w-4" />
 </span>
 <span className="text-xs font-bold uppercase tracking-wider text-ink-3">
 STATEMENT IMPORT ENGINE
 </span>
 </div>
 <p className="text-xs text-ink-3 mb-1">
 Bank &amp; UPI Statement Parser
 </p>
 <div className="flex items-baseline gap-3">
 <h2 className="text-3xl sm:text-4xl font-black font-numeric tracking-tight text-ink-1">
 Statement Center
 </h2>
 <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
 zero server upload
 </span>
 </div>
 <p className="mt-2 text-xs text-ink-3">
 Private web-worker statement extraction for HDFC, SBI, ICICI, Axis, Kotak, GPay, PhonePe &amp; Paytm
 </p>
 </div>

 <div className="flex flex-wrap items-center gap-3">
 <button
 onClick={() => setIsAutoRuleModalOpen(true)}
 className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-sunken hover:bg-line text-ink-2 border border-line text-xs sm:text-sm font-bold transition-colors"
 title="Manage keyword and regex auto-categorization rules"
 >
 <SlidersHorizontal className="w-4 h-4 text-primary" />
 <span>Auto-Rules</span>
 </button>
 <button
 onClick={handleDownloadSampleCSV}
 className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-sunken hover:bg-line text-ink-2 border border-line text-xs sm:text-sm font-bold transition-colors"
 title="Download a test CSV statement to verify parsing"
 >
 <Download className="w-4 h-4 text-reward" />
 <span>Download Sample CSV</span>
 </button>
 </div>
 </div>

 {/* 4-column summary strip */}
 <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-line">
 <div className="rounded-2xl bg-sunken p-3.5 border border-line/60">
 <span className="text-xs text-ink-3">Formats Supported</span>
 <p className="text-lg font-bold font-numeric text-ink-1 mt-0.5">CSV &amp; PDF</p>
 </div>
 <div className="rounded-2xl bg-sunken p-3.5 border border-line/60">
 <span className="text-xs text-ink-3">Privacy Architecture</span>
 <p className="text-lg font-bold font-numeric text-emerald-600 dark:text-emerald-400 mt-0.5">100% Client-Side</p>
 </div>
 <div className="rounded-2xl bg-sunken p-3.5 border border-line/60">
 <span className="text-xs text-ink-3">Parser Pipeline</span>
 <p className="text-lg font-bold font-numeric text-teal-600 dark:text-teal-400 mt-0.5">Web Worker</p>
 </div>
 <div className="rounded-2xl bg-sunken p-3.5 border border-line/60">
 <span className="text-xs text-ink-3">Duplicate Check</span>
 <p className="text-lg font-bold font-numeric text-ink-1 mt-0.5">Active Hash</p>
 </div>
 </div>
 </div>

 {/* Section Header */}
 <div className="flex items-center justify-between">
 <div>
 <h3 className="text-lg font-bold text-ink-1 tracking-tight">
 Upload Bank Statement
 </h3>
 <p className="text-xs text-ink-3">
 Drag &amp; drop your statement document or click to browse
 </p>
 </div>
 <span className="text-xs font-semibold text-ink-3">
 CSV / PDF supported
 </span>
 </div>

 {/* Success Notification */}
 {successMessage && (
 <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-3 text-sm text-emerald-600 dark:text-emerald-400 font-bold">
 <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
 <span>{successMessage} Redirecting to transaction history...</span>
 </div>
 )}

 {/* Parse Error Alert */}
 {parseError && (
 <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-start gap-3 text-xs text-rose-600 dark:text-rose-300 font-medium">
 <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-500" />
 <div>
 <span className="font-bold">Parsing Error: </span>
 {parseError}
 </div>
 </div>
 )}

 {/* Drop Zone Area */}
 {!stagedList && (
 <div
 onDragOver={e => {
 e.preventDefault();
 setIsDragging(true);
 }}
 onDragLeave={() => setIsDragging(false)}
 onDrop={handleDrop}
 onClick={() => fileInputRef.current?.click()}
 className={`border-2 border-dashed rounded-2xl p-10 sm:p-14 text-center cursor-pointer transition-colors duration-200 ${
 isDragging
 ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 scale-[1.01]'
 : 'border-line bg-surface hover:border-emerald-500 shadow-sm'
 }`}
 >
 <input
 ref={fileInputRef}
 type="file"
 accept=".csv, .pdf, text/csv, application/pdf"
 onChange={handleFileInputChange}
 className="hidden"
 />

 <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400 transition-transform group-hover:scale-110">
 {parsing ? (
 <RefreshCw className="w-8 h-8 text-emerald-600 dark:text-emerald-400 animate-spin" />
 ) : (
 <UploadCloud className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
 )}
 </div>

 <h3 className="mt-4 text-base sm:text-lg font-bold text-ink-1">
 {parsing
 ? pdfProgress
 ? `Extracting Page ${pdfProgress.page} of ${pdfProgress.totalPages}...`
 : 'Parsing statement off main thread...'
 : 'Click to Upload or Drag & Drop Statement'}
 </h3>

 {pdfProgress && (
 <div className="max-w-xs mx-auto mt-3 space-y-1.5">
 <div className="flex justify-between text-xs text-ink-3 font-semibold font-numeric">
 <span>Progress</span>
 <span>{Math.round((pdfProgress.page / pdfProgress.totalPages) * 100)}%</span>
 </div>
 <div
 className="w-full bg-sunken h-2 rounded-full overflow-hidden p-0.5"
 role="progressbar"
 aria-valuenow={Math.round((pdfProgress.page / pdfProgress.totalPages) * 100)}
 aria-valuemin={0}
 aria-valuemax={100}
 aria-label="PDF statement parsing progress"
 >
 <div
 className="bg-emerald-500 h-full rounded-full transition-[width] duration-200"
 style={{ width: `${(pdfProgress.page / pdfProgress.totalPages) * 100}%` }}
 />
 </div>
 </div>
 )}

 <p className="mt-2 text-xs text-ink-3 max-w-md mx-auto">
 Supports HDFC, ICICI, SBI, Axis, Kotak, GPay, PhonePe, Paytm, and standard Indian bank export formats (.CSV / .PDF)
 </p>

 <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
 <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-sunken text-ink-2 border border-line">
 <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
 <span>CSV Statements</span>
 </span>
 <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-sunken text-ink-2 border border-line">
 <FileText className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
 <span>PDF Statements (Web Worker)</span>
 </span>
 </div>
 </div>
 )}

 {/* Review & Fix Staging Screen */}
 {stagedList && (
 <div className="space-y-4">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-6 rounded-2xl border border-line shadow-sm">
 <div className="flex items-center gap-3.5">
 <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
 <FileCheck className="w-6 h-6" />
 </div>
 <div>
 <h3 className="text-base sm:text-lg font-bold text-ink-1">
 Review & Fix Transactions: <span className="text-emerald-600 dark:text-emerald-400">{fileName}</span>
 </h3>
 <p className="text-xs text-ink-3 mt-0.5">
 Verify dates, categories, and amounts before finalizing import
 </p>
 </div>
 </div>

 <div className="flex items-center gap-3">
 <button
 type="button"
 onClick={() => setStagedList(null)}
 className="px-4 py-2.5 rounded-xl text-xs font-semibold text-ink-2 hover:bg-sunken transition-colors"
 >
 Cancel / Upload Another
 </button>

 <button
 type="button"
 onClick={handleFinalImport}
 className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-primary hover:opacity-95 text-on-primary shadow-xs text-xs sm:text-sm font-extrabold shadow-sm transition-colors active:scale-95"
 >
 <span>Commit & Import Selected</span>
 <ArrowRight className="w-4 h-4" />
 </button>
 </div>
 </div>

 <ReviewStagingTable
  stagedList={stagedList}
  categories={categories}
  onToggleSelect={handleToggleSelect}
  onToggleSelectAll={handleToggleSelectAll}
  onUpdateRow={handleUpdateRow}
  onRemoveRow={handleRemoveRow}
  onExcludeDuplicates={handleExcludeDuplicates}
  onInvertAllTypes={handleInvertAllTypes}
  onRemoveSelected={handleRemoveSelected}
  onBulkSetCategory={handleBulkSetCategory}
 />
 </div>
 )}

 <AutoRuleManagerModal
  isOpen={isAutoRuleModalOpen}
  onClose={() => setIsAutoRuleModalOpen(false)}
  categories={categories}
  onRulesUpdated={handleRulesUpdated}
 />
 </div>
 );
};
