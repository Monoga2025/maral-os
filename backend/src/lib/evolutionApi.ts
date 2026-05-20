/**
 * evolutionApi.ts — Cliente centralizado para Evolution API (WhatsApp)
 *
 * Variables de entorno requeridas:
 *   EVOLUTION_API_URL      Base URL de tu instancia Evolution API
 *   EVOLUTION_API_KEY      API key del servidor Evolution
 *   EVOLUTION_INSTANCE     Nombre de la instancia (default: 'maral-info')
 *
 * Todas las notificaciones son fire-and-forget: nunca bloquean la respuesta HTTP.
 */

const BASE_URL = (process.env.EVOLUTION_API_URL ?? '').replace(/\/+$/, '');  // strip trailing slash
const API_KEY  = process.env.EVOLUTION_API_KEY  ?? '';
const INSTANCE = process.env.EVOLUTION_INSTANCE ?? 'maral-info';
const INSTANCE_PATH = encodeURIComponent(INSTANCE);

const COMPANY_PHONE = process.env.COMPANY_PHONE ?? '3167760692';

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.startsWith('57') ? digits : `57${digits}`;
}

function fmtCOP(n: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(n);
}

function padNum(n: number, len = 4): string {
  return String(n).padStart(len, '0');
}

async function sendMedia(
  phone: string,
  type: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT',
  mediaUrl: string,
  caption?: string,
  fileName?: string,
): Promise<void> {
  if (!BASE_URL || !API_KEY || !phone) return;
  try {
    const number = formatPhone(phone);
    const mediatype = type.toLowerCase() as 'image' | 'video' | 'audio' | 'document';
    const response = await fetch(`${BASE_URL}/message/sendMedia/${INSTANCE_PATH}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: API_KEY },
      body: JSON.stringify({ number, mediatype, media: mediaUrl, caption, fileName }),
    });
    if (!response.ok) {
      let body = '';
      try { body = await response.text(); } catch { /* ignore */ }
      console.warn(`[EvolutionAPI] sendMedia ${number} → ${response.status} | ${body.slice(0, 200)}`);
    }
  } catch (err) {
    console.warn('[EvolutionAPI] Error sendMedia:', (err as Error).message);
  }
}

async function sendTextMessage(phone: string, message: string): Promise<void> {
  if (!BASE_URL || !API_KEY || !phone) return;
  try {
    const number = formatPhone(phone);
    const url = `${BASE_URL}/message/sendText/${INSTANCE_PATH}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: API_KEY },
      body: JSON.stringify({ number, text: message }),
    });
    if (!response.ok) {
      let body = '';
      try { body = await response.text(); } catch { /* ignore */ }
      console.warn(`[EvolutionAPI] sendText ${number} → ${response.status} | URL: ${url} | body: ${body.slice(0, 200)}`);
    } else {
      console.log(`[EvolutionAPI] ✓ enviado a ${number}`);
    }
  } catch (err) {
    // Notificación opcional — nunca bloquea
    console.warn('[EvolutionAPI] Error de red:', (err as Error).message);
  }
}

// ─── Plantillas de notificación ──────────────────────────────

/** Nueva tarea asignada */
function notifyNewTask(
  assigneeName: string,
  assigneePhone: string | null | undefined,
  taskTitle: string,
  priority: string,
  createdByName: string,
): Promise<void> {
  if (!assigneePhone) return Promise.resolve();
  const prioEmoji: Record<string, string> = {
    URGENTE: '🔴 URGENTE',
    NORMAL:  '🟡 Normal',
    DESPUES: '🔵 Después',
  };
  const prio = prioEmoji[priority] ?? priority;
  return sendTextMessage(
    assigneePhone,
    `📋 *Nueva tarea asignada*\n` +
    `Hola ${assigneeName}, tienes una nueva tarea:\n\n` +
    `*${taskTitle}*\n` +
    `Prioridad: ${prio}\n` +
    `Asignada por: ${createdByName}`,
  );
}

