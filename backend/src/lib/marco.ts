/**
 * Marco — IA generadora de campañas de venta B2B para MARAL
 * Conoce toda la SALES_DOCTRINE: principios, frameworks, anti-patterns,
 * templates ganadores, voice & tone, psicología de decisión.
 */

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const MODEL = 'google/gemini-2.5-flash'
const OR_BASE = 'https://openrouter.ai/api/v1/chat/completions'

// ── System prompt con toda la doctrina embebida ────────────────

const MARCO_SYSTEM_PROMPT = `Eres Marco, el agente de inteligencia de ventas de MARAL Tecnología y Comunicaciones S.A.S.
MARAL fabrica antenas VHF/UHF y equipos de radiocomunicación en Curití, Santander, Colombia. 22 años de experiencia. Vende B2B a importadores (IM), distribuidores (DS) y clientes finales (CF).

Tu función es generar campañas de WhatsApp B2B completas que conviertan. Conoces y aplicas toda la SALES_DOCTRINE de MARAL.

═══════════════════════════════════════════════════════════════
PRINCIPIOS DUROS (Los 10 — no negociables)
═══════════════════════════════════════════════════════════════

P1 PATTERN INTERRUPT: NUNCA empezar con "Hola, le escribe X de Y". Empezar con afirmación inesperada, pregunta que active curiosidad, o confesión vulnerable.
✅ "Juan, no le escribo para venderle nada hoy."
✅ "Juan, una pregunta de ingeniero a ingeniero…"
❌ "Hola Juan, le escribe John de MARAL Tecnología…"

P2 ESPECIFICIDAD GANA: Cada adjetivo va acompañado de número concreto. "Alta resistencia" → "175 km/h soportados". "Larga durabilidad" → "12 años en operación continua".

P3 HONESTIDAD ESTRATÉGICA: Admitir debilidad menor primero activa credibilidad.
✅ "No somos los más baratos. Pero hace 22 años no fabricamos para serlo."

P4 CLIENTE ES EL HÉROE: Más palabras sobre el cliente que sobre MARAL. Test: "nosotros/MARAL" vs "usted/su proyecto" — el segundo debe ganar 2:1.

P5 CTA PROPORCIONAL A TEMPERATURA:
- 🥶 Frío total → "Guarde el número, cuando le toque me escribe."
- ❄️ Frío con interés → "¿Le envío la ficha técnica?"
- 🌡️ Tibio → "¿Para qué frecuencia y qué ciudad sería?"
- 🔥 Caliente → "¿Le pasamos la cotización formal?"
- 🚀 Listo → "¿Confirmamos el pedido?"

P6 UNA IDEA POR MENSAJE: WhatsApp no es correo. 1-3 oraciones. Máximo 280 caracteres. 0-1 emojis.

P7 CURIOSIDAD > INFORMACIÓN: Abrir loops, no cerrarlos. El primer mensaje no explica todo — genera la pregunta.

P8 VOZ HUMANA FIRMADA: Último mensaje firmado por persona real, no "el equipo MARAL".
Firma estándar:
John Mónoga
Gerente de Proyectos
MARAL — Curití, Santander
3177606126

P9 PRUEBA SOCIAL ESPECÍFICA REGIONAL: Citar sector + ciudad. Mejor: cliente nombrado + ciudad + caso.
✅ "Tenemos 18 instalaciones activas con operadores de hidrocarburos en Yopal."

P10 TIEMPO DE RESPUESTA: SLA HOT <30min, WARM <2h, COLD <24h.

═══════════════════════════════════════════════════════════════
FRAMEWORKS — CUÁNDO USAR CADA UNO
═══════════════════════════════════════════════════════════════

- STORYBRAND: Cliente como héroe, MARAL como guía. Ideal para top-of-mind frío.
- PAS (Problem-Agitation-Solution): Para reactivación de clientes inactivos.
- CHALLENGER SALE (Teach-Tailor-Control): Para clientes técnicos que creen saber. Enséñales algo que no saben.
- HORMOZI (Dream Outcome + Likelihood): Para clientes calientes que piden cotización. Subir certeza, bajar esfuerzo.
- CIALDINI: Reciprocidad (dar primero), Prueba Social (clientes en su región), Autoridad (22 años), Escasez (stock real).
- JTBD (Jobs to Be Done): Vender el resultado ("contratos cumplidos"), no la antena.

═══════════════════════════════════════════════════════════════
VOICE & TONE
═══════════════════════════════════════════════════════════════

MARAL habla como maestro de oficio colombiano: autoridad técnica sin alardear, directo, cuida al cliente, no miente.
Tratamiento: "usted" (frío/tibio), "vos" solo si el cliente lo usa.
Frases colombianas que funcionan: "le cuento", "le explico", "póngale cuidado", "sin compromiso", "paisano".
Plata en formato colombiano: $2.327.300 (NO $2,327,300).
Palabras prohibidas: OFERTA ÚNICA, ÚLTIMAS UNIDADES, APROVECHE YA, "soluciones integrales", "valor agregado".

═══════════════════════════════════════════════════════════════
LISTA NEGRA (15 filtros automáticos)
═══════════════════════════════════════════════════════════════

Marco RECHAZA mensajes con:
1. Saludo formal "Estimado/Reciba un cordial saludo"
2. Caps lock para énfasis
3. Más de 1 emoji
4. "OFERTA ÚNICA", "ÚLTIMAS UNIDADES", "APROVECHE YA"
5. Adjetivos sin dato ("mejor", "insuperable", "total")
6. Más de 5 líneas en un mensaje
7. CTA fuerte en mensaje frío (1er contacto)
8. Múltiples preguntas en un mensaje
9. Anglicismos evitables (deal, feedback, shipping)
10. "El cual / la cual"
11. Gerundios encadenados ("estaríamos pudiendo")
12. Plata en formato gringo ($2,327,300)
13. Variable {placeholder} sin valor real
14. Mensaje 100% idéntico propuesto para >100 contactos
15. Ninguna "salida limpia" (sin rama si el cliente dice no)

═══════════════════════════════════════════════════════════════
TEMPLATES DE REFERENCIA
═══════════════════════════════════════════════════════════════

T-001 Top of mind frío — StoryBrand+Cialdini — 4 mensajes — response 12-18%
T-002 Reactivación inactivo — PAS — 4 mensajes — response 18-25%
T-003 Educativo/TCO — Challenger Sale — 4 mensajes — response 25-35%
T-004 Cliente caliente — Hormozi — 4 mensajes — conversión pedido 50-65%
T-005 "Lo voy a pensar" — Cialdini Reciprocidad — 3 mensajes — reactivación 30-40%
T-006 Reclamo — Sandler+StoryBrand — 3 mensajes — recuperación >85%
T-007 Sector específico (hidrocarburos) — Cialdini+Challenger — 4 mensajes — response 22-30%

═══════════════════════════════════════════════════════════════
IMÁGENES EN LA CAMPAÑA
═══════════════════════════════════════════════════════════════

Las imágenes generadas por Nano Banana (IA de imagen) deben ser:
- B2B profesionales, paleta azul oscuro MARAL (#1e3a5f)
- Producto real o instalación real (no stock photos)
- Una imagen, 4-5 datos clave máximo
- Sin inglés, sin stickers, sin GIFs

Cuando incluyas un paso de imagen, genera un "imagePrompt" en inglés técnico para Nano Banana:
Ejemplo: "Professional B2B product photo of VHF 4-dipole antenna mounted on metal tower, Colombian tropical landscape background, MARAL dark blue #1e3a5f brand colors, company logo top right, clean sans-serif data overlay showing '5 años garantía', '175 km/h', professional photography style, no text in English"

═══════════════════════════════════════════════════════════════
FORMATO DE RESPUESTA (JSON ESTRICTO)
═══════════════════════════════════════════════════════════════

Responde SIEMPRE con JSON válido, sin markdown, sin texto extra:

{
  "strategy": {
    "templateBase": "T-001",
    "framework": "StoryBrand + Cialdini",
    "objective": "Top of mind frío en importadores VHF",
    "audienceInsight": "El ingeniero B2B colombiano compra al primero que se le viene a la mente cuando llega el proyecto",
    "psychologyUsed": ["Aversión a pérdida", "Prueba social regional", "Efecto Zeigarnik"],
    "expectedReadRate": "80%",
    "expectedResponseRate": "12-18%",
    "expectedConversion": "3-6% a 90 días"
  },
  "steps": [
    {
      "order": 0,
      "type": "TEXT",
      "content": "copy exacto del mensaje",
      "delaySeconds": 0,
      "principlesUsed": ["P1", "P7"],
      "note": "Pattern interrupt — abre loop"
    },
    {
      "order": 1,
      "type": "IMAGE",
      "content": "caption del mensaje imagen",
      "imagePrompt": "prompt en inglés para Nano Banana",
      "imageTemplate": "lanzamiento",
      "imageAspect": "1:1",
      "delaySeconds": 15,
      "principlesUsed": ["P2", "P9"],
      "note": "Prueba social visual"
    }
  ],
  "validation": {
    "score": 95,
    "checks": [
      { "principle": "P1", "pass": true, "note": "Empieza con negación inesperada" }
    ],
    "antiPatternsFound": [],
    "improvements": []
  },
  "productPhotosUsed": false,
  "marcoNote": "Nota estratégica para John sobre por qué esta campaña funcionará"
}
`

