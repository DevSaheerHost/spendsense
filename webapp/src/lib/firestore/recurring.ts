import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import { addTransaction } from "@/lib/firestore/transactions";
import type { NewRecurring, RecurringTransaction } from "@/lib/types";
import { firstOccurrenceOnOrAfter, toDateKey } from "@/lib/utils";

function recurringCol(uid: string) {
  return collection(getFirebaseDb(), "users", uid, "recurring");
}

function mapDoc(docSnap: {
  id: string;
  data: () => Record<string, unknown>;
}): RecurringTransaction {
  const data = docSnap.data();
  const createdAt = data.createdAt as Timestamp | undefined;
  return {
    id: docSnap.id,
    type: data.type as RecurringTransaction["type"],
    amount: data.amount as number,
    description: data.description as string,
    category: data.category as string,
    flag: data.flag as RecurringTransaction["flag"],
    frequency: data.frequency as RecurringTransaction["frequency"],
    dayOfMonth: data.dayOfMonth as number | undefined,
    dayOfWeek: data.dayOfWeek as number | undefined,
    nextRunDate: data.nextRunDate as string,
    active: (data.active as boolean) ?? true,
    createdAt: createdAt ? createdAt.toDate().toISOString() : new Date().toISOString(),
  };
}

export function subscribeToRecurring(
  uid: string,
  onChange: (items: RecurringTransaction[]) => void
): () => void {
  const q = query(recurringCol(uid), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => onChange(snapshot.docs.map(mapDoc)));
}

export async function addRecurring(uid: string, item: NewRecurring) {
  const nextRunDate = firstOccurrenceOnOrAfter(
    item.frequency,
    item.dayOfMonth,
    item.dayOfWeek,
    new Date()
  );
  // Only store the day field relevant to the frequency (Firestore rejects
  // undefined values).
  const scheduleField =
    item.frequency === "monthly"
      ? { dayOfMonth: item.dayOfMonth ?? 1 }
      : { dayOfWeek: item.dayOfWeek ?? 1 };

  await addDoc(recurringCol(uid), {
    type: item.type,
    amount: item.amount,
    description: item.description,
    category: item.category,
    flag: item.flag,
    frequency: item.frequency,
    ...scheduleField,
    nextRunDate,
    active: true,
    createdAt: serverTimestamp(),
  });
}

export async function setRecurringActive(uid: string, id: string, active: boolean) {
  await updateDoc(doc(getFirebaseDb(), "users", uid, "recurring", id), { active });
}

export async function deleteRecurring(uid: string, id: string) {
  await deleteDoc(doc(getFirebaseDb(), "users", uid, "recurring", id));
}

/**
 * Posts any recurring transactions that are due (nextRunDate on/before today),
 * catching up on missed periods, and advances each one to its next run date.
 * Run on app open. Returns how many transactions were posted.
 */
export async function processDueRecurring(uid: string): Promise<number> {
  const snapshot = await getDocs(recurringCol(uid));
  const todayKey = toDateKey(new Date());
  let posted = 0;

  for (const docSnap of snapshot.docs) {
    const item = mapDoc(docSnap);
    if (!item.active) continue;

    let runKey = item.nextRunDate;
    let guard = 0;
    // yyyy-MM-dd strings compare correctly lexicographically.
    while (runKey && runKey <= todayKey && guard < 24) {
      await addTransaction(uid, {
        type: item.type,
        amount: item.amount,
        description: `${item.description} (recurring)`,
        category: item.category,
        flag: item.flag,
        date: runKey,
      });
      posted += 1;
      guard += 1;
      const after = new Date(`${runKey}T00:00:00`);
      after.setDate(after.getDate() + 1);
      runKey = firstOccurrenceOnOrAfter(item.frequency, item.dayOfMonth, item.dayOfWeek, after);
    }

    if (runKey !== item.nextRunDate) {
      await updateDoc(doc(getFirebaseDb(), "users", uid, "recurring", item.id), {
        nextRunDate: runKey,
        lastRunDate: todayKey,
      });
    }
  }

  return posted;
}
