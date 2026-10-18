import React from 'react';
import {
  Coffee,
  Car,
  Utensils,
  ShoppingBag,
  Fuel,
} from 'lucide-react';

export interface QuickLogPresetItem {
  id: string;
  label: string;
  description: string;
  category: string;
  amount: number;
  icon: React.ElementType;
}

export const DEFAULT_UPI_PRESETS: QuickLogPresetItem[] = [
  {
    id: 'preset-chai',
    label: 'Chai & Snacks',
    description: 'Chai & Quick Bite',
    category: 'Food & Dining',
    amount: 40,
    icon: Coffee,
  },
  {
    id: 'preset-commute',
    label: 'Auto / Metro',
    description: 'Daily Commute UPI',
    category: 'Transportation',
    amount: 120,
    icon: Car,
  },
  {
    id: 'preset-dining',
    label: 'Swiggy / Zomato',
    description: 'Food Delivery Order',
    category: 'Food & Dining',
    amount: 350,
    icon: Utensils,
  },
  {
    id: 'preset-groceries',
    label: 'Zepto / Blinkit',
    description: 'Quick Groceries Order',
    category: 'Groceries',
    amount: 650,
    icon: ShoppingBag,
  },
  {
    id: 'preset-fuel',
    label: 'Fuel / Petrol',
    description: 'Fuel Station Refill',
    category: 'Transportation',
    amount: 1000,
    icon: Fuel,
  },
];
