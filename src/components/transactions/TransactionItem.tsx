"use client";

import Link from "next/link";
import { Transaction } from "@/types";
import { cn } from "@/lib/utils";

export function TransactionItem({
  transaction: tx,
  householdId,
}: {
  transaction: Transaction;
  householdId: string;
}) {
  return (
    <Link
      href={`/${householdId}/transactions/${tx.id}`}
      className="flex items-center gap-3 px-4 py-3.5 active:bg-gray-50 transition-colors"
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0"
        style={{ backgroundColor: `${tx.category?.color ?? "#94a3b8"}20` }}
      >
        {tx.category?.icon ?? "📦"}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {tx.category?.name ?? "기타"}
        </p>
        <p className="text-xs text-gray-400 truncate">
          {[tx.written_by, tx.memo].filter(Boolean).join(" · ") || "메모 없음"}
        </p>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="text-right">
          <p className={cn("text-sm font-semibold", tx.type === "income" ? "text-green-600" : "text-gray-900")}>
            {tx.type === "income" ? "+" : "-"}
            {new Intl.NumberFormat("ko-KR").format(tx.amount)}원
          </p>
          <p className="text-xs text-gray-400">{tx.date.slice(5).replace("-", "/")}</p>
        </div>
        <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>
      </div>
    </Link>
  );
}
