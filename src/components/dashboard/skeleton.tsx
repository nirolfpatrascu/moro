"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui";

export function ChartSkeleton({ title, height = "h-64" }: { title: string; height?: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`${height} animate-pulse rounded-lg bg-gray-100`} />
      </CardContent>
    </Card>
  );
}

export function StatCardSkeleton() {
  return (
    <Card className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <div className="h-3 w-20 animate-pulse rounded bg-gray-100" />
        <div className="h-4 w-4 animate-pulse rounded bg-gray-100" />
      </div>
      <div className="h-6 w-28 animate-pulse rounded bg-gray-100" />
      <div className="h-3 w-16 animate-pulse rounded bg-gray-100" />
    </Card>
  );
}
