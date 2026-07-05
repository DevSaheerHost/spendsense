import { NextRequest, NextResponse } from "next/server";
import { verifyIdTokenViaRest } from "@/lib/firebase/verifyToken";
import { suggestCategory } from "@/lib/recommendations/gemini";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/lib/types";

// Suggests the best category for a transaction from its description using the
// AI. Protected by the same REST ID-token check as the other AI routes.
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
  const description = (body?.description as string) ?? "";
  const type = body?.type === "income" ? "income" : "expense";
  if (!description.trim()) {
    return NextResponse.json({ error: "description is required" }, { status: 400 });
  }

  const categories = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const category = await suggestCategory(description, type, categories);
  if (!category) {
    return NextResponse.json(
      { error: "Could not suggest a category right now." },
      { status: 503 }
    );
  }

  return NextResponse.json({ category });
}
