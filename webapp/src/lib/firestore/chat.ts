import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import type { ChatMessage } from "@/lib/types";

// The AI chat history is stored as a single capped array at
// users/{uid}/chat/history so the conversation (the AI's "memory") persists
// across reloads, sessions, and devices.
const MAX_STORED_MESSAGES = 60;

function historyRef(uid: string) {
  return doc(getFirebaseDb(), "users", uid, "chat", "history");
}

export async function loadChatHistory(uid: string): Promise<ChatMessage[]> {
  const snapshot = await getDoc(historyRef(uid));
  if (!snapshot.exists()) return [];
  const messages = snapshot.data().messages;
  return Array.isArray(messages) ? (messages as ChatMessage[]) : [];
}

export async function saveChatHistory(uid: string, messages: ChatMessage[]): Promise<void> {
  await setDoc(historyRef(uid), {
    messages: messages.slice(-MAX_STORED_MESSAGES),
    updatedAt: serverTimestamp(),
  });
}

export async function clearChatHistory(uid: string): Promise<void> {
  await setDoc(historyRef(uid), { messages: [], updatedAt: serverTimestamp() });
}
