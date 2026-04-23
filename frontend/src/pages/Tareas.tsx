import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Trash2, Check, ClipboardList, Columns3, Sparkles,
  Bell, BarChart2, ChevronDown, ChevronUp, ArrowRight, Users,
  AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { tasksApi } from '../lib/api'
import api from '../lib/api'
import { useAuthStore } from '../store/auth'
import { formatDate } from '../lib/utils'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { TourButton } from '../components/tour/TourButton'
import type { Task, TaskPriority, User } from '../types'

// ─── Helpers ─────────────────────────────────────────────────

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
    <div className={`flex shrink-0 items-center justify-center rounded-full font-bold text-white ${dim} ${avatarColor(name)}`}>
      {name[0].toUpperCase()}
    </div>
  )
}

const PRIORITY_BADGE: Record<TaskPriority, string> = {
  URGENTE: 'bg-red-100 text-red-700',
  NORMAL:  'bg-blue-100 text-blue-700',
  DESPUES: 'bg-gray-100 text-gray-600',
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
  const [open, setOpen] = useState(false)

  const stats = users.map((u) => {
    const mine = tasks.filter((t) => t.assignedTo?.id === u.id)
    const done  = mine.filter((t) => t.status === 'COMPLETADA').length
    const total = mine.length
    const overdue = mine.filter((t) =>
      t.status !== 'COMPLETADA' && t.status !== 'CANCELADA' && t.dueDate && new Date(t.dueDate) < new Date()
    ).length
    const pct = total > 0 ? Math.round((done / total) * 100) : 0
    return { user: u, total, done, overdue, pct }
  }).filter((s) => s.total > 0).sort((a, b) => b.pct - a.pct)

  if (stats.length === 0) return null

  return (
    <Card className="overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <BarChart2 className="h-4 w-4 text-blue-600" />
          Analítica del equipo
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
      </button>

      {open && (
        <div className="px-5 pb-5 grid gap-3">
          {stats.map(({ user: u, total, done, overdue, pct }) => (
            <div key={u.id} className="flex items-center gap-3">
              <UserAvatar name={u.name} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">{u.name.split(' ')[0]}</span>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    {overdue > 0 && (
                      <span className="text-red-500 font-semibold">⚠ {overdue} vencida{overdue !== 1 ? 's' : ''}</span>
                    )}
                    <span>{done}/{total} · <span className={`font-bold ${pct >= 80 ? 'text-green-600' : pct >= 50 ? 'text-amber-600' : 'text-red-500'}`}>{pct}%</span></span>
                  </div>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-100">
                  <div
                    className={`h-2 rounded-full transition-all ${pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
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
    <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
      <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-red-700">
          {urgent.length === 1 ? 'Tienes 1 tarea que necesita atención' : `Tienes ${urgent.length} tareas que necesitan atención`}
        </p>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {urgent.slice(0, 3).map((t) => (
            <span key={t.id} className="text-xs bg-red-100 text-red-700 rounded-full px-2 py-0.5">
              {t.title.length > 30 ? t.title.slice(0, 30) + '…' : t.title}
            </span>
          ))}
          {urgent.length > 3 && <span className="text-xs text-red-500">+{urgent.length - 3} más</span>}
        </div>
      </div>
    </div>
  )
}

// ─── Kanban Card ─────────────────────────────────────────────

function TaskCard({
  task, canDelete, onComplete, onDelete, onRemind, isCompleting, canRemind,
}: {
  task: Task
  canDelete: boolean
  onComplete: () => void
  onDelete: () => void
  onRemind: () => void
  isCompleting: boolean
  canRemind: boolean
}) {
  const isDone    = task.status === 'COMPLETADA' || task.status === 'CANCELADA'
  const isOverdue = !isDone && task.dueDate && daysUntil(task.dueDate) < 0
  const daysLeft  = task.dueDate ? daysUntil(task.dueDate) : null

  return (
    <div className={`rounded-xl border p-3 shadow-sm transition-all ${isDone ? 'bg-gray-50 border-gray-100 opacity-55' : isOverdue ? 'bg-white border-red-200' : 'bg-white border-gray-200'}`}>
      <div className="flex items-start gap-2">
        {/* Complete circle */}
        <button
          onClick={onComplete}
          disabled={isDone}
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
            isDone ? 'border-green-400 bg-green-400' : 'border-gray-300 hover:border-green-500 hover:bg-green-50'
          }`}
        >
          {isDone ? <Check className="h-3 w-3 text-white" /> : isCompleting ? <div className="h-2 w-2 border border-gray-400 rounded-full border-t-transparent animate-spin" /> : null}
        </button>

        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium leading-snug ${isDone ? 'line-through text-gray-400' : 'text-gray-900'}`}>
            {task.title}
          </p>

          {/* Asignada por */}
          {task.createdBy && (
            <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
              <ArrowRight className="h-2.5 w-2.5" />
              <span>{task.createdBy.name.split(' ')[0]}</span>
              <span>→</span>
              <span className="font-medium text-gray-500">{task.assignedTo?.name.split(' ')[0]}</span>
            </p>
          )}

          <div className="flex items-center justify-between mt-2 gap-1 flex-wrap">
            {/* Due date */}
            {task.dueDate && !isDone && (
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                isOverdue ? 'bg-red-100 text-red-600' : daysLeft !== null && daysLeft <= 2 ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-500'
              }`}>
                {isOverdue ? `⚠ hace ${Math.abs(daysLeft!)}d` : daysLeft === 0 ? '⏰ Hoy' : daysLeft === 1 ? '⏰ Mañana' : formatDate(task.dueDate)}
              </span>
            )}

            {/* Remind button */}
            {canRemind && !isDone && (
              <button
                onClick={onRemind}
                title="Enviar recordatorio WhatsApp"
                className="flex items-center gap-1 text-[10px] text-green-600 hover:text-green-700 hover:bg-green-50 rounded-full px-1.5 py-0.5 transition-colors border border-transparent hover:border-green-200"
              >
                <Bell className="h-3 w-3" />
                Recordar
              </button>
            )}
          </div>
        </div>

        {/* Delete */}
        {canDelete && (
          <button onClick={onDelete} className="text-gray-200 hover:text-red-400 transition-colors shrink-0 mt-0.5">
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
  onClose, onSubmit, users, currentUser, isPending, initialPriority,
}: {
  onClose: () => void
  onSubmit: (data: CreateForm) => void
  users: User[]
  currentUser: User
  isPending: boolean
  initialPriority?: TaskPriority
}) {
  const [form, setForm] = useState<CreateForm>({ ...DEFAULT_FORM, priority: initialPriority ?? 'NORMAL', dueDate: todayISO() })
  const [aiSuggestion, setAiSuggestion] = useState<{ priority: TaskPriority; dueDays: number } | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Step tracker
  const step = !form.title.trim() ? 1 : !form.assignedToId ? 2 : !form.dueDate ? 3 : 4
  const steps = ['Tarea', 'Asignar', 'Fecha', 'Listo']

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
    if (!form.title.trim()) { toast.error('Escribe el título'); return }
    onSubmit({ ...form, assignedToId: form.assignedToId || currentUser.id })
  }

  const assignedUser = users.find((u) => u.id === form.assignedToId) ?? currentUser

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
      <div className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white flex items-center justify-between border-b border-gray-100 px-5 py-4 rounded-t-2xl">
          <h2 className="text-base font-bold text-gray-900">Nueva Tarea</h2>
          <button onClick={onClose} className="h-7 w-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 text-xl">×</button>
        </div>

        {/* Progress bar */}
        <div className="flex px-5 pt-4 gap-1">
          {steps.map((s, i) => (
            <div key={s} className="flex-1">
              <div className={`h-1.5 rounded-full transition-all ${i < step ? 'bg-blue-600' : 'bg-gray-100'}`} />
              <p className={`text-[10px] mt-1 text-center font-medium ${i < step ? 'text-blue-600' : 'text-gray-300'}`}>{s}</p>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="px-5 pb-6 pt-3 space-y-5">
          {/* Title */}
          <div>
            <input
              autoFocus
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="¿Qué hay que hacer?"
              className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-base font-medium placeholder-gray-300 focus:border-blue-500 focus:outline-none transition-colors"
            />
            {(aiLoading || aiSuggestion) && (
              <div className="mt-2 flex items-center gap-2">
                {aiLoading && <span className="flex items-center gap-1.5 text-xs text-indigo-500"><Sparkles className="h-3.5 w-3.5 animate-pulse" />Analizando...</span>}
                {!aiLoading && aiSuggestion && (
                  <button type="button" onClick={() => {
                    const d = new Date(); d.setDate(d.getDate() + aiSuggestion.dueDays)
                    setForm({ ...form, priority: aiSuggestion.priority, dueDate: d.toISOString().split('T')[0] })
                    setAiSuggestion(null)
                  }} className="flex items-center gap-1.5 rounded-full bg-indigo-50 border border-indigo-200 px-3 py-1 text-xs text-indigo-700 font-medium hover:bg-indigo-100 transition-colors">
                    <Sparkles className="h-3 w-3" />
                    IA: {aiSuggestion.priority === 'URGENTE' ? '🔴 Urgente' : aiSuggestion.priority === 'NORMAL' ? '🔵 Normal' : '⚪ Después'}, en {aiSuggestion.dueDays}d — Aplicar ✓
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Description */}
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Detalles adicionales (opcional)"
            rows={2}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm placeholder-gray-300 focus:border-blue-500 focus:outline-none resize-none"
          />

          {/* Priority */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Prioridad</p>
            <div className="flex gap-2">
              {([
                ['URGENTE', '🔴 Urgente', 'bg-red-600 text-white',  'border-red-200 text-red-600 hover:bg-red-50'],
                ['NORMAL',  '🔵 Normal',  'bg-blue-600 text-white', 'border-blue-200 text-blue-600 hover:bg-blue-50'],
                ['DESPUES', '⚪ Después', 'bg-gray-600 text-white', 'border-gray-200 text-gray-500 hover:bg-gray-50'],
              ] as const).map(([val, label, active, inactive]) => (
                <button key={val} type="button"
                  onClick={() => setForm({ ...form, priority: val as TaskPriority })}
                  className={`flex-1 rounded-xl border py-2 text-sm font-semibold transition-all ${form.priority === val ? active + ' border-transparent shadow-sm' : 'bg-white ' + inactive}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Assign to */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Asignar a</p>
            <div className="flex flex-wrap gap-2">
              {[currentUser, ...users.filter((u) => u.id !== currentUser.id)].map((u) => {
                const selected = form.assignedToId === u.id || (!form.assignedToId && u.id === currentUser.id)
                return (
                  <button key={u.id} type="button" onClick={() => setForm({ ...form, assignedToId: u.id })}
                    className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-all ${selected ? 'ring-2 ring-blue-300 border-blue-200 bg-blue-50' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                  >
                    <UserAvatar name={u.name} size="xs" />
                    <span>{u.id === currentUser.id ? `Yo (${u.name.split(' ')[0]})` : u.name.split(' ')[0]}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Due date */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Fecha límite</p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Hoy', days: 0 },
                { label: 'Mañana', days: 1 },
                { label: '3 días', days: 3 },
                { label: '1 semana', days: 7 },
                { label: '2 semanas', days: 14 },
              ].map(({ label, days }) => {
                const d = new Date(); d.setDate(d.getDate() + days)
                const iso = d.toISOString().split('T')[0]
                return (
                  <button key={label} type="button" onClick={() => setForm({ ...form, dueDate: iso })}
                    className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-all ${form.dueDate === iso ? 'bg-blue-600 text-white border-transparent shadow-sm' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                  >
                    {label}
                  </button>
                )
              })}
              <div className="flex gap-1.5">
                <select value={form.dueDate ? parseInt(form.dueDate.split('-')[1]) : ''} onChange={(e) => {
                  const year = new Date().getFullYear(); const month = parseInt(e.target.value)
                  const day = form.dueDate ? Math.min(parseInt(form.dueDate.split('-')[2]), new Date(year, month, 0).getDate()) : 1
                  setForm({ ...form, dueDate: `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}` })
                }} className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none">
                  <option value="">Mes</option>
                  {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m.slice(0,3)}</option>)}
                </select>
                <select value={form.dueDate ? parseInt(form.dueDate.split('-')[2]) : ''} onChange={(e) => {
                  const year = new Date().getFullYear()
                  const month = form.dueDate ? parseInt(form.dueDate.split('-')[1]) : new Date().getMonth() + 1
                  setForm({ ...form, dueDate: `${year}-${String(month).padStart(2,'0')}-${String(parseInt(e.target.value)).padStart(2,'0')}` })
                }} className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none">
                  <option value="">Día</option>
                  {Array.from({ length: 31 }, (_, i) => <option key={i+1} value={i+1}>{i+1}</option>)}
                </select>
              </div>
            </div>
            {form.dueDate && (
              <p className="mt-2 text-xs text-blue-600 font-medium">
                📅 {new Date(form.dueDate + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            )}
          </div>

          {/* Summary preview */}
          {form.title.trim() && (
            <div className="rounded-xl bg-gray-50 border border-gray-200 p-3 text-sm text-gray-700">
              <p className="font-semibold">{form.title}</p>
              <p className="text-xs text-gray-400 mt-1">
                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold mr-1 ${PRIORITY_BADGE[form.priority]}`}>{form.priority}</span>
                → <span className="font-medium">{assignedUser.name.split(' ')[0]}</span>
                {form.dueDate && <span className="ml-1">· vence {formatDate(form.dueDate)}</span>}
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-1 border-t border-gray-100">
            <button type="button" onClick={onClose} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={isPending || !form.title.trim()}
              className="rounded-xl bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {isPending ? <><div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creando...</> : <>Crear tarea <ArrowRight className="h-4 w-4" /></>}
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

  const [viewingUserId, setViewingUserId] = useState<string>('me') // 'me' | 'all' | userId
  const [showModal, setShowModal] = useState(false)
  const [modalPriority, setModalPriority] = useState<TaskPriority | undefined>()

  const isGerente = user?.role === 'GERENTE'
  const canCreate = user?.role !== 'LOGISTICA'

  const resolvedUserId = viewingUserId === 'me' ? user?.id : viewingUserId === 'all' ? undefined : viewingUserId

  const { data: allTasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ['tasks', { assignedToId: resolvedUserId }],
    queryFn: () => tasksApi.getAll({ assignedToId: resolvedUserId }).then((r) => r.data),
    staleTime: 30_000,
  })

  // Separate query for analytics — all tasks regardless of filter
  const { data: allTasksForStats = [] } = useQuery<Task[]>({
    queryKey: ['tasks-all-stats'],
    queryFn: () => tasksApi.getAll({}).then((r) => r.data),
    staleTime: 60_000,
    enabled: isGerente,
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
    onSuccess: () => { toast.success('✅ Tarea creada'); setShowModal(false); invalidate() },
    onError: () => toast.error('No se pudo crear la tarea'),
  })

  const completeMutation = useMutation({
    mutationFn: (id: string) => tasksApi.updateStatus(id, 'COMPLETADA'),
    onSuccess: () => { toast.success('¡Tarea completada! 🎉'); invalidate() },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => tasksApi.delete(id),
    onSuccess: () => { toast.success('Tarea eliminada'); invalidate() },
  })

  const remindMutation = useMutation({
    mutationFn: (id: string) => tasksApi.remind(id),
    onSuccess: () => toast.success('📲 Recordatorio enviado por WhatsApp'),
    onError: () => toast.error('No se pudo enviar el recordatorio'),
  })

  const canDelete = (task: Task) => user?.role === 'GERENTE' || task.createdById === user?.id
  const canRemind = (task: Task) => isGerente || task.createdById === user?.id

  // Tasks for kanban
  const myTasks = allTasks.filter((t) => t.status !== 'COMPLETADA' && t.status !== 'CANCELADA')
  const myDone  = allTasks.filter((t) => t.status === 'COMPLETADA')

  // Overdue/urgent — only for current user's tasks
  const myOverdue = allTasks.filter((t) =>
    t.assignedTo?.id === user?.id &&
    t.status !== 'COMPLETADA' && t.status !== 'CANCELADA' &&
    t.dueDate && new Date(t.dueDate) < new Date()
  )
  const myUrgent = allTasks.filter((t) =>
    t.assignedTo?.id === user?.id && t.priority === 'URGENTE' && t.status === 'PENDIENTE'
  )
  const reminders = [...new Set([...myOverdue, ...myUrgent].map(t => t.id))].map(id => allTasks.find(t => t.id === id)!).filter(Boolean)

  const viewingUser = viewingUserId === 'me' ? user : viewingUserId === 'all' ? null : users.find((u) => u.id === viewingUserId)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tareas</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {myTasks.length} activa{myTasks.length !== 1 ? 's' : ''} · {myDone.length} completada{myDone.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TourButton tourId="tareas" />
          {canCreate && (
            <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => { setModalPriority(undefined); setShowModal(true) }}>
              Nueva Tarea
            </Button>
          )}
        </div>
      </div>

      {/* Overdue reminder */}
      {viewingUserId === 'me' && reminders.length > 0 && <OverdueBanner tasks={reminders} />}

      {/* Analytics (GERENTE) */}
      {isGerente && <AnalyticsPanel tasks={allTasksForStats} users={users} />}

      {/* User selector */}
      <Card className="px-4 py-3">
        <div className="flex items-center gap-1 flex-wrap">
          <Users className="h-4 w-4 text-gray-400 mr-1 shrink-0" />

          {/* Mis tareas */}
          <button
            onClick={() => setViewingUserId('me')}
            className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-all ${viewingUserId === 'me' ? 'bg-blue-600 text-white border-transparent' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            <UserAvatar name={user?.name ?? 'Y'} size="xs" />
            Mis tareas
          </button>

          {/* Otros usuarios */}
          {users.filter((u) => u.id !== user?.id).map((u) => (
            <button
              key={u.id}
              onClick={() => setViewingUserId(u.id)}
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-all ${viewingUserId === u.id ? 'bg-blue-600 text-white border-transparent' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              <UserAvatar name={u.name} size="xs" />
              {u.name.split(' ')[0]}
            </button>
          ))}

          {/* Todas */}
          {isGerente && (
            <button
              onClick={() => setViewingUserId('all')}
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-all ${viewingUserId === 'all' ? 'bg-gray-800 text-white border-transparent' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              Todas
            </button>
          )}
        </div>

        {viewingUser && viewingUserId !== 'me' && (
          <p className="mt-2 text-xs text-gray-500 flex items-center gap-1.5">
            <UserAvatar name={viewingUser.name} size="xs" />
            Viendo tareas de <span className="font-semibold text-gray-700">{viewingUser.name}</span>
          </p>
        )}
      </Card>

      {/* Kanban */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : allTasks.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ClipboardList className="h-10 w-10 text-gray-200 mb-3" />
            <p className="text-gray-500 font-medium">Sin tareas</p>
            <p className="text-sm text-gray-400 mt-1">
              {viewingUserId === 'me' ? '¡Todo al día! 🎉' : `${viewingUser?.name ?? 'Este usuario'} no tiene tareas asignadas`}
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {([
            { priority: 'URGENTE', label: '🔴 Urgente',  bg: 'bg-red-50',  border: 'border-red-200',  badge: 'bg-red-100 text-red-700' },
            { priority: 'NORMAL',  label: '🔵 Normal',   bg: 'bg-blue-50', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-700' },
            { priority: 'DESPUES', label: '⚪ Después',  bg: 'bg-gray-50', border: 'border-gray-200', badge: 'bg-gray-100 text-gray-600' },
          ] as const).map(({ priority, label, bg, border, badge }) => {
            const active = allTasks.filter((t) => t.priority === priority && t.status !== 'COMPLETADA' && t.status !== 'CANCELADA')
            const done   = allTasks.filter((t) => t.priority === priority && (t.status === 'COMPLETADA' || t.status === 'CANCELADA'))
            const col = [...active, ...done]
            return (
              <div key={priority} className={`rounded-xl border ${border} ${bg} p-3 min-h-[160px]`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">{label}</h3>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badge}`}>{active.length}</span>
                </div>
                <div className="space-y-2">
                  {col.length === 0 && <p className="text-xs text-gray-400 text-center py-6">Sin tareas</p>}
                  {col.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      canDelete={canDelete(task)}
                      canRemind={canRemind(task)}
                      onComplete={() => completeMutation.mutate(task.id)}
                      onDelete={() => deleteMutation.mutate(task.id)}
                      onRemind={() => remindMutation.mutate(task.id)}
                      isCompleting={completeMutation.isPending && completeMutation.variables === task.id}
                    />
                  ))}
                </div>
                {canCreate && (
                  <button
                    onClick={() => { setModalPriority(priority as TaskPriority); setShowModal(true) }}
                    className="mt-2 w-full flex items-center justify-center gap-1 text-xs text-gray-400 hover:text-gray-600 py-2 rounded-lg border border-dashed border-gray-300 hover:border-gray-400 transition-colors"
                  >
                    <Plus className="h-3 w-3" /> Añadir
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Completed section */}
      {myDone.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-xs font-medium text-gray-400 hover:text-gray-600 flex items-center gap-1.5 select-none">
            <Check className="h-3.5 w-3.5" />
            {myDone.length} completada{myDone.length !== 1 ? 's' : ''}
            <ChevronDown className="h-3.5 w-3.5 group-open:rotate-180 transition-transform" />
          </summary>
          <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2">
            {myDone.slice(0, 9).map((task) => (
              <div key={task.id} className="rounded-lg border border-gray-100 bg-gray-50 p-2.5 opacity-60">
                <p className="text-xs line-through text-gray-400 font-medium">{task.title}</p>
                {task.assignedTo && (
                  <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                    <UserAvatar name={task.assignedTo.name} size="xs" />
                    {task.assignedTo.name.split(' ')[0]}
                    {task.createdBy && task.createdBy.id !== task.assignedTo.id && (
                      <span className="text-gray-300"> · por {task.createdBy.name.split(' ')[0]}</span>
                    )}
                  </p>
                )}
              </div>
            ))}
          </div>
        </details>
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
        />
      )}
    </div>
  )
}
