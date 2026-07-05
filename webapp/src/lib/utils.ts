export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
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
