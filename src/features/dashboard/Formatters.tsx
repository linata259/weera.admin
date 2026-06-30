import { TrendDirection } from "./types";


const currencyFormatter = new Intl.NumberFormat('en-KE', {
  style: 'currency',
  currency: 'KES',
  maximumFractionDigits: 0,
});

const compactNumberFormatter = new Intl.NumberFormat('en-KE', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

const countFormatter = new Intl.NumberFormat('en-KE');

export function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount);
}

export function formatCompactNumber(value: number): string {
  return compactNumberFormatter.format(value);
}

export function formatCount(value: number): string {
  return countFormatter.format(value);
}

export function getTrendDirection(changePercent: number): TrendDirection {
  if (changePercent > 0.5) return 'up';
  if (changePercent < -0.5) return 'down';
  return 'flat';
}

export function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate);
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.round(diffMs / 60_000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.round(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });
}