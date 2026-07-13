"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, KeyRound, Check, X } from "lucide-react";

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

export function AddRecipients({
  reports,
}: {
  reports: { id: number; name: string; code: string }[];
}) {
  const s = useAdd();
  const [reportId, setReportId] = useState("");
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [onlyProd, setOnlyProd] = useState(false);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const parse = (v: string) =>
    Array.from(
      new Set(
        v
          .split(/[\s,;]+/)
          .map((x) => x.trim())
          .filter(Boolean)
      )
    );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setOkMsg(null);
    s.setErr(null);
    if (!reportId) {
      s.setErr("Selecciona un reporte");
      return;
    }
    const items = [
      ...parse(to).map((email) => ({ email, type: "TO" })),
      ...parse(cc).map((email) => ({ email, type: "CC" })),
      ...parse(bcc).map((email) => ({ email, type: "BCC" })),
    ];
    if (!items.length) {
      s.setErr("Ingresa al menos un correo en TO, CC o BCC");
      return;
    }
    const invalid = items.find((i) => !i.email.includes("@"));
    if (invalid) {
      s.setErr(`Correo invalido: ${invalid.email}`);
      return;
    }
    s.setBusy(true);
    try {
      const res = await post("/api/recipients", {
        reportId: Number(reportId),
        onlyInProd: onlyProd,
        items,
      });
      setTo("");
      setCc("");
      setBcc("");
      setOnlyProd(false);
      const skipped = res.skipped
        ? `, ${res.skipped} omitido(s) por duplicado`
        : "";
      setOkMsg(`${res.created} destinatario(s) agregado(s)${skipped}.`);
      s.router.refresh();
    } catch (e) {
      s.setErr(e instanceof Error ? e.message : "Error");
    } finally {
      s.setBusy(false);
    }
  }

  if (!s.open)
    return (
      <div className="card px-5 py-4">
        <button onClick={() => s.setOpen(true)} className="btn-primary text-sm">
          <Plus size={16} /> Agregar destinatarios
        </button>
      </div>
    );

  return (
    <form onSubmit={submit} className="card space-y-4 p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-900">Agregar destinatarios</h2>
        <button
          type="button"
          className="btn-ghost text-xs"
          onClick={() => s.setOpen(false)}
        >
          Cerrar
        </button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="label">Reporte</label>
          <select
            className="input"
            value={reportId}
            onChange={(e) => setReportId(e.target.value)}
            required
          >
            <option value="">— Selecciona un reporte —</option>
            {reports.map((r) => (
              <option key={r.id} value={r.id}>
                {r.code} — {r.name}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-end gap-2 pb-2 text-xs text-slate-600">
          <input
            type="checkbox"
            checked={onlyProd}
            onChange={(e) => setOnlyProd(e.target.checked)}
          />
          Enviar solo en produccion
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label className="label">TO (para)</label>
          <textarea
            className="input h-24 resize-y font-mono text-xs"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="uno@complejoavante.com, dos@complejoavante.com"
          />
        </div>
        <div>
          <label className="label">CC (copia)</label>
          <textarea
            className="input h-24 resize-y font-mono text-xs"
            value={cc}
            onChange={(e) => setCc(e.target.value)}
            placeholder="opcional"
          />
        </div>
        <div>
          <label className="label">BCC (copia oculta)</label>
          <textarea
            className="input h-24 resize-y font-mono text-xs"
            value={bcc}
            onChange={(e) => setBcc(e.target.value)}
            placeholder="opcional"
          />
        </div>
      </div>
      <p className="text-xs text-slate-400">
        Puedes poner varios correos por campo, separados por coma, espacio o salto de linea.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-primary" disabled={s.busy}>
          {s.busy && <Loader2 size={14} className="animate-spin" />} Guardar destinatarios
        </button>
        {s.err && <p className="text-xs text-avante-accent">{s.err}</p>}
        {okMsg && <p className="text-xs text-emerald-600">{okMsg}</p>}
      </div>
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

export function AddUser() {
  const s = useAdd();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("viewer");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    s.setBusy(true);
    s.setErr(null);
    try {
      await post("/api/users", { email, fullName, password, role });
      setEmail("");
      setFullName("");
      setPassword("");
      setRole("viewer");
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
      <button onClick={() => s.setOpen(true)} className="btn-primary text-sm">
        <Plus size={16} /> Agregar usuario
      </button>
    );

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-2 rounded-lg bg-slate-50 p-3">
      <div className="flex-1">
        <label className="label">Correo</label>
        <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="usuario@complejoavante.com" required />
      </div>
      <div>
        <label className="label">Nombre</label>
        <input className="input w-44" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nombre completo" />
      </div>
      <div>
        <label className="label">Contrasena</label>
        <input type="password" className="input w-40" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} placeholder="Minimo 6" required />
      </div>
      <div>
        <label className="label">Rol</label>
        <select className="input w-36" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="admin">Administrador</option>
          <option value="editor">Editor</option>
          <option value="viewer">Lector</option>
        </select>
      </div>
      <button className="btn-primary" disabled={s.busy}>
        {s.busy && <Loader2 size={14} className="animate-spin" />} Crear
      </button>
      <button type="button" className="btn-ghost" onClick={() => s.setOpen(false)}>Cancelar</button>
      {s.err && <p className="w-full text-xs text-avante-accent">{s.err}</p>}
    </form>
  );
}

export function SetPassword({ id, email }: { id: string; email: string }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Error");
      }
      setPassword("");
      setOpen(false);
      setDone(true);
      setTimeout(() => setDone(false), 3000);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  if (!open)
    return (
      <button onClick={() => setOpen(true)} className="btn-ghost text-xs" title={`Cambiar contrasena de ${email}`}>
        <KeyRound size={14} /> Contrasena
        {done && <Check size={14} className="text-emerald-600" />}
      </button>
    );

  return (
    <form onSubmit={submit} className="flex items-center gap-1.5">
      <input
        type="password"
        className="input w-40"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        minLength={6}
        placeholder="Nueva contrasena"
        autoFocus
        required
      />
      <button className="btn-primary px-2" disabled={busy} title="Guardar">
        {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
      </button>
      <button
        type="button"
        className="btn-ghost px-2"
        onClick={() => {
          setOpen(false);
          setPassword("");
          setErr(null);
        }}
        title="Cancelar"
      >
        <X size={14} />
      </button>
      {err && <p className="text-xs text-avante-accent">{err}</p>}
    </form>
  );
}
