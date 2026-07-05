import { doc, increment, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";

// Tracks Gemini-backed requests split by outcome (success vs. failed), both
// per-day and all-time, so the app can surface real usage against the
// free-tier limits.
function usageRef(uid: string) {
  return doc(getFirebaseDb(), "users", uid, "ai", "usage");
}

function todayKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

export async function recordAiUsage(uid: string, success: boolean): Promise<void> {
  const field = success ? "success" : "failed";
  // Atomic increments so concurrent tabs don't clobber each other. Errors are
  // swallowed — usage tracking must never break a flow.
  await setDoc(
    usageRef(uid),
    {
      totals: { [field]: increment(1) },
      daily: { [todayKey()]: { [field]: increment(1) } },
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  ).catch(() => {});
}

export interface AiUsageCounts {
  success: number;
  failed: number;
}

export interface AiUsage {
  today: AiUsageCounts;
  total: AiUsageCounts;
}

const EMPTY: AiUsage = { today: { success: 0, failed: 0 }, total: { success: 0, failed: 0 } };

export function subscribeToAiUsage(uid: string, onChange: (usage: AiUsage) => void): () => void {
  return onSnapshot(
    usageRef(uid),
    (snapshot) => {
      const data = snapshot.data();
      const totals = (data?.totals as Partial<AiUsageCounts>) ?? {};
      const daily = ((data?.daily as Record<string, Partial<AiUsageCounts>>) ?? {})[todayKey()] ?? {};
      onChange({
        today: { success: daily.success ?? 0, failed: daily.failed ?? 0 },
        total: { success: totals.success ?? 0, failed: totals.failed ?? 0 },
      });
    },
    () => onChange(EMPTY)
  );
}
