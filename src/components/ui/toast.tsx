"use client";

import * as ToastPrimitive from "@radix-ui/react-toast";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type ToastVariant = "default" | "success" | "warning" | "danger";

interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
}

interface ToastContextValue {
  toast: (item: Omit<ToastItem, "id">) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const variantStyles: Record<ToastVariant, string> = {
  default: "border-border bg-surface",
  success: "border-success/30 bg-success-light",
  warning: "border-warning/30 bg-warning-light",
  danger: "border-danger/30 bg-danger-light",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((item: Omit<ToastItem, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { ...item, id }]);
  }, []);

  function handleOpenChange(id: string, open: boolean) {
    if (!open) {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      <ToastPrimitive.Provider swipeDirection="right">
        {children}
        {toasts.map((t) => (
          <ToastPrimitive.Root
            key={t.id}
            open
            onOpenChange={(open) => handleOpenChange(t.id, open)}
            duration={4000}
            className={cn(
              "rounded-card border p-4 shadow-lg",
              "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-right-full",
              variantStyles[t.variant ?? "default"],
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <ToastPrimitive.Title className="text-sm font-semibold text-text">
                  {t.title}
                </ToastPrimitive.Title>
                {t.description && (
                  <ToastPrimitive.Description className="mt-1 text-xs text-text-secondary">
                    {t.description}
                  </ToastPrimitive.Description>
                )}
              </div>
              <ToastPrimitive.Close className="rounded p-1 text-text-muted hover:text-text">
                <X className="h-3.5 w-3.5" />
              </ToastPrimitive.Close>
            </div>
          </ToastPrimitive.Root>
        ))}
        <ToastPrimitive.Viewport className="fixed bottom-4 right-4 z-[100] flex w-80 flex-col gap-2" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}
