import { NextRequest, NextResponse } from "next/server";
import { verifyIdTokenViaRest } from "@/lib/firebase/verifyToken";
import { parseTransaction } from "@/lib/ai";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/lib/types";

// Allow enough time for an AI call plus one retry-with-backoff on 429.
export const maxDuration = 30;

// Turns a spoken/typed sentence into a draft transaction using the AI.
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
  const transcript = (body?.transcript as string) ?? "";
  if (!transcript.trim()) {
    return NextResponse.json({ error: "transcript is required" }, { status: 400 });
  }

  const transaction = await parseTransaction(transcript, EXPENSE_CATEGORIES, INCOME_CATEGORIES);
  if (!transaction) {
    return NextResponse.json(
      { error: "Could not understand that as a transaction." },
      { status: 422 }
    );
  }

  return NextResponse.json({ transaction });
}
