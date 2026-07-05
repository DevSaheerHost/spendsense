"use client";

import { AppShell } from "@/components/layout/AppShell";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { RecommendationsPanel } from "@/components/recommendations/RecommendationsPanel";
import { useAuth } from "@/contexts/AuthContext";
import { useTransactions } from "@/hooks/useTransactions";
import { useLoans } from "@/hooks/useLoans";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useMonthlyStats } from "@/hooks/useMonthlyStats";

function RecommendationsContent() {
  const { user } = useAuth();
  const { transactions } = useTransactions(user?.uid);
  const { loans } = useLoans(user?.uid);
  const { profile } = useUserProfile(user?.uid);
  const { snapshot, categoryBreakdown, monthlyTransactions } = useMonthlyStats(
    transactions,
    loans,
    profile?.monthlyIncome ?? 0
  );

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-900">Smart Recommendations</h1>
      <p className="text-sm text-slate-500">
        Personalized budget advice based on your income, spending, and loan obligations this month.
      </p>
      <RecommendationsPanel
        snapshot={snapshot}
        categoryBreakdown={categoryBreakdown}
        transactions={monthlyTransactions}
      />
    </div>
  );
}

export default function RecommendationsPage() {
  return (
    <ProtectedRoute>
      <AppShell>
        <RecommendationsContent />
      </AppShell>
    </ProtectedRoute>
  );
}
