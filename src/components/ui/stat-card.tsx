import { cn } from "@/lib/utils";
import { Card } from "./card";
import type { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: ReactNode;
  trend?: { value: number; label: string };
  className?: string;
}

export function StatCard({ title, value, subtitle, icon, trend, className }: StatCardProps) {
  return (
    <Card className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-text-muted">{title}</p>
        {icon && <div className="text-primary">{icon}</div>}
      </div>
      <p className="text-2xl font-bold text-text">{value}</p>
      <div className="flex items-center gap-2">
        {trend && (
          <span
            className={cn(
              "text-xs font-medium",
              trend.value >= 0 ? "text-success" : "text-danger"
            )}
          >
            {trend.value >= 0 ? "+" : ""}
            {trend.value}%
          </span>
        )}
        {subtitle && <span className="text-xs text-text-muted">{subtitle}</span>}
      </div>
    </Card>
  );
}
