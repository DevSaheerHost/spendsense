"use client";

import { useState } from "react";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  type FlagType,
  type NewRecurring,
  type RecurringFrequency,
  type TransactionType,
} from "@/lib/types";

interface RecurringFormProps {
  onSubmit: (item: NewRecurring) => Promise<void>;
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function RecurringForm({ onSubmit }: RecurringFormProps) {
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [flag, setFlag] = useState<FlagType>("green");
  const [frequency, setFrequency] = useState<RecurringFrequency>("monthly");
  const [dayOfMonth, setDayOfMonth] = useState("1");
  const [dayOfWeek, setDayOfWeek] = useState("1");
  const [submitting, setSubmitting] = useState(false);

  const categories = type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  function handleTypeChange(nextType: TransactionType) {
    setType(nextType);
    setCategory(nextType === "expense" ? EXPENSE_CATEGORIES[0] : INCOME_CATEGORIES[0]);
    if (nextType === "income") setFlag("green");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0 || !description.trim()) return;

    setSubmitting(true);
    try {
      await onSubmit({
        type,
        amount: parsedAmount,
        description: description.trim(),
        category,
        flag,
        frequency,
        dayOfMonth: frequency === "monthly" ? Number(dayOfMonth) : undefined,
        dayOfWeek: frequency === "weekly" ? Number(dayOfWeek) : undefined,
      });
      setAmount("");
      setDescription("");
      setFlag("green");
      setDayOfMonth("1");
      setDayOfWeek("1");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
      <SegmentedControl
        ariaLabel="Transaction type"
        value={type}
        onChange={handleTypeChange}
        options={[
          { value: "expense", label: "Expense" },
          { value: "income", label: "Income" },
        ]}
      />

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Amount</label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
            &#8377;
          </span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            className="w-full rounded-lg border border-slate-300 py-2 pl-7 pr-3 text-sm"
            placeholder="0.00"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          placeholder={type === "expense" ? "e.g. House rent" : "e.g. Monthly salary"}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Category</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Repeats</label>
        <SegmentedControl
          ariaLabel="Repeat frequency"
          value={frequency}
          onChange={setFrequency}
          options={[
            { value: "monthly", label: "Monthly" },
            { value: "weekly", label: "Weekly" },
          ]}
        />
      </div>

      {frequency === "monthly" ? (
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Day of month (1-28)</label>
          <input
            type="number"
            min="1"
            max="28"
            value={dayOfMonth}
            onChange={(e) => setDayOfMonth(e.target.value)}
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      ) : (
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Day of week</label>
          <select
            value={dayOfWeek}
            onChange={(e) => setDayOfWeek(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {WEEKDAYS.map((w, i) => (
              <option key={w} value={i}>
                {w}
              </option>
            ))}
          </select>
        </div>
      )}

      {type === "expense" && (
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Financial decision flag</label>
          <div className="flex gap-2">
            {(
              [
                { value: "green", label: "Green", className: "border-emerald-500 text-emerald-700" },
                { value: "yellow", label: "Yellow", className: "border-amber-500 text-amber-700" },
                { value: "red", label: "Red", className: "border-red-500 text-red-700" },
              ] as { value: FlagType; label: string; className: string }[]
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setFlag(option.value)}
                className={`flex-1 rounded-lg border-2 py-2 text-xs font-semibold ${option.className} ${
                  flag === option.value ? "bg-slate-50" : "opacity-50"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {submitting ? "Saving..." : "Add recurring item"}
      </button>
    </form>
  );
}
