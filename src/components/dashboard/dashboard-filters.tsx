"use client";

import { useState, useEffect } from "react";

interface DashboardFiltersProps {
  year: number;
  onYearChange: (year: number) => void;
  locationId: string;
  onLocationChange: (id: string) => void;
}

export function DashboardFilters({
  year,
  onYearChange,
  locationId,
  onLocationChange,
}: DashboardFiltersProps) {
  const [locations, setLocations] = useState<{ id: string; code: string; name: string }[]>([]);
  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear - 1, currentYear - 2];

  useEffect(() => {
    fetch("/api/locations")
      .then((r) => r.json())
      .then((data) => setLocations(Array.isArray(data) ? data : data.data || []))
      .catch(() => {});
  }, []);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={year}
        onChange={(e) => onYearChange(Number(e.target.value))}
        className="h-8 rounded-lg border border-gray-200 bg-white px-2 text-xs font-medium"
      >
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
      <select
        value={locationId}
        onChange={(e) => onLocationChange(e.target.value)}
        className="h-8 rounded-lg border border-gray-200 bg-white px-2 text-xs"
      >
        <option value="">Toate locatiile</option>
        {locations.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name}
          </option>
        ))}
      </select>
    </div>
  );
}
