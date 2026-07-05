"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, type FlagType, type NewTransaction, type TransactionType } from "@/lib/types";

interface TransactionFormProps {
  onSubmit: (transaction: NewTransaction) => Promise<void>;
}

const todayIso = () => new Date().toISOString().slice(0, 10);

export function TransactionForm({ onSubmit }: TransactionFormProps) {
  const { user } = useAuth();
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [flag, setFlag] = useState<FlagType>("green");
  const [date, setDate] = useState(todayIso());
  const [submitting, setSubmitting] = useState(false);
  const [suggesting, setSuggesting] = useState(false);

  const categories = type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  // Ask the AI to pick a category from the description, so the user doesn't
  // have to categorize manually (and mistakes like "Biryani" under Healthcare
  // get corrected).
  async function handleSuggestCategory() {
    if (!user || !description.trim() || suggesting) return;
    setSuggesting(true);
    try {
      const idToken = await user.getIdToken();
      const response = await fetch("/api/categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ description: description.trim(), type }),
      });
      if (!response.ok) throw new Error("failed");
      const data = await response.json();
      if (data.category && (categories as readonly string[]).includes(data.category)) {
        setCategory(data.category);
        toast.success(`AI set category: ${data.category}`);
      } else {
        toast.error("Couldn't suggest a category.");
      }
    } catch {
      toast.error("Couldn't suggest a category.");
    } finally {
      setSuggesting(false);
    }
  }

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
        date,
      });
      setAmount("");
      setDescription("");
      setFlag("green");
      setDate(todayIso());
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex gap-2">
        {(["expense", "income"] as TransactionType[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => handleTypeChange(t)}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold capitalize ${
              type === t ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

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
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Description &mdash; explain exactly how the money was earned or spent
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          rows={2}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          placeholder={
            type === "expense"
              ? "e.g. Dinner with friends at Olive Garden"
              : "e.g. Monthly salary from Acme Corp"
          }
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="block text-sm font-medium text-slate-700">Category</label>
            <button
              type="button"
              onClick={handleSuggestCategory}
              disabled={suggesting || !description.trim()}
              title="Let AI pick a category from your description"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 disabled:text-slate-300"
            >
              {suggesting ? "Suggesting..." : "✨ AI"}
            </button>
          </div>
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
          <label className="mb-1 block text-sm font-medium text-slate-700">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Financial decision flag</label>
        <div className="flex gap-2">
          {(
            [
              { value: "green", label: "Green - Healthy", className: "border-emerald-500 text-emerald-700" },
              { value: "yellow", label: "Yellow - Neutral", className: "border-amber-500 text-amber-700" },
              { value: "red", label: "Red - Unhealthy", className: "border-red-500 text-red-700" },
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

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {submitting ? "Saving..." : `Add ${type}`}
      </button>
    </form>
  );
}
