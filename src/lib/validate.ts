export function toNumberBRL(input: string): number {
  // Accepts "1.234,56" or "1234.56" etc.
  const trimmed = (input ?? "").trim();
  if (!trimmed) return 0;
  const normalized = trimmed
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^0-9.-]/g, "");
  const n = Number(normalized);
  return isFinite(n) ? n : 0;
}

export function requireNonEmpty(value: string, label: string): string | null {
  if (!value?.trim()) return `${label} é obrigatório.`;
  return null;
}

export function requirePositiveNumber(value: number, label: string): string | null {
  if (!(value > 0)) return `${label} deve ser maior que zero.`;
  return null;
}

export function sum(values: Array<number | null | undefined>): number {
  return values.reduce<number>((acc, v) => acc + (typeof v === "number" && isFinite(v) ? v : 0), 0);
}
