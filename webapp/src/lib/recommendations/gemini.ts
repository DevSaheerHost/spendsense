import "server-only";
import type { FinancialSnapshot } from "@/lib/recommendations/engine";

// gemini-2.5-flash is on the free tier and fast; override with GEMINI_MODEL
// if your key has quota for a different model.
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

// Language the AI recommendations/chat are written in. Defaults to Malayalam;
// override with GEMINI_ADVICE_LANGUAGE (e.g. "English", "Hindi", "Tamil").
const ADVICE_LANGUAGE = process.env.GEMINI_ADVICE_LANGUAGE ?? "Malayalam";

// A trimmed transaction the AI can reason about (esp. the free-text
// description, which explains exactly how the money was earned or spent).
export interface AdviceTransaction {
  type: "income" | "expense";
  amount: number;
  description: string;
  category: string;
  flag: "green" | "yellow" | "red";
  date: string;
}

export interface ChatMessage {
  role: "user" | "model";
  text: string;
}

// Builds the shared financial-context block that primes the model for both
// one-shot advice and the interactive chat.
function buildContextBlock(
  snapshot: FinancialSnapshot,
  categoryBreakdown: Record<string, number>,
  transactions: AdviceTransaction[]
): string {
  const lines = [
    "The user's financial summary for the current month (all amounts in Indian Rupees, INR):",
    `- Monthly income: ${snapshot.monthlyIncome}`,
    `- Monthly expenses: ${snapshot.monthlyExpense}`,
    `- Needs spending: ${snapshot.needsSpend}`,
    `- Wants spending: ${snapshot.wantsSpend}`,
    `- Net savings: ${snapshot.savings}`,
    `- Red-flag (unhealthy) transactions: ${snapshot.redFlagCount} totaling ${snapshot.redFlagTotal}`,
    `- Monthly loan/EMI obligations: ${snapshot.monthlyEmiTotal}`,
    `- Spending by category: ${JSON.stringify(categoryBreakdown)}`,
  ];

  // Include up to 40 recent transactions with their descriptions so the model
  // can give advice about specific spending, not just aggregate numbers.
  const recent = transactions.slice(0, 40);
  if (recent.length > 0) {
    lines.push("", "Individual transactions this month (description explains how money was earned/spent):");
    for (const t of recent) {
      lines.push(
        `- [${t.type}] "${t.description}" | category: ${t.category} | flag: ${t.flag} | Rs ${t.amount} | ${t.date}`
      );
    }
  }

  return lines.join("\n");
}

// Single low-level call to Gemini's generateContent. Returns the raw text, or
// null on missing key / network error / bad response so callers can degrade.
async function callGemini(body: unknown, timeoutMs = 12_000): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      }
    );
    if (!response.ok) return null;
    const data = await response.json();
    const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return text ?? null;
  } catch {
    return null;
  }
}

/**
 * Generates personalized financial advice. Returns null (rather than throwing)
 * whenever the API key is missing or the call fails, so callers can fall back
 * to the local 50/30/20 logic engine.
 */
export async function generateGeminiAdvice(
  snapshot: FinancialSnapshot,
  categoryBreakdown: Record<string, number>,
  transactions: AdviceTransaction[] = []
): Promise<string[] | null> {
  const context = buildContextBlock(snapshot, categoryBreakdown, transactions);

  const prompt = `You are a personal finance advisor.
${context}

Give 3 to 5 short, specific, actionable recommendations (max 2 sentences each)
to improve this person's financial health this month. Where relevant, refer to
specific transactions by what they were spent on (use the descriptions above).
Reference concrete rupee amounts (use the Rs or INR prefix, never a dollar
sign) where useful. Write every recommendation in ${ADVICE_LANGUAGE}. Keep
numbers, currency amounts, and the Rs/INR prefix in standard digits. Return
each recommendation as its own line with no numbering, bullets, or markdown
formatting.`;

  const text = await callGemini({ contents: [{ parts: [{ text: prompt }] }] });
  if (!text) return null;

  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/**
 * Answers a follow-up question in the finance chat, grounded in the user's
 * data and prior conversation. Returns null on failure.
 */
export async function generateGeminiChatReply(
  snapshot: FinancialSnapshot,
  categoryBreakdown: Record<string, number>,
  transactions: AdviceTransaction[],
  history: ChatMessage[]
): Promise<string | null> {
  const context = buildContextBlock(snapshot, categoryBreakdown, transactions);

  const systemInstruction = {
    parts: [
      {
        text: `You are a friendly, concise personal finance advisor for an
Indian user. Base your answers on the user's data below and the conversation.
${context}

Answer the user's questions about their finances helpfully and specifically,
referring to their actual transactions where relevant. Reply in
${ADVICE_LANGUAGE}. Keep currency amounts with the Rs/INR prefix in standard
digits. Keep replies short (2-4 sentences) and plain text with no markdown.`,
      },
    ],
  };

  const contents = history.slice(-12).map((m) => ({
    role: m.role,
    parts: [{ text: m.text }],
  }));

  return callGemini({ systemInstruction, contents }, 15_000);
}
