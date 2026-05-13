import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, Play, Pause, Eye, Trash2, Search, Megaphone } from 'lucide-react'
import { campaignsApi } from '../lib/api'
import type { Campaign, CampaignStatus } from '../types'

const STATUS_LABEL: Record<CampaignStatus, string> = {
  BORRADOR: 'Borrador',
  VALIDANDO: 'Validando',
  LISTA: 'Lista',
  EN_CURSO: 'En curso',
  PAUSADA: 'Pausada',
  COMPLETADA: 'Completada',
  CANCELADA: 'Cancelada',
}

const STATUS_COLOR: Record<CampaignStatus, string> = {
  BORRADOR: 'bg-gray-100 text-gray-700',
  VALIDANDO: 'bg-yellow-100 text-yellow-700',
  LISTA: 'bg-blue-100 text-blue-700',
  EN_CURSO: 'bg-green-100 text-green-700',
  PAUSADA: 'bg-orange-100 text-orange-700',
  COMPLETADA: 'bg-emerald-100 text-emerald-700',
  CANCELADA: 'bg-red-100 text-red-700',
}

export default function Campaigns() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['campaigns', statusFilter, search],
    queryFn: () =>
      campaignsApi.list({ status: statusFilter || undefined, search: search || undefined }).then((r) => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => campaignsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns'] }),
  })

  const pauseMutation = useMutation({
    mutationFn: (id: string) => campaignsApi.pause(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns'] }),
  })

  const resumeMutation = useMutation({
    mutationFn: (id: string) => campaignsApi.resume(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns'] }),
  })

  const handleAction = (c: Campaign) => {
    if (['EN_CURSO', 'PAUSADA', 'COMPLETADA', 'CANCELADA'].includes(c.status)) {
      navigate(`/campanas/${c.id}`)
    } else {
      navigate(`/campanas/${c.id}/editar`)
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-green-600" />
            Campañas WhatsApp
          </h1>
          <p className="text-sm text-gray-500 mt-1">Secuencias automatizadas de mensajes a clientes</p>
        </div>
        <button
          onClick={() => navigate('/campanas/nueva')}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm font-medium"
          data-tour="campaigns-new"
        >
          <Plus className="h-4 w-4" />
          Nueva campaña
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5" data-tour="campaigns-filters">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar campaña…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm w-full focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">Todos los estados</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-16 text-gray-500">Cargando campañas…</div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Megaphone className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No hay campañas aún</p>
          <p className="text-sm mt-1">Crea tu primera campaña para empezar a vender.</p>
          <button
            onClick={() => navigate('/campanas/nueva')}
            className="mt-4 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm"
          >
            Crear campaña
          </button>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden" data-tour="campaigns-table">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Nombre</th>
                <th className="px-4 py-3 text-left">Estado</th>
                <th className="px-4 py-3 text-right">Destinatarios</th>
                <th className="px-4 py-3 text-right">Enviados</th>
                <th className="px-4 py-3 text-right">Respuestas</th>
                <th className="px-4 py-3 text-left">Creada</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {campaigns.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleAction(c)}
                      className="font-medium text-gray-900 hover:text-green-700 text-left"
                    >
                      {c.name}
                    </button>
                    {c.objective && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{c.objective}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[c.status]}`}>
                      {STATUS_LABEL[c.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">
                    {c._count?.recipients ?? 0}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">
                    {c.metrics?.sent ?? 0}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">
                    {c.metrics?.replied ?? 0}
                    {(c.metrics?.sent ?? 0) > 0 && (
                      <span className="text-xs text-gray-400 ml-1">
                        ({Math.round(((c.metrics?.replied ?? 0) / (c.metrics?.sent ?? 1)) * 100)}%)
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(c.createdAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleAction(c)}
                        className="p-1.5 text-gray-500 hover:text-green-700 hover:bg-green-50 rounded"
                        title={c.status === 'BORRADOR' ? 'Editar' : 'Ver'}
                      >
                        <Eye className="h-4 w-4" />
                      </button>

                      {c.status === 'EN_CURSO' && (
                        <button
                          onClick={() => pauseMutation.mutate(c.id)}
                          className="p-1.5 text-orange-500 hover:bg-orange-50 rounded"
                          title="Pausar"
                        >
                          <Pause className="h-4 w-4" />
                        </button>
                      )}

                      {c.status === 'PAUSADA' && (
                        <button
                          onClick={() => resumeMutation.mutate(c.id)}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                          title="Reanudar"
                        >
                          <Play className="h-4 w-4" />
                        </button>
                      )}

                      {c.status === 'BORRADOR' && (
                        <button
                          onClick={() => {
                            if (confirm(`¿Eliminar campaña "${c.name}"?`)) deleteMutation.mutate(c.id)
                          }}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
