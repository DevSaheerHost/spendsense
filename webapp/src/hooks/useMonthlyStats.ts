"use client";

import { useMemo } from "react";
import { buildSnapshot, type FinancialSnapshot } from "@/lib/recommendations/engine";
import type { Loan, Transaction } from "@/lib/types";
import { isSameMonth } from "@/lib/utils";

export interface MonthlyStats {
  snapshot: FinancialSnapshot;
  categoryBreakdown: Record<string, number>;
  monthlyTransactions: Transaction[];
  trend: { month: string; income: number; expense: number }[];
}

export function useMonthlyStats(
  transactions: Transaction[],
  loans: Loan[],
  baseMonthlyIncome = 0
): MonthlyStats {
  return useMemo(() => {
    const monthlyTransactions = transactions.filter((t) => isSameMonth(t.date));
    const snapshot = buildSnapshot(monthlyTransactions, loans, baseMonthlyIncome);

    const categoryBreakdown: Record<string, number> = {};
    for (const t of monthlyTransactions) {
      if (t.type !== "expense") continue;
      categoryBreakdown[t.category] = (categoryBreakdown[t.category] ?? 0) + t.amount;
    }

    // Last 6 months of income vs. expense trend.
    const trendMap = new Map<string, { income: number; expense: number }>();
    const now = new Date();
    const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      trendMap.set(key, { income: 0, expense: 0 });
    }
    for (const t of transactions) {
      const key = t.date.slice(0, 7);
      const bucket = trendMap.get(key);
      if (!bucket) continue;
      if (t.type === "income") bucket.income += t.amount;
      else bucket.expense += t.amount;
    }
    // Only the current month's fixed income is known, so add it there so the
    // trend's current bar matches the dashboard's total income.
    const currentBucket = trendMap.get(currentKey);
    if (currentBucket) currentBucket.income += baseMonthlyIncome;

    const trend = Array.from(trendMap.entries()).map(([month, values]) => ({
      month,
      ...values,
    }));

    return { snapshot, categoryBreakdown, monthlyTransactions, trend };
  }, [transactions, loans, baseMonthlyIncome]);
}
