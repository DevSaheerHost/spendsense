"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { ExpensePieChart } from "@/components/dashboard/ExpensePieChart";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { useAuth } from "@/contexts/AuthContext";
import { useTransactions } from "@/hooks/useTransactions";
import { useLoans } from "@/hooks/useLoans";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useMonthlyStats } from "@/hooks/useMonthlyStats";
import { setMonthlyBudget } from "@/lib/firestore/users";
import { registerForPushNotifications } from "@/lib/notifications/fcm";
import { formatCurrency } from "@/lib/utils";

function DashboardContent() {
  const { user } = useAuth();
  const { transactions } = useTransactions(user?.uid);
  const { loans } = useLoans(user?.uid);
  const { profile } = useUserProfile(user?.uid);
  const { snapshot, categoryBreakdown, trend } = useMonthlyStats(transactions, loans);

  const [budgetInput, setBudgetInput] = useState("");
  const [notifStatus, setNotifStatus] = useState<"idle" | "enabling" | "enabled" | "denied">("idle");

  async function handleEnableNotifications() {
    if (!user) return;
    setNotifStatus("enabling");
    const token = await registerForPushNotifications(user.uid);
    setNotifStatus(token ? "enabled" : "denied");
  }

  async function handleSaveBudget(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !budgetInput) return;
    await setMonthlyBudget(user.uid, Number(budgetInput));
    setBudgetInput("");
  }

  const overBudget = profile?.monthlyBudget && snapshot.monthlyExpense > profile.monthlyBudget;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>

      <SummaryCards income={snapshot.monthlyIncome} expense={snapshot.monthlyExpense} balance={snapshot.savings} />

      {overBudget && (
        <div className="rounded-xl border-2 border-red-500 bg-red-50 p-3 text-sm text-red-700">
          You have exceeded your monthly budget of {formatCurrency(profile!.monthlyBudget!)}.
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="mb-2 text-sm font-semibold text-slate-700">Monthly Budget</h3>
        <p className="mb-2 text-xs text-slate-500">
          {profile?.monthlyBudget
            ? `Current budget: ${formatCurrency(profile.monthlyBudget)}`
            : "No budget set yet."}
        </p>
        <form onSubmit={handleSaveBudget} className="flex gap-2">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
              &#8377;
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={budgetInput}
              onChange={(e) => setBudgetInput(e.target.value)}
              placeholder="Set monthly budget"
              className="w-full rounded-lg border border-slate-300 py-2 pl-7 pr-3 text-sm"
            />
          </div>
          <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
            Save
          </button>
        </form>
      </div>

      {notifStatus !== "enabled" && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-1 text-sm font-semibold text-slate-700">Push Notifications</h3>
          <p className="mb-2 text-xs text-slate-500">
            Enable push notifications for EMI reminders, budget overspend warnings, and red-flag alerts.
          </p>
          <button
            onClick={handleEnableNotifications}
            disabled={notifStatus === "enabling"}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {notifStatus === "enabling" ? "Enabling..." : "Enable notifications"}
          </button>
          {notifStatus === "denied" && (
            <p className="mt-2 text-xs text-red-600">
              Notification permission was denied or unsupported in this browser.
            </p>
          )}
        </div>
      )}

      <ExpensePieChart categoryBreakdown={categoryBreakdown} />
      <TrendChart trend={trend} />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <AppShell>
        <DashboardContent />
      </AppShell>
    </ProtectedRoute>
  );
}
