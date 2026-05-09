import { create } from "zustand";
import { Household, Transaction, Category } from "@/types";

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

interface AppState {
  household: Household | null;
  categories: Category[];
  transactions: Transaction[];
  toasts: Toast[];

  setHousehold: (h: Household | null) => void;
  setCategories: (c: Category[]) => void;
  setTransactions: (t: Transaction[]) => void;
  addTransaction: (t: Transaction) => void;
  updateTransaction: (t: Transaction) => void;
  removeTransaction: (id: string) => void;
  addToast: (message: string, type?: Toast["type"]) => void;
  removeToast: (id: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  household: null,
  categories: [],
  transactions: [],
  toasts: [],

  setHousehold: (household) => set({ household }),
  setCategories: (categories) => set({ categories }),
  setTransactions: (transactions) => set({ transactions }),

  addTransaction: (t) =>
    set((s) => ({ transactions: [t, ...s.transactions] })),

  updateTransaction: (t) =>
    set((s) => ({
      transactions: s.transactions.map((x) => (x.id === t.id ? t : x)),
    })),

  removeTransaction: (id) =>
    set((s) => ({ transactions: s.transactions.filter((x) => x.id !== id) })),

  addToast: (message, type = "info") => {
    const id = crypto.randomUUID();
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(
      () => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
      3000
    );
  },

  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
