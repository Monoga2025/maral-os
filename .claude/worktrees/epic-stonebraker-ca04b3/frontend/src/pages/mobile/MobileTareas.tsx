import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, X, Check, AlertCircle, Clock, ArrowDown } from 'lucide-react'
import { tasksApi } from '../../lib/api'
import api from '../../lib/api'
import { useAuthStore } from '../../store/auth'
import { toast } from 'sonner'
import type { Task, TaskPriority, User } from '../../types'

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  URGENTE: {
    label: 'Urgente',
    color: '#EF4444',
    bg: '#1A0A0A',
    border: '#7F1D1D',
    icon: <AlertCircle size={13} />,
  },
  NORMAL: {
    label: 'Normal',
    color: '#60A5FA',
    bg: '#0A1628',
    border: '#1E3A5F',
    icon: <Clock size={13} />,
  },
  DESPUES: {
    label: 'Después',
    color: '#94A3B8',
    bg: '#0D1117',
    border: '#1E2D3D',
    icon: <ArrowDown size={13} />,
  },
}

function formatDue(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const diff = Math.ceil((d.getTime() - today.setHours(0,0,0,0)) / 86400000)
  if (diff < 0) return { text: `${Math.abs(diff)}d vencida`, overdue: true }
  if (diff === 0) return { text: 'Hoy', overdue: false }
  if (diff === 1) return { text: 'Mañana', overdue: false }
  return { text: `En ${diff}d`, overdue: false }
}

