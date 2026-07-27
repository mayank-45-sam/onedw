import { CURRENCY } from '@/constants/app';

export function formatCurrency(amount: number, currency = CURRENCY.code) {
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

export function formatDate(date: string | Date, opts?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('en-US', opts ?? { month: 'short', day: 'numeric', year: 'numeric' }).format(
    new Date(date)
  );
}

export function formatTime(date: string | Date) {
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(date));
}

export function timeAgo(date: string | Date) {
  const diff = Date.now() - new Date(date).getTime();
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

export function initials(name: string) {
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
