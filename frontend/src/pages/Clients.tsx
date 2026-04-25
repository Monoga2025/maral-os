import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  Search,
  Users,
  MessageCircle,
  Eye,
  Filter,
  Tag,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { clientsApi, tagsApi } from '../lib/api'
import { formatDate, formatCOP } from '../lib/utils'
import { Button } from '../components/ui/Button'
import { TourButton } from '../components/tour/TourButton'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../components/ui/Table'
import { ClientCategoryBadge, FactoringStatusBadge } from '../components/ui/StatusBadge'
import { Pagination } from '../components/ui/Pagination'
import { EmptyState } from '../components/ui/EmptyState'
import { TableSkeleton } from '../components/ui/LoadingSkeleton'
import { Card } from '../components/ui/Card'
import type { ClientCategory, PurchaseFrequency } from '../types'

type Segment = 'IM' | 'DS' | 'CF'

const SEGMENT_LABELS: Record<Segment, string> = {
  IM: 'Importador (IM)',
  DS: 'Distribuidor (DS)',
  CF: 'Cliente Final (CF)',
}

const SEGMENT_COLORS: Record<Segment, string> = {
  IM: 'bg-blue-100 text-blue-700 border-blue-200',
  DS: 'bg-purple-100 text-purple-700 border-purple-200',
  CF: 'bg-green-100 text-green-700 border-green-200',
}

const FREQ_LABELS: Record<PurchaseFrequency, string> = {
  FRECUENTE: 'Frecuente',
  INTERMITENTE: 'Intermitente',
  ESPORADICA: 'Esporádica',
  NINGUNA: '—',
}

const FREQ_COLORS: Record<PurchaseFrequency, string> = {
  FRECUENTE: 'bg-green-100 text-green-700',
  INTERMITENTE: 'bg-yellow-100 text-yellow-700',
  ESPORADICA: 'bg-orange-100 text-orange-700',
  NINGUNA: 'text-gray-400',
}

