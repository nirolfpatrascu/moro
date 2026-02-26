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
  location: string;
  locationName: string;
  revenue: number;
  expenses: number;
}

export function RevenueByLocation({
  data,
  loading,
}: {
  data: DataPoint[] | null;
  loading: boolean;
}) {
  if (loading || !data) return <ChartSkeleton title="Venituri per Locatie" />;

  return (
    <Card>
      <CardHeader className="justify-center">
        <CardTitle>Venituri vs Cheltuieli per Locatie</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="location" tick={{ fontSize: 12 }} />
              <YAxis
                tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                formatter={((value: any, name: any) => [
                  `${value.toLocaleString("ro-RO")} RON`,
                  name === "revenue" ? "Venituri" : "Cheltuieli",
                ]) as any}
              />
              <Legend
                formatter={(value: string) =>
                  value === "revenue" ? "Venituri" : "Cheltuieli"
                }
              />
              <Bar dataKey="revenue" fill="#4CAF50" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" fill="#F44336" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
