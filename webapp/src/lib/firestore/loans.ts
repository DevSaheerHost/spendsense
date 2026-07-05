import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { Loan, NewLoan } from "@/lib/types";

function loansCol(uid: string) {
  return collection(db, "users", uid, "loans");
}

export function subscribeToLoans(
  uid: string,
  onChange: (loans: Loan[]) => void
): () => void {
  const q = query(loansCol(uid), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    const loans = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      const createdAt = data.createdAt as Timestamp | undefined;
      return {
        id: docSnap.id,
        name: data.name,
        lender: data.lender,
        totalAmount: data.totalAmount,
        amountPaid: data.amountPaid ?? 0,
        monthlyEmi: data.monthlyEmi,
        dueDayOfMonth: data.dueDayOfMonth,
        startDate: data.startDate,
        notes: data.notes,
        status: data.status ?? "active",
        createdAt: createdAt ? createdAt.toDate().toISOString() : new Date().toISOString(),
      } as Loan;
    });
    onChange(loans);
  });
}

export async function addLoan(uid: string, loan: NewLoan) {
  const docRef = await addDoc(loansCol(uid), {
    ...loan,
    amountPaid: loan.amountPaid ?? 0,
    status: "active",
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateLoan(uid: string, id: string, updates: Partial<Loan>) {
  await updateDoc(doc(db, "users", uid, "loans", id), updates);
}

export async function recordEmiPayment(uid: string, id: string, amount: number) {
  await updateDoc(doc(db, "users", uid, "loans", id), {
    amountPaid: increment(amount),
  });
}

export async function deleteLoan(uid: string, id: string) {
  await deleteDoc(doc(db, "users", uid, "loans", id));
}
