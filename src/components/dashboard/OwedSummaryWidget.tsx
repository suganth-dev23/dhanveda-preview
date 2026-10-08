import React, { useMemo } from 'react';
import { Users, ArrowDownLeft, ArrowUpRight, ChevronRight, CheckCircle2 } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatDate } from '../../utils/date';
import { Money } from '../ui/Money';

export const OwedSummaryWidget: React.FC = () => {
  const {
    contacts,
    settlements,
    contactBalances,
    totalOwedToMe,
    totalIOwe,
    setCurrentView,
  } = useFinance();

  const balanceMap = useMemo(() => {
    return new Map((contactBalances || []).map(b => [b.contactId, Number.isFinite(b.netAmount) ? b.netAmount : 0]));
  }, [contactBalances]);

  const contactMap = useMemo(() => {
    return new Map((contacts || []).map(c => [c.id, c]));
  }, [contacts]);

  // Top 3 contacts with highest absolute balance
  const topDebts = useMemo(() => {
    const list = (contacts || [])
      .map(c => ({
        contact: c,
        balance: balanceMap.get(c.id) || 0,
      }))
      .filter(item => Math.abs(item.balance) > 0.01)
      .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance))
      .slice(0, 3);
    return list;
  }, [contacts, balanceMap]);

  // Most recent settlement record
  const latestSettlement = useMemo(() => {
    if (!settlements || settlements.length === 0) return null;
    return [...settlements].sort((a, b) => {
      if (b.date !== a.date) return (b.date || '').localeCompare(a.date || '');
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    })[0];
  }, [settlements]);

  const safeTotalOwedToMe = Number.isFinite(totalOwedToMe) ? totalOwedToMe : 0;
  const safeTotalIOwe = Number.isFinite(totalIOwe) ? totalIOwe : 0;
  const netBalance = safeTotalOwedToMe - safeTotalIOwe;

  return (
    <div className="bg-surface rounded-2xl p-4 sm:p-6 border border-line shadow-xs flex flex-col justify-between h-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-sunken flex items-center justify-center text-ink-2">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-ink-1">
              Splits & IOUs
            </h3>
            <p className="text-xs text-ink-3">Friends & shared expenses</p>
          </div>
        </div>

        <button
          onClick={() => setCurrentView('people')}
          className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5 min-h-[44px]"
        >
          <span>View all</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Summary Grid */}
      <div className="grid grid-cols-2 gap-3 p-3.5 bg-sunken rounded-2xl border border-line">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-ink-3">
            <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-500" />
            <span>You are owed</span>
          </div>
          <div className="mt-0.5">
            <Money value={totalOwedToMe} tone="positive" size="sm" />
          </div>
        </div>

        <div className="border-l border-line pl-3.5">
          <div className="flex items-center gap-1.5 text-xs font-medium text-ink-3">
            <ArrowUpRight className="w-3.5 h-3.5 text-negative" />
            <span>You owe</span>
          </div>
          <div className="mt-0.5">
            <Money value={totalIOwe} tone="neutral" size="sm" />
          </div>
        </div>
      </div>

      {/* Net line */}
      <div className="flex items-center justify-between text-xs px-1">
        <span className="text-ink-3">Net position:</span>
        <Money
          value={netBalance}
          tone={netBalance > 0 ? 'positive' : netBalance < 0 ? 'negative' : 'neutral'}
          sign={netBalance > 0 ? 'always' : 'auto'}
          size="xs"
        />
      </div>

      {/* Top People List */}
      {topDebts.length > 0 ? (
        <div className="space-y-2 pt-1 border-t border-line">
          <span className="text-xs font-medium text-ink-3">
            Top open balances
          </span>
          <div className="space-y-1.5">
            {topDebts.map(({ contact, balance }) => {
              const owesMe = balance > 0;
              return (
                <div
                  key={contact.id}
                  onClick={() => setCurrentView('people')}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-surface hover:bg-sunken border border-line cursor-pointer transition-colors text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-6 h-6 rounded-xl bg-line text-ink-2 flex items-center justify-center font-semibold text-xs">
                      {contact.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-semibold text-ink-1 dark:text-slate-200 truncate">
                      {contact.name}
                    </span>
                  </div>

                  <span className="flex-shrink-0 flex items-center">
                    <span className={`text-sm font-semibold select-none mr-0.5 ${owesMe ? 'text-positive' : 'text-ink-1'}`}>
                      {owesMe ? '+' : '-'}
                    </span>
                    <Money
                      value={Math.abs(balance)}
                      tone={balance > 0 ? 'positive' : 'neutral'}
                      size="sm"
                    />
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-4 bg-sunken rounded-2xl border border-dashed border-line">
          <p className="text-xs text-ink-3 font-medium">All debts and IOUs are square!</p>
        </div>
      )}

      {/* Recently Settled Footer */}
      {latestSettlement && (
        <div
          onClick={() => setCurrentView('people')}
          className="pt-2.5 border-t border-line flex items-center justify-between text-xs text-ink-3 cursor-pointer hover:text-primary transition-colors min-h-[44px]"
        >
          <div className="flex items-center gap-1.5 min-w-0 truncate">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
            <span className="truncate">
              Recent: <span className="font-semibold text-ink-2">{contactMap.get(latestSettlement.contactId)?.name || 'Contact'}</span> settled <Money value={latestSettlement.amount} size="xs" />
            </span>
          </div>
          <span className="flex-shrink-0 font-medium text-xs text-ink-3 ml-2">
            {formatDate(latestSettlement.date)}
          </span>
        </div>
      )}
    </div>
  );
};
