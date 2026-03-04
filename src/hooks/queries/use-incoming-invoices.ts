"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface FetchParams {
  page: number;
  pageSize: number;
  sortBy: string;
  sortDir: string;
  search?: string;
  locationId?: string;
  status?: string;
}

export function useIncomingInvoices(params: FetchParams) {
  return useQuery({
    queryKey: ["incoming-invoices", params],
    queryFn: async () => {
      const sp = new URLSearchParams();
      sp.set("page", String(params.page));
      sp.set("pageSize", String(params.pageSize));
      sp.set("sortBy", params.sortBy);
      sp.set("sortDir", params.sortDir);
      if (params.search) sp.set("search", params.search);
      if (params.locationId) sp.set("locationId", params.locationId);
      if (params.status) sp.set("status", params.status);
      const res = await fetch(`/api/incoming-invoices?${sp}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });
}

export function useDeleteIncomingInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/incoming-invoices/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["incoming-invoices"] }),
  });
}

export function useMarkIncomingPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/incoming-invoices/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PAID" }),
      });
      if (!res.ok) throw new Error("Failed to update");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["incoming-invoices"] }),
  });
}

export function useBulkMarkIncomingPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await fetch("/api/incoming-invoices", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, status: "PAID" }),
      });
      if (!res.ok) throw new Error("Failed to update");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["incoming-invoices"] }),
  });
}
