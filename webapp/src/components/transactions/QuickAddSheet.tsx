"use client";

import { TransactionForm } from "@/components/transactions/TransactionForm";
import type { NewTransaction } from "@/lib/types";

interface QuickAddSheetProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (transaction: NewTransaction) => Promise<void>;
}

// Material-style bottom sheet holding the transaction form for quick add.
export function QuickAddSheet({ open, onClose, onSubmit }: QuickAddSheetProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex flex-col justify-end bg-black/40"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="max-h-[92vh] overflow-y-auto rounded-t-3xl bg-[color:var(--background)] p-4"
        style={{ animation: "sheet-in 0.25s ease-out" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-300" aria-hidden />
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Add transaction</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <TransactionForm onSubmit={onSubmit} />
      </div>
    </div>
  );
}
