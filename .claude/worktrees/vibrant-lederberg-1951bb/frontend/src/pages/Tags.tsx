import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Tag, Users, Layers, Bookmark } from 'lucide-react'
import { toast } from 'sonner'
import { tagsApi, segmentsApi, categoriesApi } from '../lib/api'
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

interface SegmentItem {
  id: string
  code: string
  name: string
  discount: number
  color: string
  description?: string | null
  sortOrder: number
  clientCount: number
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

interface SegmentFormProps {
  initial?: Partial<SegmentItem>
  onSave: (data: { code: string; name: string; discount: number; color: string; description?: string; sortOrder: number }) => void
  onCancel: () => void
  loading?: boolean
}

function SegmentForm({ initial, onSave, onCancel, loading }: SegmentFormProps) {
  const [code, setCode] = useState(initial?.code ?? '')
  const [name, setName] = useState(initial?.name ?? '')
  const [discount, setDiscount] = useState(initial?.discount ?? 0)
  const [color, setColor] = useState(initial?.color ?? '#3B82F6')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [sortOrder, setSortOrder] = useState(initial?.sortOrder ?? 0)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim()) return toast.error('El código es obligatorio')
    if (!name.trim()) return toast.error('El nombre es obligatorio')
    onSave({ code: code.trim().toUpperCase(), name: name.trim(), discount, color, description: description || undefined, sortOrder })
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Código * <span className="text-xs text-gray-400">(ej: IM, DS, VIP)</span></label>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="IM"
            maxLength={10}
            autoFocus={!initial}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descuento %</label>
          <Input
            type="number"
            min={0}
            max={100}
            value={discount}
            onChange={(e) => setDiscount(Number(e.target.value))}
            placeholder="0"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="ej: Importador, Distribuidor, VIP..."
          maxLength={60}
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
          />
          <span className="text-xs text-gray-500 ml-1">{color}</span>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Descripción <span className="text-gray-400">(opcional)</span></label>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Para qué tipo de clientes..."
          maxLength={200}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Orden</label>
        <Input
          type="number"
          min={0}
          value={sortOrder}
          onChange={(e) => setSortOrder(Number(e.target.value))}
          placeholder="0"
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

interface CategoryItem {
  id: string
  code: string
  name: string
  color: string
  description?: string | null
  sortOrder: number
  clientCount: number
}

interface CategoryFormProps {
  initial?: Partial<CategoryItem>
  onSave: (data: { code: string; name: string; color: string; description?: string; sortOrder: number }) => void
  onCancel: () => void
  loading?: boolean
}

function CategoryForm({ initial, onSave, onCancel, loading }: CategoryFormProps) {
  const [code, setCode] = useState(initial?.code ?? '')
  const [name, setName] = useState(initial?.name ?? '')
  const [color, setColor] = useState(initial?.color ?? '#64748B')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [sortOrder, setSortOrder] = useState(initial?.sortOrder ?? 0)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim()) return toast.error('El código es obligatorio')
    if (!name.trim()) return toast.error('El nombre es obligatorio')
    onSave({ code: code.trim().toUpperCase(), name: name.trim(), color, description: description || undefined, sortOrder })
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Código * <span className="text-xs text-gray-400">(ej: VIP, MAYORISTA)</span></label>
          <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="PROSPECTO" maxLength={30} autoFocus={!initial} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Orden</label>
          <Input type="number" min={0} value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="ej: Prospecto, VIP, Distribuidor..." maxLength={60} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
        <div className="flex items-center gap-2 flex-wrap">
          {PRESET_COLORS.map((c) => (
            <button key={c} type="button" onClick={() => setColor(c)}
              className={`w-8 h-8 rounded-full border-2 transition-transform ${color === c ? 'scale-125 border-gray-800' : 'border-transparent hover:scale-110'}`}
              style={{ backgroundColor: c }} />
          ))}
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer border border-gray-300" />
          <span className="text-xs text-gray-500 ml-1">{color}</span>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Descripción <span className="text-gray-400">(opcional)</span></label>
        <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe este tipo de cliente..." maxLength={200} />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={loading}>{loading ? 'Guardando…' : 'Guardar'}</Button>
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

