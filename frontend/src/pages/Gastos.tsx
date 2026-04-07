import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Receipt, Wallet, CreditCard, TrendingDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { expensesApi } from '../lib/api'
import { formatCOP } from '../lib/utils'
import { useAuthStore } from '../store/auth'
import { toast } from 'sonner'
import type { Expense } from '../types'

const COP = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n)

function getWeekRange() {
  const today = new Date()
  const day = today.getDay()
  const diff = day === 0 ? 6 : day - 1 // Monday = 0
  const monday = new Date(today)
  monday.setDate(today.getDate() - diff)
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  return { from: fmt(monday), to: fmt(today) }
}

interface CreateForm {
  date: string
  concept: string
  amount: string
  type: 'CAJA_MENOR' | 'TARJETA'
  notes: string
}

const defaultForm = (): CreateForm => ({
  date: new Date().toISOString().slice(0, 10),
  concept: '',
  amount: '',
  type: 'CAJA_MENOR',
  notes: '',
})

export default function Gastos() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const week = getWeekRange()

  const [typeFilter, setTypeFilter] = useState<string>('')
  const [from, setFrom] = useState(week.from)
  const [to, setTo] = useState(week.to)
  const [page, setPage] = useState(1)
  const limit = 20

  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<CreateForm>(defaultForm())
  const [submitting, setSubmitting] = useState(false)

  const filters = {
    ...(typeFilter ? { type: typeFilter } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
    page,
    limit,
  }

  const { data, isLoading } = useQuery({
    queryKey: ['expenses', filters],
    queryFn: () => expensesApi.getAll(filters).then((r) => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (payload: Parameters<typeof expensesApi.create>[0]) =>
      expensesApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] })
      toast.success('Gasto registrado')
      setShowModal(false)
      setForm(defaultForm())
    },
    onError: () => toast.error('Error al registrar el gasto'),
    onSettled: () => setSubmitting(false),
  })

  const approveMutation = useMutation({
    mutationFn: (id: string) => expensesApi.approve(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] })
      toast.success('Gasto aprobado')
    },
    onError: () => toast.error('Error al aprobar el gasto'),
  })

  const expenses: Expense[] = data?.data ?? []
  const pagination = data?.pagination
  const totals = data?.totals ?? {}
  const totalCajaMenor = totals['CAJA_MENOR'] ?? 0
  const totalTarjeta = totals['TARJETA'] ?? 0
  const totalGeneral = totalCajaMenor + totalTarjeta

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const amount = parseFloat(form.amount)
    if (!form.concept.trim() || isNaN(amount) || amount <= 0) {
      toast.error('Completa todos los campos requeridos')
      return
    }
    setSubmitting(true)
    createMutation.mutate({
      date: `${form.date}T00:00:00.000Z`,
      concept: form.concept.trim(),
      amount,
      type: form.type,
      ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
    })
  }

  const handleTypeFilterChange = (t: string) => {
    setTypeFilter(t)
    setPage(1)
  }

  const formatDateLocal = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Gastos</h1>
        <button
          onClick={() => { setShowModal(true); setForm(defaultForm()) }}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <Receipt className="h-4 w-4" />
          Registrar gasto
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <Wallet className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Caja Menor</p>
              <p className="text-xl font-bold text-gray-900">{COP(totalCajaMenor)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Tarjeta</p>
              <p className="text-xl font-bold text-gray-900">{COP(totalTarjeta)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
              <TrendingDown className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total</p>
              <p className="text-xl font-bold text-gray-900">{COP(totalGeneral)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap items-center gap-4">
        <div className="flex gap-1">
          {[['', 'Todos'], ['CAJA_MENOR', 'Caja Menor'], ['TARJETA', 'Tarjeta']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => handleTypeFilterChange(val)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                typeFilter === val
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <label className="text-sm text-gray-500">Desde</label>
          <input
            type="date"
            value={from}
            onChange={(e) => { setFrom(e.target.value); setPage(1) }}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <label className="text-sm text-gray-500">Hasta</label>
          <input
            type="date"
            value={to}
            onChange={(e) => { setTo(e.target.value); setPage(1) }}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="animate-pulse space-y-2 p-4">
            {[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded" />)}
          </div>
        ) : expenses.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <Receipt className="mx-auto mb-2 h-10 w-10 opacity-40" />
            <p className="font-medium">Sin gastos en el período seleccionado</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Fecha', 'Concepto', 'Tipo', 'Monto', 'Registrado por', 'Estado', 'Acción'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {expenses.map((expense) => (
                <tr key={expense.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">
                    {formatDateLocal(expense.date)}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{expense.concept}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      expense.type === 'CAJA_MENOR'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {expense.type === 'CAJA_MENOR' ? 'Caja Menor' : 'Tarjeta'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900">
                    {COP(expense.amount)}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {expense.createdBy?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    {expense.approvedAt ? (
                      <span className="inline-flex flex-col gap-0.5">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          Aprobado
                        </span>
                        {expense.approvedBy?.name && (
                          <span className="text-[10px] text-gray-400">{expense.approvedBy.name}</span>
                        )}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                        Pendiente
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {user?.role === 'GERENTE' && !expense.approvedAt && (
                      <button
                        onClick={() => approveMutation.mutate(expense.id)}
                        disabled={approveMutation.isPending}
                        className="text-xs text-blue-600 border border-blue-200 rounded px-2 py-1 hover:bg-blue-50 transition-colors disabled:opacity-50"
                      >
                        Aprobar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Página {pagination.page} de {pagination.pages} — {pagination.total} gastos
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                disabled={page === pagination.pages}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-5">Registrar gasto</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha *</label>
                <input
                  type="date"
                  required
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Concepto *</label>
                <input
                  type="text"
                  required
                  placeholder="Descripción del gasto"
                  value={form.concept}
                  onChange={(e) => setForm((f) => ({ ...f, concept: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monto *</label>
                <input
                  type="number"
                  required
                  min={1}
                  placeholder="0"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
                <select
                  required
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as 'CAJA_MENOR' | 'TARJETA' }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="CAJA_MENOR">Caja Menor</option>
                  <option value="TARJETA">Tarjeta</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <textarea
                  rows={3}
                  placeholder="Observaciones opcionales"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {submitting ? 'Guardando...' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