/** Cambio de estado de un pedido — notifica al destinatario/cliente */
function notifyOrderStatusChange(
  recipientPhone: string | null | undefined,
  recipientName: string,
  orderNumber: number,
  newStatus: string,
): Promise<void> {
  if (!recipientPhone) return Promise.resolve();
  const labels: Record<string, string> = {
    CONFIRMADO:    '✅ Confirmado',
    EN_PRODUCCION: '🔧 En producción',
    LISTO:         '📦 Listo para despacho',
    EMPACADO:      '📫 Empacado',
    DESPACHADO:    '🚚 Despachado — en camino',
    ENTREGADO:     '🎉 Entregado',
    CANCELADO:     '❌ Cancelado',
  };
  const label = labels[newStatus] ?? newStatus;
  return sendTextMessage(
    recipientPhone,
    `📦 *Pedido #${padNum(orderNumber)} — MARAL*\n\n` +
    `Hola ${recipientName}, el estado de tu pedido cambió a:\n` +
    `*${label}*\n\n` +
    `📞 ${COMPANY_PHONE}`,
  );
}

/** Pedido listo para despacho — notifica al asesor comercial */
function notifyProductionReady(
  sellerPhone: string | null | undefined,
  sellerName: string,
  orderNumber: number,
  clientName: string,
): Promise<void> {
  if (!sellerPhone) return Promise.resolve();
  return sendTextMessage(
    sellerPhone,
    `✅ *Pedido listo — MARAL*\n` +
    `El pedido *#${padNum(orderNumber)}* de ${clientName} ya está en estado LISTO.\n` +
    `Coordina el despacho.`,
  );
}

/** Cotización enviada — notifica al cliente */
function notifyQuotationSent(
  clientPhone: string | null | undefined,
  clientName: string,
  quotationNumber: number,
  total: number,
): Promise<void> {
  if (!clientPhone) return Promise.resolve();
  return sendTextMessage(
    clientPhone,
    `📄 *Cotización #${padNum(quotationNumber, 5)} — MARAL*\n\n` +
    `Hola ${clientName}, te enviamos una cotización por *${fmtCOP(total)}*.\n` +
    `Si tienes dudas, con gusto te atendemos.\n\n` +
    `📞 ${COMPANY_PHONE}`,
  );
}

/** Factura vencida — recordatorio de cobro */
function notifyOverdueInvoice(
  clientPhone: string | null | undefined,
  clientName: string,
  invoiceNumber: string,
  amount: number,
): Promise<void> {
  if (!clientPhone) return Promise.resolve();
  return sendTextMessage(
    clientPhone,
    `⚠️ *Cartera vencida — MARAL*\n\n` +
    `Hola ${clientName}, la factura *#${invoiceNumber}* por *${fmtCOP(amount)}* está vencida.\n` +
    `Por favor comunícate con nosotros para regularizar el pago.\n\n` +
    `📞 ${COMPANY_PHONE}`,
  );
}

/** Pedido despachado con guía — notifica al cliente */
function notifyOrderDispatched(
  clientPhone: string | null | undefined,
  clientName: string,
  orderNumber: number,
  carrier: string,
  guideNumber?: string,
): Promise<void> {
  if (!clientPhone) return Promise.resolve();
  const guideInfo = guideNumber ? `\nGuía: *${guideNumber}*` : '';
  return sendTextMessage(
    clientPhone,
    `🚚 *Tu pedido va en camino — MARAL*\n\n` +
    `Hola ${clientName}, el pedido *#${padNum(orderNumber)}* fue despachado.\n` +
    `Transportadora: ${carrier}${guideInfo}\n\n` +
    `📞 ${COMPANY_PHONE}`,
  );
}

export const evolutionApi = {
  sendTextMessage,
  sendMedia,
  notifyNewTask,
  notifyOrderStatusChange,
  notifyProductionReady,
  notifyQuotationSent,
  notifyOverdueInvoice,
  notifyOrderDispatched,
};

export default evolutionApi;
