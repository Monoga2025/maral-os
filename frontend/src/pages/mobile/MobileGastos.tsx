import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Camera, X, Wallet, CreditCard, TrendingDown, Check, Mic, Loader2, Sparkles } from 'lucide-react'
import { expensesApi, aiApi } from '../../lib/api'
import { useAuthStore } from '../../store/auth'
import { toast } from 'sonner'
import type { Expense } from '../../types'

const COP = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n)

function getWeekRange() {
  const today = new Date()
  const day = today.getDay()
  const diff = day === 0 ? 6 : day - 1
  const monday = new Date(today)
  monday.setDate(today.getDate() - diff)
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  return { from: fmt(monday), to: fmt(today) }
}

function formatShortDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })
}

interface Form {
  concept: string
  amount: string
  type: 'CAJA_MENOR' | 'TARJETA'
  notes: string
}

const defaultForm = (): Form => ({
  concept: '',
  amount: '',
  type: 'CAJA_MENOR',
  notes: '',
})

export default function MobileGastos() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const week = getWeekRange()
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<Form>(defaultForm())
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null)
  const receiptRef = useRef<HTMLInputElement>(null)

  // Voice recording
  const [voiceState, setVoiceState] = useState<'idle' | 'recording' | 'processing'>('idle')
  const [voiceTranscript, setVoiceTranscript] = useState('')
  const recognitionRef = useRef<any>(null)

  const startVoiceCapture = () => {
    const w = window as any
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!SR) {
      toast.error('Tu navegador no soporta dictado por voz.')
      return
    }
    const rec = new SR()
    rec.lang = 'es-CO'
    rec.interimResults = true
    rec.continuous = false
    let finalText = ''
    rec.onresult = (e: any) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) finalText += t
        else interim += t
      }
      setVoiceTranscript(finalText + interim)
    }
    rec.onerror = (e: any) => {
      console.error('Voice error:', e)
      toast.error(e.error === 'not-allowed' ? 'Permiso de micrófono denegado' : 'Error al escuchar')
      setVoiceState('idle')
    }
    rec.onend = async () => {
      if (!finalText.trim()) {
        setVoiceState('idle')
        toast.error('No se detectó audio.')
        return
      }
      setVoiceState('processing')
      try {
        const { data: parsed } = await aiApi.parseExpenseVoice(finalText.trim())
        setForm({
          concept: parsed.concept,
          amount: String(parsed.amount),
          type: parsed.type,
          notes: parsed.notes ?? '',
        })
        setShowModal(true)
        toast.success('Gasto interpretado por IA')
      } catch (err: any) {
        toast.error(err?.response?.data?.error ?? 'Error al interpretar gasto')
      } finally {
        setVoiceState('idle')
        setVoiceTranscript('')
      }
    }
    recognitionRef.current = rec
    setVoiceTranscript('')
    setVoiceState('recording')
    rec.start()
  }

  const stopVoiceCapture = () => {
    try { recognitionRef.current?.stop() } catch { /* noop */ }
  }

  const { data, isLoading } = useQuery({
    queryKey: ['expenses-mobile', week],
    queryFn: () => expensesApi.getAll({ from: week.from, to: week.to, limit: 50 }).then((r) => r.data),
  })

  const createMutation = useMutation({
    mutationFn: async (payload: Parameters<typeof expensesApi.create>[0]) => {
      const res = await expensesApi.create(payload)
      if (receiptFile) {
        const fd = new FormData()
        fd.append('receipt', receiptFile)
        await expensesApi.uploadReceipt(res.data.id, fd)
      }
      return res
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses-mobile'] })
      qc.invalidateQueries({ queryKey: ['expenses'] })
      toast.success('Gasto registrado')
      setShowModal(false)
      setForm(defaultForm())
      setReceiptFile(null)
      setReceiptPreview(null)
    },
    onError: () => toast.error('Error al registrar'),
  })

  const expenses: Expense[] = data?.data ?? []
  const totals = data?.totals ?? {}
  const cajaMenor = totals['CAJA_MENOR'] ?? 0
  const tarjeta = totals['TARJETA'] ?? 0
  const total = cajaMenor + tarjeta

  const handleSubmit = () => {
    const amount = parseFloat(form.amount)
    if (!form.concept.trim() || isNaN(amount) || amount <= 0) {
      toast.error('Completa concepto y monto')
      return
    }
    createMutation.mutate({
      date: `${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`,
      concept: form.concept.trim(),
      amount,
      type: form.type,
      notes: form.notes.trim() || undefined,
    })
  }

  return (
    <div className="space-y-4 pb-2">
      <div className="flex items-center justify-between">
        <h1 className="text-[#F1F5F9] text-lg font-bold">Gastos</h1>
        <button
          type="button"
          onClick={voiceState === 'recording' ? stopVoiceCapture : startVoiceCapture}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
            voiceState === 'recording'
              ? 'bg-red-600 text-white animate-pulse shadow-md shadow-red-600/30'
              : voiceState === 'processing'
              ? 'bg-amber-600 text-white animate-pulse'
              : 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-600/30'
          }`}
        >
          {voiceState === 'recording' ? (
            <>
              <div className="w-2 h-2 rounded-full bg-white animate-ping" />
              <span>Escuchando... (Toca para terminar)</span>
            </>
          ) : voiceState === 'processing' ? (
            <>
              <Loader2 size={13} className="animate-spin" />
              <span>Interpretando IA...</span>
            </>
          ) : (
            <>
              <Mic size={13} />
              <span>Dictar con Voz</span>
            </>
          )}
        </button>
      </div>

      {/* Voice Transcript Live Banner */}
      {voiceTranscript && (
        <div className="bg-indigo-950/60 border border-indigo-800/60 rounded-2xl p-3 flex items-center gap-2 text-xs text-indigo-200">
          <Sparkles size={14} className="text-indigo-400 shrink-0 animate-pulse" />
          <p className="truncate italic">"{voiceTranscript}"</p>
        </div>
      )}

      {/* Weekly summary */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Caja Menor', value: cajaMenor, icon: Wallet, color: '#22C55E', bg: '#0D2818' },
          { label: 'Tarjeta', value: tarjeta, icon: CreditCard, color: '#60A5FA', bg: '#172554' },
          { label: 'Total', value: total, icon: TrendingDown, color: '#FBBF24', bg: '#1C1500' },
        ].map((item) => (
          <div key={item.label} className="bg-[#141C26] border border-[#1E2D3D] rounded-2xl p-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-2" style={{ backgroundColor: item.bg }}>
              <item.icon size={14} style={{ color: item.color }} />
            </div>
            <p className="text-[#F1F5F9] text-base font-black leading-tight">
              {item.value >= 1000000 ? `$${(item.value / 1000000).toFixed(1)}M`
                : item.value >= 1000 ? `$${(item.value / 1000).toFixed(0)}K`
                : `$${item.value}`}
            </p>
            <p className="text-[#475569] text-[10px] mt-0.5">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Expense list */}
      <div className="bg-[#141C26] border border-[#1E2D3D] rounded-2xl overflow-hidden">
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <h2 className="text-[#F1F5F9] text-sm font-semibold">Esta semana</h2>
          <span className="text-[#475569] text-xs">{expenses.length} gastos</span>
        </div>
        {isLoading ? (
          <div className="px-4 pb-4 space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 bg-[#1E2D3D] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : expenses.length === 0 ? (
          <div className="px-4 pb-6 text-center">
            <p className="text-[#334155] text-sm">Sin gastos esta semana</p>
          </div>
        ) : (
          <div>
            {expenses.map((expense, idx) => (
              <div
                key={expense.id}
                className={`flex items-center gap-3 px-4 py-3 ${idx < expenses.length - 1 ? 'border-b border-[#1E2D3D]' : ''}`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  expense.type === 'CAJA_MENOR' ? 'bg-[#0D2818]' : 'bg-[#172554]'
                }`}>
                  {expense.type === 'CAJA_MENOR'
                    ? <Wallet size={14} className="text-[#22C55E]" />
                    : <CreditCard size={14} className="text-[#60A5FA]" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[#CBD5E1] text-sm font-medium truncate">{expense.concept}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-[#475569] text-[11px]">{formatShortDate(expense.date)}</p>
                    {expense.approvedAt && (
                      <span className="flex items-center gap-0.5 text-[10px] text-[#22C55E]">
                        <Check size={9} />Aprobado
                      </span>
                    )}
                    {expense.receiptUrl && (
                      <a href={expense.receiptUrl} target="_blank" rel="noopener noreferrer"
                        className="text-[10px] text-[#60A5FA]">Ver foto</a>
                    )}
                  </div>
                </div>
                <span className="text-[#F1F5F9] text-sm font-bold shrink-0">{COP(expense.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => { setForm(defaultForm()); setShowModal(true) }}
        className="fixed bottom-24 right-4 w-14 h-14 bg-[#22C55E] rounded-full flex items-center justify-center shadow-lg shadow-green-900/40 z-40"
      >
        <Plus size={24} className="text-white" />
      </button>

      {/* Create modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-end z-50">
          <div className="bg-[#141C26] border border-[#1E2D3D] rounded-t-3xl w-full p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[#F1F5F9] text-base font-bold">Registrar gasto</h3>
              <button onClick={() => setShowModal(false)}>
                <X size={20} className="text-[#475569]" />
              </button>
            </div>

            {/* Type toggle */}
            <div className="flex gap-2">
              {(['CAJA_MENOR', 'TARJETA'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setForm(f => ({ ...f, type: t }))}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
                    form.type === t
                      ? t === 'CAJA_MENOR'
                        ? 'bg-[#22C55E] text-white'
                        : 'bg-[#60A5FA] text-white'
                      : 'bg-[#1E2D3D] text-[#475569]'
                  }`}
                >
                  {t === 'CAJA_MENOR' ? 'Caja Menor' : 'Tarjeta'}
                </button>
              ))}
            </div>

            <div>
              <label className="text-[#94A3B8] text-xs font-medium">Concepto *</label>
              <input
                type="text"
                autoFocus
                placeholder="¿En qué se gastó?"
                value={form.concept}
                onChange={(e) => setForm(f => ({ ...f, concept: e.target.value }))}
                className="mt-1 w-full bg-[#1E2D3D] border border-[#2D3F50] rounded-xl px-4 py-3 text-[#F1F5F9] text-sm placeholder-[#334155] focus:outline-none focus:border-[#22C55E]"
              />
            </div>

            <div>
              <label className="text-[#94A3B8] text-xs font-medium">Monto *</label>
              <input
                type="number"
                inputMode="numeric"
                placeholder="0"
                value={form.amount}
                onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))}
                className="mt-1 w-full bg-[#1E2D3D] border border-[#2D3F50] rounded-xl px-4 py-3 text-[#F1F5F9] text-sm placeholder-[#334155] focus:outline-none focus:border-[#22C55E]"
              />
            </div>

            {/* Receipt photo */}
            <div>
              <label className="text-[#94A3B8] text-xs font-medium">Foto del recibo</label>
              <input
                ref={receiptRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    setReceiptFile(file)
                    setReceiptPreview(URL.createObjectURL(file))
                  }
                }}
              />
              {receiptPreview ? (
                <div className="mt-1 relative inline-block">
                  <img src={receiptPreview} alt="Recibo" className="h-20 w-auto rounded-xl border border-[#1E2D3D] object-cover" />
                  <button
                    onClick={() => { setReceiptFile(null); setReceiptPreview(null) }}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center"
                  >
                    <X size={12} className="text-white" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => receiptRef.current?.click()}
                  className="mt-1 w-full flex items-center justify-center gap-2 bg-[#1E2D3D] border border-dashed border-[#2D3F50] rounded-xl py-3 text-[#475569] text-sm"
                >
                  <Camera size={16} />
                  Tomar foto del recibo
                </button>
              )}
            </div>

            <button
              onClick={handleSubmit}
              disabled={createMutation.isPending}
              className="w-full py-3.5 bg-[#22C55E] text-white rounded-2xl font-semibold text-sm disabled:opacity-50"
            >
              {createMutation.isPending ? 'Guardando...' : 'Registrar gasto'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
