import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  Search,
  Users,
  MessageCircle,
  Eye,
  Filter,
} from 'lucide-react'
import { clientsApi } from '../lib/api'
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
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [city, setCity] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['clients', { search, category, city, page }],
    queryFn: () =>
      clientsApi
        .getAll({ search: search || undefined, category: category || undefined, city: city || undefined, page, pageSize: 20 })
        .then((r) => r.data),
    staleTime: 30_000,
  })

  const { data: cities } = useQuery({
    queryKey: ['client-cities'],
    queryFn: () => clientsApi.getCities().then((r) => r.data as string[]),
    staleTime: 300_000,
  })

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
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              prefix={<Search className="h-4 w-4" />}
            />
          </div>
          <Select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value)
              setPage(1)
            }}
            className="w-48"
          >
            <option value="">Todas las categorías</option>
            <option value="IMPORTADOR">Importador (IM)</option>
            <option value="DISTRIBUIDOR">Distribuidor (DS)</option>
            <option value="CLIENTE_FINAL">Cliente Final (CF)</option>
            <option value="PROSPECTO">Prospecto</option>
            <option value="ALIADO">Aliado</option>
            <option value="FUNDADOR_HISTORICO">Fundador Histórico</option>
            <option value="FUNDADOR_MARAL">Fundador Maral</option>
          </Select>
          <Select
            value={city}
            onChange={(e) => {
              setCity(e.target.value)
              setPage(1)
            }}
            className="w-40"
          >
            <option value="">Todas las ciudades</option>
            {(cities ?? []).map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>
        </div>
      </Card>

      {/* Table */}
      <Card data-tour="client-list" className="overflow-hidden">
        {isLoading ? (
          <TableSkeleton rows={8} />
        ) : !data?.data?.length ? (
          <EmptyState
            icon={<Users className="h-8 w-8" />}
            title="No se encontraron clientes"
            description="Ajusta los filtros o crea un nuevo cliente"
            action={{
              label: 'Nuevo Cliente',
              onClick: () => navigate('/clientes/nuevo'),
            }}
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Ciudad</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Frecuencia</TableHead>
                  <TableHead>Últimos pedidos</TableHead>
                  <TableHead>Crédito</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((client) => {
                  const freq = (client.purchaseFrequency ?? 'NINGUNA') as PurchaseFrequency
                  return (
                    <TableRow
                      key={client.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/clientes/${client.id}`)}
                    >
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
                              onClick={(e) =>
                                handleWhatsApp(
                                  client.whatsapp ?? client.phone ?? '',
                                  e
                                )
                              }
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-green-600 hover:bg-green-50 hover:border-green-200 transition-colors"
                              title="WhatsApp"
                            >
                              <MessageCircle className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              navigate(`/clientes/${client.id}`)
                            }}
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
              totalPages={data.pagination.pages}
              total={data.pagination.total}
              pageSize={20}
              onPageChange={setPage}
            />
          </>
        )}
      </Card>
    </div>
  )
}
