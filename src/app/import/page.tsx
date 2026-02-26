"use client";

import { useState, useCallback } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
  Modal,
} from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import {
  Upload,
  FileSpreadsheet,
  ArrowRight,
  ArrowLeft,
  Check,
  AlertTriangle,
  Loader2,
  X,
} from "lucide-react";
import {
  DB_FIELDS,
  autoMapColumns,
  type ColumnMapping,
} from "@/lib/validations/incoming-invoice";

// ── Types ────────────────────────────────────────────────
interface SheetInfo {
  name: string;
  headers: string[];
  rowCount: number;
}

interface ImportState {
  step: "upload" | "configure" | "preview" | "importing" | "done";
  fileName: string;
  fileData: string;
  sheets: SheetInfo[];
  selectedSheet: string;
  mapping: ColumnMapping;
  previewRows: Record<string, unknown>[];
  previewErrors: { row: number; message: string }[];
  importResult: {
    success: number;
    skipped: number;
    errors: number;
    totalProcessed: number;
    errorDetails: { row: number; message: string }[];
  } | null;
}

const initialState: ImportState = {
  step: "upload",
  fileName: "",
  fileData: "",
  sheets: [],
  selectedSheet: "",
  mapping: {},
  previewRows: [],
  previewErrors: [],
  importResult: null,
};

