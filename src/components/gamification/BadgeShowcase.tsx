import React, { useState, useMemo } from 'react';
import {
 Trophy,
 Lock,
 CheckCircle2,
 Search,
 Sparkles,
 Zap,
 Target,
 Flame,
 ShieldCheck,
 TrendingUp,
 Star,
} from 'lucide-react';
import { useGamification } from '../../context/GamificationContext';
import { BadgeCategory, BadgeTier } from '../../types/finance';
import { ProgressBar } from '../common/ProgressBar';
import { EmptyState } from '../common/EmptyState';
import { IconRenderer } from '../common/IconRenderer';
import { useStaggerChildren } from '../../hooks/useStaggerChildren';

type FilterCategory = 'all' | BadgeCategory;
type FilterStatus = 'all' | 'unlocked' | 'locked';

const CATEGORY_TABS: { id: FilterCategory; label: string; icon: React.ElementType }[] = [
 { id: 'all', label: 'All Badges', icon: Trophy },
 { id: 'budgeting', label: 'Budgeting', icon: ShieldCheck },
 { id: 'saving', label: 'Saving & Goals', icon: Target },
 { id: 'investing', label: 'Investing', icon: TrendingUp },
 { id: 'consistency', label: 'Consistency', icon: Flame },
 { id: 'milestone', label: 'Milestones', icon: Zap },
];

const TIER_STYLES: Record<BadgeTier, { border: string; bg: string; text: string; label: string }> = {
 bronze: {
 border: 'border-amber-700/30 dark:border-amber-700/40 hover:border-amber-700/60',
 bg: 'bg-amber-900/10 dark:bg-amber-900/20 text-amber-800 dark:text-amber-400',
 text: 'text-amber-700 dark:text-amber-400',
 label: 'Bronze',
 },
 silver: {
 border: 'border-slate-300 dark:border-slate-700 hover:border-slate-400',
 bg: 'bg-sunken text-ink-2',
 text: 'text-ink-2',
 label: 'Silver',
 },
 gold: {
 border: 'border-amber-400/50 dark:border-reward/50 hover:border-reward shadow-xs hover:shadow-xs',
 bg: 'bg-amber-500/10 dark:bg-amber-500/15 text-amber-700 dark:text-reward',
 text: 'text-amber-700 dark:text-reward',
 label: 'Gold',
 },
 diamond: {
 border: 'border-cyan-400/60 dark:border-cyan-400/50 hover:border-cyan-400 shadow-xs hover:shadow-cyan-500/10',
 bg: 'bg-cyan-500/10 dark:bg-cyan-500/15 text-cyan-700 dark:text-cyan-300',
 text: 'text-cyan-700 dark:text-cyan-300',
 label: 'Diamond',
 },
};

