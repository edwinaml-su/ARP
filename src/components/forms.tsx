"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";

async function post(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "No se pudo guardar");
  }
  return res.json();
}

function useAdd() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return { router, open, setOpen, busy, setBusy, err, setErr };
}

export function AddSchedule({ reportId }: { reportId: number }) {
  const s = useAdd();
  const [cron, setCron] = useState("");
  const [tz, setTz] = useState("America/El_Salvador");
  const [desc, setDesc] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    s.setBusy(true);
    s.setErr(null);
    try {
      await post("/api/schedules", {
        reportId,
        cronExpression: cron,
        timezone: tz,
        description: desc,
      });
      setCron("");
      setDesc("");
      s.setOpen(false);
      s.router.refresh();
    } catch (e) {
      s.setErr(e instanceof Error ? e.message : "Error");
    } finally {
      s.setBusy(false);
    }
  }

  if (!s.open)
    return (
      <button onClick={() => s.setOpen(true)} className="btn-ghost text-xs">
        <Plus size={14} /> Agregar horario
      </button>
    );

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-2 rounded-lg bg-slate-50 p-3">
      <div>
        <label className="label">Cron</label>
        <input className="input w-36 font-mono" value={cron} onChange={(e) => setCron(e.target.value)} placeholder="0 6 * * *" required />
      </div>
      <div>
        <label className="label">Zona horaria</label>
        <input className="input w-44" value={tz} onChange={(e) => setTz(e.target.value)} />
      </div>
      <div className="flex-1">
        <label className="label">Descripcion</label>
        <input className="input" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Diario 06:00" />
      </div>
      <button className="btn-primary" disabled={s.busy}>
        {s.busy && <Loader2 size={14} className="animate-spin" />} Guardar
      </button>
      <button type="button" className="btn-ghost" onClick={() => s.setOpen(false)}>Cancelar</button>
      {s.err && <p className="w-full text-xs text-avante-accent">{s.err}</p>}
    </form>
  );
}

export function AddRecipient({ reportId }: { reportId: number }) {
  const s = useAdd();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("");
  const [type, setType] = useState("TO");
  const [onlyProd, setOnlyProd] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    s.setBusy(true);
    s.setErr(null);
    try {
      await post("/api/recipients", {
        reportId,
        email,
        fullName,
        role,
        type,
        onlyInProd: onlyProd,
      });
      setEmail("");
      setFullName("");
      setRole("");
      s.setOpen(false);
      s.router.refresh();
    } catch (e) {
      s.setErr(e instanceof Error ? e.message : "Error");
    } finally {
      s.setBusy(false);
    }
  }

  if (!s.open)
    return (
      <button onClick={() => s.setOpen(true)} className="btn-ghost text-xs">
        <Plus size={14} /> Agregar destinatario
      </button>
    );

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-2 rounded-lg bg-slate-50 p-3">
      <div className="flex-1">
        <label className="label">Correo</label>
        <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div>
        <label className="label">Nombre</label>
        <input className="input w-40" value={fullName} onChange={(e) => setFullName(e.target.value)} />
      </div>
      <div>
        <label className="label">Area</label>
        <input className="input w-32" value={role} onChange={(e) => setRole(e.target.value)} />
      </div>
      <div>
        <label className="label">Tipo</label>
        <select className="input w-24" value={type} onChange={(e) => setType(e.target.value)}>
          <option>TO</option>
          <option>CC</option>
          <option>BCC</option>
        </select>
      </div>
      <label className="flex items-center gap-1.5 pb-2 text-xs text-slate-600">
        <input type="checkbox" checked={onlyProd} onChange={(e) => setOnlyProd(e.target.checked)} />
        Solo prod
      </label>
      <button className="btn-primary" disabled={s.busy}>
        {s.busy && <Loader2 size={14} className="animate-spin" />} Guardar
      </button>
      <button type="button" className="btn-ghost" onClick={() => s.setOpen(false)}>Cancelar</button>
      {s.err && <p className="w-full text-xs text-avante-accent">{s.err}</p>}
    </form>
  );
}

export function AddParameter({ reportId }: { reportId: number }) {
  const s = useAdd();
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [type, setType] = useState("string");
  const [desc, setDesc] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    s.setBusy(true);
    s.setErr(null);
    try {
      await post("/api/parameters", {
        reportId,
        paramKey: key,
        paramValue: value,
        paramType: type,
        description: desc,
      });
      setKey("");
      setValue("");
      setDesc("");
      s.setOpen(false);
      s.router.refresh();
    } catch (e) {
      s.setErr(e instanceof Error ? e.message : "Error");
    } finally {
      s.setBusy(false);
    }
  }

  if (!s.open)
    return (
      <button onClick={() => s.setOpen(true)} className="btn-ghost text-xs">
        <Plus size={14} /> Agregar parametro
      </button>
    );

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-2 rounded-lg bg-slate-50 p-3">
      <div>
        <label className="label">Clave</label>
        <input className="input w-40 font-mono" value={key} onChange={(e) => setKey(e.target.value)} required />
      </div>
      <div>
        <label className="label">Valor</label>
        <input className="input w-40" value={value} onChange={(e) => setValue(e.target.value)} />
      </div>
      <div>
        <label className="label">Tipo</label>
        <select className="input w-28" value={type} onChange={(e) => setType(e.target.value)}>
          {["string", "int", "float", "date", "datetime", "json", "bool"].map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </div>
      <div className="flex-1">
        <label className="label">Descripcion</label>
        <input className="input" value={desc} onChange={(e) => setDesc(e.target.value)} />
      </div>
      <button className="btn-primary" disabled={s.busy}>
        {s.busy && <Loader2 size={14} className="animate-spin" />} Guardar
      </button>
      <button type="button" className="btn-ghost" onClick={() => s.setOpen(false)}>Cancelar</button>
      {s.err && <p className="w-full text-xs text-avante-accent">{s.err}</p>}
    </form>
  );
}

export function RoleSelect({
  id,
  value,
  disabled,
}: {
  id: string;
  value: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function change(role: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Error");
      }
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }
  return (
    <select
      value={value}
      disabled={disabled || busy}
      onChange={(e) => change(e.target.value)}
      className="input w-36 disabled:opacity-60"
    >
      <option value="admin">Administrador</option>
      <option value="editor">Editor</option>
      <option value="viewer">Lector</option>
    </select>
  );
}
