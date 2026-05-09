"use client";

import { useState } from "react";
import Link from "next/link";
import { useTransactions } from "@/hooks/useTransactions";
import { useAppStore } from "@/stores";
import { getCurrentMonth } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { TransactionItem } from "@/components/transactions/TransactionItem";

const MONTHS_KR = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];

export default function HomePage({ params }: { params: { householdId: string } }) {
  const { householdId } = params;
  const [month, setMonth] = useState(getCurrentMonth());
  const { transactions, summary } = useTransactions(householdId, month);
  const { household } = useAppStore();

  const [y, m] = month.split("-").map(Number);
  const isCurrentMonth = month === getCurrentMonth();

  function shift(delta: number) {
    const d = new Date(y, m - 1 + delta, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  const recent = transactions.slice(0, 5);

  return (
    <div className="min-h-dvh bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white px-5 pt-safe pb-6 border-b border-gray-100">
        <p className="text-xs font-medium text-gray-400 tracking-wide">
          {household?.name ?? "우리집 가계부"}
        </p>

        {/* 월 선택 */}
        <div className="flex items-center gap-2 mt-1 mb-5">
          <button onClick={() => shift(-1)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 text-gray-400 text-xl">‹</button>
          <h2 className="text-xl font-bold">{y}년 {MONTHS_KR[m - 1]}</h2>
          <button onClick={() => shift(1)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 text-gray-400 text-xl" disabled={isCurrentMonth}>›</button>
        </div>

        {/* 요약 */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "수입", value: summary.totalIncome, color: "text-green-600" },
            { label: "지출", value: summary.totalExpense, color: "text-red-500" },
            { label: "잔액", value: summary.balance, color: summary.balance >= 0 ? "text-gray-900" : "text-red-500" },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <p className="text-xs text-gray-400 mb-0.5">{label}</p>
              <p className={`text-[15px] font-bold ${color} leading-tight`}>
                {value < 0 ? "-" : ""}
                {new Intl.NumberFormat("ko-KR").format(Math.abs(value))}
                <span className="text-xs font-normal ml-0.5">원</span>
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        <section>
          <div className="flex items-center justify-between mb-2 px-1">
            <h3 className="text-sm font-semibold text-gray-500">최근 내역</h3>
            <Link href={`/${householdId}/transactions`} className="text-xs text-blue-500">전체보기</Link>
          </div>
          <Card>
            {recent.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-2xl mb-2">🧾</p>
                <p className="text-gray-400 text-sm">아직 내역이 없어요</p>
                <p className="text-gray-300 text-xs mt-1">아래 + 버튼으로 추가해보세요</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {recent.map((tx) => (
                  <TransactionItem key={tx.id} transaction={tx} householdId={householdId} />
                ))}
              </div>
            )}
          </Card>
        </section>
      </div>

      {/* FAB */}
      <Link
        href={`/${householdId}/transactions/new`}
        className="fixed right-5 w-14 h-14 bg-gray-900 text-white rounded-full flex items-center justify-center shadow-xl text-3xl font-light active:scale-95 transition-transform z-30"
        style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)" }}
        aria-label="내역 추가"
      >
        +
      </Link>
    </div>
  );
}
