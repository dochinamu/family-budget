"use client";

import { useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/stores";
import { Transaction } from "@/types";
import { getCurrentMonth, getMonthRange } from "@/lib/utils";

export function useTransactions(householdId: string, month?: string) {
  const { transactions, setTransactions, addTransaction, updateTransaction, removeTransaction, addToast } =
    useAppStore();

  const currentMonth = month ?? getCurrentMonth();
  const { start, end } = getMonthRange(currentMonth);

  const fetchTransactions = useCallback(async () => {
    if (!householdId) return;
    const supabase = createClient();
    try {
      const { data } = await supabase
        .from("transactions")
        .select("*, category:categories(*)")
        .eq("household_id", householdId)
        .gte("date", start)
        .lte("date", end)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });
      setTransactions(data ?? []);
    } catch {
      // Supabase 미설정 시 무시
    }
  }, [householdId, start, end, setTransactions]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // 실시간 구독
  useEffect(() => {
    if (!householdId) return;
    const supabase = createClient();

    const channel = supabase
      .channel(`tx-${householdId}-${currentMonth}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "transactions",
        filter: `household_id=eq.${householdId}`,
      }, async (payload) => {
        const tx = payload.new as Transaction;
        if (!tx.date.startsWith(currentMonth)) return;
        const { data } = await supabase
          .from("transactions")
          .select("*, category:categories(*)")
          .eq("id", tx.id)
          .single();
        if (data) {
          addTransaction(data);
          addToast(`새 내역이 추가됐어요: ${data.category?.name ?? ""}`, "info");
        }
      })
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "transactions",
        filter: `household_id=eq.${householdId}`,
      }, async (payload) => {
        const { data } = await supabase
          .from("transactions")
          .select("*, category:categories(*)")
          .eq("id", payload.new.id)
          .single();
        if (data) updateTransaction(data);
      })
      .on("postgres_changes", {
        event: "DELETE",
        schema: "public",
        table: "transactions",
        filter: `household_id=eq.${householdId}`,
      }, (payload) => {
        removeTransaction(payload.old.id);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [householdId, currentMonth, addTransaction, updateTransaction, removeTransaction, addToast]);

  const totalIncome = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const summary = { totalIncome, totalExpense, balance: totalIncome - totalExpense };

  return { transactions, summary, refetch: fetchTransactions };
}
