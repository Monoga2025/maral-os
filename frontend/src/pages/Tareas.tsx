import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Check, ClipboardList, LayoutList, Columns3 } from 'lucide-react'
import { toast } from 'sonner'
import { tasksApi } from '../lib/api'
import api from '../lib/api'
import { useAuthStore } from '../store/auth'
import { formatDate } from '../lib/utils'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { TourButton } from '../components/tour/TourButton'
import type { Task, TaskStatus, TaskPriority, User } from '../types'

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  URGENTE: 'Urgente',
  NORMAL: 'Normal',
  DESPUES: 'Después',
}

const STATUS_LABELS: Record<TaskStatus, string> = {
  PENDIENTE: 'Pendiente',
  EN_PROGRESO: 'En Progreso',
  COMPLETADA: 'Completada',
  CANCELADA: 'Cancelada',
}

const PRIORITY_BADGE: Record<TaskPriority, string> = {
  URGENTE: 'bg-red-100 text-red-700',
  NORMAL: 'bg-blue-100 text-blue-700',
  DESPUES: 'bg-gray-100 text-gray-600',
}

const STATUS_BADGE: Record<TaskStatus, string> = {
  PENDIENTE: 'bg-yellow-100 text-yellow-700',
  EN_PROGRESO: 'bg-blue-100 text-blue-700',
  COMPLETADA: 'bg-green-100 text-green-700',
  CANCELADA: 'bg-gray-100 text-gray-500',
}

const STATUS_FILTER_OPTIONS: { label: string; value: string }[] = [
  { label: 'Todas', value: '' },
  { label: 'Pendientes', value: 'PENDIENTE' },
  { label: 'En Progreso', value: 'EN_PROGRESO' },
  { label: 'Completadas', value: 'COMPLETADA' },
]

const PRIORITY_FILTER_OPTIONS: { label: string; value: string }[] = [
  { label: 'Todas', value: '' },
  { label: 'Urgente', value: 'URGENTE' },
  { label: 'Normal', value: 'NORMAL' },
  { label: 'Después', value: 'DESPUES' },
]

interface CreateForm {
  title: string
  description: string
  priority: TaskPriority
  assignedToId: string
  dueDate: string
}

const MONTHS = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

const DEFAULT_FORM: CreateForm = {
  title: '',
  description: '',
  priority: 'NORMAL',
  assignedToId: '',
  dueDate: '',
}

