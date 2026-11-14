// unitPrice arrives as a string from the API (Drizzle numeric columns stay in string mode per AGENTS.md)
const priceFormatter = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' });
export function formatPrice(value: string): string {
  return priceFormatter.format(Number(value));
}

const dateFormatter = new Intl.DateTimeFormat('en-AU', { dateStyle: 'medium' });
// updatedAt arrives as an ISO string over JSON (no superjson transformer; Drizzle Date → JSON string)
export function formatDate(value: string): string {
  return dateFormatter.format(new Date(value));
}

const numberFormatter = new Intl.NumberFormat('en-AU');
export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}
