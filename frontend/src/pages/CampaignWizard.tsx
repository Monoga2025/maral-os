import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowRight, ArrowLeft, Upload, X, Image as ImageIcon,
  Users, Sparkles, CheckCircle, Megaphone, Target, FileText,
} from 'lucide-react'
import { toast } from 'sonner'
import { campaignsApi, categoriesApi, tagsApi, segmentsApi } from '../lib/api'
import type { AudienceFilter } from '../types'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

const OBJECTIVES = [
  { value: 'top_of_mind', label: '📡 Top of mind', desc: 'Clientes inactivos o nuevos — hacernos recordar' },
  { value: 'reactivacion', label: '🔄 Reactivación', desc: 'Clientes con historial que no compran hace tiempo' },
  { value: 'educativo', label: '🎓 Educativo', desc: 'Posicionar a MARAL como experto técnico' },
  { value: 'cierre', label: '🚀 Cierre', desc: 'Cliente caliente que ya mostró interés' },
  { value: 'recuperacion', label: '🛟 Recuperación', desc: 'Cliente con objeción o pendiente de respuesta' },
  { value: 'sector_especifico', label: '🏭 Sector específico', desc: 'Segmento puntual: hidrocarburos, municipal...' },
]

interface UploadedFile {
  url: string
  name: string
  previewUrl: string
  uploading?: boolean
}

const STEPS = [
  { num: 1, label: 'Briefing', icon: <Megaphone className="h-4 w-4" /> },
  { num: 2, label: 'Fotos', icon: <ImageIcon className="h-4 w-4" /> },
  { num: 3, label: 'Detalles', icon: <FileText className="h-4 w-4" /> },
  { num: 4, label: 'Audiencia', icon: <Users className="h-4 w-4" /> },
  { num: 5, label: 'Generar', icon: <Sparkles className="h-4 w-4" /> },
]

