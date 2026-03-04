"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { ChartSkeleton } from "./skeleton";

interface DataPoint {
  category: string;
  amount: number;
  count: number;
}

const COLORS = ["#6F4E37", "#D4A574", "#C4A882", "#FF9800", "#4CAF50", "#F44336", "#2196F3"];

export function ExpenseByCategory({
  data,
  loading,
}: {
  data: DataPoint[] | null;
  loading: boolean;
}) {
  if (loading || !data) return <ChartSkeleton title="Cheltuieli per Categorie" />;

  const hasData = data.length > 0 && data.some((d) => d.amount > 0);

  return (
    <Card>
      <CardHeader className="justify-center">
        <CardTitle>Cheltuieli per Categorie P&L</CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex h-64 items-center justify-center text-text-muted text-sm">
            Nu exista date pentru perioada selectata
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  dataKey="amount"
                  nameKey="category"
                  label={
                    ((props: any) => `${props.name} ${(props.percent * 100).toFixed(0)}%`) as any
                  }
                  labelLine={false}
                >
                  {data.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={
                    ((value: any) => [`${value.toLocaleString("ro-RO")} RON`, "Total"]) as any
                  }
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
