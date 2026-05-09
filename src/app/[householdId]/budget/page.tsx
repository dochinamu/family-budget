"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTransactions } from "@/hooks/useTransactions";
import { useAppStore } from "@/stores";
import { BudgetGoal } from "@/types";
import { getCurrentMonth } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const MONTHS_KR = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];

export default function BudgetPage({ params }: { params: { householdId: string } }) {
  const { householdId } = params;
  const [month, setMonth] = useState(getCurrentMonth());
  const { transactions, summary } = useTransactions(householdId, month);
  const { categories, addToast } = useAppStore();
  const [goals, setGoals] = useState<BudgetGoal[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");

  const [y, m] = month.split("-").map(Number);

  function shift(delta: number) {
    const d = new Date(y, m - 1 + delta, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  const loadGoals = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("budget_goals")
      .select("*, category:categories(*)")
      .eq("household_id", householdId)
      .eq("month", month);
    setGoals(data ?? []);
  }, [householdId, month]);

  useEffect(() => { loadGoals(); }, [loadGoals]);

  const totalGoal = goals.find((g) => !g.category_id);

  async function saveGoal(categoryId: string | null, amount: number) {
    const supabase = createClient();
    const existing = goals.find((g) => g.category_id === categoryId);
    if (existing) {
      await supabase.from("budget_goals").update({ amount } as never).eq("id", existing.id);
    } else {
      await supabase.from("budget_goals").insert({
        household_id: householdId,
        category_id: categoryId,
        month,
        amount,
      } as never);
    }
    await loadGoals();
    addToast("예산이 저장되었습니다", "success");
    setEditing(null);
  }

  function startEdit(key: string, current?: number) {
    setEditing(key);
    setEditAmount(current ? String(current) : "");
  }

  function handleSaveEdit(categoryId: string | null) {
    const amount = Number(editAmount);
    if (!amount || amount <= 0) { addToast("금액을 입력하세요", "error"); return; }
    saveGoal(categoryId, amount);
  }

  const expenseByCategory = new Map<string, number>();
  for (const tx of transactions.filter((t) => t.type === "expense")) {
    expenseByCategory.set(tx.category_id, (expenseByCategory.get(tx.category_id) ?? 0) + tx.amount);
  }

  const expenseCategories = categories.filter((c) => c.type === "expense");

  return (
    <div className="min-h-dvh bg-gray-50">
      <div className="bg-white px-5 pt-safe pb-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <button onClick={() => shift(-1)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 text-gray-400 text-xl">‹</button>
          <h1 className="text-lg font-bold">{y}년 {MONTHS_KR[m - 1]} 예산</h1>
          <button onClick={() => shift(1)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 text-gray-400 text-xl" disabled={month >= getCurrentMonth()}>›</button>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* 전체 예산 */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">전체 예산</h2>
            <button onClick={() => startEdit("total", totalGoal?.amount)} className="text-xs text-blue-500">
              {totalGoal ? "수정" : "설정"}
            </button>
          </div>
          {editing === "total" ? (
            <div className="flex gap-2">
              <input
                type="number"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                placeholder="예산 금액"
                className="flex-1 h-10 border border-gray-200 rounded-xl px-3 text-sm outline-none focus:border-gray-900"
                autoFocus
              />
              <Button size="sm" onClick={() => handleSaveEdit(null)}>저장</Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>취소</Button>
            </div>
          ) : (
            <BudgetBar spent={summary.totalExpense} goal={totalGoal?.amount} color="#6366f1" />
          )}
        </Card>

        {/* 카테고리별 예산 */}
        <div className="space-y-2">
          {expenseCategories.map((cat) => {
            const goal = goals.find((g) => g.category_id === cat.id);
            const spent = expenseByCategory.get(cat.id) ?? 0;
            const isEditing = editing === cat.id;
            return (
              <Card key={cat.id} className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                      style={{ backgroundColor: `${cat.color}20` }}>
                      {cat.icon}
                    </div>
                    <span className="text-sm font-semibold text-gray-800">{cat.name}</span>
                  </div>
                  <button onClick={() => startEdit(cat.id, goal?.amount)} className="text-xs text-blue-500 px-2 py-1 rounded-lg bg-blue-50">
                    {goal ? "수정" : "+ 설정"}
                  </button>
                </div>
                {isEditing ? (
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                      placeholder="예산 금액"
                      className="flex-1 h-9 border border-gray-200 rounded-xl px-3 text-sm outline-none focus:border-gray-900"
                      autoFocus
                    />
                    <Button size="sm" onClick={() => handleSaveEdit(cat.id)}>저장</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>취소</Button>
                  </div>
                ) : (
                  <BudgetBar spent={spent} goal={goal?.amount} color={cat.color} />
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function BudgetBar({
  spent, goal, color = "#6366f1",
}: {
  spent: number; goal?: number; color?: string;
}) {
  const pct = goal ? Math.min(spent / goal * 100, 100) : 0;
  const over = goal ? spent > goal : false;
  const remaining = goal ? goal - spent : 0;
  const fmt = (n: number) => new Intl.NumberFormat("ko-KR").format(Math.abs(n));

  if (!goal) {
    return (
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-800">{fmt(spent)}원</span>
        <span className="text-xs text-gray-300">예산 미설정</span>
      </div>
    );
  }

  return (
    <div>
      {/* 금액 행 */}
      <div className="flex items-end justify-between mb-2">
        <div>
          <span className={cn("text-lg font-bold", over ? "text-red-500" : "text-gray-900")}>
            {fmt(spent)}원
          </span>
          <span className="text-xs text-gray-400 ml-1">사용</span>
        </div>
        <div className="text-right">
          {over ? (
            <span className="text-xs font-semibold text-red-500">+{fmt(-remaining)}원 초과</span>
          ) : (
            <span className="text-xs text-gray-400">{fmt(remaining)}원 남음</span>
          )}
        </div>
      </div>
      {/* 바 */}
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, backgroundColor: over ? "#ef4444" : color }}
        />
      </div>
      {/* 퍼센트 + 목표 */}
      <div className="flex justify-between mt-1.5">
        <span className={cn("text-xs font-semibold", over ? "text-red-400" : "text-gray-500")}>
          {Math.round(pct)}%
        </span>
        <span className="text-xs text-gray-400">목표 {fmt(goal)}원</span>
      </div>
    </div>
  );
}
