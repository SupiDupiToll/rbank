export function formatGermanDate(dateValue: string | Date) {
  return new Intl.DateTimeFormat("de-DE").format(new Date(dateValue));
}

export function toDateInputValue(dateValue: string | Date) {
  return new Date(dateValue).toISOString().slice(0, 10);
}
