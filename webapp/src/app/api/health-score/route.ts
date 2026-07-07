import { NextRequest, NextResponse } from "next/server";
import { verifyIdTokenViaRest } from "@/lib/firebase/verifyToken";
import { generateHealthExplanation } from "@/lib/ai";
import type { FinancialSnapshot } from "@/lib/recommendations/engine";

// Allow enough time for an AI call plus one retry-with-backoff on 429.
export const maxDuration = 30;

// Returns a short AI explanation of the user's financial health score.
// Protected by the same REST ID-token check as the other AI routes.
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
  const score = Number(body?.score);
  const factorSummary = (body?.factorSummary as string) ?? "";
  if (!snapshot || !Number.isFinite(score)) {
    return NextResponse.json({ error: "snapshot and score are required" }, { status: 400 });
  }

  const explanation = await generateHealthExplanation(snapshot, score, factorSummary);
  if (!explanation) {
    return NextResponse.json(
      { error: "The AI explanation is unavailable right now. Please try again later." },
      { status: 503 }
    );
  }

  return NextResponse.json({ explanation });
}
