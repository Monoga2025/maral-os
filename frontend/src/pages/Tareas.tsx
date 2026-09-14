import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Trash2, Check, ClipboardList, Sparkles,
  Bell, BarChart2, ChevronDown, ChevronUp, ArrowRight, Users,
  AlertCircle, MessageSquare, Send, Smartphone, CheckCircle2, Clock, Zap
} from 'lucide-react'
import { toast } from 'sonner'
import { tasksApi } from '../lib/api'
import api from '../lib/api'
import { useAuthStore } from '../store/auth'
import { formatDate } from '../lib/utils'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { TourButton } from '../components/tour/TourButton'
import { InstallAppModal } from '../components/pwa/InstallAppModal'
import type { Task, TaskComment, TaskPriority, User } from '../types'

// ─── Helpers ─────────────────────────────────────────────────

const USER_ROLES_META: Record<string, { roleName: string; emoji: string; badgeColor: string }> = {
  GERENTE: { roleName: 'Gerencia General', emoji: '👔', badgeColor: 'bg-amber-100 text-amber-800 border-amber-200' },
  VENTAS: { roleName: 'Ventas & Mercadeo', emoji: '🎯', badgeColor: 'bg-blue-100 text-blue-800 border-blue-200' },
  LOGISTICA: { roleName: 'Producción & Logística', emoji: '⚙️', badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  CONTADORA: { roleName: 'Contabilidad', emoji: '📊', badgeColor: 'bg-purple-100 text-purple-800 border-purple-200' },
}

const AVATAR_PALETTE = [
  'bg-blue-600','bg-violet-600','bg-emerald-600','bg-orange-500',
  'bg-pink-600','bg-teal-600','bg-red-600','bg-indigo-600',
]
function avatarColor(name: string) {
  return AVATAR_PALETTE[(name.charCodeAt(0) || 0) % AVATAR_PALETTE.length]
}
function UserAvatar({ name, size = 'sm' }: { name: string; size?: 'xs' | 'sm' | 'md' | 'lg' }) {
  const dim = size === 'xs' ? 'h-5 w-5 text-[10px]' : size === 'sm' ? 'h-7 w-7 text-xs' : size === 'md' ? 'h-9 w-9 text-sm' : 'h-11 w-11 text-base'
  return (
    <div className={`flex shrink-0 items-center justify-center rounded-full font-bold text-white shadow-xs ${dim} ${avatarColor(name)}`}>
      {name[0].toUpperCase()}
    </div>
  )
}

const PRIORITY_BADGE: Record<TaskPriority, string> = {
  URGENTE: 'bg-red-100 text-red-700 border border-red-200',
  NORMAL:  'bg-blue-100 text-blue-700 border border-blue-200',
  DESPUES: 'bg-gray-100 text-gray-600 border border-gray-200',
}

const MONTHS = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]

function todayISO() { return new Date().toISOString().split('T')[0] }

function daysUntil(dateStr: string) {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
}

// ─── Analytics Panel ─────────────────────────────────────────

