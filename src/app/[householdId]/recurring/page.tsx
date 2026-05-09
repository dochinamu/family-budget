"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/stores";
import { RecurringRule } from "@/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

export default function RecurringPage({ params }: { params: { householdId: string } }) {
  const { householdId } = params;
  const { categories, addToast } = useAppStore();
  const [rules, setRules] = useState<RecurringRule[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    type: "expense" as "expense" | "income",
    amount: "",
    category_id: "",
    memo: "",
    day_of_month: "1",
  });
  const [loading, setLoading] = useState(false);

  const loadRules = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("recurring_rules")
      .select("*, category:categories(*)")
      .eq("household_id", householdId)
      .order("day_of_month");
    setRules(data ?? []);
  }, [householdId]);

  useEffect(() => { loadRules(); }, [loadRules]);

  const filteredCats = categories.filter((c) => c.type === form.type);

  async function handleAdd() {
    if (!form.amount || !form.category_id) {
      addToast("금액과 카테고리를 입력하세요", "error");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.from("recurring_rules").insert({
      household_id: householdId,
      type: form.type,
      amount: Number(form.amount),
      category_id: form.category_id,
      memo: form.memo || null,
      day_of_month: Number(form.day_of_month),
    } as never);
    setLoading(false);
    if (error) { addToast("저장 실패", "error"); return; }
    addToast("고정 항목이 추가되었습니다", "success");
    setShowForm(false);
    setForm({ type: "expense", amount: "", category_id: "", memo: "", day_of_month: "1" });
    loadRules();
  }

  async function toggleRule(id: string, current: boolean) {
    const supabase = createClient();
    await supabase.from("recurring_rules").update({ is_active: !current } as never).eq("id", id);
    loadRules();
  }

  async function deleteRule(id: string) {
    if (!confirm("삭제하시겠어요?")) return;
    const supabase = createClient();
    await supabase.from("recurring_rules").delete().eq("id", id);
    addToast("삭제되었습니다", "success");
    loadRules();
  }

  async function applyNow(rule: RecurringRule) {
    const supabase = createClient();
    const today = new Date().toISOString().split("T")[0];
    await supabase.from("transactions").insert({
      household_id: householdId,
      type: rule.type,
      amount: rule.amount,
      category_id: rule.category_id,
      memo: rule.memo,
      date: today,
      is_recurring: true,
      recurring_id: rule.id,
    } as never);
    addToast("오늘 날짜로 추가되었습니다", "success");
  }

  return (
    <div className="min-h-dvh bg-gray-50">
      <div className="bg-white px-5 pt-safe pb-4 border-b border-gray-100 flex items-center justify-between">
        <h1 className="text-lg font-bold">고정 항목</h1>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? "취소" : "+ 추가"}
        </Button>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* 추가 폼 */}
        {showForm && (
          <Card className="p-4 space-y-3">
            <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
              {(["expense","income"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setForm(f => ({ ...f, type: t, category_id: "" }))}
                  className={cn("flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all", form.type === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500")}
                >
                  {t === "expense" ? "지출" : "수입"}
                </button>
              ))}
            </div>

            <input
              type="number"
              placeholder="금액"
              value={form.amount}
              onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))}
              className="w-full h-10 border border-gray-200 rounded-xl px-3 text-sm outline-none focus:border-gray-900"
            />

            <div className="flex gap-2 flex-wrap">
              {filteredCats.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setForm(f => ({ ...f, category_id: cat.id }))}
                  className={cn("text-sm px-3 py-1.5 rounded-full border transition-all", form.category_id === cat.id ? "bg-gray-900 text-white border-gray-900" : "border-gray-200 text-gray-600")}
                >
                  {cat.icon} {cat.name}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="number"
                placeholder="매월 몇 일"
                value={form.day_of_month}
                onChange={(e) => setForm(f => ({ ...f, day_of_month: e.target.value }))}
                min={1} max={31}
                className="w-24 h-10 border border-gray-200 rounded-xl px-3 text-sm outline-none focus:border-gray-900"
              />
              <input
                placeholder="메모 (선택)"
                value={form.memo}
                onChange={(e) => setForm(f => ({ ...f, memo: e.target.value }))}
                className="flex-1 h-10 border border-gray-200 rounded-xl px-3 text-sm outline-none focus:border-gray-900"
              />
            </div>

            <Button size="md" className="w-full" onClick={handleAdd} loading={loading}>저장</Button>
          </Card>
        )}

        {/* 목록 */}
        <Card>
          {rules.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">고정 항목이 없습니다</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {rules.map((rule) => (
                <div key={rule.id} className="flex items-center gap-3 px-4 py-3.5">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0"
                    style={{ backgroundColor: `${rule.category?.color ?? "#94a3b8"}20` }}>
                    {rule.category?.icon ?? "📦"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {rule.category?.name} · 매월 {rule.day_of_month}일
                    </p>
                    <p className={cn("text-sm font-semibold", rule.type === "income" ? "text-green-600" : "text-red-500")}>
                      {rule.type === "income" ? "+" : "-"}{new Intl.NumberFormat("ko-KR").format(rule.amount)}원
                    </p>
                    {rule.memo && <p className="text-xs text-gray-400 truncate">{rule.memo}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => applyNow(rule)} className="text-xs text-blue-500">적용</button>
                    <button
                      onClick={() => toggleRule(rule.id, rule.is_active)}
                      className={cn("w-10 h-5 rounded-full transition-colors relative", rule.is_active ? "bg-gray-900" : "bg-gray-200")}
                    >
                      <span className={cn("absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all", rule.is_active ? "left-5" : "left-0.5")} />
                    </button>
                    <button onClick={() => deleteRule(rule.id)} className="text-xs text-red-400">삭제</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
