"use client";

import { useState, useMemo } from "react";
import { useTransactions } from "@/hooks/useTransactions";
import { getCurrentMonth } from "@/lib/utils";
import { Card } from "@/components/ui/Card";

const MONTHS_KR = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];

export default function SplitPage({ params }: { params: { householdId: string } }) {
  const { householdId } = params;
  const [month, setMonth] = useState(getCurrentMonth());
  const { transactions } = useTransactions(householdId, month);

  const [y, m] = month.split("-").map(Number);

  function shift(delta: number) {
    const d = new Date(y, m - 1 + delta, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  // 작성자별 지출 합산
  const byPerson = useMemo(() => {
    const map = new Map<string, number>();
    for (const tx of transactions.filter((t) => t.type === "expense" && t.written_by)) {
      const key = tx.written_by!;
      map.set(key, (map.get(key) ?? 0) + tx.amount);
    }
    return Array.from(map.entries()).sort(([, a], [, b]) => b - a);
  }, [transactions]);

  const totalExpense = byPerson.reduce((s, [, v]) => s + v, 0);
  const unassigned = transactions
    .filter((t) => t.type === "expense" && !t.written_by)
    .reduce((s, t) => s + t.amount, 0);

  // 정산 계산
  const settlement = useMemo(() => {
    if (byPerson.length < 2) return null;
    const sorted = [...byPerson].sort(([, a], [, b]) => b - a);
    const [topName, topAmt] = sorted[0];
    const [botName, botAmt] = sorted[sorted.length - 1];
    const diff = topAmt - botAmt;
    const toReceive = Math.round(diff / 2);
    if (toReceive <= 0) return null;
    return { from: botName, to: topName, amount: toReceive };
  }, [byPerson]);

  return (
    <div className="min-h-dvh bg-gray-50">
      <div className="bg-white px-5 pt-safe pb-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <button onClick={() => shift(-1)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 text-gray-400 text-xl">‹</button>
          <h1 className="text-lg font-bold">{y}년 {MONTHS_KR[m - 1]} 정산</h1>
          <button onClick={() => shift(1)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 text-gray-400 text-xl" disabled={month >= getCurrentMonth()}>›</button>
        </div>
        <p className="text-xs text-gray-400 mt-1">내역 추가 시 "누가" 입력하면 자동 집계됩니다</p>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* 정산 결과 */}
        {settlement && (
          <Card className="p-4 bg-blue-50 border-blue-100">
            <p className="text-sm font-semibold text-blue-800 mb-1">💰 정산이 필요해요</p>
            <p className="text-base font-bold text-blue-900">
              {settlement.from} → {settlement.to}
            </p>
            <p className="text-2xl font-bold text-blue-600 mt-1">
              {new Intl.NumberFormat("ko-KR").format(settlement.amount)}원
            </p>
          </Card>
        )}

        {/* 인원별 지출 */}
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">인원별 지출</h2>
          {byPerson.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-4">
              내역 추가 시 "누가" 항목을 입력하면<br />여기에 집계됩니다
            </p>
          ) : (
            <div className="space-y-3">
              {byPerson.map(([name, amount]) => {
                const pct = totalExpense ? amount / totalExpense * 100 : 0;
                return (
                  <div key={name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-800">{name}</span>
                      <span className="font-semibold text-gray-900">
                        {new Intl.NumberFormat("ko-KR").format(amount)}원
                        <span className="text-xs text-gray-400 ml-1">({Math.round(pct)}%)</span>
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gray-700 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* 미분류 */}
        {unassigned > 0 && (
          <Card className="p-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">누가 미입력 지출</span>
              <span className="font-semibold text-gray-600">{new Intl.NumberFormat("ko-KR").format(unassigned)}원</span>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
