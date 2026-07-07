"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useSpeech } from "@/hooks/useSpeech";
import { useCooldown } from "@/hooks/useCooldown";
import { SpeakButton } from "@/components/recommendations/SpeakButton";
import { computeHealthScore } from "@/lib/health";
import { loadHealthExplanation, saveHealthExplanation } from "@/lib/firestore/healthScore";
import { recordAiUsage } from "@/lib/firestore/aiUsage";
import type { FinancialSnapshot } from "@/lib/recommendations/engine";

function barColor(score: number): string {
  if (score >= 0.8) return "#059669";
  if (score >= 0.6) return "#2563eb";
  if (score >= 0.4) return "#d97706";
  return "#dc2626";
}

export function HealthScore({
  snapshot,
  monthlyBudget,
}: {
  snapshot: FinancialSnapshot;
  monthlyBudget?: number;
}) {
  const { user } = useAuth();
  const speech = useSpeech();
  const cooldown = useCooldown(6000);
  const health = useMemo(() => computeHealthScore(snapshot, monthlyBudget), [snapshot, monthlyBudget]);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [loadingExpl, setLoadingExpl] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    loadHealthExplanation(user.uid)
      .then((data) => {
        if (!cancelled && data) setExplanation(data.explanation);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user]);

  async function handleExplain() {
    if (!user || loadingExpl || cooldown.cooling) return;
    setLoadingExpl(true);
    let ok = false;
    try {
      const idToken = await user.getIdToken();
      const factorSummary = health.factors
        .map((f) => `${f.label} ${Math.round(f.score * 100)}`)
        .join(", ");
      const response = await fetch("/api/health-score", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ snapshot, score: health.score, factorSummary }),
      });
      if (!response.ok) throw new Error("failed");
      const data = await response.json();
      setExplanation(data.explanation);
      ok = true;
      saveHealthExplanation(user.uid, {
        explanation: data.explanation,
        score: health.score,
        generatedAt: new Date().toISOString(),
      }).catch(() => {});
    } catch {
      toast.error("Couldn't get the explanation. Please try again shortly.");
    } finally {
      setLoadingExpl(false);
      cooldown.start();
      recordAiUsage(user.uid, ok);
    }
  }

  if (!health.hasData) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="mb-1 text-sm font-semibold text-slate-700">Financial Health Score</h3>
        <p className="text-sm text-slate-500">Set your monthly income to see your health score.</p>
      </div>
    );
  }

  const size = 132;
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const fill = circumference * (health.score / 100);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-700">Financial Health Score</h3>

      <div className="flex items-center gap-4">
        <div className="relative shrink-0" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90">
            <circle cx={size / 2} cy={size / 2} r={radius} stroke="#e2e8f0" strokeWidth={stroke} fill="none" />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={health.color}
              strokeWidth={stroke}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${fill} ${circumference - fill}`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-slate-900">{health.score}</span>
            <span className="text-xs text-slate-400">/ 100</span>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-lg font-bold" style={{ color: health.color }}>
            {health.rating}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Based on your savings rate, debt load, healthy spending
            {monthlyBudget ? ", and budget" : ""}.
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {health.factors.map((f) => (
          <div key={f.key} className="flex items-center gap-2">
            <span className="w-32 shrink-0 text-xs text-slate-500">{f.label}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.round(f.score * 100)}%`, backgroundColor: barColor(f.score) }}
              />
            </div>
            <span className="w-8 shrink-0 text-right text-xs font-medium text-slate-600">
              {Math.round(f.score * 100)}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 border-t border-slate-100 pt-3">
        {explanation ? (
          <div className="flex items-start gap-2">
            <p className="flex-1 text-sm text-slate-700">{explanation}</p>
            {speech.supported && (
              <SpeakButton
                id="health-explanation"
                text={explanation}
                speakingId={speech.speakingId}
                onToggle={speech.toggle}
              />
            )}
          </div>
        ) : (
          <p className="text-xs text-slate-400">Get an AI explanation of your score and how to improve it.</p>
        )}
        <button
          onClick={handleExplain}
          disabled={loadingExpl || cooldown.cooling}
          className="mt-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {loadingExpl
            ? "Explaining…"
            : cooldown.cooling
              ? "Please wait…"
              : explanation
                ? "Refresh explanation"
                : "Explain with AI"}
        </button>
      </div>
    </div>
  );
}