export default function MobileTareas() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('NORMAL')
  const [assignedToId, setAssignedToId] = useState('')
  const [dueDate, setDueDate] = useState('')

  const { data: tasks, isLoading } = useQuery<Task[]>({
    queryKey: ['tasks-mobile'],
    queryFn: () => tasksApi.getAll({ status: 'PENDIENTE' }).then((r) => r.data),
  })

  const { data: users } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => api.get<User[]>('/users').then((r) => r.data),
    staleTime: 60_000,
    enabled: showModal,
  })

  const completeMutation = useMutation({
    mutationFn: (id: string) => tasksApi.updateStatus(id, 'COMPLETADA'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks-mobile'] })
      qc.invalidateQueries({ queryKey: ['tasks'] })
      toast.success('Tarea completada')
    },
  })

  const createMutation = useMutation({
    mutationFn: () => tasksApi.create({
      title: title.trim(),
      priority,
      assignedToId: assignedToId || user!.id,
      dueDate: dueDate || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks-mobile'] })
      qc.invalidateQueries({ queryKey: ['tasks'] })
      toast.success('Tarea creada')
      setShowModal(false)
      setTitle('')
      setPriority('NORMAL')
      setAssignedToId('')
      setDueDate('')
    },
    onError: () => toast.error('Error al crear tarea'),
  })

  const pending = tasks ?? []
  const byPriority = (p: TaskPriority) => pending.filter(t => t.priority === p)

  return (
    <div className="space-y-4 pb-2">
      <div className="flex items-center justify-between">
        <h1 className="text-[#F1F5F9] text-lg font-bold">Tareas</h1>
        <span className="text-[#475569] text-xs">{pending.length} pendientes</span>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-[#141C26] rounded-2xl animate-pulse" />)}
        </div>
      ) : pending.length === 0 ? (
        <div className="bg-[#141C26] border border-[#1E2D3D] rounded-2xl p-8 text-center">
          <Check size={32} className="mx-auto mb-2 text-[#22C55E] opacity-50" />
          <p className="text-[#94A3B8] text-sm font-medium">Todo al día</p>
          <p className="text-[#334155] text-xs mt-0.5">Sin tareas pendientes</p>
        </div>
      ) : (
        (['URGENTE', 'NORMAL', 'DESPUES'] as TaskPriority[]).map((p) => {
          const items = byPriority(p)
          if (items.length === 0) return null
          const cfg = PRIORITY_CONFIG[p]
          return (
            <div key={p}>
              <div className="flex items-center gap-2 mb-2">
                <span style={{ color: cfg.color }}>{cfg.icon}</span>
                <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: cfg.color }}>
                  {cfg.label}
                </h2>
                <span className="text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${cfg.color}22`, color: cfg.color }}>
                  {items.length}
                </span>
              </div>
              <div className="space-y-2">
                {items.map((task) => {
                  const due = task.dueDate ? formatDue(task.dueDate) : null
                  return (
                    <div
                      key={task.id}
                      className="rounded-2xl border p-4 flex items-start gap-3"
                      style={{ backgroundColor: cfg.bg, borderColor: cfg.border }}
                    >
                      <button
                        onClick={() => completeMutation.mutate(task.id)}
                        disabled={completeMutation.isPending}
                        className="mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all hover:scale-110"
                        style={{ borderColor: cfg.color }}
                      >
                        {completeMutation.variables === task.id && completeMutation.isPending
                          ? <div className="w-3 h-3 border-2 border-current rounded-full border-t-transparent animate-spin" style={{ color: cfg.color }} />
                          : null}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-[#F1F5F9] text-sm font-medium leading-snug">{task.title}</p>
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          {task.assignedTo && (
                            <span className="text-[#475569] text-[11px]">→ {task.assignedTo.name}</span>
                          )}
                          {due && (
                            <span className={`text-[11px] font-medium ${due.overdue ? 'text-red-400' : 'text-[#94A3B8]'}`}>
                              {due.text}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })
      )}

      {/* FAB */}
      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-24 right-4 w-14 h-14 bg-[#22C55E] rounded-full flex items-center justify-center shadow-lg shadow-green-900/40 z-40"
      >
        <Plus size={24} className="text-white" />
      </button>

      {/* Create sheet */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-end z-50">
          <div className="bg-[#141C26] border border-[#1E2D3D] rounded-t-3xl w-full p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[#F1F5F9] text-base font-bold">Nueva tarea</h3>
              <button onClick={() => setShowModal(false)}><X size={20} className="text-[#475569]" /></button>
            </div>

            <input
              type="text"
              autoFocus
              placeholder="¿Qué hay que hacer?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#1E2D3D] border border-[#2D3F50] rounded-xl px-4 py-3 text-[#F1F5F9] text-sm placeholder-[#334155] focus:outline-none focus:border-[#22C55E]"
            />

            {/* Priority selector */}
            <div>
              <label className="text-[#94A3B8] text-xs font-medium mb-2 block">Prioridad</label>
              <div className="flex gap-2">
                {(['URGENTE', 'NORMAL', 'DESPUES'] as TaskPriority[]).map((p) => {
                  const cfg = PRIORITY_CONFIG[p]
                  return (
                    <button
                      key={p}
                      onClick={() => setPriority(p)}
                      className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all border"
                      style={
                        priority === p
                          ? { backgroundColor: cfg.color, color: '#fff', borderColor: cfg.color }
                          : { backgroundColor: cfg.bg, color: cfg.color, borderColor: cfg.border }
                      }
                    >
                      {cfg.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Assignee */}
            {users && users.length > 1 && (
              <div>
                <label className="text-[#94A3B8] text-xs font-medium">Asignar a</label>
                <select
                  value={assignedToId}
                  onChange={(e) => setAssignedToId(e.target.value)}
                  className="mt-1 w-full bg-[#1E2D3D] border border-[#2D3F50] rounded-xl px-4 py-3 text-[#F1F5F9] text-sm focus:outline-none focus:border-[#22C55E]"
                >
                  <option value="">Yo mismo</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Due date */}
            <div>
              <label className="text-[#94A3B8] text-xs font-medium">Fecha límite</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="mt-1 w-full bg-[#1E2D3D] border border-[#2D3F50] rounded-xl px-4 py-3 text-[#F1F5F9] text-sm focus:outline-none focus:border-[#22C55E]"
              />
            </div>

            <button
              onClick={() => createMutation.mutate()}
              disabled={!title.trim() || createMutation.isPending}
              className="w-full py-3.5 bg-[#22C55E] text-white rounded-2xl font-semibold text-sm disabled:opacity-50"
            >
              {createMutation.isPending ? 'Creando...' : 'Crear tarea'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
