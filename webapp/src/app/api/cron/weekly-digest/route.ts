import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, getAdminMessaging } from "@/lib/firebase/admin";
import { generateWeeklyDigest } from "@/lib/ai";
import { buildSnapshot } from "@/lib/recommendations/engine";
import type { Loan, Transaction } from "@/lib/types";
import { formatCurrency, toDateKey } from "@/lib/utils";

// Allow time to loop over users, each with one AI call.
export const maxDuration = 60;

// Invoked weekly by an external scheduler (e.g. Vercel Cron). For every user
// with a registered device, sends a push notification summarizing the week
// with a short AI-written insight (falling back to a templated message when
// no AI provider is configured/available). Protected by CRON_SECRET.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const bearerSecret = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const secret =
    request.headers.get("x-cron-secret") ?? bearerSecret ?? request.nextUrl.searchParams.get("secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminDb();
  const messaging = getAdminMessaging();
  const usersSnap = await db.collection("users").get();

  const now = new Date();
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const weekAgoKey = toDateKey(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));

  let sent = 0;

  for (const userDoc of usersSnap.docs) {
    try {
      const uid = userDoc.id;
      const userData = userDoc.data();
      const tokens: string[] = userData.fcmTokens ?? [];
      if (tokens.length === 0) continue;

      const txSnap = await db
        .collection(`users/${uid}/transactions`)
        .where("date", ">=", `${monthPrefix}-01`)
        .where("date", "<=", `${monthPrefix}-31`)
        .get();
      const transactions = txSnap.docs.map((d) => d.data()) as unknown as Transaction[];

      const loansSnap = await db.collection(`users/${uid}/loans`).get();
      const loans = loansSnap.docs.map((d) => d.data()) as unknown as Loan[];

      const snapshot = buildSnapshot(transactions, loans, userData.monthlyIncome ?? 0);

      // Last 7 days of spending + top category this month.
      let weekExpense = 0;
      const categoryTotals: Record<string, number> = {};
      for (const t of transactions) {
        if (t.type !== "expense") continue;
        if (t.date >= weekAgoKey) weekExpense += t.amount;
        categoryTotals[t.category] = (categoryTotals[t.category] ?? 0) + t.amount;
      }
      const topCategory =
        Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

      const aiBody = await generateWeeklyDigest(snapshot, weekExpense, topCategory);
      const body =
        aiBody ??
        `You spent ${formatCurrency(weekExpense)} this week and saved ${formatCurrency(
          snapshot.savings
        )} so far this month.`;

      await messaging.sendEachForMulticast({
        tokens,
        notification: { title: "Your weekly money summary", body },
        webpush: { fcmOptions: { link: "/dashboard" } },
      });
      sent += 1;
    } catch {
      // Skip this user on any failure; keep processing the rest.
    }
  }

  return NextResponse.json({ usersChecked: usersSnap.size, digestsSent: sent });
}