export const BadgeShowcase: React.FC = () => {
 const { containerRef: badgeGridRef, getChildStyle } = useStaggerChildren(40);
 const { badges, unlockedCount, totalXP, levelInfo, streak, healthScore } = useGamification();

 const [selectedCategory, setSelectedCategory] = useState<FilterCategory>('all');
 const [selectedStatus, setSelectedStatus] = useState<FilterStatus>('all');
 const [searchQuery, setSearchQuery] = useState('');

 const percentComplete = badges.length > 0 ? Math.round((unlockedCount / badges.length) * 100) : 0;

 // Filter badges
 const filteredBadges = useMemo(() => {
 return badges.filter(badge => {
 // Category filter
 if (selectedCategory !== 'all' && badge.category !== selectedCategory) {
 return false;
 }
 // Status filter
 const isUnlocked = Boolean(badge.unlockedAt) || badge.progress === 100;
 if (selectedStatus === 'unlocked' && !isUnlocked) return false;
 if (selectedStatus === 'locked' && isUnlocked) return false;

 // Search query
 if (searchQuery.trim()) {
 const q = searchQuery.toLowerCase();
 const matchesName = badge.name.toLowerCase().includes(q);
 const matchesDesc = badge.description.toLowerCase().includes(q);
 return matchesName || matchesDesc;
 }

 return true;
 });
 }, [badges, selectedCategory, selectedStatus, searchQuery]);

 return (
 <div className="space-y-6 max-w-7xl mx-auto pb-16">
 {/* Hero Overview: Mineral Card with Suvarna Gold Accent */}
 <div className="relative overflow-hidden rounded-2xl bg-surface text-ink-1 p-6 sm:p-8 border border-line shadow-sm">
 <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-reward-fill to-transparent opacity-80" />

 <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
 <div>
 <div className="flex items-center gap-2 mb-2">
 <span className="flex h-6 w-6 items-center justify-center rounded-xl bg-reward-tint text-reward">
 <Trophy className="h-4 w-4" />
 </span>
 <span className="text-xs font-bold uppercase tracking-wider text-reward">
 ACHIEVEMENT VAULT &amp; TROPHIES
 </span>
 </div>
 <p className="text-xs text-ink-3 mb-1">
 Financial Discipline Mastery
 </p>
 <div className="flex items-baseline gap-3">
 <h2 className="text-3xl sm:text-4xl font-black font-numeric tracking-tight text-ink-1">
 {unlockedCount}{' '}
 <span className="text-xl sm:text-2xl font-semibold text-ink-3 font-sans">
 of {badges.length} Unlocked
 </span>
 </h2>
 <span className="text-xs font-bold font-numeric px-2.5 py-1 rounded-full bg-reward-tint text-reward border border-reward/20">
 {percentComplete}% Completed
 </span>
 </div>
 <p className="mt-2 text-xs text-ink-3">
 Level <span className="font-numeric font-semibold">{levelInfo.level}</span> Wealth Architect • <span className="font-numeric font-semibold">{totalXP}</span> Total XP Earned • <span className="font-numeric font-semibold">{badges.length - unlockedCount}</span> Badges Awaiting Unlock
 </p>
 </div>

 {/* Level Progress Widget in Hero */}
 <div className="w-full md:w-80 bg-sunken p-4 rounded-2xl border border-line">
 <div className="flex justify-between items-center text-xs mb-1.5 font-bold">
 <span className="text-reward">
 Level <span className="font-numeric">{levelInfo.level}</span> Progress
 </span>
 <span className="font-numeric text-ink-2">
 {levelInfo.progress}%
 </span>
 </div>
 <ProgressBar value={levelInfo.progress} max={100} size="sm" glowOnMilestone />
 <div className="flex justify-between items-center text-xs text-ink-3 mt-2 font-numeric">
 <span>{totalXP} XP</span>
 <span>{levelInfo.xpToNext} XP to Level {levelInfo.level + 1}</span>
 </div>
 </div>
 </div>

 {/* 4-column summary strip */}
 <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-line">
 <div className="rounded-2xl bg-sunken p-3.5 border border-line">
 <span className="text-xs text-ink-3">Badges Earned</span>
 <p className="text-lg font-bold font-numeric text-ink-1 mt-0.5">
 {unlockedCount} / {badges.length}
 </p>
 </div>
 <div className="rounded-2xl bg-sunken p-3.5 border border-line">
 <span className="text-xs text-ink-3">Total XP</span>
 <p className="text-lg font-bold font-numeric text-reward mt-0.5">
 {totalXP} XP
 </p>
 </div>
 <div className="rounded-2xl bg-sunken p-3.5 border border-line">
 <span className="text-xs text-ink-3">Logging Streak</span>
 <p className="text-lg font-bold font-numeric text-positive mt-0.5">
 {streak.currentStreak} Days
 </p>
 </div>
 <div className="rounded-2xl bg-sunken p-3.5 border border-line">
 <span className="text-xs text-ink-3">Health Rating</span>
 <p className="text-lg font-bold font-numeric text-ink-1 mt-0.5">
 Grade {healthScore.grade} ({healthScore.overallScore} pts)
 </p>
 </div>
 </div>
 </div>

 {/* Filter and Search Bar */}
 <div className="bg-surface rounded-2xl p-5 border border-line shadow-xs space-y-4">
 {/* Category Tabs */}
 <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
 {CATEGORY_TABS.map(tab => {
 const Icon = tab.icon;
 const isActive = selectedCategory === tab.id;
 return (
 <button
 key={tab.id}
 onClick={() => setSelectedCategory(tab.id)}
 className={`press flex items-center gap-2 px-3.5 py-2.5 min-h-[44px] rounded-xl text-xs font-bold transition-colors shrink-0 cursor-pointer ${
 isActive
 ? 'bg-ink-1 text-surface shadow-xs'
 : 'bg-sunken text-ink-2 hover:text-ink-1'
 }`}
 >
 <Icon className="w-3.5 h-3.5" />
 <span>{tab.label}</span>
 </button>
 );
 })}
 </div>

 {/* Secondary Filters: Status & Search */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-line">
 {/* Status Buttons */}
 <div className="flex items-center gap-1.5">
 {(['all', 'unlocked', 'locked'] as FilterStatus[]).map(status => {
 const isActive = selectedStatus === status;
 const label =
 status === 'all'
 ? 'All'
 : status === 'unlocked'
 ? `Earned (${unlockedCount})`
 : `Locked (${badges.length - unlockedCount})`;

 return (
 <button
 key={status}
 onClick={() => setSelectedStatus(status)}
 className={`press px-3.5 py-2 min-h-[44px] rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
 isActive
 ? 'bg-reward-tint text-reward border border-reward/30'
 : 'text-ink-3 hover:bg-sunken'
 }`}
 >
 {label}
 </button>
 );
 })}
 </div>

 {/* Search Box */}
 <div className="relative w-full sm:w-64">
 <Search className="w-4 h-4 text-ink-3 absolute left-3 top-1/2 -translate-y-1/2" />
 <input
 type="text"
 value={searchQuery}
 onChange={e => setSearchQuery(e.target.value)}
 placeholder="Search achievements..."
 className="w-full pl-9 pr-3.5 py-1.5 rounded-xl bg-sunken border border-line text-xs text-ink-1 placeholder-ink-3 focus:outline-none focus:ring-2 focus:ring-amber-400"
 />
 </div>
 </div>
 </div>

 {/* Badges Grid */}
 {filteredBadges.length === 0 ? (
 <EmptyState
 icon={Trophy}
 title="No achievements match filter"
 description="Try resetting your category or status filters to view your trophy collection."
 actionLabel="Clear Filters"
 onAction={() => {
 setSelectedCategory('all');
 setSelectedStatus('all');
 setSearchQuery('');
 }}
 />
 ) : (
 <div ref={badgeGridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
 {filteredBadges.map((badge, idx) => {
 const isUnlocked = Boolean(badge.unlockedAt) || badge.progress === 100;
 const tierStyle = TIER_STYLES[badge.tier || 'bronze'];

 return (
 <div
 key={badge.id}
 style={getChildStyle(idx)}
 className={`group lift relative overflow-hidden rounded-2xl p-5 border transition-[transform,box-shadow,border-color] duration-200 shadow-xs hover:shadow-md animate-slide-up ${
 isUnlocked
 ? `bg-surface ${tierStyle.border}`
 : 'bg-sunken/50 border-line opacity-85'
 }`}
 >
 {/* Header: Icon Box and Badges */}
 <div className="flex items-start justify-between gap-3">
 <div className="flex items-center gap-3">
 <div
 className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner transition-transform group-hover:scale-105 ${
 isUnlocked
 ? tierStyle.bg
 : 'bg-sunken text-ink-3'
 }`}
 >
 <IconRenderer
 name={badge.icon || 'Award'}
 className={`w-6 h-6 ${isUnlocked ? tierStyle.text : 'text-ink-3'}`}
 />
 </div>

 <div>
 <div className="flex items-center gap-1.5">
 <span
 className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
 isUnlocked
 ? `${tierStyle.bg} border-current`
 : 'bg-sunken text-ink-3 border-line'
 }`}
 >
 {tierStyle.label}
 </span>
 <span className="text-xs font-semibold text-ink-3 uppercase tracking-wider">
 {badge.category}
 </span>
 </div>
 <h3 className="text-base font-bold text-ink-1 mt-1">
 {badge.name}
 </h3>
 </div>
 </div>

 {/* Lock or Check status */}
 <div>
 {isUnlocked ? (
 <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-positive-tint text-positive">
 <CheckCircle2 className="w-4 h-4" />
 </span>
 ) : (
 <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-sunken text-ink-3">
 <Lock className="w-3.5 h-3.5" />
 </span>
 )}
 </div>
 </div>

 {/* Description */}
 <p className="text-xs text-ink-3 mt-3 line-clamp-2 leading-relaxed">
 {badge.description}
 </p>

 {/* Footer Progress & XP */}
 <div className="mt-4 pt-3.5 border-t border-line flex items-center justify-between text-xs">
 <div className="flex items-center gap-1 text-xs font-semibold">
 <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
 <span className="font-numeric text-ink-1 font-bold">
 +{badge.xp} XP
 </span>
 </div>

 {isUnlocked ? (
 <span className="text-xs text-positive font-semibold flex items-center gap-1">
 <Sparkles className="w-3 h-3" />
 Earned
 </span>
 ) : (
 <div className="flex items-center gap-2">
 {typeof badge.currentCount === 'number' && typeof badge.targetCount === 'number' ? (
 <span className="font-numeric text-xs text-ink-3 font-medium">
 {badge.currentCount}/{badge.targetCount} ({badge.progress}%)
 </span>
 ) : (
 <span className="font-numeric text-xs text-ink-3 font-medium">
 {badge.progress}%
 </span>
 )}
 </div>
 )}
 </div>

 {/* Progress bar for locked badges */}
 {!isUnlocked && (badge.progress ?? 0) > 0 && (
 <div
 className="h-1 w-full bg-sunken rounded-full overflow-hidden"
 role="progressbar"
 aria-valuenow={Math.round(badge.progress ?? 0)}
 aria-valuemin={0}
 aria-valuemax={100}
 aria-label={`${badge.name} unlock progress`}
 >
 <div
 className="h-full bg-amber-500/70 rounded-full transition-[width] duration-500"
 style={{ width: `${badge.progress}%` }}
 />
 </div>
 )}
 </div>
 );
 })}
 </div>
 )}
 </div>
 );
};
