export function formatBRL(value: number | null | undefined): string {
  const v = typeof value === "number" && isFinite(value) ? value : 0;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

export function formatPercent(value: number | null | undefined, digits = 1): string {
  const v = typeof value === "number" && isFinite(value) ? value : 0;
  return `${v.toFixed(digits)}%`;
}

export function formatDateBR(dateISO: string | null | undefined): string {
  if (!dateISO) return "—";
  const d = new Date(dateISO + "T00:00:00");
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}

export function startOfMonthISO(d = new Date()): string {
  const x = new Date(d.getFullYear(), d.getMonth(), 1);
  return x.toISOString().slice(0, 10);
}

export function endOfMonthISO(d = new Date()): string {
  const x = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return x.toISOString().slice(0, 10);
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
