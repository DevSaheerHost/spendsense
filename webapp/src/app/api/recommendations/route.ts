import { NextRequest, NextResponse } from "next/server";
import { verifyIdTokenViaRest } from "@/lib/firebase/verifyToken";
import { generateFallbackRecommendations, type FinancialSnapshot } from "@/lib/recommendations/engine";
import { generateGeminiAdvice, type AdviceTransaction } from "@/lib/recommendations/gemini";

// Allow enough time for a Gemini call plus one retry-with-backoff on 429.
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const idToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!idToken) {
    return NextResponse.json({ error: "Missing Authorization bearer token" }, { status: 401 });
  }

  // Verify the Firebase ID token via the Identity Toolkit REST API, which
  // only needs the Web API key (no Admin SDK service account). This keeps
  // the endpoint protected against anonymous abuse of the Gemini quota.
  const verified = await verifyIdTokenViaRest(idToken);
  if (!verified) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const snapshot = body?.snapshot as FinancialSnapshot | undefined;
  const categoryBreakdown = (body?.categoryBreakdown as Record<string, number>) ?? {};
  const transactions = (body?.transactions as AdviceTransaction[]) ?? [];

  if (!snapshot) {
    return NextResponse.json({ error: "Missing snapshot in request body" }, { status: 400 });
  }

  const geminiAdvice = await generateGeminiAdvice(snapshot, categoryBreakdown, transactions);
  if (geminiAdvice && geminiAdvice.length > 0) {
    return NextResponse.json({ source: "gemini", recommendations: geminiAdvice });
  }

  const fallback = generateFallbackRecommendations(snapshot);
  return NextResponse.json({
    source: "fallback",
    recommendations: fallback.map((r) => r.message),
  });
}
