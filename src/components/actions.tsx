"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Check, Pencil, X, Loader2 } from "lucide-react";

async function call(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Operacion fallida");
  }
  return res.json().catch(() => ({}));
}

export function InlineToggle({
  endpoint,
  id,
  value,
  disabled,
}: {
  endpoint: string;
  id: number | string;
  value: boolean;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function toggle() {
    setBusy(true);
    try {
      await call(`${endpoint}/${id}`, "PATCH", { active: !value });
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }
  return (
    <button
      onClick={toggle}
      disabled={disabled || busy}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${
        value ? "bg-emerald-500" : "bg-slate-300"
      }`}
      title={value ? "Activo" : "Inactivo"}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          value ? "translate-x-4" : "translate-x-1"
        }`}
      />
    </button>
  );
}

export function DeleteButton({
  endpoint,
  id,
  disabled,
  confirmText = "Eliminar este registro?",
}: {
  endpoint: string;
  id: number | string;
  disabled?: boolean;
  confirmText?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function del() {
    if (!confirm(confirmText)) return;
    setBusy(true);
    try {
      await call(`${endpoint}/${id}`, "DELETE");
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }
  return (
    <button
      onClick={del}
      disabled={disabled || busy}
      className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-avante-accent disabled:opacity-40"
      title="Eliminar"
    >
      {busy ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
    </button>
  );
}

export function EditableValue({
  endpoint,
  id,
  field,
  value,
  disabled,
}: {
  endpoint: string;
  id: number | string;
  field: string;
  value: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      await call(`${endpoint}/${id}`, "PATCH", { [field]: val });
      setEditing(false);
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  if (!editing) {
    return (
      <span className="inline-flex items-center gap-2">
        <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700">
          {value}
        </code>
        {!disabled && (
          <button
            onClick={() => {
              setVal(value);
              setEditing(true);
            }}
            className="text-slate-300 hover:text-avante-navy"
            title="Editar"
          >
            <Pencil size={13} />
          </button>
        )}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1">
      <input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        className="w-40 rounded border border-slate-300 px-2 py-1 text-xs"
        autoFocus
      />
      <button onClick={save} disabled={busy} className="rounded p-1 text-emerald-600 hover:bg-emerald-50">
        {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
      </button>
      <button onClick={() => setEditing(false)} className="rounded p-1 text-slate-400 hover:bg-slate-100">
        <X size={14} />
      </button>
    </span>
  );
}
