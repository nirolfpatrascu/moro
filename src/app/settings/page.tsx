"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardHeader, CardTitle, CardContent, Button, Input } from "@/components/ui";
import { Trash2, Plus, Mail, Shield } from "lucide-react";

interface AllowedEmail {
  id: string;
  email: string;
  addedBy: string | null;
  createdAt: string;
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const [emails, setEmails] = useState<AllowedEmail[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/allowed-emails")
      .then((r) => r.json())
      .then((data) => setEmails(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const addEmail = async () => {
    if (!newEmail.trim()) return;
    setError("");
    try {
      const res = await fetch("/api/allowed-emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Eroare");
        return;
      }
      const created = await res.json();
      setEmails((prev) => [created, ...prev]);
      setNewEmail("");
    } catch {
      setError("Eroare de retea");
    }
  };

  const removeEmail = async (id: string) => {
    try {
      await fetch(`/api/allowed-emails?id=${id}`, { method: "DELETE" });
      setEmails((prev) => prev.filter((e) => e.id !== id));
    } catch {}
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-[#2D1B0E]">Setari</h2>
        <p className="mt-1 text-sm text-[#9B8B7F]">Gestioneaza accesul la aplicatie</p>
      </div>

      {/* Current user */}
      <Card>
        <CardHeader>
          <CardTitle>Contul tau</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            {session?.user?.image ? (
              <img
                src={session.user.image}
                alt=""
                className="h-10 w-10 rounded-full"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#6F4E37] text-sm font-medium text-white">
                {(session?.user?.name || "?")[0].toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-[#2D1B0E]">{session?.user?.name}</p>
              <p className="text-xs text-[#9B8B7F]">{session?.user?.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Allowed Emails */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-[#6F4E37]" />
            <CardTitle>Emailuri aprobate</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-[#9B8B7F]">
            Doar utilizatorii cu emailuri in aceasta lista pot accesa aplicatia.
          </p>

          {/* Add form */}
          <div className="mb-4 flex gap-2">
            <div className="flex-1">
              <Input
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="email@exemplu.com"
                onKeyDown={(e) => e.key === "Enter" && addEmail()}
              />
            </div>
            <Button onClick={addEmail} size="sm">
              <Plus className="mr-1 h-4 w-4" />
              Adauga
            </Button>
          </div>

          {error && (
            <p className="mb-3 text-sm text-[#F44336]">{error}</p>
          )}

          {/* List */}
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 animate-pulse rounded-lg bg-[#F0E8DC]" />
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {emails.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-[#FFF3E6]"
                >
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-[#9B8B7F]" />
                    <span className="text-sm text-[#2D1B0E]">{e.email}</span>
                    {e.addedBy && (
                      <span className="text-xs text-[#9B8B7F]">
                        (adaugat de {e.addedBy})
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => removeEmail(e.id)}
                    className="rounded-lg p-1.5 text-[#9B8B7F] hover:bg-[#FFEBEE] hover:text-[#F44336]"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {emails.length === 0 && (
                <p className="py-4 text-center text-sm text-[#9B8B7F]">
                  Nu exista emailuri adaugate. Emailurile din variabila APPROVED_EMAILS sunt automat acceptate.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
