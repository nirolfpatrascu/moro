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
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { ChartSkeleton } from "./skeleton";

const SHORT_MONTHS = ["IAN", "FEB", "MAR", "APR", "MAI", "IUN", "IUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const COGS_CATS = ["BAR", "BUCATARIE", "CONSUMABILE", "TRANSPORT", "LIVRARE", "DIVERSE"];
const COLORS = ["#6F4E37", "#D4A574", "#C4A882", "#FF9800", "#4CAF50", "#F44336"];

interface CogsChartsProps {
  categories: Record<string, number[]>;
  loading: boolean;
}

export function CogsCharts({ categories, loading }: CogsChartsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartSkeleton title="COGS pe Luni" height="h-72" />
        <ChartSkeleton title="COGS pe Categorie" height="h-72" />
      </div>
    );
  }

  // Stacked bar data
  const barData = SHORT_MONTHS.map((m, i) => {
    const point: Record<string, string | number> = { month: m };
    for (const cat of COGS_CATS) {
      point[cat] = categories[cat]?.[i] || 0;
    }
    return point;
  });

  // Pie data — annual totals per category
  const pieData = COGS_CATS.map((cat) => ({
    name: cat,
    value: (categories[cat] || []).reduce((a: number, b: number) => a + b, 0),
  })).filter((d) => d.value > 0);

  const formatValue = (v: number) =>
    v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(Math.round(v));

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>COGS pe Luni</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={formatValue} tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={((value: number, name: string) => [
                    `${value.toLocaleString("ro-RO")} RON`,
                    name,
                  ]) as any}
                />
                <Legend />
                {COGS_CATS.map((cat, i) => (
                  <Bar key={cat} dataKey={cat} stackId="a" fill={COLORS[i % COLORS.length]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>COGS pe Categorie</CardTitle>
        </CardHeader>
        <CardContent>
          {pieData.length === 0 ? (
            <div className="flex h-72 items-center justify-center text-text-muted text-sm">
              Nu exista date COGS
            </div>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    dataKey="value"
                    nameKey="name"
                    label={((props: { name: string; percent: number }) =>
                      `${props.name} ${(props.percent * 100).toFixed(0)}%`
                    ) as any}
                    labelLine={false}
                  >
                    {pieData.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={((value: number) => [
                      `${value.toLocaleString("ro-RO")} RON`,
                      "Total",
                    ]) as any}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
