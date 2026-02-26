"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  Button,
  Modal,
} from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import {
  MapPin,
  Pencil,
  Trash2,
  TrendingUp,
  TrendingDown,
  DollarSign,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { LocationFormModal } from "@/components/locations/location-form";

interface LocationWithStats {
  id: string;
  code: string;
  name: string;
  address: string | null;
  stats: {
    revenue: number;
    expenses: number;
    net: number;
  };
}

export default function LocationsPage() {
  const [locations, setLocations] = useState<LocationWithStats[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [formOpen, setFormOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<LocationWithStats | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LocationWithStats | null>(null);

  const { toast } = useToast();

  // ── Fetch locations with stats ────────────────────────────
  const fetchLocations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/locations");
      const data = await res.json();
      const locs: { id: string; code: string; name: string }[] = Array.isArray(data) ? data : data.data || [];

      // Fetch stats for each location
      const withStats = await Promise.all(
        locs.map(async (loc) => {
          try {
            const statsRes = await fetch(`/api/locations/${loc.id}`);
            const statsData = await statsRes.json();
            return statsData as LocationWithStats;
          } catch {
            return {
              ...loc,
              address: null,
              stats: { revenue: 0, expenses: 0, net: 0 },
            } as LocationWithStats;
          }
        })
      );

      setLocations(withStats);
    } catch {
      toast({ title: "Eroare la incarcarea locatiilor", variant: "danger" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  // ── Delete ──────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/locations/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "Locatie stearsa", variant: "success" });
        fetchLocations();
      } else {
        toast({ title: data.error || "Eroare la stergere", variant: "danger" });
      }
    } catch {
      toast({ title: "Eroare la stergere", variant: "danger" });
    }
    setDeleteTarget(null);
  };

  const handleFormSuccess = () => {
    setFormOpen(false);
    setEditingLocation(null);
    fetchLocations();
  };

  const currentMonth = new Date().toLocaleString("ro-RO", { month: "long", year: "numeric" });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[#2D1B0E]">Locatii</h2>
          <p className="mt-0.5 text-xs text-[#9B8B7F]">
            Locatiile cafenelelor Moro
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            setEditingLocation(null);
            setFormOpen(true);
          }}
        >
          <MapPin className="h-4 w-4" />
          Adauga locatie
        </Button>
      </div>

      {/* Location Cards */}
      {loading ? (
        <div className="grid gap-6 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}>
              <CardContent>
                <div className="space-y-4">
                  <div className="h-6 w-1/2 animate-pulse rounded bg-border-light" />
                  <div className="h-4 w-3/4 animate-pulse rounded bg-border-light" />
                  <div className="grid grid-cols-3 gap-4">
                    {Array.from({ length: 3 }).map((_, j) => (
                      <div key={j} className="h-16 animate-pulse rounded bg-border-light" />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : locations.length === 0 ? (
        <Card>
          <CardContent>
            <div className="flex h-64 flex-col items-center justify-center gap-3 text-text-muted">
              <MapPin className="h-12 w-12 text-border" />
              <p>Nu exista locatii</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {locations.map((loc) => (
            <Card key={loc.id}>
              <CardContent>
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <MapPin className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-text">{loc.name}</h3>
                        <span className="text-xs font-medium text-primary">{loc.code}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingLocation(loc);
                          setFormOpen(true);
                        }}
                        className="rounded p-1.5 text-text-muted hover:bg-surface-hover hover:text-primary"
                        title="Editeaza"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(loc)}
                        className="rounded p-1.5 text-text-muted hover:bg-danger-light hover:text-danger"
                        title="Sterge"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Address */}
                  {loc.address && (
                    <p className="text-sm text-text-muted">{loc.address}</p>
                  )}

                  {/* Stats */}
                  <div className="border-t border-border pt-4">
                    <p className="mb-3 text-xs font-medium uppercase tracking-wider text-text-muted">
                      {currentMonth}
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-lg bg-success/5 p-3">
                        <div className="flex items-center gap-1 text-xs text-success">
                          <TrendingUp className="h-3 w-3" />
                          Venituri
                        </div>
                        <p className="mt-1 text-sm font-semibold text-text">
                          {formatCurrency(loc.stats.revenue)}
                        </p>
                      </div>
                      <div className="rounded-lg bg-danger/5 p-3">
                        <div className="flex items-center gap-1 text-xs text-danger">
                          <TrendingDown className="h-3 w-3" />
                          Cheltuieli
                        </div>
                        <p className="mt-1 text-sm font-semibold text-text">
                          {formatCurrency(loc.stats.expenses)}
                        </p>
                      </div>
                      <div className="rounded-lg bg-primary/5 p-3">
                        <div className="flex items-center gap-1 text-xs text-primary">
                          <DollarSign className="h-3 w-3" />
                          Net
                        </div>
                        <p className={`mt-1 text-sm font-semibold ${loc.stats.net >= 0 ? "text-success" : "text-danger"}`}>
                          {formatCurrency(loc.stats.net)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Form Modal */}
      <LocationFormModal
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingLocation(null);
        }}
        location={editingLocation}
        onSuccess={handleFormSuccess}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        title="Sterge locatie"
        description={`Esti sigur ca vrei sa stergi locatia "${deleteTarget?.name}"?`}
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-warning bg-warning/10 p-3">
            <p className="text-sm text-warning">
              Atentie: Stergerea unei locatii poate afecta datele asociate.
            </p>
          </div>
          <p className="text-sm text-text-secondary">
            Aceasta actiune nu poate fi anulata.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Anuleaza
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Sterge
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
