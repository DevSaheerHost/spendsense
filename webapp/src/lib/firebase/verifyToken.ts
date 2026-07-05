import "server-only";

export interface VerifiedToken {
  uid: string;
  email?: string;
}

/**
 * Verifies a Firebase Auth ID token using the Identity Toolkit REST API
 * (`accounts:lookup`), which only requires the project's Web API key — no
 * Admin SDK service account. Google validates the token's signature and
 * expiry server-side and returns the user record.
 *
 * Returns null for any invalid, expired, or malformed token so callers can
 * respond with 401 without leaking details. Use this when the Admin SDK is
 * not configured; prefer the Admin SDK when it is available.
 */
export async function verifyIdTokenViaRest(idToken: string): Promise<VerifiedToken | null> {
  const apiKey = process.env.FIREBASE_API_KEY ?? process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey || !idToken) return null;

  try {
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
        signal: AbortSignal.timeout(10_000),
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    const user = data?.users?.[0];
    if (!user?.localId) return null;

    return { uid: user.localId, email: user.email };
  } catch {
    return null;
  }
}
