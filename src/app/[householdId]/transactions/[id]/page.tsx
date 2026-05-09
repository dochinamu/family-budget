"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Transaction } from "@/types";
import { TransactionForm } from "@/components/transactions/TransactionForm";

export default function EditTransactionPage({
  params,
}: {
  params: { householdId: string; id: string };
}) {
  const { householdId, id } = params;
  const router = useRouter();
  const [transaction, setTransaction] = useState<Transaction | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("transactions")
      .select("*, category:categories(*)")
      .eq("id", id)
      .single()
      .then(({ data }) => setTransaction(data));
  }, [id]);

  if (!transaction) {
    return (
      <div className="h-dvh flex items-center justify-center">
        <div className="animate-pulse text-gray-300 text-sm">불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="h-dvh flex flex-col">
      <div className="absolute top-0 left-0 right-0 flex items-center px-4 pt-safe-overlay pb-3 bg-white z-10">
        <button onClick={() => router.back()} className="text-gray-500 p-1">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </button>
        <h1 className="font-semibold text-base ml-2">내역 수정</h1>
      </div>
      <TransactionForm householdId={householdId} transaction={transaction} />
    </div>
  );
}
