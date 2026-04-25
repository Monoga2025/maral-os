import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Tag, Users } from 'lucide-react'
import { toast } from 'sonner'
import { tagsApi } from '../lib/api'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'

const PRESET_COLORS = [
  '#3B82F6', '#8B5CF6', '#EC4899', '#EF4444', '#F97316',
  '#EAB308', '#22C55E', '#14B8A6', '#06B6D4', '#64748B',
]

interface TagItem {
  id: string
  name: string
  color: string
  description?: string | null
  clientCount: number
  createdAt: string
}

interface TagFormProps {
  initial?: Partial<TagItem>
  onSave: (data: { name: string; color: string; description?: string }) => void
  onCancel: () => void
  loading?: boolean
}

function TagForm({ initial, onSave, onCancel, loading }: TagFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [color, setColor] = useState(initial?.color ?? '#3B82F6')
  const [description, setDescription] = useState(initial?.description ?? '')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return toast.error('El nombre es obligatorio')
    onSave({ name: name.trim(), color, description: description || undefined })
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="ej: Instaladores CCTV, Zona norte, VIP..."
          autoFocus
          maxLength={50}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
        <div className="flex items-center gap-2 flex-wrap">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`w-8 h-8 rounded-full border-2 transition-transform ${color === c ? 'scale-125 border-gray-800' : 'border-transparent hover:scale-110'}`}
              style={{ backgroundColor: c }}
            />
          ))}
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-8 h-8 rounded cursor-pointer border border-gray-300"
            title="Color personalizado"
          />
          <span className="text-xs text-gray-500 ml-1">{color}</span>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Descripción <span className="text-gray-400">(opcional)</span></label>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Para qué se usa esta etiqueta..."
          maxLength={200}
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Guardando…' : 'Guardar'}
        </Button>
      </div>
    </form>
  )
}

export default function Tags() {
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const { data: tags = [], isLoading } = useQuery<TagItem[]>({
    queryKey: ['tags'],
    queryFn: () => tagsApi.getAll().then((r) => r.data),
    staleTime: 30_000,
  })

  const createMutation = useMutation({
    mutationFn: tagsApi.create,
    onSuccess: () => {
      toast.success('Etiqueta creada')
      qc.invalidateQueries({ queryKey: ['tags'] })
      setShowCreate(false)
    },
    onError: (err: any) => toast.error(err?.response?.data?.error ?? 'Error al crear etiqueta'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => tagsApi.update(id, data),
    onSuccess: () => {
      toast.success('Etiqueta actualizada')
      qc.invalidateQueries({ queryKey: ['tags'] })
      setEditingId(null)
    },
    onError: (err: any) => toast.error(err?.response?.data?.error ?? 'Error al actualizar'),
  })

  const deleteMutation = useMutation({
    mutationFn: tagsApi.delete,
    onSuccess: () => {
      toast.success('Etiqueta eliminada')
      qc.invalidateQueries({ queryKey: ['tags'] })
      setConfirmDeleteId(null)
    },
    onError: () => toast.error('Error al eliminar etiqueta'),
  })

  const toDelete = tags.find((t) => t.id === confirmDeleteId)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Etiquetas</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Organiza clientes con etiquetas para segmentar campañas
          </p>
        </div>
        {!showCreate && (
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setShowCreate(true)}>
            Nueva Etiqueta
          </Button>
        )}
      </div>

      {/* Create form */}
      {showCreate && (
        <Card>
          <div className="p-5">
            <h2 className="text-base font-semibold text-gray-800 mb-4">Nueva etiqueta</h2>
            <TagForm
              onSave={(data) => createMutation.mutate(data)}
              onCancel={() => setShowCreate(false)}
              loading={createMutation.isPending}
            />
          </div>
        </Card>
      )}

      {/* Tag list */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Cargando etiquetas…</div>
      ) : tags.length === 0 && !showCreate ? (
        <EmptyState
          icon={<Tag className="h-8 w-8" />}
          title="Sin etiquetas"
          description="Crea tu primera etiqueta para organizar clientes y segmentar campañas"
          action={{ label: 'Nueva Etiqueta', onClick: () => setShowCreate(true) }}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tags.map((tag) => (
            <Card key={tag.id} className="overflow-hidden">
              {editingId === tag.id ? (
                <div className="p-4">
                  <TagForm
                    initial={tag}
                    onSave={(data) => updateMutation.mutate({ id: tag.id, data })}
                    onCancel={() => setEditingId(null)}
                    loading={updateMutation.isPending}
                  />
                </div>
              ) : (
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-4 h-4 rounded-full shrink-0"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="font-semibold text-gray-900 truncate">{tag.name}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setEditingId(tag.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Editar"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(tag.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  {tag.description && (
                    <p className="mt-1.5 text-xs text-gray-500 line-clamp-2">{tag.description}</p>
                  )}
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-400">
                    <Users className="h-3.5 w-3.5" />
                    <span>{tag.clientCount} cliente{tag.clientCount !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Confirm delete modal */}
      {confirmDeleteId && toDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-semibold text-gray-900 mb-2">¿Eliminar etiqueta?</h3>
            <p className="text-sm text-gray-600 mb-1">
              Se eliminará <strong>"{toDelete.name}"</strong> y se desasignará de{' '}
              <strong>{toDelete.clientCount} cliente{toDelete.clientCount !== 1 ? 's' : ''}</strong>.
            </p>
            <p className="text-xs text-gray-400 mb-5">Esta acción no se puede deshacer.</p>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setConfirmDeleteId(null)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteMutation.mutate(toDelete.id)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'Eliminando…' : 'Eliminar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
