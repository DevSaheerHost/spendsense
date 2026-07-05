"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrency } from "@/lib/utils";

interface TrendChartProps {
  trend: { month: string; income: number; expense: number }[];
}

export function TrendChart({ trend }: TrendChartProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="mb-2 text-sm font-semibold text-slate-700">Income vs. Expense Trend</h3>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={trend} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e1e0d9" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#898781" }} />
          <YAxis tick={{ fontSize: 12, fill: "#898781" }} width={48} />
          <Tooltip formatter={(value) => formatCurrency(Number(value))} />
          <Legend />
          <Bar dataKey="income" name="Income" fill="#008300" radius={[4, 4, 0, 0]} />
          <Bar dataKey="expense" name="Expense" fill="#e34948" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
