"use client";

import { useMemo, useState } from "react";
import type { Transaction } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
// Six 4-hour buckets across the day; index = Math.floor(hour / 4).
const BUCKETS = ["12–4a", "4–8a", "8a–12p", "12–4p", "4–8p", "8p–12a"];

// Sequential blue ramp (from the design system): light = low spend, dark = high.
const LEVELS = ["#f1f5f9", "#cde2fb", "#9ec5f4", "#5598e7", "#2a78d6", "#184f95"];

interface Cell {
  amount: number;
  count: number;
}

interface HeatmapData {
  grid: Cell[][]; // [day][bucket]
  max: number;
  timedCount: number;
  untimedCount: number;
  hottest: { day: number; bucket: number; amount: number } | null;
}

function buildHeatmap(transactions: Transaction[]): HeatmapData {
  const grid: Cell[][] = DAYS.map(() => BUCKETS.map(() => ({ amount: 0, count: 0 })));
  let max = 0;
  let timedCount = 0;
  let untimedCount = 0;
  let hottest: HeatmapData["hottest"] = null;

  for (const t of transactions) {
    if (t.type !== "expense") continue;
    if (!t.time) {
      untimedCount += 1;
      continue;
    }
    const day = new Date(`${t.date}T00:00:00`).getDay();
    const hour = Number(t.time.slice(0, 2));
    if (Number.isNaN(day) || Number.isNaN(hour)) continue;
    const bucket = Math.min(Math.floor(hour / 4), 5);

    const cell = grid[day][bucket];
    cell.amount += t.amount;
    cell.count += 1;
    timedCount += 1;
    if (cell.amount > max) max = cell.amount;
    if (!hottest || cell.amount > hottest.amount) {
      hottest = { day, bucket, amount: cell.amount };
    }
  }

  return { grid, max, timedCount, untimedCount, hottest };
}

function levelFor(amount: number, max: number): string {
  if (amount <= 0 || max <= 0) return LEVELS[0];
  const ratio = amount / max;
  if (ratio <= 0.2) return LEVELS[1];
  if (ratio <= 0.4) return LEVELS[2];
  if (ratio <= 0.6) return LEVELS[3];
  if (ratio <= 0.8) return LEVELS[4];
  return LEVELS[5];
}

export function SpendingHeatmap({ transactions }: { transactions: Transaction[] }) {
  const data = useMemo(() => buildHeatmap(transactions), [transactions]);
  const [selected, setSelected] = useState<{ day: number; bucket: number } | null>(null);

  const caption = useMemo(() => {
    const pick = selected ?? (data.hottest ? { day: data.hottest.day, bucket: data.hottest.bucket } : null);
    if (!pick) return null;
    const cell = data.grid[pick.day][pick.bucket];
    const prefix = selected ? "" : "Most spending: ";
    return `${prefix}${DAYS[pick.day]} ${BUCKETS[pick.bucket]} — ${formatCurrency(cell.amount)}${
      cell.count > 0 ? ` (${cell.count} txn${cell.count > 1 ? "s" : ""})` : ""
    }`;
  }, [selected, data]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="mb-1 text-sm font-semibold text-slate-700">When You Spend</h3>
      <p className="mb-3 text-xs text-slate-500">Spending by day and time of day. Tap a cell for details.</p>

      {data.timedCount === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500">
          Add expenses with a time to see your spending patterns.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <div className="min-w-[320px]">
              <div className="mb-1 grid grid-cols-[36px_repeat(6,1fr)] gap-1">
                <span />
                {BUCKETS.map((b) => (
                  <span key={b} className="text-center text-[10px] leading-tight text-slate-400">
                    {b}
                  </span>
                ))}
              </div>
              {DAYS.map((dayLabel, day) => (
                <div key={dayLabel} className="mb-1 grid grid-cols-[36px_repeat(6,1fr)] items-center gap-1">
                  <span className="text-xs font-medium text-slate-500">{dayLabel}</span>
                  {BUCKETS.map((bucketLabel, bucket) => {
                    const cell = data.grid[day][bucket];
                    const isSelected = selected?.day === day && selected?.bucket === bucket;
                    return (
                      <button
                        key={bucketLabel}
                        type="button"
                        onClick={() =>
                          setSelected(isSelected ? null : { day, bucket })
                        }
                        title={`${dayLabel} ${bucketLabel}: ${formatCurrency(cell.amount)}`}
                        className={`h-7 rounded ${isSelected ? "ring-2 ring-indigo-500" : ""}`}
                        style={{ backgroundColor: levelFor(cell.amount, data.max) }}
                        aria-label={`${dayLabel} ${bucketLabel}, ${formatCurrency(cell.amount)}`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2">
            <p className="min-w-0 flex-1 truncate text-xs font-medium text-slate-600">{caption}</p>
            <div className="flex shrink-0 items-center gap-1">
              <span className="text-[10px] text-slate-400">less</span>
              {LEVELS.map((c) => (
                <span key={c} className="h-3 w-3 rounded-sm" style={{ backgroundColor: c }} />
              ))}
              <span className="text-[10px] text-slate-400">more</span>
            </div>
          </div>

          {data.untimedCount > 0 && (
            <p className="mt-2 text-[11px] text-slate-400">
              {data.untimedCount} older transaction{data.untimedCount > 1 ? "s" : ""} without a time
              {data.untimedCount > 1 ? " are" : " is"} not shown here.
            </p>
          )}
        </>
      )}
    </div>
  );
}
