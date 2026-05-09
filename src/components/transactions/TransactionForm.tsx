"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/stores";
import { Transaction, TransactionType, Category } from "@/types";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface TransactionFormProps {
  householdId: string;
  transaction?: Transaction;
}

const NUM_PAD = ["1","2","3","4","5","6","7","8","9","00","0","⌫"];

const FALLBACK_CATEGORIES: Category[] = [
  { id: "f1", household_id: "", name: "식비",     icon: "🍚", type: "expense", color: "#ef4444", is_default: true },
  { id: "f2", household_id: "", name: "교통",     icon: "🚌", type: "expense", color: "#eab308", is_default: true },
  { id: "f3", household_id: "", name: "마트/생활", icon: "🛒", type: "expense", color: "#84cc16", is_default: true },
  { id: "f4", household_id: "", name: "문화/여가", icon: "🎬", type: "expense", color: "#06b6d4", is_default: true },
  { id: "f5", household_id: "", name: "의료/건강", icon: "💊", type: "expense", color: "#ec4899", is_default: true },
  { id: "f6", household_id: "", name: "통신/구독", icon: "📱", type: "expense", color: "#6366f1", is_default: true },
  { id: "f7", household_id: "", name: "주거/관리비",icon: "🏠", type: "expense", color: "#f97316", is_default: true },
  { id: "f8", household_id: "", name: "술/외식",  icon: "🍺", type: "expense", color: "#f43f5e", is_default: true },
  { id: "f9", household_id: "", name: "의류/미용", icon: "👕", type: "expense", color: "#8b5cf6", is_default: true },
  { id: "f10",household_id: "", name: "교육",     icon: "🎓", type: "expense", color: "#14b8a6", is_default: true },
  { id: "f11",household_id: "", name: "기타",     icon: "📦", type: "expense", color: "#94a3b8", is_default: true },
  { id: "f12",household_id: "", name: "월급",     icon: "💰", type: "income",  color: "#22c55e", is_default: true },
  { id: "f13",household_id: "", name: "부수입",   icon: "💸", type: "income",  color: "#10b981", is_default: true },
  { id: "f14",household_id: "", name: "용돈/선물", icon: "🎁", type: "income",  color: "#34d399", is_default: true },
];

