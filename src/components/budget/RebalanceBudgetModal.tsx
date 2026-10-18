import React, { useState, useMemo } from 'react';
import { ArrowRightLeft, CheckCircle2, Sparkles } from 'lucide-react';
import { Modal } from '../common/Modal';
import { BudgetCategoryItem } from '../../types/finance';
import { computeBudgetMetrics, roundINR } from '../../utils/math';
import { AnimatedCurrency } from '../ui/AnimatedCurrency';
import { Button } from '../ui/Button';

export interface RebalanceBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetCategory: BudgetCategoryItem | null;
  allCategories: BudgetCategoryItem[];
  onApplyRebalance: (
    targetCategoryName: string,
    newTargetLimit: number,
    donorCategoryName?: string,
    newDonorLimit?: number
  ) => void;
}

interface RebalanceFormBodyProps {
  targetCategory: BudgetCategoryItem;
  allCategories: BudgetCategoryItem[];
  onClose: () => void;
  onApplyRebalance: RebalanceBudgetModalProps['onApplyRebalance'];
}

const RebalanceFormBody: React.FC<RebalanceFormBodyProps> = ({
  targetCategory,
  allCategories,
  onClose,
  onApplyRebalance,
}) => {
  const targetMetrics = useMemo(
    () => computeBudgetMetrics(targetCategory.allocated, targetCategory.spent),
    [targetCategory.allocated, targetCategory.spent]
  );

  const donorCandidates = useMemo(() => {
    return allCategories
      .filter(c => c.name !== targetCategory.name)
      .map(c => {
        const m = computeBudgetMetrics(c.allocated, c.spent);
        return {
          ...c,
          surplus: m.remainingAmount,
        };
      })
      .filter(c => c.surplus > 0)
      .sort((a, b) => b.surplus - a.surplus);
  }, [allCategories, targetCategory.name]);

  const [selectedDonorName, setSelectedDonorName] = useState<string>(
    () => donorCandidates[0]?.name || ''
  );
  const [transferAmount, setTransferAmount] = useState<number>(() =>
    Math.max(100, roundINR(targetMetrics.overrunAmount))
  );

  const activeDonor =
    donorCandidates.find(d => d.name === selectedDonorName) || donorCandidates[0];
  const safeDelta = Math.max(1, roundINR(transferAmount));
  const newTargetLimit = roundINR(targetCategory.allocated + safeDelta);
  const canTransferFromDonor =
    Boolean(activeDonor) && activeDonor.surplus >= safeDelta;

  const handleTransferFromDonor = () => {
    if (!activeDonor) return;
    const actualTransfer = Math.min(safeDelta, activeDonor.surplus);
    const nextTarget = roundINR(targetCategory.allocated + actualTransfer);
    const nextDonor = Math.max(
      roundINR(activeDonor.spent),
      roundINR(activeDonor.allocated - actualTransfer)
    );
    onApplyRebalance(
      targetCategory.name,
      nextTarget,
      activeDonor.name,
      nextDonor
    );
    onClose();
  };

  const handleExpandCeilingOnly = () => {
    onApplyRebalance(targetCategory.name, newTargetLimit);
    onClose();
  };

  return (
    <div className="space-y-4">
      <div className="p-3.5 rounded-xl bg-sunken border border-line space-y-1.5">
        <div className="flex items-center justify-between text-xs text-ink-3">
          <span>Current Spend vs. Ceiling</span>
          <span className="font-numeric tabular-nums font-semibold text-[#D93025]">
            Over by <AnimatedCurrency value={targetMetrics.overrunAmount} />
          </span>
        </div>
        <div className="flex items-baseline justify-between font-numeric tabular-nums">
          <span className="text-sm font-bold text-ink-1">
            <AnimatedCurrency value={targetCategory.spent} /> spent
          </span>
          <span className="text-xs text-ink-3">
            Original limit: <AnimatedCurrency value={targetCategory.allocated} />
          </span>
        </div>
      </div>

      {/* Amount to cover */}
      <div>
        <label className="block text-xs font-semibold text-ink-2 mb-1.5">
          Amount to add to {targetCategory.name} (INR ₹)
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            step={100}
            value={transferAmount}
            onChange={e => setTransferAmount(Math.max(0, Number(e.target.value)))}
            className="w-full rounded-xl border border-line bg-surface px-3.5 py-2 text-sm font-numeric tabular-nums font-bold text-ink-1 focus:border-primary"
          />
          <button
            type="button"
            onClick={() => setTransferAmount(targetMetrics.overrunAmount)}
            className="px-3 py-2 rounded-xl border border-line bg-sunken hover:bg-line/60 text-xs font-semibold text-ink-2 whitespace-nowrap shrink-0 cursor-pointer"
          >
            Exact Deficit
          </button>
        </div>
        <p className="text-[11px] text-ink-3 mt-1 font-numeric tabular-nums">
          New {targetCategory.name} limit will be{' '}
          <strong className="text-ink-1">
            <AnimatedCurrency value={newTargetLimit} />
          </strong>{' '}
          (100% covered)
        </p>
      </div>

      {/* Donor Category Selection */}
      {donorCandidates.length > 0 ? (
        <div className="space-y-2 pt-1">
          <label className="block text-xs font-semibold text-ink-2">
            Transfer unused surplus from another category
          </label>
          <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
            {donorCandidates.map(donor => {
              const isPicked = activeDonor?.name === donor.name;
              return (
                <button
                  key={donor.id}
                  type="button"
                  onClick={() => setSelectedDonorName(donor.name)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-left text-xs transition-colors cursor-pointer ${
                    isPicked
                      ? 'border-primary bg-primary-tint/50 text-ink-1'
                      : 'border-line bg-surface hover:bg-sunken text-ink-2'
                  }`}
                >
                  <div className="font-semibold text-ink-1 flex items-center gap-2">
                    <CheckCircle2
                      className={`w-4 h-4 ${
                        isPicked ? 'text-primary' : 'text-ink-3/40'
                      }`}
                    />
                    <span>{donor.name}</span>
                  </div>
                  <span className="font-numeric tabular-nums text-[#81C995] font-bold">
                    +<AnimatedCurrency value={donor.surplus} /> surplus
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="p-3 rounded-xl bg-sunken text-xs text-ink-3">
          No other categories currently have unused surplus. You can directly raise the monthly limit for{' '}
          <strong className="text-ink-1">{targetCategory.name}</strong>.
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-3 border-t border-line">
        <Button variant="ghost" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleExpandCeilingOnly}
          leftIcon={<Sparkles className="w-3.5 h-3.5 text-reward" />}
        >
          Raise Ceiling Only
        </Button>
        {activeDonor && (
          <Button
            variant="primary"
            size="sm"
            onClick={handleTransferFromDonor}
            leftIcon={<ArrowRightLeft className="w-3.5 h-3.5" />}
          >
            {canTransferFromDonor
              ? `Rebalance from ${activeDonor.name}`
              : `Transfer Available Surplus`}
          </Button>
        )}
      </div>
    </div>
  );
};

/**
 * Prospect Theory Cortisol De-escalation:
 * Constructive "One-Click Rebalance from Surplus" modal that lets users cover a category overrun
 * either by transferring unused surplus from an under-budget category or raising the ceiling.
 */
export const RebalanceBudgetModal: React.FC<RebalanceBudgetModalProps> = ({
  isOpen,
  onClose,
  targetCategory,
  allCategories,
  onApplyRebalance,
}) => {
  if (!targetCategory) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Rebalance ${targetCategory.name} Budget`}
      maxWidth="md"
    >
      <RebalanceFormBody
        key={targetCategory.id}
        targetCategory={targetCategory}
        allCategories={allCategories}
        onClose={onClose}
        onApplyRebalance={onApplyRebalance}
      />
    </Modal>
  );
};
