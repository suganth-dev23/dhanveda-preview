import React, { useState } from 'react';
import {
  Plus,
  Target,
  Edit3,
  Trash2,
  Clock,
  Zap,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { DreamGoal } from '../../types/finance';
import { formatDate, calculateMonthsDiff, getTodayString } from '../../utils/date';
import { IconRenderer } from '../common/IconRenderer';
import { AnimatedNumber } from '../common/AnimatedNumber';
import { EmptyState } from '../common/EmptyState';
import { DreamModal } from './DreamModal';
import { DreamContributionModal } from './DreamContributionModal';
import { useStaggerChildren } from '../../hooks/useStaggerChildren';
import { Button, Card, Money, Stat, Progress } from '../ui';

export const DreamsView: React.FC = () => {
  const { containerRef: dreamGridRef, getChildStyle } = useStaggerChildren(60);
  const { dreams, deleteDream, totalGoalsTarget, totalGoalsSaved } = useFinance();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDream, setSelectedDream] = useState<DreamGoal | null>(null);

  const [isContributionOpen, setIsContributionOpen] = useState(false);
  const [targetContributionDream, setTargetContributionDream] = useState<DreamGoal | null>(null);

  const safeTotalGoalsTarget = Number.isFinite(totalGoalsTarget) && totalGoalsTarget > 0 ? totalGoalsTarget : 0;
  const safeTotalGoalsSaved = Number.isFinite(totalGoalsSaved) && totalGoalsSaved > 0 ? totalGoalsSaved : 0;
  const rawOverallPercent = safeTotalGoalsTarget > 0 ? Math.round((safeTotalGoalsSaved / safeTotalGoalsTarget) * 100) : 0;
  const overallPercent = Number.isFinite(rawOverallPercent) ? Math.max(0, rawOverallPercent) : 0;
  const completedGoalsCount = dreams.filter(d => (d.targetAmount || 0) > 0 && (d.currentSaved || 0) >= d.targetAmount).length;

  const handleEdit = (dream: DreamGoal) => {
    setSelectedDream(dream);
    setIsModalOpen(true);
  };

  const handleOpenAdd = () => {
    setSelectedDream(null);
    setIsModalOpen(true);
  };

  const handleOpenContribution = (dream: DreamGoal) => {
    setTargetContributionDream(dream);
    setIsContributionOpen(true);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Hero Overview: Mineral Card with Gold Milestone Highlight */}
      <Card variant="hero" padding="none" className="p-4 sm:p-8 rounded-2xl">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-reward-fill to-transparent opacity-80" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-xl bg-primary-tint text-primary">
                <Target className="h-4 w-4" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-ink-3">
                MILESTONE GOALS &amp; DREAMS
              </span>
            </div>
            <p className="text-xs text-ink-3 mb-1">
              Total Accumulated Goal Savings
            </p>
            <div className="flex items-baseline gap-3">
              <h2 className="text-3xl sm:text-4xl font-black font-numeric tracking-tight text-ink-1">
                <AnimatedNumber value={safeTotalGoalsSaved} animateOnMount={true} />
              </h2>
              <span className="text-sm font-semibold text-positive">
                {overallPercent}% reached
              </span>
            </div>
            <p className="mt-2 text-xs text-ink-3 flex items-center gap-1 flex-wrap">
              <span>Target across all goals:</span>
              <Money value={safeTotalGoalsTarget} size="xs" />
              <span>• {completedGoalsCount} of {dreams.length} completed</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="primary"
              size="md"
              leftIcon={<Plus className="h-4 w-4 stroke-[2.5]" />}
              onClick={handleOpenAdd}
            >
              New Milestone
            </Button>
          </div>
        </div>

        {/* Global Progress Track */}
        <div className="mt-6 pt-5 border-t border-line">
          <div className="flex justify-between items-center text-xs text-ink-3 mb-2 font-medium">
            <span className="font-numeric">Overall Progress: {overallPercent}%</span>
            <span className="font-numeric flex items-center gap-1">
              <span>Target:</span>
              <Money value={safeTotalGoalsTarget} size="xs" />
            </span>
          </div>
          <Progress
            value={Math.min(safeTotalGoalsSaved, safeTotalGoalsTarget)}
            max={safeTotalGoalsTarget > 0 ? safeTotalGoalsTarget : 1}
            tone={safeTotalGoalsSaved >= safeTotalGoalsTarget && safeTotalGoalsTarget > 0 ? 'reward' : 'primary'}
            size="md"
          />
        </div>

        {/* 4-column summary strip */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-line">
          <div className="animate-slide-up">
            <Card variant="sunken" padding="sm" className="rounded-2xl h-full">
              <Stat label="Total Target" value={totalGoalsTarget} moneyProps={{ compact: true }} />
            </Card>
          </div>
          <div className="animate-slide-up">
            <Card variant="sunken" padding="sm" className="rounded-2xl h-full">
              <Stat label="Total Saved" value={totalGoalsSaved} moneyProps={{ compact: true, tone: 'positive' }} />
            </Card>
          </div>
          <div className="animate-slide-up">
            <Card variant="sunken" padding="sm" className="rounded-2xl h-full">
              <Stat label="Active Dreams" value={`${dreams.length} goals`} />
            </Card>
          </div>
          <div className="animate-slide-up">
            <Card variant="sunken" padding="sm" className="rounded-2xl h-full">
              <Stat
                label="Success Rate"
                value={dreams.length > 0 ? `${Math.round((completedGoalsCount / dreams.length) * 100)}%` : '0%'}
              />
            </Card>
          </div>
        </div>
      </Card>

      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-ink-1 tracking-tight">
            Active Milestone Goals
          </h3>
          <p className="text-xs text-ink-3">
            Target savings, vacations, vehicle purchases, and life dreams
          </p>
        </div>
        <span className="text-xs font-semibold text-ink-3">
          {dreams.length} goals
        </span>
      </div>

      {/* Goals Grid */}
      {dreams.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No active goals yet"
          description="Add a dream like a vacation, gadget, vehicle, or down payment to build an automatic monthly savings plan."
          actionLabel="Create Your First Goal"
          onAction={handleOpenAdd}
        />
      ) : (
        <div ref={dreamGridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {dreams.map((dream, idx) => {
            const safeTarget = Number.isFinite(dream.targetAmount) && dream.targetAmount > 0 ? dream.targetAmount : 0;
            const safeSaved = Number.isFinite(dream.currentSaved) && dream.currentSaved > 0 ? dream.currentSaved : 0;
            const rawPercent = safeTarget > 0 ? Math.round((safeSaved / safeTarget) * 100) : 0;
            const percent = Number.isFinite(rawPercent) ? Math.max(0, rawPercent) : 0;
            const remaining = Math.max(0, safeTarget - safeSaved);
            const isCompleted = safeTarget > 0 && safeSaved >= safeTarget;
            const isOverAchieved = safeTarget > 0 && safeSaved > safeTarget;

            // Suggested monthly savings calculation
            let monthsLeft: number | null = null;
            let suggestedMonthly = 0;
            if (dream.targetDate && !isCompleted) {
              const today = getTodayString();
              monthsLeft = calculateMonthsDiff(today, dream.targetDate);
              suggestedMonthly = monthsLeft > 0 ? Math.ceil(remaining / monthsLeft) : remaining;
            }

            const themeColor = dream.color || '#10b981';

            return (
              <Card
                key={dream.id}
                variant="surface"
                padding="none"
                style={getChildStyle(idx)}
                className={`group lift rounded-2xl p-6 transition-[transform,box-shadow,border-color] duration-200 shadow-sm hover:shadow-md flex flex-col justify-between relative overflow-hidden animate-slide-up ${
                  isCompleted
                    ? 'border-line/60 dark:border-line/40 ring-1 ring-primary/20'
                    : 'border-line hover:border-emerald-500/40'
                }`}
              >
                {/* Accent top stripe glow */}
                <div
                  className="absolute top-0 left-0 right-0 h-1"
                  style={{ backgroundColor: themeColor }}
                />

                <div>
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner transition-transform group-hover:scale-105"
                        style={{
                          backgroundColor: `${themeColor}20`,
                          color: themeColor,
                        }}
                      >
                        <IconRenderer name={dream.icon || 'Target'} className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-ink-1 text-base leading-tight">
                            {dream.name}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-ink-3 font-medium">{dream.category}</span>
                          {dream.priority === 'high' && (
                            <span className="text-xs uppercase font-extrabold px-2 py-0.5 rounded-full bg-warning-tint text-warning border border-warning/20">
                              High
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEdit(dream)}
                        className="press flex h-8 w-8 items-center justify-center rounded-xl border border-line text-ink-3 hover:bg-sunken hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                        title="Edit Goal"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`Delete goal "${dream.name}"?`)) {
                            deleteDream(dream.id);
                          }
                        }}
                        className="press flex h-8 w-8 items-center justify-center rounded-xl border border-line text-ink-3 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        title="Delete Goal"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Financial Metrics */}
                  <div className="mt-5 space-y-3">
                    <div className="flex justify-between items-baseline">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-ink-3">
                          Saved
                        </span>
                        <div>
                          <Money value={safeSaved} size="lg" className="font-extrabold" />
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold uppercase tracking-wider text-ink-3">
                          Target
                        </span>
                        <div>
                          <Money value={safeTarget} size="sm" className="font-bold text-ink-3" />
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-ink-3 font-numeric">{percent}% Complete</span>
                        <span className={isCompleted ? 'text-positive font-bold animate-pulse-success-infinite inline-block' : 'text-ink-3'}>
                          {isOverAchieved ? (
                            `Accomplished 🎉 (+${percent - 100}% extra)`
                          ) : isCompleted ? (
                            'Accomplished 🎉'
                          ) : (
                            <span className="inline-flex items-center gap-1 font-numeric">
                              <Money value={remaining} size="xs" />
                              <span>left</span>
                            </span>
                          )}
                        </span>
                      </div>
                      <Progress
                        value={Math.min(safeSaved, safeTarget)}
                        max={safeTarget > 0 ? safeTarget : 1}
                        tone={isCompleted ? 'reward' : 'primary'}
                        size="sm"
                      />
                    </div>

                    {/* Deadline & Suggested Monthly Savings */}
                    {dream.targetDate && !isCompleted && monthsLeft !== null && (
                      <Card variant="sunken" padding="none" className="p-3.5 rounded-2xl text-xs space-y-1.5">
                        <div className="flex items-center justify-between text-ink-3">
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Target: {formatDate(dream.targetDate)}</span>
                          </span>
                          <span className="font-semibold text-ink-2">
                            {monthsLeft} mo. left
                          </span>
                        </div>
                        <div className="flex items-center justify-between font-bold pt-1.5 border-t border-line">
                          <span className="text-positive flex items-center gap-1">
                            <Zap className="w-3 h-3" /> Monthly Target:
                          </span>
                          <span className="inline-flex items-center gap-1 text-ink-1 font-numeric">
                            <Money value={suggestedMonthly} size="xs" />
                            <span>/ mo</span>
                          </span>
                        </div>
                      </Card>
                    )}
                  </div>
                </div>

                {/* Bottom Action */}
                <div className="mt-5 pt-4 border-t border-line flex items-center justify-between">
                  <span className="text-xs text-ink-3 font-medium">
                    {dream.contributions?.length || 0} contributions
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                    onClick={() => handleOpenContribution(dream)}
                  >
                    Log Savings
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <DreamModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialDream={selectedDream}
      />

      <DreamContributionModal
        isOpen={isContributionOpen}
        onClose={() => setIsContributionOpen(false)}
        dream={targetContributionDream}
      />
    </div>
  );
};
