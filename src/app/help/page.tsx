"use client";

import { useState, useEffect } from "react";

export default function HelpPage() {
  const [content, setContent] = useState<string>("");

  useEffect(() => {
    fetch("/api/help")
      .then((r) => r.json())
      .then((data) => setContent(data.content || ""))
      .catch(() => setContent("Nu s-a putut incarca ghidul de utilizare."));
  }, []);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold text-[#2D1B0E]">Ajutor</h1>
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="prose max-w-none whitespace-pre-wrap text-sm text-gray-700">{content}</div>
      </div>
    </div>
  );
}
