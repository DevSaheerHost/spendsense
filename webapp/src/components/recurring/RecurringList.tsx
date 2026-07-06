"use client";

import type { RecurringTransaction } from "@/lib/types";
import { formatCurrency, daysUntilDate } from "@/lib/utils";
import { FlagDot } from "@/components/transactions/FlagBadge";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface RecurringListProps {
  items: RecurringTransaction[];
  onToggleActive: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
}

function scheduleLabel(item: RecurringTransaction): string {
  if (item.frequency === "weekly") {
    return `Every ${WEEKDAYS[item.dayOfWeek ?? 1]}`;
  }
  return `Monthly on day ${item.dayOfMonth ?? 1}`;
}

function dueLabel(dateKey: string): string {
  const days = daysUntilDate(dateKey);
  if (days <= 0) return "due today";
  if (days === 1) return "due tomorrow";
  return `in ${days} days`;
}

export function RecurringList({ items, onToggleActive, onDelete }: RecurringListProps) {
  if (items.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-500">No recurring items yet.</p>;
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.id} className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-start gap-3">
            <FlagDot flag={item.flag} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">{item.description}</p>
              <p className="text-xs text-slate-500">
                {item.category} &middot; {scheduleLabel(item)}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Next: {item.nextRunDate} ({dueLabel(item.nextRunDate)})
                {!item.active && " · paused"}
              </p>
            </div>
            <span
              className={`text-sm font-semibold ${item.type === "income" ? "text-emerald-600" : "text-slate-900"}`}
            >
              {item.type === "income" ? "+" : "-"}
              {formatCurrency(item.amount)}
            </span>
          </div>

          <div className="mt-3 flex items-center justify-end gap-3">
            <button
              onClick={() => onToggleActive(item.id, !item.active)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              {item.active ? "Pause" : "Resume"}
            </button>
            <button
              onClick={() => onDelete(item.id)}
              className="text-xs font-medium text-slate-400 hover:text-red-600"
            >
              Delete
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
