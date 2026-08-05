import { CURRENCY } from '@/constants/app';

export function formatCurrency(amount: number | null | undefined, currency = CURRENCY.code) {
  if (amount == null) return 'N/A';
  return new Intl.NumberFormat(CURRENCY.locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

function parseDate(date: string | Date): Date {
  if (date instanceof Date) return date;
  if (typeof date === 'string' && date && !/(Z|[+-]\d{2}:?\d{2})$/.test(date)) {
    return new Date(`${date}Z`);
  }
  return new Date(date);
}

export function formatDate(date: string | Date | null | undefined, opts?: Intl.DateTimeFormatOptions) {
  if (!date) return '—';
  return new Intl.DateTimeFormat('en-IN', opts ?? { month: 'short', day: 'numeric', year: 'numeric' }).format(
    parseDate(date)
  );
}

export function formatTime(date: string | Date | null | undefined) {
  if (!date) return '—';
  return new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }).format(parseDate(date));
}

export function timeAgo(date: string | Date | null | undefined): string {
  if (!date) return '—';
  const diff = Date.now() - parseDate(date).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return formatDate(date);
}

export function initials(name: string | null | undefined) {
  if (!name) return '??';
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function classNames(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
