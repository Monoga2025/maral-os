import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

const OR_BASE  = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1/chat/completions';
const OR_MODEL = process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-001';
const LOCAL_AI_URL = process.env.LOCAL_AI_URL || 'http://127.0.0.1:11434/v1/chat/completions';

// ─── Hybrid Local / Cloud AI helper ───────────────────────────────

async function callAI(prompt: string, systemPrompt = 'Eres el asistente comercial inteligente de MARAL Tecnología y Comunicaciones SAS en Colombia.'): Promise<string> {
  // 1. Try Local AI Engine (Antigravity/Codex/Ollama local endpoint if available)
  try {
    const localController = new AbortController();
    const timeoutId = setTimeout(() => localController.abort(), 1200);
    const localRes = await fetch(LOCAL_AI_URL, {
      method: 'POST',
      signal: localController.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'codex-local',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 1024,
      }),
    });
    clearTimeout(timeoutId);
    if (localRes.ok) {
      const data = (await localRes.json()) as { choices?: { message?: { content?: string } }[] };
      if (data.choices?.[0]?.message?.content) {
        return data.choices[0].message.content;
      }
    }
  } catch {
    // Local AI not responding, fallback to Cloud API
  }

  // 2. Cloud Fallback (OpenRouter / Gemini / OpenAI compatible)
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    throw new Error('Sin clave de IA configurada');
  }

  const res = await fetch(OR_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
      'HTTP-Referer': 'https://maral-os.app',
      'X-Title': 'MARAL OS',
    },
    body: JSON.stringify({
      model: OR_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.4,
      max_tokens: 2048,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Cloud AI error ${res.status}: ${err}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content ?? '';
}

async function callAIWithImage(prompt: string, imageBase64: string, mimeType: string): Promise<string> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error('OPENROUTER_API_KEY no configurada');

  const res = await fetch(OR_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
      'HTTP-Referer': 'https://maral-os.app',
      'X-Title': 'MARAL OS',
    },
    body: JSON.stringify({
      model: OR_MODEL,
      messages: [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
          { type: 'text', text: prompt },
        ],
      }],
      temperature: 0.2,
      max_tokens: 3072,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter error ${res.status}: ${err}`);
  }

  const data = await res.json() as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content ?? '';
}

// ─── Briefing diario ──────────────────────────────────────────────

router.post('/briefing', async (req: AuthRequest, res: Response) => {
  if (!process.env.OPENROUTER_API_KEY) {
    res.json(null);
    return;
  }
  try {
    const user = req.user!;
    const today = new Date();
    const todayStr = today.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });

    const [
      unconfirmedOrders,
      stalledOrders,
      pendingTasks,
      criticalStock,
      expiringQuotations,
      overdueInvoices,
      pendingProductionOrders,
    ] = await Promise.all([
      prisma.order.count({ where: { confirmed: false, status: 'CONFIRMADO' } }),
      prisma.order.count({
        where: {
          status: { in: ['CONFIRMADO', 'EN_PRODUCCION'] },
          updatedAt: { lt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
        },
      }),
      prisma.task.findMany({
        where: { status: { in: ['PENDIENTE', 'EN_PROGRESO'] }, assignedToId: user.userId },
        include: { createdBy: { select: { name: true } } },
        orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
        take: 5,
      }),
      prisma.product.findMany({ where: { minStock: { gt: 0 } }, select: { stock: true, minStock: true } })
        .then(prods => prods.filter(p => p.stock <= p.minStock).length),
      prisma.quotation.findMany({
        where: {
          status: { in: ['ENVIADA', 'BORRADOR'] },
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
        include: { client: { select: { name: true, company: true } } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.invoice.count({ where: { status: 'VENCIDA' } }),
      prisma.productionOrder.count({ where: { status: { in: ['PENDIENTE', 'EN_PROCESO'] } } }),
    ]);

    const salesThisMonth = await prisma.order.aggregate({
      where: {
        status: { notIn: ['CANCELADO'] },
        createdAt: { gte: new Date(today.getFullYear(), today.getMonth(), 1) },
      },
      _sum: { total: true },
    });

    const roleContext: Record<string, string> = {
      GERENTE:   'Eres el gerente general. Ves todo el negocio.',
      VENTAS:    'Eres del equipo de ventas. Te enfocas en clientes, cotizaciones y pedidos.',
      LOGISTICA: 'Eres del equipo de logística. Te enfocas en producción, empaque y despacho.',
      CONTADORA: 'Eres la contadora. Te enfocas en facturas vencidas, cartera y gastos.',
    };

    const prompt = `Eres el asistente inteligente de MARAL OS, sistema de gestión de Maral Tecnología y Comunicaciones S.A.S., empresa colombiana de electrónica B2B.

Hoy es ${todayStr}.
Contexto del usuario: ${roleContext[user.role] ?? 'Empleado de la empresa.'}

ESTADO DEL NEGOCIO HOY:
- Ventas del mes: $${(salesThisMonth._sum.total ?? 0).toLocaleString('es-CO')} COP
- Pedidos sin confirmar: ${unconfirmedOrders}
- Pedidos sin movimiento (+5 días): ${stalledOrders}
- Cotizaciones pendientes: ${expiringQuotations.length}${expiringQuotations.length > 0 ? ` (clientes: ${expiringQuotations.map(q => q.client?.name || q.client?.company || '?').slice(0,3).join(', ')})` : ''}
- Facturas vencidas: ${overdueInvoices}
- Productos en stock crítico: ${criticalStock}
- Órdenes de producción activas: ${pendingProductionOrders}
- Tareas pendientes propias: ${pendingTasks.length > 0 ? pendingTasks.map(t => `"${t.title}"`).slice(0,3).join(', ') : 'ninguna'}

RUTAS VÁLIDAS (usa SOLO estas):
- /pedidos, /cotizaciones, /clientes, /credito, /inventario, /produccion, /compras, /tareas, /gastos

INSTRUCCIONES:
- Saluda brevemente (máx 15 palabras, tono colombiano cercano).
- Acciones MUY concretas: "Llamar a [cliente] para confirmar cotización", "Cobrar factura vencida de [X]".
- El campo "cta" es el texto del botón (2-3 palabras máx).
- Si no hay urgencias, "actions" puede estar vacío y "mood" = "BIEN".

Responde ÚNICAMENTE con JSON válido, sin texto extra, sin markdown:
{
  "greeting": "string corto",
  "actions": [{"priority":"URGENTE|NORMAL|INFO","emoji":"emoji","text":"descripción (máx 90 chars)","link":"/ruta","cta":"texto botón"}],
  "insight": "tip breve o null",
  "mood": "BIEN|ATENCION|CRITICO"
}
Máximo 5 acciones.`;

    const raw = await callAI(prompt);
    const stripped = raw.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '');
    const jsonMatch = stripped.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('AI briefing raw response:', raw.slice(0, 300));
      res.status(500).json({ error: 'Respuesta IA inválida' });
      return;
    }

    res.json(JSON.parse(jsonMatch[0]));
  } catch (error) {
    const msg = (error as Error).message ?? '';
    console.error('AI briefing error:', msg.slice(0, 300));
    res.status(500).json({ error: 'Error al generar briefing' });
  }
});

// ─── Autofill ─────────────────────────────────────────────────────

router.post('/autofill', async (req: AuthRequest, res: Response) => {
  if (!process.env.OPENROUTER_API_KEY) {
    res.json({ suggestions: null });
    return;
  }
  try {
    const { value, formType } = req.body as {
      context?: string;
      field?: string;
      value: string;
      formType: 'expense' | 'task' | 'quotation' | 'order';
    };

    const prompts: Record<string, string> = {
      expense: `Eres un asistente de contabilidad para empresa colombiana de electrónica.
El usuario escribió como concepto de gasto: "${value}"
Determina:
1. Tipo: "CAJA_MENOR" (efectivo - ferretería, fletes, materiales urgentes, papelería) o "TARJETA" (tarjeta - Amazon, proveedores online, servicios digitales, pagos mayores)
2. Una nota breve (opcional, máx 30 chars)
Responde SOLO con JSON: {"type":"CAJA_MENOR|TARJETA","notes":"nota o null"}`,

      task: `El usuario está creando una tarea en empresa de electrónica colombiana.
Título: "${value}"
Sugiere: prioridad (URGENTE/NORMAL/DESPUES) y fecha límite razonable en días (1, 3, 7, 14).
Responde SOLO con JSON: {"priority":"URGENTE|NORMAL|DESPUES","dueDays":número}`,
    };

    const prompt = prompts[formType];
    if (!prompt) {
      res.status(400).json({ error: 'formType no soportado' });
      return;
    }

    const raw = await callAI(prompt);
    const stripped = raw.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '');
    const jsonMatch = stripped.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) {
      res.json({ suggestions: null });
      return;
    }

    res.json({ suggestions: JSON.parse(jsonMatch[0]) });
  } catch (error) {
    console.error('AI autofill error:', error);
    res.status(500).json({ error: 'Error al generar sugerencias' });
  }
});

function parseExpenseFallback(text: string): { amount: number; concept: string; type: 'CAJA_MENOR' | 'TARJETA'; notes: string | null } {
  const lower = text.toLowerCase().trim();
  let type: 'CAJA_MENOR' | 'TARJETA' = 'CAJA_MENOR';
  if (lower.includes('tarjeta') || lower.includes('nequi') || lower.includes('daviplata') || lower.includes('bancolombia') || lower.includes('cuenta')) {
    type = 'TARJETA';
  }

  // Parse amount in Colombian phrasing
  let amount = 0;
  const millonMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(?:millon|millones)/);
  const milMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(?:mil|k)\b/);
  const rawNumMatch = lower.match(/\$?\s*(\d{1,3}(?:\.\d{3})+|\d+)/);

  if (millonMatch) {
    amount = Math.round(parseFloat(millonMatch[1].replace(',', '.')) * 1000000);
  } else if (milMatch) {
    amount = Math.round(parseFloat(milMatch[1].replace(',', '.')) * 1000);
  } else if (rawNumMatch) {
    const cleanNum = rawNumMatch[1].replace(/\./g, '');
    amount = parseInt(cleanNum, 10) || 0;
  }

  // Concept: remove filler words
  let concept = lower
    .replace(/gasto\s*(?:de)?/gi, '')
    .replace(/(?:por\s*valor\s*de|por|de|en|con|pesos|cop|caja\s*menor|efectivo|tarjeta)/gi, ' ')
    .replace(/\b\d+(?:[.,]\d+)?\s*(?:mil|millon|millones|k)?\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!concept) {
    concept = 'Gasto operacional';
  } else {
    concept = concept.charAt(0).toUpperCase() + concept.slice(1);
  }

  return {
    amount,
    concept: concept.slice(0, 100),
    type: amount >= 300000 && type === 'CAJA_MENOR' ? 'TARJETA' : type,
    notes: `Dictado por voz: "${text.trim()}"`,
  };
}

// ─── Parse expense voice ──────────────────────────────────────────

router.post('/parse-expense-voice', async (req: AuthRequest, res: Response) => {
  try {
    const { text } = req.body as { text: string };
    if (!text || typeof text !== 'string' || text.trim().length < 3) {
      res.status(400).json({ error: 'Texto requerido' });
      return;
    }

    if (!process.env.OPENROUTER_API_KEY) {
      const fallback = parseExpenseFallback(text);
      res.json(fallback);
      return;
    }

    const prompt = `Eres un asistente que transforma descripciones de voz en español colombiano en un registro de gasto para una empresa.

El usuario dictó: "${text.trim()}"

Extrae y devuelve SOLO un JSON (sin markdown) con:
- "amount": monto numérico en pesos COP (entero). Convierte "mil/mil pesos"=1000, "cinco mil"=5000, "cuarenta y cinco mil"=45000, "un millón"=1000000, "2 millones y medio"=2500000.
- "concept": concepto claro del gasto (string corto, máx 60 chars, sin mencionar el monto).
- "type": "CAJA_MENOR" (efectivo: ferretería, fletes, materiales, papelería, gasolina, comida) o "TARJETA" (tarjeta: Amazon, proveedores online, pagos mayores, servicios digitales). Si el usuario menciona "efectivo" o "caja menor" → CAJA_MENOR. Si menciona "tarjeta" o "cuenta" → TARJETA. Si no menciona, deduce por el monto: ≥200000 suele ser TARJETA.
- "notes": detalles extra si los mencionó (string o null, máx 100 chars).

Formato estricto:
{"amount":número,"concept":"texto","type":"CAJA_MENOR|TARJETA","notes":"texto o null"}`;

    try {
      const raw = await callAI(prompt);
      const stripped = raw.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '');
      const jsonMatch = stripped.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        res.json({
          amount: Number(parsed.amount) || 0,
          concept: String(parsed.concept ?? '').slice(0, 200),
          type: parsed.type === 'TARJETA' ? 'TARJETA' : 'CAJA_MENOR',
          notes: parsed.notes ? String(parsed.notes).slice(0, 200) : null,
        });
        return;
      }
    } catch {
      // AI call failed, fallback gracefully
    }

    const fallback = parseExpenseFallback(text);
    res.json(fallback);
  } catch (error) {
    console.error('Parse expense voice error:', error);
    res.status(500).json({ error: 'Error al procesar audio' });
  }
});

// ─── Parse quotation image ─────────────────────────────────────────

router.post('/parse-quotation-image', async (req: AuthRequest, res: Response) => {
  if (!process.env.OPENROUTER_API_KEY) {
    res.status(503).json({ error: 'IA no configurada' });
    return;
  }
  try {
    const { imageBase64, mimeType } = req.body as { imageBase64: string; mimeType: string };
    if (!imageBase64) {
      res.status(400).json({ error: 'imageBase64 requerido' });
      return;
    }

    const prompt = `Analiza esta imagen que contiene una cotización o factura de un sistema contable colombiano.

Extrae la información y devuélvela como JSON:
{
  "clientName": "nombre del cliente o empresa (string)",
  "notes": "observaciones si las hay (string o null)",
  "items": [
    {
      "productName": "nombre del producto",
      "productReference": "código o referencia (string o null)",
      "qty": unidades (número),
      "unitPrice": precio unitario COP sin puntos (número),
      "discount": porcentaje 0-100 (número)
    }
  ]
}
Reglas: precios como enteros COP, qty positivo, descuento 0 si no hay. Responde SOLO con JSON, sin markdown.`;

    const raw = await callAIWithImage(prompt, imageBase64, mimeType || 'image/jpeg');
    const stripped = raw.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '');
    const jsonMatch = stripped.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      res.status(500).json({ error: 'No se pudo extraer datos de la imagen' });
      return;
    }

    res.json(JSON.parse(jsonMatch[0]));
  } catch (error) {
    console.error('Parse quotation image error:', error);
    res.status(500).json({ error: 'Error al procesar la imagen' });
  }
});

export default router;
