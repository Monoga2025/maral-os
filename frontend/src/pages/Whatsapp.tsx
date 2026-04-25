import { useState, useRef, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { whatsappApi } from '../lib/api'
import { useAuthStore } from '../store/auth'
import type { WaChat, WaMessage } from '../types'
import {
  MessageCircle, Send, Search, Users, RefreshCw,
  Paperclip, Mic, FileText, X, Check,
  CheckCheck, Sparkles, Settings, Download, Zap,
} from 'lucide-react'
import { cn } from '../lib/utils'
import { toast } from 'sonner'

// ─── Helpers ──────────────────────────────────────────────────

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

function formatTime(ts: string) {
  const d = new Date(ts)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / 86_400_000)
  if (diffDays === 0) return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
  if (diffDays === 1) return 'ayer'
  if (diffDays < 7) return d.toLocaleDateString('es-CO', { weekday: 'short' })
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
}

function formatChatName(chat: WaChat) {
  const name = chat.name ?? ''
  if (name && name !== chat.number) return name
  const num = chat.number.replace(/^57/, '')
  return `+57 ${num}`
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// ─── Media bubble content ─────────────────────────────────────

function MediaContent({
  msg,
  token,
}: {
  msg: WaMessage
  token: string
}) {
  const src = `${BASE_URL}/api/whatsapp/media/${msg.id}`
  const headers = { Authorization: `Bearer ${token}` }

  if (msg.type === 'image') {
    return (
      <div className="space-y-1">
        <img
          src={src}
          alt="imagen"
          className="rounded-lg max-w-[260px] max-h-[260px] object-cover cursor-pointer"
          onClick={() => window.open(src, '_blank')}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none'
          }}
        />
        {msg.text && <p className="text-sm leading-relaxed">{msg.text}</p>}
      </div>
    )
  }

  if (msg.type === 'audio') {
    return (
      <div className="flex items-center gap-2 min-w-[180px]">
        <Mic className="h-4 w-4 shrink-0 opacity-70" />
        <audio
          controls
          className="h-8 flex-1"
          style={{ minWidth: 0 }}
          src={src}
        />
      </div>
    )
  }

  if (msg.type === 'video') {
    return (
      <div className="space-y-1">
        <video
          src={src}
          controls
          className="rounded-lg max-w-[260px] max-h-[200px]"
        />
        {msg.text && <p className="text-sm">{msg.text}</p>}
      </div>
    )
  }

  if (msg.type === 'document') {
    return (
      <a
        href={src}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-2 hover:underline"
      >
        <FileText className="h-4 w-4 shrink-0" />
        <span className="text-sm truncate max-w-[200px]">
          {msg.fileName ?? msg.text ?? 'Documento'}
        </span>
        <Download className="h-3.5 w-3.5 shrink-0 opacity-60" />
      </a>
    )
  }

  return (
    <span className="italic text-xs opacity-60">
      [{msg.type}]
    </span>
  )
}

// ─── Message bubble ───────────────────────────────────────────

function MessageBubble({
  msg,
  token,
}: {
  msg: WaMessage
  token: string
}) {
  const isMe = msg.fromMe
  const isText = msg.type === 'text' || msg.type === 'other'
  const hasMedia = !isText

  return (
    <div className={cn('flex items-end gap-1.5', isMe ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[70%] rounded-2xl px-3.5 py-2 text-sm shadow-sm',
          isMe
            ? 'bg-[#005c4b] text-white rounded-br-sm'
            : 'bg-white text-gray-800 rounded-bl-sm border border-gray-100',
        )}
      >
        {hasMedia ? (
          <MediaContent msg={msg} token={token} />
        ) : (
          <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
        )}
        <div className={cn(
          'flex items-center justify-end gap-1 mt-0.5',
          isMe ? 'text-white/60' : 'text-gray-400',
        )}>
          <span className="text-[10px]">{formatTime(msg.timestamp)}</span>
          {isMe && <CheckCheck className="h-3 w-3" />}
        </div>
      </div>
    </div>
  )
}

// ─── AI Suggestion bar ────────────────────────────────────────

