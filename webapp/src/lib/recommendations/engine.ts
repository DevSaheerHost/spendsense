import { CATEGORY_BUCKET, type Loan, type Transaction } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export interface FinancialSnapshot {
  monthlyIncome: number;
  monthlyExpense: number;
  needsSpend: number;
  wantsSpend: number;
  savings: number;
  redFlagCount: number;
  redFlagTotal: number;
  monthlyEmiTotal: number;
}

export function buildSnapshot(transactions: Transaction[], loans: Loan[]): FinancialSnapshot {
  const income = transactions.filter((t) => t.type === "income");
  const expenses = transactions.filter((t) => t.type === "expense");

  const monthlyIncome = income.reduce((sum, t) => sum + t.amount, 0);
  const monthlyExpense = expenses.reduce((sum, t) => sum + t.amount, 0);

  const needsSpend = expenses
    .filter((t) => (CATEGORY_BUCKET[t.category] ?? "wants") === "needs")
    .reduce((sum, t) => sum + t.amount, 0);
  const wantsSpend = expenses
    .filter((t) => (CATEGORY_BUCKET[t.category] ?? "wants") === "wants")
    .reduce((sum, t) => sum + t.amount, 0);

  const redFlags = expenses.filter((t) => t.flag === "red");
  const redFlagCount = redFlags.length;
  const redFlagTotal = redFlags.reduce((sum, t) => sum + t.amount, 0);

  const monthlyEmiTotal = loans
    .filter((l) => l.status === "active")
    .reduce((sum, l) => sum + l.monthlyEmi, 0);

  const savings = monthlyIncome - monthlyExpense;

  return {
    monthlyIncome,
    monthlyExpense,
    needsSpend,
    wantsSpend,
    savings,
    redFlagCount,
    redFlagTotal,
    monthlyEmiTotal,
  };
}

export interface Recommendation {
  id: string;
  severity: "info" | "warning" | "danger" | "success";
  message: string;
}

/**
 * Deterministic fallback advisor based on the 50/30/20 rule
 * (50% needs, 30% wants, 20% savings). Used whenever no AI API
 * key is configured, or when the AI call fails.
 */
export function generateFallbackRecommendations(
  snapshot: FinancialSnapshot
): Recommendation[] {
  const { monthlyIncome, monthlyExpense, needsSpend, wantsSpend, savings, redFlagCount, redFlagTotal, monthlyEmiTotal } =
    snapshot;

  const recommendations: Recommendation[] = [];

  if (monthlyIncome <= 0) {
    return [
      {
        id: "no-income",
        severity: "info",
        message:
          "Log your income for this month so the recommendation engine can calculate a personalized budget plan.",
      },
    ];
  }

  const targetNeeds = monthlyIncome * 0.5;
  const targetWants = monthlyIncome * 0.3;
  const targetSavings = monthlyIncome * 0.2;

  recommendations.push({
    id: "budget-plan",
    severity: "info",
    message: `Based on the 50/30/20 rule, aim to keep ${formatCurrency(
      targetNeeds
    )} for needs, ${formatCurrency(targetWants)} for wants, and ${formatCurrency(
      targetSavings
    )} for savings this month.`,
  });

  if (monthlyExpense > monthlyIncome) {
    recommendations.push({
      id: "overspend",
      severity: "danger",
      message: `This month is too costly: you spent ${formatCurrency(
        monthlyExpense
      )} against ${formatCurrency(monthlyIncome)} of income, a shortfall of ${formatCurrency(
        monthlyExpense - monthlyIncome
      )}. Cut discretionary spending immediately.`,
    });
  } else if (savings < targetSavings) {
    recommendations.push({
      id: "low-savings",
      severity: "warning",
      message: `You are saving ${formatCurrency(savings)} this month, below the recommended ${formatCurrency(
        targetSavings
      )} (20% of income). Consider trimming wants spending.`,
    });
  } else {
    recommendations.push({
      id: "good-savings",
      severity: "success",
      message: `Great job! You are saving ${formatCurrency(
        savings
      )} this month, meeting or beating the 20% savings target.`,
    });
  }

  if (needsSpend > targetNeeds) {
    recommendations.push({
      id: "needs-over",
      severity: "warning",
      message: `Your essential (needs) spending of ${formatCurrency(
        needsSpend
      )} exceeds the recommended ${formatCurrency(targetNeeds)}. Review housing, utilities and loan payments.`,
    });
  }

  if (wantsSpend > targetWants) {
    recommendations.push({
      id: "wants-over",
      severity: "warning",
      message: `Discretionary (wants) spending of ${formatCurrency(
        wantsSpend
      )} is above the recommended ${formatCurrency(targetWants)}. Try a spending freeze on dining, shopping and subscriptions.`,
    });
  }

  if (redFlagCount > 0) {
    recommendations.push({
      id: "red-flags",
      severity: "danger",
      message: `You logged ${redFlagCount} red-flag transaction${redFlagCount > 1 ? "s" : ""} totaling ${formatCurrency(
        redFlagTotal
      )} this month. These are flagged as unhealthy financial decisions — consider setting a hard limit on this category.`,
    });
  }

  if (monthlyEmiTotal > 0 && monthlyIncome > 0) {
    const emiRatio = monthlyEmiTotal / monthlyIncome;
    if (emiRatio > 0.4) {
      recommendations.push({
        id: "high-emi-burden",
        severity: "danger",
        message: `Your monthly EMI/loan obligations of ${formatCurrency(
          monthlyEmiTotal
        )} are ${(emiRatio * 100).toFixed(0)}% of your income. Financial advisors recommend keeping debt payments under 40% of income — consider consolidating or refinancing.`,
      });
    } else {
      recommendations.push({
        id: "emi-healthy",
        severity: "info",
        message: `Your monthly EMI/loan obligations of ${formatCurrency(
          monthlyEmiTotal
        )} are ${(emiRatio * 100).toFixed(0)}% of your income, within a healthy range.`,
      });
    }
  }

  return recommendations;
}
