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
    <Card className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-[#9B8B7F]">{title}</p>
        {icon && <div className="text-[#6F4E37]">{icon}</div>}
      </div>
      <p className="text-xl font-bold text-[#2D1B0E]">{value}</p>
      <div className="flex items-center gap-2">
        {trend && (
          <span
            className={cn(
              "text-xs font-medium",
              trend.value >= 0 ? "text-[#4CAF50]" : "text-[#F44336]"
            )}
          >
            {trend.value >= 0 ? "+" : ""}
            {trend.value}%
          </span>
        )}
        {subtitle && <span className="text-xs text-[#9B8B7F]">{subtitle}</span>}
      </div>
    </Card>
  );
}
