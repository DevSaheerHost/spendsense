import type { FinancialSnapshot } from "@/lib/recommendations/engine";

export interface HealthFactor {
  key: string;
  label: string;
  score: number; // 0..1
  weight: number;
}

export interface HealthScore {
  score: number; // 0..100
  rating: "Excellent" | "Good" | "Fair" | "Needs work" | "No data";
  color: string;
  factors: HealthFactor[];
  hasData: boolean;
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/**
 * Computes a 0-100 financial health score from the month snapshot, blending
 * savings rate, debt load, healthy-spending (red-flag) ratio and, when set,
 * budget adherence. Deterministic and client-side (no AI, no cost).
 */
export function computeHealthScore(
  snapshot: FinancialSnapshot,
  monthlyBudget?: number
): HealthScore {
  const income = snapshot.monthlyIncome;
  if (income <= 0) {
    return { score: 0, rating: "No data", color: "#94a3b8", factors: [], hasData: false };
  }

  // Savings rate: 20%+ of income saved = full marks.
  const savingsScore = clamp01(snapshot.savings / income / 0.2);
  // Debt load: EMIs <= 20% of income = full; >= 50% = zero.
  const emiRatio = snapshot.monthlyEmiTotal / income;
  const debtScore = clamp01(1 - (emiRatio - 0.2) / 0.3);
  // Healthy spending: no red-flag spend = full; >= 25% of expenses = zero.
  const rfRatio = snapshot.monthlyExpense > 0 ? snapshot.redFlagTotal / snapshot.monthlyExpense : 0;
  const redFlagScore = clamp01(1 - rfRatio / 0.25);

  const factors: HealthFactor[] = [
    { key: "savings", label: "Savings rate", score: savingsScore, weight: 35 },
    { key: "debt", label: "Debt load", score: debtScore, weight: 25 },
    { key: "healthy", label: "Healthy spending", score: redFlagScore, weight: 20 },
  ];

  if (monthlyBudget && monthlyBudget > 0) {
    const budgetRatio = snapshot.monthlyExpense / monthlyBudget;
    const budgetScore = budgetRatio <= 1 ? 1 : clamp01(1 - (budgetRatio - 1) / 0.5);
    factors.push({ key: "budget", label: "Budget adherence", score: budgetScore, weight: 20 });
  }

  const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0);
  const score = Math.round(
    (factors.reduce((sum, f) => sum + f.score * f.weight, 0) / totalWeight) * 100
  );

  const rating =
    score >= 80 ? "Excellent" : score >= 60 ? "Good" : score >= 40 ? "Fair" : "Needs work";
  const color =
    score >= 80 ? "#059669" : score >= 60 ? "#2563eb" : score >= 40 ? "#d97706" : "#dc2626";

  return { score, rating, color, factors, hasData: true };
}
