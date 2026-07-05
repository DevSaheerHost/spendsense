"use client";

import { useState } from "react";
import type { NewLoan } from "@/lib/types";

interface LoanFormProps {
  onSubmit: (loan: NewLoan) => Promise<void>;
}

export function LoanForm({ onSubmit }: LoanFormProps) {
  const [name, setName] = useState("");
  const [lender, setLender] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [monthlyEmi, setMonthlyEmi] = useState("");
  const [dueDayOfMonth, setDueDayOfMonth] = useState("1");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsedTotal = Number(totalAmount);
    const parsedEmi = Number(monthlyEmi);
    const parsedDueDay = Number(dueDayOfMonth);
    if (!name.trim() || !parsedTotal || !parsedEmi || parsedDueDay < 1 || parsedDueDay > 28) return;

    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        lender: lender.trim(),
        totalAmount: parsedTotal,
        monthlyEmi: parsedEmi,
        dueDayOfMonth: parsedDueDay,
        startDate,
        notes: notes.trim() || undefined,
      });
      setName("");
      setLender("");
      setTotalAmount("");
      setMonthlyEmi("");
      setDueDayOfMonth("1");
      setNotes("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Loan name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="e.g. Car Loan"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Lender</label>
        <input
          value={lender}
          onChange={(e) => setLender(e.target.value)}
          placeholder="e.g. Wells Fargo"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Total loan amount</label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
              &#8377;
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 py-2 pl-7 pr-3 text-sm"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Monthly EMI</label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
              &#8377;
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={monthlyEmi}
              onChange={(e) => setMonthlyEmi(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 py-2 pl-7 pr-3 text-sm"
            />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">EMI due day (1-28)</label>
          <input
            type="number"
            min="1"
            max="28"
            value={dueDayOfMonth}
            onChange={(e) => setDueDayOfMonth(e.target.value)}
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Start date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {submitting ? "Saving..." : "Add loan"}
      </button>
    </form>
  );
}
