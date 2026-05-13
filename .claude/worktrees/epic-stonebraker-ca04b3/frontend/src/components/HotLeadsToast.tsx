import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Flame, X } from 'lucide-react'
import { notificationsApi } from '../lib/api'
import type { AppNotification } from '../types'

const POLL_INTERVAL = 15_000 // 15s

interface Props {
  onHotCount: (n: number) => void
}

export default function HotLeadsToast({ onHotCount }: Props) {
  const [toasts, setToasts] = useState<AppNotification[]>([])
  const seenIds = useRef<Set<string>>(new Set())
  const navigate = useNavigate()

  useEffect(() => {
    const poll = async () => {
      try {
        const { data } = await notificationsApi.getUnread().then((r) => r.data)
        const hot = data.filter((n) => n.type === 'HOT_LEAD')
        onHotCount(hot.length)

        // Show toast for truly new ones
        const newOnes = hot.filter((n) => !seenIds.current.has(n.id))
        for (const n of newOnes) seenIds.current.add(n.id)

        if (newOnes.length > 0) {
          setToasts((prev) => [...newOnes, ...prev].slice(0, 3))
          // Auto-dismiss after 15s
          setTimeout(() => {
            setToasts((prev) => prev.filter((t) => !newOnes.find((n) => n.id === t.id)))
          }, 15_000)
        }
      } catch {
        // polling errors are silent
      }
    }

    poll()
    const interval = setInterval(poll, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [onHotCount])

  const dismiss = async (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    await notificationsApi.markRead(id).catch(() => {})
  }

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => {
        const meta = toast.meta as { clientId?: string; campaignName?: string } | null
        return (
          <div
            key={toast.id}
            className="bg-red-600 text-white rounded-2xl shadow-xl px-4 py-3 flex items-start gap-3 animate-in slide-in-from-right-4 duration-300"
          >
            <Flame className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">{toast.title}</p>
              <p className="text-xs text-red-100 truncate">{toast.body}</p>
              {meta?.campaignName && (
                <p className="text-[10px] text-red-200 mt-0.5">Campaña: {meta.campaignName}</p>
              )}
              <button
                onClick={() => { navigate('/whatsapp/leads'); dismiss(toast.id) }}
                className="mt-1.5 text-[11px] bg-white/20 hover:bg-white/30 rounded-lg px-2.5 py-1 transition-colors"
              >
                Ver lead →
              </button>
            </div>
            <button onClick={() => dismiss(toast.id)} className="text-red-200 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
