import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistance } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—'
  return format(new Date(date), 'MMM d, yyyy HH:mm')
}

export function formatDateShort(date: string | Date | null | undefined): string {
  if (!date) return '—'
  return format(new Date(date), 'MMM d, yyyy')
}

export function formatRelative(date: string | Date | null | undefined): string {
  if (!date) return '—'
  return formatDistance(new Date(date), new Date(), { addSuffix: true })
}

export function formatDuration(mins: number | null | undefined): string {
  if (!mins) return 'Unlimited'
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export function formatSeconds(secs: number | null | undefined): string {
  if (!secs) return '0:00'
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'draft':     return 'bg-gray-100 text-gray-700'
    case 'published': return 'bg-blue-100 text-blue-700'
    case 'active':    return 'bg-green-100 text-green-700'
    case 'expired':   return 'bg-red-100 text-red-700'
    default:          return 'bg-gray-100 text-gray-700'
  }
}
