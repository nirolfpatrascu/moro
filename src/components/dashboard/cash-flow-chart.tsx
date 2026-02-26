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
} from "recharts";
import { ChartSkeleton } from "./skeleton";

interface DataPoint {
  month: string;
  inflow: number;
  outflow: number;
}

export function CashFlowChart({
  data,
  loading,
}: {
  data: DataPoint[] | null;
  loading: boolean;
}) {
  if (loading || !data) return <ChartSkeleton title="Cash Flow (12 luni)" />;

  const formatValue = (v: number) =>
    v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v);

  return (
    <Card>
      <CardHeader className="justify-center">
        <CardTitle>Cash Flow (12 luni)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="inflowGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4CAF50" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#4CAF50" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="outflowGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F44336" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#F44336" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={formatValue} tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={((value: any, name: any) => [
                  `${value.toLocaleString("ro-RO")} RON`,
                  name === "inflow" ? "Incasari" : "Cheltuieli",
                ]) as any}
              />
              <Legend
                formatter={(value: string) =>
                  value === "inflow" ? "Incasari" : "Cheltuieli"
                }
              />
              <Area
                type="monotone"
                dataKey="inflow"
                stroke="#4CAF50"
                strokeWidth={2}
                fill="url(#inflowGrad)"
              />
              <Area
                type="monotone"
                dataKey="outflow"
                stroke="#F44336"
                strokeWidth={2}
                fill="url(#outflowGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
