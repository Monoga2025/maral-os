import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Sparkles, Trash2, Layers, Filter, AlertTriangle, CheckCircle, Plus } from 'lucide-react'
import { imageGenApi } from '../lib/api'
import type { ImageTemplate } from '../types'
import ImageGenStudio from '../components/campaigns/ImageGenStudio'

const TEMPLATE_LABELS: Record<string, string> = {
  promo: '🔥 Promo',
  comparativa: '⚖️ Comparativa',
  lanzamiento: '🚀 Lanzamiento',
  testimonial: '💬 Testimonial',
  educativo: '📚 Educativo',
}

export default function ImageLibrary() {
  const [filterTemplate, setFilterTemplate] = useState<string>('')
  const [page, setPage] = useState(1)
  const [showStudio, setShowStudio] = useState(false)
  const [studioSuggestion, setStudioSuggestion] = useState<{ prompt?: string; template?: ImageTemplate }>({})
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['image-library', filterTemplate, page],
    queryFn: () =>
      imageGenApi.library({ template: filterTemplate || undefined, page, limit: 24 }).then((r) => r.data),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => imageGenApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['image-library'] }),
  })

  const openVariant = (prompt: string, template?: string) => {
    setStudioSuggestion({ prompt, template: template as ImageTemplate | undefined })
    setShowStudio(true)
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            Biblioteca de imágenes IA
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Entregables generados con Nano Banana</p>
        </div>
        <button
          onClick={() => { setStudioSuggestion({}); setShowStudio(true) }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2 text-sm font-semibold transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nueva imagen
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-5">
        <Filter className="h-4 w-4 text-gray-400" />
        <button
          onClick={() => { setFilterTemplate(''); setPage(1) }}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            !filterTemplate ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Todos
        </button>
        {Object.entries(TEMPLATE_LABELS).map(([id, label]) => (
          <button
            key={id}
            onClick={() => { setFilterTemplate(id); setPage(1) }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterTemplate === id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : !data?.data.length ? (
        <div className="text-center py-20 text-gray-400">
          <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">No hay imágenes todavía</p>
          <p className="text-xs mt-1">Genera la primera desde el Studio</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {data.data.map((img) => (
              <div key={img.id} className="group relative rounded-2xl overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-shadow bg-white">
                <img src={img.url} alt={img.prompt} className="w-full aspect-square object-cover" />

                {/* Brand badge */}
                <div className={`absolute top-2 right-2 rounded-full p-1 ${img.approvedByBrand ? 'bg-green-500' : 'bg-yellow-400'}`}>
                  {img.approvedByBrand
                    ? <CheckCircle className="h-3 w-3 text-white" />
                    : <AlertTriangle className="h-3 w-3 text-white" />}
                </div>

                {/* Template chip */}
                {img.template && (
                  <div className="absolute top-2 left-2 bg-black/50 text-white text-[10px] rounded-full px-2 py-0.5">
                    {TEMPLATE_LABELS[img.template] ?? img.template}
                  </div>
                )}

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex flex-col items-center justify-end pb-4 gap-2 opacity-0 group-hover:opacity-100">
                  <p className="text-white text-[10px] text-center px-3 line-clamp-2">{img.prompt}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openVariant(img.prompt, img.template)}
                      className="bg-white/20 hover:bg-white/30 text-white rounded-lg px-3 py-1.5 text-xs flex items-center gap-1 transition-colors"
                    >
                      <Layers className="h-3 w-3" />
                      Variante
                    </button>
                    <button
                      onClick={() => deleteMut.mutate(img.id)}
                      className="bg-red-500/80 hover:bg-red-600 text-white rounded-lg px-2.5 py-1.5 text-xs flex items-center transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                {/* Used in campaigns */}
                {img.usedInCampaigns.length > 0 && (
                  <div className="px-2 py-1.5 border-t border-gray-100">
                    <p className="text-[10px] text-gray-400">
                      Usada en {img.usedInCampaigns.length} campaña{img.usedInCampaigns.length > 1 ? 's' : ''}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Pagination */}
          {data.pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                Anterior
              </button>
              <span className="text-xs text-gray-500">{page} / {data.pagination.pages}</span>
              <button
                onClick={() => setPage((p) => Math.min(data.pagination.pages, p + 1))}
                disabled={page === data.pagination.pages}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                Siguiente
              </button>
            </div>
          )}
        </>
      )}

      {showStudio && (
        <ImageGenStudio
          suggestedPrompt={studioSuggestion.prompt}
          suggestedTemplate={studioSuggestion.template}
          onUse={() => {}}
          onClose={() => { setShowStudio(false); qc.invalidateQueries({ queryKey: ['image-library'] }) }}
        />
      )}
    </div>
  )
}
