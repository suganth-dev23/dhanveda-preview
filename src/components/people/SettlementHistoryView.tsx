import React, { useState, useMemo } from 'react';
import {
 History,
 Search,
 ArrowDownLeft,
 ArrowUpRight,
 Link as LinkIcon,
 Unlink,
 Edit3,
 Trash2,
 Filter,
 CheckCircle2,
 Receipt,
 FileCheck,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { SettlementRecord, Contact } from '../../types/finance';
import { formatINR } from '../../utils/currency';
import { Money } from '../ui';
import { formatDate } from '../../utils/date';
import { SettleUpModal } from './SettleUpModal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { useToast } from '../../context/ToastContext';

interface SettlementHistoryViewProps {
 onBackToContacts?: () => void;
}

export const SettlementHistoryView: React.FC<SettlementHistoryViewProps> = () => {
 const { showToast } = useToast();
 const [confirmDialog, setConfirmDialog] = useState<{
   isOpen: boolean;
   title: string;
   message: string;
   onConfirm: () => void;
 } | null>(null);
 const {
 settlements,
 contacts,
 transactions,
 deleteSettlement,
 linkSettlementToTransaction,
 } = useFinance();

 const [searchQuery, setSearchQuery] = useState('');
 const [selectedContactId, setSelectedContactId] = useState<string>('all');
 const [linkModalSettlement, setLinkModalSettlement] = useState<{
 settlement: SettlementRecord;
 contact: Contact;
 } | null>(null);

 const contactMap = useMemo(() => {
 return new Map(contacts.map(c => [c.id, c]));
 }, [contacts]);

 const transactionMap = useMemo(() => {
 return new Map(transactions.map(t => [t.id, t]));
 }, [transactions]);

 // Sort settlements reverse chronologically
 const sortedSettlements = useMemo(() => {
 return [...settlements].sort((a, b) => {
 if (b.date !== a.date) return (b.date || '').localeCompare(a.date || '');
 return (b.createdAt || '').localeCompare(a.createdAt || '');
 });
 }, [settlements]);

 const hasUnassignedOrDeleted = useMemo(() => {
 return settlements.some(s => !contactMap.has(s.contactId));
 }, [settlements, contactMap]);

 // Filter settlements
 const filteredSettlements = useMemo(() => {
 return sortedSettlements.filter(s => {
 // Contact filter
 if (selectedContactId !== 'all') {
 if (selectedContactId === 'unassigned') {
 if (contactMap.has(s.contactId)) return false;
 } else if (s.contactId !== selectedContactId) {
 return false;
 }
 }

 // Search query
 if (searchQuery.trim()) {
 const q = searchQuery.toLowerCase();
 const contact = contactMap.get(s.contactId);
 const contactName = (contact ? contact.name : 'Unassigned / Deleted Contact').toLowerCase();
 const note = (s.note || '').toLowerCase();
 const linkedTx = s.linkedTransactionId ? transactionMap.get(s.linkedTransactionId) : null;
 const linkedDesc = linkedTx ? linkedTx.description.toLowerCase() : '';
 const sourceTx = s.sourceTransactionId ? transactionMap.get(s.sourceTransactionId) : null;
 const sourceDesc = sourceTx ? sourceTx.description.toLowerCase() : '';

 const matches =
 contactName.includes(q) ||
 note.includes(q) ||
 linkedDesc.includes(q) ||
 sourceDesc.includes(q) ||
 (s.date || '').includes(q);

 if (!matches) return false;
 }

 return true;
 });
 }, [sortedSettlements, selectedContactId, searchQuery, contactMap, transactionMap]);

 // High-level statistics
 const stats = useMemo(() => {
 const totalAmount = settlements.reduce((sum, s) => sum + s.amount, 0);
 const linkedCount = settlements.filter(s => Boolean(s.linkedTransactionId)).length;
 const linkedPercentage = settlements.length > 0 ? Math.round((linkedCount / settlements.length) * 100) : 0;
 return {
 totalCount: settlements.length,
 totalAmount,
 linkedCount,
 linkedPercentage,
 };
 }, [settlements]);

 const handleDelete = (settlement: SettlementRecord) => {
 const contact = contactMap.get(settlement.contactId);
 const name = contact ? contact.name : 'Unassigned / Deleted Contact';
 setConfirmDialog({
   isOpen: true,
   title: 'Delete Settlement',
   message: `Are you sure you want to delete this settlement of ${formatINR(settlement.amount)} with ${name}? This will restore the open balance.`,
   onConfirm: () => {
     deleteSettlement(settlement.id);
     showToast('info', 'Settlement Deleted', 'Settlement record removed and balance restored.');
   },
 });
 };

 const handleUnlink = (settlementId: string) => {
 setConfirmDialog({
   isOpen: true,
   title: 'Unlink Settlement',
   message: 'Unlink this settlement from the bank transaction?',
   onConfirm: () => {
     linkSettlementToTransaction(settlementId, undefined);
     showToast('info', 'Settlement Unlinked', 'Settlement unlinked from bank transaction.');
   },
 });
 };

 return (
 <div className="space-y-6">
 {/* 3 Summary Stat Cards */}
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
 {/* Total Settled Volume */}
 <div className="bg-surface rounded-2xl p-5 border border-line shadow-sm flex flex-col justify-between space-y-2">
 <div className="flex items-center justify-between">
 <span className="text-xs font-bold uppercase tracking-wider text-ink-3">
 Total Settled Volume
 </span>
 <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
 <History className="w-4 h-4" />
 </div>
 </div>
 <div>
 <Money value={stats.totalAmount} size="2xl" />
 <p className="text-xs text-ink-3 mt-0.5">Across {stats.totalCount} settlements recorded</p>
 </div>
 </div>

 {/* Total Events */}
 <div className="bg-surface rounded-2xl p-5 border border-line shadow-sm flex flex-col justify-between space-y-2">
 <div className="flex items-center justify-between">
 <span className="text-xs font-bold uppercase tracking-wider text-ink-3">
 Settlement Events
 </span>
 <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
 <Receipt className="w-4 h-4" />
 </div>
 </div>
 <div>
 <p className="text-2xl font-black text-ink-1 tracking-tight font-numeric">
 {stats.totalCount} <span className="text-sm font-semibold text-ink-3 font-sans">records</span>
 </p>
 <p className="text-xs text-ink-3 mt-0.5">Cleared shared expense items</p>
 </div>
 </div>

 {/* Linked to Real Transactions */}
 <div className="bg-surface rounded-2xl p-5 border border-line shadow-sm flex flex-col justify-between space-y-2">
 <div className="flex items-center justify-between">
 <span className="text-xs font-bold uppercase tracking-wider text-ink-3">
 Bank Ledger Linked
 </span>
 <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
 <FileCheck className="w-4 h-4" />
 </div>
 </div>
 <div>
 <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight font-numeric">
 {stats.linkedPercentage}% <span className="text-sm font-semibold text-ink-3 font-sans">({stats.linkedCount}/{stats.totalCount})</span>
 </p>
 <p className="text-xs text-ink-3 mt-0.5">Matched with real bank transactions</p>
 </div>
 </div>
 </div>

  {/* Filters Bar */}
 <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface p-4 rounded-2xl border border-line shadow-sm">
 {/* Search */}
 <div className="relative w-full sm:w-80">
 <Search className="w-4 h-4 text-ink-3 absolute left-3.5 top-1/2 -translate-y-1/2" />
 <input
 type="text"
 value={searchQuery}
 onChange={e => setSearchQuery(e.target.value)}
 placeholder="Search by contact, note, or transaction..."
 className="w-full pl-9 pr-4 py-2 bg-sunken border border-line rounded-xl text-xs font-medium text-ink-1 focus:outline-none"
 />
 </div>

 {/* Contact Dropdown Filter */}
 <div className="flex items-center gap-2 w-full sm:w-auto">
 <div className="flex items-center gap-1.5 w-full sm:w-auto">
 <Filter className="w-3.5 h-3.5 text-ink-3" />
 <select
 value={selectedContactId}
 onChange={e => setSelectedContactId(e.target.value)}
 className="w-full sm:w-48 bg-sunken border border-line rounded-xl px-3 py-2 text-xs font-bold text-ink-1 focus:outline-none"
 >
 <option value="all">All Contacts ({contacts.length})</option>
 {contacts.map(c => (
 <option key={c.id} value={c.id}>
 {c.name}
 </option>
 ))}
 {hasUnassignedOrDeleted && (
 <option value="unassigned">Unassigned / Deleted Contacts</option>
 )}
 </select>
 </div>
 </div>
 </div>

 {/* Settlements List */}
 <div className="space-y-3">
 {filteredSettlements.length === 0 ? (
 <div className="text-center py-12 bg-surface rounded-2xl border border-dashed border-line p-8">
 <div className="w-12 h-12 rounded-full bg-sunken flex items-center justify-center mx-auto text-ink-3">
 <History className="w-6 h-6" />
 </div>
 <h3 className="mt-3 text-base font-bold text-ink-1">
 {settlements.length === 0 ? 'No settlements recorded yet' : 'No settlements matching filters'}
 </h3>
 <p className="text-xs text-ink-3 mt-1 max-w-sm mx-auto">
 When you settle up with friends or tick split expenses as paid, the full repayment history will appear here.
 </p>
 </div>
 ) : (
 filteredSettlements.map(settlement => {
 const contact = contactMap.get(settlement.contactId);
 const contactName = contact ? contact.name : 'Unassigned / Deleted Contact';

 const sourceTx = settlement.sourceTransactionId
 ? transactionMap.get(settlement.sourceTransactionId)
 : null;

 const linkedTx = settlement.linkedTransactionId
 ? transactionMap.get(settlement.linkedTransactionId)
 : null;

 // Determine if this was a repayment to the user or by the user
 let isTheyPaidMe = true;
 if (settlement.direction) {
 isTheyPaidMe = settlement.direction === 'they_owe_me';
 } else if (sourceTx && sourceTx.splitWith) {
 const entry = sourceTx.splitWith.find(
 e => e.id === settlement.sourceSplitEntryId || e.contactId === settlement.contactId
 );
 if (entry) {
 isTheyPaidMe = entry.direction === 'they_owe_me';
 }
 } else if (linkedTx) {
 isTheyPaidMe = linkedTx.type === 'credit';
 }

 return (
 <div
 key={settlement.id}
 className="bg-surface p-4 sm:p-5 rounded-2xl border border-line shadow-sm transition-colors hover:border-slate-300 dark:hover:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
 >
 {/* Left: Contact, Direction, Note, Original Expense */}
 <div className="flex items-start gap-3.5 min-w-0">
 <div
 className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 font-bold ${
 isTheyPaidMe
 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-500/20'
 : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-500/20'
 }`}
 >
 {isTheyPaidMe ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
 </div>

 <div className="min-w-0 space-y-1">
 <div className="flex items-center gap-2 flex-wrap">
 <span className="font-extrabold text-sm text-ink-1">
 {isTheyPaidMe ? `${contactName} paid you` : `You paid ${contactName}`}
 </span>

 <span className="text-xs font-medium text-ink-3">
 • {formatDate(settlement.date)}
 </span>
 </div>

 {settlement.note && (
 <p className="text-xs text-ink-3">
 {settlement.note}
 </p>
 )}

 {/* Source Expense Tag */}
 {sourceTx && (
 <div className="flex items-center gap-1.5 text-xs text-ink-3">
 <Receipt className="w-3 h-3 text-indigo-500 flex-shrink-0" />
 <span className="truncate">
 Original expense: <span className="font-semibold text-ink-2">{sourceTx.description}</span> (<Money value={sourceTx.amount} size="xs" />)
 </span>
 </div>
 )}
 </div>
 </div>

 {/* Right: Amount & Bank Ledger Link Badge */}
 <div className="flex flex-col sm:items-end justify-between sm:justify-center gap-2 flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-line">
 <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
 <Money
 value={settlement.amount}
 size="sm"
 tone="positive"
 />

 <button
 onClick={() => {
 if (contact) {
 setLinkModalSettlement({ settlement, contact });
 }
 }}
 className="p-1.5 text-ink-3 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl transition-colors"
 title="Edit settlement details"
 >
 <Edit3 className="w-3.5 h-3.5" />
 </button>

 <button
 onClick={() => handleDelete(settlement)}
 className="p-1.5 text-ink-3 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors"
 title="Delete settlement record"
 >
 <Trash2 className="w-3.5 h-3.5" />
 </button>
 </div>

 {/* Linked Bank Transaction Status */}
 <div>
 {linkedTx ? (
 <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 text-xs">
 <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
 <span className="font-medium text-emerald-900 dark:text-emerald-300 truncate max-w-xs">
 Linked: {linkedTx.description} (<Money value={linkedTx.amount} size="xs" />)
 </span>
 <button
 type="button"
 onClick={() => handleUnlink(settlement.id)}
 className="ml-1 text-ink-3 hover:text-rose-600"
 title="Unlink from transaction"
 >
 <Unlink className="w-3 h-3" />
 </button>
 </div>
 ) : (
 <button
 type="button"
 onClick={() => {
 if (contact) {
 setLinkModalSettlement({ settlement, contact });
 }
 }}
 className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-sunken hover:bg-line text-xs font-bold text-ink-2 transition-colors border border-line"
 title="Link to a bank credit/debit transaction"
 >
 <LinkIcon className="w-3 h-3 text-ink-3" />
 <span>Link to Bank Txn</span>
 </button>
 )}
 </div>
 </div>
 </div>
 );
 })
 )}
 </div>

 {/* Modal for Linking an existing settlement */}
 {linkModalSettlement && (
 <SettleUpModal
 isOpen={true}
 onClose={() => setLinkModalSettlement(null)}
 contact={linkModalSettlement.contact}
 suggestedAmount={linkModalSettlement.settlement.amount}
 initialSettlement={linkModalSettlement.settlement}
 />
 )}
 
      <ConfirmDialog
        isOpen={Boolean(confirmDialog?.isOpen)}
        title={confirmDialog?.title || 'Confirm Action'}
        message={confirmDialog?.message || ''}
        confirmLabel="Confirm"
        variant="danger"
        onConfirm={() => {
          if (confirmDialog?.onConfirm) confirmDialog.onConfirm();
          setConfirmDialog(null);
        }}
        onCancel={() => setConfirmDialog(null)}
      />
</div>
 );
};
