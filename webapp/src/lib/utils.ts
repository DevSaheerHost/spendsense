export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

export function currentMonthKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function isSameMonth(isoDate: string, reference = new Date()): boolean {
  return isoDate.startsWith(currentMonthKey(reference));
}

export function daysUntil(dueDayOfMonth: number, reference = new Date()): number {
  const year = reference.getFullYear();
  const month = reference.getMonth();
  let due = new Date(year, month, dueDayOfMonth);
  if (due < reference) {
    due = new Date(year, month + 1, dueDayOfMonth);
  }
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.ceil((due.getTime() - reference.getTime()) / msPerDay);
}

export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

export function daysUntilDate(dateKey: string, reference = new Date()): number {
  const target = new Date(`${dateKey}T00:00:00`);
  const start = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
  return Math.round((target.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

// First date (yyyy-MM-dd) matching the recurrence rule on or after `from`.
export function firstOccurrenceOnOrAfter(
  frequency: "monthly" | "weekly",
  dayOfMonth: number | undefined,
  dayOfWeek: number | undefined,
  from: Date
): string {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());

  if (frequency === "weekly") {
    const target = ((dayOfWeek ?? 1) % 7 + 7) % 7;
    const diff = (target - start.getDay() + 7) % 7;
    const d = new Date(start);
    d.setDate(start.getDate() + diff);
    return toDateKey(d);
  }

  const dom = Math.min(Math.max(dayOfMonth ?? 1, 1), 28);
  let d = new Date(start.getFullYear(), start.getMonth(), dom);
  if (d < start) d = new Date(start.getFullYear(), start.getMonth() + 1, dom);
  return toDateKey(d);
}
