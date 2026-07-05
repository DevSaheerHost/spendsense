"use client";

import toast from "react-hot-toast";
import { AppShell } from "@/components/layout/AppShell";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { LoanForm } from "@/components/loans/LoanForm";
import { LoanList } from "@/components/loans/LoanList";
import { useAuth } from "@/contexts/AuthContext";
import { useLoans } from "@/hooks/useLoans";
import { addLoan, deleteLoan, recordEmiPayment } from "@/lib/firestore/loans";
import type { NewLoan } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

function LoansContent() {
  const { user } = useAuth();
  const { loans } = useLoans(user?.uid);

  async function handleAdd(loan: NewLoan) {
    if (!user) return;
    await addLoan(user.uid, loan);
    toast.success("Loan added");
  }

  async function handleRecordPayment(id: string, amount: number) {
    if (!user) return;
    await recordEmiPayment(user.uid, id, amount);
    toast.success("EMI payment recorded");
  }

  async function handleDelete(id: string) {
    if (!user) return;
    await deleteLoan(user.uid, id);
  }

  const totalPending = loans.reduce((sum, l) => sum + Math.max(l.totalAmount - l.amountPaid, 0), 0);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-900">Loans & EMIs</h1>
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total Pending Debt</p>
        <p className="mt-1 text-2xl font-bold text-slate-900">
          {formatCurrency(totalPending)}
        </p>
      </div>
      <LoanForm onSubmit={handleAdd} />
      <LoanList loans={loans} onRecordPayment={handleRecordPayment} onDelete={handleDelete} />
    </div>
  );
}

export default function LoansPage() {
  return (
    <ProtectedRoute>
      <AppShell>
        <LoansContent />
      </AppShell>
    </ProtectedRoute>
  );
}
