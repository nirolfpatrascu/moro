"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ChartSkeleton } from "./skeleton";

interface DataPoint {
  supplier: string;
  amount: number;
  count: number;
}

export function TopSuppliers({
  data,
  loading,
}: {
  data: DataPoint[] | null;
  loading: boolean;
}) {
  if (loading || !data) return <ChartSkeleton title="Top Furnizori" />;

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Furnizori</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center text-text-muted text-sm">
            Nu exista date pentru perioada selectata
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="justify-center">
        <CardTitle>Top Furnizori</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
            >
              <XAxis
                type="number"
                tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
                tick={{ fontSize: 12 }}
              />
              <YAxis
                type="category"
                dataKey="supplier"
                width={120}
                tick={{ fontSize: 11 }}
              />
              <Tooltip
                formatter={((value: any) => [
                  `${value.toLocaleString("ro-RO")} RON`,
                  "Total",
                ]) as any}
              />
              <Bar dataKey="amount" fill="#6F4E37" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
