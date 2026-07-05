import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb, getAdminMessaging } from "@/lib/firebase/admin";

// Sends an FCM push notification to the authenticated user's own registered
// devices. Used for immediate alerts (red-flag transactions) triggered from
// the client right after a Firestore write.
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const idToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!idToken) {
    return NextResponse.json({ error: "Missing Authorization bearer token" }, { status: 401 });
  }

  let uid: string;
  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken);
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const title = body?.title as string | undefined;
  const message = body?.body as string | undefined;
  if (!title || !message) {
    return NextResponse.json({ error: "title and body are required" }, { status: 400 });
  }

  const userSnap = await getAdminDb().doc(`users/${uid}`).get();
  const tokens: string[] = userSnap.data()?.fcmTokens ?? [];

  if (tokens.length === 0) {
    return NextResponse.json({ sent: 0, reason: "No registered device tokens" });
  }

  const response = await getAdminMessaging().sendEachForMulticast({
    tokens,
    notification: { title, body: message },
    webpush: { fcmOptions: { link: "/dashboard" } },
  });

  return NextResponse.json({ sent: response.successCount, failed: response.failureCount });
}
