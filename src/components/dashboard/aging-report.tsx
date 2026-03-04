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
} from "recharts";
import { ChartSkeleton } from "./skeleton";

interface DataPoint {
  bucket: string;
  payables: number;
  receivables: number;
}

export function AgingReport({ data, loading }: { data: DataPoint[] | null; loading: boolean }) {
  if (loading || !data) return <ChartSkeleton title="Aging Plati & Incasari" />;

  return (
    <Card>
      <CardHeader className="justify-center">
        <CardTitle>Aging — Plati & Incasari Restante</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
              <YAxis
                tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                formatter={
                  ((value: any, name: any) => [
                    `${value.toLocaleString("ro-RO")} RON`,
                    name === "payables" ? "De platit" : "De incasat",
                  ]) as any
                }
              />
              <Legend
                formatter={(value: string) => (value === "payables" ? "De platit" : "De incasat")}
              />
              <Bar dataKey="payables" fill="#F44336" radius={[4, 4, 0, 0]} />
              <Bar dataKey="receivables" fill="#FF9800" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
