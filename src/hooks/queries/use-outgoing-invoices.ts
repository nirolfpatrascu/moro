"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface FetchParams {
  page: number;
  pageSize: number;
  sortBy: string;
  sortDir: string;
  search?: string;
  customerId?: string;
  status?: string;
  year?: string;
}

export function useOutgoingInvoices(params: FetchParams) {
  return useQuery({
    queryKey: ["outgoing-invoices", params],
    queryFn: async () => {
      const sp = new URLSearchParams();
      sp.set("page", String(params.page));
      sp.set("pageSize", String(params.pageSize));
      sp.set("sortBy", params.sortBy);
      sp.set("sortDir", params.sortDir);
      if (params.search) sp.set("search", params.search);
      if (params.customerId) sp.set("customerId", params.customerId);
      if (params.status) sp.set("status", params.status);
      if (params.year) sp.set("year", params.year);
      const res = await fetch(`/api/outgoing-invoices?${sp}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });
}

export function useDeleteOutgoingInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/outgoing-invoices/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["outgoing-invoices"] }),
  });
}

export function useMarkOutgoingPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/outgoing-invoices/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PAID" }),
      });
      if (!res.ok) throw new Error("Failed to update");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["outgoing-invoices"] }),
  });
}

export function useBulkMarkOutgoingPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await fetch("/api/outgoing-invoices", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, status: "PAID" }),
      });
      if (!res.ok) throw new Error("Failed to update");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["outgoing-invoices"] }),
  });
}