export default function ImportPage() {
  const [state, setState] = useState<ImportState>(initialState);
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [duplicateStrategy, setDuplicateStrategy] = useState<"skip" | "rename">("skip");
  const { toast } = useToast();

  // ── Step 1: File Upload ─────────────────────────────────
  const handleFileUpload = useCallback(
    async (file: File) => {
      setLoading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/import", { method: "POST", body: formData });
        const data = await res.json();

        if (!res.ok) {
          toast({ title: "Eroare", description: data.error, variant: "danger" });
          return;
        }

        const sheets: SheetInfo[] = data.sheets;
        const firstSheet = sheets[0];
        const autoMapping = firstSheet
          ? autoMapColumns(firstSheet.headers)
          : {};

        setState((s) => ({
          ...s,
          step: "configure",
          fileName: data.fileName,
          fileData: data.fileData,
          sheets,
          selectedSheet: firstSheet?.name ?? "",
          mapping: autoMapping,
        }));

        toast({
          title: "Fisier incarcat",
          description: `${sheets.length} sheet-uri gasite`,
          variant: "success",
        });
      } catch {
        toast({
          title: "Eroare",
          description: "Nu s-a putut incarca fisierul",
          variant: "danger",
        });
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFileUpload(file);
    },
    [handleFileUpload]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFileUpload(file);
    },
    [handleFileUpload]
  );

  // ── Step 2: Configure Mapping ───────────────────────────
  const handleSheetChange = (sheetName: string) => {
    const sheet = state.sheets.find((s) => s.name === sheetName);
    const autoMapping = sheet ? autoMapColumns(sheet.headers) : {};
    setState((s) => ({
      ...s,
      selectedSheet: sheetName,
      mapping: autoMapping,
    }));
  };

  const handleMappingChange = (dbField: string, excelCol: string) => {
    setState((s) => ({
      ...s,
      mapping: { ...s.mapping, [dbField]: excelCol || undefined },
    }));
  };

  // ── Step 3: Preview ─────────────────────────────────────
  const handlePreview = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/import/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileData: state.fileData,
          sheetName: state.selectedSheet,
          mapping: state.mapping,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast({ title: "Eroare", description: data.error, variant: "danger" });
        return;
      }

      setState((s) => ({
        ...s,
        step: "preview",
        previewRows: data.rows,
        previewErrors: data.errors,
      }));
    } catch {
      toast({
        title: "Eroare",
        description: "Nu s-a putut genera previzualizarea",
        variant: "danger",
      });
    } finally {
      setLoading(false);
    }
  };

  // ── Step 4: Import ──────────────────────────────────────
  const handleImport = async () => {
    setConfirmOpen(false);
    setState((s) => ({ ...s, step: "importing" }));
    setLoading(true);

    try {
      const res = await fetch("/api/import/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileData: state.fileData,
          sheetName: state.selectedSheet,
          mapping: state.mapping,
          duplicateStrategy,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast({ title: "Eroare", description: data.error, variant: "danger" });
        setState((s) => ({ ...s, step: "preview" }));
        return;
      }

      setState((s) => ({
        ...s,
        step: "done",
        importResult: data,
      }));

      toast({
        title: "Import finalizat",
        description: `${data.success} facturi importate`,
        variant: "success",
      });
    } catch {
      toast({
        title: "Eroare",
        description: "Importul a esuat",
        variant: "danger",
      });
      setState((s) => ({ ...s, step: "preview" }));
    } finally {
      setLoading(false);
    }
  };

  const reset = () => setState(initialState);

  // ── Current sheet info ──────────────────────────────────
  const currentSheet = state.sheets.find(
    (s) => s.name === state.selectedSheet
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#2D1B0E]">Import Excel</h2>
          <p className="mt-0.5 text-xs text-[#9B8B7F]">
            Importa facturi din fisiere Excel (.xlsx)
          </p>
        </div>
        {state.step !== "upload" && (
          <Button variant="outline" onClick={reset}>
            <X className="h-4 w-4" />
            Reset
          </Button>
        )}
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2">
        {[
          { key: "upload", label: "1. Incarcare" },
          { key: "configure", label: "2. Configurare" },
          { key: "preview", label: "3. Previzualizare" },
          { key: "done", label: "4. Rezultat" },
        ].map((s, i) => {
          const steps = ["upload", "configure", "preview", "done"];
          const currentIdx = steps.indexOf(
            state.step === "importing" ? "done" : state.step
          );
          const stepIdx = i;
          const isActive = stepIdx === currentIdx;
          const isDone = stepIdx < currentIdx;

          return (
            <div key={s.key} className="flex items-center gap-2">
              {i > 0 && (
                <div
                  className={`h-px w-8 ${isDone ? "bg-success" : "bg-border"}`}
                />
              )}
              <div
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : isDone
                      ? "bg-success-light text-success"
                      : "bg-surface text-text-muted"
                }`}
              >
                {isDone && <Check className="h-3 w-3" />}
                {s.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Step 1: Upload */}
      {state.step === "upload" && (
        <Card>
          <CardContent>
            <div
              className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border p-12 text-center transition-colors hover:border-primary/50 hover:bg-primary/5"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              {loading ? (
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              ) : (
                <>
                  <Upload className="mb-4 h-12 w-12 text-border" />
                  <p className="mb-2 text-lg font-medium text-text">
                    Trage fisierul aici
                  </p>
                  <p className="mb-4 text-sm text-text-muted">
                    sau click pentru a selecta un fisier .xlsx
                  </p>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      className="hidden"
                      onChange={handleFileInput}
                    />
                    <span className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark transition-colors">
                      <FileSpreadsheet className="h-4 w-4" />
                      Selecteaza fisier
                    </span>
                  </label>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Configure */}
      {state.step === "configure" && (
        <>
          {/* File info */}
          <Card>
            <CardHeader>
              <CardTitle>
                <FileSpreadsheet className="mr-2 inline h-5 w-5" />
                {state.fileName}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Sheet tabs */}
              <div className="mb-6 flex gap-2 border-b border-border">
                {state.sheets.map((sheet) => (
                  <button
                    key={sheet.name}
                    onClick={() => handleSheetChange(sheet.name)}
                    className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                      state.selectedSheet === sheet.name
                        ? "border-primary text-primary"
                        : "border-transparent text-text-muted hover:text-text"
                    }`}
                  >
                    {sheet.name}
                    <Badge variant="outline" className="ml-2">
                      {sheet.rowCount}
                    </Badge>
                  </button>
                ))}
              </div>

              {/* Column mapping */}
              {currentSheet && (
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-text">
                    Mapare coloane
                  </h4>
                  <p className="text-xs text-text-muted">
                    Asociaza coloanele din Excel cu campurile din baza de date.
                    Campurile marcate cu * sunt obligatorii.
                  </p>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {DB_FIELDS.map((field) => (
                      <div
                        key={field.key}
                        className="flex items-center gap-3 rounded-lg border border-border p-3"
                      >
                        <div className="min-w-[120px]">
                          <span className="text-sm font-medium text-text">
                            {field.label}
                            {field.required && (
                              <span className="ml-1 text-danger">*</span>
                            )}
                          </span>
                        </div>
                        <ArrowLeft className="h-4 w-4 shrink-0 text-text-muted" />
                        <select
                          value={
                            (state.mapping as Record<string, string>)[
                              field.key
                            ] ?? ""
                          }
                          onChange={(e) =>
                            handleMappingChange(field.key, e.target.value)
                          }
                          className="h-9 flex-1 rounded-lg border border-border bg-surface px-2 text-sm text-text"
                        >
                          <option value="">-- Selecteaza --</option>
                          {currentSheet.headers.map((h) => (
                            <option key={h} value={h}>
                              {h}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-3 pt-4">
                    <Button variant="outline" onClick={reset}>
                      <ArrowLeft className="h-4 w-4" />
                      Inapoi
                    </Button>
                    <Button
                      variant="primary"
                      onClick={handlePreview}
                      loading={loading}
                    >
                      Previzualizare
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Step 3: Preview */}
      {state.step === "preview" && (
        <>
          {state.previewErrors.length > 0 && (
            <Card className="border-warning/30 bg-warning-light">
              <CardContent>
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
                  <div>
                    <p className="text-sm font-medium text-text">
                      {state.previewErrors.length} avertismente
                    </p>
                    <ul className="mt-1 space-y-1">
                      {state.previewErrors.slice(0, 5).map((err, i) => (
                        <li key={i} className="text-xs text-text-secondary">
                          Rand {err.row}: {err.message}
                        </li>
                      ))}
                      {state.previewErrors.length > 5 && (
                        <li className="text-xs text-text-muted">
                          ...si inca {state.previewErrors.length - 5}
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>
                Previzualizare ({state.previewRows.length} randuri)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-background">
                      {DB_FIELDS.filter(
                        (f) =>
                          (state.mapping as Record<string, string>)[f.key]
                      ).map((f) => (
                        <th
                          key={f.key}
                          className="px-3 py-2 text-left font-medium text-text-secondary"
                        >
                          {f.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {state.previewRows.map((row, i) => (
                      <tr
                        key={i}
                        className="border-b border-border-light last:border-0"
                      >
                        {DB_FIELDS.filter(
                          (f) =>
                            (state.mapping as Record<string, string>)[f.key]
                        ).map((f) => (
                          <td key={f.key} className="px-3 py-2">
                            {row[f.key] != null ? String(row[f.key]) : (
                              <span className="text-text-muted">-</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Duplicate strategy */}
              <div className="mt-6 flex items-center gap-4 rounded-lg border border-border p-4">
                <span className="text-sm font-medium text-text">
                  Facturi duplicate:
                </span>
                <label className="flex items-center gap-2 text-sm text-text-secondary">
                  <input
                    type="radio"
                    name="dup"
                    checked={duplicateStrategy === "skip"}
                    onChange={() => setDuplicateStrategy("skip")}
                    className="accent-primary"
                  />
                  Sari peste
                </label>
                <label className="flex items-center gap-2 text-sm text-text-secondary">
                  <input
                    type="radio"
                    name="dup"
                    checked={duplicateStrategy === "rename"}
                    onChange={() => setDuplicateStrategy("rename")}
                    className="accent-primary"
                  />
                  Redenumeste
                </label>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() =>
                    setState((s) => ({ ...s, step: "configure" }))
                  }
                >
                  <ArrowLeft className="h-4 w-4" />
                  Inapoi
                </Button>
                <Button
                  variant="primary"
                  onClick={() => setConfirmOpen(true)}
                >
                  <Upload className="h-4 w-4" />
                  Importa {currentSheet?.rowCount ?? 0} randuri
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Confirmation modal */}
          <Modal
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
            title="Confirma importul"
            description={`Se vor importa ${currentSheet?.rowCount ?? 0} randuri din sheet-ul "${state.selectedSheet}".`}
          >
            <div className="space-y-4">
              <p className="text-sm text-text-secondary">
                Facturi duplicate vor fi{" "}
                {duplicateStrategy === "skip" ? "sarite" : "redenumite"}.
                Aceasta actiune nu poate fi anulata.
              </p>
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setConfirmOpen(false)}
                >
                  Anuleaza
                </Button>
                <Button variant="primary" onClick={handleImport}>
                  Confirma Import
                </Button>
              </div>
            </div>
          </Modal>
        </>
      )}

      {/* Step 4: Importing */}
      {state.step === "importing" && (
        <Card>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="mb-4 h-12 w-12 animate-spin text-primary" />
              <p className="text-lg font-medium text-text">
                Se importa datele...
              </p>
              <p className="mt-1 text-sm text-text-muted">
                Te rugam sa nu inchizi pagina
              </p>
              {/* Progress bar */}
              <div className="mt-6 h-2 w-64 overflow-hidden rounded-full bg-border">
                <div className="h-full animate-pulse rounded-full bg-primary" style={{ width: "60%" }} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Done */}
      {state.step === "done" && state.importResult && (
        <Card>
          <CardContent>
            <div className="space-y-6 py-4">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-success-light p-3">
                  <Check className="h-6 w-6 text-success" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-text">
                    Import finalizat
                  </h3>
                  <p className="text-sm text-text-muted">
                    {state.importResult.totalProcessed} randuri procesate
                  </p>
                </div>
              </div>

              {/* Summary stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg bg-success-light p-4 text-center">
                  <p className="text-2xl font-bold text-success">
                    {state.importResult.success}
                  </p>
                  <p className="text-xs text-success">Importate</p>
                </div>
                <div className="rounded-lg bg-warning-light p-4 text-center">
                  <p className="text-2xl font-bold text-warning">
                    {state.importResult.skipped}
                  </p>
                  <p className="text-xs text-warning">Sarite</p>
                </div>
                <div className="rounded-lg bg-danger-light p-4 text-center">
                  <p className="text-2xl font-bold text-danger">
                    {state.importResult.errors}
                  </p>
                  <p className="text-xs text-danger">Erori</p>
                </div>
              </div>

              {/* Error details */}
              {state.importResult.errorDetails.length > 0 && (
                <div className="rounded-lg border border-danger/30 bg-danger-light p-4">
                  <h4 className="mb-2 text-sm font-medium text-danger">
                    Detalii erori
                  </h4>
                  <ul className="max-h-40 space-y-1 overflow-y-auto">
                    {state.importResult.errorDetails.map((err, i) => (
                      <li key={i} className="text-xs text-text-secondary">
                        Rand {err.row}: {err.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="primary" onClick={reset}>
                  Import nou
                </Button>
                <Button
                  variant="outline"
                  onClick={() => (window.location.href = "/incoming")}
                >
                  Vezi facturi
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
