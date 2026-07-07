import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";

// Caches the AI explanation of the health score so it isn't regenerated (and
// re-charged against AI limits) on every dashboard visit.
export interface CachedHealthExplanation {
  explanation: string;
  score: number;
  generatedAt: string;
}

function ref(uid: string) {
  return doc(getFirebaseDb(), "users", uid, "ai", "healthExplanation");
}

export async function loadHealthExplanation(uid: string): Promise<CachedHealthExplanation | null> {
  const snapshot = await getDoc(ref(uid));
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  if (typeof data.explanation !== "string") return null;
  return {
    explanation: data.explanation,
    score: typeof data.score === "number" ? data.score : 0,
    generatedAt: typeof data.generatedAt === "string" ? data.generatedAt : new Date().toISOString(),
  };
}

export async function saveHealthExplanation(
  uid: string,
  data: CachedHealthExplanation
): Promise<void> {
  await setDoc(ref(uid), { ...data, updatedAt: serverTimestamp() });
}
