"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import { addTransaction } from "@/lib/firestore/transactions";
import { sendPushToSelf } from "@/lib/notifications/fcm";
import { QuickAddSheet } from "@/components/transactions/QuickAddSheet";
import { RedFlagAlertModal } from "@/components/transactions/RedFlagAlertModal";
import type { NewTransaction } from "@/lib/types";

// Floating action button for quick-adding a transaction from any screen via a
// bottom sheet. Handles the same red-flag alert + push as the Transactions page.
export function Fab() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [redFlag, setRedFlag] = useState<{ amount: number; description: string } | null>(null);

  async function handleAdd(transaction: NewTransaction) {
    if (!user) return;
    await addTransaction(user.uid, transaction);
    setOpen(false);

    if (transaction.flag === "red") {
      setRedFlag({ amount: transaction.amount, description: transaction.description });
      const idToken = await user.getIdToken();
      await sendPushToSelf(
        idToken,
        "Red Flag Transaction Logged",
        `${transaction.description}: an unhealthy financial decision.`
      );
    } else {
      toast.success("Transaction added");
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Add transaction"
        className="fixed right-4 z-30 flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-4 text-sm font-semibold text-white hover:bg-indigo-700"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 76px)", boxShadow: "var(--elev-3)" }}
      >
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
        Add
      </button>

      <QuickAddSheet open={open} onClose={() => setOpen(false)} onSubmit={handleAdd} />

      {redFlag && (
        <RedFlagAlertModal
          amount={redFlag.amount}
          description={redFlag.description}
          onClose={() => setRedFlag(null)}
        />
      )}
    </>
  );
}
