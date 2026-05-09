"use client";


import { useRouter } from "next/navigation";
import { TransactionForm } from "@/components/transactions/TransactionForm";

export default function NewTransactionPage({ params }: { params: { householdId: string } }) {
  const { householdId } = params;
  const router = useRouter();

  return (
    <div className="h-dvh flex flex-col">
      {/* 헤더 */}
      <div className="absolute top-0 left-0 right-0 flex items-center px-4 pt-safe-overlay pb-3 bg-white z-10">
        <button onClick={() => router.back()} className="text-gray-500 p-1">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </button>
        <h1 className="font-semibold text-base ml-2">내역 추가</h1>
      </div>
      <TransactionForm householdId={householdId} />
    </div>
  );
}
