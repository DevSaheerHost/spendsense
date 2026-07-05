import "server-only";
import type { FinancialSnapshot } from "@/lib/recommendations/engine";

// gemini-2.5-flash is on the free tier and fast; override with GEMINI_MODEL
// if your key has quota for a different model.
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

/**
 * Calls the free-tier Google Gemini API to generate personalized financial
 * advice. Returns null (rather than throwing) whenever the API key is
 * missing or the call fails, so callers can fall back to the local
 * 50/30/20 logic engine.
 */
export async function generateGeminiAdvice(
  snapshot: FinancialSnapshot,
  categoryBreakdown: Record<string, number>
): Promise<string[] | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const prompt = `You are a personal finance advisor. A user has the following
financial summary for the current month (all amounts in Indian Rupees, INR):
- Monthly income: ${snapshot.monthlyIncome}
- Monthly expenses: ${snapshot.monthlyExpense}
- Needs spending: ${snapshot.needsSpend}
- Wants spending: ${snapshot.wantsSpend}
- Net savings: ${snapshot.savings}
- Red-flag (unhealthy) transactions: ${snapshot.redFlagCount} totaling ${snapshot.redFlagTotal}
- Monthly loan/EMI obligations: ${snapshot.monthlyEmiTotal}
- Spending by category: ${JSON.stringify(categoryBreakdown)}

Give 3 to 5 short, specific, actionable recommendations (max 2 sentences each)
to improve this person's financial health this month. Reference concrete
rupee amounts (use the Rs or INR prefix, never a dollar sign) where useful.
Return each recommendation as its own line with no numbering, bullets, or
markdown formatting.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
        signal: AbortSignal.timeout(10_000),
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;

    return text
      .split("\n")
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 0);
  } catch {
    // Network error, timeout, or malformed response — fall back silently.
    return null;
  }
}