function AnalyticsPanel({ tasks, users }: { tasks: Task[]; users: User[] }) {
  const [open, setOpen] = useState(true)

  const stats = users.map((u) => {
    const mine = tasks.filter((t) => t.assignedTo?.id === u.id)
    const done  = mine.filter((t) => t.status === 'COMPLETADA').length
    const active = mine.filter((t) => t.status !== 'COMPLETADA' && t.status !== 'CANCELADA').length
    const total = mine.length
    const overdue = mine.filter((t) =>
      t.status !== 'COMPLETADA' && t.status !== 'CANCELADA' && t.dueDate && new Date(t.dueDate) < new Date()
    ).length
    const pct = total > 0 ? Math.round((done / total) * 100) : 0
    return { user: u, total, active, done, overdue, pct }
  }).filter((s) => s.total > 0 || true).sort((a, b) => b.active - a.active)

  return (
    <Card className="overflow-hidden border-slate-200 shadow-sm">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-5 py-3.5 bg-slate-50/70 hover:bg-slate-100/70 transition-colors border-b border-slate-100"
      >
        <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
          <BarChart2 className="h-4 w-4 text-blue-600" />
          Tablero de Seguimiento del Equipo (John, Wilson, Iván, Janet)
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>{open ? 'Ocultar métricas' : 'Ver métricas de cumplimiento'}</span>
          {open ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
        </div>
      </button>

      {open && (
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map(({ user: u, total, active, done, overdue, pct }) => {
            const meta = USER_ROLES_META[u.role] || { roleName: u.role, emoji: '👤', badgeColor: 'bg-slate-100 text-slate-700' }
            return (
              <div key={u.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <UserAvatar name={u.name} size="sm" />
                      <div>
                        <p className="text-sm font-bold text-slate-900 leading-tight">{u.name}</p>
                        <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full mt-0.5 ${meta.badgeColor}`}>
                          {meta.emoji} {meta.roleName.split(' ')[0]}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 py-2 my-1 border-y border-slate-100 text-center">
                    <div>
                      <span className="block text-xs font-bold text-slate-800">{active}</span>
                      <span className="text-[10px] text-slate-400">Activas</span>
                    </div>
                    <div>
                      <span className={`block text-xs font-bold ${overdue > 0 ? 'text-red-600' : 'text-slate-600'}`}>
                        {overdue}
                      </span>
                      <span className="text-[10px] text-slate-400">Vencidas</span>
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-emerald-600">{done}</span>
                      <span className="text-[10px] text-slate-400">Listas</span>
                    </div>
                  </div>
                </div>

                <div className="mt-2">
                  <div className="flex items-center justify-between text-[11px] mb-1 text-slate-500 font-medium">
                    <span>Cumplimiento</span>
                    <span className={`font-bold ${pct >= 75 ? 'text-emerald-600' : pct >= 40 ? 'text-amber-600' : 'text-slate-600'}`}>
                      {pct}%
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all ${pct >= 75 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-400' : 'bg-blue-500'}`}
                      style={{ width: `${Math.max(pct, total > 0 ? 5 : 0)}%` }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}

// ─── Overdue Banner ───────────────────────────────────────────

function OverdueBanner({ tasks }: { tasks: Task[] }) {
  const urgent = tasks.filter((t) =>
    (t.priority === 'URGENTE' && t.status === 'PENDIENTE') ||
    (t.dueDate && daysUntil(t.dueDate) < 0 && t.status !== 'COMPLETADA' && t.status !== 'CANCELADA')
  )
  if (urgent.length === 0) return null

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50/80 px-4 py-3 shadow-xs">
      <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-red-900">
          {urgent.length === 1 ? 'Tienes 1 tarea prioritaria o vencida' : `Tienes ${urgent.length} tareas prioritarias o vencidas`}
        </p>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {urgent.slice(0, 4).map((t) => (
            <span key={t.id} className="text-xs bg-red-100/90 text-red-800 rounded-lg px-2.5 py-0.5 font-medium border border-red-200">
              {t.title.length > 35 ? t.title.slice(0, 35) + '…' : t.title}
            </span>
          ))}
          {urgent.length > 4 && <span className="text-xs text-red-600 font-semibold">+{urgent.length - 4} más</span>}
        </div>
      </div>
    </div>
  )
}

// ─── Kanban Card ─────────────────────────────────────────────

function CommentThread({
  comments, taskId, onAdd, currentUserId,
}: {
  comments: TaskComment[]
  taskId: string
  onAdd: (taskId: string, body: string) => void
  currentUserId: string
}) {
  const [text, setText] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  const submit = () => {
    const trimmed = text.trim()
    if (!trimmed) return
    onAdd(taskId, trimmed)
    setText('')
  }

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comments.length])

  return (
    <div className="mt-2.5 border-t border-gray-100 pt-2.5">
      {comments.length > 0 && (
        <div className="space-y-1.5 mb-2 max-h-36 overflow-y-auto pr-1">
          {comments.map((c) => {
            const isMe = c.user?.id === currentUserId
            return (
              <div key={c.id} className={`flex gap-1.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                <div className={`flex-shrink-0 h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white ${avatarColor(c.user?.name ?? '?')}`}>
                  {(c.user?.name ?? '?')[0].toUpperCase()}
                </div>
                <div className={`max-w-[80%] rounded-xl px-2.5 py-1.5 text-[11px] leading-snug shadow-xs ${isMe ? 'bg-blue-600 text-white rounded-tr-xs' : 'bg-gray-100 text-gray-800 rounded-tl-xs'}`}>
                  {c.body}
                  <span className={`block text-[9px] mt-0.5 ${isMe ? 'text-blue-200' : 'text-gray-400'}`}>
                    {new Date(c.createdAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            )
          })}
          <div ref={endRef} />
        </div>
      )}
      <div className="flex items-center gap-1.5">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Escribir avance o nota..."
          className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs focus:border-blue-400 focus:bg-white focus:outline-none"
        />
        <button
          onClick={submit}
          disabled={!text.trim()}
          className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-600 text-white disabled:opacity-40 hover:bg-blue-700 transition-colors shrink-0"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

function TaskCard({
  task, canDelete, onComplete, onDelete, onRemind, onAddComment, isCompleting, canRemind, currentUserId,
}: {
  task: Task
  canDelete: boolean
  onComplete: () => void
  onDelete: () => void
  onRemind: () => void
  onAddComment: (taskId: string, body: string) => void
  isCompleting: boolean
  canRemind: boolean
  currentUserId: string
}) {
  const [showComments, setShowComments] = useState(false)
  const isDone    = task.status === 'COMPLETADA' || task.status === 'CANCELADA'
  const isOverdue = !isDone && task.dueDate && daysUntil(task.dueDate) < 0
  const daysLeft  = task.dueDate ? daysUntil(task.dueDate) : null
  const commentCount = task.comments?.length ?? 0

  const handleWhatsAppDirect = () => {
    const phone = task.assignedTo?.whatsapp || task.assignedTo?.phone
    const cleanPhone = phone ? phone.replace(/\D/g, '') : ''
    const targetPhone = cleanPhone.startsWith('57') ? cleanPhone : cleanPhone ? `57${cleanPhone}` : ''
    const msg = encodeURIComponent(
      `👋 Hola ${task.assignedTo?.name || ''}, te recuerdo la tarea pendiente en MARAL OS:\n📌 *${task.title}*\n⚡ Prioridad: ${task.priority}\n📅 Fecha límite: ${task.dueDate ? formatDate(task.dueDate) : 'Pronto'}\n\n👉 Puedes completarla directamente en la App de MARAL OS.`
    )
    if (targetPhone) {
      window.open(`https://wa.me/${targetPhone}?text=${msg}`, '_blank')
    } else {
      window.open(`https://wa.me/?text=${msg}`, '_blank')
    }
  }

  return (
    <div className={`rounded-2xl border p-3.5 shadow-xs transition-all ${
      isDone
        ? 'bg-slate-50/80 border-slate-200 opacity-60'
        : isOverdue
        ? 'bg-white border-red-300 ring-1 ring-red-100 shadow-sm'
        : 'bg-white border-slate-200/90 hover:border-blue-200 hover:shadow-md'
    }`}>
      <div className="flex items-start gap-2.5">
        {/* Complete circle */}
        <button
          onClick={onComplete}
          disabled={isDone}
          title={isDone ? 'Tarea completada' : 'Marcar como completada'}
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
            isDone
              ? 'border-emerald-500 bg-emerald-500 text-white'
              : 'border-slate-300 hover:border-emerald-500 hover:bg-emerald-50 hover:scale-105'
          }`}
        >
          {isDone ? <Check className="h-3 w-3" /> : isCompleting ? <div className="h-2 w-2 border border-slate-400 rounded-full border-t-transparent animate-spin" /> : null}
        </button>

        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold leading-snug ${isDone ? 'line-through text-slate-400' : 'text-slate-900'}`}>
            {task.title}
          </p>

          {task.description && (
            <p className="mt-1 text-xs text-slate-600 leading-snug">{task.description}</p>
          )}

          {/* Asignación y badges */}
          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
            {task.assignedTo && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                <UserAvatar name={task.assignedTo.name} size="xs" />
                <span>{task.assignedTo.name.split(' ')[0]}</span>
              </span>
            )}

            {task.dueDate && !isDone && (
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                isOverdue
                  ? 'bg-red-50 text-red-700 border-red-200 font-bold'
                  : daysLeft !== null && daysLeft <= 2
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-slate-50 text-slate-600 border-slate-200'
              }`}>
                {isOverdue ? `⚠ Vencida hace ${Math.abs(daysLeft!)}d` : daysLeft === 0 ? '⏰ Hoy' : daysLeft === 1 ? '⏰ Mañana' : `📅 ${formatDate(task.dueDate)}`}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 gap-1 flex-wrap">
            {/* Direct WhatsApp notify */}
            {!isDone && (
              <button
                onClick={handleWhatsAppDirect}
                title="Notificar por WhatsApp"
                className="flex items-center gap-1 text-[11px] font-medium text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg px-2 py-1 transition-colors border border-emerald-200"
              >
                <Zap className="h-3 w-3" />
                WhatsApp
              </button>
            )}

            <div className="flex items-center gap-1 ml-auto">
              {/* Comments toggle */}
              <button
                onClick={() => setShowComments(!showComments)}
                className={`flex items-center gap-1 text-[11px] rounded-lg px-2 py-1 transition-colors border ${
                  showComments
                    ? 'bg-blue-50 text-blue-700 border-blue-200 font-semibold'
                    : 'text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                <MessageSquare className="h-3 w-3" />
                <span>{commentCount > 0 ? commentCount : 'Comentar'}</span>
              </button>

              {/* Remind button */}
              {canRemind && !isDone && (
                <button
                  onClick={onRemind}
                  title="Registrar recordatorio"
                  className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg px-2 py-1 transition-colors border border-transparent hover:border-blue-200"
                >
                  <Bell className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {/* Comment thread (expandable) */}
          {showComments && (
            <CommentThread
              comments={task.comments ?? []}
              taskId={task.id}
              onAdd={onAddComment}
              currentUserId={currentUserId}
            />
          )}
        </div>

        {/* Delete */}
        {canDelete && (
          <button onClick={onDelete} className="text-slate-300 hover:text-red-500 transition-colors shrink-0 mt-0.5" title="Eliminar tarea">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Create Form ─────────────────────────────────────────────

interface CreateForm {
  title: string
  description: string
  priority: TaskPriority
  assignedToId: string
  dueDate: string
}
const DEFAULT_FORM: CreateForm = { title: '', description: '', priority: 'NORMAL', assignedToId: '', dueDate: '' }

function CreateModal({
  onClose, onSubmit, users, currentUser, isPending, initialPriority, initialAssignedToId,
}: {
  onClose: () => void
  onSubmit: (data: CreateForm) => void
  users: User[]
  currentUser: User
  isPending: boolean
  initialPriority?: TaskPriority
  initialAssignedToId?: string
}) {
  const [form, setForm] = useState<CreateForm>({
    ...DEFAULT_FORM,
    priority: initialPriority ?? 'NORMAL',
    dueDate: todayISO(),
    assignedToId: initialAssignedToId ?? currentUser?.id ?? '',
  })
  const [aiSuggestion, setAiSuggestion] = useState<{ priority: TaskPriority; dueDays: number } | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!form.title.trim() || form.title.trim().length < 5) { setAiSuggestion(null); return }
    if (debounce.current) clearTimeout(debounce.current)
    debounce.current = setTimeout(async () => {
      try {
        setAiLoading(true)
        const r = await api.post<{ suggestions: { priority: TaskPriority; dueDays: number } | null }>(
          '/ai/autofill', { formType: 'task', field: 'title', value: form.title, context: '' }
        )
        if (r.data.suggestions) setAiSuggestion(r.data.suggestions)
      } catch { /* silent */ } finally { setAiLoading(false) }
    }, 900)
    return () => { if (debounce.current) clearTimeout(debounce.current) }
  }, [form.title])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) { toast.error('Escribe el título de la tarea'); return }
    onSubmit({ ...form, assignedToId: form.assignedToId || currentUser.id })
  }

  const assignedUser = users.find((u) => u.id === form.assignedToId) ?? currentUser

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-xs p-0 sm:p-4 animate-fade-in">
      <div className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl max-h-[92vh] overflow-y-auto border border-slate-100">
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-xs flex items-center justify-between border-b border-slate-100 px-6 py-4 rounded-t-3xl z-10">
          <div>
            <h2 className="text-base font-bold text-slate-900">Nueva Tarea de Operaciones</h2>
            <p className="text-xs text-slate-400">Asigna responsabilidades a John, Wilson, Iván o Janet</p>
          </div>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 text-xl font-light">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">¿Qué hay que hacer? *</label>
            <input
              autoFocus
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Ej: Revisar orden de taller de antenas, llamar a Meltec..."
              className="w-full rounded-2xl border-2 border-slate-200 px-4 py-3 text-sm font-semibold placeholder-slate-400 focus:border-blue-600 focus:outline-none transition-colors"
            />
            {(aiLoading || aiSuggestion) && (
              <div className="mt-2 flex items-center gap-2">
                {aiLoading && <span className="flex items-center gap-1.5 text-xs text-indigo-600"><Sparkles className="h-3.5 w-3.5 animate-pulse" />Analizando con IA...</span>}
                {!aiLoading && aiSuggestion && (
                  <button type="button" onClick={() => {
                    const d = new Date(); d.setDate(d.getDate() + aiSuggestion.dueDays)
                    setForm({ ...form, priority: aiSuggestion.priority, dueDate: d.toISOString().split('T')[0] })
                    setAiSuggestion(null)
                  }} className="flex items-center gap-1.5 rounded-full bg-indigo-50 border border-indigo-200 px-3 py-1 text-xs text-indigo-700 font-semibold hover:bg-indigo-100 transition-colors">
                    <Sparkles className="h-3 w-3" />
                    Sugerencia IA: {aiSuggestion.priority === 'URGENTE' ? '🔴 Urgente' : aiSuggestion.priority === 'NORMAL' ? '🔵 Normal' : '⚪ Después'}, en {aiSuggestion.dueDays}d — Aplicar ✓
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Detalles o instrucciones (opcional)</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Notas adicionales, requerimientos del cliente o especificaciones..."
              rows={2}
              className="w-full rounded-2xl border border-slate-200 px-3.5 py-2.5 text-xs placeholder-slate-400 focus:border-blue-500 focus:outline-none resize-none"
            />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Prioridad</label>
            <div className="grid grid-cols-3 gap-2">
              {([
                ['URGENTE', '🔴 Urgente', 'bg-red-600 text-white shadow-md shadow-red-500/20',  'border-slate-200 text-red-600 hover:bg-red-50'],
                ['NORMAL',  '🔵 Normal',  'bg-blue-600 text-white shadow-md shadow-blue-500/20', 'border-slate-200 text-blue-600 hover:bg-blue-50'],
                ['DESPUES', '⚪ Después', 'bg-slate-700 text-white shadow-md shadow-slate-700/20', 'border-slate-200 text-slate-600 hover:bg-slate-50'],
              ] as const).map(([val, label, active, inactive]) => (
                <button key={val} type="button"
                  onClick={() => setForm({ ...form, priority: val as TaskPriority })}
                  className={`rounded-xl border py-2.5 text-xs font-bold transition-all ${form.priority === val ? active + ' border-transparent' : 'bg-white ' + inactive}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Assign to */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Asignar a responsable</label>
            <div className="grid grid-cols-2 gap-2">
              {users.map((u) => {
                const selected = form.assignedToId === u.id || (!form.assignedToId && u.id === currentUser?.id)
                const meta = USER_ROLES_META[u.role] || { roleName: u.role, emoji: '👤' }
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => setForm({ ...form, assignedToId: u.id })}
                    className={`flex items-center gap-2.5 rounded-2xl border p-2.5 text-left transition-all ${
                      selected
                        ? 'border-blue-600 bg-blue-50/80 ring-2 ring-blue-500/20 shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <UserAvatar name={u.name} size="sm" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {u.name} {u.id === currentUser?.id ? '(Yo)' : ''}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate">{meta.emoji} {meta.roleName.split(' ')[0]}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Due date */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Fecha límite</label>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Hoy', days: 0 },
                { label: 'Mañana', days: 1 },
                { label: '3 días', days: 3 },
                { label: '1 semana', days: 7 },
              ].map(({ label, days }) => {
                const d = new Date(); d.setDate(d.getDate() + days)
                const iso = d.toISOString().split('T')[0]
                return (
                  <button key={label} type="button" onClick={() => setForm({ ...form, dueDate: iso })}
                    className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
                      form.dueDate === iso ? 'bg-blue-600 text-white border-transparent shadow-xs' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {label}
                  </button>
                )
              })}
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                className="rounded-xl border border-slate-200 px-3 py-1 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
              />
            </div>
            {form.dueDate && (
              <p className="mt-2 text-xs text-blue-600 font-semibold">
                📅 Vence: {new Date(form.dueDate + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending || !form.title.trim()}
              className="rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-blue-700 shadow-md shadow-blue-600/20 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              {isPending ? <><div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Guardando...</> : <>Crear Tarea <ArrowRight className="h-4 w-4" /></>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────

export default function Tareas() {
  const { user } = useAuthStore()
  const qc = useQueryClient()

  const [viewingUserId, setViewingUserId] = useState<string>('all') // Default to 'all' for complete executive visibility
  const [showModal, setShowModal] = useState(false)
  const [showAppModal, setShowAppModal] = useState(false)
  const [modalPriority, setModalPriority] = useState<TaskPriority | undefined>()

  const isGerente = user?.role === 'GERENTE'
  const canCreate = true

  const resolvedUserId = viewingUserId === 'me' ? user?.id : viewingUserId === 'all' ? undefined : viewingUserId

  const { data: allTasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ['tasks', { assignedToId: resolvedUserId }],
    queryFn: () => tasksApi.getAll({ assignedToId: resolvedUserId }).then((r) => r.data),
    staleTime: 15_000,
  })

  // Separate query for analytics — all tasks
  const { data: allTasksForStats = [] } = useQuery<Task[]>({
    queryKey: ['tasks-all-stats'],
    queryFn: () => tasksApi.getAll({}).then((r) => r.data),
    staleTime: 30_000,
  })

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['users-assignable'],
    queryFn: () => api.get<User[]>('/users/assignable').then((r) => r.data),
    staleTime: 60_000,
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['tasks'] })
    qc.invalidateQueries({ queryKey: ['tasks-all-stats'] })
  }

  const createMutation = useMutation({
    mutationFn: (data: CreateForm) => tasksApi.create({
      title: data.title.trim(),
      description: data.description.trim() || undefined,
      priority: data.priority,
      assignedToId: data.assignedToId || user!.id,
      dueDate: data.dueDate || undefined,
    }),
    onSuccess: () => { toast.success('✅ Tarea creada y asignada'); setShowModal(false); invalidate() },
    onError: () => toast.error('No se pudo crear la tarea'),
  })

  const completeMutation = useMutation({
    mutationFn: (id: string) => tasksApi.updateStatus(id, 'COMPLETADA'),
    onSuccess: () => { toast.success('¡Tarea completada con éxito! 🎉'); invalidate() },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => tasksApi.delete(id),
    onSuccess: () => { toast.success('Tarea eliminada'); invalidate() },
  })

  const remindMutation = useMutation({
    mutationFn: (id: string) => tasksApi.remind(id),
    onSuccess: () => toast.success('📲 Recordatorio registrado'),
    onError: () => toast.error('No se pudo enviar el recordatorio'),
  })

  const addCommentMutation = useMutation({
    mutationFn: ({ taskId, body }: { taskId: string; body: string }) => tasksApi.addComment(taskId, body),
    onSuccess: () => { invalidate() },
    onError: () => toast.error('No se pudo enviar el comentario'),
  })

  const canDelete = (task: Task) => user?.role === 'GERENTE' || task.createdById === user?.id
  const canRemind = (task: Task) => true

  const activeTasks = allTasks.filter((t) => t.status !== 'COMPLETADA' && t.status !== 'CANCELADA')
  const doneTasks   = allTasks.filter((t) => t.status === 'COMPLETADA')

  // Overdue / urgent
  const myOverdue = allTasks.filter((t) =>
    (viewingUserId === 'all' || t.assignedTo?.id === resolvedUserId) &&
    t.status !== 'COMPLETADA' && t.status !== 'CANCELADA' &&
    t.dueDate && new Date(t.dueDate) < new Date()
  )
  const myUrgent = allTasks.filter((t) =>
    (viewingUserId === 'all' || t.assignedTo?.id === resolvedUserId) &&
    t.priority === 'URGENTE' && t.status === 'PENDIENTE'
  )
  const reminders = [...new Set([...myOverdue, ...myUrgent].map(t => t.id))].map(id => allTasks.find(t => t.id === id)!).filter(Boolean)

  const viewingUser = viewingUserId === 'me' ? user : viewingUserId === 'all' ? null : users.find((u) => u.id === viewingUserId)

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Módulo de Tareas & Operaciones</h1>
            <span className="text-xs bg-blue-100 text-blue-800 font-bold px-2.5 py-0.5 rounded-full border border-blue-200">
              MARAL OS
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 font-medium">
            Seguimiento de responsabilidades del equipo: <strong className="text-slate-800">John Monoga (Gerencia)</strong>, <strong className="text-slate-800">Wilson (Ventas)</strong>, <strong className="text-slate-800">Iván (Producción)</strong> y <strong className="text-slate-800">Janet (Contabilidad)</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Botón Descargar en Modo App */}
          <button
            onClick={() => setShowAppModal(true)}
            className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:from-emerald-500 hover:to-teal-500 active:scale-95 transition-all"
            title="Descargar e instalar MARAL OS como App en tu celular o computador"
          >
            <Smartphone className="h-4 w-4 animate-pulse" />
            <span>Descargar en Modo App</span>
          </button>

          <TourButton tourId="tareas" />

          {canCreate && (
            <Button
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => { setModalPriority(undefined); setShowModal(true) }}
              className="rounded-2xl shadow-md shadow-blue-600/20"
            >
              Nueva Tarea
            </Button>
          )}
        </div>
      </div>

      {/* Overdue / Urgent alert */}
      {reminders.length > 0 && <OverdueBanner tasks={reminders} />}

      {/* Analytics Panel (Full team performance tracking) */}
      <AnalyticsPanel tasks={allTasksForStats} users={users} />

      {/* User selector Tabs */}
      <Card className="p-3 bg-white border-slate-200/90 shadow-xs">
        <div className="flex items-center justify-between gap-2 flex-wrap mb-2 px-1">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
            <Users className="h-4 w-4 text-blue-600" />
            Filtrar por Responsable del Equipo:
          </span>
          <span className="text-xs text-slate-500 font-medium">
            {activeTasks.length} tarea{activeTasks.length !== 1 ? 's' : ''} activa{activeTasks.length !== 1 ? 's' : ''} · {doneTasks.length} completada{doneTasks.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Todas */}
          <button
            onClick={() => setViewingUserId('all')}
            className={`flex items-center gap-2 rounded-2xl border px-3.5 py-2 text-xs font-bold transition-all ${
              viewingUserId === 'all'
                ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <span>👥 Todo el Equipo</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${viewingUserId === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
              {allTasksForStats.filter(t => t.status !== 'COMPLETADA' && t.status !== 'CANCELADA').length}
            </span>
          </button>

          {/* Mis tareas */}
          <button
            onClick={() => setViewingUserId('me')}
            className={`flex items-center gap-2 rounded-2xl border px-3.5 py-2 text-xs font-bold transition-all ${
              viewingUserId === 'me'
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <UserAvatar name={user?.name ?? 'Y'} size="xs" />
            <span>Mis Tareas</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${viewingUserId === 'me' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
              {allTasksForStats.filter(t => t.assignedTo?.id === user?.id && t.status !== 'COMPLETADA' && t.status !== 'CANCELADA').length}
            </span>
          </button>

          {/* Direct buttons for each of the 4 key team members */}
          {users.map((u) => {
            const meta = USER_ROLES_META[u.role] || { roleName: u.role, emoji: '👤' }
            const count = allTasksForStats.filter(t => t.assignedTo?.id === u.id && t.status !== 'COMPLETADA' && t.status !== 'CANCELADA').length
            const isSelected = viewingUserId === u.id
            return (
              <button
                key={u.id}
                onClick={() => setViewingUserId(u.id)}
                className={`flex items-center gap-2 rounded-2xl border px-3.5 py-2 text-xs font-bold transition-all ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <UserAvatar name={u.name} size="xs" />
                <span>{meta.emoji} {u.name} ({meta.roleName.split(' ')[0]})</span>
                {count > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'}`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {viewingUser && viewingUserId !== 'me' && (
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <UserAvatar name={viewingUser.name} size="xs" />
              <span>Viendo tareas de <strong className="text-slate-900">{viewingUser.name}</strong> ({USER_ROLES_META[viewingUser.role]?.roleName || viewingUser.role})</span>
            </div>
            {viewingUser.phone && (
              <span className="text-[11px] text-slate-500">WhatsApp: +57 {viewingUser.phone}</span>
            )}
          </div>
        )}
      </Card>

      {/* Kanban Board */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : allTasks.length === 0 ? (
        <Card className="p-12 text-center rounded-3xl">
          <div className="flex flex-col items-center justify-center">
            <ClipboardList className="h-12 w-12 text-slate-300 mb-3" />
            <p className="text-slate-800 font-bold text-base">Sin tareas pendientes</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              {viewingUserId === 'me'
                ? '¡Todo al día! No tienes tareas pendientes.'
                : `${viewingUser ? viewingUser.name : 'El equipo'} no tiene tareas registradas.`}
            </p>
            {canCreate && (
              <Button
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => { setModalPriority(undefined); setShowModal(true) }}
                className="mt-4 text-xs"
              >
                Crear primera tarea
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {([
            { priority: 'URGENTE', label: '🔴 Urgentes & Críticas', bg: 'bg-red-50/60', border: 'border-red-200', badge: 'bg-red-100 text-red-800' },
            { priority: 'NORMAL',  label: '🔵 Normales & Operación', bg: 'bg-blue-50/60', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-800' },
            { priority: 'DESPUES', label: '⚪ Proyectos & Después', bg: 'bg-slate-50/60', border: 'border-slate-200', badge: 'bg-slate-100 text-slate-700' },
          ] as const).map(({ priority, label, bg, border, badge }) => {
            const active = allTasks.filter((t) => t.priority === priority && t.status !== 'COMPLETADA' && t.status !== 'CANCELADA')
            const done   = allTasks.filter((t) => t.priority === priority && (t.status === 'COMPLETADA' || t.status === 'CANCELADA'))
            const col = [...active, ...done]
            return (
              <div key={priority} className={`rounded-3xl border ${border} ${bg} p-4 min-h-[220px] flex flex-col justify-between shadow-xs`}>
                <div>
                  <div className="flex items-center justify-between mb-3.5 pb-2 border-b border-black/5">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">{label}</h3>
                    <span className={`text-xs font-black px-2.5 py-0.5 rounded-full ${badge}`}>{active.length}</span>
                  </div>

                  <div className="space-y-3">
                    {col.length === 0 && (
                      <p className="text-xs text-slate-400 text-center py-10 font-medium">Sin tareas en esta columna</p>
                    )}
                    {col.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        canDelete={canDelete(task)}
                        canRemind={canRemind(task)}
                        currentUserId={user?.id ?? ''}
                        onComplete={() => completeMutation.mutate(task.id)}
                        onDelete={() => deleteMutation.mutate(task.id)}
                        onRemind={() => remindMutation.mutate(task.id)}
                        onAddComment={(taskId, body) => addCommentMutation.mutate({ taskId, body })}
                        isCompleting={completeMutation.isPending && completeMutation.variables === task.id}
                      />
                    ))}
                  </div>
                </div>

                {canCreate && (
                  <button
                    onClick={() => { setModalPriority(priority as TaskPriority); setShowModal(true) }}
                    className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-600 py-2.5 rounded-2xl border border-dashed border-slate-300 hover:border-blue-400 hover:bg-white/80 transition-all"
                  >
                    <Plus className="h-3.5 w-3.5" /> Añadir Tarea a {label.split(' ')[1]}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Completed history dropdown */}
      {doneTasks.length > 0 && (
        <Card className="p-4 rounded-3xl">
          <details className="group">
            <summary className="cursor-pointer text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center justify-between select-none">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Historial de tareas completadas ({doneTasks.length})
              </span>
              <ChevronDown className="h-4 w-4 group-open:rotate-180 transition-transform text-slate-400" />
            </summary>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-3 border-t border-slate-100">
              {doneTasks.map((task) => (
                <div key={task.id} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3 opacity-75">
                  <p className="text-xs line-through text-slate-500 font-semibold">{task.title}</p>
                  {task.assignedTo && (
                    <p className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
                      <UserAvatar name={task.assignedTo.name} size="xs" />
                      <span>{task.assignedTo.name}</span>
                    </p>
                  )}
                </div>
              ))}
            </div>
          </details>
        </Card>
      )}

      {/* Create modal */}
      {showModal && canCreate && (
        <CreateModal
          onClose={() => setShowModal(false)}
          onSubmit={(data) => createMutation.mutate(data)}
          users={users}
          currentUser={user as User}
          isPending={createMutation.isPending}
          initialPriority={modalPriority}
          initialAssignedToId={resolvedUserId ?? user?.id}
        />
      )}

      {/* PWA App Download / Install Modal */}
      <InstallAppModal isOpen={showAppModal} onClose={() => setShowAppModal(false)} />
    </div>
  )
}
