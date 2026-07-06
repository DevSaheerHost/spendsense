import "server-only";
import type { FinancialSnapshot } from "@/lib/recommendations/engine";
import type { AdviceLoan, AdviceTransaction, ChatMessage } from "@/lib/types";

// Language the AI advice/chat is written in. Defaults to Malayalam; override
// with AI_ADVICE_LANGUAGE (GEMINI_ADVICE_LANGUAGE is still honored for back-compat).
const ADVICE_LANGUAGE =
  process.env.AI_ADVICE_LANGUAGE ?? process.env.GEMINI_ADVICE_LANGUAGE ?? "Malayalam";

// Provider models (overridable via env). Groq (OpenAI-compatible, fast, higher
// free-tier limits) is preferred; Gemini is the fallback.
const GROQ_MODEL = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ---- Groq (OpenAI-compatible Chat Completions) ----------------------------
async function callGroq(system: string, turns: ChatTurn[], timeoutMs: number): Promise<string | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  const messages = [
    ...(system ? [{ role: "system", content: system }] : []),
    ...turns.map((t) => ({ role: t.role, content: t.content })),
  ];

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model: GROQ_MODEL, messages, temperature: 0.7 }),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (response.status === 429 && attempt < 2) {
        const retryAfter = Number(response.headers.get("retry-after"));
        await sleep(Math.min((retryAfter > 0 ? retryAfter : 3.5) * 1000, 4000));
        continue;
      }
      if (!response.ok) return null;
      const data = await response.json();
      const text: string | undefined = data?.choices?.[0]?.message?.content;
      return text?.trim() ? text : null;
    } catch {
      return null;
    }
  }
  return null;
}

// ---- Gemini (generateContent) ---------------------------------------------
async function callGeminiProvider(
  system: string,
  turns: ChatTurn[],
  timeoutMs: number
): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const body = {
    ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
    contents: turns.map((t) => ({
      role: t.role === "assistant" ? "model" : "user",
      parts: [{ text: t.content }],
    })),
  };
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (response.status === 429 && attempt < 2) {
        const retryAfter = Number(response.headers.get("retry-after"));
        await sleep(Math.min((retryAfter > 0 ? retryAfter : 3.5) * 1000, 4000));
        continue;
      }
      if (!response.ok) return null;
      const data = await response.json();
      const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      return text?.trim() ? text : null;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Provider-agnostic chat call. Prefers Groq (fast, higher free-tier limits),
 * falls back to Gemini, and returns null if neither is configured or both
 * fail — so callers can degrade to the local rule engine.
 */
