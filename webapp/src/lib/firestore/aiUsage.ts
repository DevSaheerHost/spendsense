import { doc, increment, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";

// Tracks how many Gemini-backed requests the user has made (advice refreshes,
// chat messages, auto-categorize), so the app can surface usage against the
// free-tier limits.
function usageRef(uid: string) {
  return doc(getFirebaseDb(), "users", uid, "ai", "usage");
}

function todayKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

export async function recordAiUsage(uid: string): Promise<void> {
  // Atomic increments (per-day + all-time) so concurrent tabs don't clobber
  // each other. Errors are swallowed — usage tracking must never break a flow.
  await setDoc(
    usageRef(uid),
    { total: increment(1), daily: { [todayKey()]: increment(1) }, updatedAt: serverTimestamp() },
    { merge: true }
  ).catch(() => {});
}

export interface AiUsage {
  today: number;
  total: number;
}

export function subscribeToAiUsage(uid: string, onChange: (usage: AiUsage) => void): () => void {
  return onSnapshot(
    usageRef(uid),
    (snapshot) => {
      const data = snapshot.data();
      const daily = (data?.daily as Record<string, number> | undefined) ?? {};
      onChange({ today: daily[todayKey()] ?? 0, total: data?.total ?? 0 });
    },
    () => onChange({ today: 0, total: 0 })
  );
}
