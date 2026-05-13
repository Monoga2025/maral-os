import { useState } from 'react'
import {
  Sparkles, X, Upload, ChevronDown, ChevronUp,
  CheckCircle, XCircle, Zap, Image as ImageIcon,
  BarChart2, Brain, Target, AlertTriangle
} from 'lucide-react'
import { campaignsApi } from '../../lib/api'
import type { MarcoResult, MarcoStep } from '../../types'

const OBJECTIVES = [
  { value: 'top_of_mind', label: '📡 Top of mind frío', desc: 'Clientes que no nos conocen o llevan tiempo sin comprar' },
  { value: 'reactivacion', label: '🔄 Reactivación', desc: 'Clientes con historial que están inactivos' },
  { value: 'educativo', label: '🎓 Educativo / TCO', desc: 'Posicionar a MARAL como experto técnico' },
  { value: 'cierre', label: '🚀 Cierre', desc: 'Cliente caliente que ya mostró interés' },
  { value: 'recuperacion', label: '🛟 Recuperación', desc: 'Cliente con objeción o "lo voy a pensar"' },
  { value: 'sector_especifico', label: '🏭 Sector específico', desc: 'Hidrocarburos, municipal, operadores...' },
]

interface Props {
  campaignId: string
  onApply: (steps: MarcoStep[], generateImages: boolean) => Promise<void>
  onClose: () => void
}