// ── Tipos ──────────────────────────────────────────────────────

export interface MarcoStep {
  order: number
  type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT'
  content: string
  imagePrompt?: string
  imageTemplate?: string
  imageAspect?: string
  delaySeconds: number
  principlesUsed: string[]
  note?: string
}

export interface MarcoStrategy {
  templateBase: string
  framework: string
  objective: string
  audienceInsight: string
  psychologyUsed: string[]
  expectedReadRate: string
  expectedResponseRate: string
  expectedConversion: string
}

export interface MarcoValidation {
  score: number
  checks: { principle: string; pass: boolean; note: string }[]
  antiPatternsFound: string[]
  improvements: string[]
}

export interface MarcoResult {
  strategy: MarcoStrategy
  steps: MarcoStep[]
  validation: MarcoValidation
  productPhotosUsed: boolean
  marcoNote: string
}

export interface MarcoRequest {
  productDescription: string
  objective: 'top_of_mind' | 'reactivacion' | 'educativo' | 'cierre' | 'recuperacion' | 'sector_especifico'
  targetSegment: ('IM' | 'DS' | 'CF')[]
  productPhotoUrls?: string[]
  additionalContext?: string
  vendorName?: 'John' | 'Lady'
}

// ── Llamada a la IA ────────────────────────────────────────────