export default function CampaignWizard() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState(1)
  const [isDragging, setIsDragging] = useState(false)

  // Step 1
  const [name, setName] = useState('')
  const [objective, setObjective] = useState('top_of_mind')
  const [productDescription, setProductDescription] = useState('')

  // Step 2
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])

  // Step 3
  const [characteristics, setCharacteristics] = useState('')
  const [priceInfo, setPriceInfo] = useState('')
  const [callToAction, setCallToAction] = useState('')

  // Step 4
  const [filters, setFilters] = useState<AudienceFilter>({ excludeOptedOut: true })
  const [audienceCount, setAudienceCount] = useState<number | null>(null)
  const [campaignId, setCampaignId] = useState<string | null>(null)

  // Step 5
  const [generating, setGenerating] = useState(false)
  const [done, setDone] = useState(false)

  const { data: allTagEntities = [] } = useQuery<{ id: string; name: string; color: string }[]>({
    queryKey: ['tags'],
    queryFn: () => tagsApi.getAll().then((r) => r.data),
    staleTime: 60_000,
  })

  const { data: allSegments = [] } = useQuery<{ id: string; code: string; name: string; color: string }[]>({
    queryKey: ['segments'],
    queryFn: () => segmentsApi.getAll().then((r) => r.data),
    staleTime: 60_000,
  })

  const { data: allCategories = [] } = useQuery<{ id: string; code: string; name: string; color: string }[]>({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.getAll().then((r) => r.data),
    staleTime: 60_000,
  })

  const createCampaign = useMutation({
    mutationFn: () => campaignsApi.create({ name: name.trim(), objective: objective || undefined }),
    onSuccess: (res) => {
      setCampaignId(res.data.id)
      qc.invalidateQueries({ queryKey: ['campaigns'] })
    },
  })

  const uploadFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      toast.error('Solo se aceptan imágenes y videos')
      return
    }
    const previewUrl = URL.createObjectURL(file)
    const placeholder: UploadedFile = { url: '', name: file.name, previewUrl, uploading: true }
    setUploadedFiles((prev) => [...prev, placeholder])
    const idx = uploadedFiles.length

    try {
      const res = await campaignsApi.uploadImage(file)
      setUploadedFiles((prev) => {
        const next = [...prev]
        next[idx] = { url: res.data.url, name: file.name, previewUrl }
        return next
      })
    } catch {
      toast.error(`Error subiendo ${file.name}`)
      setUploadedFiles((prev) => prev.filter((_, i) => i !== idx))
      URL.revokeObjectURL(previewUrl)
    }
  }, [uploadedFiles.length])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    Array.from(e.dataTransfer.files).forEach(uploadFile)
  }, [uploadFile])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    Array.from(e.target.files ?? []).forEach(uploadFile)
    e.target.value = ''
  }

  const removeFile = (idx: number) => {
    setUploadedFiles((prev) => {
      URL.revokeObjectURL(prev[idx].previewUrl)
      return prev.filter((_, i) => i !== idx)
    })
  }

  const checkAudience = async (cId: string) => {
    try {
      const res = await campaignsApi.setAudience(cId, filters)
      setAudienceCount(res.data.total)
    } catch {
      toast.error('Error calculando audiencia')
    }
  }

  const handleNextFromStep4 = async () => {
    let cId = campaignId
    if (!cId) {
      try {
        const res = await createCampaign.mutateAsync()
        cId = res.data.id
      } catch {
        toast.error('Error creando campaña')
        return
      }
    }
    await checkAudience(cId)
    setStep(5)
  }

  const handleGenerate = async () => {
    if (!campaignId) return
    setGenerating(true)
    try {
      const photoUrls = uploadedFiles.filter((f) => f.url).map((f) => `${window.location.origin}${f.url}`)
      const additionalContext = [
        characteristics && `Características: ${characteristics}`,
        priceInfo && `Precio/descuento: ${priceInfo}`,
        callToAction && `Call to action: ${callToAction}`,
      ].filter(Boolean).join('\n')

      const marcoRes = await campaignsApi.marco(campaignId, {
        productDescription: productDescription.trim(),
        objective,
        targetSegment: (filters.segments ?? []).length > 0 ? filters.segments! : ['IM', 'DS', 'CF'],
        productPhotoUrls: photoUrls.length > 0 ? photoUrls : undefined,
        additionalContext: additionalContext || undefined,
      })

      const marcoApply = await campaignsApi.applyMarco(campaignId, {
        steps: marcoRes.data.steps,
        generateImages: true,
      })

      setDone(true)
      const imageErrors: string[] = (marcoApply.data as any).imageErrors ?? []
      if (imageErrors.length > 0) {
        toast.warning(`Mensajes creados, pero ${imageErrors.length} imagen(es) fallaron: ${imageErrors[0].slice(0, 120)}`, { duration: 10000 })
      } else {
        toast.success('¡Mensajes generados! Revísalos en el editor.')
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? err?.message ?? 'Error generando mensajes')
    } finally {
      setGenerating(false)
    }
  }

  const canNext1 = name.trim().length >= 2 && productDescription.trim().length >= 10
  const canNext3 = true
  const canNext4 = true

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Progress */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s.num} className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              step === s.num ? 'bg-green-600 text-white shadow-sm' :
              step > s.num ? 'bg-green-100 text-green-700' :
              'bg-gray-100 text-gray-400'
            }`}>
              {step > s.num ? <CheckCircle className="h-3.5 w-3.5" /> : s.icon}
              {s.label}
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-px w-6 ${step > s.num ? 'bg-green-300' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>

      {/* ── Step 1: Briefing ──────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">¿Qué quieres hacer?</h2>
            <p className="text-sm text-gray-500">Cuéntame sobre la campaña que quieres crear.</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre de la campaña *</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ej: Lanzamiento antena VHF mayo 2026"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">¿Qué producto o servicio vamos a promocionar? *</label>
              <textarea
                value={productDescription}
                onChange={(e) => setProductDescription(e.target.value)}
                placeholder="ej: Antena VHF base 5/8 de onda para uso móvil, conector NMO, 100W, made in MARAL..."
                rows={4}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              />
              <p className="text-xs text-gray-400 mt-1">{productDescription.length} / mínimo 10 caracteres</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">¿Cuál es el objetivo?</label>
              <div className="grid gap-2">
                {OBJECTIVES.map((o) => (
                  <label key={o.value} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    objective === o.value ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <input type="radio" name="objective" value={o.value} checked={objective === o.value}
                      onChange={() => setObjective(o.value)} className="mt-0.5 accent-green-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-800">{o.label}</p>
                      <p className="text-xs text-gray-500">{o.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={() => navigate('/campanas')}>Cancelar</Button>
            <Button disabled={!canNext1} onClick={() => setStep(2)} rightIcon={<ArrowRight className="h-4 w-4" />}>
              Siguiente
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 2: Fotos ─────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Fotos del producto</h2>
            <p className="text-sm text-gray-500">Súbeme las fotos que quieres usar. Arrastra o haz clic para seleccionar.</p>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
              isDragging ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-green-400 hover:bg-gray-50'
            }`}
          >
            <Upload className="h-10 w-10 mx-auto mb-3 text-gray-400" />
            <p className="text-sm font-medium text-gray-700">Arrastra imágenes aquí o haz clic</p>
            <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP, MP4 — máx. 20MB por archivo</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={handleFileInput}
            />
          </div>

          {/* Preview grid */}
          {uploadedFiles.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {uploadedFiles.map((f, i) => (
                <div key={i} className="relative group rounded-xl overflow-hidden bg-gray-100 aspect-square">
                  <img src={f.previewUrl} alt={f.name} className="w-full h-full object-cover" />
                  {f.uploading && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                  {!f.uploading && (
                    <button
                      onClick={(e) => { e.stopPropagation(); removeFile(i) }}
                      className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {f.url && (
                    <div className="absolute bottom-1.5 left-1.5">
                      <CheckCircle className="h-4 w-4 text-green-400" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-gray-400">
            {uploadedFiles.length === 0 ? 'Puedes continuar sin fotos.' : `${uploadedFiles.filter(f => f.url).length} de ${uploadedFiles.length} archivos subidos.`}
          </p>

          <div className="flex justify-between pt-2">
            <Button variant="outline" leftIcon={<ArrowLeft className="h-4 w-4" />} onClick={() => setStep(1)}>Atrás</Button>
            <Button
              onClick={() => setStep(3)}
              disabled={uploadedFiles.some(f => f.uploading)}
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 3: Detalles ──────────────────────────────── */}
      {step === 3 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Características y precio</h2>
            <p className="text-sm text-gray-500">Más detalles = mejores mensajes. Todos los campos son opcionales.</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Características principales</label>
              <textarea
                value={characteristics}
                onChange={(e) => setCharacteristics(e.target.value)}
                placeholder="ej: Ganancia 5dBi, impedancia 50Ω, resistente al agua IP67, sin licencia..."
                rows={3}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Precio / descuento / promoción</label>
              <Input
                value={priceInfo}
                onChange={(e) => setPriceInfo(e.target.value)}
                placeholder="ej: Desde $85.000 COP, 15% dcto. pedidos +10 unidades, envío gratis Bogotá"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Call to action que quieres generar</label>
              <Input
                value={callToAction}
                onChange={(e) => setCallToAction(e.target.value)}
                placeholder="ej: Que me escriban por WhatsApp, que visiten la tienda, que pidan cotización"
              />
            </div>
          </div>

          <div className="flex justify-between pt-2">
            <Button variant="outline" leftIcon={<ArrowLeft className="h-4 w-4" />} onClick={() => setStep(2)}>Atrás</Button>
            <Button disabled={!canNext3} onClick={() => setStep(4)} rightIcon={<ArrowRight className="h-4 w-4" />}>Siguiente</Button>
          </div>
        </div>
      )}

      {/* ── Step 4: Audiencia ─────────────────────────────── */}
      {step === 4 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">¿A quiénes les enviamos?</h2>
            <p className="text-sm text-gray-500">Define los filtros para seleccionar los clientes. Puedes no filtrar para llegar a todos.</p>
          </div>

          <div className="space-y-5">
            {/* Segments */}
            {allCategories.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Categoría comercial</p>
                <div className="flex flex-wrap gap-2">
                  {allCategories.map((cat) => {
                    const active = (filters.categories ?? []).includes(cat.code)
                    return (
                      <button key={cat.code} onClick={() => {
                        const cats = filters.categories ?? []
                        setFilters({ ...filters, categories: active ? cats.filter(c => c !== cat.code) : [...cats, cat.code] })
                      }} className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${active ? 'text-white border-transparent' : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'}`}
                        style={active ? { backgroundColor: cat.color } : undefined}>
                        {cat.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Segments */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Segmento de cliente</p>
              <div className="flex flex-wrap gap-2">
                {allSegments.map((seg) => {
                  const active = (filters.segments ?? []).includes(seg.code)
                  return (
                    <button key={seg.code} onClick={() => {
                      const segs = filters.segments ?? []
                      setFilters({ ...filters, segments: active ? segs.filter(s => s !== seg.code) : [...segs, seg.code] })
                    }} className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${active ? 'text-white border-transparent' : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'}`}
                      style={active ? { backgroundColor: seg.color } : undefined}>
                      {seg.code} — {seg.name}
                    </button>
                  )
                })}
                {allSegments.length === 0 && ['IM', 'DS', 'CF'].map((code) => {
                  const active = (filters.segments ?? []).includes(code)
                  return (
                    <button key={code} onClick={() => {
                      const segs = filters.segments ?? []
                      setFilters({ ...filters, segments: active ? segs.filter(s => s !== code) : [...segs, code] })
                    }} className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${active ? 'bg-blue-600 text-white border-transparent' : 'bg-white text-gray-600 border-gray-300'}`}>
                      {code}
                    </button>
                  )
                })}
              </div>
              <p className="text-xs text-gray-400 mt-1">Si no seleccionas ninguno, se incluyen todos.</p>
            </div>

            {/* Tags */}
            {allTagEntities.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Etiquetas (al menos una de estas)</p>
                <div className="flex flex-wrap gap-2">
                  {allTagEntities.map((tag) => {
                    const active = (filters.tagIds ?? []).includes(tag.id)
                    return (
                      <button key={tag.id} onClick={() => {
                        const ids = filters.tagIds ?? []
                        setFilters({ ...filters, tagIds: active ? ids.filter(t => t !== tag.id) : [...ids, tag.id] })
                      }} className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${active ? 'text-white border-transparent' : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'}`}
                        style={active ? { backgroundColor: tag.color } : undefined}>
                        {tag.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Opt-outs */}
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input type="checkbox" checked={filters.excludeOptedOut !== false}
                onChange={(e) => setFilters({ ...filters, excludeOptedOut: e.target.checked })}
                className="rounded accent-green-600" />
              Excluir clientes que pidieron no recibir mensajes (opt-out)
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input type="checkbox" checked={!!filters.excludeActiveOrders}
                onChange={(e) => setFilters({ ...filters, excludeActiveOrders: e.target.checked })}
                className="rounded accent-green-600" />
              Excluir clientes con pedido activo
            </label>

            {audienceCount !== null && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <p className="text-sm font-semibold text-green-800">
                  {audienceCount} destinatarios con este filtro
                </p>
                <p className="text-xs text-green-600 mt-0.5">Solo clientes con WhatsApp registrado</p>
              </div>
            )}
          </div>

          <div className="flex justify-between pt-2">
            <Button variant="outline" leftIcon={<ArrowLeft className="h-4 w-4" />} onClick={() => setStep(3)}>Atrás</Button>
            <Button disabled={!canNext4 || createCampaign.isPending} onClick={handleNextFromStep4}
              rightIcon={<ArrowRight className="h-4 w-4" />}>
              {createCampaign.isPending ? 'Creando…' : 'Siguiente'}
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 5: Generar ───────────────────────────────── */}
      {step === 5 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Generar mensajes</h2>
            <p className="text-sm text-gray-500">Con todo lo que me contaste, voy a preparar los mensajes de WhatsApp.</p>
          </div>

          {/* Summary */}
          <div className="bg-gray-50 rounded-2xl p-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Campaña</span>
              <span className="font-medium text-gray-900">{name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Objetivo</span>
              <span className="font-medium text-gray-900">{OBJECTIVES.find(o => o.value === objective)?.label}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Fotos</span>
              <span className="font-medium text-gray-900">{uploadedFiles.filter(f => f.url).length} archivos</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Segmentos</span>
              <span className="font-medium text-gray-900">
                {(filters.segments ?? []).length > 0 ? filters.segments!.join(', ') : 'Todos'}
              </span>
            </div>
            {audienceCount !== null && (
              <div className="flex justify-between">
                <span className="text-gray-500">Audiencia</span>
                <span className="font-semibold text-green-700">{audienceCount} clientes</span>
              </div>
            )}
          </div>

          {done ? (
            <div className="text-center py-8 space-y-4">
              <CheckCircle className="h-14 w-14 text-green-500 mx-auto" />
              <div>
                <p className="text-lg font-semibold text-gray-900">¡Mensajes generados!</p>
                <p className="text-sm text-gray-500 mt-1">Revísalos y ajústalos antes de enviar.</p>
              </div>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={() => navigate('/campanas')}>
                  Ir a campañas
                </Button>
                <Button onClick={() => navigate(`/campanas/${campaignId}/editar`)}>
                  Revisar y editar
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
                <Target className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">¿Qué va a pasar?</p>
                  <ul className="space-y-0.5 text-blue-700 list-disc list-inside">
                    <li>La IA analiza tu producto y objetivo</li>
                    <li>Genera una secuencia de mensajes WhatsApp</li>
                    <li>Los podrás editar, reordenar y ajustar</li>
                    <li>Luego calculas la audiencia final y lanzas</li>
                  </ul>
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" leftIcon={<ArrowLeft className="h-4 w-4" />} onClick={() => setStep(4)}>Atrás</Button>
                <Button
                  onClick={handleGenerate}
                  disabled={generating}
                  leftIcon={generating ? undefined : <Sparkles className="h-4 w-4" />}
                >
                  {generating ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Generando…
                    </span>
                  ) : 'Generar mensajes con IA'}
                </Button>
              </div>

              <p className="text-center text-xs text-gray-400">
                O{' '}
                <button className="text-blue-500 hover:underline" onClick={() => navigate(`/campanas/${campaignId}/editar`)}>
                  salta la IA y edita manualmente
                </button>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
