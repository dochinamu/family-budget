"use client";

import { useState, useMemo } from "react";
import { useTransactions } from "@/hooks/useTransactions";
import { getCurrentMonth, getMonthRange } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { createClient } from "@/lib/supabase/client";
import { useEffect } from "react";

const MONTHS_KR = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];

export default function StatsPage({ params }: { params: { householdId: string } }) {
  const { householdId } = params;
  const [month, setMonth] = useState(getCurrentMonth());
  const { transactions } = useTransactions(householdId, month);
  const [monthlyData, setMonthlyData] = useState<{ month: string; expense: number; income: number }[]>([]);

  const [y, m] = month.split("-").map(Number);

  function shift(delta: number) {
    const d = new Date(y, m - 1 + delta, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  // 최근 6개월 데이터
  useEffect(() => {
    const supabase = createClient();
    async function load() {
      const months = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(y, m - 1 - i, 1);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      }).reverse();

      const results = await Promise.all(
        months.map(async (mo) => {
          const { start, end } = getMonthRange(mo);
          const { data } = await supabase
            .from("transactions")
            .select("amount, type")
            .eq("household_id", householdId)
            .gte("date", start)
            .lte("date", end);
          const rows = (data ?? []) as { amount: number; type: string }[];
          const expense = rows.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
          const income  = rows.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
          return { month: mo, expense, income };
        })
      );
      setMonthlyData(results);
    }
    load();
  }, [householdId, y, m]);

  // 카테고리별 도넛 데이터
  const donutData = useMemo(() => {
    const map = new Map<string, { name: string; icon: string; color: string; value: number }>();
    for (const tx of transactions.filter((t) => t.type === "expense")) {
      const key = tx.category_id;
      if (!map.has(key)) {
        map.set(key, {
          name: tx.category?.name ?? "기타",
          icon: tx.category?.icon ?? "📦",
          color: tx.category?.color ?? "#94a3b8",
          value: 0,
        });
      }
      map.get(key)!.value += tx.amount;
    }
    return Array.from(map.values()).sort((a, b) => b.value - a.value);
  }, [transactions]);

  const totalExpense = donutData.reduce((s, d) => s + d.value, 0);

  const barData = monthlyData.map((d) => ({
    name: MONTHS_KR[Number(d.month.split("-")[1]) - 1],
    지출: d.expense,
    수입: d.income,
  }));

  const prevMonthExpense = monthlyData[monthlyData.length - 2]?.expense ?? 0;
  const thisMonthExpense = monthlyData[monthlyData.length - 1]?.expense ?? 0;
  const diff = thisMonthExpense - prevMonthExpense;

  return (
    <div className="min-h-dvh bg-gray-50">
      <div className="bg-white px-5 pt-safe pb-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <button onClick={() => shift(-1)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 text-gray-400 text-xl">‹</button>
          <h1 className="text-lg font-bold">{y}년 {MONTHS_KR[m - 1]}</h1>
          <button onClick={() => shift(1)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 text-gray-400 text-xl" disabled={month >= getCurrentMonth()}>›</button>
        </div>
        {prevMonthExpense > 0 && (
          <p className={`text-xs mt-1 ${diff > 0 ? "text-red-500" : "text-green-600"}`}>
            전월 대비 {diff > 0 ? "+" : ""}{new Intl.NumberFormat("ko-KR").format(diff)}원
          </p>
        )}
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* 카테고리별 도넛 */}
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">카테고리별 지출</h2>
          {donutData.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">지출 내역이 없습니다</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={donutData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={2}>
                    {donutData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => new Intl.NumberFormat("ko-KR").format(v) + "원"} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {donutData.map((d, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                    <span className="text-sm text-gray-600 flex-1">{d.icon} {d.name}</span>
                    <span className="text-sm font-medium text-gray-900">{new Intl.NumberFormat("ko-KR").format(d.value)}원</span>
                    <span className="text-xs text-gray-400 w-10 text-right">{totalExpense ? Math.round(d.value / totalExpense * 100) : 0}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>

        {/* 월별 추이 바 차트 */}
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">최근 6개월 추이</h2>
          <div className="flex gap-3 mb-2">
            <span className="flex items-center gap-1 text-xs text-gray-500"><span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />지출</span>
            <span className="flex items-center gap-1 text-xs text-gray-500"><span className="w-2.5 h-2.5 rounded-full bg-blue-400 inline-block" />수입</span>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${Math.round(v / 10000)}만`} />
              <Tooltip formatter={(v: number) => new Intl.NumberFormat("ko-KR").format(v) + "원"} />
              <Bar dataKey="수입" fill="#60a5fa" radius={[4, 4, 0, 0]} maxBarSize={24} />
              <Bar dataKey="지출" fill="#f87171" radius={[4, 4, 0, 0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
