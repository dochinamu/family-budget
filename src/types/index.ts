export type TransactionType = "expense" | "income";

export interface Household {
  id: string;
  name: string;
  created_at: string;
}

export interface Category {
  id: string;
  household_id: string;
  name: string;
  icon: string;
  type: TransactionType;
  color: string;
  is_default: boolean;
}

export interface Transaction {
  id: string;
  household_id: string;
  written_by: string | null;
  type: TransactionType;
  amount: number;
  category_id: string;
  memo: string | null;
  date: string;
  is_recurring: boolean;
  recurring_id: string | null;
  created_at: string;
  category?: Category;
}

export interface RecurringRule {
  id: string;
  household_id: string;
  type: TransactionType;
  amount: number;
  category_id: string;
  memo: string | null;
  day_of_month: number;
  is_active: boolean;
  created_at: string;
  category?: Category;
}

export interface BudgetGoal {
  id: string;
  household_id: string;
  category_id: string | null;
  month: string;
  amount: number;
  category?: Category;
}

export interface SplitRecord {
  id: string;
  household_id: string;
  transaction_id: string;
  paid_by: string;
  split_ratio: Record<string, number>;
  settled: boolean;
  settled_at: string | null;
  transaction?: Transaction;
}

export interface MonthlySummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
}
