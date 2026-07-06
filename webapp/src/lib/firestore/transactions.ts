import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import type { NewTransaction, Transaction } from "@/lib/types";

function transactionsCol(uid: string) {
  return collection(getFirebaseDb(), "users", uid, "transactions");
}

export function subscribeToTransactions(
  uid: string,
  onChange: (transactions: Transaction[]) => void
): () => void {
  const q = query(transactionsCol(uid), orderBy("date", "desc"));
  return onSnapshot(q, (snapshot) => {
    const transactions = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      const createdAt = data.createdAt as Timestamp | undefined;
      return {
        id: docSnap.id,
        type: data.type,
        amount: data.amount,
        description: data.description,
        category: data.category,
        flag: data.flag,
        date: data.date,
        time: data.time,
        createdAt: createdAt ? createdAt.toDate().toISOString() : new Date().toISOString(),
      } as Transaction;
    });
    onChange(transactions);
  });
}

export async function addTransaction(uid: string, transaction: NewTransaction) {
  const docRef = await addDoc(transactionsCol(uid), {
    ...transaction,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateTransaction(
  uid: string,
  id: string,
  updates: Partial<NewTransaction>
) {
  await updateDoc(doc(getFirebaseDb(), "users", uid, "transactions", id), updates);
}

export async function deleteTransaction(uid: string, id: string) {
  await deleteDoc(doc(getFirebaseDb(), "users", uid, "transactions", id));
}
