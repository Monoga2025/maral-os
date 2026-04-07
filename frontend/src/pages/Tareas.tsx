import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Check, ClipboardList } from 'lucide-react'
import { toast } from 'sonner'
import { tasksApi } from '../lib/api'
import api from '../lib/api'
import { useAuthStore } from '../store/auth'
import { formatDate } from '../lib/utils'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
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
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setShowModal(true)}>
          Nueva Tarea
        </Button>
      </div>

      {/* Filters */}
      <Card>
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

      {/* Task list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : !tasks?.length ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ClipboardList className="h-10 w-10 text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No hay tareas</p>
            <p className="text-sm text-gray-400 mt-1">Crea una nueva tarea con el botón superior</p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-3">
          {tasks.map((task) => (
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
      )}

      {/* Create modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Nueva Tarea</h2>
              <button
                onClick={() => {
                  setShowModal(false)
                  setForm(DEFAULT_FORM)
                }}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Título <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Describe la tarea..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Detalles adicionales (opcional)..."
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prioridad
                </label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value as TaskPriority })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="URGENTE">Urgente</option>
                  <option value="NORMAL">Normal</option>
                  <option value="DESPUES">Después</option>
                </select>
              </div>

              {/* Assigned to */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Asignar a
                </label>
                <select
                  value={form.assignedToId}
                  onChange={(e) => setForm({ ...form, assignedToId: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Yo mismo</option>
                  {users?.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Due date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha límite
                </label>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setForm(DEFAULT_FORM)
                  }}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
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
