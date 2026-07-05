import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase/admin";
import { generateFallbackRecommendations, type FinancialSnapshot } from "@/lib/recommendations/engine";
import { generateGeminiAdvice } from "@/lib/recommendations/gemini";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const idToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!idToken) {
    return NextResponse.json({ error: "Missing Authorization bearer token" }, { status: 401 });
  }

  try {
    await getAdminAuth().verifyIdToken(idToken);
  } catch {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const snapshot = body?.snapshot as FinancialSnapshot | undefined;
  const categoryBreakdown = (body?.categoryBreakdown as Record<string, number>) ?? {};

  if (!snapshot) {
    return NextResponse.json({ error: "Missing snapshot in request body" }, { status: 400 });
  }

  const geminiAdvice = await generateGeminiAdvice(snapshot, categoryBreakdown);
  if (geminiAdvice && geminiAdvice.length > 0) {
    return NextResponse.json({ source: "gemini", recommendations: geminiAdvice });
  }

  const fallback = generateFallbackRecommendations(snapshot);
  return NextResponse.json({
    source: "fallback",
    recommendations: fallback.map((r) => r.message),
  });
}
