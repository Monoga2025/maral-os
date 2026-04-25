import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Trash2, ChevronUp, ChevronDown, Send, Users, Eye,
  FileText, Image, Video, Mic, File, ArrowLeft, Rocket, X, Sparkles, FlaskConical, BarChart2, Brain
} from 'lucide-react'
import { toast } from 'sonner'
import { campaignsApi } from '../../lib/api'
import type { Campaign, CampaignStep, StepType, AudienceFilter, MarcoStep } from '../../types'
import ImageGenStudio from './ImageGenStudio'
import MarcoPanel from './MarcoPanel'

const STEP_ICONS: Record<StepType, React.ReactNode> = {
  TEXT: <FileText className="h-4 w-4" />,
  IMAGE: <Image className="h-4 w-4" />,
  VIDEO: <Video className="h-4 w-4" />,
  AUDIO: <Mic className="h-4 w-4" />,
  DOCUMENT: <File className="h-4 w-4" />,
}

const INTEREST_TAGS = ['VHF', 'UHF', 'CABLE', 'BASE', 'DIPOLO', 'RADIO', 'GPS', 'FIBRA']
const VARIABLES = ['{nombre}', '{primerNombre}', '{ciudad}', '{ultimaCompra}', '{descuentoCategoria}', '{vendedor}']

function WhatsAppBubble({ step, index }: { step: CampaignStep; index: number }) {
  return (
    <div className="flex flex-col items-end mb-2">
      {index > 0 && (
        <div className="text-xs text-gray-400 mr-2 mb-1">
          +{step.delaySeconds}s después
        </div>
      )}
      <div className="max-w-[85%] bg-[#dcf8c6] rounded-lg px-3 py-2 shadow-sm">
        {step.type === 'TEXT' ? (
          <p className="text-sm text-gray-800 whitespace-pre-wrap">{step.content || <span className="text-gray-400 italic">Sin contenido</span>}</p>
        ) : (
          <div className="flex flex-col gap-1">
            {step.mediaUrl ? (
              <div className="bg-gray-200 rounded p-2 text-xs text-gray-600 flex items-center gap-2">
                {STEP_ICONS[step.type]}
                <span>{step.fileName || step.mediaUrl.split('/').pop()}</span>
              </div>
            ) : (
              <div className="bg-gray-100 rounded p-2 text-xs text-gray-400 flex items-center gap-2">
                {STEP_ICONS[step.type]}
                <span>Sin archivo</span>
              </div>
            )}
            {step.content && <p className="text-xs text-gray-600">{step.content}</p>}
          </div>
        )}
        <div className="text-right mt-1">
          <span className="text-[10px] text-gray-400">✓✓</span>
        </div>
      </div>
    </div>
  )
}

interface StepEditorProps {
  step: CampaignStep
  index: number
  total: number
  onUpdate: (data: Partial<CampaignStep>) => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onInsertVariable: (field: 'content', v: string) => void
  onOpenStudio?: () => void
}

