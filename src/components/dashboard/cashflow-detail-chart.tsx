"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import {
  AreaChart,
  Area,
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

const SHORT_MONTHS = [
  "IAN",
  "FEB",
  "MAR",
  "APR",
  "MAI",
  "IUN",
  "IUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];

interface CashFlowDetailChartProps {
  inflows: number[];
  outflows: number[];
  netCashFlow: number[];
  loading: boolean;
}

export function CashFlowDetailChart({
  inflows,
  outflows,
  netCashFlow,
  loading,
}: CashFlowDetailChartProps) {
  if (loading) return <ChartSkeleton title="Cash Flow Detaliat" height="h-72" />;

  const data = SHORT_MONTHS.map((m, i) => ({
    month: m,
    intrari: inflows[i] || 0,
    iesiri: outflows[i] || 0,
    net: netCashFlow[i] || 0,
  }));

  const formatValue = (v: number) =>
    v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(Math.round(v));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cash Flow Detaliat</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="cfInGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4CAF50" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#4CAF50" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="cfOutGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F44336" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#F44336" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={formatValue} tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={
                  ((value: number, name: string) => [
                    `${value.toLocaleString("ro-RO")} RON`,
                    name === "intrari" ? "Intrari" : name === "iesiri" ? "Iesiri" : "Flux Net",
                  ]) as any
                }
              />
              <Legend
                formatter={(value: string) =>
                  value === "intrari" ? "Intrari" : value === "iesiri" ? "Iesiri" : "Flux Net"
                }
              />
              <Area
                type="monotone"
                dataKey="intrari"
                stroke="#4CAF50"
                strokeWidth={2}
                fill="url(#cfInGrad)"
              />
              <Area
                type="monotone"
                dataKey="iesiri"
                stroke="#F44336"
                strokeWidth={2}
                fill="url(#cfOutGrad)"
              />
              <Line type="monotone" dataKey="net" stroke="#6F4E37" strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
