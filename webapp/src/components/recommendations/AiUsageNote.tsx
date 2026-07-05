"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useAiUsage } from "@/hooks/useAiUsage";
import type { AiUsageCounts } from "@/lib/firestore/aiUsage";

function UsageColumn({ label, counts }: { label: string; counts: AiUsageCounts }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <div className="mt-1 flex gap-4">
        <p className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-emerald-600">{counts.success}</span>
          <span className="text-xs text-slate-500">success</span>
        </p>
        <p className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-red-600">{counts.failed}</span>
          <span className="text-xs text-slate-500">failed</span>
        </p>
      </div>
    </div>
  );
}

export function AiUsageNote() {
  const { user } = useAuth();
  const usage = useAiUsage(user?.uid);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">AI Usage</h3>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
          Free tier
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-4">
        <UsageColumn label="Today" counts={usage.today} />
        <UsageColumn label="All-time" counts={usage.total} />
      </div>
      <p className="mt-3 text-xs text-slate-400">
        Each advice refresh, chat message, and auto-categorize is one AI request. Failed requests are
        usually the free-tier per-minute limit — wait a moment and try again.
      </p>
    </div>
  );
}
