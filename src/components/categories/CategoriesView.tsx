import React, { useState } from 'react';
import { Plus, Edit3, Trash2, Layers } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { Category } from '../../types/finance';
import { IconRenderer } from '../common/IconRenderer';
import { CategoryModal } from './CategoryModal';
import { useStaggerChildren } from '../../hooks/useStaggerChildren';
import { Button, Card, Money, Stat } from '../ui';

export const CategoriesView: React.FC = () => {
 const { containerRef: catGridRef, getChildStyle } = useStaggerChildren(40);
 const {
 categories,
 transactions,
 deleteCategory,
 categorySpendingThisMonth,
 } = useFinance();

 const [isModalOpen, setIsModalOpen] = useState(false);
 const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

 const spendingMap = new Map(categorySpendingThisMonth.map(c => [c.category.toLowerCase(), c.spent]));

 const customCount = categories.filter(c => c.isCustom).length;
 const topSpentCat = categorySpendingThisMonth[0];

 const handleEdit = (cat: Category) => {
 setSelectedCategory(cat);
 setIsModalOpen(true);
 };

 const handleOpenAdd = () => {
 setSelectedCategory(null);
 setIsModalOpen(true);
 };

 const handleDeleteCategory = (cat: Category) => {
 if (!cat.isCustom) {
 alert(`Default system category "${cat.name}" cannot be deleted.`);
 return;
 }

 const txCount = transactions.filter(
 t => t.category && t.category.trim().toLowerCase() === cat.name.trim().toLowerCase()
 ).length;

 let confirmMsg: string;
 if (txCount > 0) {
 confirmMsg = `Warning: "${cat.name}" is used in ${txCount} existing transaction${
 txCount > 1 ? 's' : ''
 }. Deleting it will leave those transactions without a defined category. Are you sure you want to proceed?`;
 } else {
 confirmMsg = `Delete custom category "${cat.name}"?`;
 }

 if (window.confirm(confirmMsg)) {
 deleteCategory(cat.id);
 }
 };

 return (
 <div className="space-y-6 max-w-7xl mx-auto pb-16">
 {/* Top Banner: Mineral Card with Gold Taxonomy Highlight */}
 <Card variant="hero" padding="none" className="rounded-2xl text-ink-1 p-6 sm:p-8">
 <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-reward-fill to-transparent opacity-80" />
 <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
 <div>
 <div className="flex items-center gap-2 mb-2">
 <span className="flex h-6 w-6 items-center justify-center rounded-xl bg-primary-tint text-primary">
 <Layers className="h-4 w-4" />
 </span>
 <span className="text-xs font-bold uppercase tracking-wider text-ink-3">
 TAXONOMY &amp; EXPENSE RULES
 </span>
 </div>
 <p className="text-xs text-ink-3 mb-1">
 Expense Classification Directory
 </p>
 <div className="flex items-baseline gap-3">
 <h2 className="text-3xl sm:text-4xl font-black font-numeric tracking-tight text-ink-1">
 {categories.length}
 </h2>
 <span className="text-sm font-semibold text-ink-3">
 categories defined
 </span>
 </div>
 <p className="mt-2 text-xs text-ink-3">
 {customCount} custom user classifications • {categorySpendingThisMonth.length} active spending channels this month
 </p>
 </div>

 <div className="flex flex-wrap items-center gap-3">
 <Button
 variant="primary"
 size="md"
 onClick={handleOpenAdd}
 leftIcon={<Plus className="h-4 w-4 stroke-[2.5]" />}
 >
 New Category
 </Button>
 </div>
 </div>

 {/* 4-column summary strip */}
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-line">
 <Card variant="sunken" padding="sm" className="rounded-2xl">
 <Stat
 label="Total System"
 value={`${categories.length} types`}
 />
 </Card>
 <Card variant="sunken" padding="sm" className="rounded-2xl">
 <Stat
 label="Custom User"
 value={`${customCount} custom`}
 />
 </Card>
 <Card variant="sunken" padding="sm" className="rounded-2xl">
 <Stat
 label="Active Spends"
 value={`${categorySpendingThisMonth.length} channels`}
 />
 </Card>
 <Card variant="sunken" padding="sm" className="rounded-2xl">
 <Stat
 label="Top Spend"
 value={topSpentCat ? `${topSpentCat.category}` : 'None'}
 />
 </Card>
 </div>
 </Card>

 {/* Section Header */}
 <div className="flex items-center justify-between">
 <div>
 <h3 className="text-lg font-bold text-ink-1 tracking-tight">
 All Categories
 </h3>
 <p className="text-xs text-ink-3">
 Manage icon graphics, palette color tags, and transaction assignments
 </p>
 </div>
 <span className="text-xs font-semibold text-ink-3">
 {categories.length} categories
 </span>
 </div>

 {/* Categories Grid */}
 <div ref={catGridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
 {categories.map((cat, idx) => {
 const spentThisMonth = spendingMap.get(cat.name.toLowerCase()) || 0;

 return (
 <Card
 key={cat.id}
 variant="surface"
 padding="md"
 style={getChildStyle(idx)}
 className="group rounded-2xl hover:border-warning/50 dark:hover:border-primary/30 transition-[transform,box-shadow,background-color] duration-200 hover:shadow-md flex flex-col justify-between animate-slide-up"
 >
 <div>
 <div className="flex items-start justify-between">
 <div
 className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner transition-transform group-hover:scale-105"
 style={{
 backgroundColor: `${cat.color}20`,
 color: cat.color,
 }}
 >
 <IconRenderer name={cat.icon} className="w-6 h-6" />
 </div>

 <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
 <button
 onClick={() => handleEdit(cat)}
 className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-line text-ink-3 hover:bg-sunken hover:text-ink-1 transition-colors"
 title="Edit Category"
 aria-label={`Edit ${cat.name} Category`}
 >
 <Edit3 className="w-4 h-4" />
 </button>
 {cat.isCustom && (
 <button
 onClick={() => handleDeleteCategory(cat)}
 className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-line text-ink-3 hover:text-negative hover:bg-negative-tint transition-colors"
 title="Delete Category"
 aria-label={`Delete ${cat.name} Category`}
 >
 <Trash2 className="w-4 h-4" />
 </button>
 )}
 </div>
 </div>

 <div className="mt-4">
 <div className="flex items-center gap-2">
 <h3 className="font-bold text-ink-1 text-base">
 {cat.name}
 </h3>
 {cat.isCustom && (
 <span className="text-xs uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
 Custom
 </span>
 )}
 </div>
 <p className="text-xs text-ink-3 capitalize mt-0.5 font-medium">
 {cat.type} Category
 </p>
 </div>
 </div>

 {/* Monthly Spend Snapshot */}
 <div className="mt-4 pt-3.5 border-t border-line flex items-center justify-between text-xs">
 <span className="text-ink-3 font-medium">This Month:</span>
 <Money
 value={spentThisMonth}
 tone={spentThisMonth > 0 ? 'expense' : 'neutral'}
 size="sm"
 className="font-extrabold"
 />
 </div>
 </Card>
 );
 })}
 </div>

 <CategoryModal
 isOpen={isModalOpen}
 onClose={() => setIsModalOpen(false)}
 initialCategory={selectedCategory}
 />
 </div>
 );
};
