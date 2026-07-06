"use client";

import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { ExpensePieChart } from "@/components/dashboard/ExpensePieChart";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { SpendingHeatmap } from "@/components/dashboard/SpendingHeatmap";
import { useAuth } from "@/contexts/AuthContext";
import { useTransactions } from "@/hooks/useTransactions";
import { useLoans } from "@/hooks/useLoans";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useMonthlyStats } from "@/hooks/useMonthlyStats";
import { setMonthlyBudget, setMonthlyIncome } from "@/lib/firestore/users";
import { processDueRecurring } from "@/lib/firestore/recurring";
import { registerForPushNotifications } from "@/lib/notifications/fcm";
import { formatCurrency } from "@/lib/utils";

function DashboardContent() {
  const { user } = useAuth();
  const { transactions } = useTransactions(user?.uid);
  const { loans } = useLoans(user?.uid);
  const { profile } = useUserProfile(user?.uid);
  const { snapshot, categoryBreakdown, trend } = useMonthlyStats(
    transactions,
    loans,
    profile?.monthlyIncome ?? 0
  );

  const [budgetInput, setBudgetInput] = useState("");
  const [incomeInput, setIncomeInput] = useState("");
  // Reflects the browser's actual Notification.permission so the "enable" card
  // does not reappear on every load once the user has already granted it.
  const [permission, setPermission] = useState<NotificationPermission | "unsupported" | "loading">(
    "loading"
  );
  const [enabling, setEnabling] = useState(false);
  const tokenSyncedRef = useRef(false);
  const recurringProcessedRef = useRef(false);

  // Post any due recurring transactions once when the dashboard opens.
  useEffect(() => {
    if (!user || recurringProcessedRef.current) return;
    recurringProcessedRef.current = true;
    processDueRecurring(user.uid).catch(() => {});
  }, [user]);

  useEffect(() => {
    // Sync the initial value from the browser's Notification API on mount.
    // This one-time read of external state is exactly what an effect is for;
    // it cannot run during SSR (no `Notification`), so a lazy initializer
    // would cause a hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPermission(
      typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported"
    );
  }, []);

  // When permission is already granted but this device's token was never saved
  // (or was cleared), silently re-register it once so reminders can reach here.
  useEffect(() => {
    if (permission !== "granted" || !user || !profile || tokenSyncedRef.current) return;
    if ((profile.fcmTokens?.length ?? 0) > 0) return;
    tokenSyncedRef.current = true;
    registerForPushNotifications(user.uid).catch(() => {});
  }, [permission, user, profile]);

  async function handleEnableNotifications() {
    if (!user) return;
    setEnabling(true);
    try {
      const token = await registerForPushNotifications(user.uid);
      setPermission(token ? "granted" : typeof Notification !== "undefined" ? Notification.permission : "denied");
    } finally {
      setEnabling(false);
    }
  }

  async function handleSaveBudget(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !budgetInput) return;
    await setMonthlyBudget(user.uid, Number(budgetInput));
    setBudgetInput("");
  }

  async function handleSaveIncome(e: React.FormEvent) {
    e.preventDefault();
    if (!user || incomeInput === "") return;
    await setMonthlyIncome(user.uid, Number(incomeInput));
    setIncomeInput("");
  }

  const overBudget = profile?.monthlyBudget && snapshot.monthlyExpense > profile.monthlyBudget;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>

      <SummaryCards
        monthlyIncome={snapshot.baseMonthlyIncome}
        extraIncome={snapshot.extraIncome}
        expense={snapshot.monthlyExpense}
        balance={snapshot.savings}
      />

      {overBudget && (
        <div className="rounded-xl border-2 border-red-500 bg-red-50 p-3 text-sm text-red-700">
          You have exceeded your monthly budget of {formatCurrency(profile!.monthlyBudget!)}.
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="mb-2 text-sm font-semibold text-slate-700">Monthly Income</h3>
        <p className="mb-2 text-xs text-slate-500">
          {profile?.monthlyIncome
            ? `Current fixed income: ${formatCurrency(profile.monthlyIncome)}`
            : "Set your regular/fixed monthly income (e.g. salary)."}{" "}
          Log one-off cash (shop sales, tips, gifts) as income transactions instead.
        </p>
        <form onSubmit={handleSaveIncome} className="flex gap-2">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
              &#8377;
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={incomeInput}
              onChange={(e) => setIncomeInput(e.target.value)}
              placeholder="Set monthly income"
              className="w-full rounded-lg border border-slate-300 py-2 pl-7 pr-3 text-sm"
            />
          </div>
          <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
            Save
          </button>
        </form>
      </div>

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

      {(permission === "default" || permission === "denied") && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-1 text-sm font-semibold text-slate-700">Push Notifications</h3>
          <p className="mb-2 text-xs text-slate-500">
            Enable push notifications for EMI reminders, budget overspend warnings, and red-flag alerts.
          </p>
          {permission === "denied" ? (
            <p className="text-xs text-red-600">
              Notifications are blocked for this site. To turn them on, allow notifications for this
              site in your browser settings, then reload the page.
            </p>
          ) : (
            <button
              onClick={handleEnableNotifications}
              disabled={enabling}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {enabling ? "Enabling..." : "Enable notifications"}
            </button>
          )}
        </div>
      )}

      <ExpensePieChart categoryBreakdown={categoryBreakdown} />
      <TrendChart trend={trend} />
      <SpendingHeatmap transactions={transactions} />
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
