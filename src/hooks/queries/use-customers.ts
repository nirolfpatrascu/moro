"use client";
import { useQuery } from "@tanstack/react-query";

export interface CustomerItem {
  id: string;
  name: string;
}

export function useCustomers() {
  return useQuery<CustomerItem[]>({
    queryKey: ["customers"],
    queryFn: async () => {
      const res = await fetch("/api/customers");
      const data = await res.json();
      return Array.isArray(data) ? data : (data.data ?? []);
    },
  });
}