async function callAI(system: string, turns: ChatTurn[], timeoutMs = 12_000): Promise<string | null> {
  if (process.env.GROQ_API_KEY) {
    const fromGroq = await callGroq(system, turns, timeoutMs);
    if (fromGroq) return fromGroq;
  }
  if (process.env.GEMINI_API_KEY) {
    return callGeminiProvider(system, turns, timeoutMs);
  }
  return null;
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Formats a transaction's date/time as e.g. "2026-07-05 (Sunday) 19:30" so the
// model can reason about timing patterns (late-night spending, paydays, etc.).
function formatWhen(date: string, time?: string): string {
  const parsed = new Date(`${date}T00:00:00`);
  const weekday = Number.isNaN(parsed.getTime()) ? "" : ` (${WEEKDAYS[parsed.getDay()]})`;
  return `${date}${weekday}${time ? ` ${time}` : ""}`;
}

// Builds the shared financial-context block used to prime the model.
function buildContextBlock(
  snapshot: FinancialSnapshot,
  categoryBreakdown: Record<string, number>,
  transactions: AdviceTransaction[],
  loans: AdviceLoan[]
): string {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;

  const lines = [
    `Today's date is ${today} (${WEEKDAYS[now.getDay()]}).`,
    "The user's financial summary for the current month (all amounts in Indian Rupees, INR):",
    `- Total income: ${snapshot.monthlyIncome} (fixed monthly income ${snapshot.baseMonthlyIncome} + extra one-off income ${snapshot.extraIncome})`,
    `- Monthly expenses: ${snapshot.monthlyExpense}`,
    `- Needs spending: ${snapshot.needsSpend}`,
    `- Wants spending: ${snapshot.wantsSpend}`,
    `- Net savings: ${snapshot.savings}`,
    `- Red-flag (unhealthy) transactions: ${snapshot.redFlagCount} totaling ${snapshot.redFlagTotal}`,
    `- Monthly loan/EMI obligations: ${snapshot.monthlyEmiTotal}`,
    `- Spending by category: ${JSON.stringify(categoryBreakdown)}`,
  ];

  if (loans.length > 0) {
    lines.push("", "Loans / EMIs:");
    for (const l of loans) {
      lines.push(
        `- "${l.name}"${l.lender ? ` from ${l.lender}` : ""} | total Rs ${l.totalAmount} | paid Rs ${l.amountPaid} | pending Rs ${l.pending} | EMI Rs ${l.monthlyEmi}/month due on day ${l.dueDayOfMonth} of the month | ${l.status}`
      );
    }
  }

  const recent = transactions.slice(0, 40);
  if (recent.length > 0) {
    lines.push(
      "",
      "Individual transactions this month (with the day/time the money moved, so you can spot timing patterns):"
    );
    for (const t of recent) {
      lines.push(
        `- [${t.type}] "${t.description}" | category: ${t.category} | flag: ${t.flag} | Rs ${t.amount} | ${formatWhen(t.date, t.time)}`
      );
    }
  }
  return lines.join("\n");
}

/**
 * Generates personalized financial advice, or null if no AI provider is
 * available/working so callers can fall back to the local 50/30/20 engine.
 */
export async function generateAdvice(
  snapshot: FinancialSnapshot,
  categoryBreakdown: Record<string, number>,
  transactions: AdviceTransaction[] = [],
  loans: AdviceLoan[] = []
): Promise<string[] | null> {
  const context = buildContextBlock(snapshot, categoryBreakdown, transactions, loans);
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

  const text = await callAI("", [{ role: "user", content: prompt }]);
  if (!text) return null;

  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/** Answers a follow-up question in the finance chat. Returns null on failure. */
export async function generateChatReply(
  snapshot: FinancialSnapshot,
  categoryBreakdown: Record<string, number>,
  transactions: AdviceTransaction[],
  loans: AdviceLoan[],
  history: ChatMessage[]
): Promise<string | null> {
  const context = buildContextBlock(snapshot, categoryBreakdown, transactions, loans);
  const system = `You are a friendly, concise personal finance advisor for an
Indian user. Base your answers on the user's data below and the conversation.
${context}

Answer the user's questions about their finances helpfully and specifically,
referring to their actual transactions where relevant. Reply in
${ADVICE_LANGUAGE}. Keep currency amounts with the Rs/INR prefix in standard
digits. Keep replies short (2-4 sentences) and plain text with no markdown.`;

  const turns: ChatTurn[] = history.slice(-20).map((m) => ({
    role: m.role === "model" ? "assistant" : "user",
    content: m.text,
  }));

  return callAI(system, turns, 15_000);
}

/**
 * Picks the best-fitting category for a transaction from the allowed list,
 * based on its description. Returns a value guaranteed to be in `categories`,
 * or null if the AI is unavailable / returns an unrecognized value.
 */
export async function suggestCategory(
  description: string,
  type: "income" | "expense",
  categories: readonly string[]
): Promise<string | null> {
  if (!description.trim()) return null;

  const prompt = `You are categorizing a personal finance ${type} transaction.
Description: "${description}"

Choose the single most appropriate category from this exact list:
${categories.map((c) => `- ${c}`).join("\n")}

Reply with ONLY the category name, exactly as written in the list, and nothing
else. No punctuation, no explanation.`;

  const text = await callAI("", [{ role: "user", content: prompt }], 8_000);
  if (!text) return null;

  const cleaned = text.trim().replace(/^["'\-\s]+|["'.\s]+$/g, "");
  const exact = categories.find((c) => c === cleaned);
  if (exact) return exact;
  const lenient = categories.find((c) => c.toLowerCase() === cleaned.toLowerCase());
  return lenient ?? null;
}
