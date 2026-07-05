"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useAiUsage } from "@/hooks/useAiUsage";

export function AiUsageNote() {
  const { user } = useAuth();
  const usage = useAiUsage(user?.uid);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">AI Usage</h3>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
          Gemini free tier
        </span>
      </div>
      <div className="mt-2 flex gap-6">
        <div>
          <p className="text-2xl font-bold text-slate-900">{usage.today}</p>
          <p className="text-xs text-slate-500">requests today</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-900">{usage.total}</p>
          <p className="text-xs text-slate-500">all-time</p>
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-400">
        Each advice refresh, chat message, and auto-categorize uses one AI request. The free tier
        limits requests per minute — if you hit a limit, wait a moment and try again.
      </p>
    </div>
  );
}