function AISuggestionBar({
  suggestion,
  isRegenerating,
  isSending,
  onSendDirect,
  onEdit,
  onRegenerate,
  onDismiss,
}: {
  suggestion: string
  isRegenerating: boolean
  isSending: boolean
  onSendDirect: (text: string) => void
  onEdit: (text: string) => void
  onRegenerate: () => void
  onDismiss: () => void
}) {
  const parts = suggestion.split('|||').map(s => s.trim()).filter(Boolean)
  const displayText = parts.join(' · ')

  return (
    <div className="border-t border-emerald-200 bg-gradient-to-r from-emerald-50 via-emerald-50 to-teal-50 px-4 py-3 flex items-start gap-3 shadow-inner">
      <div className="relative shrink-0 mt-0.5">
        <div className="absolute inset-0 rounded-full bg-emerald-400/30 blur-sm animate-pulse" />
        <div className="relative flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
            Lady IA sugiere
          </p>
          {parts.length > 1 && (
            <span className="text-[9px] text-emerald-600/70 bg-emerald-100 px-1.5 py-0.5 rounded-full font-medium">
              {parts.length} mensajes
            </span>
          )}
        </div>
        <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
          {parts.length > 1
            ? parts.map((p, i) => (
                <span key={i}>
                  {i > 0 && <span className="inline-block mx-1 text-emerald-400 font-bold text-xs">›</span>}
                  {p}
                </span>
              ))
            : displayText}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <button
          onClick={() => onSendDirect(suggestion)}
          disabled={isRegenerating || isSending}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 active:scale-95 disabled:opacity-50 transition-all"
        >
          {isSending ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
          {isSending ? 'Enviando…' : 'Enviar ya'}
        </button>
        <button
          onClick={() => onEdit(suggestion)}
          disabled={isRegenerating || isSending}
          className="text-[10px] text-emerald-700 hover:text-emerald-900 font-medium disabled:opacity-50 transition-colors"
        >
          Editar antes
        </button>
        <div className="flex items-center gap-0.5">
          <button
            onClick={onRegenerate}
            disabled={isRegenerating || isSending}
            title="Regenerar sugerencia"
            className="rounded-lg p-1.5 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isRegenerating && 'animate-spin')} />
          </button>
          <button
            onClick={onDismiss}
            title="Descartar"
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Quick Ask Lady Bar (when no suggestion exists) ──────────

function QuickAskLadyBar({
  isLoading,
  onRequest,
}: {
  isLoading: boolean
  onRequest: () => void
}) {
  if (isLoading) {
    return (
      <div className="border-t border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-3 flex items-center gap-3">
        <div className="relative shrink-0">
          <div className="absolute inset-0 rounded-full bg-emerald-400/40 blur-md animate-pulse" />
          <div className="relative flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600">
            <Sparkles className="h-4 w-4 text-white animate-pulse" />
          </div>
        </div>
        <div className="flex-1">
          <p className="text-xs font-semibold text-emerald-800">Lady está pensando…</p>
          <div className="flex gap-1 mt-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={onRequest}
      className="group w-full border-t border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-emerald-50 hover:from-emerald-100 hover:to-emerald-100 px-4 py-2.5 flex items-center gap-3 transition-colors text-left"
    >
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm group-hover:scale-110 transition-transform">
        <Sparkles className="h-4 w-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-emerald-800">
          ✨ Pedir sugerencia a Lady IA
        </p>
        <p className="text-[11px] text-emerald-600/80">
          Responde al cliente con el tono perfecto en 1 clic
        </p>
      </div>
      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-md group-hover:bg-emerald-200 transition-colors">
        Generar
      </span>
    </button>
  )
}

// ─── Send bar ─────────────────────────────────────────────────

function SendBar({
  chat,
  onSent,
}: {
  chat: WaChat
  onSent: () => void
}) {
  const [text, setText] = useState('')
  const [recording, setRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const qc = useQueryClient()

  const sendMutation = useMutation({
    mutationFn: (payload: Parameters<typeof whatsappApi.send>[0]) =>
      whatsappApi.send(payload),
    onSuccess: () => {
      setText('')
      onSent()
      qc.invalidateQueries({ queryKey: ['wa-chat', chat.jid] })
      qc.invalidateQueries({ queryKey: ['wa-chats'] })
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      toast.error(msg ?? 'Error enviando mensaje')
    },
  })

  const sendText = () => {
    const t = text.trim()
    if (!t) return
    sendMutation.mutate({ jid: chat.jid, type: 'text', text: t })
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendText()
    }
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    try {
      const base64 = await fileToBase64(file)
      const isImage = file.type.startsWith('image/')
      const isVideo = file.type.startsWith('video/')
      const type = isImage ? 'image' : isVideo ? 'video' : 'document'
      sendMutation.mutate({
        jid: chat.jid,
        type,
        mediaBase64: base64,
        mimeType: file.type,
        fileName: file.name,
      })
    } catch {
      toast.error('Error procesando archivo')
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      audioChunksRef.current = []
      mr.ondataavailable = e => audioChunksRef.current.push(e.data)
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(audioChunksRef.current, { type: 'audio/ogg; codecs=opus' })
        const reader = new FileReader()
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1]
          sendMutation.mutate({ jid: chat.jid, type: 'audio', mediaBase64: base64 })
        }
        reader.readAsDataURL(blob)
      }
      mr.start()
      mediaRecorderRef.current = mr
      setRecording(true)
      setRecordingSeconds(0)
      timerRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000)
    } catch {
      toast.error('No se pudo acceder al micrófono')
    }
  }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
    setRecording(false)
    if (timerRef.current) clearInterval(timerRef.current)
  }

  const cancelRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.ondataavailable = null
      mediaRecorderRef.current.onstop = null
      mediaRecorderRef.current.stop()
    }
    setRecording(false)
    if (timerRef.current) clearInterval(timerRef.current)
  }

  if (recording) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-t border-gray-200">
        <button onClick={cancelRecording} className="text-gray-400 hover:text-red-500 transition-colors">
          <X className="h-5 w-5" />
        </button>
        <div className="flex-1 flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          <div className="h-1 flex-1 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-red-400 transition-all"
              style={{ width: `${Math.min(recordingSeconds * 3, 100)}%` }}
            />
          </div>
          <span className="text-xs text-red-500 font-mono tabular-nums w-10 text-right">
            {String(Math.floor(recordingSeconds / 60)).padStart(2, '0')}:{String(recordingSeconds % 60).padStart(2, '0')}
          </span>
        </div>
        <button
          onClick={stopRecording}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-end gap-2 px-3 py-2.5 bg-[#f0f2f5] border-t border-gray-200">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx"
        onChange={handleFile}
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        className="h-9 w-9 shrink-0 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-200 transition-colors"
        title="Adjuntar archivo"
      >
        <Paperclip className="h-5 w-5" />
      </button>

      <div className="flex-1 bg-white rounded-2xl border border-gray-200 flex items-end px-3 py-2 focus-within:border-gray-300">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => {
            setText(e.target.value)
            e.target.style.height = 'auto'
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
          }}
          onKeyDown={handleKey}
          placeholder="Escribe un mensaje..."
          rows={1}
          className="flex-1 resize-none bg-transparent text-sm text-gray-800 placeholder-gray-400 focus:outline-none max-h-[120px]"
        />
      </div>

      {text.trim() ? (
        <button
          onClick={sendText}
          disabled={sendMutation.isPending}
          className="h-9 w-9 shrink-0 flex items-center justify-center rounded-full bg-[#00a884] text-white hover:bg-[#009c7a] disabled:opacity-50 transition-colors"
        >
          {sendMutation.isPending ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      ) : (
        <button
          onClick={startRecording}
          className="h-9 w-9 shrink-0 flex items-center justify-center rounded-full bg-[#00a884] text-white hover:bg-[#009c7a] transition-colors"
          title="Grabar audio"
        >
          <Mic className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

// ─── Chat view ────────────────────────────────────────────────

function ChatView({
  chat,
  token,
}: {
  chat: WaChat
  token: string
}) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const qc = useQueryClient()
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set())
  const [overrideSuggestion, setOverrideSuggestion] = useState<string | null>(null)
  const [manualSuggestion, setManualSuggestion] = useState<string | null>(null)
  const [manualLoading, setManualLoading] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['wa-chat', chat.jid],
    queryFn: () => whatsappApi.getChat(chat.jid),
    refetchInterval: 3000,
  })

  // Reset manual suggestion when switching chats
  useEffect(() => {
    setManualSuggestion(null)
    setManualLoading(false)
  }, [chat.jid])

  // Mark as read on open
  useEffect(() => {
    if (chat.unread > 0) {
      whatsappApi.markRead(chat.jid).catch(() => {})
      qc.setQueryData(['wa-chats'], (old: { data: { data: WaChat[] } } | undefined) => {
        if (!old) return old
        return {
          ...old,
          data: {
            ...old.data,
            data: old.data.data.map(c =>
              c.jid === chat.jid ? { ...c, unread: 0, unanswered: false } : c,
            ),
          },
        }
      })
    }
  }, [chat.jid])

  const messages: WaMessage[] = data?.data.messages ?? []

  // Last client text message (for manual requests)
  const lastClientMessage = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i]
      if (m.fromMe) return null
      if ((m.type === 'text' || m.type === 'other') && m.text) return m
    }
    return null
  })()

  // Find latest auto-suggestion from the last client message
  const autoSuggestion = (() => {
    if (overrideSuggestion !== null) return null
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i]
      if (m.fromMe) break
      if (m.aiSuggestion && !dismissedSuggestions.has(m.id)) {
        return { messageId: m.id, text: m.aiSuggestion }
      }
    }
    return null
  })()

  // Effective suggestion = auto OR manual
  const activeSuggestion = autoSuggestion?.text ?? manualSuggestion
  const showQuickAsk = !activeSuggestion && !overrideSuggestion && !!lastClientMessage

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const requestSuggestion = async () => {
    if (!lastClientMessage?.text || manualLoading) return
    setManualLoading(true)
    try {
      const ctx = messages
        .slice(-12)
        .filter(m => (m.type === 'text' || m.type === 'other') && m.text)
        .map(m => ({
          role: (m.fromMe ? 'lady' : 'cliente') as 'lady' | 'cliente',
          text: m.text as string,
        }))
      const res = await whatsappApi.suggest({
        newMessage: lastClientMessage.text,
        context: ctx,
        clientName: chat.name,
      })
      if (res.data.suggestion?.trim()) {
        setManualSuggestion(res.data.suggestion)
      } else {
        toast.error('Lady no generó respuesta, intenta de nuevo')
      }
    } catch (err) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      toast.error(msg ?? 'Error generando sugerencia. Verifica OPENROUTER_API_KEY')
    } finally {
      setManualLoading(false)
    }
  }

  const sendDirectMutation = useMutation({
    mutationFn: (text: string) =>
      whatsappApi.send({ jid: chat.jid, type: 'text', text: text.trim() }),
    onSuccess: () => {
      setManualSuggestion(null)
      if (autoSuggestion) {
        setDismissedSuggestions(prev => new Set([...prev, autoSuggestion.messageId]))
      }
      qc.invalidateQueries({ queryKey: ['wa-chat', chat.jid] })
      qc.invalidateQueries({ queryKey: ['wa-chats'] })
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      toast.error(msg ?? 'Error enviando')
    },
  })

  const handleEditSuggestion = (text: string) => {
    setOverrideSuggestion(text)
    setManualSuggestion(null)
    if (autoSuggestion) {
      setDismissedSuggestions(prev => new Set([...prev, autoSuggestion.messageId]))
    }
  }

  const handleDismissSuggestion = () => {
    if (autoSuggestion) {
      setDismissedSuggestions(prev => new Set([...prev, autoSuggestion.messageId]))
    }
    setManualSuggestion(null)
  }

  return (
    <div className="flex flex-col h-full bg-[#efeae2]"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d9d0c7' fill-opacity='0.3'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-[#f0f2f5] border-b border-gray-200 shrink-0">
        <div className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white text-sm font-bold',
          chat.type === 'grupo' ? 'bg-emerald-500' : 'bg-[#00a884]',
        )}>
          {chat.type === 'grupo' ? <Users className="h-5 w-5" /> : getInitials(formatChatName(chat))}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{formatChatName(chat)}</p>
          <p className="text-xs text-gray-500 truncate">
            {chat.type === 'grupo' ? 'Grupo' : `+${chat.number}`}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1.5">
        {isLoading && (
          <div className="flex justify-center py-8">
            <RefreshCw className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        )}
        {messages.map(msg => (
          <MessageBubble key={msg.id} msg={msg} token={token} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* AI suggestion bar (active suggestion) */}
      {activeSuggestion && (
        <AISuggestionBar
          suggestion={activeSuggestion}
          isRegenerating={manualLoading}
          isSending={sendDirectMutation.isPending}
          onSendDirect={(text) => sendDirectMutation.mutate(text)}
          onEdit={handleEditSuggestion}
          onRegenerate={requestSuggestion}
          onDismiss={handleDismissSuggestion}
        />
      )}

      {/* Quick ask Lady bar */}
      {showQuickAsk && (
        <QuickAskLadyBar
          isLoading={manualLoading}
          onRequest={requestSuggestion}
        />
      )}

      {/* Send bar */}
      {overrideSuggestion !== null ? (
        <SuggestionConfirmBar
          suggestion={overrideSuggestion}
          chat={chat}
          onSent={() => {
            setOverrideSuggestion(null)
            qc.invalidateQueries({ queryKey: ['wa-chat', chat.jid] })
          }}
          onCancel={() => setOverrideSuggestion(null)}
        />
      ) : (
        <SendBar
          chat={chat}
          onSent={() => qc.invalidateQueries({ queryKey: ['wa-chat', chat.jid] })}
        />
      )}
    </div>
  )
}

