import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { authenticate, AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { classifyLead } from '../lib/lead-classifier';
import { notifyHotLead } from '../lib/notifier';
import { enrollInDrip, cancelDripsForClient } from '../lib/drip-scheduler';

const router = Router();

// ─── Constants ────────────────────────────────────────────────

const EVOL_BASE  = process.env.EVOLUTION_API_URL ?? '';
const EVOL_KEY   = process.env.EVOLUTION_API_KEY ?? '';
const EVOL_INST  = process.env.EVOLUTION_INSTANCE ?? 'maral-info';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODEL = 'google/gemini-2.5-flash';

// ─── Lady system prompt ───────────────────────────────────────

const LADY_PROMPT = `Eres Lady, asesora comercial de MARAL TECNOLOGÍA Y COMUNICACIONES S.A.S. Llevas años atendiendo clientes B2B en Colombia que compran antenas, bases, cables y radios para telecomunicaciones. Conoces el negocio de memoria.

## Quién eres
Una mujer real del equipo, no un bot. Hablas como colombiana: cálida, directa, sin rodeos. Le das confianza al cliente pero sin perder tiempo. Eres la razón por la que los clientes vuelven.

## Cómo hablas
- Español colombiano natural. Tuteo cuando el cliente tutea, ustedeo cuando el cliente ustedea.
- Si conoces el nombre del cliente, úsalo: "Don William", "Laura", "don Carlos"
- Mensajes cortos. Máx 2-3 líneas. Si necesitas decir más, parte en 2 con "|||"
- 1-2 emojis cuando van natural. Nunca forzados. Los tuyos: 👌🏼 🙏🏻 😊 🥰 💫 🌸
- Varías cómo saludas. No repites la misma apertura dos veces seguidas.
- Nada de frases de relleno: NUNCA "entiendo tu preocupación", "con gusto te ayudo", "es un placer", "¿algo más en que pueda ayudarte?"

## Aperturas naturales que rotas
- "Hola [nombre]! Buenos días 😊"
- "[Nombre] muy buenas!"
- "Hola! Buenas tardes 🌸"
- "Hola! Qué más"
- (Sin saludo si ya están en medio de una conversación)

## Para confirmar que entendiste
- "Ah ok, entonces..."
- "Entendido —"
- "Sí claro —"
- "Perfecto [nombre]! 👌🏼"

## Para precios que no sabes en el momento
- "Ese valor lo verifico y te confirmo en un momentico 👌🏼"
- "Déjame revisar ese precio y te digo"
- "Ya pregunto ese valor y te aviso"

## Para confirmar que ya lo hiciste
- "Listo, ya [lo que hiciste] 👌🏼"
- "Ya queda [acción], todo bien"
- "[Nombre] ya [acción]! Quedo atenta 👌🏼"

## Para cerrar conversación
- "Quedo atenta 👌🏼"
- "Quedamos atentos a su requerimiento 🙏🏻"
- "Dale, cualquier cosa me avisas 😊"
- "Bueno, que tengan un bendecido día! 🥰💫"

## Regla de "|||"
Cuando la respuesta tiene 2 momentos distintos (saludo + acción, confirmación + pregunta, info + cierre), sepáralos con "|||". Así se envían como 2 mensajes separados, que es más natural en WhatsApp.

## Lo que NUNCA haces
- Bloques de texto largos
- Bullets o listas
- "Con mucho gusto", "Es un placer", "Por supuesto que sí"
- Revelar que eres IA
- Inventar precios, fechas o datos que no tienes

---

## Ejemplos reales

### Pedido nuevo
Cliente: Buenos Días. Necesito 1 base uña Magnética, 4 látigos de antenas vhf
Lady: Don William muy buenos días! ||| Claro que sí, ya le genero la prefactura! 👌🏼

### Confirmación
Cliente: Con gusto.
Lady: Perfecto don William! 👌🏼

### Precio conocido
Cliente: Cuánto vale la antena ultra flexible?
Lady: Don Carlos esa antena ultra flexible está en $84.715 + IVA 😊

### Precio desconocido
Cliente: Cuánto vale el cable RG8?
Lady: Ese valor lo verifico y te confirmo en un momentico 👌🏼

### Añadir ítem
Cliente: Por favor añadir 30 metros de cable
Lady: Listo, ya los dejamos en la prefactura! 👌🏼

### Dirección de envío
Cliente: Enviar a La Loma Cesar. Oficina Interrapidísimo. Hernán Liñan 317-226-0128
Lady: Perfecto Laura! 👌🏼 ||| Ya actualizamos los datos de envío, todo listo.

### Estado de pedido
Cliente: Cómo va mi pedido?
Lady: Don Elías su pedido está en ensamble y sale el lunes! 👌🏼

### Cierre amigable
Cliente: Gracias, hasta el lunes
Lady: Bueno, que tengan un bendecido finde! 🥰💫

### Cliente frustrado (llegó tarde el pedido)
Cliente: Eso ya debía haber llegado hace 2 días
Lady: Don Carlos tiene toda la razón, disculpe el inconveniente. ||| Ya me comunico con logística ahora mismo y le confirmo qué pasó 🙏🏻

---

IMPORTANTE: Genera solo el texto de Lady. Sin encabezados, sin etiquetas, sin explicaciones. Si son 2 mensajes naturales, sepáralos con "|||". Nunca más de 2 partes.`;

// ─── Helpers ──────────────────────────────────────────────────

function evolHeaders() {
  return { 'Content-Type': 'application/json', apikey: EVOL_KEY };
}

async function callOpenRouter(systemPrompt: string, userContent: string): Promise<string> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error('OPENROUTER_API_KEY no configurada');
  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      temperature: 0.78,
      max_tokens: 350,
    }),
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}`);
  const data = await res.json() as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content?.trim() ?? '';
}

/** Resolve JID → clean phone number for Evolution API */
function jidToNumber(jid: string): string {
  return jid.replace(/@.+$/, '').replace(/:\d+$/, '');
}

/** Classify message type from Evolution webhook data */
function parseEvolutionMessage(data: Record<string, unknown>): {
  type: string;
  text: string;
  mediaUrl?: string;
  mimeType?: string;
  fileName?: string;
} {
  const msg = data.message as Record<string, unknown> | undefined;
  if (!msg) return { type: 'text', text: '' };

  if (msg.conversation)
    return { type: 'text', text: String(msg.conversation) };
  if (msg.extendedTextMessage)
    return { type: 'text', text: String((msg.extendedTextMessage as Record<string, unknown>).text ?? '') };

  if (msg.imageMessage) {
    const im = msg.imageMessage as Record<string, unknown>;
    return { type: 'image', text: String(im.caption ?? ''), mimeType: String(im.mimetype ?? 'image/jpeg') };
  }
  if (msg.audioMessage) {
    const am = msg.audioMessage as Record<string, unknown>;
    return { type: 'audio', text: '', mimeType: String(am.mimetype ?? 'audio/ogg') };
  }
  if (msg.videoMessage) {
    const vm = msg.videoMessage as Record<string, unknown>;
    return { type: 'video', text: String(vm.caption ?? ''), mimeType: String(vm.mimetype ?? 'video/mp4') };
  }
  if (msg.documentMessage) {
    const dm = msg.documentMessage as Record<string, unknown>;
    return { type: 'document', text: String(dm.title ?? dm.fileName ?? ''), mimeType: String(dm.mimetype ?? ''), fileName: String(dm.fileName ?? '') };
  }
  if (msg.stickerMessage)
    return { type: 'sticker', text: '' };

  return { type: 'text', text: '' };
}

/** Store / update chat + new message. Returns the saved message. */
async function upsertChatAndMessage(params: {
  jid: string;
  number: string;
  pushName?: string;
  type: 'contacto' | 'grupo';
  remoteId?: string;
  fromMe: boolean;
  sender?: string;
  msgType: string;
  text?: string;
  mediaUrl?: string;
  mimeType?: string;
  fileName?: string;
  rawMessage?: unknown;
  timestamp: Date;
}) {
  const labelText = params.text
    ? params.text.slice(0, 200)
    : params.msgType === 'image' ? '[imagen]'
    : params.msgType === 'audio' ? '[audio]'
    : params.msgType === 'video' ? '[video]'
    : params.msgType === 'document' ? `[doc: ${params.fileName ?? ''}]`
    : `[${params.msgType}]`;

  const chat = await prisma.whatsAppChat.upsert({
    where: { jid: params.jid },
    create: {
      jid: params.jid,
      number: params.number,
      pushName: params.pushName,
      type: params.type,
      unread: params.fromMe ? 0 : 1,
      lastText: labelText,
      lastAt: params.timestamp,
    },
    update: {
      pushName: params.pushName ?? undefined,
      lastText: labelText,
      lastAt: params.timestamp,
      unread: params.fromMe ? { set: 0 } : { increment: 1 },
    },
  });

  const deterministicId = params.remoteId ?? crypto
    .createHash('sha256')
    .update([
      params.jid,
      String(params.timestamp.getTime()),
      params.text ?? '',
    ].join('|'))
    .digest('hex')
    .substring(0, 32);

  const message = await prisma.whatsAppMessage.upsert({
    where: { remoteId: deterministicId },
    create: {
      remoteId: deterministicId,
      chatId: chat.id,
      fromMe: params.fromMe,
      sender: params.sender,
      type: params.msgType,
      text: params.text,
      mediaUrl: params.mediaUrl,
      mimeType: params.mimeType,
      fileName: params.fileName,
      rawMessage: params.rawMessage ? (params.rawMessage as object) : undefined,
      timestamp: params.timestamp,
    },
    update: {},
  });

  return { chat, message };
}

/** Generate AI suggestion and store it on the message */
async function generateAndStoreSuggestion(messageId: string, chatId: string, clientText: string) {
  try {
    const recent = await prisma.whatsAppMessage.findMany({
      where: { chatId },
      orderBy: { timestamp: 'desc' },
      take: 12,
    });
    recent.reverse();

    const chat = await prisma.whatsAppChat.findUnique({ where: { id: chatId } });
    const clientName = chat?.pushName ?? '';
    const history = recent
      .filter(m => m.text)
      .map(m => `${m.fromMe ? 'Lady' : 'Cliente'}: ${m.text}`)
      .join('\n');

    const prompt = `${clientName ? `El cliente se llama ${clientName}.\n` : ''}Historial reciente:\n${history}\n\nMensaje nuevo del cliente: "${clientText}"\n\nResponde como Lady:`;
    const suggestion = await callOpenRouter(LADY_PROMPT, prompt);

    if (suggestion) {
      await prisma.whatsAppMessage.update({
        where: { id: messageId },
        data: { aiSuggestion: suggestion },
      });
    }
  } catch {
    // non-blocking
  }
}

// ─── Split + send humanized messages via Evolution ────────────

/** Typing delay proportional to message length, like a real person */
function typingDelay(text: string): number {
  // ~50 chars/sec typing speed, with natural variation
  const base = Math.min(text.length * 40, 4000);
  const jitter = Math.random() * 600 - 300; // ±300ms
  return Math.max(800, base + jitter);
}

async function sendHumanizedText(number: string, text: string) {
  if (!EVOL_BASE) throw new Error('EVOLUTION_API_URL no configurada');

  const parts = text.split('|||').map(s => s.trim()).filter(Boolean);

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];

    // Simulate composing presence before each message
    await fetch(`${EVOL_BASE}/message/sendText/${EVOL_INST}`, {
      method: 'POST',
      headers: evolHeaders(),
      body: JSON.stringify({
        number,
        text: part,
        options: {
          delay: typingDelay(part),
          presence: 'composing',
        },
      }),
    });

    // Short pause between messages (feels natural, not robotic)
    if (i < parts.length - 1) {
      await new Promise(r => setTimeout(r, 600 + Math.random() * 400));
    }
  }
}

// ─── Import history from local export files ───────────────────

async function importFromExport() {
  const exportPath = process.env.WHATSAPP_EXPORT_PATH;
  if (!exportPath) return 0;
  const filePath = path.join(exportPath, 'mensajes_todos.json');
  if (!fs.existsSync(filePath)) return 0;

  const existing = await prisma.whatsAppMessage.count();
  if (existing > 0) return 0; // already imported

  const raw = fs.readFileSync(filePath, 'utf-8');
  const msgs = JSON.parse(raw) as Array<{
    chat_jid: string; chat_number: string; chat_name: string; chat_type: string;
    message_id: string; from_me: boolean; sender: string; timestamp: string;
    message_type: string; text: string;
  }>;

  let count = 0;
  for (const m of msgs) {
    try {
      const jid = m.chat_jid;
      const isGroup = m.chat_type === 'group' || jid.endsWith('@g.us');
      const msgType = m.message_type === 'conversation' ? 'text'
        : m.message_type === 'imageMessage' ? 'image'
        : m.message_type === 'audioMessage' ? 'audio'
        : m.message_type === 'videoMessage' ? 'video'
        : m.message_type === 'documentMessage' ? 'document'
        : 'other';
      const ts = new Date(m.timestamp);
      if (isNaN(ts.getTime())) continue;

      await upsertChatAndMessage({
        jid,
        number: m.chat_number,
        pushName: m.chat_name !== m.chat_number ? m.chat_name : undefined,
        type: isGroup ? 'grupo' : 'contacto',
        remoteId: m.message_id || undefined,
        fromMe: m.from_me,
        sender: m.sender,
        msgType,
        text: m.text || undefined,
        timestamp: ts,
      });
      count++;
    } catch { /* skip duplicates */ }
  }
  return count;
}

// Auto-import on startup (non-blocking)
importFromExport().then(n => { if (n > 0) console.log(`[WhatsApp] Importados ${n} mensajes del historial`); });

// ─── T4.2: Lead temperature classifier ───────────────────────

async function classifyAndUpdateLead(phoneNumber: string, messageText: string): Promise<void> {
  // Find client by WhatsApp number
  const client = await prisma.client.findFirst({
    where: { whatsapp: { contains: phoneNumber } },
    select: { id: true, name: true, optedOut: true },
  });
  if (!client) return;

  // Find active campaign recipient for this client
  const recipient = await prisma.campaignRecipient.findFirst({
    where: {
      clientId: client.id,
      status: { in: ['SCHEDULED', 'SENT', 'DELIVERED', 'READ'] },
      repliedAt: null, // idempotent: classify only once
    },
    include: { campaign: { select: { id: true, name: true, objective: true } } },
    orderBy: { createdAt: 'desc' },
  });
  if (!recipient) return;

  const result = await classifyLead(messageText, {
    campaignObjective: recipient.campaign.objective ?? undefined,
  });

  // Update recipient with temperature and repliedAt
  await prisma.campaignRecipient.update({
    where: { id: recipient.id },
    data: {
      temperature: result.temperature as never,
      repliedAt: new Date(),
      status: 'REPLIED',
    },
  });

  // Handle OPTOUT — mark client + cancel all drips
  if (result.temperature === 'OPTOUT') {
    await prisma.client.update({
      where: { id: client.id },
      data: { optedOut: true, optedOutAt: new Date(), optedOutReason: messageText.slice(0, 200) },
    });
    await cancelDripsForClient(client.id);
    return;
  }

  // HOT → notify + cancel any scheduled drips (no more automated follow-ups)
  if (result.temperature === 'HOT') {
    await notifyHotLead({
      clientId: client.id,
      clientName: client.name,
      campaignId: recipient.campaign.id,
      campaignName: recipient.campaign.name,
      recipientId: recipient.id,
      intent: result.intent,
    });
    await cancelDripsForClient(client.id);
    // Enroll in HOT_NOT_ATTENDED alert drip
    await enrollInDrip({
      trigger: 'HOT_NOT_ATTENDED_1H',
      clientId: client.id,
      campaignId: recipient.campaign.id,
    });
    return;
  }

  // WARM → enroll in 3-day reactivation drip
  if (result.temperature === 'WARM') {
    await enrollInDrip({
      trigger: 'WARM_NO_CONVERT_3D',
      clientId: client.id,
      campaignId: recipient.campaign.id,
    });
    return;
  }

  // COLD → enroll in 7-day follow-up drip
  if (result.temperature === 'COLD') {
    await enrollInDrip({
      trigger: 'COLD_FOLLOWUP_7D',
      clientId: client.id,
      campaignId: recipient.campaign.id,
    });
  }
}

// ─── PUBLIC: Webhook (no auth) ────────────────────────────────

router.post('/webhook', async (req: Request, res: Response) => {
  const secret = process.env.EVOLUTION_WEBHOOK_SECRET;
  if (secret) {
    const sig = (req.headers['x-evolution-signature'] || req.headers['x-hub-signature-256'] || '') as string;
    if (!sig) return res.status(401).json({ error: 'Firma de webhook requerida' });
    const expected = crypto.createHmac('sha256', secret).update(JSON.stringify(req.body)).digest('hex');
    if (sig !== `sha256=${expected}` && sig !== expected) {
      return res.status(401).json({ error: 'Firma de webhook inválida' });
    }
  }

  res.sendStatus(200); // respond immediately

  try {
    const body = req.body as Record<string, unknown>;
    if (body.event !== 'messages.upsert') return;

    const data = body.data as Record<string, unknown>;
    if (!data) return;

    const key = data.key as Record<string, unknown>;
    if (!key) return;

    const jid     = String(key.remoteJid ?? '');
    const fromMe  = Boolean(key.fromMe);
    const remoteId = String(key.id ?? '');
    const pushName = String(data.pushName ?? '');
    const ts      = new Date((Number(data.messageTimestamp) || 0) * 1000);
    const isGroup = jid.endsWith('@g.us');
    const number  = jidToNumber(jid);

    const parsed = parseEvolutionMessage(data);

    const { message } = await upsertChatAndMessage({
      jid,
      number,
      pushName: pushName || undefined,
      type: isGroup ? 'grupo' : 'contacto',
      remoteId,
      fromMe,
      sender: fromMe ? undefined : number,
      msgType: parsed.type,
      text: parsed.text || undefined,
      mediaUrl: parsed.mediaUrl,
      mimeType: parsed.mimeType,
      fileName: parsed.fileName,
      rawMessage: data,
      timestamp: ts,
    });

    // Auto-generate AI suggestion for client messages (non-blocking)
    if (!fromMe && parsed.type === 'text' && parsed.text) {
      const chatRecord = await prisma.whatsAppChat.findUnique({ where: { jid } });
      if (chatRecord) {
        generateAndStoreSuggestion(message.id, chatRecord.id, parsed.text);
      }

      // T4.2 — classify lead temperature if client is in an active campaign
      classifyAndUpdateLead(number, parsed.text).catch((e) =>
        console.error('[WhatsApp webhook] lead classify error:', e)
      );
    }
  } catch (err) {
    console.error('[WhatsApp webhook]', err);
  }
});

// ─── All remaining routes require auth ───────────────────────

router.use(authenticate);

// ─── GET /api/whatsapp/chats ──────────────────────────────────

router.get('/chats', async (_req: AuthRequest, res: Response) => {
  const chats = await prisma.whatsAppChat.findMany({
    orderBy: { lastAt: 'desc' },
  });

  const configured = !!(EVOL_BASE && EVOL_KEY) || !!(process.env.WHATSAPP_EXPORT_PATH);

  res.json({
    data: chats.map(c => ({
      id: c.id,
      jid: c.jid,
      number: c.number,
      name: c.pushName ?? c.number,
      type: c.type,
      unread: c.unread,
      lastMessage: c.lastText ?? '',
      lastTimestamp: c.lastAt?.toISOString() ?? new Date(0).toISOString(),
      fromMeLast: false,
      unanswered: c.unread > 0,
    })),
    total: chats.length,
    configured,
  });
});

// ─── GET /api/whatsapp/chats/:jid ─────────────────────────────

router.get('/chats/:jid', async (req: AuthRequest, res: Response) => {
  const { jid } = req.params;

  const chat = await prisma.whatsAppChat.findFirst({
    where: { OR: [{ jid }, { number: jid }] },
  });

  if (!chat) {
    res.status(404).json({ error: 'Chat no encontrado' });
    return;
  }

  const messages = await prisma.whatsAppMessage.findMany({
    where: { chatId: chat.id },
    orderBy: { timestamp: 'asc' },
  });

  res.json({
    chat: {
      id: chat.id,
      jid: chat.jid,
      number: chat.number,
      name: chat.pushName ?? chat.number,
      type: chat.type,
      unread: chat.unread,
    },
    messages: messages.map(m => ({
      id: m.id,
      remoteId: m.remoteId,
      fromMe: m.fromMe,
      sender: m.sender,
      type: m.type,
      text: m.text ?? '',
      mediaUrl: m.mediaUrl,
      mimeType: m.mimeType,
      fileName: m.fileName,
      timestamp: m.timestamp.toISOString(),
      aiSuggestion: m.aiSuggestion,
    })),
  });
});

// ─── PATCH /api/whatsapp/chats/:jid/read ─────────────────────

router.patch('/chats/:jid/read', async (req: AuthRequest, res: Response) => {
  await prisma.whatsAppChat.updateMany({
    where: { OR: [{ jid: req.params.jid }, { id: req.params.jid }] },
    data: { unread: 0 },
  });
  res.json({ ok: true });
});

// ─── POST /api/whatsapp/send ──────────────────────────────────

router.post('/send', async (req: AuthRequest, res: Response) => {
  const {
    jid,
    type = 'text',
    text,
    mediaBase64,
    mimeType,
    fileName,
    caption,
  } = req.body as {
    jid: string;
    type?: string;
    text?: string;
    mediaBase64?: string;
    mimeType?: string;
    fileName?: string;
    caption?: string;
  };

  if (!jid) { res.status(400).json({ error: 'jid requerido' }); return; }
  if (!EVOL_BASE) { res.status(503).json({ error: 'Evolution API no configurada' }); return; }

  const number = jidToNumber(jid);

  try {
    if (type === 'text') {
      if (!text?.trim()) { res.status(400).json({ error: 'text requerido' }); return; }
      await sendHumanizedText(number, text.trim());

      // Store sent messages in DB
      const chat = await prisma.whatsAppChat.findFirst({ where: { OR: [{ jid }, { number }] } });
      if (chat) {
        const parts = text.split('|||').map(s => s.trim()).filter(Boolean);
        for (const part of parts) {
          await prisma.whatsAppMessage.create({
            data: {
              chatId: chat.id,
              fromMe: true,
              type: 'text',
              text: part,
              timestamp: new Date(),
            },
          });
        }
        await prisma.whatsAppChat.update({
          where: { id: chat.id },
          data: { lastText: parts[parts.length - 1].slice(0, 200), lastAt: new Date(), unread: 0 },
        });
      }
    } else if (type === 'audio') {
      if (!mediaBase64) { res.status(400).json({ error: 'mediaBase64 requerido' }); return; }
      await fetch(`${EVOL_BASE}/message/sendWhatsAppAudio/${EVOL_INST}`, {
        method: 'POST',
        headers: evolHeaders(),
        body: JSON.stringify({ number, audio: mediaBase64, encoding: true }),
      });
      const chat = await prisma.whatsAppChat.findFirst({ where: { OR: [{ jid }, { number }] } });
      if (chat) {
        await prisma.whatsAppMessage.create({
          data: { chatId: chat.id, fromMe: true, type: 'audio', mimeType: 'audio/ogg', timestamp: new Date() },
        });
        await prisma.whatsAppChat.update({
          where: { id: chat.id },
          data: { lastText: '[audio]', lastAt: new Date(), unread: 0 },
        });
      }
    } else {
      // image / video / document
      if (!mediaBase64) { res.status(400).json({ error: 'mediaBase64 requerido' }); return; }
      const mediatype = type === 'image' ? 'image' : type === 'video' ? 'video' : 'document';
      await fetch(`${EVOL_BASE}/message/sendMedia/${EVOL_INST}`, {
        method: 'POST',
        headers: evolHeaders(),
        body: JSON.stringify({
          number,
          mediatype,
          mimetype: mimeType,
          caption: caption ?? '',
          media: mediaBase64,
          fileName: fileName ?? '',
        }),
      });
      const chat = await prisma.whatsAppChat.findFirst({ where: { OR: [{ jid }, { number }] } });
      if (chat) {
        const label = type === 'image' ? '[imagen]' : type === 'video' ? '[video]' : `[doc: ${fileName ?? ''}]`;
        await prisma.whatsAppMessage.create({
          data: {
            chatId: chat.id, fromMe: true, type,
            text: caption || undefined, mimeType, fileName,
            timestamp: new Date(),
          },
        });
        await prisma.whatsAppChat.update({
          where: { id: chat.id },
          data: { lastText: label, lastAt: new Date(), unread: 0 },
        });
      }
    }

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ─── GET /api/whatsapp/media/:messageId ──────────────────────

router.get('/media/:messageId', async (req: AuthRequest, res: Response) => {
  const msg = await prisma.whatsAppMessage.findUnique({
    where: { id: req.params.messageId },
  });

  if (!msg || !msg.rawMessage) {
    res.status(404).json({ error: 'Media no encontrado' });
    return;
  }

  if (!EVOL_BASE) { res.status(503).json({ error: 'Evolution API no configurada' }); return; }

  try {
    const result = await fetch(`${EVOL_BASE}/chat/getBase64FromMediaMessage/${EVOL_INST}`, {
      method: 'POST',
      headers: evolHeaders(),
      body: JSON.stringify({ message: msg.rawMessage }),
    });

    if (!result.ok) {
      res.status(502).json({ error: 'No se pudo obtener el media' });
      return;
    }

    const data = await result.json() as { base64?: string; mimetype?: string };
    if (!data.base64) { res.status(404).json({ error: 'Sin datos' }); return; }

    const mimeType = data.mimetype ?? msg.mimeType ?? 'application/octet-stream';
    const buf = Buffer.from(data.base64, 'base64');
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.send(buf);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ─── POST /api/whatsapp/suggest (manual) ─────────────────────

router.post('/suggest', async (req: AuthRequest, res: Response) => {
  const { newMessage, context, clientName, clientId } = req.body as {
    newMessage: string;
    context?: { role: 'cliente' | 'lady'; text: string }[];
    clientName?: string;
    clientId?: string;
  };

  if (!newMessage?.trim()) { res.status(400).json({ error: 'newMessage requerido' }); return; }

  try {
    const history = context?.slice(-12)
      .map(m => `${m.role === 'lady' ? 'Lady' : 'Cliente'}: ${m.text}`)
      .join('\n') ?? '';

    // T4.7 — inject campaign context if client is in an active campaign
    let campaignContext = '';
    let leadTemperature: string | null = null;
    if (clientId) {
      const activeRecipient = await prisma.campaignRecipient.findFirst({
        where: { clientId, status: { in: ['SENT', 'DELIVERED', 'READ', 'REPLIED'] } },
        include: { campaign: { select: { name: true, objective: true } } },
        orderBy: { createdAt: 'desc' },
      });
      if (activeRecipient) {
        leadTemperature = activeRecipient.temperature;
        campaignContext = `\n[CONTEXTO DE CAMPAÑA] Este cliente respondió a la campaña "${activeRecipient.campaign.name}"${activeRecipient.campaign.objective ? ` (objetivo: ${activeRecipient.campaign.objective})` : ''}. Su temperatura de lead es: ${activeRecipient.temperature ?? 'sin clasificar'}. ${activeRecipient.temperature === 'HOT' ? '¡LEAD CALIENTE — hay intención de compra! Ofrece cotización o siguiente paso concreto.' : ''}\n`;
      }
    }

    const prompt = `${clientName ? `El cliente se llama ${clientName}.\n` : ''}${campaignContext}${history ? `Historial:\n${history}\n\n` : ''}Mensaje nuevo del cliente: "${newMessage}"\n\nResponde como Lady:`;
    const suggestion = await callOpenRouter(LADY_PROMPT, prompt);
    res.json({ suggestion, leadTemperature });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ─── POST /api/whatsapp/import-history ───────────────────────

router.post('/import-history', async (_req: AuthRequest, res: Response) => {
  try {
    // force re-import even if records exist
    const exportPath = process.env.WHATSAPP_EXPORT_PATH;
    if (!exportPath) { res.status(400).json({ error: 'WHATSAPP_EXPORT_PATH no configurada' }); return; }
    const filePath = path.join(exportPath, 'mensajes_todos.json');
    if (!fs.existsSync(filePath)) { res.status(404).json({ error: 'Archivo no encontrado' }); return; }

    const raw = fs.readFileSync(filePath, 'utf-8');
    const msgs = JSON.parse(raw) as Array<{
      chat_jid: string; chat_number: string; chat_name: string; chat_type: string;
      message_id: string; from_me: boolean; sender: string; timestamp: string;
      message_type: string; text: string;
    }>;

    let count = 0;
    for (const m of msgs) {
      try {
        const jid = m.chat_jid;
        const isGroup = m.chat_type === 'group' || jid.endsWith('@g.us');
        const msgType = m.message_type === 'conversation' ? 'text'
          : m.message_type.replace('Message', '');
        const ts = new Date(m.timestamp);
        if (isNaN(ts.getTime())) continue;

        await upsertChatAndMessage({
          jid,
          number: m.chat_number,
          pushName: m.chat_name !== m.chat_number ? m.chat_name : undefined,
          type: isGroup ? 'grupo' : 'contacto',
          remoteId: m.message_id || undefined,
          fromMe: m.from_me,
          sender: m.sender,
          msgType,
          text: m.text || undefined,
          timestamp: ts,
        });
        count++;
      } catch { /* skip duplicates */ }
    }

    res.json({ imported: count });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ─── POST /api/whatsapp/configure-webhook ────────────────────

router.post('/configure-webhook', async (req: AuthRequest, res: Response) => {
  const { webhookUrl } = req.body as { webhookUrl: string };
  if (!webhookUrl || !EVOL_BASE) {
    res.status(400).json({ error: 'webhookUrl y EVOLUTION_API_URL requeridos' });
    return;
  }

  const result = await fetch(`${EVOL_BASE}/webhook/set/${EVOL_INST}`, {
    method: 'POST',
    headers: evolHeaders(),
    body: JSON.stringify({
      url: webhookUrl,
      webhook_by_events: true,
      events: ['messages.upsert', 'messages.update'],
    }),
  });

  const data = await result.json();
  res.json(data);
});

export default router;
