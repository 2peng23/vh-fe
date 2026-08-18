export function formatNumber(value: number | string | null | undefined): string {
  const amount = Number(value ?? 0);

  return Number.isFinite(amount) ? amount.toLocaleString("en-PH") : "0";
}