// ─── Suggestion confirm bar (editable before send) ────────────

function SuggestionConfirmBar({
  suggestion,
  chat,
  onSent,
  onCancel,
}: {
  suggestion: string
  chat: WaChat
  onSent: () => void
  onCancel: () => void
}) {
  const [text, setText] = useState(suggestion.replace(/\|\|\|/g, '\n'))
  const qc = useQueryClient()

  const sendMutation = useMutation({
    mutationFn: () =>
      whatsappApi.send({ jid: chat.jid, type: 'text', text: text.trim().replace(/\n/g, ' ||| ') }),
    onSuccess: () => {
      onSent()
      qc.invalidateQueries({ queryKey: ['wa-chats'] })
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      toast.error(msg ?? 'Error enviando')
    },
  })

  return (
    <div className="border-t border-emerald-300 bg-emerald-50">
      <div className="flex items-center gap-2 px-4 pt-2 pb-1">
        <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
        <span className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wide flex-1">
          Edita y envía como Lady
        </span>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex items-end gap-2 px-3 pb-2.5">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          rows={3}
          className="flex-1 rounded-xl border border-emerald-300 bg-white px-3 py-2 text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-400"
        />
        <button
          onClick={() => sendMutation.mutate()}
          disabled={!text.trim() || sendMutation.isPending}
          className="h-9 w-9 shrink-0 flex items-center justify-center rounded-full bg-[#00a884] text-white hover:bg-[#009c7a] disabled:opacity-50 transition-colors"
        >
          {sendMutation.isPending ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  )
}

// ─── Chat list item ───────────────────────────────────────────

function ChatItem({
  chat,
  selected,
  onClick,
}: {
  chat: WaChat
  selected: boolean
  onClick: () => void
}) {
  const name = formatChatName(chat)
  const isGroup = chat.type === 'grupo'
  const initials = getInitials(name)

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-gray-100',
        selected ? 'bg-[#f0f2f5]' : 'hover:bg-[#f5f6f6]',
      )}
    >
      <div className={cn(
        'flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white text-sm font-bold',
        isGroup ? 'bg-emerald-500' : 'bg-[#dfe5e7] text-[#54656f]',
      )}>
        {isGroup ? <Users className="h-5 w-5" /> : <span className="text-sm font-semibold">{initials}</span>}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1 mb-0.5">
          <span className="text-sm font-medium text-[#111b21] truncate">{name}</span>
          <span className={cn(
            'text-[11px] shrink-0',
            chat.unanswered ? 'text-[#25d366] font-semibold' : 'text-[#667781]',
          )}>
            {formatTime(chat.lastTimestamp)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-1">
          <p className={cn(
            'text-[13px] truncate',
            chat.unanswered ? 'text-[#111b21]' : 'text-[#667781]',
          )}>
            {chat.lastMessage || '—'}
          </p>
          {chat.unread > 0 && (
            <span className="shrink-0 flex items-center justify-center h-5 min-w-5 rounded-full bg-[#25d366] text-white text-[11px] font-bold px-1">
              {chat.unread > 99 ? '99+' : chat.unread}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

// ─── Empty state ──────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-[#f0f2f5]">
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-full bg-emerald-400/20 blur-xl" />
        <div className="relative h-20 w-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
          <MessageCircle className="h-10 w-10 text-white" />
        </div>
        <div className="absolute -top-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-md">
          <Sparkles className="h-3.5 w-3.5 text-white" />
        </div>
      </div>
      <h3 className="text-2xl font-semibold text-[#41525d] mb-2">
        WhatsApp + Lady IA
      </h3>
      <p className="text-sm text-[#667781] max-w-sm mb-6">
        Selecciona una conversación. Lady sugiere respuestas comerciales con el tono de MARAL — listas para enviar en un clic.
      </p>
      <div className="grid grid-cols-3 gap-4 max-w-md text-center">
        <div>
          <p className="text-2xl font-bold text-emerald-600">3×</p>
          <p className="text-[10px] text-gray-500 uppercase tracking-wide">Más rápido</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-emerald-600">24/7</p>
          <p className="text-[10px] text-gray-500 uppercase tracking-wide">Disponible</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-emerald-600">+$$</p>
          <p className="text-[10px] text-gray-500 uppercase tracking-wide">Cierre ventas</p>
        </div>
      </div>
    </div>
  )
}

// ─── Settings panel ───────────────────────────────────────────

function SettingsPanel({ onClose }: { onClose: () => void }) {
  const [webhookUrl, setWebhookUrl] = useState('')
  const [importing, setImporting] = useState(false)
  const [configuring, setConfiguring] = useState(false)

  const handleImport = async () => {
    setImporting(true)
    try {
      const res = await whatsappApi.importHistory()
      toast.success(`Importados ${res.data.imported} mensajes del historial`)
    } catch {
      toast.error('Error importando historial')
    } finally {
      setImporting(false)
    }
  }

  const handleConfigWebhook = async () => {
    if (!webhookUrl.trim()) return
    setConfiguring(true)
    try {
      await whatsappApi.configureWebhook(webhookUrl.trim())
      toast.success('Webhook configurado')
    } catch {
      toast.error('Error configurando webhook')
    } finally {
      setConfiguring(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center gap-3 px-4 py-3 bg-[#f0f2f5] border-b border-gray-200">
        <button onClick={onClose} className="text-[#54656f] hover:text-[#111b21]">
          <X className="h-5 w-5" />
        </button>
        <h2 className="text-base font-semibold text-[#111b21]">Configuración WhatsApp</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">Importar historial</h3>
          <p className="text-xs text-gray-500">
            Carga todos los mensajes del export local a la base de datos.
            Solo es necesario hacerlo una vez.
          </p>
          <button
            onClick={handleImport}
            disabled={importing}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {importing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {importing ? 'Importando...' : 'Importar desde export'}
          </button>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">Configurar webhook</h3>
          <p className="text-xs text-gray-500">
            URL pública del backend para recibir mensajes en tiempo real de Evolution API.
          </p>
          <input
            type="url"
            value={webhookUrl}
            onChange={e => setWebhookUrl(e.target.value)}
            placeholder="https://tu-backend.com/api/whatsapp/webhook"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleConfigWebhook}
            disabled={configuring || !webhookUrl.trim()}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {configuring ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {configuring ? 'Configurando...' : 'Activar webhook'}
          </button>
        </section>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────

export default function Whatsapp() {
  const [selectedChat, setSelectedChat] = useState<WaChat | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [search, setSearch] = useState('')
  const [searchParams] = useSearchParams()
  const jid = searchParams.get('jid')

  const token = useAuthStore((s) => s.token) ?? ''

  const { data, isLoading } = useQuery({
    queryKey: ['wa-chats'],
    queryFn: () => whatsappApi.getChats(),
    refetchInterval: 5000,
  })

  const chats = (data?.data.data ?? []).filter(c => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      formatChatName(c).toLowerCase().includes(q) ||
      c.number.includes(q) ||
      (c.lastMessage ?? '').toLowerCase().includes(q)
    )
  })

  const configured = data?.data.configured ?? true
  const totalUnread = chats.reduce((sum, c) => sum + (c.unread ?? 0), 0)

  // Open chat from query param ?jid=...
  useEffect(() => {
    if (jid && data?.data.data) {
      const target = data.data.data.find(c => c.jid === jid)
      if (target) setSelectedChat(target)
    }
  }, [jid, data?.data.data])

  // Update selected chat when data refreshes
  useEffect(() => {
    if (selectedChat && data?.data.data) {
      const updated = data.data.data.find(c => c.jid === selectedChat.jid)
      if (updated) setSelectedChat(updated)
    }
  }, [data?.data.data, selectedChat?.jid])

  return (
    <div className="flex h-[calc(100vh-4rem)] -m-6 overflow-hidden">
      {/* Left panel */}
      <div className="flex flex-col w-[340px] shrink-0 border-r border-gray-200 bg-white">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 bg-[#f0f2f5] border-b border-gray-200">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#00a884] text-white">
            <MessageCircle className="h-5 w-5" />
          </div>
          <span className="flex-1 text-base font-semibold text-[#111b21]">
            WhatsApp
            {totalUnread > 0 && (
              <span className="ml-2 inline-flex items-center justify-center h-5 min-w-5 rounded-full bg-[#25d366] text-white text-[10px] font-bold px-1">
                {totalUnread}
              </span>
            )}
          </span>
          <button
            onClick={() => setShowSettings(s => !s)}
            className={cn(
              'rounded-full p-2 transition-colors',
              showSettings ? 'bg-gray-200 text-[#111b21]' : 'text-[#54656f] hover:bg-gray-100',
            )}
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-3 py-2 bg-white border-b border-gray-100">
          <div className="flex items-center gap-2 bg-[#f0f2f5] rounded-lg px-3 py-1.5">
            <Search className="h-4 w-4 text-[#54656f]" />
            <input
              type="text"
              placeholder="Buscar o empezar un chat"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm text-[#111b21] placeholder-[#8696a0] focus:outline-none"
            />
          </div>
        </div>

        {/* Chat list */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <div className="flex justify-center py-10">
              <RefreshCw className="h-5 w-5 animate-spin text-gray-300" />
            </div>
          )}

          {!isLoading && !configured && (
            <div className="p-6 text-center space-y-2">
              <p className="text-sm text-gray-500">No hay mensajes aún</p>
              <p className="text-xs text-gray-400">
                Importa el historial o configura el webhook para recibir mensajes en tiempo real.
              </p>
              <button
                onClick={() => setShowSettings(true)}
                className="mt-2 text-xs text-blue-600 hover:underline"
              >
                Abrir configuración
              </button>
            </div>
          )}

          {!isLoading && configured && chats.length === 0 && (
            <div className="p-4 text-center text-sm text-gray-400">
              {search ? 'Sin resultados' : 'No hay conversaciones'}
            </div>
          )}

          {chats.map(chat => (
            <ChatItem
              key={chat.jid}
              chat={chat}
              selected={!showSettings && selectedChat?.jid === chat.jid}
              onClick={() => {
                setSelectedChat(chat)
                setShowSettings(false)
              }}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-gray-100 bg-[#f0f2f5]">
          <p className="text-[10px] text-[#8696a0]">
            {data?.data.total ?? 0} conversaciones · {chats.filter(c => c.unanswered).length} sin responder
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 min-w-0">
        {showSettings ? (
          <SettingsPanel onClose={() => setShowSettings(false)} />
        ) : selectedChat ? (
          <ChatView
            key={selectedChat.jid}
            chat={selectedChat}
            token={token}
          />
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  )
}
