import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";

// Cached AI advice so the Advice page can show a result without calling Gemini
// on every visit/data change. A fresh call happens only when the user taps
// "Refresh advice".
export interface CachedRecommendations {
  recommendations: string[];
  source: "gemini" | "fallback";
  generatedAt: string; // ISO datetime
}

function cacheRef(uid: string) {
  return doc(getFirebaseDb(), "users", uid, "ai", "recommendations");
}

export async function loadCachedRecommendations(
  uid: string
): Promise<CachedRecommendations | null> {
  const snapshot = await getDoc(cacheRef(uid));
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  if (!Array.isArray(data.recommendations)) return null;
  return {
    recommendations: data.recommendations as string[],
    source: data.source === "gemini" ? "gemini" : "fallback",
    generatedAt: typeof data.generatedAt === "string" ? data.generatedAt : new Date().toISOString(),
  };
}

export async function saveCachedRecommendations(
  uid: string,
  data: CachedRecommendations
): Promise<void> {
  await setDoc(cacheRef(uid), { ...data, updatedAt: serverTimestamp() });
}
