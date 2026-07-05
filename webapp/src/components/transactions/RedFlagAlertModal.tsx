"use client";

import { formatCurrency } from "@/lib/utils";

interface RedFlagAlertModalProps {
  amount: number;
  description: string;
  onClose: () => void;
}

export function RedFlagAlertModal({ amount, description, onClose }: RedFlagAlertModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-sm rounded-xl border-2 border-red-500 bg-white p-6 shadow-xl">
        <div className="mb-2 flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full bg-red-500" aria-hidden />
          <h2 className="text-lg font-bold text-red-700">Red Flag Transaction</h2>
        </div>
        <p className="mb-1 text-sm text-slate-700">
          You just logged <strong>{formatCurrency(amount)}</strong> for &ldquo;{description}&rdquo; as an
          unhealthy financial decision.
        </p>
        <p className="mb-4 text-sm text-slate-500">
          Consider whether this spending aligns with your financial goals before it happens again.
        </p>
        <button
          onClick={onClose}
          className="w-full rounded-lg bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700"
        >
          Acknowledge
        </button>
      </div>
    </div>
  );
}
