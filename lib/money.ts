export function formatEuroFromCents(cents: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR"
  }).format(cents / 100);
}

export function formatAirFromUnits(amount: number) {
  const value = amount / 100;
  const hasFraction = amount % 100 !== 0;

  return `${new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(value)} AIR`;
}
