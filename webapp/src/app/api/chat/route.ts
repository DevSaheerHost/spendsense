import { NextRequest, NextResponse } from "next/server";
import { verifyIdTokenViaRest } from "@/lib/firebase/verifyToken";
import type { FinancialSnapshot } from "@/lib/recommendations/engine";
import {
  generateGeminiChatReply,
  type AdviceTransaction,
  type ChatMessage,
} from "@/lib/recommendations/gemini";

// Interactive finance chat. Grounded in the caller's own financial data and
// protected by the same REST ID-token check as the recommendations route.
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const idToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!idToken) {
    return NextResponse.json({ error: "Missing Authorization bearer token" }, { status: 401 });
  }

  const verified = await verifyIdTokenViaRest(idToken);
  if (!verified) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const snapshot = body?.snapshot as FinancialSnapshot | undefined;
  const categoryBreakdown = (body?.categoryBreakdown as Record<string, number>) ?? {};
  const transactions = (body?.transactions as AdviceTransaction[]) ?? [];
  const messages = (body?.messages as ChatMessage[]) ?? [];

  if (!snapshot || messages.length === 0) {
    return NextResponse.json({ error: "snapshot and messages are required" }, { status: 400 });
  }

  const reply = await generateGeminiChatReply(snapshot, categoryBreakdown, transactions, messages);
  if (!reply) {
    return NextResponse.json(
      { error: "The AI assistant is unavailable right now. Please try again later." },
      { status: 503 }
    );
  }

  return NextResponse.json({ reply });
}
