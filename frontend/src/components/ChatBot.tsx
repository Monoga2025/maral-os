import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Bot, User, Loader2, BookOpen } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY ?? ''
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`

const SYSTEM_PROMPT = `Eres el asistente virtual de MARAL OS, la plataforma de gestión interna de Maral Tecnología y Comunicaciones S.A.S., empresa colombiana fabricante de antenas RF bajo la marca MAXANT con más de 20 años de experiencia.

SOBRE LA EMPRESA:
- Nombre: Maral Tecnología y Comunicaciones S.A.S.
- Marca de producto: MAXANT
- Ubicación: Colombia
- Fundador/Gerente: John Mónoga
- Equipo: John (Gerente General), Wilson (Ventas & Mercadeo), Iván (Producción & Logística), Janet (Contabilidad)
- Punto de equilibrio: $40M COP/mes. Ventas actuales: $28-35M
- Productos principales: Antenas vehiculares (65%), estación base G6/G7 (20%), handy (5%), cables/conectores
- Competencia: SYSCOM, RFI, DITELCOM, UNITEL, MARPED
- Factoring activo con: Meltec, ISEC, Eleinco

MÓDULOS DE LA PLATAFORMA:

1. DASHBOARD (/):
   - Muestra métricas del mes: ventas actuales vs meta, pedidos activos, cotizaciones pendientes
   - Alertas: stock crítico, cartera vencida, seguimientos pendientes, pedidos sin confirmar
   - Gráfica de ventas 6 meses, actividad reciente del equipo
   - Para verlo: es la pantalla principal al iniciar sesión

2. CLIENTES (/clientes):
   - Ver lista de todos los clientes, buscar por nombre
   - Categorías: FUNDADOR_HISTORICO (clientes históricos VIP), FUNDADOR_MARAL, ALIADO (recurrentes), PROSPECTO (nuevos)
   - Para crear: botón "Nuevo Cliente" → llenar nombre, NIT, teléfono, WhatsApp, email, ciudad, categoría, cupo de crédito, días de plazo
   - Ver detalle de un cliente: clic sobre el nombre → ficha con historial de pedidos, cotizaciones, facturas, cupo disponible
   - Estado de factoring: APROBADO, EN_ESTUDIO, RECHAZADO, NO_APLICA

3. COTIZACIONES (/cotizaciones):
   - Lista de cotizaciones con filtro por estado
   - Estados: BORRADOR → ENVIADA → VISTA → ACEPTADA/RECHAZADA/EXPIRADA
   - Crear: "Nueva Cotización" → seleccionar cliente → agregar productos → cantidad y precio → descuento → validez en días → observaciones
   - Convertir a pedido: abrir cotización ACEPTADA → botón "Convertir a Pedido"
   - El número se asigna automáticamente (ej: C-2024-0032)

4. PEDIDOS (/pedidos):
   - Vista KANBAN (por defecto): columnas CONFIRMADO → EN_PRODUCCION → EMPACADO → DESPACHADO → ENTREGADO
   - Vista TABLA: lista completa con filtros
   - Avanzar estado: botón "Avanzar →" en la tarjeta del pedido (kanban)
   - Crear pedido: "Nuevo Pedido" → cliente → productos → datos de envío (destinatario, dirección, ciudad, teléfono, transportadora, quien paga flete)
   - Transportadoras comunes: Servientrega, TCC, Coordinadora, Interrapidísimo
   - Tipos: PEDIDO (normal), GARANTIA, MUESTRA
   - El número se asigna automáticamente (ej: P-2024-0087)

5. INVENTARIO (/inventario):
   - Ver stock de todos los productos, filtrar por línea o buscar
   - Productos en rojo = stock crítico (por debajo del mínimo)
   - Registrar movimiento: "Registrar Movimiento" → tipo (ENTRADA/SALIDA/AJUSTE) → producto → cantidad → motivo
   - ENTRADA: llegó mercancía. SALIDA: salió material de producción. AJUSTE: corrección de conteo físico

6. PRODUCCIÓN (/produccion):
   - Lista de órdenes de producción
   - Estados: PENDIENTE → EN_PROCESO → TERMINADO → EMPACADO
   - Fases: BASICO, PREENSAMBLE, ENSAMBLE_FINAL
   - Cambiar estado: abrir orden → cambiar estado → guardar
   - Se puede subir fotos de evidencia del proceso

7. COMPRAS (/compras):
   - Órdenes de compra a proveedores
   - Estados: BORRADOR → ENVIADA → RECIBIDA / CANCELADA
   - Crear: "Nueva OC" → proveedor → productos → cantidades → costo unitario → fecha esperada
   - Recibir mercancía: abrir OC → "Recibir" → ingresar cantidades recibidas → el inventario se actualiza automáticamente
   - Proveedores comunes: Multivoltex, ATS, Cablemundo

8. CRÉDITO/CARTERA (/credito):
   - Resumen de cartera: vigente, vencida, próxima a vencer
   - Cupo de crédito por cliente: total asignado, usado, disponible
   - Lista de facturas con estado: VIGENTE, VENCIDA, PAGADA
   - Registrar pago: abrir factura → "Registrar Pago" → monto → notas → confirmar
   - Factoring: mecanismo de financiación donde una entidad adelanta el pago de las facturas

