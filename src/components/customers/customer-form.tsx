"use client";

import { useState, useEffect } from "react";
import { Button, Input, Modal } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { Loader2 } from "lucide-react";

interface CustomerData {
  id?: string;
  name: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: CustomerData | null;
  onSuccess: () => void;
}

export function CustomerFormModal({ open, onOpenChange, customer, onSuccess }: Props) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();

  const isEdit = !!customer?.id;

  useEffect(() => {
    if (customer) {
      setName(customer.name || "");
    } else {
      setName("");
    }
    setError("");
  }, [customer, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Numele este obligatoriu");
      return;
    }

    setLoading(true);
    try {
      const url = isEdit ? `/api/customers/${customer!.id}` : "/api/customers";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast({
          title: "Eroare",
          description: data.error || "Eroare la salvare",
          variant: "danger",
        });
        return;
      }

      toast({
        title: isEdit ? "Client actualizat" : "Client adaugat",
        variant: "success",
      });
      onSuccess();
    } catch {
      toast({ title: "Eroare la salvare", variant: "danger" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Editeaza client" : "Adauga client nou"}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="customerName"
          name="name"
          label="Nume client *"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError("");
          }}
          error={error}
          autoFocus
        />

        <div className="flex justify-end gap-3 border-t border-border pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Anuleaza
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isEdit ? (
              "Salveaza"
            ) : (
              "Adauga"
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
