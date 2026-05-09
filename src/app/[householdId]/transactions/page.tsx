"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useTransactions } from "@/hooks/useTransactions";
import { TransactionItem } from "@/components/transactions/TransactionItem";
import { Card } from "@/components/ui/Card";
import { getCurrentMonth, formatDateLabel } from "@/lib/utils";

const MONTHS_KR = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];

export default function TransactionsPage({ params }: { params: { householdId: string } }) {
  const { householdId } = params;
  const [month, setMonth] = useState(getCurrentMonth());
  const [filter, setFilter] = useState<"all" | "expense" | "income">("all");
  const { transactions, summary } = useTransactions(householdId, month);

  const [y, m] = month.split("-").map(Number);

  function shift(delta: number) {
    const d = new Date(y, m - 1 + delta, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  const filtered = useMemo(
    () => filter === "all" ? transactions : transactions.filter((t) => t.type === filter),
    [transactions, filter]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, typeof transactions>();
    for (const tx of filtered) {
      if (!map.has(tx.date)) map.set(tx.date, []);
      map.get(tx.date)!.push(tx);
    }
    return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [filtered]);

  return (
    <div className="min-h-dvh bg-gray-50">
      <div className="bg-white px-5 pt-safe pb-4 border-b border-gray-100">
        <div className="flex items-center gap-2 mb-3">
          <button onClick={() => shift(-1)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 text-gray-400 text-xl">‹</button>
          <h1 className="text-lg font-bold">{y}년 {MONTHS_KR[m - 1]}</h1>
          <button onClick={() => shift(1)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 text-gray-400 text-xl" disabled={month >= getCurrentMonth()}>›</button>
        </div>

        <div className="flex gap-3 text-sm text-gray-500 mb-3">
          <span>수입 <b className="text-green-600">{new Intl.NumberFormat("ko-KR").format(summary.totalIncome)}원</b></span>
          <span>지출 <b className="text-red-500">{new Intl.NumberFormat("ko-KR").format(summary.totalExpense)}원</b></span>
        </div>

        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
          {(["all", "expense", "income"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${filter === f ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}
            >
              {f === "all" ? "전체" : f === "expense" ? "지출" : "수입"}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {grouped.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">내역이 없습니다</div>
        ) : (
          grouped.map(([date, txs]) => {
            const dayTotal = txs.reduce((acc, t) => acc + (t.type === "income" ? t.amount : -t.amount), 0);
            return (
              <section key={date}>
                <div className="flex justify-between items-center mb-1.5 px-1">
                  <span className="text-xs font-medium text-gray-500">{formatDateLabel(date)}</span>
                  <span className={`text-xs font-semibold ${dayTotal >= 0 ? "text-green-600" : "text-gray-600"}`}>
                    {dayTotal >= 0 ? "+" : ""}{new Intl.NumberFormat("ko-KR").format(dayTotal)}원
                  </span>
                </div>
                <Card>
                  <div className="divide-y divide-gray-50">
                    {txs.map((tx) => <TransactionItem key={tx.id} transaction={tx} householdId={householdId} />)}
                  </div>
                </Card>
              </section>
            );
          })
        )}
      </div>

      <Link
        href={`/${householdId}/transactions/new`}
        className="fixed right-5 w-14 h-14 bg-gray-900 text-white rounded-full flex items-center justify-center shadow-xl text-3xl font-light active:scale-95 transition-transform z-30"
        style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)" }}
      >
        +
      </Link>
    </div>
  );
}
