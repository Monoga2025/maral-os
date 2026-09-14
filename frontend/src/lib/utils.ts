import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCOP(amount?: number | null): string {
  const num = typeof amount === 'number' && !isNaN(amount) ? amount : 0
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
    .format(num)
    .replace('COP', '$')
    .trim()
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—'
  try {
    const d = typeof date === 'string' ? new Date(date) : date
    if (isNaN(d.getTime())) return '—'
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    return `${day}/${month}/${year}`
  } catch {
    return '—'
  }
}

export function getDaysAgo(date: string | null | undefined): number {
  if (!date) return 0
  try {
    const now = new Date()
    const past = new Date(date)
    if (isNaN(past.getTime())) return 0
    const diff = now.getTime() - past.getTime()
    return Math.floor(diff / (1000 * 60 * 60 * 24))
  } catch {
    return 0
  }
}

export function getDaysUntil(date: string | null | undefined): number {
  if (!date) return 0
  try {
    const now = new Date()
    const future = new Date(date)
    if (isNaN(future.getTime())) return 0
    const diff = future.getTime() - now.getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  } catch {
    return 0
  }
}

export function getStatusColor(status?: string | null): string {
  if (!status) return 'bg-gray-100 text-gray-600'
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

export function getInitials(name?: string | null): string {
  if (!name || typeof name !== 'string') return 'U'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'U'
  return parts
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U'
}

export function truncate(str: string, length: number): string {
  return str.length > length ? str.slice(0, length) + '…' : str
}

/**
 * Comprime y convierte una imagen a formato WebP optimizado en el navegador
 * antes de subirla al backend. Reduce el tamaño de 5-15MB a ~150-300KB.
 */
export async function compressImageToWebP(
  file: File,
  maxWidth = 1600,
  maxHeight = 1600,
  quality = 0.82
): Promise<File> {
  // Si no es imagen o el entorno no soporta Canvas, devolver original
  if (!file.type.startsWith('image/') || typeof window === 'undefined') {
    return file
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (e) => {
      const img = new Image()
      img.src = e.target?.result as string
      img.onload = () => {
        let { width, height } = img

        // Mantener relación de aspecto
        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width)
            width = maxWidth
          } else {
            width = Math.round((width * maxHeight) / height)
            height = maxHeight
          }
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(file)
          return
        }

        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file)
              return
            }
            const cleanName = file.name.replace(/\.[^/.]+$/, '') + '.webp'
            const optimizedFile = new File([blob], cleanName, {
              type: 'image/webp',
              lastModified: Date.now(),
            })
            resolve(optimizedFile)
          },
          'image/webp',
          quality
        )
      }
      img.onerror = () => resolve(file)
    }
    reader.onerror = () => resolve(file)
  })
}
