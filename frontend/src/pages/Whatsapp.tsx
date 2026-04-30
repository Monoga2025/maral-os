import { useState, useRef, useEffect, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { whatsappApi } from '../lib/api'
import { useAuthStore } from '../store/auth'
import type { WaChat, WaMessage } from '../types'
import {
  MessageCircle, Send, Search, Users, RefreshCw,
  Paperclip, Mic, FileText, X, Check,
  CheckCheck, Sparkles, Settings, Download, Zap,
  ChevronRight, ChevronLeft, FileSpreadsheet, Tag,
  AlertCircle, CheckCircle, Info, BarChart2, Image,
  Clock, TrendingUp, Phone, Mail, MapPin, ExternalLink,
  AlertTriangle, Building2,
} from 'lucide-react'
import { cn } from '../lib/utils'
import { toast } from 'sonner'

// ─── Helpers ──────────────────────────────────────────────────

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

const GRADIENTS = [
  ['#f97316', '#ef4444'],
  ['#8b5cf6', '#6366f1'],
  ['#06b6d4', '#0ea5e9'],
  ['#10b981', '#059669'],
  ['#f59e0b', '#d97706'],
  ['#ec4899', '#db2777'],
  ['#14b8a6', '#0d9488'],
  ['#6366f1', '#8b5cf6'],
  ['#84cc16', '#22c55e'],
  ['#f43f5e', '#e11d48'],
]

function getGradient(seed: string): [string, string] {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  return GRADIENTS[hash % GRADIENTS.length] as [string, string]
}

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

// ─── Avatar ───────────────────────────────────────────────────

function Avatar({ chat, size = 'md' }: { chat: WaChat; size?: 'sm' | 'md' | 'lg' }) {
  const [picFailed, setPicFailed] = useState(false)
  const isGroup = chat.type === 'grupo'
  const name = formatChatName(chat)
  const sizeClass = size === 'sm' ? 'h-8 w-8 text-xs' : size === 'lg' ? 'h-12 w-12 text-base' : 'h-10 w-10 text-sm'
  const [g1, g2] = getGradient(chat.number || name)
  const picUrl = !isGroup && !picFailed ? whatsappApi.profilePicUrl(chat.number) : null

  if (picUrl) {
    return (
      <img
        src={picUrl}
        alt={name}
        className={cn('rounded-full object-cover shrink-0', sizeClass)}
        onError={() => setPicFailed(true)}
      />
    )
  }

  return (
    <div
      className={cn('flex shrink-0 items-center justify-center rounded-full text-white font-bold', sizeClass)}
      style={{ background: isGroup ? undefined : `linear-gradient(135deg, ${g1}, ${g2})`, backgroundColor: isGroup ? '#25d366' : undefined }}
    >
      {isGroup ? <Users className="h-4 w-4" /> : <span>{getInitials(name)}</span>}
    </div>
  )
}

// ─── Media bubble content ─────────────────────────────────────

function MediaContent({ msg, token }: { msg: WaMessage; token: string }) {
  const src = `${BASE_URL}/api/whatsapp/media/${msg.id}`
  void token

  if (msg.type === 'image') {
    return (
      <div className="space-y-1">
        <img
          src={src}
          alt="imagen"
          className="rounded-lg max-w-[260px] max-h-[260px] object-cover cursor-pointer"
          onClick={() => window.open(src, '_blank')}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
        {msg.text && <p className="text-sm leading-relaxed">{msg.text}</p>}
      </div>
    )
  }
  if (msg.type === 'audio') {
    return (
      <div className="flex items-center gap-2 min-w-[180px]">
        <Mic className="h-4 w-4 shrink-0 opacity-70" />
        <audio controls className="h-8 flex-1" style={{ minWidth: 0 }} src={src} />
      </div>
    )
  }
  if (msg.type === 'video') {
    return (
      <div className="space-y-1">
        <video src={src} controls className="rounded-lg max-w-[260px] max-h-[200px]" />
        {msg.text && <p className="text-sm">{msg.text}</p>}
      </div>
    )
  }
  if (msg.type === 'document') {
    return (
      <a href={src} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:underline">
        <FileText className="h-4 w-4 shrink-0" />
        <span className="text-sm truncate max-w-[200px]">{msg.fileName ?? msg.text ?? 'Documento'}</span>
        <Download className="h-3.5 w-3.5 shrink-0 opacity-60" />
      </a>
    )
  }
  if (msg.type === 'sticker') {
    return (
      <img
        src={src}
        alt="sticker"
        className="max-w-[160px] max-h-[160px] object-contain cursor-pointer"
        onClick={() => window.open(src, '_blank')}
        onError={(e) => { (e.target as HTMLImageElement).alt = '[sticker]' }}
      />
    )
  }
  return <span className="italic text-xs opacity-60">[{msg.type}]</span>
}

// ─── Message bubble ───────────────────────────────────────────

function MessageBubble({ msg, token }: { msg: WaMessage; token: string }) {
  const isMe = msg.fromMe
  const isText = msg.type === 'text' || msg.type === 'other'
  const isSticker = msg.type === 'sticker'
  // Skip empty text bubbles (reactions, deleted messages with no body)
  if (isText && !msg.text?.trim()) return null
  // Stickers: transparent bubble, no bg
  if (isSticker) {
    return (
      <div className={cn('flex items-end gap-1.5', isMe ? 'justify-end' : 'justify-start')}>
        <div className="relative">
          <MediaContent msg={msg} token={token} />
          <span className={cn('absolute bottom-0 right-1 text-[10px]', isMe ? 'text-gray-500' : 'text-gray-400')}>
            {formatTime(msg.timestamp)}
          </span>
        </div>
      </div>
    )
  }
  return (
    <div className={cn('flex items-end gap-1.5', isMe ? 'justify-end' : 'justify-start')}>
      <div className={cn(
        'max-w-[70%] rounded-2xl px-3.5 py-2 text-sm shadow-sm',
        isMe ? 'bg-[#005c4b] text-white rounded-br-sm' : 'bg-white text-gray-800 rounded-bl-sm border border-gray-100',
      )}>
        {!isText ? <MediaContent msg={msg} token={token} /> : (
          <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
        )}
        <div className={cn('flex items-center justify-end gap-1 mt-0.5', isMe ? 'text-white/60' : 'text-gray-400')}>
          <span className="text-[10px]">{formatTime(msg.timestamp)}</span>
          {isMe && <CheckCheck className="h-3 w-3" />}
        </div>
      </div>
    </div>
  )
}

// ─── Ghost suggestion bubble (inline in chat) ─────────────────

function GhostSuggestion({
  text,
  isSending,
  isRegenerating,
  onSend,
  onEdit,
  onRegenerate,
  onDismiss,
}: {
  text: string
  isSending: boolean
  isRegenerating: boolean
  onSend: (t: string) => void
  onEdit: (t: string) => void
  onRegenerate: () => void
  onDismiss: () => void
}) {
  const parts = text.split('|||').map(s => s.trim()).filter(Boolean)
  return (
    <div className="flex items-end gap-1.5 justify-end opacity-80">
      <div className="max-w-[72%] rounded-2xl rounded-br-sm border-2 border-dashed border-emerald-400/60 bg-emerald-50/60 backdrop-blur-sm px-3.5 py-2.5 shadow-sm">
        <div className="flex items-center gap-1.5 mb-1.5">
          <div className="flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600">
            <Sparkles className="h-2.5 w-2.5 text-white" />
          </div>
          <span className="text-[9px] font-bold text-emerald-700 uppercase tracking-wider">Lady sugiere</span>
          {isRegenerating && <RefreshCw className="h-2.5 w-2.5 text-emerald-500 animate-spin" />}
        </div>
        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap italic">
          {parts.length > 1
            ? parts.map((p, i) => (
                <span key={i}>{i > 0 && <span className="mx-1 text-emerald-400">›</span>}{p}</span>
              ))
            : text}
        </p>
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          <button
            onClick={() => onSend(text)}
            disabled={isSending || isRegenerating}
            className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition-all active:scale-95"
          >
            {isSending ? <RefreshCw className="h-2.5 w-2.5 animate-spin" /> : <Zap className="h-2.5 w-2.5" />}
            Enviar
          </button>
          <button
            onClick={() => onEdit(text)}
            disabled={isSending || isRegenerating}
            className="rounded-lg border border-emerald-300 bg-white px-2.5 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 transition-colors"
          >
            Editar
          </button>
          <button
            onClick={onRegenerate}
            disabled={isSending || isRegenerating}
            className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            title="Regenerar"
          >
            <RefreshCw className="h-3 w-3" />
          </button>
          <button
            onClick={onDismiss}
            className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-[11px] text-gray-400 hover:bg-gray-50 transition-colors"
            title="Descartar"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Quick ask Lady bar ───────────────────────────────────────

function QuickAskLadyBar({ isLoading, onRequest }: { isLoading: boolean; onRequest: () => void }) {
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
            {[0, 150, 300].map(d => (
              <div key={d} className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: `${d}ms` }} />
            ))}
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
        <p className="text-xs font-bold text-emerald-800">✨ Pedir sugerencia a Lady IA</p>
        <p className="text-[11px] text-emerald-600/80">Responde al cliente con el tono perfecto en 1 clic</p>
      </div>
      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-md group-hover:bg-emerald-200 transition-colors">
        Generar
      </span>
    </button>
  )
}

