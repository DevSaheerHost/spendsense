"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { AppShell } from "@/components/layout/AppShell";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { TransactionForm } from "@/components/transactions/TransactionForm";
import { TransactionList } from "@/components/transactions/TransactionList";
import { RedFlagAlertModal } from "@/components/transactions/RedFlagAlertModal";
import { useAuth } from "@/contexts/AuthContext";
import { useTransactions } from "@/hooks/useTransactions";
import { addTransaction, deleteTransaction } from "@/lib/firestore/transactions";
import { sendPushToSelf } from "@/lib/notifications/fcm";
import type { NewTransaction } from "@/lib/types";

function TransactionsContent() {
  const { user } = useAuth();
  const { transactions } = useTransactions(user?.uid);
  const [redFlagAlert, setRedFlagAlert] = useState<{ amount: number; description: string } | null>(null);

  async function handleAdd(transaction: NewTransaction) {
    if (!user) return;
    await addTransaction(user.uid, transaction);

    if (transaction.flag === "red") {
      setRedFlagAlert({ amount: transaction.amount, description: transaction.description });
      const idToken = await user.getIdToken();
      await sendPushToSelf(
        idToken,
        "Red Flag Transaction Logged",
        `${transaction.description}: an unhealthy financial decision of $${transaction.amount}.`
      );
    } else {
      toast.success("Transaction added");
    }
  }

  async function handleDelete(id: string) {
    if (!user) return;
    await deleteTransaction(user.uid, id);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-900">Transactions</h1>
      <TransactionForm onSubmit={handleAdd} />
      <TransactionList transactions={transactions} onDelete={handleDelete} />

      {redFlagAlert && (
        <RedFlagAlertModal
          amount={redFlagAlert.amount}
          description={redFlagAlert.description}
          onClose={() => setRedFlagAlert(null)}
        />
      )}
    </div>
  );
}

export default function TransactionsPage() {
  return (
    <ProtectedRoute>
      <AppShell>
        <TransactionsContent />
      </AppShell>
    </ProtectedRoute>
  );
}