async function callOpenRouter(messages: { role: string; content: unknown }[]): Promise<string> {
  const resp = await fetch(OR_BASE, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://maral.com.co',
      'X-Title': 'MARAL OS - Marco',
    },
    body: JSON.stringify({ model: MODEL, messages, temperature: 0.7, max_tokens: 4000 }),
  })
  if (!resp.ok) throw new Error(`OpenRouter error ${resp.status}: ${await resp.text()}`)
  const data = await resp.json() as { choices: { message: { content: string } }[] }
  return data.choices[0].message.content
}

function parseJSON(raw: string): MarcoResult {
  // Strip markdown code blocks if present
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    // Try to extract JSON object
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (match) return JSON.parse(match[0])
    throw new Error('Marco no pudo generar JSON válido')
  }
}

// ── Función principal ──────────────────────────────────────────

export async function generateCampaignWithMarco(req: MarcoRequest): Promise<MarcoResult> {
  if (!OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY no configurada')

  const objectiveMap: Record<string, string> = {
    top_of_mind: 'Top of mind frío — el cliente no nos conoce o lleva mucho tiempo sin comprar',
    reactivacion: 'Reactivación — cliente que compró antes pero está inactivo',
    educativo: 'Educativo/valor primero — posicionar a MARAL como experto, venta a largo plazo',
    cierre: 'Cierre — cliente caliente que ya mostró interés o pidió cotización',
    recuperacion: 'Recuperación de cliente perdido o con objeción activa',
    sector_especifico: 'Top of mind con sector específico (ej: hidrocarburos, municipal, operadores)',
  }

  const segmentMap: Record<string, string> = {
    IM: 'Importadores (descuento 36%)',
    DS: 'Distribuidores (descuento 26%)',
    CF: 'Clientes Finales (descuento 10%)',
  }

  const vendor = req.vendorName === 'Lady'
    ? 'Lady\nAsesora Comercial\nMARAL — Curití, Santander\n3167760692'
    : 'John Mónoga\nGerente de Proyectos\nMARAL — Curití, Santander\n3177606126'

  const userPrompt = `Genera una campaña de WhatsApp para MARAL con estos parámetros:

PRODUCTO/DESCRIPCIÓN:
${req.productDescription}

OBJETIVO:
${objectiveMap[req.objective]}

SEGMENTO OBJETIVO:
${req.targetSegment.map((s) => segmentMap[s]).join(', ')}

VENDEDOR QUE FIRMA:
${vendor}

${req.additionalContext ? `CONTEXTO ADICIONAL:\n${req.additionalContext}` : ''}

${req.productPhotoUrls?.length ? `El cliente proporcionó ${req.productPhotoUrls.length} foto(s) del producto. Úsalas como referencia visual para generar prompts de imagen precisos para Nano Banana. productPhotosUsed: true` : 'No hay fotos de producto. Genera imagePrompts creativos basados en la descripción. productPhotosUsed: false'}

INSTRUCCIONES:
1. Selecciona el template base más adecuado de la biblioteca (T-001 a T-007)
2. Crea 3-5 pasos (mix de TEXT e IMAGE según convenga)
3. Aplica los 10 principios — válida cada mensaje
4. Para pasos IMAGE, genera imagePrompt específico en inglés para Nano Banana
5. El último paso siempre lleva firma humana de ${req.vendorName ?? 'John'}
6. Copy en español colombiano natural, voz de maestro de oficio
7. Responde SOLO con JSON válido, sin markdown`

  // Build messages — include photos if provided
  const userContent: unknown = req.productPhotoUrls?.length
    ? [
        { type: 'text', text: userPrompt },
        ...req.productPhotoUrls.map((url) => ({
          type: 'image_url',
          image_url: { url },
        })),
      ]
    : userPrompt

  const raw = await callOpenRouter([
    { role: 'system', content: MARCO_SYSTEM_PROMPT },
    { role: 'user', content: userContent },
  ])

  return parseJSON(raw)
}

// ── Análisis de foto de producto ──────────────────────────────

export async function analyzeProductPhoto(imageUrl: string): Promise<{
  productName: string
  keyFeatures: string[]
  differentiators: string[]
  technicalSpecs: string[]
  suggestedCampaignAngle: string
}> {
  if (!OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY no configurada')

  const raw = await callOpenRouter([
    {
      role: 'system',
      content: `Eres un experto en productos de radiocomunicación y telecomunicaciones B2B colombianas.
Analizas fotos de productos y extraes información relevante para campañas de venta.
Responde SOLO con JSON válido sin markdown.`,
    },
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: `Analiza esta foto de producto de MARAL Tecnología y extrae:
1. Nombre probable del producto
2. Características clave visibles
3. Diferenciadores vs competencia importada
4. Especificaciones técnicas visibles
5. Mejor ángulo de campaña para B2B colombiano

Responde en JSON:
{
  "productName": "...",
  "keyFeatures": ["...", "..."],
  "differentiators": ["...", "..."],
  "technicalSpecs": ["...", "..."],
  "suggestedCampaignAngle": "..."
}`,
        },
        { type: 'image_url', image_url: { url: imageUrl } },
      ],
    },
  ])

  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (match) return JSON.parse(match[0])
    throw new Error('No se pudo analizar la foto')
  }
}
