"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui";

export function ChartSkeleton({ title, height = "h-64" }: { title: string; height?: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`${height} animate-pulse rounded-lg bg-border-light`} />
      </CardContent>
    </Card>
  );
}

export function StatCardSkeleton() {
  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="h-4 w-24 animate-pulse rounded bg-border-light" />
        <div className="h-5 w-5 animate-pulse rounded bg-border-light" />
      </div>
      <div className="h-8 w-32 animate-pulse rounded bg-border-light" />
      <div className="h-3 w-20 animate-pulse rounded bg-border-light" />
    </Card>
  );
}