export default function MarcoPanel({ campaignId, onApply, onClose }: Props) {
  const [productDescription, setProductDescription] = useState('')
  const [objective, setObjective] = useState('top_of_mind')
  const [segments, setSegments] = useState<string[]>(['IM', 'DS'])
  const [vendorName, setVendorName] = useState<'John' | 'Lady'>('John')
  const [photoUrls, setPhotoUrls] = useState<string[]>([''])
  const [additionalContext, setAdditionalContext] = useState('')
  const [result, setResult] = useState<MarcoResult | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [generateImages, setGenerateImages] = useState(true)
  const [expandedStep, setExpandedStep] = useState<number | null>(0)
  const [showValidation, setShowValidation] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [analyzingPhoto, setAnalyzingPhoto] = useState(false)

  const validPhotoUrls = photoUrls.filter((u) => u.trim().startsWith('http'))

  const handleGenerate = async () => {
    if (!productDescription.trim()) { setError('Describe el producto primero'); return }
    if (!segments.length) { setError('Selecciona al menos un segmento'); return }
    setError(null)
    setIsGenerating(true)
    setResult(null)
    try {
      const res = await campaignsApi.marco(campaignId, {
        productDescription,
        objective,
        targetSegment: segments,
        productPhotoUrls: validPhotoUrls.length > 0 ? validPhotoUrls : undefined,
        additionalContext: additionalContext || undefined,
        vendorName,
      })
      setResult(res.data)
      setExpandedStep(0)
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Marco no pudo generar la campaña. Intenta de nuevo.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleAnalyzePhoto = async (url: string) => {
    if (!url.startsWith('http')) return
    setAnalyzingPhoto(true)
    try {
      const res = await campaignsApi.analyzePhoto(url)
      const d = res.data
      const desc = [
        d.productName && `Producto: ${d.productName}`,
        d.keyFeatures?.length && `Características: ${d.keyFeatures.join(', ')}`,
        d.differentiators?.length && `Diferenciadores: ${d.differentiators.join(', ')}`,
        d.suggestedCampaignAngle && `Ángulo sugerido: ${d.suggestedCampaignAngle}`,
      ].filter(Boolean).join('\n')
      setProductDescription((prev) => prev ? `${prev}\n\n[Análisis foto]\n${desc}` : desc)
    } catch {
      setError('No se pudo analizar la foto. Verifica que la URL sea accesible.')
    } finally {
      setAnalyzingPhoto(false)
    }
  }

  const handleApply = async () => {
    if (!result) return
    setIsApplying(true)
    try {
      await onApply(result.steps, generateImages)
      onClose()
    } finally {
      setIsApplying(false)
    }
  }

  const scoreColor = result
    ? result.validation.score >= 90 ? 'text-green-600' : result.validation.score >= 70 ? 'text-yellow-600' : 'text-red-600'
    : ''

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-end">
      <div className="w-[520px] h-full bg-white shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2d5a8f] px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <Brain className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold text-sm">Marco IA</h2>
              <p className="text-blue-200 text-[10px]">Estratega de ventas B2B · SALES_DOCTRINE</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Input form */}
          <div className="p-4 space-y-4 border-b border-gray-100">

            {/* Objetivo */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Objetivo de la campaña</label>
              <div className="grid grid-cols-2 gap-1.5">
                {OBJECTIVES.map((o) => (
                  <button
                    key={o.value}
                    onClick={() => setObjective(o.value)}
                    className={`text-left p-2 rounded-lg border text-[11px] transition-all ${
                      objective === o.value
                        ? 'border-[#1e3a5f] bg-[#1e3a5f]/5 text-[#1e3a5f]'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium">{o.label}</div>
                    <div className="text-gray-400 mt-0.5 leading-tight">{o.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Segmento */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Segmento objetivo</label>
              <div className="flex gap-2">
                {(['IM', 'DS', 'CF'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSegments((prev) =>
                      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
                    )}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                      segments.includes(s)
                        ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]'
                        : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    {s === 'IM' ? '🏭 Importador' : s === 'DS' ? '🏪 Distribuidor' : '🏢 Cliente Final'}
                  </button>
                ))}
              </div>
            </div>

            {/* Vendedor */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Firma del vendedor</label>
              <div className="flex gap-2">
                {(['John', 'Lady'] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setVendorName(v)}
                    className={`flex-1 py-1.5 text-xs rounded-lg border font-medium transition-colors ${
                      vendorName === v
                        ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]'
                        : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    {v === 'John' ? '👔 John Mónoga' : '👩‍💼 Lady'}
                  </button>
                ))}
              </div>
            </div>

            {/* Fotos del producto */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Fotos del producto <span className="text-gray-400 font-normal">(URLs — opcional)</span>
              </label>
              <div className="space-y-1.5">
                {photoUrls.map((url, i) => (
                  <div key={i} className="flex gap-1.5">
                    <input
                      type="url"
                      placeholder="https://..."
                      value={url}
                      onChange={(e) => setPhotoUrls((prev) => { const n = [...prev]; n[i] = e.target.value; return n })}
                      className="flex-1 text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
                    />
                    {url.startsWith('http') && (
                      <button
                        onClick={() => handleAnalyzePhoto(url)}
                        disabled={analyzingPhoto}
                        title="Analizar con IA"
                        className="px-2 bg-purple-50 border border-purple-200 rounded text-purple-600 hover:bg-purple-100 transition-colors disabled:opacity-50"
                      >
                        {analyzingPhoto ? '…' : <Sparkles className="h-3.5 w-3.5" />}
                      </button>
                    )}
                    {photoUrls.length > 1 && (
                      <button
                        onClick={() => setPhotoUrls((prev) => prev.filter((_, j) => j !== i))}
                        className="px-2 text-red-400 hover:text-red-600"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
                {photoUrls.length < 4 && (
                  <button
                    onClick={() => setPhotoUrls((prev) => [...prev, ''])}
                    className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600"
                  >
                    <Upload className="h-3 w-3" /> Agregar otra foto
                  </button>
                )}
              </div>
            </div>

            {/* Descripción del producto */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Describe el producto y campaña
              </label>
              <textarea
                placeholder="Ej: Antena dipolo VHF P-224F Premium, 4 elementos, 175 km/h resistencia, 5 años garantía, $1.285.000 + IVA. Queremos llegar a importadores de Bogotá y Medellín que compraron antenas hace 6+ meses..."
                value={productDescription}
                onChange={(e) => setProductDescription(e.target.value)}
                rows={5}
                className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
              />
              <p className="text-[10px] text-gray-400 mt-1">
                Incluye: nombre del producto, precio, características clave, y cualquier contexto adicional para la campaña.
              </p>
            </div>

            {/* Contexto adicional */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Contexto adicional <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <input
                type="text"
                placeholder="Ej: Hay stock para 50 unidades, entrega 5 días hábiles, nuevo upgrade de impermeabilización..."
                value={additionalContext}
                onChange={(e) => setAdditionalContext(e.target.value)}
                className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-2.5 text-xs text-red-700">
                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={isGenerating || !productDescription.trim()}
              className="w-full flex items-center justify-center gap-2 bg-[#1e3a5f] text-white hover:bg-[#2d5a8f] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg py-2.5 text-sm font-semibold transition-colors"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Marco está pensando…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generar estrategia con Marco
                </>
              )}
            </button>
          </div>

          {/* Result */}
          {result && (
            <div className="p-4 space-y-4">

              {/* Strategy summary */}
              <div className="bg-[#1e3a5f]/5 border border-[#1e3a5f]/20 rounded-xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-[10px] font-bold text-[#1e3a5f] uppercase tracking-wide">{result.strategy.templateBase} · {result.strategy.framework}</p>
                    <p className="text-xs text-gray-700 font-medium mt-0.5">{result.strategy.objective}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-lg font-bold ${scoreColor}`}>{result.validation.score}</span>
                    <span className="text-[10px] text-gray-400">/100</span>
                  </div>
                </div>
                <p className="text-[11px] text-gray-600 italic mb-2">"{result.strategy.audienceInsight}"</p>
                <div className="flex gap-3 text-[10px] text-gray-500">
                  <span>👁️ Read {result.strategy.expectedReadRate}</span>
                  <span>💬 Resp {result.strategy.expectedResponseRate}</span>
                  <span>🎯 Conv {result.strategy.expectedConversion}</span>
                </div>
                {result.strategy.psychologyUsed?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {result.strategy.psychologyUsed.map((p) => (
                      <span key={p} className="text-[9px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">{p}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Marco note */}
              {result.marcoNote && (
                <div className="flex gap-2 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                  <Brain className="h-3.5 w-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-amber-800">{result.marcoNote}</p>
                </div>
              )}

              {/* Steps */}
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                  <Target className="h-3.5 w-3.5" />
                  Pasos generados ({result.steps.length})
                </p>
                <div className="space-y-2">
                  {result.steps.map((step, i) => (
                    <div key={i} className="border border-gray-200 rounded-lg overflow-hidden">
                      <button
                        onClick={() => setExpandedStep(expandedStep === i ? null : i)}
                        className="w-full flex items-center justify-between p-2.5 text-left bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${step.type === 'IMAGE' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                            {step.type === 'IMAGE' ? <ImageIcon className="h-3 w-3 inline" /> : '✍️'} {step.type}
                          </span>
                          <span className="text-xs text-gray-600 truncate max-w-[260px]">{step.content?.slice(0, 60)}…</span>
                        </div>
                        {expandedStep === i ? <ChevronUp className="h-3.5 w-3.5 text-gray-400" /> : <ChevronDown className="h-3.5 w-3.5 text-gray-400" />}
                      </button>
                      {expandedStep === i && (
                        <div className="p-3 space-y-2">
                          <p className="text-xs text-gray-800 whitespace-pre-wrap bg-white border border-gray-100 rounded p-2">{step.content}</p>
                          {step.note && (
                            <p className="text-[10px] text-gray-500 italic">💡 {step.note}</p>
                          )}
                          {step.principlesUsed?.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {step.principlesUsed.map((p) => (
                                <span key={p} className="text-[9px] bg-green-50 text-green-700 border border-green-200 px-1.5 py-0.5 rounded-full">{p}</span>
                              ))}
                            </div>
                          )}
                          {step.type === 'IMAGE' && step.imagePrompt && (
                            <div className="bg-purple-50 border border-purple-200 rounded p-2">
                              <p className="text-[9px] font-bold text-purple-700 mb-1 flex items-center gap-1">
                                <Zap className="h-2.5 w-2.5" /> PROMPT NANO BANANA
                              </p>
                              <p className="text-[10px] text-purple-800 italic leading-relaxed">{step.imagePrompt}</p>
                            </div>
                          )}
                          <p className="text-[10px] text-gray-400">Delay: {step.delaySeconds}s</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Validation */}
              <div>
                <button
                  onClick={() => setShowValidation(!showValidation)}
                  className="flex items-center gap-2 text-xs font-semibold text-gray-600 hover:text-gray-800"
                >
                  <BarChart2 className="h-3.5 w-3.5" />
                  Validación de principios ({result.validation.score}/100)
                  {showValidation ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
                {showValidation && (
                  <div className="mt-2 space-y-1">
                    {result.validation.checks.slice(0, 10).map((c, i) => (
                      <div key={i} className="flex items-start gap-2 text-[10px]">
                        {c.pass
                          ? <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0 mt-0.5" />
                          : <XCircle className="h-3 w-3 text-red-400 flex-shrink-0 mt-0.5" />}
                        <span className={c.pass ? 'text-gray-600' : 'text-red-600'}>
                          <strong>{c.principle}</strong> — {c.note}
                        </span>
                      </div>
                    ))}
                    {result.validation.antiPatternsFound?.length > 0 && (
                      <div className="mt-2 p-2 bg-red-50 rounded border border-red-200">
                        <p className="text-[10px] font-bold text-red-700 mb-1">⚠️ Anti-patrones detectados:</p>
                        {result.validation.antiPatternsFound.map((a, i) => (
                          <p key={i} className="text-[10px] text-red-600">• {a}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Anti-patterns warning */}
              {result.validation.antiPatternsFound?.length > 0 && !showValidation && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-2 text-[11px] text-red-700">
                  <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                  {result.validation.antiPatternsFound.length} anti-patrón(es) detectado(s). Revisa la validación.
                </div>
              )}

              {/* Generate images toggle */}
              {result.steps.some((s) => s.type === 'IMAGE' && s.imagePrompt) && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <div
                    onClick={() => setGenerateImages(!generateImages)}
                    className={`w-9 h-5 rounded-full transition-colors ${generateImages ? 'bg-[#1e3a5f]' : 'bg-gray-300'} relative`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${generateImages ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </div>
                  <span className="text-xs text-gray-700">
                    Generar imágenes con Nano Banana automáticamente
                    <span className="text-[10px] text-gray-400 ml-1">({result.steps.filter((s) => s.type === 'IMAGE').length} imagen{result.steps.filter((s) => s.type === 'IMAGE').length > 1 ? 'es' : ''})</span>
                  </span>
                </label>
              )}
            </div>
          )}
        </div>

        {/* Apply button */}
        {result && (
          <div className="p-4 border-t border-gray-200 bg-white">
            <button
              onClick={handleApply}
              disabled={isApplying}
              className="w-full flex items-center justify-center gap-2 bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg py-2.5 text-sm font-semibold transition-colors"
            >
              {isApplying ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Aplicando estrategia…
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  Aplicar estrategia de Marco ({result.steps.length} pasos)
                  {generateImages && result.steps.some((s) => s.type === 'IMAGE') && ' + imágenes'}
                </>
              )}
            </button>
            <p className="text-[10px] text-gray-400 text-center mt-1.5">
              Esto reemplazará los pasos existentes de la campaña
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
