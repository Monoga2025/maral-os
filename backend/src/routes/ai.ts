import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

async function callGemini(prompt: string): Promise<string> {
  const key = process.env.GOOGLE_AI_KEY;
  if (!key) throw new Error('GOOGLE_AI_KEY no configurada');

  const res = await fetch(`${GEMINI_URL}?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 1024, thinkingConfig: { thinkingBudget: 0 } },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini error ${res.status}: ${err}`);
  }

  const data = await res.json() as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

// POST /api/ai/briefing — briefing diario personalizado por rol
router.post('/briefing', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const today = new Date();
    const todayStr = today.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });

    // Fetch business state from DB
    const [
      unconfirmedOrders,
      stalledOrders,
      pendingTasks,
      criticalStock,
      expiringQuotations,
      overdueInvoices,
      pendingProductionOrders,
      recentActivity,
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
        include: { assignedTo: { select: { name: true } }, createdBy: { select: { name: true } } },
        orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
        take: 5,
      }),
      prisma.$queryRaw<{ count: bigint }[]>`SELECT COUNT(*)::bigint as count FROM "Product" WHERE "minStock" > 0 AND "stock" <= "minStock"`.then(r => Number(r[0]?.count ?? 0)),
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
      prisma.productionOrder.findMany({
        where: { status: { in: ['PENDIENTE', 'EN_PROCESO'] } },
        include: {
          product: { select: { name: true, reference: true } },
          order: { include: { client: { select: { name: true } } } },
        },
        orderBy: { requiredDate: 'asc' },
        take: 5,
      }),
      prisma.activityLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 3,
        include: { user: { select: { name: true } } },
      }),
    ]);

    const salesThisMonth = await prisma.order.aggregate({
      where: {
        status: { notIn: ['CANCELADO'] },
        createdAt: { gte: new Date(today.getFullYear(), today.getMonth(), 1) },
      },
      _sum: { total: true },
    });

    const roleContext: Record<string, string> = {
      GERENTE: 'Eres el gerente general. Ves todo el negocio.',
      VENTAS: 'Eres del equipo de ventas. Te enfocas en clientes, cotizaciones y pedidos.',
      LOGISTICA: 'Eres del equipo de logística. Te enfocas en producción, empaque y despacho.',
    };

    const prompt = `Eres el asistente inteligente de MARAL OS, el sistema de gestión de Maral Tecnología y Comunicaciones S.A.S., empresa colombiana de electrónica B2B.

Hoy es ${todayStr}.
Contexto del usuario: ${roleContext[user.role] ?? 'Empleado de la empresa.'}
Nombre del usuario: Se desconoce, saluda genéricamente.

ESTADO ACTUAL DEL NEGOCIO:
- Ventas este mes: $${(salesThisMonth._sum.total ?? 0).toLocaleString('es-CO')} COP
- Pedidos sin confirmar: ${unconfirmedOrders}
- Pedidos estancados (+5 días sin movimiento): ${stalledOrders}
- Cotizaciones pendientes (últimos 30 días): ${expiringQuotations.length} — Clientes: ${expiringQuotations.map(q => q.client?.name || q.client?.company || 'desconocido').join(', ')}
- Facturas vencidas: ${overdueInvoices}
- Productos en stock crítico: ${criticalStock}
- Órdenes de producción activas: ${pendingProductionOrders.length} — Productos: ${pendingProductionOrders.map(p => `${p.product?.reference} para ${(p.order as any)?.client?.name ?? 'sin pedido'}`).join(', ')}
- Tareas pendientes del usuario: ${pendingTasks.map(t => `"${t.title}" (${t.priority})`).join(', ') || 'ninguna'}

INSTRUCCIONES:
Genera un briefing conversacional, empático y ACCIONABLE en español colombiano.
NO uses lenguaje robótico ni tecnicismos.
Sé específico: menciona nombres de clientes y números de pedido cuando sean relevantes.
El objetivo es que el usuario sepa EXACTAMENTE qué hacer en los próximos 60 minutos.

Responde ÚNICAMENTE con un JSON válido con esta estructura exacta:
{
  "greeting": "Saludo personalizado con el día y un tono amigable (1 línea)",
  "summary": "Resumen de 1 línea sobre cómo está el negocio hoy",
  "actions": [
    {
      "priority": "URGENTE|NORMAL|INFO",
      "emoji": "un emoji relevante",
      "text": "Acción específica en lenguaje natural (máx 80 caracteres)",
      "link": "/ruta-del-modulo"
    }
  ],
  "insight": "Un insight breve de IA sobre el negocio (1-2 oraciones, opcional)",
  "mood": "BIEN|ATENCION|CRITICO"
}

Genera máximo 5 actions. Prioriza las más urgentes. Si no hay nada urgente, dilo positivamente.`;

    const raw = await callGemini(prompt);

    // Strip markdown code fences if present, then extract JSON object
    const stripped = raw.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '');
    const jsonMatch = stripped.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('AI briefing raw response:', raw.slice(0, 500));
      res.status(500).json({ error: 'Respuesta IA inválida' });
      return;
    }

    const briefing = JSON.parse(jsonMatch[0]);
    res.json(briefing);
  } catch (error) {
    console.error('AI briefing error:', error);
    res.status(500).json({ error: 'Error al generar briefing' });
  }
});

// POST /api/ai/autofill — sugerencias de campos para formularios
router.post('/autofill', async (req: AuthRequest, res: Response) => {
  try {
    const { context, field, value, formType } = req.body as {
      context: string;
      field: string;
      value: string;
      formType: 'expense' | 'task' | 'quotation' | 'order';
    };

    const prompts: Record<string, string> = {
      expense: `Eres un asistente de contabilidad para una empresa colombiana de electrónica.
El usuario escribió como concepto de gasto: "${value}"
Determina:
1. El tipo de gasto: "CAJA_MENOR" (efectivo/caja menor - ferretería, fletes, materiales urgentes, papelería) o "TARJETA" (pagos con tarjeta - Amazon, proveedores online, servicios digitales, pagos mayores)
2. Una nota sugerida breve (opcional, máx 30 chars)

Responde SOLO con JSON: {"type": "CAJA_MENOR|TARJETA", "notes": "nota opcional o null"}`,

      task: `El usuario está creando una tarea en una empresa de electrónica colombiana.
Título de la tarea: "${value}"
Sugiere: prioridad (URGENTE/NORMAL/DESPUES) y una fecha límite razonable en días desde hoy (1, 3, 7, 14).

Responde SOLO con JSON: {"priority": "URGENTE|NORMAL|DESPUES", "dueDays": número}`,
    };

    const prompt = prompts[formType];
    if (!prompt) {
      res.status(400).json({ error: 'formType no soportado' });
      return;
    }

    const raw = await callGemini(prompt);
    const stripped2 = raw.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '');
    const jsonMatch = stripped2.match(/\{[\s\S]*?\}/);
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

export default router;
