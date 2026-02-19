import { formatBRL } from "@/lib/format";

/**
 * Máscara BRL (experiência premium):
 * - Digitos são tratados como centavos (padrão financeiro).
 *   Ex.: "1" -> R$ 0,01 | "1234" -> R$ 12,34
 * - Mantém a formatação enquanto digita e ao editar.
 */
export function maskBRLCurrencyInput(raw: string): string {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (!digits) return "";
  const cents = Number.parseInt(digits, 10);
  const value = Number.isFinite(cents) ? cents / 100 : 0;
  return formatBRL(value);
}