// ─── Send bar ─────────────────────────────────────────────────

function SendBar({ chat, onSent }: { chat: WaChat; onSent: () => void }) {
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
    mutationFn: (payload: Parameters<typeof whatsappApi.send>[0]) => whatsappApi.send(payload),
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
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendText() }
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    try {
      const base64 = await fileToBase64(file)
      const isSticker = file.type === 'image/webp'
      const isImage = !isSticker && file.type.startsWith('image/')
      const isVideo = file.type.startsWith('video/')
      const type = isSticker ? 'sticker' : isImage ? 'image' : isVideo ? 'video' : 'document'
      sendMutation.mutate({ jid: chat.jid, type, mediaBase64: base64, mimeType: file.type, fileName: file.name })
    } catch { toast.error('Error procesando archivo') }
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
        reader.onload = () => sendMutation.mutate({ jid: chat.jid, type: 'audio', mediaBase64: (reader.result as string).split(',')[1] })
        reader.readAsDataURL(blob)
      }
      mr.start()
      mediaRecorderRef.current = mr
      setRecording(true)
      setRecordingSeconds(0)
      timerRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000)
    } catch { toast.error('No se pudo acceder al micrófono') }
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
        <button onClick={cancelRecording} className="text-gray-400 hover:text-red-500 transition-colors"><X className="h-5 w-5" /></button>
        <div className="flex-1 flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          <div className="h-1 flex-1 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-red-400 transition-all" style={{ width: `${Math.min(recordingSeconds * 3, 100)}%` }} />
          </div>
          <span className="text-xs text-red-500 font-mono tabular-nums w-10 text-right">
            {String(Math.floor(recordingSeconds / 60)).padStart(2, '0')}:{String(recordingSeconds % 60).padStart(2, '0')}
          </span>
        </div>
        <button onClick={stopRecording} className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white hover:bg-emerald-600 transition-colors">
          <Send className="h-4 w-4" />
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-end gap-2 px-3 py-2.5 bg-[#f0f2f5] border-t border-gray-200">
      <input ref={fileInputRef} type="file" className="hidden" accept="image/*,image/webp,video/*,application/pdf,.doc,.docx,.xls,.xlsx" onChange={handleFile} />
      <button onClick={() => fileInputRef.current?.click()} className="h-9 w-9 shrink-0 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-200 transition-colors" title="Adjuntar archivo">
        <Paperclip className="h-5 w-5" />
      </button>
      <div className="flex-1 bg-white rounded-2xl border border-gray-200 flex items-end px-3 py-2 focus-within:border-gray-300">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => { setText(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px' }}
          onKeyDown={handleKey}
          placeholder="Escribe un mensaje..."
          rows={1}
          className="flex-1 resize-none bg-transparent text-sm text-gray-800 placeholder-gray-400 focus:outline-none max-h-[120px]"
        />
      </div>
      {text.trim() ? (
        <button onClick={sendText} disabled={sendMutation.isPending} className="h-9 w-9 shrink-0 flex items-center justify-center rounded-full bg-[#00a884] text-white hover:bg-[#009c7a] disabled:opacity-50 transition-colors">
          {sendMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      ) : (
        <button onClick={startRecording} className="h-9 w-9 shrink-0 flex items-center justify-center rounded-full bg-[#00a884] text-white hover:bg-[#009c7a] transition-colors" title="Grabar audio">
          <Mic className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

// ─── Suggestion confirm bar ───────────────────────────────────

function SuggestionConfirmBar({ suggestion, chat, onSent, onCancel }: { suggestion: string; chat: WaChat; onSent: () => void; onCancel: () => void }) {
  const [text, setText] = useState(suggestion.replace(/\|\|\|/g, '\n'))
  const qc = useQueryClient()
  const sendMutation = useMutation({
    mutationFn: () => whatsappApi.send({ jid: chat.jid, type: 'text', text: text.trim().replace(/\n/g, ' ||| ') }),
    onSuccess: () => { onSent(); qc.invalidateQueries({ queryKey: ['wa-chats'] }) },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      toast.error(msg ?? 'Error enviando')
    },
  })
  return (
    <div className="border-t border-emerald-300 bg-emerald-50">
      <div className="flex items-center gap-2 px-4 pt-2 pb-1">
        <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
        <span className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wide flex-1">Edita y envía como Lady</span>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600"><X className="h-3.5 w-3.5" /></button>
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
          {sendMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>
    </div>
  )
}

// ─── Right panel ──────────────────────────────────────────────

type RightTab = 'perfil' | 'analitica' | 'archivos'

function RightPanel({
  chat,
  messages,
  onClose,
  onPreQuote,
  preQuoting,
  preQuoteResult,
}: {
  chat: WaChat
  messages: WaMessage[]
  onClose: () => void
  onPreQuote: () => void
  preQuoting: boolean
  preQuoteResult: Awaited<ReturnType<typeof whatsappApi.preQuote>>['data'] | null
}) {
  const [tab, setTab] = useState<RightTab>('perfil')
  const navigate = useNavigate()

  const { data: clientData } = useQuery({
    queryKey: ['wa-linked-client', chat.jid],
    queryFn: () => whatsappApi.linkedClient(chat.jid),
    staleTime: 60_000,
    retry: 1,
  })

  const { data: mediaData } = useQuery({
    queryKey: ['wa-media', chat.jid],
    queryFn: () => whatsappApi.chatMedia(chat.jid),
    enabled: tab === 'archivos',
    staleTime: 30_000,
    retry: 1,
  })

  const client = clientData?.data?.client ?? null
  const mediaItems = mediaData?.data?.media ?? []

  // Analytics
  const analytics = useMemo(() => {
    if (!messages.length) return null
    const fromClient = messages.filter(m => !m.fromMe && (m.type === 'text' || m.type === 'other'))
    const fromUs = messages.filter(m => m.fromMe && (m.type === 'text' || m.type === 'other'))
    const totalMedia = messages.filter(m => m.type !== 'text' && m.type !== 'other').length

    // avg response time
    let totalResponse = 0, responseCount = 0
    for (let i = 1; i < messages.length; i++) {
      const prev = messages[i - 1], curr = messages[i]
      if (!prev.fromMe && curr.fromMe) {
        const diff = (new Date(curr.timestamp).getTime() - new Date(prev.timestamp).getTime()) / 60000
        if (diff < 1440) { totalResponse += diff; responseCount++ }
      }
    }
    const avgResponse = responseCount > 0 ? Math.round(totalResponse / responseCount) : null

    // keyword topics
    const allText = fromClient.map(m => m.text ?? '').join(' ').toLowerCase()
    const keywords: Record<string, string[]> = {
      'Precios/cotizar': ['precio', 'cuanto', 'valor', 'costo', 'cotiz', 'oferta'],
      'Productos': ['antena', 'base', 'cable', 'equipo', 'radio', 'kit', 'magnética', 'onda'],
      'Despacho': ['envío', 'envio', 'despacho', 'entrega', 'llega', 'llegar', 'demora'],
      'Garantía': ['garantia', 'garantía', 'fallo', 'daño', 'defecto', 'problema'],
      'Pago': ['pago', 'pagar', 'factura', 'transferencia', 'efectivo', 'consignacion'],
    }
    const detectedTopics = Object.entries(keywords)
      .filter(([, words]) => words.some(w => allText.includes(w)))
      .map(([topic]) => topic)

    return { total: messages.length, fromClient: fromClient.length, fromUs: fromUs.length, totalMedia, avgResponse, detectedTopics }
  }, [messages])

  return (
    <div className="w-80 shrink-0 border-l border-gray-200 bg-white flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-[#f0f2f5] shrink-0">
        <div className="flex gap-1">
          {([['perfil', 'Perfil'], ['analitica', 'Analítica'], ['archivos', 'Archivos']] as [RightTab, string][]).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'px-3 py-1 rounded-lg text-xs font-semibold transition-colors',
                tab === t ? 'bg-[#00a884] text-white' : 'text-gray-500 hover:bg-gray-200',
              )}
            >{label}</button>
          ))}
        </div>
        <button onClick={onClose} className="text-[#54656f] hover:text-[#111b21] ml-1"><X className="h-4 w-4" /></button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* ── PERFIL TAB ── */}
        {tab === 'perfil' && (
          <div className="p-4 space-y-4">
            {/* Contact info */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
              <Avatar chat={chat} size="lg" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{formatChatName(chat)}</p>
                <p className="text-xs text-gray-500">+{chat.number}</p>
                <p className="text-[11px] text-gray-400 capitalize">{chat.type}</p>
              </div>
            </div>

            {/* Linked client */}
            {client ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Cliente MARAL</p>
                  <button
                    onClick={() => navigate(`/clientes/${client.id}`)}
                    className="flex items-center gap-1 text-[10px] text-[#00a884] hover:underline font-medium"
                  >
                    Ver ficha <ExternalLink className="h-2.5 w-2.5" />
                  </button>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 space-y-2">
                  <p className="text-sm font-semibold text-gray-900">{client.name}</p>
                  {client.company && <p className="text-xs text-gray-500">{client.company}</p>}
                  {client.category && (
                    <span className="inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                      {client.category}
                    </span>
                  )}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="text-center rounded-lg bg-white border border-emerald-100 py-2">
                      <p className="text-base font-bold text-emerald-700">{client.orderCount ?? 0}</p>
                      <p className="text-[9px] text-gray-400 uppercase">Pedidos</p>
                    </div>
                    <div className="text-center rounded-lg bg-white border border-emerald-100 py-2">
                      <p className="text-base font-bold text-emerald-700">{client.quotationCount ?? 0}</p>
                      <p className="text-[9px] text-gray-400 uppercase">Cotizaciones</p>
                    </div>
                  </div>
                  {client.lifetimeValue != null && Number(client.lifetimeValue) > 0 && (
                    <div className="rounded-lg bg-white border border-emerald-100 px-3 py-2">
                      <p className="text-[9px] text-gray-400 uppercase">Valor histórico</p>
                      <p className="text-sm font-bold text-emerald-700">
                        ${Number(client.lifetimeValue).toLocaleString()}
                      </p>
                    </div>
                  )}
                  <div className="space-y-1 pt-1">
                    {client.phone && (
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Phone className="h-3 w-3 shrink-0" /><span className="truncate">{client.phone}</span>
                      </div>
                    )}
                    {client.email && (
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Mail className="h-3 w-3 shrink-0" /><span className="truncate">{client.email}</span>
                      </div>
                    )}
                    {client.city && (
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <MapPin className="h-3 w-3 shrink-0" /><span className="truncate">{client.city}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-200 p-3 text-center space-y-1">
                <p className="text-xs text-gray-400">No vinculado a cliente MARAL</p>
                <button onClick={() => navigate('/clientes')} className="text-[11px] text-[#00a884] hover:underline">
                  Buscar cliente →
                </button>
              </div>
            )}

            {/* Pre-cotizar */}
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Cotización rápida</p>
              <button
                onClick={onPreQuote}
                disabled={preQuoting}
                className="w-full flex items-center gap-3 rounded-xl border border-[#00a884]/30 bg-emerald-50 px-4 py-3 text-left hover:bg-emerald-100 disabled:opacity-60 transition-colors"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#00a884] text-white">
                  {preQuoting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#111b21]">{preQuoting ? 'Analizando chat…' : 'Pre-cotizar'}</p>
                  <p className="text-[11px] text-gray-500">Extrae pedido del chat y crea cotización</p>
                </div>
              </button>

              {preQuoteResult && (
                <div className={cn('rounded-xl border p-3 space-y-2 text-xs', preQuoteResult.quotationId ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50')}>
                  {preQuoteResult.quotationId ? (
                    <>
                      <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                        <CheckCircle className="h-3.5 w-3.5" />Cotización #{preQuoteResult.quotationNumber} creada
                      </div>
                      <p className="text-emerald-600">Cliente: {preQuoteResult.clientName}</p>
                      <div className="space-y-1">
                        {preQuoteResult.matchedItems.map((it, i) => (
                          <p key={i} className="text-gray-600">• {it.qty}x {it.description}</p>
                        ))}
                      </div>
                      {preQuoteResult.unmatchedItems.length > 0 && (
                        <div className="border-t border-emerald-200 pt-2 space-y-1">
                          <p className="flex items-center gap-1 text-amber-600 font-medium"><AlertCircle className="h-3 w-3" />Agregar manualmente:</p>
                          {preQuoteResult.unmatchedItems.map((it, i) => (
                            <p key={i} className="text-gray-500">• {it.qty}x {it.description}</p>
                          ))}
                        </div>
                      )}
                      <button
                        onClick={() => navigate(`/cotizaciones/${preQuoteResult.quotationId}/editar`)}
                        className="w-full mt-1 rounded-lg bg-[#00a884] py-1.5 text-white font-medium hover:bg-[#009c7a] transition-colors"
                      >
                        Abrir cotización →
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-1.5 text-amber-700 font-semibold">
                        <Info className="h-3.5 w-3.5" />{preQuoteResult.clientFound ? 'Productos no encontrados' : 'Cliente no encontrado'}
                      </div>
                      <p className="text-gray-600">{preQuoteResult.message}</p>
                      {preQuoteResult.parsed?.items?.length > 0 && (
                        <div className="space-y-1">
                          <p className="font-medium text-gray-500">Detectado en chat:</p>
                          {preQuoteResult.parsed.items.map((it, i) => (
                            <p key={i} className="text-gray-500">• {it.qty}x {it.description}</p>
                          ))}
                        </div>
                      )}
                      <button onClick={() => navigate('/cotizaciones/nueva')} className="w-full mt-1 rounded-lg bg-amber-500 py-1.5 text-white font-medium hover:bg-amber-600 transition-colors">
                        Crear manualmente →
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Lista de precios */}
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Herramientas</p>
              <button
                onClick={() => {
                  const text = `📋 *Lista de precios MARAL — Distribuidor*\n\n*Antenas handy/portátil:*\n501/502 Motorola-ICOM VHF: $14.765 IVA inc\n503 Kenwood VHF: $18.331\n503-H/504 Hytera-Yaesu VHF: $21.791\n505 Mototrbo VHF: $32.758\n\n*Antenas móvil VHF:*\n101 1/4 onda: $27.818\n103 Maxrad 5/8 3dB: $58.667\n103-R Maxrad resorte: $89.161\n\n*Antenas móvil UHF:*\n105 Maxrad 7/8 5dB: $65.028\n105-R Maxrad resorte: $94.867\n\n*Bases:*\n201 Perforar: $17.534 | 301 Uña cromada: $34.981\n307 Magnética: $48.503 | 307-R Magnética reforzada: $59.441\n\n*Kits antena+base:*\nK-23 5/8 VHF + Uña: $91.886\nK 103-M Maxrad VHF + Magnética: $147.060\nK 105-M Maxrad UHF + Magnética: $138.254\n\n_Precios más IVA. Descuento 26% distribuidor ya aplicado._`
                  navigator.clipboard.writeText(text).then(() => toast.success('Lista copiada'))
                }}
                className="w-full flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-left hover:bg-gray-100 transition-colors"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white">
                  <Tag className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#111b21]">Copiar lista de precios</p>
                  <p className="text-[11px] text-gray-500">Resumen para enviar al cliente</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* ── ANALÍTICA TAB ── */}
        {tab === 'analitica' && (
          <div className="p-4 space-y-4">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Estadísticas del chat</p>
            {!analytics ? (
              <p className="text-xs text-gray-400 text-center py-8">Sin mensajes para analizar</p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-center">
                    <p className="text-xl font-bold text-gray-800">{analytics.total}</p>
                    <p className="text-[9px] text-gray-400 uppercase">Total mens.</p>
                  </div>
                  <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-center">
                    <p className="text-xl font-bold text-blue-700">{analytics.fromClient}</p>
                    <p className="text-[9px] text-gray-400 uppercase">Del cliente</p>
                  </div>
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-center">
                    <p className="text-xl font-bold text-emerald-700">{analytics.fromUs}</p>
                    <p className="text-[9px] text-gray-400 uppercase">Enviados</p>
                  </div>
                  <div className="rounded-xl border border-purple-100 bg-purple-50 p-3 text-center">
                    <p className="text-xl font-bold text-purple-700">{analytics.totalMedia}</p>
                    <p className="text-[9px] text-gray-400 uppercase">Archivos</p>
                  </div>
                </div>

                {analytics.avgResponse !== null && (
                  <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 flex items-center gap-3">
                    <Clock className="h-5 w-5 text-amber-600 shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-amber-800">
                        {analytics.avgResponse < 60
                          ? `${analytics.avgResponse} min`
                          : `${Math.round(analytics.avgResponse / 60)}h`}
                      </p>
                      <p className="text-[10px] text-amber-600">Tiempo de respuesta promedio</p>
                    </div>
                  </div>
                )}

                {analytics.detectedTopics.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-3.5 w-3.5 text-gray-400" />
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Temas detectados</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {analytics.detectedTopics.map(t => (
                        <span key={t} className="rounded-full bg-indigo-100 px-2.5 py-1 text-[11px] font-medium text-indigo-700">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Conversion ratio */}
                {analytics.fromClient > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <BarChart2 className="h-3.5 w-3.5 text-gray-400" />
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Ratio respuesta</p>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all"
                        style={{ width: `${Math.min((analytics.fromUs / analytics.fromClient) * 100, 100)}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-gray-400">
                      {analytics.fromUs} respuestas por {analytics.fromClient} mensajes recibidos
                    </p>
                  </div>
                )}

                {/* Sales opportunity hint */}
                {client && (
                  <div className={cn(
                    'rounded-xl border p-3 space-y-1',
                    (client.orderCount ?? 0) === 0 ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50',
                  )}>
                    <div className="flex items-center gap-1.5">
                      {(client.orderCount ?? 0) === 0
                        ? <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                        : <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />}
                      <p className="text-xs font-semibold text-gray-700">
                        {(client.orderCount ?? 0) === 0 ? 'Oportunidad de venta' : 'Cliente activo'}
                      </p>
                    </div>
                    <p className="text-[11px] text-gray-500">
                      {(client.orderCount ?? 0) === 0
                        ? 'Este contacto aún no tiene pedidos. Ideal para ofrecer productos.'
                        : `${client.orderCount} pedido(s) registrado(s). Seguimiento de recompra.`}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── ARCHIVOS TAB ── */}
        {tab === 'archivos' && (
          <div className="p-4 space-y-4">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Archivos compartidos</p>
            {mediaItems.length === 0 ? (
              <div className="text-center py-10 space-y-2">
                <Image className="h-8 w-8 text-gray-200 mx-auto" />
                <p className="text-xs text-gray-400">Sin archivos en este chat</p>
              </div>
            ) : (
              <>
                {/* Images grid */}
                {mediaItems.filter(m => m.type === 'image').length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase">Imágenes</p>
                    <div className="grid grid-cols-3 gap-1">
                      {mediaItems.filter(m => m.type === 'image').map(m => (
                        <img
                          key={m.id}
                          src={`${BASE_URL}/api/whatsapp/media/${m.id}`}
                          alt=""
                          className="aspect-square rounded-lg object-cover cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => window.open(`${BASE_URL}/api/whatsapp/media/${m.id}`, '_blank')}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Documents list */}
                {mediaItems.filter(m => m.type === 'document').length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase">Documentos</p>
                    <div className="space-y-1">
                      {mediaItems.filter(m => m.type === 'document').map(m => (
                        <a
                          key={m.id}
                          href={`${BASE_URL}/api/whatsapp/media/${m.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 hover:bg-gray-100 transition-colors"
                        >
                          <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                          <span className="text-xs text-gray-700 truncate flex-1">{m.fileName ?? 'Documento'}</span>
                          <Download className="h-3 w-3 text-gray-400 shrink-0" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Chat view ────────────────────────────────────────────────

function ChatView({ chat, token }: { chat: WaChat; token: string }) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const qc = useQueryClient()
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set())
  const [overrideSuggestion, setOverrideSuggestion] = useState<string | null>(null)
  const [manualSuggestion, setManualSuggestion] = useState<string | null>(null)
  const [manualLoading, setManualLoading] = useState(false)
  const [showRightPanel, setShowRightPanel] = useState(true)
  const [preQuoting, setPreQuoting] = useState(false)
  const [preQuoteResult, setPreQuoteResult] = useState<Awaited<ReturnType<typeof whatsappApi.preQuote>>['data'] | null>(null)
  const [isError, setIsError] = useState(false)

  const STORAGE_KEY = `wa-suggestion-${chat.jid}`

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['wa-chat', chat.jid],
    queryFn: () => whatsappApi.getChat(chat.jid),
    refetchInterval: 3000,
    retry: 2,
    staleTime: 1000,
  })

  useEffect(() => {
    if (error) setIsError(true)
    else setIsError(false)
  }, [error])

  // Load persisted suggestion from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) setManualSuggestion(saved)
    else setManualSuggestion(null)
    setManualLoading(false)
    setOverrideSuggestion(null)
    setDismissedSuggestions(new Set())
    setPreQuoteResult(null)
  }, [chat.jid])

  // Mark as read
  useEffect(() => {
    if (chat.unread > 0) {
      whatsappApi.markRead(chat.jid).catch(() => {})
      qc.setQueryData(['wa-chats'], (old: { data: { data: WaChat[] } } | undefined) => {
        if (!old) return old
        return { ...old, data: { ...old.data, data: old.data.data.map(c => c.jid === chat.jid ? { ...c, unread: 0, unanswered: false } : c) } }
      })
    }
  }, [chat.jid])

  const messages: WaMessage[] = data?.data.messages ?? []

  const lastClientMessage = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i]
      if (m.fromMe) return null
      if ((m.type === 'text' || m.type === 'other') && m.text) return m
    }
    return null
  })()

  const autoSuggestion = (() => {
    if (overrideSuggestion !== null) return null
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i]
      if (m.fromMe) break
      if (m.aiSuggestion && !dismissedSuggestions.has(m.id)) return { messageId: m.id, text: m.aiSuggestion }
    }
    return null
  })()

  const activeSuggestion = autoSuggestion?.text ?? manualSuggestion
  const showQuickAsk = !activeSuggestion && !overrideSuggestion && !!lastClientMessage && !manualLoading

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const requestSuggestion = async () => {
    if (!lastClientMessage?.text || manualLoading) return
    setManualLoading(true)
    try {
      const ctx = messages.slice(-12).filter(m => (m.type === 'text' || m.type === 'other') && m.text).map(m => ({ role: (m.fromMe ? 'lady' : 'cliente') as 'lady' | 'cliente', text: m.text as string }))
      const res = await whatsappApi.suggest({ newMessage: lastClientMessage.text, context: ctx, clientName: chat.name })
      if (res.data.suggestion?.trim()) {
        setManualSuggestion(res.data.suggestion)
        localStorage.setItem(STORAGE_KEY, res.data.suggestion)
      } else {
        toast.error('Lady no generó respuesta, intenta de nuevo')
      }
    } catch (err) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      toast.error(msg ?? 'Error generando sugerencia')
    } finally {
      setManualLoading(false)
    }
  }

  const sendDirectMutation = useMutation({
    mutationFn: (text: string) => whatsappApi.send({ jid: chat.jid, type: 'text', text: text.trim() }),
    onSuccess: () => {
      setManualSuggestion(null)
      localStorage.removeItem(STORAGE_KEY)
      if (autoSuggestion) setDismissedSuggestions(prev => new Set([...prev, autoSuggestion.messageId]))
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
    localStorage.removeItem(STORAGE_KEY)
    if (autoSuggestion) setDismissedSuggestions(prev => new Set([...prev, autoSuggestion.messageId]))
  }

  const handleDismissSuggestion = () => {
    if (autoSuggestion) setDismissedSuggestions(prev => new Set([...prev, autoSuggestion.messageId]))
    setManualSuggestion(null)
    localStorage.removeItem(STORAGE_KEY)
  }

  const handlePreQuote = async () => {
    setPreQuoting(true)
    setPreQuoteResult(null)
    try {
      const res = await whatsappApi.preQuote(chat.jid)
      setPreQuoteResult(res.data)
      if (res.data.quotationId) toast.success(`Cotización #${res.data.quotationNumber} creada`)
      else toast.info(res.data.message ?? 'Revisa el panel derecho')
    } catch (err) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      toast.error(msg ?? 'Error al pre-cotizar')
    } finally {
      setPreQuoting(false)
    }
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[#f0f2f5] gap-4">
        <AlertCircle className="h-10 w-10 text-red-400" />
        <p className="text-sm text-gray-500">Error cargando mensajes</p>
        <button onClick={() => { setIsError(false); refetch() }} className="flex items-center gap-2 rounded-lg bg-[#00a884] px-4 py-2 text-sm text-white font-medium hover:bg-[#009c7a] transition-colors">
          <RefreshCw className="h-4 w-4" /> Reintentar
        </button>
      </div>
    )
  }

  return (
    <div className="flex h-full">
      {/* Chat area */}
      <div
        className="flex flex-col flex-1 min-w-0 bg-[#efeae2]"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d9d0c7' fill-opacity='0.3'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-2.5 bg-[#f0f2f5] border-b border-gray-200 shrink-0">
          <Avatar chat={chat} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{formatChatName(chat)}</p>
            <p className="text-xs text-gray-500 truncate">{chat.type === 'grupo' ? 'Grupo' : `+${chat.number}`}</p>
          </div>
          <button
            onClick={() => setShowRightPanel(v => !v)}
            title={showRightPanel ? 'Cerrar panel' : 'Abrir panel'}
            className={cn('rounded-full p-2 transition-colors', showRightPanel ? 'bg-[#00a884] text-white' : 'text-[#54656f] hover:bg-gray-200')}
          >
            {showRightPanel ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1.5">
          {isLoading && (
            <div className="flex justify-center py-8"><RefreshCw className="h-5 w-5 animate-spin text-gray-400" /></div>
          )}
          {messages.map(msg => (
            <MessageBubble key={msg.id} msg={msg} token={token} />
          ))}
          {/* Ghost suggestion inline */}
          {activeSuggestion && overrideSuggestion === null && (
            <GhostSuggestion
              text={activeSuggestion}
              isSending={sendDirectMutation.isPending}
              isRegenerating={manualLoading}
              onSend={(t) => sendDirectMutation.mutate(t)}
              onEdit={handleEditSuggestion}
              onRegenerate={requestSuggestion}
              onDismiss={handleDismissSuggestion}
            />
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick ask Lady */}
        {showQuickAsk && (
          <QuickAskLadyBar isLoading={manualLoading} onRequest={requestSuggestion} />
        )}
        {manualLoading && !activeSuggestion && (
          <QuickAskLadyBar isLoading={true} onRequest={requestSuggestion} />
        )}

        {/* Send bar */}
        {overrideSuggestion !== null ? (
          <SuggestionConfirmBar
            suggestion={overrideSuggestion}
            chat={chat}
            onSent={() => { setOverrideSuggestion(null); qc.invalidateQueries({ queryKey: ['wa-chat', chat.jid] }) }}
            onCancel={() => setOverrideSuggestion(null)}
          />
        ) : (
          <SendBar chat={chat} onSent={() => qc.invalidateQueries({ queryKey: ['wa-chat', chat.jid] })} />
        )}
      </div>

      {/* Right panel */}
      {showRightPanel && (
        <RightPanel
          chat={chat}
          messages={messages}
          onClose={() => setShowRightPanel(false)}
          onPreQuote={handlePreQuote}
          preQuoting={preQuoting}
          preQuoteResult={preQuoteResult}
        />
      )}
    </div>
  )
}

// ─── Chat list item ───────────────────────────────────────────

function ChatItem({ chat, selected, onClick }: { chat: WaChat; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn('w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-gray-100', selected ? 'bg-[#f0f2f5]' : 'hover:bg-[#f5f6f6]')}
    >
      <div className="relative shrink-0">
        <Avatar chat={chat} />
        {chat.unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#25d366] text-white text-[9px] font-bold px-0.5">
            {chat.unread > 99 ? '99+' : chat.unread}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1 mb-0.5">
          <div className="min-w-0">
            <span className="text-sm font-medium text-[#111b21] truncate block">{formatChatName(chat)}</span>
            {chat.clientName && chat.clientName !== chat.name && (
              <span className="flex items-center gap-0.5 text-[10px] text-blue-600 leading-none -mt-0.5 truncate">
                <Building2 className="h-2.5 w-2.5 shrink-0" />{chat.clientName}
              </span>
            )}
          </div>
          <span className={cn('text-[11px] shrink-0', chat.unanswered ? 'text-[#25d366] font-semibold' : 'text-[#667781]')}>
            {formatTime(chat.lastTimestamp)}
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
          {chat.temperature === 'HOT' && (
            <span className="text-[10px] font-bold text-red-500">🔥 HOT</span>
          )}
          {chat.temperature === 'WARM' && (
            <span className="text-[10px] font-bold text-amber-500">🌡 WARM</span>
          )}
          {chat.clientCategory && (
            <span className={cn(
              'text-[9px] font-bold px-1.5 py-0.5 rounded-full',
              chat.clientCategory === 'IM' ? 'bg-purple-100 text-purple-700' :
              chat.clientCategory === 'DS' ? 'bg-blue-100 text-blue-700' :
              'bg-gray-100 text-gray-600',
            )}>
              {chat.clientCategory}
            </span>
          )}
          <span className="text-[10px] text-[#667781]">+{chat.number}</span>
        </div>
        <p className={cn('text-[13px] truncate', chat.unanswered ? 'text-[#111b21] font-medium' : 'text-[#667781]')}>
          {chat.lastMessage || '—'}
        </p>
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
      <h3 className="text-2xl font-semibold text-[#41525d] mb-2">WhatsApp + Lady IA</h3>
      <p className="text-sm text-[#667781] max-w-sm mb-6">Selecciona una conversación. Lady sugiere respuestas comerciales con el tono de MARAL — listas para enviar en un clic.</p>
      <div className="grid grid-cols-3 gap-4 max-w-md text-center">
        <div><p className="text-2xl font-bold text-emerald-600">3×</p><p className="text-[10px] text-gray-500 uppercase tracking-wide">Más rápido</p></div>
        <div><p className="text-2xl font-bold text-emerald-600">24/7</p><p className="text-[10px] text-gray-500 uppercase tracking-wide">Disponible</p></div>
        <div><p className="text-2xl font-bold text-emerald-600">+$$</p><p className="text-[10px] text-gray-500 uppercase tracking-wide">Cierre ventas</p></div>
      </div>
    </div>
  )
}

// ─── Settings panel ───────────────────────────────────────────

function SettingsPanel({ onClose }: { onClose: () => void }) {
  const [webhookUrl, setWebhookUrl] = useState('')
  const [importing, setImporting] = useState(false)
  const [configuring, setConfiguring] = useState(false)

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center gap-3 px-4 py-3 bg-[#f0f2f5] border-b border-gray-200">
        <button onClick={onClose} className="text-[#54656f] hover:text-[#111b21]"><X className="h-5 w-5" /></button>
        <h2 className="text-base font-semibold text-[#111b21]">Configuración WhatsApp</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">Importar historial</h3>
          <p className="text-xs text-gray-500">Carga todos los mensajes del export local a la base de datos. Solo es necesario hacerlo una vez.</p>
          <button
            onClick={async () => {
              setImporting(true)
              try { const res = await whatsappApi.importHistory(); toast.success(`Importados ${res.data.imported} mensajes`) }
              catch { toast.error('Error importando historial') }
              finally { setImporting(false) }
            }}
            disabled={importing}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {importing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {importing ? 'Importando...' : 'Importar desde export'}
          </button>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">Configurar webhook</h3>
          <p className="text-xs text-gray-500">URL pública del backend para recibir mensajes en tiempo real de Evolution API.</p>
          <input
            type="url"
            value={webhookUrl}
            onChange={e => setWebhookUrl(e.target.value)}
            placeholder="https://tu-backend.com/api/whatsapp/webhook"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={async () => {
              if (!webhookUrl.trim()) return
              setConfiguring(true)
              try { await whatsappApi.configureWebhook(webhookUrl.trim()); toast.success('Webhook configurado') }
              catch { toast.error('Error configurando webhook') }
              finally { setConfiguring(false) }
            }}
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

type ChatFilter = 'todos' | 'sinleer' | 'hot' | 'grupos'

export default function Whatsapp() {
  const [selectedChat, setSelectedChat] = useState<WaChat | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<ChatFilter>('todos')
  const [searchParams] = useSearchParams()
  const jid = searchParams.get('jid')
  const token = useAuthStore((s) => s.token) ?? ''

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['wa-chats'],
    queryFn: () => whatsappApi.getChats(),
    refetchInterval: 5000,
    retry: 2,
    staleTime: 2000,
  })

  const allChats: WaChat[] = data?.data.data ?? []

  const chats = allChats.filter(c => {
    // filter by tab
    if (filter === 'grupos' && c.type !== 'grupo') return false
    if (filter === 'sinleer' && (!c.unread || c.unread === 0)) return false
    if (filter === 'hot' && c.temperature !== 'HOT') return false
    if (filter === 'todos' && c.type === 'grupo') return false
    // search
    if (search) {
      const q = search.toLowerCase()
      return formatChatName(c).toLowerCase().includes(q) || c.number.includes(q) || (c.lastMessage ?? '').toLowerCase().includes(q)
    }
    return true
  })

  const totalUnread = allChats.filter(c => c.type !== 'grupo').reduce((sum, c) => sum + (c.unread ?? 0), 0)
  const gruposUnread = allChats.filter(c => c.type === 'grupo').reduce((sum, c) => sum + (c.unread ?? 0), 0)
  const configured = data?.data.configured ?? true

  useEffect(() => {
    if (jid && allChats.length) {
      const target = allChats.find(c => c.jid === jid)
      if (target) setSelectedChat(target)
    }
  }, [jid, allChats.length])

  useEffect(() => {
    if (selectedChat && allChats.length) {
      const updated = allChats.find(c => c.jid === selectedChat.jid)
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
            className={cn('rounded-full p-2 transition-colors', showSettings ? 'bg-gray-200 text-[#111b21]' : 'text-[#54656f] hover:bg-gray-100')}
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

        {/* Stats bar */}
        <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-200 bg-white shrink-0">
          <div className="px-3 py-2 text-center">
            <p className="text-base font-bold text-[#111b21]">{allChats.length}</p>
            <p className="text-[9px] text-gray-400 uppercase tracking-wide">Total</p>
          </div>
          <div className="px-3 py-2 text-center">
            <p className="text-base font-bold text-amber-500">{allChats.filter(c => c.unanswered).length}</p>
            <p className="text-[9px] text-gray-400 uppercase tracking-wide">Sin resp.</p>
          </div>
          <div className="px-3 py-2 text-center">
            <p className="text-base font-bold text-red-500">{allChats.filter(c => c.temperature === 'HOT').length}</p>
            <p className="text-[9px] text-gray-400 uppercase tracking-wide">Hot</p>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex border-b border-gray-100 bg-white shrink-0">
          {([
            ['todos', 'Chats', totalUnread],
            ['sinleer', 'Sin leer', allChats.filter(c => c.type !== 'grupo' && c.unread > 0).length],
            ['hot', '🔥 Hot', allChats.filter(c => c.temperature === 'HOT').length],
            ['grupos', 'Grupos', gruposUnread],
          ] as [ChatFilter, string, number][]).map(([f, label, count]) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'flex-1 py-2.5 text-xs font-semibold transition-colors border-b-2 relative',
                filter === f ? 'border-[#00a884] text-[#00a884]' : 'border-transparent text-[#667781] hover:text-[#111b21]',
              )}
            >
              {label}
              {count > 0 && (
                <span className="ml-1 inline-flex items-center justify-center h-4 min-w-4 rounded-full bg-[#25d366] text-white text-[9px] font-bold px-0.5">
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Chat list */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && <div className="flex justify-center py-10"><RefreshCw className="h-5 w-5 animate-spin text-gray-300" /></div>}

          {isError && (
            <div className="p-6 text-center space-y-3">
              <AlertCircle className="h-8 w-8 text-red-300 mx-auto" />
              <p className="text-xs text-gray-400">Error cargando chats</p>
              <button onClick={() => refetch()} className="text-xs text-[#00a884] hover:underline">Reintentar</button>
            </div>
          )}

          {!isLoading && !isError && !configured && (
            <div className="p-6 text-center space-y-2">
              <p className="text-sm text-gray-500">No hay mensajes aún</p>
              <p className="text-xs text-gray-400">Importa el historial o configura el webhook.</p>
              <button onClick={() => setShowSettings(true)} className="mt-2 text-xs text-blue-600 hover:underline">Abrir configuración</button>
            </div>
          )}

          {!isLoading && !isError && configured && chats.length === 0 && (
            <div className="p-4 text-center text-sm text-gray-400">
              {search ? 'Sin resultados' : filter === 'sinleer' ? 'Todo leído ✓' : filter === 'grupos' ? 'Sin grupos' : 'No hay conversaciones'}
            </div>
          )}

          {chats.map(chat => (
            <ChatItem
              key={chat.jid}
              chat={chat}
              selected={!showSettings && selectedChat?.jid === chat.jid}
              onClick={() => { setSelectedChat(chat); setShowSettings(false) }}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-gray-100 bg-[#f0f2f5]">
          <p className="text-[10px] text-[#8696a0]">
            {data?.data.total ?? 0} conversaciones · {allChats.filter(c => c.unanswered).length} sin responder
          </p>
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 min-w-0">
        {showSettings ? (
          <SettingsPanel onClose={() => setShowSettings(false)} />
        ) : selectedChat ? (
          <ChatView key={selectedChat.jid} chat={selectedChat} token={token} />
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  )
}
