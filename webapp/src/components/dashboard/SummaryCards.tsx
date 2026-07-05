import { formatCurrency } from "@/lib/utils";

interface SummaryCardsProps {
  income: number;
  expense: number;
  balance: number;
}

export function SummaryCards({ income, expense, balance }: SummaryCardsProps) {
  const cards = [
    { label: "Monthly Income", value: income, className: "text-emerald-600" },
    { label: "Monthly Expense", value: expense, className: "text-red-600" },
    {
      label: "Balance",
      value: balance,
      className: balance >= 0 ? "text-slate-900" : "text-red-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {cards.map((card) => (
        <div key={card.label} className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{card.label}</p>
          <p className={`mt-1 text-2xl font-bold ${card.className}`}>{formatCurrency(card.value)}</p>
        </div>
      ))}
    </div>
  );
}
