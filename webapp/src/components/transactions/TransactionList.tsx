"use client";

import type { Transaction } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { FlagDot } from "@/components/transactions/FlagBadge";

interface TransactionListProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
}

export function TransactionList({ transactions, onDelete }: TransactionListProps) {
  if (transactions.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-500">No transactions logged yet.</p>;
  }

  return (
    <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
      {transactions.map((t) => (
        <li key={t.id} className="flex items-center gap-3 p-3">
          <FlagDot flag={t.flag} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-900">{t.description}</p>
            <p className="text-xs text-slate-500">
              {t.category} &middot; {t.date}
            </p>
          </div>
          <span
            className={`text-sm font-semibold ${t.type === "income" ? "text-emerald-600" : "text-slate-900"}`}
          >
            {t.type === "income" ? "+" : "-"}
            {formatCurrency(t.amount)}
          </span>
          <button
            onClick={() => onDelete(t.id)}
            aria-label="Delete transaction"
            className="ml-1 text-xs font-medium text-slate-400 hover:text-red-600"
          >
            Delete
          </button>
        </li>
      ))}
    </ul>
  );
}
