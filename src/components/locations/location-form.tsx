"use client";

import { useState, useEffect } from "react";
import { Button, Input, Modal } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { Loader2 } from "lucide-react";

interface LocationData {
  id?: string;
  name: string;
  code: string;
  address: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location: LocationData | null;
  onSuccess: () => void;
}

export function LocationFormModal({ open, onOpenChange, location, onSuccess }: Props) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const isEdit = !!location?.id;

  useEffect(() => {
    if (location) {
      setName(location.name || "");
      setCode(location.code || "");
      setAddress(location.address || "");
    } else {
      setName("");
      setCode("");
      setAddress("");
    }
    setErrors({});
  }, [location, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = "Numele este obligatoriu";
    if (!code.trim()) newErrors.code = "Codul este obligatoriu";
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      const url = isEdit ? `/api/locations/${location!.id}` : "/api/locations";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          code: code.trim().toUpperCase(),
          address: address.trim() || null,
        }),
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
        title: isEdit ? "Locatie actualizata" : "Locatie adaugata",
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
      title={isEdit ? "Editeaza locatie" : "Adauga locatie noua"}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="locationName"
          name="name"
          label="Nume locatie *"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setErrors((prev) => ({ ...prev, name: "" }));
          }}
          error={errors.name}
          autoFocus
        />
        <Input
          id="locationCode"
          name="code"
          label="Cod locatie *"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            setErrors((prev) => ({ ...prev, code: "" }));
          }}
          error={errors.code}
          placeholder="ex: MG, O"
        />
        <Input
          id="locationAddress"
          name="address"
          label="Adresa"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Adresa locatiei (optional)"
        />

        <div className="flex justify-end gap-3 border-t border-border pt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
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
