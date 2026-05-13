import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCOP(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
    .format(amount)
    .replace('COP', '$')
    .trim()
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return '—'
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

export function getDaysAgo(date: string | null | undefined): number {
  if (!date) return 0
  const now = new Date()
  const past = new Date(date)
  if (isNaN(past.getTime())) return 0
  const diff = now.getTime() - past.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

export function getDaysUntil(date: string | null | undefined): number {
  if (!date) return 0
  const now = new Date()
  const future = new Date(date)
  if (isNaN(future.getTime())) return 0
  const diff = future.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    // Quotation
    BORRADOR: 'bg-gray-100 text-gray-700',
    ENVIADA: 'bg-blue-100 text-blue-700',
    APROBADA: 'bg-green-100 text-green-700',
    RECHAZADA: 'bg-red-100 text-red-700',
    CONVERTIDA: 'bg-indigo-100 text-indigo-700',
    // Order
    CONFIRMADO: 'bg-blue-100 text-blue-700',
    EN_PRODUCCION: 'bg-orange-100 text-orange-700',
    EMPACADO: 'bg-purple-100 text-purple-700',
    DESPACHADO: 'bg-indigo-100 text-indigo-700',
    ENTREGADO: 'bg-green-100 text-green-700',
    CANCELADO: 'bg-red-100 text-red-700',
    // Client category
    FUNDADOR_HISTORICO: 'bg-red-100 text-red-700',
    FUNDADOR_MARAL: 'bg-blue-100 text-blue-700',
    ALIADO: 'bg-green-100 text-green-700',
    PROSPECTO: 'bg-yellow-100 text-yellow-700',
    // Production
    EN_PROCESO: 'bg-blue-100 text-blue-700',
    TERMINADO: 'bg-green-100 text-green-700',
    // Invoice
    PAGADA: 'bg-green-100 text-green-700',
    VENCIDA: 'bg-red-100 text-red-700',
    ANULADA: 'bg-gray-100 text-gray-600',
    // Factoring
    ACTIVO: 'bg-green-100 text-green-700',
    INACTIVO: 'bg-gray-100 text-gray-600',
    PENDIENTE: 'bg-yellow-100 text-yellow-700',
    // Purchase
    PARCIAL: 'bg-yellow-100 text-yellow-700',
    RECIBIDA: 'bg-green-100 text-green-700',
  }
  return map[status] ?? 'bg-gray-100 text-gray-600'
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function truncate(str: string, length: number): string {
  return str.length > length ? str.slice(0, length) + '…' : str
}