  // ── Segments ────────────────────────────────────────────────
  const [showCreateSegment, setShowCreateSegment] = useState(false)
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null)
  const [confirmDeleteSegmentId, setConfirmDeleteSegmentId] = useState<string | null>(null)

  const { data: segments = [], isLoading: segmentsLoading } = useQuery<SegmentItem[]>({
    queryKey: ['segments'],
    queryFn: () => segmentsApi.getAll().then((r) => r.data),
    staleTime: 30_000,
  })

  const createSegmentMutation = useMutation({
    mutationFn: segmentsApi.create,
    onSuccess: () => {
      toast.success('Segmento creado')
      qc.invalidateQueries({ queryKey: ['segments'] })
      setShowCreateSegment(false)
    },
    onError: (err: any) => toast.error(err?.response?.data?.error ?? 'Error al crear segmento'),
  })

  const updateSegmentMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => segmentsApi.update(id, data),
    onSuccess: () => {
      toast.success('Segmento actualizado')
      qc.invalidateQueries({ queryKey: ['segments'] })
      setEditingSegmentId(null)
    },
    onError: (err: any) => toast.error(err?.response?.data?.error ?? 'Error al actualizar segmento'),
  })

  const deleteSegmentMutation = useMutation({
    mutationFn: segmentsApi.delete,
    onSuccess: () => {
      toast.success('Segmento eliminado')
      qc.invalidateQueries({ queryKey: ['segments'] })
      setConfirmDeleteSegmentId(null)
    },
    onError: (err: any) => toast.error(err?.response?.data?.error ?? 'Error al eliminar segmento'),
  })

  const segToDelete = segments.find((s) => s.id === confirmDeleteSegmentId)

  // ── Categories ──────────────────────────────────────────────
  const [showCreateCategory, setShowCreateCategory] = useState(false)
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [confirmDeleteCategoryId, setConfirmDeleteCategoryId] = useState<string | null>(null)

  const { data: categories = [], isLoading: categoriesLoading } = useQuery<CategoryItem[]>({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.getAll().then((r) => r.data),
    staleTime: 30_000,
  })

  const createCategoryMutation = useMutation({
    mutationFn: categoriesApi.create,
    onSuccess: () => { toast.success('Categoría creada'); qc.invalidateQueries({ queryKey: ['categories'] }); setShowCreateCategory(false) },
    onError: (err: any) => toast.error(err?.response?.data?.error ?? 'Error al crear categoría'),
  })

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => categoriesApi.update(id, data),
    onSuccess: () => { toast.success('Categoría actualizada'); qc.invalidateQueries({ queryKey: ['categories'] }); setEditingCategoryId(null) },
    onError: (err: any) => toast.error(err?.response?.data?.error ?? 'Error al actualizar categoría'),
  })

  const deleteCategoryMutation = useMutation({
    mutationFn: categoriesApi.delete,
    onSuccess: () => { toast.success('Categoría eliminada'); qc.invalidateQueries({ queryKey: ['categories'] }); setConfirmDeleteCategoryId(null) },
    onError: (err: any) => toast.error(err?.response?.data?.error ?? 'Error al eliminar categoría'),
  })

  const catToDelete = categories.find((c) => c.id === confirmDeleteCategoryId)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Etiquetas y Segmentos</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Organiza clientes para segmentar campañas y cotizaciones
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {!showCreate && (
            <Button variant="outline" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setShowCreate(true)}>
              Nueva Etiqueta
            </Button>
          )}
          {!showCreateSegment && (
            <Button variant="outline" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setShowCreateSegment(true)}>
              Nuevo Segmento
            </Button>
          )}
          {!showCreateCategory && (
            <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setShowCreateCategory(true)}>
              Nueva Categoría
            </Button>
          )}
        </div>
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

      {/* ── Segments section ──────────────────────────────────── */}
      <div className="pt-2">
        <div className="flex items-center gap-2 mb-3">
          <Layers className="h-5 w-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-800">Segmentos</h2>
          <span className="text-xs text-gray-400 ml-1">Categorías con descuento automático</span>
        </div>

        {/* Create segment form */}
        {showCreateSegment && (
          <Card className="mb-4">
            <div className="p-5">
              <h3 className="text-base font-semibold text-gray-800 mb-4">Nuevo segmento</h3>
              <SegmentForm
                onSave={(data) => createSegmentMutation.mutate(data)}
                onCancel={() => setShowCreateSegment(false)}
                loading={createSegmentMutation.isPending}
              />
            </div>
          </Card>
        )}

        {segmentsLoading ? (
          <div className="text-center py-8 text-gray-400">Cargando segmentos…</div>
        ) : segments.length === 0 && !showCreateSegment ? (
          <div className="text-center py-8 text-gray-400">
            <Layers className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Sin segmentos definidos. Crea el primero.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {segments.map((seg) => (
              <Card key={seg.id} className="overflow-hidden">
                {editingSegmentId === seg.id ? (
                  <div className="p-4">
                    <SegmentForm
                      initial={seg}
                      onSave={(data) => updateSegmentMutation.mutate({ id: seg.id, data })}
                      onCancel={() => setEditingSegmentId(null)}
                      loading={updateSegmentMutation.isPending}
                    />
                  </div>
                ) : (
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-white text-xs font-bold"
                          style={{ backgroundColor: seg.color }}
                        >
                          {seg.code}
                        </span>
                        <div className="min-w-0">
                          <span className="font-semibold text-gray-900 block truncate">{seg.name}</span>
                          <span className="text-xs text-gray-500">{seg.discount}% descuento</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setEditingSegmentId(seg.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Editar"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteSegmentId(seg.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    {seg.description && (
                      <p className="mt-1.5 text-xs text-gray-500 line-clamp-2">{seg.description}</p>
                    )}
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-400">
                      <Users className="h-3.5 w-3.5" />
                      <span>{seg.clientCount} cliente{seg.clientCount !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Confirm delete segment modal */}
      {confirmDeleteSegmentId && segToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-semibold text-gray-900 mb-2">¿Eliminar segmento?</h3>
            <p className="text-sm text-gray-600 mb-1">
              Se eliminará <strong>"{segToDelete.name}" ({segToDelete.code})</strong>.
            </p>
            {segToDelete.clientCount > 0 && (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
                {segToDelete.clientCount} cliente{segToDelete.clientCount !== 1 ? 's' : ''} activo{segToDelete.clientCount !== 1 ? 's' : ''} usa{segToDelete.clientCount !== 1 ? 'n' : ''} este segmento. Debes reasignarlos antes de eliminar.
              </p>
            )}
            <p className="text-xs text-gray-400 mb-5">Esta acción no se puede deshacer.</p>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setConfirmDeleteSegmentId(null)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteSegmentMutation.mutate(segToDelete.id)}
                disabled={deleteSegmentMutation.isPending || segToDelete.clientCount > 0}
              >
                {deleteSegmentMutation.isPending ? 'Eliminando…' : 'Eliminar'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Categories section ────────────────────────────────── */}
      <div className="pt-2">
        <div className="flex items-center gap-2 mb-3">
          <Bookmark className="h-5 w-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-800">Categorías</h2>
          <span className="text-xs text-gray-400 ml-1">Tipos de cliente</span>
        </div>

        {showCreateCategory && (
          <Card className="mb-4">
            <div className="p-5">
              <h3 className="text-base font-semibold text-gray-800 mb-4">Nueva categoría</h3>
              <CategoryForm
                onSave={(data) => createCategoryMutation.mutate(data)}
                onCancel={() => setShowCreateCategory(false)}
                loading={createCategoryMutation.isPending}
              />
            </div>
          </Card>
        )}

        {categoriesLoading ? (
          <div className="text-center py-8 text-gray-400">Cargando categorías…</div>
        ) : categories.length === 0 && !showCreateCategory ? (
          <div className="text-center py-8 text-gray-400">
            <Bookmark className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Sin categorías. Crea la primera.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((cat) => (
              <Card key={cat.id} className="overflow-hidden">
                {editingCategoryId === cat.id ? (
                  <div className="p-4">
                    <CategoryForm
                      initial={cat}
                      onSave={(data) => updateCategoryMutation.mutate({ id: cat.id, data })}
                      onCancel={() => setEditingCategoryId(null)}
                      loading={updateCategoryMutation.isPending}
                    />
                  </div>
                ) : (
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                        <div className="min-w-0">
                          <span className="font-semibold text-gray-900 block truncate">{cat.name}</span>
                          <span className="text-xs text-gray-400 font-mono">{cat.code}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button type="button" onClick={() => setEditingCategoryId(cat.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Editar">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={() => setConfirmDeleteCategoryId(cat.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Eliminar">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    {cat.description && <p className="mt-1.5 text-xs text-gray-500 line-clamp-2">{cat.description}</p>}
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-400">
                      <Users className="h-3.5 w-3.5" />
                      <span>{cat.clientCount} cliente{cat.clientCount !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Confirm delete category modal */}
      {confirmDeleteCategoryId && catToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-semibold text-gray-900 mb-2">¿Eliminar categoría?</h3>
            <p className="text-sm text-gray-600 mb-1">Se eliminará <strong>"{catToDelete.name}"</strong>.</p>
            {catToDelete.clientCount > 0 && (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
                {catToDelete.clientCount} cliente{catToDelete.clientCount !== 1 ? 's' : ''} usa{catToDelete.clientCount !== 1 ? 'n' : ''} esta categoría. Reasígnalos antes de eliminar.
              </p>
            )}
            <p className="text-xs text-gray-400 mb-5">Esta acción no se puede deshacer.</p>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setConfirmDeleteCategoryId(null)}>Cancelar</Button>
              <Button variant="destructive" onClick={() => deleteCategoryMutation.mutate(catToDelete.id)}
                disabled={deleteCategoryMutation.isPending || catToDelete.clientCount > 0}>
                {deleteCategoryMutation.isPending ? 'Eliminando…' : 'Eliminar'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete tag modal */}
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