export default function Tareas() {
  const { user } = useAuthStore()
  const qc = useQueryClient()

  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<CreateForm>(DEFAULT_FORM)
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('kanban')

  const filters = {
    status: statusFilter || undefined,
    priority: priorityFilter || undefined,
  }

  const { data: tasks, isLoading } = useQuery<Task[]>({
    queryKey: ['tasks', filters],
    queryFn: () => tasksApi.getAll(filters).then((r) => r.data),
    staleTime: 30_000,
  })

  const { data: users } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => api.get<User[]>('/users').then((r) => r.data),
    staleTime: 60_000,
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['tasks'] })

  const createMutation = useMutation({
    mutationFn: (data: Parameters<typeof tasksApi.create>[0]) => tasksApi.create(data),
    onSuccess: () => {
      toast.success('Tarea creada')
      setShowModal(false)
      setForm(DEFAULT_FORM)
      invalidate()
    },
    onError: () => toast.error('No se pudo crear la tarea'),
  })

  const completeMutation = useMutation({
    mutationFn: (id: string) => tasksApi.updateStatus(id, 'COMPLETADA'),
    onSuccess: () => {
      toast.success('Tarea completada')
      invalidate()
    },
    onError: () => toast.error('No se pudo actualizar la tarea'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => tasksApi.delete(id),
    onSuccess: () => {
      toast.success('Tarea eliminada')
      invalidate()
    },
    onError: () => toast.error('No se pudo eliminar la tarea'),
  })

  const canDelete = (task: Task) =>
    user?.role === 'GERENTE' || task.createdById === user?.id

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) {
      toast.error('El título es requerido')
      return
    }
    createMutation.mutate({
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      priority: form.priority,
      assignedToId: form.assignedToId || user!.id,
      dueDate: form.dueDate || undefined,
    })
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tareas</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {tasks?.length ?? 0} tarea{tasks?.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TourButton tourId="tareas" />
          {/* View toggle */}
          <div className="flex items-center rounded-lg border border-gray-200 bg-white overflow-hidden">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === 'kanban' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              <Columns3 className="h-3.5 w-3.5" />
              Tablero
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              <LayoutList className="h-3.5 w-3.5" />
              Lista
            </button>
          </div>
          <Button data-tour="tasks-new-btn" leftIcon={<Plus className="h-4 w-4" />} onClick={() => { setForm({ ...DEFAULT_FORM, dueDate: todayISO() }); setShowModal(true) }}>
            Nueva Tarea
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card data-tour="tasks-filters">
        <div className="flex flex-wrap items-center gap-4 p-4">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-gray-500 mr-1">Estado:</span>
            {STATUS_FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setStatusFilter(opt.value)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  statusFilter === opt.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-gray-500 mr-1">Prioridad:</span>
            {PRIORITY_FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setPriorityFilter(opt.value)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  priorityFilter === opt.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Kanban view */}
      {viewMode === 'kanban' && (
        isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {([
              { priority: 'URGENTE', label: '🔴 Urgente', bg: 'bg-red-50', border: 'border-red-200', badge: 'bg-red-100 text-red-700' },
              { priority: 'NORMAL',  label: '🔵 Normal',  bg: 'bg-blue-50', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-700' },
              { priority: 'DESPUES', label: '⚪ Después', bg: 'bg-gray-50',  border: 'border-gray-200',  badge: 'bg-gray-100 text-gray-600' },
            ] as const).map(({ priority, label, bg, border, badge }) => {
              const col = (tasks ?? []).filter(t => t.priority === priority && t.status !== 'COMPLETADA' && t.status !== 'CANCELADA')
              return (
                <div key={priority} className={`rounded-xl border ${border} ${bg} p-3 min-h-[200px]`}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-700">{label}</h3>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badge}`}>{col.length}</span>
                  </div>
                  <div className="space-y-2">
                    {col.length === 0 && (
                      <p className="text-xs text-gray-400 text-center py-6">Sin tareas</p>
                    )}
                    {col.map((task) => {
                      const isOverdue = task.dueDate && new Date(task.dueDate) < new Date()
                      return (
                        <div key={task.id} className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
                          <div className="flex items-start gap-2">
                            <button
                              onClick={() => { if (task.status !== 'COMPLETADA') completeMutation.mutate(task.id) }}
                              disabled={task.status === 'COMPLETADA'}
                              className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-gray-300 hover:border-green-500 hover:bg-green-50 transition-colors"
                            >
                              {completeMutation.variables === task.id && completeMutation.isPending
                                ? <div className="h-2.5 w-2.5 border border-gray-400 rounded-full border-t-transparent animate-spin" />
                                : null}
                            </button>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 leading-snug">{task.title}</p>
                              <div className="flex flex-wrap gap-x-3 mt-1.5 text-xs text-gray-400">
                                {task.assignedTo && <span>{task.assignedTo.name.split(' ')[0]}</span>}
                                {task.dueDate && (
                                  <span className={isOverdue ? 'text-red-500 font-medium' : ''}>
                                    {isOverdue ? '⚠ ' : ''}{formatDate(task.dueDate)}
                                  </span>
                                )}
                              </div>
                            </div>
                            {canDelete(task) && (
                              <button
                                onClick={() => deleteMutation.mutate(task.id)}
                                className="text-gray-300 hover:text-red-400 transition-colors shrink-0"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <button
                    onClick={() => { setForm({ ...DEFAULT_FORM, priority, dueDate: todayISO() }); setShowModal(true) }}
                    className="mt-2 w-full flex items-center justify-center gap-1 text-xs text-gray-400 hover:text-gray-600 py-2 rounded-lg border border-dashed border-gray-300 hover:border-gray-400 transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                    Añadir
                  </button>
                </div>
              )
            })}
          </div>
        )
      )}

      {/* Task list (lista mode) */}
      {viewMode === 'list' && isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : viewMode === 'list' && !tasks?.length ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ClipboardList className="h-10 w-10 text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No hay tareas</p>
            <p className="text-sm text-gray-400 mt-1">Crea una nueva tarea con el botón superior</p>
          </div>
        </Card>
      ) : viewMode === 'list' ? (
        <div data-tour="tasks-list" className="grid gap-3">
          {tasks!.map((task) => (
            <Card key={task.id} className="p-4">
              <div className="flex items-start gap-3">
                {/* Complete button */}
                <button
                  onClick={() => {
                    if (task.status !== 'COMPLETADA') completeMutation.mutate(task.id)
                  }}
                  disabled={task.status === 'COMPLETADA' || task.status === 'CANCELADA'}
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                    task.status === 'COMPLETADA'
                      ? 'border-green-500 bg-green-500 text-white'
                      : 'border-gray-300 hover:border-green-500 hover:bg-green-50 text-transparent hover:text-green-500'
                  } disabled:cursor-default`}
                  title="Marcar como completada"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${PRIORITY_BADGE[task.priority]}`}
                    >
                      {PRIORITY_LABELS[task.priority]}
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_BADGE[task.status]}`}
                    >
                      {STATUS_LABELS[task.status]}
                    </span>
                  </div>
                  <p
                    className={`font-semibold text-gray-900 ${
                      task.status === 'COMPLETADA' ? 'line-through text-gray-400' : ''
                    }`}
                  >
                    {task.title}
                  </p>
                  {task.description && (
                    <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{task.description}</p>
                  )}
                  <div className="flex flex-wrap gap-x-4 mt-2 text-xs text-gray-400">
                    {task.assignedTo && (
                      <span>Asignada a: <span className="text-gray-600 font-medium">{task.assignedTo.name}</span></span>
                    )}
                    {task.dueDate && (
                      <span>Vence: <span className="text-gray-600">{formatDate(task.dueDate)}</span></span>
                    )}
                    {task.createdBy && (
                      <span>Creada por: {task.createdBy.name}</span>
                    )}
                  </div>
                </div>

                {/* Delete */}
                {canDelete(task) && (
                  <button
                    onClick={() => deleteMutation.mutate(task.id)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-red-400 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors"
                    title="Eliminar tarea"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : null}

      {/* Create modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Nueva Tarea</h2>
              <button
                onClick={() => { setShowModal(false); setForm(DEFAULT_FORM) }}
                className="flex h-7 w-7 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors text-xl leading-none"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Title */}
              <input
                // eslint-disable-next-line jsx-a11y/no-autofocus
                autoFocus
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="¿Qué hay que hacer?"
                className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-base font-medium placeholder-gray-300 focus:border-blue-500 focus:outline-none transition-colors"
              />

              {/* Description */}
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Detalles adicionales (opcional)..."
                rows={2}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm placeholder-gray-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
              />

              {/* Priority pills */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Prioridad</p>
                <div className="flex gap-2">
                  {([['URGENTE', 'Urgente 🔴', 'bg-red-600 text-white', 'border-red-200 text-red-700 hover:bg-red-50'],
                    ['NORMAL', 'Normal', 'bg-blue-600 text-white', 'border-blue-200 text-blue-700 hover:bg-blue-50'],
                    ['DESPUES', 'Después', 'bg-gray-600 text-white', 'border-gray-200 text-gray-600 hover:bg-gray-100']] as const).map(([val, label, activeClass, inactiveClass]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setForm({ ...form, priority: val as TaskPriority })}
                      className={`flex-1 rounded-full border py-1.5 text-sm font-semibold transition-all ${
                        form.priority === val ? activeClass + ' border-transparent shadow-sm' : 'bg-white ' + inactiveClass
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Assigned to chips */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Asignar a</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, assignedToId: '' })}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-all ${
                      !form.assignedToId ? 'bg-blue-600 text-white border-transparent shadow-sm' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-xs font-bold">
                      {user?.name?.[0] ?? 'Y'}
                    </span>
                    Yo
                  </button>
                  {users?.filter((u) => u.id !== user?.id).map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => setForm({ ...form, assignedToId: u.id })}
                      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-all ${
                        form.assignedToId === u.id ? 'bg-blue-600 text-white border-transparent shadow-sm' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <span className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${form.assignedToId === u.id ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700'}`}>
                        {u.name[0]}
                      </span>
                      {u.name.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick date presets */}
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
                    const d = new Date()
                    d.setDate(d.getDate() + days)
                    const iso = d.toISOString().split('T')[0]
                    return (
                      <button
                        key={label}
                        type="button"
                        onClick={() => setForm({ ...form, dueDate: iso })}
                        className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-all ${
                          form.dueDate === iso
                            ? 'bg-blue-600 text-white border-transparent shadow-sm'
                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {label}
                      </button>
                    )
                  })}
                  {/* Custom date - month+day selects */}
                  <div className="flex gap-1.5 items-center">
                    <select
                      value={form.dueDate ? parseInt(form.dueDate.split('-')[1]) : ''}
                      onChange={(e) => {
                        const year = new Date().getFullYear()
                        const month = parseInt(e.target.value)
                        const day = form.dueDate ? Math.min(parseInt(form.dueDate.split('-')[2]), new Date(year, month, 0).getDate()) : 1
                        setForm({ ...form, dueDate: `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}` })
                      }}
                      className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">Mes</option>
                      {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m.slice(0,3)}</option>)}
                    </select>
                    <select
                      value={form.dueDate ? parseInt(form.dueDate.split('-')[2]) : ''}
                      onChange={(e) => {
                        const year = new Date().getFullYear()
                        const month = form.dueDate ? parseInt(form.dueDate.split('-')[1]) : new Date().getMonth() + 1
                        setForm({ ...form, dueDate: `${year}-${String(month).padStart(2,'0')}-${String(parseInt(e.target.value)).padStart(2,'0')}` })
                      }}
                      className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">Día</option>
                      {Array.from({ length: form.dueDate ? new Date(new Date().getFullYear(), parseInt(form.dueDate.split('-')[1]), 0).getDate() : 31 }, (_, i) => (
                        <option key={i+1} value={i+1}>{i+1}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {form.dueDate && (
                  <p className="mt-1.5 text-xs text-blue-600 font-medium">
                    Vence el {new Date(form.dueDate + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-1 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setForm(DEFAULT_FORM) }}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || !form.title.trim()}
                  className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {createMutation.isPending ? 'Creando...' : 'Crear Tarea'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