function SegmentBadge({ segment }: { segment?: string | null }) {
  if (!segment) return <span className="text-gray-400 text-xs">—</span>
  const s = segment as Segment
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${SEGMENT_COLORS[s] ?? 'bg-gray-100 text-gray-600'}`}>
      {s}
    </span>
  )
}

function LastOrdersDots({ dates }: { dates?: string[] }) {
  if (!dates || dates.length === 0) return <span className="text-gray-400 text-xs">Sin pedidos</span>
  return (
    <div className="space-y-0.5">
      {dates.map((d, i) => {
        const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000)
        const color = days <= 30 ? 'text-green-600' : days <= 90 ? 'text-amber-600' : 'text-red-500'
        return (
          <p key={i} className={`text-xs ${color}`}>
            {formatDate(d)}
          </p>
        )
      })}
    </div>
  )
}

export default function Clients() {
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [city, setCity] = useState('')
  const [tag, setTag] = useState('')
  const [segmentFilter, setSegmentFilter] = useState('')
  const [page, setPage] = useState(1)

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkSegment, setBulkSegment] = useState<string>('')
  const [bulkTagId, setBulkTagId] = useState<string>('')

  const { data, isLoading } = useQuery({
    queryKey: ['clients', { search, category, city, tag, segmentFilter, page }],
    queryFn: () =>
      clientsApi
        .getAll({ search: search || undefined, category: category || undefined, city: city || undefined, tag: tag || undefined, page, pageSize: 20 })
        .then((r) => r.data),
    staleTime: 30_000,
  })

  const { data: cities } = useQuery({
    queryKey: ['client-cities'],
    queryFn: () => clientsApi.getCities().then((r) => r.data as string[]),
    staleTime: 300_000,
  })

  const { data: allTags } = useQuery({
    queryKey: ['client-tags'],
    queryFn: () => clientsApi.getTags().then((r) => r.data as string[]),
    staleTime: 300_000,
  })

  const { data: allTagEntities = [] } = useQuery<{ id: string; name: string; color: string }[]>({
    queryKey: ['tags'],
    queryFn: () => tagsApi.getAll().then((r) => r.data),
    staleTime: 60_000,
  })

  const bulkSegmentMutation = useMutation({
    mutationFn: ({ ids, segment }: { ids: string[]; segment: Segment | null }) =>
      clientsApi.bulkSegment(ids, segment),
    onSuccess: (res) => {
      toast.success(`${res.data.updated} clientes actualizados`)
      setSelectedIds(new Set())
      setBulkSegment('')
      qc.invalidateQueries({ queryKey: ['clients'] })
    },
    onError: () => toast.error('Error al actualizar segmentos'),
  })

  const bulkTagMutation = useMutation({
    mutationFn: ({ ids, tagId }: { ids: string[]; tagId: string }) =>
      tagsApi.bulkAssign(ids, [tagId], 'add'),
    onSuccess: () => {
      toast.success(`Etiqueta asignada a ${selectedIds.size} clientes`)
      setSelectedIds(new Set())
      setBulkTagId('')
      qc.invalidateQueries({ queryKey: ['clients'] })
    },
    onError: () => toast.error('Error al asignar etiqueta'),
  })

  const clients = data?.data ?? []
  const pageIds = clients.map((c) => c.id)

  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id))
  const someSelected = selectedIds.size > 0

  const toggleAll = () => {
    if (allPageSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        pageIds.forEach((id) => next.delete(id))
        return next
      })
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        pageIds.forEach((id) => next.add(id))
        return next
      })
    }
  }

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const applyBulkSegment = () => {
    const ids = Array.from(selectedIds)
    const segment = bulkSegment === 'NINGUNA' ? null : (bulkSegment as Segment)
    bulkSegmentMutation.mutate({ ids, segment })
  }

  const handleWhatsApp = (phone: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const clean = phone.replace(/\D/g, '')
    window.open(`https://wa.me/57${clean}`, '_blank')
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {data?.pagination?.total ?? 0} clientes registrados
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TourButton tourId="clientes" />
          <Button
            data-tour="new-client-btn"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => navigate('/clientes/nuevo')}
          >
            Nuevo Cliente
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-wrap items-center gap-3 p-4">
          <Filter className="h-4 w-4 text-gray-400 shrink-0" />
          <div className="flex-1 min-w-[200px]">
            <Input
              data-tour="client-search"
              placeholder="Buscar por nombre, empresa, RUT..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              prefix={<Search className="h-4 w-4" />}
            />
          </div>
          <Select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1) }} className="w-48">
            <option value="">Todas las categorías</option>
            <option value="IMPORTADOR">Importador (IM)</option>
            <option value="DISTRIBUIDOR">Distribuidor (DS)</option>
            <option value="CLIENTE_FINAL">Cliente Final (CF)</option>
            <option value="PROSPECTO">Prospecto</option>
            <option value="ALIADO">Aliado</option>
            <option value="FUNDADOR_HISTORICO">Fundador Histórico</option>
            <option value="FUNDADOR_MARAL">Fundador Maral</option>
          </Select>
          <Select value={segmentFilter} onChange={(e) => { setSegmentFilter(e.target.value); setPage(1) }} className="w-44">
            <option value="">Todos los segmentos</option>
            <option value="IM">IM — Importador</option>
            <option value="DS">DS — Distribuidor</option>
            <option value="CF">CF — Cliente Final</option>
          </Select>
          <Select value={city} onChange={(e) => { setCity(e.target.value); setPage(1) }} className="w-40">
            <option value="">Todas las ciudades</option>
            {(cities ?? []).map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>
          <Select value={tag} onChange={(e) => { setTag(e.target.value); setPage(1) }} className="w-44">
            <option value="">Todas las etiquetas</option>
            {(allTags ?? []).map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </Select>
        </div>
      </Card>

      {/* Bulk action bar */}
      {someSelected && (
        <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
          <span className="text-sm font-semibold text-blue-800">
            {selectedIds.size} cliente{selectedIds.size !== 1 ? 's' : ''} seleccionado{selectedIds.size !== 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-3 ml-auto flex-wrap">
            {/* Asignar etiqueta */}
            {allTagEntities.length > 0 && (
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-blue-600 shrink-0" />
                <select
                  value={bulkTagId}
                  onChange={(e) => setBulkTagId(e.target.value)}
                  className="rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Asignar etiqueta…</option>
                  {allTagEntities.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <Button
                  size="sm"
                  disabled={!bulkTagId || bulkTagMutation.isPending}
                  onClick={() => bulkTagMutation.mutate({ ids: Array.from(selectedIds), tagId: bulkTagId })}
                >
                  {bulkTagMutation.isPending ? 'Asignando…' : 'Asignar'}
                </Button>
              </div>
            )}
            {/* Separador */}
            <div className="h-6 w-px bg-blue-200" />
            {/* Asignar segmento */}
            <div className="flex items-center gap-2">
              <select
                value={bulkSegment}
                onChange={(e) => setBulkSegment(e.target.value)}
                className="rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Asignar segmento…</option>
                <option value="IM">IM — Importador (36% dto.)</option>
                <option value="DS">DS — Distribuidor (26% dto.)</option>
                <option value="CF">CF — Cliente Final (10% dto.)</option>
                <option value="NINGUNA">Sin segmento</option>
              </select>
              <Button
                size="sm"
                disabled={!bulkSegment || bulkSegmentMutation.isPending}
                onClick={applyBulkSegment}
              >
                {bulkSegmentMutation.isPending ? 'Aplicando…' : 'Aplicar'}
              </Button>
            </div>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="ml-1 rounded-lg p-1.5 text-blue-500 hover:bg-blue-100 transition-colors"
              title="Cancelar selección"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <Card data-tour="client-list" className="overflow-hidden">
        {isLoading ? (
          <TableSkeleton rows={8} />
        ) : !clients.length ? (
          <EmptyState
            icon={<Users className="h-8 w-8" />}
            title="No se encontraron clientes"
            description="Ajusta los filtros o crea un nuevo cliente"
            action={{ label: 'Nuevo Cliente', onClick: () => navigate('/clientes/nuevo') }}
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      checked={allPageSelected}
                      onChange={toggleAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      title={allPageSelected ? 'Deseleccionar todos' : 'Seleccionar todos en esta página'}
                    />
                  </TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Ciudad</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>
                    <span className="flex items-center gap-1">
                      <Tag className="h-3.5 w-3.5 text-gray-400" />
                      Segmento
                    </span>
                  </TableHead>
                  <TableHead><Tag className="h-3.5 w-3.5 inline mr-1 text-gray-400" />Etiquetas</TableHead>
                  <TableHead>Frecuencia</TableHead>
                  <TableHead>Últimos pedidos</TableHead>
                  <TableHead>Crédito</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => {
                  const freq = (client.purchaseFrequency ?? 'NINGUNA') as PurchaseFrequency
                  const isSelected = selectedIds.has(client.id)
                  return (
                    <TableRow
                      key={client.id}
                      className={`cursor-pointer ${isSelected ? 'bg-blue-50' : ''}`}
                      onClick={() => navigate(`/clientes/${client.id}`)}
                    >
                      <TableCell onClick={(e) => { e.stopPropagation(); toggleOne(client.id) }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOne(client.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-semibold text-gray-900">{client.name}</p>
                          {client.rut && (
                            <p className="text-xs text-gray-400">NIT: {client.rut}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-gray-600">{client.company ?? '—'}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-gray-600">{client.city ?? '—'}</span>
                      </TableCell>
                      <TableCell>
                        <ClientCategoryBadge category={client.category as ClientCategory} />
                      </TableCell>
                      <TableCell>
                        <SegmentBadge segment={(client as any).segment} />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {((client as any).tags ?? []).slice(0, 3).map((t: { id: string; name: string; color: string }) => (
                            <span
                              key={t.id}
                              className="text-xs px-1.5 py-0.5 rounded-full font-medium border"
                              style={{ backgroundColor: t.color + '20', color: t.color, borderColor: t.color + '40' }}
                            >
                              {t.name}
                            </span>
                          ))}
                          {((client as any).tags ?? []).length > 3 && (
                            <span className="text-xs text-gray-400">+{((client as any).tags ?? []).length - 3}</span>
                          )}
                          {((client as any).tags ?? []).length === 0 && (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {freq !== 'NINGUNA' ? (
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${FREQ_COLORS[freq]}`}>
                            {FREQ_LABELS[freq]}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <LastOrdersDots dates={client.lastOrders} />
                      </TableCell>
                      <TableCell>
                        <div>
                          <FactoringStatusBadge status={client.factoringStatus} />
                          <p className="text-xs text-gray-400 mt-0.5">
                            Cupo: {formatCOP(client.creditLimit)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1.5">
                          {(client.whatsapp ?? client.phone) && (
                            <button
                              onClick={(e) => handleWhatsApp(client.whatsapp ?? client.phone ?? '', e)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-green-600 hover:bg-green-50 hover:border-green-200 transition-colors"
                              title="WhatsApp"
                            >
                              <MessageCircle className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); navigate(`/clientes/${client.id}`) }}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-colors"
                            title="Ver detalle"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
            <Pagination
              page={page}
              totalPages={data!.pagination.pages}
              total={data!.pagination.total}
              pageSize={20}
              onPageChange={setPage}
            />
          </>
        )}
      </Card>
    </div>
  )
}