export function TransactionForm({ householdId, transaction }: TransactionFormProps) {
  const router = useRouter();
  const { categories, addToast } = useAppStore();
  const isEdit = !!transaction;

  const [type, setType] = useState<TransactionType>(transaction?.type ?? "expense");
  const [amountStr, setAmountStr] = useState(transaction ? String(transaction.amount) : "");
  const [categoryId, setCategoryId] = useState(transaction?.category_id ?? "");
  const [date, setDate] = useState(transaction?.date ?? new Date().toISOString().split("T")[0]);
  const [memo, setMemo] = useState(transaction?.memo ?? "");
  const [writtenBy, setWrittenBy] = useState(transaction?.written_by ?? "");
  const [loading, setLoading] = useState(false);

  // Supabase 미연결 시 fallback 카테고리 사용
  const allCategories = categories.length > 0 ? categories : FALLBACK_CATEGORIES;
  const filteredCats = allCategories.filter((c) => c.type === type);

  // 수정 모드: Supabase 카테고리가 뒤늦게 로드되면 type/categoryId 동기화
  useEffect(() => {
    if (!isEdit || !transaction || categories.length === 0) return;
    const cat = categories.find((c) => c.id === transaction.category_id);
    if (cat) {
      setType(cat.type);
      setCategoryId(cat.id);
    }
  }, [categories, isEdit, transaction]);

  function handleNumPad(key: string) {
    if (key === "⌫") {
      setAmountStr((s) => s.slice(0, -1));
    } else if (key === "00") {
      setAmountStr((s) => (s ? s + "00" : s));
    } else {
      setAmountStr((s) => {
        const next = s + key;
        if (Number(next) > 99_999_999) return s;
        return next;
      });
    }
  }

  async function handleSubmit() {
    const amount = Number(amountStr);
    if (!amount || amount <= 0) { addToast("금액을 입력하세요", "error"); return; }
    if (!categoryId) { addToast("카테고리를 선택하세요", "error"); return; }
    if (categoryId.startsWith("f") && categories.length === 0) {
      addToast("Supabase 테이블 생성 후 다시 시도해주세요", "error"); return;
    }

    setLoading(true);
    const supabase = createClient();
    const payload = {
      household_id: householdId,
      type,
      amount,
      category_id: categoryId,
      date,
      memo: memo.trim() || null,
      written_by: writtenBy.trim() || null,
    };

    let error;
    if (isEdit) {
      ({ error } = await supabase.from("transactions").update(payload as never).eq("id", transaction!.id));
    } else {
      ({ error } = await supabase.from("transactions").insert(payload as never));
    }

    setLoading(false);
    if (error) { addToast("저장 실패: " + error.message, "error"); return; }
    addToast(isEdit ? "수정되었습니다" : "추가되었습니다", "success");
    router.back();
  }

  async function handleDelete() {
    if (!isEdit || !confirm("정말 삭제하시겠어요?")) return;
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.from("transactions").delete().eq("id", transaction!.id);
    setLoading(false);
    if (error) { addToast("삭제 실패", "error"); return; }
    addToast("삭제되었습니다", "success");
    router.back();
  }

  const displayAmount = amountStr
    ? new Intl.NumberFormat("ko-KR").format(Number(amountStr))
    : "0";

  return (
    <div className="flex flex-col h-dvh">
      {/* 타입 토글 + 금액 + 날짜 */}
      <div className="bg-white px-4 pt-safe-form pb-3 flex-shrink-0">
        <p className="text-xs font-semibold text-gray-400 text-center mb-1.5 tracking-wide">유형 선택</p>
        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-3">
          {(["expense", "income"] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setType(t); setCategoryId(""); }}
              className={cn(
                "flex-1 py-3 text-base font-bold rounded-lg transition-all",
                type === t
                  ? t === "expense" ? "bg-red-500 text-white shadow-sm" : "bg-green-500 text-white shadow-sm"
                  : "text-gray-400"
              )}
            >
              {t === "expense" ? "💸 지출" : "💰 수입"}
            </button>
          ))}
        </div>

        {/* 금액 — 투명 input으로 붙여넣기 가능 */}
        <div className="text-center py-2 relative">
          <input
            type="text"
            inputMode="none"
            value=""
            readOnly
            onPaste={(e) => {
              e.preventDefault();
              const raw = e.clipboardData.getData("text").replace(/[^0-9]/g, "");
              if (raw) setAmountStr(String(Math.min(Number(raw), 99_999_999)));
            }}
            className="absolute inset-0 w-full h-full opacity-0 cursor-text"
            aria-label="금액 붙여넣기"
          />
          <span className={cn("text-4xl font-bold tracking-tight", amountStr ? "text-gray-900" : "text-gray-300")}>
            {displayAmount}
          </span>
          <span className="text-xl text-gray-400 ml-1">원</span>
        </div>

        {/* 날짜 */}
        <label className="flex items-center justify-center gap-1 cursor-pointer">
          <span className="text-sm">📅</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="text-sm font-medium text-gray-600 bg-transparent outline-none cursor-pointer"
          />
        </label>
      </div>

      {/* 카테고리 선택 */}
      <div className="bg-gray-50 border-t border-gray-100 py-2 flex-shrink-0 overflow-hidden">
        <div
          className="flex gap-1.5 px-3"
          style={{
            overflowX: "scroll",
            overflowY: "hidden",
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {filteredCats.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryId(cat.id)}
              className={cn(
                "flex-shrink-0 flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-xl text-[11px] font-medium transition-all border-2",
                categoryId === cat.id
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-transparent bg-white text-gray-600 shadow-sm"
              )}
            >
              <span className="text-base">{cat.icon}</span>
              {cat.name}
            </button>
          ))}
          <div className="flex-shrink-0 w-3" />
        </div>
      </div>

      {/* 누가 + 메모 */}
      <div className="px-4 py-2 bg-white border-t border-gray-100 flex-shrink-0">
        <div className="flex gap-2 mb-2">
          {["hita", "won", "tog"].map((name) => (
            <button
              key={name}
              onClick={() => setWrittenBy(writtenBy === name ? "" : name)}
              className={cn(
                "flex-1 py-1.5 rounded-lg text-sm font-semibold border transition-all",
                writtenBy === name
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-400 border-gray-200"
              )}
            >
              {name}
            </button>
          ))}
        </div>
        <input
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="메모 (선택)"
          className="w-full text-sm border-b border-gray-200 outline-none py-1"
        />
      </div>

      {/* 숫자패드 — 고정 높이로 컴팩트하게 */}
      <div className="grid grid-cols-3 gap-px bg-gray-200 border-t border-gray-200 flex-shrink-0">
        {NUM_PAD.map((key) => (
          <button
            key={key}
            onPointerDown={() => handleNumPad(key)}
            className="h-14 bg-white flex items-center justify-center text-lg font-medium text-gray-800 active:bg-gray-100 transition-colors select-none"
          >
            {key}
          </button>
        ))}
      </div>

      {/* 추가/수정 버튼 */}
      <div className="p-3 bg-white border-t border-gray-100 flex gap-2 flex-shrink-0">
        {isEdit && (
          <Button variant="danger" size="lg" onClick={handleDelete} loading={loading} className="flex-1">
            삭제
          </Button>
        )}
        <Button size="lg" onClick={handleSubmit} loading={loading} className="flex-1">
          {isEdit ? "수정 완료" : "추가"}
        </Button>
      </div>
    </div>
  );
}
