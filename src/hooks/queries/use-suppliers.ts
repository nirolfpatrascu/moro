"use client";
import { useQuery } from "@tanstack/react-query";

export interface SupplierItem {
  id: string;
  name: string;
}

export function useSuppliers() {
  return useQuery<SupplierItem[]>({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const res = await fetch("/api/suppliers");
      const data = await res.json();
      return Array.isArray(data) ? data : (data.data ?? []);
    },
  });
}
