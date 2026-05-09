"use client";

import { useState, useMemo } from "react";
import { useTransactions } from "@/hooks/useTransactions";
import { TransactionItem } from "@/components/transactions/TransactionItem";
import { Card } from "@/components/ui/Card";
import { getCurrentMonth } from "@/lib/utils";
import { cn } from "@/lib/utils";

const DAYS = ["일", "월", "화", "수", "목", "금", "토"];
const MONTHS_KR = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];

export default function CalendarPage({ params }: { params: { householdId: string } }) {
  const { householdId } = params;
  const [month, setMonth] = useState(getCurrentMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const { transactions } = useTransactions(householdId, month);

  const [y, m] = month.split("-").map(Number);

  function shift(delta: number) {
    const d = new Date(y, m - 1 + delta, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    setSelectedDate(null);
  }

  const firstDay = new Date(y, m - 1, 1).getDay();
  const daysInMonth = new Date(y, m, 0).getDate();

  // 날짜별 지출/수입 합계
  const { dailyExpense, dailyIncome } = useMemo(() => {
    const exp: Record<string, number> = {};
    const inc: Record<string, number> = {};
    for (const tx of transactions) {
      if (tx.type === "expense") exp[tx.date] = (exp[tx.date] ?? 0) + tx.amount;
      else                        inc[tx.date] = (inc[tx.date] ?? 0) + tx.amount;
    }
    return { dailyExpense: exp, dailyIncome: inc };
  }, [transactions]);

  const selectedTxs = selectedDate
    ? transactions.filter((t) => t.date === selectedDate)
    : [];

  const cells = Array.from({ length: firstDay + daysInMonth }, (_, i) => {
    if (i < firstDay) return null;
    const day = i - firstDay + 1;
    const dateStr = `${month}-${String(day).padStart(2, "0")}`;
    return { day, dateStr };
  });

  return (
    <div className="min-h-dvh bg-gray-50">
      <div className="bg-white px-5 pt-safe pb-4 border-b border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => shift(-1)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 text-gray-400 text-xl">‹</button>
          <h1 className="text-lg font-bold">{y}년 {MONTHS_KR[m - 1]}</h1>
          <button onClick={() => shift(1)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 text-gray-400 text-xl" disabled={month >= getCurrentMonth()}>›</button>
        </div>

        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 mb-1">
          {DAYS.map((d, i) => (
            <div key={d} className={cn("text-center text-xs font-medium py-1", i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-gray-400")}>
              {d}
            </div>
          ))}
        </div>

        {/* 날짜 그리드 */}
        <div className="grid grid-cols-7 gap-px">
          {cells.map((cell, i) => {
            if (!cell) return <div key={`empty-${i}`} />;
            const { day, dateStr } = cell;
            const expense = dailyExpense[dateStr];
            const income = dailyIncome[dateStr];
            const dow = (firstDay + day - 1) % 7;
            const isSelected = selectedDate === dateStr;
            const isToday = dateStr === new Date().toISOString().split("T")[0];
            const fmt = (n: number) => n >= 10000 ? `${Math.round(n / 1000)}k` : n.toLocaleString();

            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                className={cn(
                  "flex flex-col items-center py-1.5 rounded-lg transition-colors",
                  isSelected ? "bg-gray-900 text-white" : "hover:bg-gray-50"
                )}
              >
                <span className={cn(
                  "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full",
                  isToday && !isSelected ? "bg-blue-500 text-white" : "",
                  !isSelected && dow === 0 ? "text-red-400" : "",
                  !isSelected && dow === 6 ? "text-blue-400" : "",
                )}>
                  {day}
                </span>
                <span className="h-3.5 flex flex-col items-center gap-px">
                  {expense ? (
                    <span className={cn("text-[9px] font-medium leading-none", isSelected ? "text-gray-300" : "text-gray-700")}>
                      {fmt(expense)}
                    </span>
                  ) : null}
                  {income ? (
                    <span className={cn("text-[9px] font-medium leading-none", isSelected ? "text-blue-300" : "text-blue-500")}>
                      {fmt(income)}
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 선택된 날짜 내역 */}
      {selectedDate && (
        <div className="px-4 py-4">
          <p className="text-sm font-semibold text-gray-500 mb-2 px-1">{selectedDate.slice(5).replace("-", "/")} 내역</p>
          <Card>
            {selectedTxs.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-sm">내역이 없습니다</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {selectedTxs.map((tx) => <TransactionItem key={tx.id} transaction={tx} householdId={householdId} />)}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
