import React, { useState, useMemo } from 'react';
import {
 Users,
 UserPlus,
 Search,
 CheckCircle2,
 Circle,
 HandCoins,
 Edit3,
 Trash2,
 ChevronDown,
 ChevronUp,
 Receipt,
 History,
 Check,
 Link as LinkIcon,
 X,
 Plus,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { Contact, Transaction, SplitEntry, SettlementRecord } from '../../types/finance';
import { Money } from '../ui';
import { formatDate } from '../../utils/date';
import { roundCurrency } from '../../utils/currency';
import { EmptyState } from '../common/EmptyState';
import { SettleUpModal } from './SettleUpModal';
import { EditSplitModal } from './EditSplitModal';
import { AddContactModal } from './AddContactModal';
import { SettlementHistoryView } from './SettlementHistoryView';
import { SettleSplitModal } from './SettleSplitModal';
import { TransactionModal } from '../transactions/TransactionModal';

export const PeopleView: React.FC = () => {
 const {
 contacts,
 transactions,
 settlements,
 contactBalances,
 totalOwedToMe,
 totalIOwe,
 addContact,
 deleteContact,
 deleteSettlement,
 quickToggleSettleTransaction,
 assignSplitToContact,
 linkSettlementToTransaction,
 } = useFinance();

 const [activeTab, setActiveTab] = useState<'contacts' | 'history'>('contacts');
 const [expandedContactId, setExpandedContactId] = useState<string | null>(null);
 const [searchQuery, setSearchQuery] = useState('');
 const [filterType, setFilterType] = useState<'all' | 'they_owe_me' | 'i_owe_them' | 'settled'>('all');

 // Modals state
 const [isAddContactOpen, setIsAddContactOpen] = useState(false);
 const [splitModalContact, setSplitModalContact] = useState<Contact | null>(null);
 const [settleContact, setSettleContact] = useState<{
 contact: Contact;
 amount: number;
 settlement?: SettlementRecord;
 } | null>(null);
 const [editingSplitItem, setEditingSplitItem] = useState<{ tx: Transaction; split: SplitEntry } | null>(null);
 const [settleSplitTarget, setSettleSplitTarget] = useState<{
 contact: Contact;
 tx: Transaction;
 split: SplitEntry;
 } | null>(null);
 const [isSettledSectionOpen, setIsSettledSectionOpen] = useState(false);

 // Quick-tick auto-settle link suggestion prompt state
 const [linkSuggestionPrompt, setLinkSuggestionPrompt] = useState<{
 settlementId: string;
 transaction: Transaction;
 contactName: string;
 } | null>(null);

 // Map balances for quick lookup
 const balanceMap = useMemo(() => {
 return new Map(contactBalances.map(b => [b.contactId, b.netAmount]));
 }, [contactBalances]);

 const transactionMap = useMemo(() => {
 return new Map(transactions.map(t => [t.id, t]));
 }, [transactions]);

 const handleDeleteContact = (contact: Contact) => {
 const bal = balanceMap.get(contact.id) || 0;
 const hasUnsettled = Math.abs(bal) > 0.01;
 const unsettledWarning = hasUnsettled
 ? `\n\n⚠️ WARNING: "${contact.name}" has an unsettled balance of ₹${Math.abs(bal).toFixed(2)} (${bal > 0 ? 'they owe you' : 'you owe them'})!\n`
 : '';
 const confirmMsg = `Are you sure you want to delete "${contact.name}"?${unsettledWarning}\nAll their split entries will be unlinked (preserved in Unassigned Splits) and their settlement history will be removed. This cannot be undone.`;

 if (window.confirm(confirmMsg)) {
 deleteContact(contact.id);
 }
 };

 // Split contacts into active (non-zero balance) and settled (zero balance)
 const { activeContacts, settledContacts } = useMemo(() => {
 const active: Contact[] = [];
 const settled: Contact[] = [];

 contacts.forEach(c => {
 const bal = balanceMap.get(c.id) || 0;
 if (Math.abs(bal) > 0.01) {
 active.push(c);
 } else {
 settled.push(c);
 }
 });

 // Sort active by absolute balance descending
 active.sort((a, b) => {
 const balA = Math.abs(balanceMap.get(a.id) || 0);
 const balB = Math.abs(balanceMap.get(b.id) || 0);
 return balB - balA;
 });

 return { activeContacts: active, settledContacts: settled };
 }, [contacts, balanceMap]);

 // Filter contacts by search and filterType
 const filteredActiveContacts = useMemo(() => {
 return activeContacts.filter(c => {
 const bal = balanceMap.get(c.id) || 0;
 const matchesSearch =
 c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
 (c.notes && c.notes.toLowerCase().includes(searchQuery.toLowerCase()));

 if (!matchesSearch) return false;

 if (filterType === 'they_owe_me') return bal > 0;
 if (filterType === 'i_owe_them') return bal < 0;
 if (filterType === 'settled') return false;
 return true;
 });
 }, [activeContacts, balanceMap, searchQuery, filterType]);

 const filteredSettledContacts = useMemo(() => {
 return settledContacts.filter(c => {
 return (
 c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
 (c.notes && c.notes.toLowerCase().includes(searchQuery.toLowerCase()))
 );
 });
 }, [settledContacts, searchQuery]);

 // Identify all splits that are NOT linked to an existing contact
 const contactIdsSet = useMemo(() => new Set(contacts.map(c => c.id)), [contacts]);

 const unassignedSplits = useMemo(() => {
 const list: { tx: Transaction; split: SplitEntry }[] = [];
 transactions.forEach(tx => {
 if (tx.splitWith && Array.isArray(tx.splitWith)) {
 tx.splitWith.forEach(split => {
 if (!split.contactId || !contactIdsSet.has(split.contactId)) {
 list.push({ tx, split });
 }
 });
 }
 });
 // Sort descending by transaction date
 list.sort((a, b) => (b.tx.date || '').localeCompare(a.tx.date || ''));
 return list;
 }, [transactions, contactIdsSet]);

 const unassignedTotals = useMemo(() => {
 let owedToMe = 0;
 let iOwe = 0;
 unassignedSplits.forEach(({ split }) => {
 const settledAmt = split.settled
 ? (split.settledAmount !== undefined ? split.settledAmount : split.amount)
 : (split.settledAmount || 0);
 const remaining = Math.max(0, split.amount - settledAmt);
 if (remaining > 0) {
 if (split.direction === 'they_owe_me') {
 owedToMe += remaining;
 } else {
 iOwe += remaining;
 }
 }
 });
 return {
 owedToMe: roundCurrency(owedToMe),
 iOwe: roundCurrency(iOwe),
 net: roundCurrency(owedToMe - iOwe),
 };
 }, [unassignedSplits]);

 const filteredUnassignedSplits = useMemo(() => {
 return unassignedSplits.filter(({ tx, split }) => {
 const label = (split.label || 'Unnamed Person').toLowerCase();
 const desc = tx.description.toLowerCase();
 const matchesSearch =
 label.includes(searchQuery.toLowerCase()) ||
 desc.includes(searchQuery.toLowerCase());
 if (!matchesSearch) return false;

 if (filterType === 'they_owe_me') return !split.settled && split.direction === 'they_owe_me';
 if (filterType === 'i_owe_them') return !split.settled && split.direction === 'i_owe_them';
 if (filterType === 'settled') return Boolean(split.settled);
 return true;
 });
 }, [unassignedSplits, searchQuery, filterType]);

 const handleAssignSplit = (
 txId: string,
 splitId: string,
 targetContactId: string,
 fallbackLabel?: string
 ) => {
 if (targetContactId === '__new__') {
 const name = fallbackLabel?.replace(/\(unnamed\)/i, '').trim() || 'New Friend';
 const created = addContact({ name });
 assignSplitToContact(txId, splitId, created.id);
 } else if (targetContactId) {
 assignSplitToContact(txId, splitId, targetContactId);
 }
 };

 const netOverall = roundCurrency(totalOwedToMe - totalIOwe);

 // Handle quick tick auto-settle with link suggestion prompt
 const handleQuickTickSettle = (tx: Transaction, split: SplitEntry, contact: Contact) => {
 const createdSettlement = quickToggleSettleTransaction(tx.id, split.id);

 if (createdSettlement) {
 // Find candidate matching transactions
 const targetType = split.direction === 'they_owe_me' ? 'credit' : 'debit';
 const targetAmount = split.amount;
 const splitDateMs = new Date(tx.date).getTime();
 const alreadyLinkedTxIds = new Set(settlements.map(s => s.linkedTransactionId).filter(Boolean));

 const matches = transactions.filter(t => {
 if (t.id === tx.id) return false;
 if (t.type !== targetType) return false;
 if (alreadyLinkedTxIds.has(t.id)) return false;
 if (Math.abs(t.amount - targetAmount) > 0.01) return false;

 // Date proximity within 7 days
 const txDateMs = new Date(t.date).getTime();
 const diffDays = Math.abs(txDateMs - splitDateMs) / (1000 * 60 * 60 * 24);
 return diffDays <= 7;
 });

 if (matches.length === 1) {
 setLinkSuggestionPrompt({
 settlementId: createdSettlement.id,
 transaction: matches[0],
 contactName: contact.name,
 });
 } else {
 setLinkSuggestionPrompt(null);
 }
 } else {
 setLinkSuggestionPrompt(null);
 }
 };

 return (
 <div className="space-y-6 max-w-7xl mx-auto pb-16">
 {/* Hero Overview: Single Unified Master Mineral Card */}
 <div className="relative overflow-hidden rounded-2xl bg-surface text-ink-1 p-4 sm:p-8 border border-line shadow-sm">
 <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-reward-fill to-transparent opacity-80" />

 <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
 <div>
 <div className="flex items-center gap-2 mb-2">
 <span className="flex h-6 w-6 items-center justify-center rounded-xl bg-primary-tint text-primary">
 <Users className="h-4 w-4" />
 </span>
 <span className="text-xs font-bold uppercase tracking-wider text-ink-3">
 PEOPLE &amp; SHARED BALANCES
 </span>
 </div>
 <p className="text-xs text-ink-3 mb-1">
 Net Peer Aggregate Balance
 </p>
 <div className="flex items-baseline gap-3">
 <Money value={netOverall} size="2xl" tone={netOverall >= 0 ? 'positive' : 'negative'} sign="always" />
 <span
 className={`text-sm font-semibold ${
 netOverall > 0
 ? 'text-emerald-600 dark:text-emerald-400'
 : netOverall < 0
 ? 'text-rose-600 dark:text-rose-400'
 : 'text-ink-3'
 }`}
 >
 {netOverall > 0 ? 'in your favor' : netOverall < 0 ? 'you owe overall' : 'all accounts square'}
 </span>
 </div>
 <p className="mt-2 text-xs text-ink-3">
 {activeContacts.length} active peer accounts with open balances • {settledContacts.length} friends settled
 </p>
 </div>

 {/* Tab Switcher & CTA */}
 <div className="flex flex-wrap items-center gap-3">
 <div className="flex items-center bg-sunken p-1 rounded-2xl text-xs font-bold border border-line">
 <button
 onClick={() => setActiveTab('contacts')}
 className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-colors ${
 activeTab === 'contacts'
 ? 'bg-surface text-ink-1 shadow-xs'
 : 'text-ink-3 hover:text-slate-900 dark:hover:text-white'
 }`}
 >
 <Users className="w-3.5 h-3.5" />
 <span>Contacts</span>
 </button>

 <button
 onClick={() => setActiveTab('history')}
 className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-colors ${
 activeTab === 'history'
 ? 'bg-surface text-ink-1 shadow-xs'
 : 'text-ink-3 hover:text-slate-900 dark:hover:text-white'
 }`}
 >
 <History className="w-3.5 h-3.5 text-emerald-600" />
 <span>History</span>
 {settlements.length > 0 && (
 <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs">
 {settlements.length}
 </span>
 )}
 </button>
 </div>

 <button
 onClick={() => setIsAddContactOpen(true)}
 className="inline-flex items-center gap-2 rounded-xl bg-primary hover:opacity-95 text-on-primary px-5 py-3 text-sm font-bold shadow-sm transition-colors active:scale-[0.98]"
 >
 <UserPlus className="h-4 w-4 stroke-[2.5]" />
 <span>Add Person</span>
 </button>
 </div>
 </div>

 {/* 4-column summary strip */}
 <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-line">
 <div className="rounded-2xl bg-sunken p-3.5 border border-line">
 <span className="text-xs text-ink-3">You Are Owed</span>
 <div className="mt-0.5">
 <Money value={totalOwedToMe} size="lg" tone="positive" sign="always" />
 </div>
 </div>

 <div className="rounded-2xl bg-sunken p-3.5 border border-line">
 <span className="text-xs text-ink-3">You Owe</span>
 <div className="mt-0.5">
 <Money value={-totalIOwe} size="lg" tone="negative" sign="always" />
 </div>
 </div>

 <div className="rounded-2xl bg-sunken p-3.5 border border-line">
 <span className="text-xs text-ink-3">Active Contacts</span>
 <p className="text-lg font-bold font-numeric text-ink-1 mt-0.5">
 {activeContacts.length}
 </p>
 </div>

 <div className="rounded-2xl bg-sunken p-3.5 border border-line">
 <span className="text-xs text-ink-3">Settled All Square</span>
 <p className="text-lg font-bold font-numeric text-ink-1 mt-0.5">
 {settledContacts.length}
 </p>
 </div>
 </div>
 </div>

 {/* Floating Link Suggestion Prompt if triggered */}
 {linkSuggestionPrompt && (
 <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 border border-emerald-500/30 dark:border-emerald-500/40 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-slide-down">
 <div className="flex items-start gap-3 min-w-0">
 <div className="p-2 rounded-xl bg-emerald-600 text-white flex-shrink-0 mt-0.5">
 <LinkIcon className="w-4 h-4" />
 </div>
 <div>
 <p className="text-xs font-bold text-ink-1">
 Found a matching bank transaction for {linkSuggestionPrompt.contactName}!
 </p>
 <p className="text-xs text-ink-2 mt-0.5">
 <span className="font-extrabold text-ink-1">{linkSuggestionPrompt.transaction.description}</span> (<Money value={linkSuggestionPrompt.transaction.amount} size="xs" /> on {formatDate(linkSuggestionPrompt.transaction.date)})
 </p>
 </div>
 </div>

 <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
 <button
 onClick={() => {
 linkSettlementToTransaction(
 linkSuggestionPrompt.settlementId,
 linkSuggestionPrompt.transaction.id
 );
 setLinkSuggestionPrompt(null);
 }}
 className="px-3.5 py-1.5 rounded-xl bg-primary hover:opacity-95 text-on-primary shadow-xs text-xs font-bold shadow-xs transition-colors active:scale-95"
 >
 Link to Settlement
 </button>
 <button
 onClick={() => setLinkSuggestionPrompt(null)}
 className="p-1.5 rounded-xl text-ink-3 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-800"
 title="Dismiss"
 >
 <X className="w-4 h-4" />
 </button>
 </div>
 </div>
 )}

 {/* View Switcher: Contacts Tab vs History Tab */}
 {activeTab === 'history' ? (
 <SettlementHistoryView onBackToContacts={() => setActiveTab('contacts')} />
 ) : (
 <>
 {/* Section Header */}
 <div className="flex items-center justify-between">
 <div>
 <h3 className="text-lg font-bold text-ink-1 tracking-tight">
 Friends &amp; Shared Balances
 </h3>
 <p className="text-xs text-ink-3">
 Track individual IOUs, link bank repayments, and settle up
 </p>
 </div>
 <span className="text-xs font-semibold text-ink-3">
 {activeContacts.length} active debts
 </span>
 </div>

 {/* Action Bar & Filters */}
 <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface p-4 sm:p-5 rounded-2xl border border-line shadow-sm">
 {/* Search */}
 <div className="relative w-full sm:w-80">
 <Search className="w-4 h-4 text-ink-3 absolute left-3.5 top-1/2 -translate-y-1/2" />
 <input
 type="text"
 value={searchQuery}
 onChange={e => setSearchQuery(e.target.value)}
 placeholder="Search by name or notes..."
 className="w-full pl-9 pr-4 py-2 bg-sunken border border-line rounded-xl text-xs font-medium text-ink-1 focus:outline-none"
 />
 </div>

 {/* Filter Pills + Add Contact Button */}
 <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
 <div className="flex items-center gap-1 bg-sunken p-1 rounded-xl text-xs border border-line overflow-x-auto no-scrollbar max-w-[calc(100%-80px)] sm:max-w-none">
 <button
 onClick={() => setFilterType('all')}
 className={`px-2.5 py-1 rounded-xl font-bold transition-colors whitespace-nowrap ${
 filterType === 'all'
 ? 'bg-surface text-ink-1 shadow-xs'
 : 'text-ink-3 hover:text-slate-900 dark:hover:text-white'
 }`}
 >
 All Friends
 </button>
 <button
 onClick={() => setFilterType('they_owe_me')}
 className={`px-2.5 py-1 rounded-xl font-bold transition-colors whitespace-nowrap ${
 filterType === 'they_owe_me'
 ? 'bg-emerald-600 text-white shadow-xs'
 : 'text-ink-3 hover:text-slate-900 dark:hover:text-white'
 }`}
 >
 Owes You
 </button>
 <button
 onClick={() => setFilterType('i_owe_them')}
 className={`px-2.5 py-1 rounded-xl font-bold transition-colors whitespace-nowrap ${
 filterType === 'i_owe_them'
 ? 'bg-rose-600 text-white shadow-xs'
 : 'text-ink-3 hover:text-slate-900 dark:hover:text-white'
 }`}
 >
 You Owe
 </button>
 <button
 onClick={() => setFilterType('settled')}
 className={`px-2.5 py-1 rounded-xl font-bold transition-colors whitespace-nowrap ${
 filterType === 'settled'
 ? 'bg-indigo-600 text-white shadow-xs'
 : 'text-ink-3 hover:text-slate-900 dark:hover:text-white'
 }`}
 >
 Settled
 </button>
 </div>

 <button
 onClick={() => setIsAddContactOpen(true)}
 className="flex items-center gap-1.5 px-3.5 sm:px-5 py-2 sm:py-2.5 bg-primary hover:opacity-95 text-on-primary shadow-xs font-bold rounded-xl text-xs sm:text-sm shadow-sm transition-colors active:scale-95 whitespace-nowrap flex-shrink-0"
 >
 <UserPlus className="w-3.5 h-3.5" />
 <span className="hidden xs:inline">Add Person</span>
 <span className="xs:hidden">Add</span>
 </button>
 </div>
 </div>

 {/* Active Contacts List */}
 <div className="space-y-4">
 {/* Unassigned & Ad-Hoc Splits Card */}
 {filteredUnassignedSplits.length > 0 && (
 <div className="relative overflow-hidden bg-surface rounded-2xl border border-primary/30 dark:border-primary/40 shadow-sm transition-colors duration-200">
 {/* Gold Accent Hairline */}
 <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-reward-fill to-transparent opacity-80" />

 <div className="p-4 sm:p-6">
 {/* Card Header */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-line">
 <div className="flex items-center gap-3.5">
 <div className="w-11 h-11 rounded-2xl bg-primary-tint text-primary flex items-center justify-center border border-primary/20">
 <Users className="w-5 h-5" />
 </div>
 <div>
 <div className="flex items-center gap-2">
 <h3 className="text-base font-bold text-ink-1">
 Unassigned &amp; Ad-Hoc Splits
 </h3>
 <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-warning-tint text-warning border border-warning/30 dark:text-reward border border-primary/25">
 {filteredUnassignedSplits.length} split{filteredUnassignedSplits.length === 1 ? '' : 's'}
 </span>
 </div>
 <p className="text-xs text-ink-3 mt-0.5">
 Splits recorded without a saved contact. Settle directly or assign to a friend below.
 </p>
 </div>
 </div>

 {/* Unassigned Net Balance */}
 <div className="flex items-center gap-3 self-start sm:self-center">
 {unassignedTotals.owedToMe > 0 && (
 <div className="text-right">
 <span className="text-xs font-semibold text-ink-3 block uppercase tracking-wider">
 Owed to You
 </span>
 <Money value={unassignedTotals.owedToMe} tone="positive" size="sm" sign="always" />
 </div>
 )}
 {unassignedTotals.iOwe > 0 && (
 <div className="text-right">
 <span className="text-xs font-semibold text-ink-3 block uppercase tracking-wider">
 You Owe
 </span>
 <Money value={-unassignedTotals.iOwe} tone="negative" size="sm" sign="always" />
 </div>
 )}
 </div>
 </div>

 {/* Split Entries List */}
 <div className="mt-4 space-y-2.5">
 {filteredUnassignedSplits.map(({ tx, split }) => {
 const isTheyOweMe = split.direction === 'they_owe_me';
 return (
 <div
 key={`${tx.id}-${split.id}`}
                    className={`p-3.5 rounded-2xl border transition-colors duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      split.settled
                        ? 'bg-sunken/50 border-line/50 opacity-70'
                        : 'bg-sunken border-line'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Quick Settle Checkbox */}
                      <button
                        type="button"
                        onClick={() => quickToggleSettleTransaction(tx.id, split.id)}
                        className={`p-1.5 rounded-xl transition-colors ${
 split.settled
 ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25'
 : 'bg-surface text-ink-3 hover:text-reward border border-line'
 }`}
 title={split.settled ? 'Mark Unsettled' : 'Mark Settled'}
 >
 {split.settled ? (
 <CheckCircle2 className="w-4 h-4" />
 ) : (
 <Circle className="w-4 h-4" />
 )}
 </button>

 <div className="min-w-0">
 <div className="flex items-center gap-2 flex-wrap">
 <span className="text-xs font-bold text-ink-1">
 {split.label || 'Unnamed Person'}
 </span>
 {split.settled ? (
 <span className="px-1.5 py-0.5 rounded-md text-xs font-bold bg-line text-ink-2">
 Settled
 </span>
 ) : (
 <span
 className={`px-1.5 py-0.5 rounded-md text-xs font-bold ${
 isTheyOweMe
 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
 : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
 }`}
 >
 {isTheyOweMe ? 'Owes you' : 'You owe'}
 </span>
 )}
 </div>
 <p className="text-xs text-ink-3 truncate mt-0.5">
 {tx.description} • {formatDate(tx.date)}
 </p>
 </div>
 </div>

 <div className="flex items-center gap-2.5 self-end sm:self-center flex-shrink-0">
 <Money
 value={isTheyOweMe ? split.amount : -split.amount}
 size="sm"
 tone={split.settled ? 'neutral' : (isTheyOweMe ? 'positive' : 'negative')}
 sign="always"
 className={split.settled ? 'line-through opacity-60' : ''}
 />

 {/* Assign to Contact Dropdown */}
 <select
 value=""
 onChange={e =>
 handleAssignSplit(tx.id, split.id, e.target.value, split.label)
 }
 className="text-xs font-semibold rounded-xl border border-line bg-surface text-ink-2 px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer w-full sm:w-auto"
 >
 <option value="" disabled>
 Assign to friend...
 </option>
 {contacts.map(c => (
 <option key={c.id} value={c.id}>
 Assign to {c.name}
 </option>
 ))}
 <option value="__new__">
 + Add as new friend &quot;{split.label || 'Friend'}&quot;
 </option>
 </select>
 </div>
 </div>
 );
 })}
 </div>
 </div>
 </div>
 )}

 {filteredActiveContacts.length === 0 && filteredUnassignedSplits.length === 0 && (
 <EmptyState
 icon={Users}
 title={contacts.length === 0 ? 'No contacts added yet' : 'No active debts matching filter'}
 description="Split dinner, grocery, or rent bills with friends when adding any transaction, or add a person here."
 actionLabel="Add First Person"
 onAction={() => setIsAddContactOpen(true)}
 />
 )}

 {filteredActiveContacts.map(contact => {
 const netAmount = balanceMap.get(contact.id) || 0;
 const isOwedToMe = netAmount > 0;
 const isExpanded = expandedContactId === contact.id;

 // Find all SplitEntry items across transactions associated with this contact
 const contactSplitEntries: { tx: Transaction; split: SplitEntry }[] = [];
 transactions.forEach(tx => {
 if (tx.splitWith && Array.isArray(tx.splitWith)) {
 tx.splitWith.forEach(split => {
 if (split.contactId === contact.id) {
 contactSplitEntries.push({ tx, split });
 }
 });
 }
 });

 // Settlements associated with this contact
 const contactSettlements = settlements.filter(s => s.contactId === contact.id);

 return (
 <div
 key={contact.id}
            className="bg-surface rounded-2xl border border-line shadow-sm overflow-hidden transition-colors duration-200"
 >
 {/* Contact Card Header */}
 <div
 onClick={() => setExpandedContactId(isExpanded ? null : contact.id)}
 className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 cursor-pointer select-none hover:bg-sunken/50 transition-colors"
 >
 <div className="flex items-center gap-3 min-w-0">
 <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-black text-base sm:text-lg flex items-center justify-center border border-emerald-500/20 flex-shrink-0">
 {contact.name.charAt(0).toUpperCase()}
 </div>
 <div className="min-w-0">
 <h3 className="text-sm sm:text-base font-bold text-ink-1 truncate">
 {contact.name}
 </h3>
 <p className="text-xs sm:text-xs text-ink-3 truncate">
 {contact.notes || `${contactSplitEntries.length} linked splits`}
 </p>
 </div>
 </div>

 <div className="flex items-center justify-between sm:justify-end gap-2.5 sm:gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-line">
 {/* Balance Badge */}
 <div className="text-left sm:text-right">
 {isOwedToMe ? (
 <Money value={Math.abs(netAmount)} tone="positive" size="sm" />
 ) : (
 <Money value={Math.abs(netAmount)} tone="neutral" size="sm" />
 )}
 <p className="text-xs sm:text-xs font-bold text-ink-3">
 {isOwedToMe ? 'Owes You' : 'You Owe'}
 </p>
 </div>

 {/* Actions */}
 <div className="flex items-center gap-1.5 sm:gap-2">
 <button
 type="button"
 onClick={e => {
 e.stopPropagation();
 setSplitModalContact(contact);
 }}
 className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-sunken text-ink-2 hover:bg-line rounded-xl text-xs font-bold transition-colors border border-line active:scale-95"
 title="Split a new bill or expense with this person"
 >
 <Plus className="w-3.5 h-3.5 text-reward" />
 <span className="hidden xs:inline">Split</span>
 </button>

 <button
 type="button"
 onClick={e => {
 e.stopPropagation();
 setSettleContact({ contact, amount: Math.abs(netAmount) });
 }}
 className="flex items-center gap-1 px-3 sm:px-3.5 py-1.5 sm:py-2 bg-primary hover:opacity-90 text-on-primary rounded-xl text-xs font-bold shadow-sm transition-colors active:scale-95"
 >
 <HandCoins className="w-3.5 h-3.5" />
 <span>Settle</span>
 </button>

 <div className="p-1 sm:p-2 rounded-xl text-ink-3">
 {isExpanded ? <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5" /> : <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" />}
 </div>
 </div>
 </div>
 </div>

 {/* Expanded Breakdown */}
 {isExpanded && (
 <div className="border-t border-line bg-sunken/50 p-5 sm:p-6 space-y-5">
 {/* Linked Transaction Splits */}
 <div className="space-y-3">
 <div className="flex items-center justify-between">
 <h4 className="text-xs font-bold uppercase tracking-wider text-ink-3 flex items-center gap-1.5">
 <Receipt className="w-3.5 h-3.5 text-emerald-600" />
 <span>Split Transactions ({contactSplitEntries.length})</span>
 </h4>
 <span className="text-xs text-ink-3">
 Tap checkmark to quick-settle full amount
 </span>
 </div>

 {contactSplitEntries.length === 0 ? (
 <p className="text-xs text-ink-3 italic">
 No transactions currently tagged with this person.
 </p>
 ) : (
 <div className="space-y-2">
 {contactSplitEntries.map(({ tx, split }) => {
 const isSettled = split.settled;
 const matchingSettlement = settlements.find(
 s => s.sourceTransactionId === tx.id && s.sourceSplitEntryId === split.id
 );
 const linkedTxId = split.linkedTransactionId || matchingSettlement?.linkedTransactionId;
 const linkedTx = linkedTxId ? transactionMap.get(linkedTxId) : null;
 const isPartial = split.settledAmount !== undefined && split.settledAmount > 0 && !split.settled;

 return (
 <div
 key={`${tx.id}-${split.id}`}
                        className={`p-3.5 rounded-2xl border transition-colors duration-200 flex items-center justify-between gap-3 ${
                          isSettled
                            ? 'bg-sunken/70 border-line/60'
                            : 'bg-surface border-line shadow-xs'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Quick One-Tap Tick Button */}
                          <button
                            onClick={() => handleQuickTickSettle(tx, split, contact)}
                            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors flex-shrink-0 ${
 isSettled
 ? 'bg-emerald-600 text-white shadow-xs'
 : 'border border-line text-ink-3 hover:border-emerald-500 hover:text-emerald-600'
 }`}
 title={isSettled ? 'Mark as Unsettled' : 'One-tap Mark as Settled in Full'}
 >
 {isSettled ? (
 <Check className="w-4 h-4" />
 ) : (
 <Circle className="w-4 h-4 text-slate-300 dark:text-slate-500" />
 )}
 </button>

 <div className="min-w-0">
 <p
 className={`text-xs font-bold text-ink-1 truncate ${
 isSettled ? 'line-through text-ink-3' : ''
 }`}
 >
 {tx.description}
 </p>
 <div className="flex items-center gap-2 text-xs text-ink-3 flex-wrap">
 <span>{formatDate(tx.date)}</span>
 <span>•</span>
 <span>Total: <Money value={tx.amount} size="xs" /></span>
 <span>•</span>
 <span
 className={`font-semibold ${
 split.direction === 'they_owe_me'
 ? 'text-emerald-600 dark:text-emerald-400'
 : 'text-rose-600 dark:text-rose-400'
 }`}
 >
 {split.direction === 'they_owe_me' ? 'They Owe' : 'You Owe'}
 </span>
 </div>

 {/* Linked Bank Transaction Indicator */}
 {linkedTx && (
 <div className="flex items-center gap-1.5 mt-1 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
 <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
 <span className="truncate">
 Linked: {linkedTx.description} (<Money value={linkedTx.amount} size="xs" />)
 </span>
 </div>
 )}

 {/* Partial Payment Indicator */}
 {isPartial && (
 <div className="flex items-center gap-1.5 mt-1 text-xs text-ink-3 font-bold">
 <span>
 Partial: <Money value={split.settledAmount || 0} size="xs" /> paid • <Money value={roundCurrency(split.amount - (split.settledAmount || 0))} size="xs" /> open
 </span>
 </div>
 )}
 </div>
 </div>

 <div className="flex items-center gap-2 flex-shrink-0">
 <Money
 value={split.amount}
 size="sm"
 tone={split.direction === 'they_owe_me' ? 'positive' : 'negative'}
 className={isSettled ? 'line-through opacity-60' : ''}
 />

 {/* Direct Connect / Settle Modal Button */}
 <button
 onClick={() => setSettleSplitTarget({ contact, tx, split })}
 className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs ${
 isSettled || linkedTx
 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900 border border-emerald-500/20'
 : 'bg-sunken text-ink-2 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-line'
 }`}
 title="Connect Repayment Bank Transaction"
 >
 <LinkIcon className="w-3.5 h-3.5 text-emerald-600" />
 <span className="hidden sm:inline">{isSettled ? 'Linked' : 'Connect'}</span>
 </button>

 {/* Edit Split Pencil Icon */}
 <button
 onClick={() => setEditingSplitItem({ tx, split })}
 className="p-1.5 rounded-xl text-ink-3 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-sunken"
 title="Edit Split Details"
 >
 <Edit3 className="w-3.5 h-3.5" />
 </button>
 </div>
 </div>
 );
 })}
 </div>
 )}
 </div>

 {/* Recent Settlement Records History */}
 {contactSettlements.length > 0 && (
 <div className="space-y-2.5 pt-2 border-t border-line">
 <div className="flex items-center justify-between">
 <h4 className="text-xs font-bold uppercase tracking-wider text-ink-3 flex items-center gap-1.5">
 <History className="w-3.5 h-3.5 text-emerald-600" />
 <span>Recent Settlements ({contactSettlements.length})</span>
 </h4>

 <button
 onClick={() => setActiveTab('history')}
 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
 >
 View all in History →
 </button>
 </div>

 <div className="space-y-1.5">
 {contactSettlements.slice(0, 4).map(set => {
 const linkedTx = set.linkedTransactionId
 ? transactionMap.get(set.linkedTransactionId)
 : null;

 return (
 <div
 key={set.id}
 className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-xl bg-surface border border-line text-xs gap-2"
 >
 <div className="flex items-center gap-2 min-w-0 flex-wrap">
 <Money value={set.amount} size="sm" tone="positive" />
 <span className="text-ink-2">
 {set.note || 'Settlement'}
 </span>
 <span className="text-xs text-ink-3">({formatDate(set.date)})</span>

 {linkedTx && (
 <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
 <CheckCircle2 className="w-2.5 h-2.5" />
 <span>Linked: {linkedTx.description}</span>
 </span>
 )}
 </div>

 <div className="flex items-center gap-1.5 self-end sm:self-auto">
 <button
 onClick={() => setSettleContact({ contact, amount: set.amount, settlement: set })}
 className="text-ink-3 hover:text-emerald-600 p-1 rounded-md transition-colors"
 title="Edit Settlement"
 >
 <Edit3 className="w-3 h-3" />
 </button>

 <button
 onClick={() => {
 if (window.confirm('Delete this settlement record?')) {
 deleteSettlement(set.id);
 }
 }}
 className="text-ink-3 hover:text-rose-600 p-1 rounded-md transition-colors"
 title="Delete Settlement"
 >
 <Trash2 className="w-3 h-3" />
 </button>
 </div>
 </div>
 );
 })}
 </div>
 </div>
 )}

 {/* Delete Contact Action */}
 <div className="pt-2 flex justify-end">
 <button
 onClick={() => handleDeleteContact(contact)}
 className="text-xs font-semibold text-rose-600 hover:underline flex items-center gap-1"
 >
 <Trash2 className="w-3 h-3" />
 <span>Delete Person & Unlink Splits</span>
 </button>
 </div>
 </div>
 )}
 </div>
 );
 })}
 </div>

 {/* Settled / All Square Section (Collapsible) */}
 {filteredSettledContacts.length > 0 && (
 <div className="pt-4 border-t border-line">
 <button
 onClick={() => setIsSettledSectionOpen(!isSettledSectionOpen)}
 className="flex items-center justify-between w-full p-4 rounded-2xl bg-surface border border-line text-xs font-bold text-ink-2"
 >
 <div className="flex items-center gap-2">
 <CheckCircle2 className="w-4 h-4 text-emerald-600" />
 <span>Settled / All Square Contacts ({filteredSettledContacts.length})</span>
 </div>
 {isSettledSectionOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
 </button>

 {isSettledSectionOpen && (
 <div className="mt-3 space-y-2">
 {filteredSettledContacts.map(contact => (
 <div
 key={contact.id}
 className="p-4 rounded-2xl bg-surface border border-line flex items-center justify-between text-xs"
 >
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 rounded-xl bg-sunken text-ink-3 font-bold flex items-center justify-center">
 {contact.name.charAt(0).toUpperCase()}
 </div>
 <div>
 <p className="font-bold text-ink-1">{contact.name}</p>
 <p className="text-xs text-ink-3">{contact.notes || 'All square'}</p>
 </div>
 </div>

 <div className="flex items-center gap-2">
 <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-extrabold text-xs inline-flex items-center gap-1">
 <Money value={0} tone="neutral" size="sm" />
 <span>(Square)</span>
 </span>
                  <button
                    onClick={() => setSplitModalContact(contact)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-primary-tint text-warning dark:text-reward hover:bg-primary/20 text-xs font-bold transition-colors border border-primary/20 active:scale-95"
                    title="Split a new bill or expense with this contact"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Split Bill</span>
                  </button>
                  <button
                    onClick={() => handleDeleteContact(contact)}
                    className="p-1.5 text-ink-3 hover:text-rose-600 rounded-xl"
 title="Delete Contact"
 >
 <Trash2 className="w-3.5 h-3.5" />
 </button>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 )}
 </>
 )}

 {/* Modals */}
 <AddContactModal
 isOpen={isAddContactOpen}
 onClose={() => setIsAddContactOpen(false)}
 />

 <SettleUpModal
 isOpen={settleContact !== null}
 onClose={() => setSettleContact(null)}
 contact={settleContact?.contact || null}
 suggestedAmount={settleContact?.amount || 0}
 initialSettlement={settleContact?.settlement || null}
 />

 <EditSplitModal
 isOpen={editingSplitItem !== null}
 onClose={() => setEditingSplitItem(null)}
 transaction={editingSplitItem?.tx || null}
 splitEntry={editingSplitItem?.split || null}
 />

 {settleSplitTarget && (
 <SettleSplitModal
 isOpen={true}
 onClose={() => setSettleSplitTarget(null)}
 contact={settleSplitTarget.contact}
 transaction={settleSplitTarget.tx}
 splitEntry={settleSplitTarget.split}
 />
 )}

 {splitModalContact && (
 <TransactionModal
 isOpen={true}
 onClose={() => setSplitModalContact(null)}
 initialContactId={splitModalContact.id}
 />
 )}
 </div>
 );
};
