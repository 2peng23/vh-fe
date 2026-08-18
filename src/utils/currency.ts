const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCurrency(value: number | string | null | undefined): string {
  const amount = Number(value ?? 0);

  return pesoFormatter.format(Number.isFinite(amount) ? amount : 0);
}
