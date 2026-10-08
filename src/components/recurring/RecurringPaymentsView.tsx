import React, { useState, useMemo } from 'react';
import {
 Plus,
 CalendarClock,
 CheckCircle2,
 AlertCircle,
 Pause,
 Play,
 Edit3,
 Trash2,
 Search,
 CalendarCheck,
 CreditCard,
 History,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { RecurringPayment } from '../../types/finance';
import { Money } from '../ui';
import { formatDate, getCurrentMonthYear } from '../../utils/date';
import { calculateMonthlyEquivalent, getPaymentSchedule } from '../../utils/recurringDates';
import { IconRenderer } from '../common/IconRenderer';
import { EmptyState } from '../common/EmptyState';
import { RecurringPaymentModal } from './RecurringPaymentModal';
import { MarkPaidModal } from './MarkPaidModal';

type FilterTab = 'all' | 'active' | 'paused';

export const RecurringPaymentsView: React.FC = () => {
 const {
 recurringPayments,
 recurringPaymentLogs,
 upcomingRecurringPayments,
 overdueRecurringPayments,
 totalMonthlyRecurringCommitment,
 categories,
 addRecurringPayment,
 updateRecurringPayment,
 deleteRecurringPayment,
 pauseRecurringPayment,
 markRecurringPaymentPaid,
 } = useFinance();

 // State for modals
 const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
 const [selectedPaymentForEdit, setSelectedPaymentForEdit] = useState<RecurringPayment | null>(null);

 const [isMarkPaidModalOpen, setIsMarkPaidModalOpen] = useState<boolean>(false);
 const [paymentForMarkPaid, setPaymentForMarkPaid] = useState<RecurringPayment | null>(null);
 const [targetDueDateForMarkPaid, setTargetDueDateForMarkPaid] = useState<string>('');

 // Filtering & Search
 const [searchQuery, setSearchQuery] = useState<string>('');
 const [activeTab, setActiveTab] = useState<FilterTab>('all');
 const [selectedCategory, setSelectedCategory] = useState<string>('all');

 // Expanded history for specific recurring payments
 const [expandedPaymentId, setExpandedPaymentId] = useState<string | null>(null);

 const { monthName, key: currentMonthKey } = getCurrentMonthYear();

 // Category map for quick icon & color lookups
 const categoryMap = useMemo(() => {
 return new Map(categories.map(c => [c.name.toLowerCase(), c]));
 }, [categories]);

 // Calculate total paid this month from recurring logs
 const paidThisMonthTotal = useMemo(() => {
 return recurringPaymentLogs
 .filter(log => log.paidDate && log.paidDate.startsWith(currentMonthKey))
 .reduce((sum, log) => sum + log.amount, 0);
 }, [recurringPaymentLogs, currentMonthKey]);

 // Filtered payments list
 const filteredPayments = useMemo(() => {
 return recurringPayments.filter(p => {
 // Tab filter
 if (activeTab === 'active' && !p.isActive) return false;
 if (activeTab === 'paused' && p.isActive) return false;

 // Category filter
 if (selectedCategory !== 'all' && p.category.toLowerCase() !== selectedCategory.toLowerCase()) {
 return false;
 }

 // Search query
 if (searchQuery.trim()) {
 const query = searchQuery.toLowerCase();
 const matchesName = p.name.toLowerCase().includes(query);
 const matchesCategory = p.category.toLowerCase().includes(query);
 const matchesNotes = p.notes ? p.notes.toLowerCase().includes(query) : false;
 if (!matchesName && !matchesCategory && !matchesNotes) return false;
 }

 return true;
 });
 }, [recurringPayments, activeTab, selectedCategory, searchQuery]);

 // Handlers
 const handleOpenAdd = () => {
 setSelectedPaymentForEdit(null);
 setIsFormModalOpen(true);
 };

 const handleOpenEdit = (payment: RecurringPayment) => {
 setSelectedPaymentForEdit(payment);
 setIsFormModalOpen(true);
 };

 const handleSavePayment = (
 data: Omit<RecurringPayment, 'id' | 'createdAt' | 'updatedAt'>
 ) => {
 if (selectedPaymentForEdit) {
 updateRecurringPayment(selectedPaymentForEdit.id, data);
 } else {
 addRecurringPayment(data);
 }
 };

 const handleOpenMarkPaid = (payment: RecurringPayment, dueDate: string) => {
 setPaymentForMarkPaid(payment);
 setTargetDueDateForMarkPaid(dueDate);
 setIsMarkPaidModalOpen(true);
 };

 const handleDelete = (payment: RecurringPayment) => {
 if (
 window.confirm(
 `Are you sure you want to delete "${payment.name}"? All associated payment history for this commitment will also be removed.`
 )
 ) {
 deleteRecurringPayment(payment.id);
 }
 };

 const toggleHistory = (id: string) => {
 setExpandedPaymentId(prev => (prev === id ? null : id));
 };

 return (
 <div className="space-y-6 w-full pb-16">
 {/* Hero Overview: Mineral Card with Gold Commitment Highlight */}
 <div className="relative overflow-hidden rounded-2xl bg-surface text-ink-1 p-3.5 sm:p-8 border border-line shadow-sm">
 <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
 <div>
 <div className="flex items-center gap-2 mb-2">
 <span className="flex h-6 w-6 items-center justify-center rounded-xl bg-primary-tint text-primary">
 <CalendarClock className="h-4 w-4" />
 </span>
 <span className="text-xs font-bold uppercase tracking-wider text-ink-3">
 Fixed Commitments & Bills
 </span>
 </div>
 <p className="text-xs text-ink-3 mb-1">
 Normalized Monthly Obligation
 </p>
 <div className="flex items-baseline gap-3">
 <Money value={totalMonthlyRecurringCommitment} size="2xl" />
 <span className="text-sm font-semibold text-ink-3">
 / month
 </span>
 </div>
 <p className="mt-2 text-xs text-ink-3">
 {recurringPayments.filter(p => p.isActive).length} active commitments • <Money value={paidThisMonthTotal} size="xs" /> paid so far in {monthName}
 </p>
 </div>

 <div className="flex flex-wrap items-center gap-3">
 <button
 onClick={handleOpenAdd}
 className="inline-flex items-center gap-2 rounded-xl bg-primary hover:opacity-95 text-on-primary px-5 py-3 text-sm font-bold shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-slate-900 transition-colors active:scale-[0.98]"
 >
 <Plus className="h-4 w-4 stroke-[2.5]" />
 <span>New Recurring Bill</span>
 </button>
 </div>
 </div>

 {/* Quick summary strip */}
 <div className="mt-6 grid grid-cols-1 min-[360px]:grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-line">
 <div className="rounded-2xl bg-sunken p-3.5 border border-line">
 <span className="text-xs text-ink-3">Active Commitments</span>
 <p className="text-lg font-bold font-numeric text-ink-1 mt-0.5">
 {recurringPayments.filter(p => p.isActive).length}
 </p>
 </div>

 <div className="rounded-2xl bg-sunken p-3.5 border border-line">
 <span className="text-xs text-ink-3">Upcoming (Next 30d)</span>
 <p className="text-lg font-bold font-numeric text-ink-1 mt-0.5">
 {upcomingRecurringPayments.length}
 </p>
 </div>

 <div className="rounded-2xl bg-sunken p-3.5 border border-line">
 <span className="text-xs text-ink-3">Overdue Alerts</span>
 <p className={`text-lg font-bold font-numeric mt-0.5 ${
 overdueRecurringPayments.length > 0
 ? 'text-rose-600 dark:text-rose-400'
 : 'text-ink-1'
 }`}>
 {overdueRecurringPayments.length}
 </p>
 </div>

 <div className="rounded-2xl bg-sunken p-3.5 border border-line">
 <span className="text-xs text-ink-3">Paused</span>
 <p className="text-lg font-bold font-numeric text-ink-1 mt-0.5">
 {recurringPayments.filter(p => !p.isActive).length}
 </p>
 </div>
 </div>
 </div>

 {/* Overdue Alerts Section (if any overdue commitments) */}
 {overdueRecurringPayments.length > 0 && (
 <div className="rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/70 dark:bg-rose-950/20 p-3.5 sm:p-6 transition-colors duration-200 animate-shake-x">
 <div className="flex flex-wrap items-center justify-between gap-2 mb-4 text-rose-700 dark:text-rose-400">
 <AlertCircle className="h-5 w-5 shrink-0" />
 <h3 className="font-bold text-base">Overdue Payments Requiring Attention</h3>
 <span className="ml-auto rounded-full bg-rose-200/70 dark:bg-rose-900/60 px-2.5 py-0.5 text-xs font-black text-rose-800 dark:text-rose-200">
 {overdueRecurringPayments.length} Overdue
 </span>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
 {overdueRecurringPayments.map(item => {
 const cat = categoryMap.get(item.category.toLowerCase());
 return (
 <div
 key={`overdue-${item.id}-${item.dueDate}`}
 className="flex items-center justify-between gap-3 rounded-2xl bg-surface p-4 border border-rose-200 dark:border-rose-900/40 shadow-sm animate-pulse-danger"
 >
 <div className="flex items-center gap-3 min-w-0">
 <div
 className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white font-bold"
 style={{ backgroundColor: cat?.color || '#e11d48' }}
 >
 <IconRenderer name={cat?.icon || 'Tag'} className="h-5 w-5" />
 </div>
 <div className="min-w-0">
 <h4 className="font-bold text-sm text-ink-1 truncate">
 {item.name}
 </h4>
 <div className="flex items-center gap-2 mt-0.5">
 <span className="inline-flex items-center rounded-md bg-rose-100 dark:bg-rose-900/40 px-1.5 py-0.5 text-xs font-semibold text-rose-700 dark:text-rose-300 font-numeric">
 {item.daysOverdue === 0 ? 'Due Today' : `${item.daysOverdue}d overdue`}
 </span>
 <span className="text-xs text-ink-3">
 Due {formatDate(item.dueDate)}
 </span>
 </div>
 </div>
 </div>

 <div className="flex items-center gap-3 shrink-0">
 <div className="text-right">
 <Money value={item.amount} size="sm" tone="negative" />
 </div>
 <button
 onClick={() => handleOpenMarkPaid(item, item.dueDate)}
 className="inline-flex items-center gap-1.5 rounded-xl bg-primary hover:opacity-90 px-3.5 py-2 text-xs font-bold text-on-primary shadow-sm transition-colors"
 >
 <CheckCircle2 className="h-3.5 w-3.5" />
 <span>Pay</span>
 </button>
 </div>
 </div>
 );
 })}
 </div>
 </div>
 )}

 {/* Upcoming Due Shelf (Next 30 Days) */}
 <div>
 <div className="flex items-center justify-between mb-4">
 <div>
 <h3 className="text-lg font-bold text-ink-1 tracking-tight">
 Upcoming Due Schedule
 </h3>
 <p className="text-xs text-ink-3">
 Bills, subscriptions, and investments scheduled in the next 30 days
 </p>
 </div>
 <span className="text-xs font-semibold text-ink-3">
 {upcomingRecurringPayments.length} upcoming
 </span>
 </div>

 {upcomingRecurringPayments.length === 0 ? (
 <div className="rounded-2xl border border-line bg-surface p-8 text-center">
 <CalendarCheck className="mx-auto h-10 w-10 text-emerald-500 dark:text-emerald-400 mb-2" />
 <h4 className="font-bold text-ink-1">All Caught Up!</h4>
 <p className="text-xs text-ink-3 mt-1 max-w-sm mx-auto">
 No pending recurring payments scheduled for the rest of this cycle.
 </p>
 </div>
 ) : (
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
 {upcomingRecurringPayments.map(item => {
 const cat = categoryMap.get(item.category.toLowerCase());
 const isDueToday = item.daysUntilDue === 0;
 const isDueSoon = item.daysUntilDue <= 3;

 return (
 <div
 key={`upcoming-${item.id}-${item.nextDueDate}`}
 className={`group relative rounded-2xl border transition-[transform,box-shadow,background-color] duration-200 p-5 bg-surface hover:border-warning/50 dark:hover:border-primary/30 shadow-sm ${
 isDueToday
 ? 'border-primary/60 dark:border-primary/50 ring-1 ring-primary/20'
 : 'border-line'
 }`}
 >
 <div className="flex items-start justify-between gap-3">
 <div className="flex items-center gap-3 min-w-0">
 <div
 className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white font-bold shadow-sm"
 style={{ backgroundColor: cat?.color || '#3b82f6' }}
 >
 <IconRenderer name={cat?.icon || 'Tag'} className="h-5 w-5" />
 </div>
 <div className="min-w-0">
 <h4 className="font-bold text-sm text-ink-1 truncate">
 {item.name}
 </h4>
 <p className="text-xs text-ink-3 truncate">
 {item.category} • {item.frequency}
 </p>
 </div>
 </div>

 <span
 className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold font-numeric ${
 isDueToday
 ? 'bg-warning-tint text-warning border border-warning/30 animate-pulse'
 : isDueSoon
 ? 'bg-primary-tint text-warning dark:text-reward'
 : 'bg-sunken text-ink-2'
 }`}
 >
 {isDueToday
 ? 'Due Today'
 : item.daysUntilDue === 1
 ? 'Due Tomorrow'
 : `In ${item.daysUntilDue} days`}
 </span>
 </div>

 <div className="mt-4 pt-4 border-t border-line flex items-center justify-between">
 <div>
 <span className="text-xs text-ink-3 block">Due Date</span>
 <span className="text-xs font-semibold font-numeric text-ink-2">
 {formatDate(item.nextDueDate)}
 </span>
 </div>

 <div className="text-right">
 <span className="text-xs text-ink-3 block">Amount</span>
 <Money value={item.amount} size="sm" tone={isDueToday ? 'negative' : 'neutral'} />
 </div>
 </div>

 <div className="mt-4 flex items-center gap-2">
 <button
 onClick={() => handleOpenMarkPaid(item, item.nextDueDate)}
 className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-sunken dark:hover:bg-sunken border border-transparent dark:border-line py-2 px-3 text-xs font-bold text-white transition-colors"
 >
 <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
 <span>Mark Paid</span>
 </button>
 <button
 onClick={() => handleOpenEdit(item)}
 className="flex h-9 w-9 sm:h-8 sm:w-8 items-center justify-center rounded-xl border border-line text-ink-3 hover:bg-sunken transition-colors"
 title="Edit Commitment"
 >
 <Edit3 className="h-3.5 w-3.5" />
 </button>
 </div>
 </div>
 );
 })}
 </div>
 )}
 </div>

 {/* All Declared Recurring Commitments */}
 <div className="rounded-2xl border border-line bg-surface p-3.5 sm:p-7 shadow-sm">
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
 <div>
 <h3 className="text-lg font-bold text-ink-1 tracking-tight">
 All Recurring Commitments
 </h3>
 <p className="text-xs text-ink-3">
 Manage your templates, pause subscriptions, or inspect payment histories
 </p>
 </div>

 {/* Filter tabs */}
 <div className="flex flex-wrap items-center gap-2">
 <div className="inline-flex max-w-full overflow-x-auto rounded-xl bg-sunken p-1 border border-line">
 <button
 onClick={() => setActiveTab('all')}
 className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
 activeTab === 'all'
 ? 'bg-surface text-ink-1 shadow-xs'
 : 'text-ink-3 hover:text-ink-1'
 }`}
 >
 All ({recurringPayments.length})
 </button>
 <button
 onClick={() => setActiveTab('active')}
 className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
 activeTab === 'active'
 ? 'bg-surface text-emerald-600 dark:text-emerald-400 shadow-xs'
 : 'text-ink-3 hover:text-ink-1'
 }`}
 >
 Active ({recurringPayments.filter(p => p.isActive).length})
 </button>
 <button
 onClick={() => setActiveTab('paused')}
 className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
 activeTab === 'paused'
 ? 'bg-surface text-ink-2 shadow-xs'
 : 'text-ink-3 hover:text-ink-1'
 }`}
 >
 Paused ({recurringPayments.filter(p => !p.isActive).length})
 </button>
 </div>

 {/* Category dropdown */}
 <select
 value={selectedCategory}
 onChange={e => setSelectedCategory(e.target.value)}
 className="rounded-xl border border-line bg-sunken px-3 py-1.5 text-xs font-semibold text-ink-2 focus:outline-none"
 >
 <option value="all">All Categories</option>
 {categories.map(c => (
 <option key={c.id} value={c.name}>
 {c.name}
 </option>
 ))}
 </select>
 </div>
 </div>

 {/* Search input */}
 <div className="relative mb-4">
 <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-3" />
 <input
 type="text"
 value={searchQuery}
 onChange={e => setSearchQuery(e.target.value)}
 placeholder="Search by commitment name, category, or notes..."
 className="w-full rounded-2xl border border-line bg-sunken pl-10 pr-4 py-2 text-xs text-ink-1 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-primary"
 />
 </div>

 {/* Payments List */}
 {recurringPayments.length === 0 ? (
 <EmptyState
 icon={CalendarClock}
 title="No recurring bills or subscriptions"
 description="Track your monthly SIPs, rent, Netflix, insurance EMIs and utility bills with automatic cycle projections."
 actionLabel="Add Recurring Bill"
 onAction={handleOpenAdd}
 />
 ) : filteredPayments.length === 0 ? (
 <div className="p-8 text-center text-ink-3 text-xs">
 No recurring commitments match the selected filters.
 </div>
 ) : (
 <div className="divide-y divide-line">
 {filteredPayments.map(payment => {
 const cat = categoryMap.get(payment.category.toLowerCase());
 const schedule = getPaymentSchedule(payment, recurringPaymentLogs);
 const monthlyEquivalent = calculateMonthlyEquivalent(payment.amount, payment.frequency);
 const isExpanded = expandedPaymentId === payment.id;

 // Filter logs for this payment
 const logs = recurringPaymentLogs
 .filter(l => l.recurringPaymentId === payment.id)
 .sort((a, b) => b.dueDate.localeCompare(a.dueDate));

 return (
 <div key={payment.id} className="py-4 first:pt-0 last:pb-0">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
 {/* Left: Icon & Info */}
 <div className="flex items-center gap-3.5 min-w-0">
 <div
 className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white font-bold shadow-sm"
 style={{ backgroundColor: cat?.color || '#3b82f6' }}
 >
 <IconRenderer name={cat?.icon || 'Tag'} className="h-5 w-5" />
 </div>

 <div className="min-w-0">
 <div className="flex items-center gap-2">
 <h4 className="font-bold text-sm text-ink-1 truncate">
 {payment.name}
 </h4>
 {!payment.isActive && (
 <span className="rounded-md bg-sunken px-1.5 py-0.5 text-xs font-bold text-ink-2">
 Paused
 </span>
 )}
 </div>

 <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-ink-3">
 <span className="font-medium">{payment.category}</span>
 <span>•</span>
 <span className="capitalize">{payment.frequency}</span>
 {payment.dayOfMonth && (
 <>
 <span>•</span>
 <span>Day {payment.dayOfMonth}</span>
 </>
 )}
 {payment.paymentMethod && (
 <>
 <span>•</span>
 <span className="inline-flex items-center gap-1">
 <CreditCard className="h-3 w-3" />
 {payment.paymentMethod}
 </span>
 </>
 )}
 </div>

 {payment.notes && (
 <p className="mt-1 text-xs text-ink-3 italic truncate max-w-md">
 {payment.notes}
 </p>
 )}
 </div>
 </div>

 {/* Right: Amount, Schedule, and Actions */}
 <div className="flex flex-wrap items-center justify-between sm:justify-end gap-x-4 gap-y-3 sm:shrink-0 pl-0 sm:pl-0">
 <div className="text-left sm:text-right">
 <div>
 <Money value={payment.amount} size="sm" />
 </div>
 {payment.frequency !== 'monthly' && (
 <div className="text-xs text-ink-3 flex items-center justify-start sm:justify-end gap-1">
 <span>≈</span>
 <Money value={monthlyEquivalent} size="xs" />
 <span>/mo</span>
 </div>
 )}
 {schedule.activeDueDate && payment.isActive && (
 <p className="text-xs text-ink-3">
 {schedule.isOverdue ? (
 <span className="text-rose-500 font-medium">
 Overdue: {formatDate(schedule.activeDueDate)}
 </span>
 ) : (
 <span>Next: {formatDate(schedule.activeDueDate)}</span>
 )}
 </p>
 )}
 </div>

 {/* Action buttons */}
 <div className="flex w-full sm:w-auto items-center justify-between sm:justify-end gap-1.5">
 {payment.isActive && schedule.activeDueDate && (
 <button
 onClick={() => handleOpenMarkPaid(payment, schedule.activeDueDate!)}
 className="inline-flex h-9 w-9 sm:h-auto sm:w-auto items-center justify-center gap-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 px-2.5 py-1.5 text-xs font-bold transition-colors"
 title="Mark as Paid"
 >
 <CheckCircle2 className="h-3.5 w-3.5" />
 <span className="hidden sm:inline">Pay</span>
 </button>
 )}

 <button
 onClick={() => toggleHistory(payment.id)}
 className={`flex h-9 w-9 sm:h-8 sm:w-8 items-center justify-center rounded-xl border transition-colors ${
 isExpanded
 ? 'bg-warning-tint border-primary/30 text-reward'
 : 'border-line text-ink-3 hover:bg-sunken'
 }`}
 title="View Payment Logs"
 >
 <History className="h-3.5 w-3.5" />
 </button>

 <button
 onClick={() => pauseRecurringPayment(payment.id)}
 className="flex h-9 w-9 sm:h-8 sm:w-8 items-center justify-center rounded-xl border border-line text-ink-3 hover:bg-sunken transition-colors"
 title={payment.isActive ? 'Pause Commitment' : 'Resume Commitment'}
 >
 {payment.isActive ? (
 <Pause className="h-3.5 w-3.5" />
 ) : (
 <Play className="h-3.5 w-3.5 text-emerald-500" />
 )}
 </button>

 <button
 onClick={() => handleOpenEdit(payment)}
 className="flex h-9 w-9 sm:h-8 sm:w-8 items-center justify-center rounded-xl border border-line text-ink-3 hover:bg-sunken transition-colors"
 title="Edit Commitment"
 >
 <Edit3 className="h-3.5 w-3.5" />
 </button>

 <button
 onClick={() => handleDelete(payment)}
 className="flex h-9 w-9 sm:h-8 sm:w-8 items-center justify-center rounded-xl border border-line text-ink-3 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
 title="Delete Commitment"
 >
 <Trash2 className="h-3.5 w-3.5" />
 </button>
 </div>
 </div>
 </div>

 {/* Expandable History Drawer */}
 {isExpanded && (
 <div className="mt-3.5 rounded-2xl bg-sunken p-4 border border-line">
 <div className="flex items-center justify-between mb-3">
 <div className="flex items-center gap-2">
 <History className="h-4 w-4 text-reward" />
 <h5 className="text-xs font-bold uppercase tracking-wider text-ink-2">
 Payment Logs History ({logs.length})
 </h5>
 </div>
 <span className="text-xs text-ink-3">
 {logs.length > 0 ? 'Recorded payments for this commitment' : 'No records yet'}
 </span>
 </div>

 {logs.length === 0 ? (
 <p className="text-xs text-ink-3 italic py-2">
 No payments have been logged yet for this commitment.
 </p>
 ) : (
 <div className="space-y-2">
 {logs.map(log => (
 <div
 key={log.id}
 className="flex items-center justify-between rounded-xl bg-surface p-2.5 border border-line text-xs"
 >
 <div className="flex items-center gap-3">
 <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
 <div>
 <span className="font-semibold text-ink-1">
 Cycle Due: {formatDate(log.dueDate)}
 </span>
 {log.paidDate && (
 <p className="text-xs text-ink-3">
 Paid on {formatDate(log.paidDate)}
 </p>
 )}
 </div>
 </div>

 <div className="text-right">
 <Money value={log.amount} size="sm" />
 {log.linkedTransactionId && (
 <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
 Ledger Linked
 </p>
 )}
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 )}
 </div>
 );
 })}
 </div>
 )}
 </div>

 {/* Modals */}
 <RecurringPaymentModal
 isOpen={isFormModalOpen}
 onClose={() => setIsFormModalOpen(false)}
 initialPayment={selectedPaymentForEdit}
 onSave={handleSavePayment}
 />

 <MarkPaidModal
 isOpen={isMarkPaidModalOpen}
 onClose={() => setIsMarkPaidModalOpen(false)}
 payment={paymentForMarkPaid}
 targetDueDate={targetDueDateForMarkPaid}
		onConfirm={(paymentId, dueDate, actualAmount, createTransaction) => {
			markRecurringPaymentPaid(
				paymentId,
				dueDate,
				actualAmount,
				undefined,
				createTransaction
			);
		}}
 />
 </div>
 );
};
