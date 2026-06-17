// Descripcion legible (aproximada) de expresiones cron de 5 campos.
const DOW = ["dom", "lun", "mar", "mie", "jue", "vie", "sab"];

export function describeCron(expr: string): string {
  const parts = expr.trim().split(/\s+/);
  if (parts.length < 5) return expr;
  const [min, hour, dom, mon, dow] = parts;

  const hours = expandField(hour, 23);
  const mins = min === "*" ? null : expandField(min, 59);

  let timeStr = "";
  if (hours && hours.length > 0) {
    const mm = mins && mins.length === 1 ? mins[0] : 0;
    timeStr = hours
      .map((h) => `${pad(h)}:${pad(mm)}`)
      .join(", ");
  }

  let freq = "Diario";
  if (dom.startsWith("*/")) freq = `Cada ${dom.slice(2)} dias`;
  else if (dow !== "*") {
    const days = expandField(dow, 6) ?? [];
    freq = days.map((d) => DOW[d % 7]).join(", ");
  } else if (mon !== "*") freq = `Mes ${mon}`;

  return timeStr ? `${freq} · ${timeStr}` : freq;
}

function expandField(field: string, max: number): number[] | null {
  if (field === "*") return null;
  const out: number[] = [];
  for (const token of field.split(",")) {
    if (token.includes("/")) {
      const [, step] = token.split("/");
      const s = parseInt(step, 10);
      for (let i = 0; i <= max; i += s) out.push(i);
    } else if (token.includes("-")) {
      const [a, b] = token.split("-").map((x) => parseInt(x, 10));
      for (let i = a; i <= b; i++) out.push(i);
    } else {
      const n = parseInt(token, 10);
      if (!Number.isNaN(n)) out.push(n);
    }
  }
  return out;
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}
