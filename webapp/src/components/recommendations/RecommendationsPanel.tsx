"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSpeech } from "@/hooks/useSpeech";
import { SpeakButton } from "@/components/recommendations/SpeakButton";
import { ChatPanel } from "@/components/recommendations/ChatPanel";
import { generateFallbackRecommendations, type FinancialSnapshot } from "@/lib/recommendations/engine";
import type { Transaction } from "@/lib/types";

interface RecommendationsPanelProps {
  snapshot: FinancialSnapshot;
  categoryBreakdown: Record<string, number>;
  transactions: Transaction[];
}

export function RecommendationsPanel({
  snapshot,
  categoryBreakdown,
  transactions,
}: RecommendationsPanelProps) {
  const { user } = useAuth();
  const speech = useSpeech();
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [source, setSource] = useState<"gemini" | "fallback" | null>(null);
  const [loading, setLoading] = useState(true);

  // Trim to just the fields the model needs (esp. the free-text description).
  const adviceTransactions = useMemo(
    () =>
      transactions.map((t) => ({
        type: t.type,
        amount: t.amount,
        description: t.description,
        category: t.category,
        flag: t.flag,
        date: t.date,
      })),
    [transactions]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadRecommendations() {
      setLoading(true);
      try {
        if (!user) throw new Error("Not authenticated");
        const idToken = await user.getIdToken();
        const response = await fetch("/api/recommendations", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
          body: JSON.stringify({ snapshot, categoryBreakdown, transactions: adviceTransactions }),
        });
        if (!response.ok) throw new Error("Request failed");
        const data = await response.json();
        if (!cancelled) {
          setRecommendations(data.recommendations ?? []);
          setSource(data.source ?? "fallback");
        }
      } catch {
        // Network or server failure: fall back to local 50/30/20 logic
        // computed entirely on the client so advice is never unavailable.
        if (!cancelled) {
          setRecommendations(generateFallbackRecommendations(snapshot).map((r) => r.message));
          setSource("fallback");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadRecommendations();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, JSON.stringify(snapshot), JSON.stringify(categoryBreakdown), JSON.stringify(adviceTransactions)]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">Smart Recommendations</h3>
          {source && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
              {source === "gemini" ? "AI-generated" : "Rule-based (50/30/20)"}
            </span>
          )}
        </div>
        {loading ? (
          <p className="text-sm text-slate-500">Generating advice...</p>
        ) : (
          <ul className="space-y-2">
            {recommendations.map((rec, index) => (
              <li
                key={index}
                className="flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-700"
              >
                <span className="flex-1">{rec}</span>
                {speech.supported && (
                  <SpeakButton
                    id={`rec-${index}`}
                    text={rec}
                    speakingId={speech.speakingId}
                    onToggle={speech.toggle}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <ChatPanel
        snapshot={snapshot}
        categoryBreakdown={categoryBreakdown}
        transactions={adviceTransactions}
        speechSupported={speech.supported}
        speakingId={speech.speakingId}
        onToggleSpeak={speech.toggle}
      />
    </div>
  );
}
