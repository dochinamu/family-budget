"use client";

import { useState, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/stores";
import { Category } from "@/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

function SortableCategoryItem({
  cat,
  onDelete,
}: {
  cat: Category;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: cat.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-3 py-2.5 shadow-sm"
    >
      {/* 드래그 핸들 */}
      <button
        {...attributes}
        {...listeners}
        className="text-gray-300 hover:text-gray-400 touch-none select-none cursor-grab active:cursor-grabbing flex-shrink-0 p-1 -mx-1"
      >
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm8-12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" />
        </svg>
      </button>
      {/* 색상 + 아이콘 */}
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0"
        style={{ backgroundColor: `${cat.color}25` }}
      >
        {cat.icon}
      </div>
      <span className="flex-1 text-sm font-medium text-gray-800">{cat.name}</span>
      {!cat.is_default && (
        <button
          onClick={() => onDelete(cat.id)}
          className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-red-400 transition-colors flex-shrink-0 text-lg"
        >
          ×
        </button>
      )}
    </div>
  );
}

export default function SettingsPage({ params }: { params: { householdId: string } }) {
  const { householdId } = params;
  const { household, categories, setHousehold, setCategories, addToast } = useAppStore();
  const [householdName, setHouseholdName] = useState(household?.name ?? "");
  const [savingName, setSavingName] = useState(false);
  const [showCatForm, setShowCatForm] = useState(false);
  const [catForm, setCatForm] = useState({ name: "", icon: "📦", type: "expense" as "expense" | "income", color: "#94a3b8" });
  const [savingCat, setSavingCat] = useState(false);

  useEffect(() => {
    if (household) setHouseholdName(household.name);
  }, [household]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );

  const expenseCats = categories.filter((c) => c.type === "expense");
  const incomeCats = categories.filter((c) => c.type === "income");

  async function handleDragEnd(event: DragEndEvent, type: "expense" | "income") {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const list = type === "expense" ? expenseCats : incomeCats;
    const oldIndex = list.findIndex((c) => c.id === active.id);
    const newIndex = list.findIndex((c) => c.id === over.id);
    const reordered = arrayMove(list, oldIndex, newIndex);

    const other = type === "expense" ? incomeCats : expenseCats;
    const merged = type === "expense" ? [...reordered, ...other] : [...other, ...reordered];
    setCategories(merged);

    const supabase = createClient();
    await Promise.all(
      reordered.map((cat, idx) =>
        supabase.from("categories").update({ sort_order: idx } as never).eq("id", cat.id)
      )
    );
  }

  async function saveHouseholdName() {
    setSavingName(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("households")
      .update({ name: householdName.trim() } as never)
      .eq("id", householdId);
    setSavingName(false);
    if (error) { addToast("저장 실패", "error"); return; }
    setHousehold({ ...household!, name: householdName.trim() });
    addToast("가계부 이름이 변경되었습니다", "success");
  }

  async function addCategory() {
    if (!catForm.name.trim()) { addToast("카테고리 이름을 입력하세요", "error"); return; }
    setSavingCat(true);
    const supabase = createClient();
    const maxOrder = categories.filter((c) => c.type === catForm.type).length;
    const { error } = await supabase.from("categories").insert({
      household_id: householdId,
      ...catForm,
      name: catForm.name.trim(),
      is_default: false,
      sort_order: maxOrder,
    } as never);
    setSavingCat(false);
    if (error) { addToast("저장 실패", "error"); return; }

    const { data } = await supabase
      .from("categories")
      .select("*")
      .eq("household_id", householdId)
      .order("type")
      .order("sort_order");
    setCategories(data ?? []);
    addToast("카테고리가 추가되었습니다", "success");
    setShowCatForm(false);
    setCatForm({ name: "", icon: "📦", type: "expense", color: "#94a3b8" });
  }

  async function deleteCategory(id: string) {
    if (!confirm("삭제하시겠어요? 관련 내역의 카테고리는 비워집니다.")) return;
    const supabase = createClient();
    await supabase.from("categories").delete().eq("id", id);
    setCategories(categories.filter((c) => c.id !== id));
    addToast("삭제되었습니다", "success");
  }

  function copyUrl() {
    const url = `${window.location.origin}/${householdId}`;
    navigator.clipboard.writeText(url).then(() =>
      addToast("URL이 복사되었습니다! 파트너에게 공유하세요 🎉", "success")
    );
  }

  function CategoryList({ cats, type }: { cats: Category[]; type: "expense" | "income" }) {
    return (
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(e, type)}>
        <SortableContext items={cats.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {cats.map((cat) => (
              <SortableCategoryItem key={cat.id} cat={cat} onDelete={deleteCategory} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    );
  }

  return (
    <div className="min-h-dvh bg-gray-50">
      <div className="bg-white px-5 pt-safe pb-4 border-b border-gray-100">
        <h1 className="text-lg font-bold">설정</h1>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* 공유 URL */}
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">가계부 공유</h2>
          <p className="text-xs text-gray-500 mb-3">
            아래 URL을 파트너에게 공유하면 같은 가계부를 사용할 수 있어요.
          </p>
          <div className="bg-gray-50 rounded-xl px-3 py-2 text-xs text-gray-500 font-mono break-all mb-3">
            {typeof window !== "undefined" ? `${window.location.origin}/${householdId}` : ""}
          </div>
          <Button size="md" className="w-full" onClick={copyUrl}>
            🔗 URL 복사
          </Button>
        </Card>

        {/* 가계부 이름 */}
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">가계부 이름</h2>
          <div className="flex gap-2">
            <input
              value={householdName}
              onChange={(e) => setHouseholdName(e.target.value)}
              className="flex-1 h-10 border border-gray-200 rounded-xl px-3 text-sm outline-none focus:border-gray-900"
            />
            <Button size="sm" onClick={saveHouseholdName} loading={savingName}>저장</Button>
          </div>
        </Card>

        {/* 카테고리 관리 */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-700">카테고리</h2>
              <p className="text-xs text-gray-400 mt-0.5">꾹 눌러서 순서 변경</p>
            </div>
            <button
              onClick={() => setShowCatForm(!showCatForm)}
              className="text-xs text-blue-500 px-2.5 py-1.5 bg-blue-50 rounded-lg"
            >
              {showCatForm ? "취소" : "+ 추가"}
            </button>
          </div>

          {showCatForm && (
            <div className="bg-gray-50 rounded-xl p-3 mb-4 space-y-2">
              <div className="flex gap-1 p-1 bg-white rounded-xl">
                {(["expense", "income"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setCatForm((f) => ({ ...f, type: t }))}
                    className={cn(
                      "flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all",
                      catForm.type === t ? "bg-gray-900 text-white" : "text-gray-500"
                    )}
                  >
                    {t === "expense" ? "지출" : "수입"}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  placeholder="아이콘"
                  value={catForm.icon}
                  onChange={(e) => setCatForm((f) => ({ ...f, icon: e.target.value }))}
                  className="w-14 h-9 border border-gray-200 rounded-xl text-center text-lg outline-none"
                />
                <input
                  placeholder="카테고리 이름"
                  value={catForm.name}
                  onChange={(e) => setCatForm((f) => ({ ...f, name: e.target.value }))}
                  className="flex-1 h-9 border border-gray-200 rounded-xl px-3 text-sm outline-none focus:border-gray-900"
                />
                <input
                  type="color"
                  value={catForm.color}
                  onChange={(e) => setCatForm((f) => ({ ...f, color: e.target.value }))}
                  className="w-9 h-9 rounded-lg border border-gray-200 cursor-pointer p-0.5"
                />
              </div>
              <Button size="sm" className="w-full" onClick={addCategory} loading={savingCat}>
                추가
              </Button>
            </div>
          )}

          <div className="space-y-4">
            {[{ label: "지출", cats: expenseCats, type: "expense" as const }, { label: "수입", cats: incomeCats, type: "income" as const }].map(
              ({ label, cats, type }) => (
                <div key={label}>
                  <p className="text-xs font-semibold text-gray-400 mb-2">{label}</p>
                  <CategoryList cats={cats} type={type} />
                </div>
              )
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
