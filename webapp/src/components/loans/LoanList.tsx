"use client";

import { useState } from "react";
import type { Loan } from "@/lib/types";
import { formatCurrency, daysUntil } from "@/lib/utils";

interface LoanListProps {
  loans: Loan[];
  onRecordPayment: (id: string, amount: number) => Promise<void>;
  onDelete: (id: string) => void;
}

export function LoanList({ loans, onRecordPayment, onDelete }: LoanListProps) {
  if (loans.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-500">No loans tracked yet.</p>;
  }

  return (
    <div className="space-y-3">
      {loans.map((loan) => (
        <LoanCard key={loan.id} loan={loan} onRecordPayment={onRecordPayment} onDelete={onDelete} />
      ))}
    </div>
  );
}

function LoanCard({
  loan,
  onRecordPayment,
  onDelete,
}: {
  loan: Loan;
  onRecordPayment: (id: string, amount: number) => Promise<void>;
  onDelete: (id: string) => void;
}) {
  const [paying, setPaying] = useState(false);
  const pendingAmount = Math.max(loan.totalAmount - loan.amountPaid, 0);
  const progress = loan.totalAmount > 0 ? Math.min((loan.amountPaid / loan.totalAmount) * 100, 100) : 0;
  const nextDueInDays = daysUntil(loan.dueDayOfMonth);

  async function handlePayEmi() {
    setPaying(true);
    try {
      await onRecordPayment(loan.id, loan.monthlyEmi);
    } finally {
      setPaying(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-slate-900">{loan.name}</p>
          {loan.lender && <p className="text-xs text-slate-500">{loan.lender}</p>}
        </div>
        <button onClick={() => onDelete(loan.id)} className="text-xs font-medium text-slate-400 hover:text-red-600">
          Delete
        </button>
      </div>

      <div className="mt-3">
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-indigo-600" style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-1 flex justify-between text-xs text-slate-500">
          <span>{formatCurrency(loan.amountPaid)} paid</span>
          <span>{formatCurrency(pendingAmount)} pending</span>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="text-slate-600">
          EMI {formatCurrency(loan.monthlyEmi)} &middot; due in {nextDueInDays} day(s)
        </span>
        <button
          onClick={handlePayEmi}
          disabled={paying || pendingAmount <= 0}
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {paying ? "Saving..." : "Record EMI payment"}
        </button>
      </div>
    </div>
  );
}
