import { arrayUnion, doc, onSnapshot, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { UserProfile } from "@/lib/types";

export function subscribeToUserProfile(
  uid: string,
  onChange: (profile: UserProfile | null) => void
): () => void {
  return onSnapshot(doc(db, "users", uid), (snapshot) => {
    if (!snapshot.exists()) {
      onChange(null);
      return;
    }
    onChange({ uid, ...snapshot.data() } as UserProfile);
  });
}

export async function setMonthlyBudget(uid: string, monthlyBudget: number) {
  await setDoc(doc(db, "users", uid), { monthlyBudget }, { merge: true });
}

export async function saveFcmToken(uid: string, token: string) {
  await updateDoc(doc(db, "users", uid), {
    fcmTokens: arrayUnion(token),
  });
}
