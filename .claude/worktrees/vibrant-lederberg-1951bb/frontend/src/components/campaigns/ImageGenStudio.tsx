import { useState, useRef, useCallback } from 'react'
import { X, Upload, Sparkles, RefreshCw, Layers, BookmarkPlus, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react'
import { imageGenApi } from '../../lib/api'
import type { ImageTemplate, AspectRatio, BrandGuardResult } from '../../types'

const TEMPLATES: { id: ImageTemplate; icon: string; label: string; desc: string }[] = [
  { id: 'promo',       icon: '🔥', label: 'Promo urgencia',  desc: 'Precio grande + stock limitado' },
  { id: 'comparativa', icon: '⚖️', label: 'Comparativa',     desc: 'Estándar vs Premium lado a lado' },
  { id: 'lanzamiento', icon: '🚀', label: 'Lanzamiento',     desc: 'Hero shot + specs clave' },
  { id: 'testimonial', icon: '💬', label: 'Testimonial',     desc: 'Producto + quote de cliente' },
  { id: 'educativo',   icon: '📚', label: 'Educativo',       desc: 'Infografía simple 3 puntos' },
]

const LOADING_MSGS = [
  'Diseñando…',
  'Aplicando marca MARAL…',
  'Componiendo la imagen…',
  'Ajustando paleta de colores…',
  'Casi listo…',
]

interface Props {
  campaignId?: string
  suggestedPrompt?: string
  suggestedTemplate?: ImageTemplate
  onUse: (imageUrl: string) => void
  onClose: () => void
}

export default function ImageGenStudio({ campaignId, suggestedPrompt, suggestedTemplate, onUse, onClose }: Props) {
  const [refs, setRefs] = useState<string[]>([])
  const [template, setTemplate] = useState<ImageTemplate | undefined>(suggestedTemplate)
  const [prompt, setPrompt] = useState(suggestedPrompt ?? '')
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1')
  const [loading, setLoading] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState('')
  const [result, setResult] = useState<{ id: string; url: string; brandGuard: BrandGuardResult } | null>(null)
  const [error, setError] = useState('')
  const [variantPrompt, setVariantPrompt] = useState('')
  const [showVariant, setShowVariant] = useState(false)
  const [saved, setSaved] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const attemptsRef = useRef(0)

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files) return
    const newRefs: string[] = []
    for (const file of Array.from(files).slice(0, 3 - refs.length)) {
      if (!file.type.startsWith('image/')) continue
      const b64 = await fileToBase64(file)
      newRefs.push(b64)
    }
    setRefs((prev) => [...prev, ...newRefs].slice(0, 3))
  }, [refs.length])

  const startLoadingCycle = () => {
    let i = 0
    setLoadingMsg(LOADING_MSGS[0])
    const interval = setInterval(() => {
      i = (i + 1) % LOADING_MSGS.length
      setLoadingMsg(LOADING_MSGS[i])
    }, 2500)
    return interval
  }

  const generate = async () => {
    if (!prompt.trim()) { setError('Escribe un prompt antes de generar.'); return }
    if (attemptsRef.current >= 5) { setError('Máximo 5 intentos por sesión alcanzado.'); return }

    setLoading(true)
    setError('')
    setResult(null)
    setSaved(false)
    const interval = startLoadingCycle()
    attemptsRef.current += 1

    try {
      const res = await imageGenApi.generate({
        prompt: prompt.trim(),
        referenceImages: refs.length > 0 ? refs : undefined,
        template,
        aspectRatio,
        brandLock: true,
        campaignId,
      })
      setResult(res.data)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? (err as Error).message
        ?? 'Error al generar la imagen'
      setError(msg)
    } finally {
      clearInterval(interval)
      setLoading(false)
    }
  }

  const regenerate = async () => {
    if (!result) return
    if (attemptsRef.current >= 5) { setError('Máximo 5 intentos por sesión alcanzado.'); return }

    setLoading(true)
    setError('')
    setSaved(false)
    const interval = startLoadingCycle()
    attemptsRef.current += 1

    try {
      const res = await imageGenApi.regenerate(result.id)
      setResult(res.data)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Error al regenerar'
      setError(msg)
    } finally {
      clearInterval(interval)
      setLoading(false)
    }
  }

  const requestVariant = async () => {
    if (!result) return
    if (attemptsRef.current >= 5) { setError('Máximo 5 intentos por sesión alcanzado.'); return }

    setLoading(true)
    setError('')
    setSaved(false)
    const interval = startLoadingCycle()
    attemptsRef.current += 1

    try {
      const res = await imageGenApi.variant(result.id, variantPrompt.trim() || undefined)
      setResult(res.data)
      setShowVariant(false)
      setVariantPrompt('')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Error al crear variante'
      setError(msg)
    } finally {
      clearInterval(interval)
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            <h2 className="font-semibold text-gray-900">Studio de imágenes IA</h2>
            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">Nano Banana</span>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex gap-0 h-full">
          {/* Left panel — controls */}
          <div className="flex-1 px-6 py-5 space-y-5 border-r border-gray-100">

            {/* Step 1 — Reference images */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                1. Imágenes de referencia <span className="text-gray-400">(hasta 3)</span>
              </p>
              <div
                className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center cursor-pointer hover:border-blue-300 transition-colors"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files) }}
                onClick={() => fileInputRef.current?.click()}
              >
                {refs.length === 0 ? (
                  <div className="text-gray-400">
                    <Upload className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-xs">Arrastra imágenes aquí o haz clic</p>
                    <p className="text-[10px] mt-1 text-gray-300">Producto, logo, contexto</p>
                  </div>
                ) : (
                  <div className="flex gap-2 justify-center flex-wrap">
                    {refs.map((r, i) => (
                      <div key={i} className="relative">
                        <img src={r} alt="" className="h-16 w-16 object-cover rounded-lg border border-gray-200" />
                        <button
                          onClick={(e) => { e.stopPropagation(); setRefs((prev) => prev.filter((_, j) => j !== i)) }}
                          className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center"
                        >×</button>
                      </div>
                    ))}
                    {refs.length < 3 && (
                      <div className="h-16 w-16 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center text-gray-300 text-xl">+</div>
                    )}
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
              </div>
            </div>

            {/* Step 2 — Template */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">2. Tipo de diseño</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTemplate(template === t.id ? undefined : t.id)}
                    className={`text-left p-2.5 rounded-xl border transition-all text-xs ${
                      template === t.id
                        ? 'border-blue-500 bg-blue-50 text-blue-800'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-base block mb-1">{t.icon}</span>
                    <span className="font-medium block">{t.label}</span>
                    <span className="text-gray-400 text-[10px]">{t.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 3 — Prompt */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">3. Instrucciones adicionales</p>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder='Ej: "Destacar los 5 años de garantía, mostrar precio $2.327.300 grande, fondo azul profundo"'
                rows={3}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            {/* Step 4 — Aspect ratio */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">4. Formato</p>
              <div className="flex gap-2">
                {(['1:1', '4:5', '16:9'] as AspectRatio[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setAspectRatio(r)}
                    className={`px-3 py-1.5 text-xs rounded-lg border font-mono transition-all ${
                      aspectRatio === r ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-xs text-red-700 flex items-start gap-2">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            <button
              onClick={generate}
              disabled={loading || !prompt.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {loadingMsg}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generar imagen
                </>
              )}
            </button>
            {attemptsRef.current > 0 && (
              <p className="text-center text-[10px] text-gray-400">{attemptsRef.current}/5 intentos usados</p>
            )}
          </div>

          {/* Right panel — preview */}
          <div className="w-72 px-5 py-5 flex flex-col gap-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Vista previa</p>

            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-gray-50 rounded-2xl min-h-48">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <p className="text-xs text-gray-400 text-center">{loadingMsg}</p>
              </div>
            ) : result ? (
              <>
                <div className="relative rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
                  <img src={result.url} alt="Imagen generada" className="w-full object-cover" />
                  {!result.brandGuard.approved && (
                    <div className="absolute bottom-0 inset-x-0 bg-yellow-500/90 text-white text-[10px] px-2 py-1 text-center flex items-center justify-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Score {result.brandGuard.professionalScore}/10 — revisar antes de usar
                    </div>
                  )}
                </div>

                {/* Brand Guard badge */}
                <div className={`flex items-start gap-2 text-xs rounded-xl px-3 py-2 ${result.brandGuard.approved ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
                  {result.brandGuard.approved
                    ? <CheckCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    : <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />}
                  <div>
                    <p className="font-medium">{result.brandGuard.approved ? 'Imagen aprobada' : 'Revisar imagen'}</p>
                    {result.brandGuard.issues.length > 0 && (
                      <ul className="mt-1 space-y-0.5 text-[10px]">
                        {result.brandGuard.issues.slice(0, 3).map((issue, i) => <li key={i}>• {issue}</li>)}
                      </ul>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  <button
                    onClick={() => { onUse(result.url); onClose() }}
                    className="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors"
                  >
                    Usar en la campaña
                  </button>

                  <div className="flex gap-2">
                    <button
                      onClick={regenerate}
                      disabled={loading || attemptsRef.current >= 5}
                      className="flex-1 flex items-center justify-center gap-1.5 border border-gray-200 rounded-xl py-2 text-xs hover:bg-gray-50 disabled:opacity-40 transition-colors"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Regenerar
                    </button>
                    <button
                      onClick={() => setShowVariant(!showVariant)}
                      disabled={loading || attemptsRef.current >= 5}
                      className="flex-1 flex items-center justify-center gap-1.5 border border-gray-200 rounded-xl py-2 text-xs hover:bg-gray-50 disabled:opacity-40 transition-colors"
                    >
                      <Layers className="h-3.5 w-3.5" />
                      Variante
                    </button>
                  </div>

                  {showVariant && (
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Ej: más colorida, sin el precio..."
                        value={variantPrompt}
                        onChange={(e) => setVariantPrompt(e.target.value)}
                        className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-400"
                      />
                      <button
                        onClick={requestVariant}
                        disabled={loading}
                        className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg py-2 text-xs font-medium transition-colors"
                      >
                        Pedir variante
                      </button>
                    </div>
                  )}

                  <button
                    onClick={() => setSaved(true)}
                    disabled={saved}
                    className={`w-full flex items-center justify-center gap-1.5 border rounded-xl py-2 text-xs transition-colors ${
                      saved ? 'bg-gray-50 text-gray-400 border-gray-100' : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <BookmarkPlus className="h-3.5 w-3.5" />
                    {saved ? 'Guardada en biblioteca' : 'Guardar en biblioteca'}
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-2 bg-gray-50 rounded-2xl min-h-48 text-gray-300">
                <Sparkles className="h-10 w-10 opacity-30" />
                <p className="text-xs text-center">La imagen aparecerá<br />aquí tras generar</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
