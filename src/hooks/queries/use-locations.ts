"use client";
import { useQuery } from "@tanstack/react-query";

export interface LocationItem {
  id: string;
  code: string;
  name: string;
}

export function useLocations() {
  return useQuery<LocationItem[]>({
    queryKey: ["locations"],
    queryFn: async () => {
      const res = await fetch("/api/locations");
      const data = await res.json();
      return Array.isArray(data) ? data : (data.data ?? []);
    },
  });
}
