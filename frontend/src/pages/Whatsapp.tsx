import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { whatsappApi } from '../lib/api'
import type { WaChat, WaMessage } from '../types'
import {
  MessageCircle,
  Send,
  Copy,
  Check,
  Sparkles,
  Search,
  ChevronRight,
  Users,
  User,
  RefreshCw,
} from 'lucide-react'
import { cn } from '../lib/utils'
import { toast } from 'sonner'

// ─── Helpers ─────────────────────────────────────────────────

function formatTime(ts: string) {
  const d = new Date(ts)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000)
  if (diffDays === 0) return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
  if (diffDays === 1) return 'ayer'
  if (diffDays < 7) return d.toLocaleDateString('es-CO', { weekday: 'short' })
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
}

function formatChatName(chat: WaChat) {
  if (chat.name && chat.name !== chat.number) return chat.name
  return `+${chat.number.replace('57', '')} (Col)`
}

function getInitial(name: string) {
  return name.charAt(0).toUpperCase()
}

function isMedia(text: string) {
  return text.startsWith('[') && text.endsWith(']')
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

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-gray-100',
        selected ? 'bg-blue-50' : 'hover:bg-gray-50'
      )}
    >
      <div className={cn(
        'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white text-sm font-bold',
        isGroup ? 'bg-emerald-500' : 'bg-blue-500'
      )}>
        {isGroup ? <Users className="h-5 w-5" /> : getInitial(name)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-gray-900 truncate">{name}</span>
          <span className="text-[10px] text-gray-400 shrink-0">{formatTime(chat.lastTimestamp)}</span>
        </div>
        <p className={cn(
          'text-xs truncate mt-0.5',
          chat.unanswered ? 'text-gray-900 font-medium' : 'text-gray-400'
        )}>
          {chat.fromMeLast && <span className="text-blue-400">Tú: </span>}
          {chat.lastMessage || '—'}
        </p>
      </div>
      {chat.unanswered && (
        <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
      )}
    </button>
  )
}

// ─── Message bubble ───────────────────────────────────────────

function MessageBubble({ msg }: { msg: WaMessage }) {
  const isMe = msg.from_me
  const isMediaMsg = isMedia(msg.text)

  return (
    <div className={cn('flex', isMe ? 'justify-end' : 'justify-start')}>
      <div className={cn(
        'max-w-[72%] rounded-2xl px-3.5 py-2 text-sm',
        isMe
          ? 'bg-blue-600 text-white rounded-br-sm'
          : 'bg-white text-gray-800 rounded-bl-sm shadow-sm border border-gray-100'
      )}>
        {isMediaMsg ? (
          <span className={cn('italic text-xs', isMe ? 'text-blue-200' : 'text-gray-400')}>
            {msg.text}
          </span>
        ) : (
          <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
        )}
        <p className={cn(
          'text-[10px] mt-1 text-right',
          isMe ? 'text-blue-200' : 'text-gray-400'
        )}>
          {formatTime(msg.timestamp)}
        </p>
      </div>
    </div>
  )
}

// ─── AI Suggestion panel ──────────────────────────────────────