function StepEditor({ step, index, total, onUpdate, onDelete, onMoveUp, onMoveDown, onInsertVariable, onOpenStudio }: StepEditorProps) {
  return (
    <div className="border border-gray-200 rounded-lg p-3 bg-white">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-400 w-5 text-center">{index + 1}</span>
          <select
            value={step.type}
            onChange={(e) => onUpdate({ type: e.target.value as StepType })}
            className="text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-green-500"
          >
            <option value="TEXT">Texto</option>
            <option value="IMAGE">Imagen</option>
            <option value="VIDEO">Video</option>
            <option value="AUDIO">Audio</option>
            <option value="DOCUMENT">Documento</option>
          </select>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onMoveUp} disabled={index === 0} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-20">
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button onClick={onMoveDown} disabled={index === total - 1} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-20">
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          <button onClick={onDelete} className="p-1 text-red-400 hover:text-red-600">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {step.type !== 'TEXT' && (
        <div className="mb-2">
          <input
            type="url"
            placeholder="URL del archivo (https://…)"
            value={step.mediaUrl || ''}
            onChange={(e) => onUpdate({ mediaUrl: e.target.value })}
            className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-green-500"
          />
          {step.type === 'IMAGE' && onOpenStudio && (
            <button
              onClick={onOpenStudio}
              className="mt-1.5 flex items-center gap-1.5 text-[11px] text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-2.5 py-1.5 hover:bg-yellow-100 transition-colors"
            >
              <Sparkles className="h-3 w-3" />
              Generar con IA (Nano Banana)
            </button>
          )}
        </div>
      )}

      {/* A/B mode toggle */}
      {step.type === 'TEXT' && (
        <div className="flex items-center gap-2 mb-1.5">
          <button
            onClick={() => {
              const hasVariants = !!(step.variants as any)?.length
              if (hasVariants) {
                onUpdate({ variants: null })
              } else {
                onUpdate({
                  variants: [
                    { id: 'a', content: step.content || '', weight: 1 },
                    { id: 'b', content: '', weight: 1 },
                  ] as any,
                })
              }
            }}
            className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border transition-colors ${
              (step.variants as any)?.length
                ? 'bg-purple-100 text-purple-700 border-purple-300'
                : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-purple-300 hover:text-purple-600'
            }`}
          >
            <FlaskConical className="h-3 w-3" />
            {(step.variants as any)?.length ? 'A/B activo' : 'Probar A/B'}
          </button>
        </div>
      )}

      {/* A/B variant editors */}
      {(step.variants as any)?.length ? (
        <div className="space-y-2">
          {((step.variants as any) as { id: string; content: string }[]).map((v, vi) => (
            <div key={v.id} className="relative">
              <span className={`absolute -top-1.5 left-2 text-[9px] font-bold px-1 rounded ${vi === 0 ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                {vi === 0 ? 'A' : 'B'}
              </span>
              <textarea
                placeholder={`Variante ${vi === 0 ? 'A' : 'B'}…`}
                value={v.content}
                onChange={(e) => {
                  const variants = [...((step.variants as any) as { id: string; content: string; weight: number }[])]
                  variants[vi] = { ...variants[vi], content: e.target.value }
                  onUpdate({ variants: variants as any })
                }}
                rows={3}
                className={`w-full text-xs border rounded px-2 py-1.5 pt-2.5 resize-none focus:outline-none focus:ring-1 ${vi === 0 ? 'border-blue-200 focus:ring-blue-400' : 'border-orange-200 focus:ring-orange-400'}`}
              />
            </div>
          ))}
          {/* Variant metric display */}
          {step.variantMetric && Object.keys(step.variantMetric as object).length > 0 && (
            <div className="flex items-center gap-2 text-[10px] text-gray-500">
              <BarChart2 className="h-3 w-3" />
              {(['a', 'b'] as const).map((vid) => {
                const m = (step.variantMetric as any)?.[vid] ?? {}
                return (
                  <span key={vid} className="bg-gray-100 rounded px-1.5 py-0.5">
                    {vid.toUpperCase()}: {m.sent ?? 0}↗ {m.replied ?? 0}✓
                  </span>
                )
              })}
            </div>
          )}
        </div>
      ) : (
        <textarea
          placeholder={step.type === 'TEXT' ? 'Escribe el mensaje…' : 'Caption opcional…'}
          value={step.content || ''}
          onChange={(e) => onUpdate({ content: e.target.value })}
          rows={step.type === 'TEXT' ? 3 : 2}
          className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-green-500"
        />
      )}

      <div className="flex flex-wrap gap-1 mt-1 mb-2">
        {VARIABLES.map((v) => (
          <button
            key={v}
            onClick={() => onInsertVariable('content', v)}
            className="text-[10px] bg-green-50 text-green-700 border border-green-200 rounded px-1.5 py-0.5 hover:bg-green-100"
          >
            {v}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-500">Delay:</label>
        <input
          type="number"
          min={0}
          value={step.delaySeconds}
          onChange={(e) => onUpdate({ delaySeconds: parseInt(e.target.value) || 0 })}
          className="w-16 text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-green-500"
        />
        <span className="text-xs text-gray-400">seg después del paso anterior</span>
      </div>
    </div>
  )
}

export default function CampaignComposer() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const isNew = !id || id === 'nueva'

  const [name, setName] = useState('')
  const [objective, setObjective] = useState('')
  const [steps, setSteps] = useState<CampaignStep[]>([])
  const [filters, setFilters] = useState<AudienceFilter>({ excludeOptedOut: true })
  const [audienceResult, setAudienceResult] = useState<{
    total: number
    excluded: number
    score?: { avg: number; distribution: { probable: number; possible: number; long: number }; suggestion: string }
    prediction?: { responseRate: string; expectedConversions: string; estimatedRevenue: string; confidence: string } | null
  } | null>(null)
  const [showAudienceModal, setShowAudienceModal] = useState(false)
  const [previewSample, setPreviewSample] = useState<{ id: string; name: string }[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [campaignId, setCampaignId] = useState<string | null>(isNew ? null : id ?? null)
  const [studioStep, setStudioStep] = useState<string | null>(null) // stepId para el que se abre el studio
  const [showMarco, setShowMarco] = useState(false)

  const { data: existing } = useQuery({
    queryKey: ['campaign', id],
    queryFn: () => campaignsApi.get(id!).then((r) => r.data),
    enabled: !isNew && !!id,
  })

  useEffect(() => {
    if (existing) {
      setName(existing.name)
      setObjective(existing.objective || '')
      setSteps(existing.steps || [])
      if (existing.audienceFilter) setFilters(existing.audienceFilter as AudienceFilter)
      setCampaignId(existing.id)
    }
  }, [existing])

  const isReadOnly = existing && !['BORRADOR'].includes(existing.status)

  const saveOrCreateCampaign = useCallback(async (): Promise<string> => {
    if (campaignId) {
      await campaignsApi.update(campaignId, { name, objective: objective || undefined })
      return campaignId
    }
    const res = await campaignsApi.create({ name, objective: objective || undefined })
    const newId = res.data.id
    setCampaignId(newId)
    navigate(`/campanas/${newId}/editar`, { replace: true })
    return newId
  }, [campaignId, name, objective, navigate])

  const addStep = async () => {
    if (!name.trim()) { alert('Primero dale un nombre a la campaña.'); return }
    setIsSaving(true)
    try {
      const cId = await saveOrCreateCampaign()
      const newStep: Partial<CampaignStep> = {
        order: steps.length,
        type: 'TEXT',
        content: '',
        delaySeconds: steps.length === 0 ? 0 : 10,
      }
      const res = await campaignsApi.addStep(cId, newStep)
      setSteps((prev) => [...prev, res.data])
    } finally {
      setIsSaving(false)
    }
  }

  const updateStep = async (stepId: string, data: Partial<CampaignStep>) => {
    if (!campaignId || isReadOnly) return
    setSteps((prev) => prev.map((s) => (s.id === stepId ? { ...s, ...data } : s)))
    try {
      await campaignsApi.updateStep(campaignId, stepId, data)
    } catch (err) {
      console.error('Error al guardar paso de campaña:', err)
    }
  }

  const deleteStep = async (stepId: string) => {
    if (!campaignId || isReadOnly) return
    setSteps((prev) => prev.filter((s) => s.id !== stepId))
    await campaignsApi.deleteStep(campaignId, stepId)
    await reorderAll(steps.filter((s) => s.id !== stepId))
  }

  const reorderAll = async (ordered: CampaignStep[]) => {
    if (!campaignId || ordered.length === 0) return
    await campaignsApi.reorderSteps(campaignId, ordered.map((s) => s.id))
  }

  const moveStep = async (index: number, direction: 1 | -1) => {
    const newSteps = [...steps]
    const target = index + direction
    if (target < 0 || target >= newSteps.length) return
    ;[newSteps[index], newSteps[target]] = [newSteps[target], newSteps[index]]
    setSteps(newSteps)
    await reorderAll(newSteps)
  }

  const insertVariable = (stepId: string, _field: 'content', variable: string) => {
    setSteps((prev) =>
      prev.map((s) =>
        s.id === stepId ? { ...s, content: (s.content || '') + variable } : s,
      ),
    )
    // Persist after a short debounce
    const step = steps.find((s) => s.id === stepId)
    if (step && campaignId) {
      campaignsApi.updateStep(campaignId, stepId, { content: (step.content || '') + variable })
    }
  }

  const computeAudience = async () => {
    const cId = campaignId ?? await saveOrCreateCampaign()
    const res = await campaignsApi.setAudience(cId, filters)
    setAudienceResult({
      total: res.data.total,
      excluded: res.data.excluded,
      score: res.data.score,
      prediction: res.data.prediction,
    })
    setPreviewSample(res.data.sample)
  }

  const launchMutation = useMutation({
    mutationFn: async () => {
      const cId = await saveOrCreateCampaign()
      return campaignsApi.launch(cId)
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['campaigns'] })
      toast.success(`¡Campaña lanzada! ${res.data.scheduled} destinatarios programados.`)
      navigate('/campanas')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Error al lanzar la campaña')
    },
  })

  const canLaunch = !isReadOnly && steps.length > 0 && (audienceResult?.total ?? 0) > 0 && name.trim()

  const applyMarco = async (marcoSteps: MarcoStep[], generateImages: boolean) => {
    const cId = campaignId ?? await saveOrCreateCampaign()
    await campaignsApi.applyMarco(cId, { steps: marcoSteps, generateImages })
    // Reload steps from backend
    const res = await campaignsApi.get(cId)
    setSteps(res.data.steps ?? [])
    setCampaignId(cId)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/campanas')} className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-5 w-5" />
        </button>
        {isReadOnly ? (
          <h1 className="font-semibold text-gray-900">{name}</h1>
        ) : (
          <input
            type="text"
            placeholder="Nombre de la campaña…"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 text-lg font-semibold text-gray-900 border-none outline-none focus:ring-0 bg-transparent"
          />
        )}
        {isReadOnly && existing && (
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full ml-2">
            {existing.status}
          </span>
        )}
        {!isReadOnly && (
          <button
            onClick={() => setShowMarco(true)}
            className="ml-auto flex items-center gap-1.5 bg-[#1e3a5f] text-white hover:bg-[#2d5a8f] rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
          >
            <Brain className="h-3.5 w-3.5" />
            Marco IA
          </button>
        )}
      </div>

      {/* 3-column layout */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT — Steps */}
        <div className="w-72 border-r border-gray-200 bg-gray-50 flex flex-col overflow-hidden" data-tour="composer-steps">
          <div className="p-3 border-b border-gray-200 bg-white">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Pasos de la campaña</p>
            {!isReadOnly && (
              <input
                type="text"
                placeholder="Objetivo (opcional)"
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                className="mt-2 w-full text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-green-500"
              />
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {steps.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-4">Agrega el primer paso</p>
            )}
            {steps.map((step, i) =>
              isReadOnly ? (
                <div key={step.id} className="border border-gray-200 rounded-lg p-2 bg-white text-xs text-gray-600">
                  <span className="font-medium text-gray-400 mr-1">{i + 1}.</span>
                  {step.type} — {step.content?.slice(0, 40) || step.mediaUrl?.slice(0, 40) || '—'}
                </div>
              ) : (
                <StepEditor
                  key={step.id}
                  step={step}
                  index={i}
                  total={steps.length}
                  onUpdate={(data) => updateStep(step.id, data)}
                  onDelete={() => deleteStep(step.id)}
                  onMoveUp={() => moveStep(i, -1)}
                  onMoveDown={() => moveStep(i, 1)}
                  onInsertVariable={(_field, v) => insertVariable(step.id, 'content', v)}
                  onOpenStudio={() => setStudioStep(step.id)}
                />
              ),
            )}
          </div>
          {!isReadOnly && (
            <div className="p-3 border-t border-gray-200">
              <button
                onClick={addStep}
                disabled={isSaving}
                className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 text-gray-500 hover:border-green-400 hover:text-green-600 rounded-lg py-2 text-xs font-medium transition-colors"
              >
                <Plus className="h-4 w-4" />
                Agregar paso
              </button>
            </div>
          )}
        </div>

        {/* CENTER — WhatsApp preview */}
        <div className="flex-1 bg-[#ece5dd] flex flex-col overflow-hidden" data-tour="composer-preview">
          <div className="bg-[#128c7e] text-white px-4 py-2 flex items-center gap-3 text-sm">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-xs font-bold">C</div>
            <span>Cliente (preview)</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {steps.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <Eye className="h-10 w-10 mb-3 opacity-30" />
                <p className="text-sm">El preview aparece aquí</p>
              </div>
            ) : (
              steps.map((step, i) => <WhatsAppBubble key={step.id} step={step} index={i} />)
            )}
          </div>
        </div>

        {/* RIGHT — Audience + Launch */}
        <div className="w-72 border-l border-gray-200 bg-white flex flex-col overflow-hidden" data-tour="composer-audience">
          <div className="p-3 border-b border-gray-200">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              Audiencia
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {/* Segments */}
            <div>
              <p className="text-xs font-medium text-gray-700 mb-2">Segmento</p>
              {(['IM', 'DS', 'CF'] as const).map((seg) => (
                <label key={seg} className="flex items-center gap-2 text-xs text-gray-600 mb-1 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={!!isReadOnly}
                    checked={(filters.segments || []).includes(seg)}
                    onChange={(e) => {
                      const segs = filters.segments || []
                      setFilters({
                        ...filters,
                        segments: e.target.checked ? [...segs, seg] : segs.filter((s) => s !== seg),
                      })
                    }}
                    className="rounded"
                  />
                  <span className="font-medium">{seg}</span>
                  <span className="text-gray-400">
                    {seg === 'IM' ? '— Importador (36%)' : seg === 'DS' ? '— Distribuidor (26%)' : '— Cliente Final (10%)'}
                  </span>
                </label>
              ))}
            </div>

            {/* Interest tags */}
            <div>
              <p className="text-xs font-medium text-gray-700 mb-2">Intereses (al menos uno)</p>
              <div className="flex flex-wrap gap-1">
                {INTEREST_TAGS.map((tag) => {
                  const active = (filters.interestTags || []).includes(tag)
                  return (
                    <button
                      key={tag}
                      disabled={!!isReadOnly}
                      onClick={() => {
                        const tags = filters.interestTags || []
                        setFilters({
                          ...filters,
                          interestTags: active ? tags.filter((t) => t !== tag) : [...tags, tag],
                        })
                      }}
                      className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                        active
                          ? 'bg-green-600 text-white border-green-600'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-green-400'
                      }`}
                    >
                      {tag}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Order filters */}
            <div>
              <p className="text-xs font-medium text-gray-700 mb-2">Actividad</p>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={!!isReadOnly}
                    checked={!!filters.excludeActiveOrders}
                    onChange={(e) => setFilters({ ...filters, excludeActiveOrders: e.target.checked })}
                    className="rounded"
                  />
                  Excluir con pedido activo
                </label>
                <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={!!isReadOnly}
                    checked={!!filters.excludeActiveQuotations}
                    onChange={(e) => setFilters({ ...filters, excludeActiveQuotations: e.target.checked })}
                    className="rounded"
                  />
                  Excluir con cotización activa
                </label>
                <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={!!isReadOnly}
                    checked={filters.excludeOptedOut !== false}
                    onChange={(e) => setFilters({ ...filters, excludeOptedOut: e.target.checked })}
                    className="rounded"
                  />
                  Excluir opt-outs
                </label>
              </div>
            </div>

            {/* Audience result */}
            {audienceResult && (
              <div className="space-y-2">
                {/* Recipients count */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-green-800">
                    {audienceResult.total} destinatarios
                  </p>
                  {audienceResult.excluded > 0 && (
                    <p className="text-xs text-green-600 mt-0.5">
                      {audienceResult.excluded} excluidos (en campaña activa)
                    </p>
                  )}
                  {previewSample.length > 0 && (
                    <div className="mt-2">
                      <p className="text-[10px] text-green-700 font-medium mb-1">Muestra:</p>
                      {previewSample.slice(0, 5).map((c) => (
                        <p key={c.id} className="text-[10px] text-green-700 truncate">• {c.name}</p>
                      ))}
                      {previewSample.length > 5 && (
                        <button
                          onClick={() => setShowAudienceModal(true)}
                          className="text-[10px] text-green-600 underline mt-0.5"
                        >
                          Ver todos…
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Lead score panel (T5.3) */}
                {audienceResult.score && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[10px] font-semibold text-purple-800 uppercase tracking-wide">Score de compra</p>
                      <span className="text-sm font-bold text-purple-700">{audienceResult.score.avg}/100</span>
                    </div>
                    <div className="w-full bg-purple-100 rounded-full h-1.5 mb-2">
                      <div
                        className="bg-purple-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${audienceResult.score.avg}%` }}
                      />
                    </div>
                    <div className="flex gap-2 text-[9px] text-purple-700 mb-1.5">
                      <span>🔥 {audienceResult.score.distribution.probable} probables</span>
                      <span>⚡ {audienceResult.score.distribution.possible} posibles</span>
                      <span>❄️ {audienceResult.score.distribution.long} fríos</span>
                    </div>
                    {audienceResult.score.suggestion && (
                      <p className="text-[9px] text-purple-600 italic">{audienceResult.score.suggestion}</p>
                    )}
                  </div>
                )}

                {/* Prediction panel (T5.4) */}
                {audienceResult.prediction && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-[10px] font-semibold text-blue-800 uppercase tracking-wide mb-1.5">
                      Predicción <span className="font-normal text-blue-500 capitalize">({audienceResult.prediction.confidence})</span>
                    </p>
                    <div className="space-y-0.5 text-[10px] text-blue-700">
                      <p>📨 Respuesta estimada: <strong>{audienceResult.prediction.responseRate}</strong></p>
                      <p>🎯 Conversiones: <strong>{audienceResult.prediction.expectedConversions}</strong></p>
                      <p>💰 Revenue: <strong>{audienceResult.prediction.estimatedRevenue}</strong></p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="p-3 border-t border-gray-200 space-y-2">
            {!isReadOnly && (
              <button
                onClick={computeAudience}
                className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg py-2 text-xs font-medium"
              >
                <Users className="h-4 w-4" />
                Calcular audiencia
              </button>
            )}
            {!isReadOnly && (
              <button
                onClick={() => launchMutation.mutate()}
                disabled={!canLaunch || launchMutation.isPending}
                className="w-full flex items-center justify-center gap-2 bg-green-600 text-white hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg py-2 text-xs font-semibold"
              >
                <Rocket className="h-4 w-4" />
                {launchMutation.isPending ? 'Lanzando…' : 'Lanzar campaña'}
              </button>
            )}
            {isReadOnly && (
              <button
                onClick={() => navigate(`/campanas/${id}`)}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg py-2 text-xs font-semibold"
              >
                <Send className="h-4 w-4" />
                Ver estado en vivo
              </button>
            )}
            {!canLaunch && !isReadOnly && (
              <p className="text-[10px] text-gray-400 text-center">
                {!name.trim() ? 'Dale un nombre a la campaña' :
                 steps.length === 0 ? 'Agrega al menos un paso' :
                 'Calcula la audiencia primero'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Marco IA Panel */}
      {showMarco && campaignId && (
        <MarcoPanel
          campaignId={campaignId}
          onApply={applyMarco}
          onClose={() => setShowMarco(false)}
        />
      )}
      {showMarco && !campaignId && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl p-6 max-w-sm mx-4 text-center shadow-xl">
            <Brain className="h-8 w-8 text-[#1e3a5f] mx-auto mb-3" />
            <h3 className="font-semibold text-gray-900 mb-1">Dale un nombre primero</h3>
            <p className="text-sm text-gray-500 mb-4">Marco necesita que la campaña tenga nombre antes de generar la estrategia.</p>
            <button onClick={() => setShowMarco(false)} className="bg-[#1e3a5f] text-white rounded-lg px-4 py-2 text-sm font-medium">Entendido</button>
          </div>
        </div>
      )}

      {/* Image Gen Studio */}
      {studioStep && (
        <ImageGenStudio
          campaignId={campaignId ?? undefined}
          onUse={(url) => updateStep(studioStep, { mediaUrl: url })}
          onClose={() => setStudioStep(null)}
        />
      )}

      {/* Audience preview modal */}
      {showAudienceModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-5 max-w-sm w-full mx-4 max-h-[70vh] flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Destinatarios ({audienceResult?.total})</h3>
              <button onClick={() => setShowAudienceModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              {previewSample.map((c) => (
                <div key={c.id} className="py-2 border-b border-gray-100 text-sm text-gray-700">
                  {c.name}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
