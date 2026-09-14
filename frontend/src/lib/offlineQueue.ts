import { toast } from 'sonner'
import api from './api'

export interface QueuedRequest {
  id: string
  url: string
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  data?: any
  timestamp: number
  description: string
}

const STORAGE_KEY = 'maral_offline_queue_v1'

export function getQueuedRequests(): QueuedRequest[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function enqueueOfflineRequest(request: Omit<QueuedRequest, 'id' | 'timestamp'>) {
  const queue = getQueuedRequests()
  const newReq: QueuedRequest = {
    ...request,
    id: `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: Date.now(),
  }
  queue.push(newReq)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue))
    toast.info(`Acción guardada offline: "${request.description}". Se sincronizará automáticamente al conectar.`, {
      duration: 5000,
    })
  } catch (e) {
    console.error('Error saving offline queue', e)
  }
}

export async function flushOfflineQueue(): Promise<number> {
  const queue = getQueuedRequests()
  if (queue.length === 0) return 0

  let processedCount = 0
  const remaining: QueuedRequest[] = []

  for (const item of queue) {
    try {
      await api.request({
        url: item.url,
        method: item.method,
        data: item.data,
      })
      processedCount++
    } catch (err: any) {
      // Si el error sigue siendo de conectividad, conservar en cola
      if (!navigator.onLine || err?.code === 'ERR_NETWORK' || !err?.response) {
        remaining.push(item)
      } else {
        // Error de negocio/servidor: descartar o registrar
        console.error('Error processing offline item:', item.description, err)
      }
    }
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining))
  } catch {
    /* noop */
  }

  if (processedCount > 0) {
    toast.success(`✅ Se sincronizaron ${processedCount} acciones pendientes con éxito`)
  }

  return processedCount
}

// Auto-sincronización al detectar reconexión
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    toast.info('Conexión reestablecida. Sincronizando datos...')
    flushOfflineQueue()
  })
}
