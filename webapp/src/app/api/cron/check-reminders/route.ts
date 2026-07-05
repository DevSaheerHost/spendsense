import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, getAdminMessaging } from "@/lib/firebase/admin";
import { formatCurrency } from "@/lib/utils";

// Meant to be invoked by an external scheduler (e.g. Vercel Cron) once a day.
// Checks every user for:
//  1. Loan EMIs due within the next 3 days -> reminder notification
//  2. Monthly expenses that exceed their configured budget -> overspend warning
// Protected by CRON_SECRET so it cannot be triggered by arbitrary requests.
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

  let remindersSent = 0;
  let overspendSent = 0;

  for (const userDoc of usersSnap.docs) {
    const uid = userDoc.id;
    const userData = userDoc.data();
    const tokens: string[] = userData.fcmTokens ?? [];
    if (tokens.length === 0) continue;

    const notifications: { title: string; body: string }[] = [];

    // 1. Upcoming EMI reminders (due within 3 days).
    const loansSnap = await db.collection(`users/${uid}/loans`).where("status", "==", "active").get();
    for (const loanDoc of loansSnap.docs) {
      const loan = loanDoc.data();
      const dueDay: number = loan.dueDayOfMonth;
      let due = new Date(now.getFullYear(), now.getMonth(), dueDay);
      if (due < now) due = new Date(now.getFullYear(), now.getMonth() + 1, dueDay);
      const daysUntilDue = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilDue >= 0 && daysUntilDue <= 3) {
        notifications.push({
          title: "Upcoming EMI payment",
          body: `${loan.name}: an EMI of ${formatCurrency(loan.monthlyEmi)} is due in ${daysUntilDue} day(s).`,
        });
      }
    }

    // 2. Monthly budget overspend check.
    const monthlyBudget: number | undefined = userData.monthlyBudget;
    if (monthlyBudget && monthlyBudget > 0) {
      const txSnap = await db
        .collection(`users/${uid}/transactions`)
        .where("type", "==", "expense")
        .where("date", ">=", `${monthPrefix}-01`)
        .where("date", "<=", `${monthPrefix}-31`)
        .get();
      const totalExpense = txSnap.docs.reduce((sum, d) => sum + (d.data().amount ?? 0), 0);
      if (totalExpense > monthlyBudget) {
        notifications.push({
          title: "Monthly budget exceeded",
          body: `You have spent ${formatCurrency(totalExpense)} this month, over your ${formatCurrency(monthlyBudget)} budget.`,
        });
        overspendSent += 1;
      }
    }

    if (notifications.length === 0) continue;

    for (const notification of notifications) {
      await messaging.sendEachForMulticast({ tokens, notification });
      remindersSent += 1;
    }
  }

  return NextResponse.json({ usersChecked: usersSnap.size, remindersSent, overspendSent });
}