9. CATÁLOGO (/catalogo):
   - Todos los productos con precio, costo y margen calculado automáticamente
   - Líneas: ESTANDAR, PREMIUM — Categorías: ESTACION_BASE, MOVIL, HANDY, CABLE, CONECTOR, BASE, ACCESORIO, MATERIA_PRIMA
   - Margen verde ≥50%, azul 30-49%, naranja <30%
   - Crear producto: "Nuevo Producto" → referencia, nombre, línea, precio, costo, stock, stock mínimo, unidad

10. REPORTES (/reportes):
    - Ventas por período, por cliente, por línea de producto
    - Acceso para GERENTE y CONTADORA

11. TAREAS (/tareas):
    - Seguimiento de responsabilidades del equipo (John, Iván, Wilson, Janet)
    - Prioridades (Urgente, Normal, Después), recordatorios por WhatsApp y analíticas de cumplimiento

12. MANUAL (/manual):
    - Guía completa paso a paso de todos los módulos
    - Botón para imprimir/descargar como PDF

ROLES DE USUARIO:
- GERENTE (John): acceso completo a todo el sistema y analíticas
- VENTAS (Wilson): clientes, cotizaciones, pedidos, campañas, WhatsApp y seguimiento comercial
- LOGISTICA (Iván): órdenes de taller, pedidos, inventario, stock y compras
- CONTADORA (Janet): facturación, crédito, cartera, gastos y reportes financieros

INSTRUCCIONES DE COMPORTAMIENTO:
- Responde SIEMPRE en español
- Sé conciso y claro, usa pasos numerados cuando expliques procesos
- Si el usuario pregunta cómo hacer algo, da los pasos exactos
- Menciona el módulo y la ruta cuando sea útil (ej: "Ve a Pedidos → /pedidos")
- Si no sabes algo específico de la plataforma, sugiere ir al Manual en /manual
- Eres amable y paciente, recuerda que los usuarios pueden no ser expertos en tecnología
- Si te preguntan algo que no es de la plataforma, redirígelos amablemente al tema de MARAL OS
- Puedes usar emojis ocasionalmente para hacer las respuestas más amigables`

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const QUICK_QUESTIONS = [
  '¿Cómo creo una cotización?',
  '¿Cómo avanzo un pedido?',
  '¿Cómo registro un pago?',
  '¿Cómo ver el stock?',
]

export default function ChatBot() {
  const location = useLocation()
  const [open, setOpen] = useState(false)

  if (location.pathname.startsWith('/whatsapp')) return null
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '¡Hola! Soy el asistente de MARAL OS 👋\n\nPuedo ayudarte a usar cualquier módulo de la plataforma. ¿En qué te puedo ayudar hoy?',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open, messages])

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return

    const userMessage: Message = { role: 'user', content: text.trim() }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)

    // Build conversation history for Gemini
    const history = messages.slice(1).map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))

    try {
      const response = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: SYSTEM_PROMPT }],
          },
          contents: [
            ...history,
            { role: 'user', parts: [{ text: text.trim() }] },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
          },
        }),
      })

      if (!response.ok) throw new Error('Error en la respuesta de Gemini')

      const data = await response.json()
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'No pude generar una respuesta. Intenta de nuevo.'

      setMessages((prev) => [...prev, { role: 'assistant', content: reply }])
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Hubo un error de conexión. Por favor intenta de nuevo en unos segundos.' },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition-all hover:scale-105"
          title="Asistente MARAL OS"
        >
          <MessageCircle size={24} />
        </button>
      )}

      {/* Chat window */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col w-[380px] h-[580px] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between bg-blue-600 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                <Bot size={18} className="text-white" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">Asistente MARAL OS</p>
                <p className="text-blue-200 text-xs">Powered by Gemini AI</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => navigate('/manual')}
                className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                title="Ver manual completo"
              >
                <BookOpen size={16} />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex items-start gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    msg.role === 'assistant' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-white'
                  }`}
                >
                  {msg.role === 'assistant' ? <Bot size={14} /> : <User size={14} />}
                </div>
                <div
                  className={`max-w-[280px] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'assistant'
                      ? 'bg-white text-gray-800 rounded-tl-sm shadow-sm border border-gray-100'
                      : 'bg-blue-600 text-white rounded-tr-sm'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-start gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                  <Bot size={14} />
                </div>
                <div className="bg-white rounded-2xl rounded-tl-sm px-3.5 py-2.5 shadow-sm border border-gray-100">
                  <Loader2 size={16} className="text-blue-500 animate-spin" />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Quick questions */}
          {messages.length === 1 && (
            <div className="px-3 pb-2 bg-gray-50 flex flex-wrap gap-1.5">
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="text-xs bg-white border border-gray-200 text-gray-600 hover:border-blue-400 hover:text-blue-600 rounded-full px-3 py-1 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="flex items-center gap-2 p-3 border-t border-gray-200 bg-white">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe tu pregunta..."
              className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
