"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getSavedHouseholdId, saveHouseholdId } from "@/lib/utils";

const DEFAULT_CATEGORIES = [
  { name: "식비", icon: "🍚", type: "expense", color: "#ef4444", is_default: true },
  { name: "주거/관리비", icon: "🏠", type: "expense", color: "#f97316", is_default: true },
  { name: "교통", icon: "🚌", type: "expense", color: "#eab308", is_default: true },
  { name: "마트/생활", icon: "🛒", type: "expense", color: "#84cc16", is_default: true },
  { name: "문화/여가", icon: "🎬", type: "expense", color: "#06b6d4", is_default: true },
  { name: "의류/미용", icon: "👕", type: "expense", color: "#8b5cf6", is_default: true },
  { name: "의료/건강", icon: "💊", type: "expense", color: "#ec4899", is_default: true },
  { name: "통신/구독", icon: "📱", type: "expense", color: "#6366f1", is_default: true },
  { name: "술/외식", icon: "🍺", type: "expense", color: "#f43f5e", is_default: true },
  { name: "교육", icon: "🎓", type: "expense", color: "#14b8a6", is_default: true },
  { name: "기타", icon: "📦", type: "expense", color: "#94a3b8", is_default: true },
  { name: "월급", icon: "💰", type: "income", color: "#22c55e", is_default: true },
  { name: "부수입", icon: "💸", type: "income", color: "#10b981", is_default: true },
  { name: "용돈/선물", icon: "🎁", type: "income", color: "#34d399", is_default: true },
];

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    async function init() {
      const saved = getSavedHouseholdId();
      if (saved) {
        // 저장된 가계부가 있으면 바로 이동
        router.replace(`/${saved}`);
        return;
      }

      // 새 가계부 생성
      const supabase = createClient();
      const { data: household, error } = await supabase
        .from("households")
        .insert({ name: "우리집 가계부" } as never)
        .select()
        .single() as unknown as { data: { id: string } | null; error: unknown };

      if (error || !household) {
        console.error("가계부 생성 실패:", error);
        return;
      }

      // 기본 카테고리 생성
      await supabase.from("categories").insert(
        DEFAULT_CATEGORIES.map((c) => ({
          ...c,
          household_id: household.id,
        })) as never
      );

      saveHouseholdId(household.id);
      router.replace(`/${household.id}`);
    }

    init();
  }, [router]);

  return (
    <div className="min-h-dvh flex items-center justify-center bg-white">
      <div className="text-center">
        <div className="text-4xl mb-3 animate-pulse">💑</div>
        <p className="text-gray-400 text-sm">가계부를 불러오는 중...</p>
      </div>
    </div>
  );
}
