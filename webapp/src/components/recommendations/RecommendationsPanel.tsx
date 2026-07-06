"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useSpeech } from "@/hooks/useSpeech";
import { useCooldown } from "@/hooks/useCooldown";
import { SpeakButton } from "@/components/recommendations/SpeakButton";
import { ChatPanel } from "@/components/recommendations/ChatPanel";
import {
  loadCachedRecommendations,
  saveCachedRecommendations,
  type CachedRecommendations,
} from "@/lib/firestore/recommendations";
import { recordAiUsage } from "@/lib/firestore/aiUsage";
import { generateFallbackRecommendations, type FinancialSnapshot } from "@/lib/recommendations/engine";
import type { Loan, Transaction } from "@/lib/types";

interface RecommendationsPanelProps {
  snapshot: FinancialSnapshot;
  categoryBreakdown: Record<string, number>;
  transactions: Transaction[];
  loans: Loan[];
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.floor(hours / 24)} day(s) ago`;
}

export function RecommendationsPanel({
  snapshot,
  categoryBreakdown,
  transactions,
  loans,
}: RecommendationsPanelProps) {
  const { user } = useAuth();
  const speech = useSpeech();
  const refreshCooldown = useCooldown(6000);
  const [cached, setCached] = useState<CachedRecommendations | null>(null);
  const [loadingCache, setLoadingCache] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const adviceTransactions = useMemo(
    () =>
      transactions.map((t) => ({
        type: t.type,
        amount: t.amount,
        description: t.description,
        category: t.category,
        flag: t.flag,
        date: t.date,
        time: t.time,
      })),
    [transactions]
  );

  const adviceLoans = useMemo(
    () =>
      loans.map((l) => ({
        name: l.name,
        lender: l.lender,
        totalAmount: l.totalAmount,
        amountPaid: l.amountPaid,
        pending: Math.max(l.totalAmount - l.amountPaid, 0),
        monthlyEmi: l.monthlyEmi,
        dueDayOfMonth: l.dueDayOfMonth,
        status: l.status,
      })),
    [loans]
  );

  // Free, client-side advice shown until the user generates AI advice — no
  // Gemini call involved.
  const localFallback = useMemo(
    () => generateFallbackRecommendations(snapshot).map((r) => r.message),
    [snapshot]
  );

  // Load previously generated advice once, so revisiting the page (or data
  // streaming in) never triggers a Gemini request on its own.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    // loadingCache starts true; the promise callbacks below flip it off.
    loadCachedRecommendations(user.uid)
      .then((data) => {
        if (!cancelled) setCached(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingCache(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  async function handleRefresh() {
    if (!user || refreshing || refreshCooldown.cooling) return;
    setRefreshing(true);
    let ok = false;
    try {
      const idToken = await user.getIdToken();
      const response = await fetch("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({
          snapshot,
          categoryBreakdown,
          transactions: adviceTransactions,
          loans: adviceLoans,
        }),
      });
      if (!response.ok) throw new Error("Request failed");
      const data = await response.json();
      const next: CachedRecommendations = {
        recommendations: data.recommendations ?? [],
        source: data.source === "ai" ? "ai" : "fallback",
        generatedAt: new Date().toISOString(),
      };
      // The endpoint always returns 200; a "fallback" source means no AI
      // provider produced the result (e.g. rate-limited), so count as failure.
      ok = next.source === "ai";
      setCached(next);
      saveCachedRecommendations(user.uid, next).catch(() => {});
      refreshCooldown.start();
      if (!ok) toast("AI was busy — showing rule-based advice.");
    } catch {
      toast.error("Couldn't refresh advice. Please try again shortly.");
    } finally {
      setRefreshing(false);
      recordAiUsage(user.uid, ok);
    }
  }

  const recommendations = cached?.recommendations ?? localFallback;
  const source = cached?.source ?? "fallback";
  const refreshDisabled = refreshing || refreshCooldown.cooling;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-1 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-700">Smart Recommendations</h3>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
            {source === "ai" ? "AI-generated" : "Rule-based (50/30/20)"}
          </span>
        </div>
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-xs text-slate-400">
            {cached ? `Updated ${timeAgo(cached.generatedAt)}` : "Showing quick rule-based advice"}
          </p>
          <button
            onClick={handleRefresh}
            disabled={refreshDisabled}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {refreshing
              ? "Generating…"
              : refreshCooldown.cooling
                ? "Please wait…"
                : cached
                  ? "Refresh advice"
                  : "Get AI advice"}
          </button>
        </div>

        {loadingCache ? (
          <p className="text-sm text-slate-500">Loading…</p>
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
        loans={adviceLoans}
        speechSupported={speech.supported}
        speakingId={speech.speakingId}
        onToggleSpeak={speech.toggle}
      />
    </div>
  );
}
