"use client";

import toast from "react-hot-toast";
import { AppShell } from "@/components/layout/AppShell";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { RecurringForm } from "@/components/recurring/RecurringForm";
import { RecurringList } from "@/components/recurring/RecurringList";
import { useAuth } from "@/contexts/AuthContext";
import { useRecurring } from "@/hooks/useRecurring";
import { addRecurring, deleteRecurring, setRecurringActive } from "@/lib/firestore/recurring";
import type { NewRecurring } from "@/lib/types";

function RecurringContent() {
  const { user } = useAuth();
  const { recurring } = useRecurring(user?.uid);

  async function handleAdd(item: NewRecurring) {
    if (!user) return;
    await addRecurring(user.uid, item);
    toast.success("Recurring item added");
  }

  async function handleToggle(id: string, active: boolean) {
    if (!user) return;
    await setRecurringActive(user.uid, id, active);
  }

  async function handleDelete(id: string) {
    if (!user) return;
    await deleteRecurring(user.uid, id);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-900">Recurring &amp; Bills</h1>
      <p className="text-sm text-slate-500">
        Set up income and expenses that repeat automatically (rent, salary, subscriptions, EMIs).
        They&apos;re posted for you on their due date, and you&apos;ll get reminders before bills are
        due.
      </p>
      <RecurringForm onSubmit={handleAdd} />
      <RecurringList items={recurring} onToggleActive={handleToggle} onDelete={handleDelete} />
    </div>
  );
}

export default function RecurringPage() {
  return (
    <ProtectedRoute>
      <AppShell>
        <RecurringContent />
      </AppShell>
    </ProtectedRoute>
  );
}
