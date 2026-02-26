"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Line,
  ComposedChart,
} from "recharts";
import { ChartSkeleton } from "./skeleton";

const SHORT_MONTHS = ["IAN", "FEB", "MAR", "APR", "MAI", "IUN", "IUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

interface PnlChartProps {
  income: number[];
  totalExpenses: number[];
  netProfit: number[];
  loading: boolean;
}

export function PnlChart({ income, totalExpenses, netProfit, loading }: PnlChartProps) {
  if (loading) return <ChartSkeleton title="Venituri vs Cheltuieli" height="h-72" />;

  const data = SHORT_MONTHS.map((m, i) => ({
    month: m,
    venituri: income[i] || 0,
    cheltuieli: totalExpenses[i] || 0,
    profit: netProfit[i] || 0,
  }));

  const formatValue = (v: number) =>
    v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(Math.round(v));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Venituri vs Cheltuieli</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={formatValue} tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={((value: number, name: string) => [
                  `${value.toLocaleString("ro-RO")} RON`,
                  name === "venituri" ? "Venituri" : name === "cheltuieli" ? "Cheltuieli" : "Profit Net",
                ]) as any}
              />
              <Legend
                formatter={(value: string) =>
                  value === "venituri" ? "Venituri" : value === "cheltuieli" ? "Cheltuieli" : "Profit Net"
                }
              />
              <Bar dataKey="venituri" fill="#4CAF50" radius={[4, 4, 0, 0]} />
              <Bar dataKey="cheltuieli" fill="#F44336" radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="profit" stroke="#6F4E37" strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
