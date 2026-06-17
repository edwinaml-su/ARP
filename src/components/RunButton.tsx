"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Play, Loader2 } from "lucide-react";

export function RunButton({
  reportId,
  disabled,
  size = "md",
}: {
  reportId: number;
  disabled?: boolean;
  size?: "sm" | "md";
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/reports/${reportId}/run`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al ejecutar");
      setMsg("Ejecucion registrada");
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
      setTimeout(() => setMsg(null), 3500);
    }
  }

  return (
    <div className="inline-flex items-center gap-2">
      <button
        onClick={run}
        disabled={disabled || loading}
        className={size === "sm" ? "btn-accent !px-2.5 !py-1.5 text-xs" : "btn-accent"}
        title={disabled ? "Requiere rol Editor o Admin" : "Ejecutar ahora"}
      >
        {loading ? (
          <Loader2 size={size === "sm" ? 14 : 16} className="animate-spin" />
        ) : (
          <Play size={size === "sm" ? 14 : 16} />
        )}
        Ejecutar
      </button>
      {msg && <span className="text-xs text-slate-500">{msg}</span>}
    </div>
  );
}