function SuggestionPanel({
  chatName,
  messages,
}: {
  chatName: string
  messages: WaMessage[]
}) {
  const [newMsg, setNewMsg] = useState('')
  const [suggestion, setSuggestion] = useState('')
  const [copied, setCopied] = useState(false)

  const suggestMutation = useMutation({
    mutationFn: () => {
      const context = messages
        .filter(m => m.text && !isMedia(m.text))
        .slice(-12)
        .map(m => ({ role: m.from_me ? 'lady' as const : 'cliente' as const, text: m.text }))

      return whatsappApi.suggest({
        newMessage: newMsg.trim(),
        context,
        clientName: chatName !== chatName.replace(/\D/g, '') ? chatName : undefined,
      })
    },
    onSuccess: (res) => {
      setSuggestion(res.data.suggestion)
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      toast.error(msg ?? 'Error generando sugerencia')
    },
  })

  const handleCopy = () => {
    navigator.clipboard.writeText(suggestion)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Copiado al portapapeles')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && newMsg.trim()) {
      suggestMutation.mutate()
    }
  }

  return (
    <div className="border-t border-gray-200 bg-gray-50 p-4 space-y-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
        <Sparkles className="h-3.5 w-3.5 text-blue-500" />
        Asistente Lady IA
      </div>

      <div className="space-y-2">
        <textarea
          value={newMsg}
          onChange={(e) => setNewMsg(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Pega aquí el mensaje del cliente..."
          rows={3}
          className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          onClick={() => suggestMutation.mutate()}
          disabled={!newMsg.trim() || suggestMutation.isPending}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {suggestMutation.isPending ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {suggestMutation.isPending ? 'Generando...' : 'Sugerir respuesta'}
          <span className="ml-1 text-blue-300 text-xs font-normal hidden sm:inline">Ctrl+Enter</span>
        </button>
      </div>

      {suggestion && (
        <div className="rounded-xl bg-white border border-emerald-200 p-3.5 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap flex-1">{suggestion}</p>
            <button
              onClick={handleCopy}
              className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              title="Copiar"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 font-medium">
            <Sparkles className="h-3 w-3" />
            Sugerencia de Lady IA — revisa antes de enviar
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Chat view ────────────────────────────────────────────────

function ChatView({ chat }: { chat: WaChat }) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const name = formatChatName(chat)

  const { data, isLoading } = useQuery({
    queryKey: ['wa-chat', chat.number],
    queryFn: () => whatsappApi.getChat(chat.number),
    staleTime: 30_000,
  })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [data])

  const messages = data?.data.messages ?? []

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white">
        <div className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white text-sm font-bold',
          chat.type === 'grupo' ? 'bg-emerald-500' : 'bg-blue-500'
        )}>
          {chat.type === 'grupo' ? <Users className="h-4 w-4" /> : getInitial(name)}
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">{name}</p>
          <p className="text-xs text-gray-400">
            {chat.messageCount} mensajes · {chat.type === 'grupo' ? 'Grupo' : `+${chat.number}`}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 bg-[#F0F4F8]">
        {isLoading && (
          <div className="flex justify-center py-8">
            <RefreshCw className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.message_id} msg={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* AI Suggestion panel — only for individual chats */}
      {chat.type === 'contacto' && (
        <SuggestionPanel chatName={name} messages={messages} />
      )}
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <div className="h-16 w-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
        <MessageCircle className="h-8 w-8 text-blue-400" />
      </div>
      <h3 className="text-base font-semibold text-gray-700 mb-1">Selecciona una conversación</h3>
      <p className="text-sm text-gray-400 max-w-xs">
        Elige un chat de la lista para ver el historial y obtener sugerencias de respuesta con IA.
      </p>
    </div>
  )
}

// ─── Quick suggest (without chat context) ────────────────────

function QuickSuggest() {
  const [newMsg, setNewMsg] = useState('')
  const [clientName, setClientName] = useState('')
  const [suggestion, setSuggestion] = useState('')
  const [copied, setCopied] = useState(false)

  const suggestMutation = useMutation({
    mutationFn: () =>
      whatsappApi.suggest({
        newMessage: newMsg.trim(),
        clientName: clientName.trim() || undefined,
      }),
    onSuccess: (res) => setSuggestion(res.data.suggestion),
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      toast.error(msg ?? 'Error generando sugerencia')
    },
  })

  const handleCopy = () => {
    navigator.clipboard.writeText(suggestion)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Copiado al portapapeles')
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-100">
          <Sparkles className="h-4 w-4 text-purple-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">Sugerencia rápida</p>
          <p className="text-xs text-gray-400">Sin contexto de historial</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-[#F0F4F8] flex items-center justify-center">
        <div className="w-full max-w-lg space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                Nombre del cliente (opcional)
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Don Carlos, Laura, Doña María..."
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                Mensaje del cliente
              </label>
              <textarea
                value={newMsg}
                onChange={(e) => setNewMsg(e.target.value)}
                placeholder="Escribe o pega aquí el mensaje que recibiste por WhatsApp..."
                rows={4}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              onClick={() => suggestMutation.mutate()}
              disabled={!newMsg.trim() || suggestMutation.isPending}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {suggestMutation.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {suggestMutation.isPending ? 'Generando...' : 'Sugerir respuesta de Lady'}
            </button>
          </div>

          {suggestion && (
            <div className="bg-white rounded-2xl border border-emerald-200 p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 uppercase tracking-wide">
                <Sparkles className="h-3.5 w-3.5" />
                Respuesta sugerida
              </div>
              <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{suggestion}</p>
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? '¡Copiado!' : 'Copiar texto'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────

export default function Whatsapp() {
  const [selectedChat, setSelectedChat] = useState<WaChat | null>(null)
  const [showQuick, setShowQuick] = useState(false)
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['wa-chats'],
    queryFn: () => whatsappApi.getChats(),
    staleTime: 60_000,
  })

  const chats = (data?.data.data ?? []).filter((c) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      formatChatName(c).toLowerCase().includes(q) ||
      c.number.includes(q) ||
      c.lastMessage.toLowerCase().includes(q)
    )
  })

  const configured = data?.data.configured ?? true

  return (
    <div className="flex h-[calc(100vh-4rem)] -m-6 overflow-hidden rounded-none">
      {/* Left panel — chat list */}
      <div className="flex flex-col w-80 shrink-0 border-r border-gray-200 bg-white">
        {/* Header */}
        <div className="px-4 pt-4 pb-2 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-emerald-500" />
              WhatsApp Assist
            </h1>
            <button
              onClick={() => { setShowQuick(true); setSelectedChat(null) }}
              className={cn(
                'flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors',
                showQuick
                  ? 'bg-purple-100 text-purple-700'
                  : 'text-gray-500 hover:bg-gray-100'
              )}
              title="Sugerencia rápida sin historial"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Rápida
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar conversación..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg bg-gray-100 pl-9 pr-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <div className="p-4 text-center">
              <p className="text-sm text-gray-500 mb-1">Export no configurado</p>
              <p className="text-xs text-gray-400">
                Configura <code className="bg-gray-100 px-1 rounded">WHATSAPP_EXPORT_PATH</code> en el backend
              </p>
            </div>
          )}

          {!isLoading && configured && chats.length === 0 && (
            <div className="p-4 text-center text-sm text-gray-400">
              {search ? 'Sin resultados' : 'No hay conversaciones'}
            </div>
          )}

          {chats.map((chat) => (
            <ChatItem
              key={chat.jid}
              chat={chat}
              selected={!showQuick && selectedChat?.jid === chat.jid}
              onClick={() => {
                setSelectedChat(chat)
                setShowQuick(false)
              }}
            />
          ))}
        </div>

        {/* Stats footer */}
        {data?.data && (
          <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
            <p className="text-[10px] text-gray-400">
              {data.data.total} conversaciones · {chats.filter(c => c.unanswered).length} sin responder
            </p>
          </div>
        )}
      </div>

      {/* Right panel */}
      <div className="flex-1 min-w-0">
        {showQuick ? (
          <QuickSuggest />
        ) : selectedChat ? (
          <ChatView chat={selectedChat} />
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  )
}
