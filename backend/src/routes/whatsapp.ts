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

## Lista de precios distribuidor — marzo 2026 (precios SIN IVA / CON IVA incluido)

### Antenas handy / portátil
501/502 Motorola-ICOM VHF: $12.408 / $14.765  |  531/532 Motorola-ICOM UHF: $12.408 / $14.765
503 Kenwood VHF: $15.405 / $18.331  |  533 Kenwood UHF: $15.405 / $18.331
503-H/504/504-H Hytera-Yaesu VHF: $18.312 / $21.791  |  533-H/534/534-H Hytera-Yaesu UHF: $18.312 / $21.791
505/509-V Mototrbo-Motorola XTS VHF: $27.528 / $32.758  |  535/539-U Mototrbo-XTS UHF: $27.528 / $32.758
Stubby Motorola-ICOM VHF (501-ST/502-ST): $12.408 / $14.765
Stubby Kenwood VHF (503-ST): $15.405 / $18.331
Stubby Hytera-Yaesu-Mototrbo VHF (503-H-ST/504-ST/505-ST): $16.314 / $19.413
Antena telescópica 5 elem (506): $47.448 / $56.463  |  Antena calibrable VHF Motorola (515-M): $14.685 / $17.476
Antena calibrable VHF Kenwood (515-K): $17.882 / $21.280  |  Hytera (515-H): $20.779 / $24.727

### Antenas móvil VHF
101 1/4 onda VHF: $23.377 / $27.818  |  102-2 1/4 onda gold: $36.763 / $43.748
102-2R 1/4 onda resorte lujo: $58.342 / $69.427  |  102-6FV látigo inox VHF: $84.715 / $100.811
103 Tipo Maxrad VHF 5/8 3dB: $49.300 / $58.667  |  103-R Maxrad resorte VHF: $74.925 / $89.161
106 Tipo Tram VHF 5/8 3dB: $49.300 / $58.667  |  106-R Tram resorte VHF: $74.925 / $89.161
104/104-1/104-2 Maxrad VHF caña L/M/C: $128.671 / $153.119  |  106C-L/M/C Tram VHF caña: $128.671 / $153.119

### Antenas móvil UHF
105 Maxrad UHF 7/8 5dB: $54.645 / $65.028  |  102-U Eco UHF gold: $51.848 / $61.699
105-R Maxrad resorte UHF: $79.720 / $94.867  |  108 Tram UHF 7/8: $54.645 / $65.028
108-R Tram resorte UHF: $79.720 / $94.867  |  111 Maxrad UHF 5/8 3dB: $44.955 / $53.496
102-2FU látigo inox UHF: $50.764 / $60.409

### Bases para antenas móviles
201 Base perforar 3/8: $14.734 / $17.534  |  205 Base perforar pin largo: $18.496 / $22.011
301 Base uña cromada: $29.396 / $34.981  |  301-3 Base pestaña cromada Atos: $32.602 / $38.797
302 Base uña plástica: $29.396 / $34.981  |  305 Base en L bus: $29.396 / $34.981
307 Base magnética estándar: $40.759 / $48.503  |  307-R Base magnética reforzada: $49.950 / $59.441
307-X Base magnética fuerza extrema: $88.911 / $105.804
315-1D Base con radiales VHF/UHF (cable directo): $77.123 / $91.776
315-1PL Base con radiales VHF/UHF (PL259): $88.611 / $105.447
309 Base pestaña giratoria 360°: $50.435 / $60.017  |  314-I Base agarre robusto: $75.724 / $90.112

### Accesorios
601 Látigo americano inox VHF: $21.713 / $25.839  |  602 Látigo UHF inox: $39.760 / $47.315
634 Resorte de lujo bobina 5/8: $25.874 / $30.790  |  620/621 OVNI (seguro robo): $22.747 / $27.069
603 Conector PL259 macho con reductor: $8.341 / $9.925  |  604 Mini UHF macho RG58: $4.710 / $5.605
606 PL259 ponchar RG58: $5.974 / $7.109  |  607 BNC macho RG58: $6.204 / $7.383

### Cables coaxiales
622-1 / 627-1 / 628-1 Cable RG-58 x 1mt: $4.958 / $5.900
RG8-V / RG213-V Cable RG8/RG213 x 1mt (multifilar): $13.986 / $16.643
LMAR400 Cable LMR400 x 1mt (unifilar): $13.172 / $15.675
HEL-HAN 1/2 Heliax Hansen 1/2 superflexible x 1mt: $19.277 / $22.940
622-152 Carreta RG-58 x 152mt: $710.400 / $845.376  |  627-305 Carreta RG-58 Welspec x 305mt: $1.420.800 / $1.690.752

### Kits antena + base
K-23/K-24 Antena 5/8 VHF + Uña cromada: $77.215 / $91.886
K-23B/K-24B Antena 5/8 VHF + Base perforar: $62.554 / $74.439
K-25 Antena 1/4 onda VHF + Uña cromada: $51.662 / $61.478
K-25B Antena 1/4 VHF + Base perforar: $37.371 / $44.471
K-28 Maxrad UHF + Uña cromada: $82.561 / $98.248
K 103-M Maxrad VHF + Base magnética 2en1: $123.580 / $147.060
K 105-M Maxrad UHF + Base magnética 2en1: $116.180 / $138.254
K-R7 Kit VHF 5/8 + radiales + 7mt RG-58 + PL259: $159.766 / $190.122

### Antenas estación base Estándar (garantía 2 años)
MR-805 Vela G-3 VHF (137-174MHz) 3dB: $140.822 / $167.578
MR-801-B/A Vela G-6 VHF 6dB: $218.670 / $260.217
MR-136/144/150 Vela G-7 Hustler VHF 7dB: $539.608 / $642.134
MR-810 Vehicular VHF con radiales: $126.392 / $150.406
MR-416-3 Yagi 3 elem fijos VHF 7.1dB: $218.300 / $259.777
MR-416-5 Yagi 5 elem VHF 9.2dB: $311.540 / $370.733
MR-416-7 Yagi 7 elem VHF 11dB: $410.700 / $488.733
MR-416T3 Yagi 3 elem tele VHF Maxrad: $347.726 / $413.794
MR-224 4 Dipolos VHF 6-9dB en línea: $1.443.000 / $1.717.170
MR-802 Vela G-7 UHF 6dB: $218.670 / $260.217
MR-430-3 Yagi 3 elem UHF 7.1dB: $254.930 / $303.367
MR-430-7 Yagi 7 elem UHF 11dB: $262.700 / $312.613
MR470-4 4 Dipolos UHF 9dB: $1.529.580 / $1.820.200
MR-800-6 Yagi 6 elem 806-896MHz: $165.760 / $197.254
MR-800-12 Yagi 12 elem 806-896MHz: $210.160 / $250.090
MR900-O Vela omni 900-1900MHz: $399.600 / $475.524

### Antenas estación base Premium (garantía 5 años)
P-805 Vela G-3 VHF: $172.568 / $205.356
P-801 Vela G-6 VHF: $250.342 / $297.907
P-136/144/150 Vela G-7 Hustler VHF: $580.900 / $691.271
P-416-3 Yagi 3 elem fijos VHF: $247.900 / $295.001
P-416-5 Yagi 5 elem VHF: $341.140 / $405.957
P-224 4 Dipolos VHF premium: $2.401.300 / $2.857.547
P-802 Vela G-7 UHF: $250.342 / $297.907
P-430-3 Yagi 3 elem UHF: $284.308 / $338.327
P470-4 4 Dipolos UHF premium: $1.898.840 / $2.259.620
P-800-6 Yagi 6 elem 800MHz: $184.260 / $219.269
P-900-O Vela omni 900MHz: $399.600 / $475.524

### Recubrimientos para antenas handy
561-563 VHF (Motorola/ICOM/Kenwood): $7.927 / $9.433
565-567 UHF (Motorola/ICOM/Kenwood): $7.927 / $9.433
571 DTR-620: $8.921 / $10.616
581 Servicio mantenimiento antena: $13.327 / $15.859

---

## Cómo usas los precios
- Si el cliente pregunta por un producto específico, busca en la lista y responde con precio DIST (sin IVA) y precio con IVA
- Ejemplo: "Don William esa antena Maxrad VHF 5/8 está en $49.300 sin IVA ($58.667 con IVA) 😊"
- Si necesitas confirmar precio o no está en la lista: "Ese valor lo verifico y te confirmo en un momentico 👌🏼"
- Para kits: menciona que incluye antena + base

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
    } else if (type === 'sticker') {
      if (!mediaBase64) { res.status(400).json({ error: 'mediaBase64 requerido' }); return; }
      await fetch(`${EVOL_BASE}/message/sendSticker/${EVOL_INST}`, {
        method: 'POST',
        headers: evolHeaders(),
        body: JSON.stringify({ number, sticker: mediaBase64 }),
      });
      const chat = await prisma.whatsAppChat.findFirst({ where: { OR: [{ jid }, { number }] } });
      if (chat) {
        await prisma.whatsAppMessage.create({
          data: { chatId: chat.id, fromMe: true, type: 'sticker', mimeType: 'image/webp', timestamp: new Date() },
        });
        await prisma.whatsAppChat.update({
          where: { id: chat.id },
          data: { lastText: '[sticker]', lastAt: new Date(), unread: 0 },
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

// ─── GET /api/whatsapp/profile-pic/:number ───────────────────

router.get('/profile-pic/:number', async (req: AuthRequest, res: Response) => {
  const { number } = req.params;
  if (!EVOL_BASE || !EVOL_KEY) { res.status(503).json({ error: 'Evolution no configurado' }); return; }
  try {
    const result = await fetch(
      `${EVOL_BASE}/chat/fetchProfilePictureUrl/${EVOL_INST}?number=${encodeURIComponent(number)}`,
      { headers: evolHeaders() },
    );
    if (!result.ok) { res.status(404).json({ error: 'No encontrado' }); return; }
    const data = await result.json() as { profilePictureUrl?: string };
    const picUrl = data.profilePictureUrl;
    if (!picUrl) { res.status(404).json({ error: 'Sin foto' }); return; }

    // Proxy the image so the frontend doesn't need to expose the Evolution API key
    const imgRes = await fetch(picUrl);
    if (!imgRes.ok) { res.status(404).json({ error: 'No se pudo obtener imagen' }); return; }
    const buf = Buffer.from(await imgRes.arrayBuffer());
    res.setHeader('Content-Type', imgRes.headers.get('content-type') ?? 'image/jpeg');
    res.setHeader('Cache-Control', 'private, max-age=86400');
    res.send(buf);
  } catch {
    res.status(404).end();
  }
});

// ─── POST /api/whatsapp/pre-quote ────────────────────────────

const PRE_QUOTE_PROMPT = `Eres un asistente de ventas de MARAL TECNOLOGÍA Y COMUNICACIONES. Analiza el historial de una conversación de WhatsApp y extrae la información de cotización.

Devuelve ÚNICAMENTE un JSON válido con esta estructura:
{
  "items": [
    { "description": "nombre del producto tal como lo pide el cliente", "qty": número, "unitPrice": número_o_null }
  ],
  "shippingAddress": "dirección de envío si la mencionaron, o null",
  "notes": "observaciones relevantes del pedido, o null",
  "clientPhone": "número telefónico del cliente sin prefijo país si se menciona, o null"
}

Reglas:
- Extrae SOLO los productos que el cliente pide comprar, no los que ya tienen o mencionan como referencia
- Si el cliente pide múltiples unidades, usa qty correctamente
- unitPrice: usa el precio si se menciona en el chat, de lo contrario null
- Incluye dirección de envío si la mencionan (Interrapidísimo, transportadora, ciudad destino, destinatario)
- Devuelve JSON puro sin markdown, sin explicaciones`;

router.post('/pre-quote', async (req: AuthRequest, res: Response) => {
  const { jid } = req.body as { jid: string };
  if (!jid?.trim()) { res.status(400).json({ error: 'jid requerido' }); return; }

  try {
    const chat = await prisma.whatsAppChat.findFirst({
      where: { OR: [{ jid }, { number: jid }] },
    });
    if (!chat) { res.status(404).json({ error: 'Chat no encontrado' }); return; }

    const messages = await prisma.whatsAppMessage.findMany({
      where: { chatId: chat.id, type: { in: ['text', 'other'] }, NOT: { text: null } },
      orderBy: { timestamp: 'desc' },
      take: 30,
    });
    messages.reverse();

    const history = messages
      .filter(m => m.text?.trim())
      .map(m => `${m.fromMe ? 'Lady' : 'Cliente'}: ${m.text}`)
      .join('\n');

    if (!history) {
      res.status(400).json({ error: 'No hay mensajes de texto en el chat' });
      return;
    }

    const rawJson = await callOpenRouter(
      PRE_QUOTE_PROMPT,
      `Cliente: ${chat.pushName ?? chat.number}\n\nConversación:\n${history}`,
    );

    let parsed: {
      items: { description: string; qty: number; unitPrice: number | null }[];
      shippingAddress: string | null;
      notes: string | null;
      clientPhone: string | null;
    };

    try {
      const clean = rawJson.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(clean);
    } catch {
      res.status(422).json({ error: 'No se pudo extraer información del chat', raw: rawJson });
      return;
    }

    if (!parsed.items?.length) {
      res.status(422).json({ error: 'No se detectaron productos en la conversación' });
      return;
    }

    // Look up client by phone number
    const phoneClean = chat.number.replace(/^57/, '').replace(/\D/g, '');
    const client = await prisma.client.findFirst({
      where: {
        OR: [
          { whatsapp: { contains: phoneClean } },
          { phone: { contains: phoneClean } },
        ],
      },
    });

    // Try to match products from DB
    const matchedItems: { productId: string; qty: number; unitPrice: number; description: string }[] = [];
    const unmatchedItems: { description: string; qty: number; unitPrice: number | null }[] = [];

    for (const item of parsed.items) {
      const keywords = item.description
        .split(/\s+/)
        .filter(w => w.length > 3)
        .slice(0, 4);

      let product = null;
      for (const kw of keywords) {
        product = await prisma.product.findFirst({
          where: {
            OR: [
              { name: { contains: kw, mode: 'insensitive' } },
              { reference: { contains: kw, mode: 'insensitive' } },
            ],
            active: true,
          },
        });
        if (product) break;
      }

      if (product) {
        matchedItems.push({
          productId: product.id,
          qty: item.qty ?? 1,
          unitPrice: item.unitPrice ?? product.priceList ?? 0,
          description: item.description,
        });
      } else {
        unmatchedItems.push(item);
      }
    }

    // Only create quotation if we have at least one matched item OR client exists with items
    if (!matchedItems.length && !client) {
      res.json({
        quotationId: null,
        parsed,
        clientFound: false,
        matchedItems,
        unmatchedItems,
        message: 'No se encontraron productos ni cliente en el sistema. Revisa manualmente.',
      });
      return;
    }

    if (!matchedItems.length) {
      res.json({
        quotationId: null,
        parsed,
        clientFound: !!client,
        clientId: client?.id,
        clientName: client?.name,
        matchedItems,
        unmatchedItems,
        message: 'Productos no encontrados en el catálogo. Crea la cotización manualmente.',
      });
      return;
    }

    if (!client) {
      res.json({
        quotationId: null,
        parsed,
        clientFound: false,
        matchedItems,
        unmatchedItems,
        message: 'Cliente no encontrado en el sistema. Asígnalo manualmente al crear la cotización.',
      });
      return;
    }

    // Resolve seller — use authenticated user or fall back to first GERENTE
    let sellerId = req.user?.userId ?? '';
    if (!sellerId) {
      const gerente = await prisma.user.findFirst({ where: { role: 'GERENTE' }, select: { id: true } });
      sellerId = gerente?.id ?? '';
    }
    if (!sellerId) { res.status(500).json({ error: 'No se encontró vendedor para asignar' }); return; }

    // Create the quotation
    const subtotal = matchedItems.reduce((s, i) => s + i.qty * i.unitPrice, 0);
    const quotation = await prisma.quotation.create({
      data: {
        clientId: client.id,
        sellerId,
        status: 'BORRADOR',
        validityDays: 15,
        paymentTerms: 'Contado',
        notes: [
          parsed.notes,
          unmatchedItems.length
            ? `Productos pendientes de agregar: ${unmatchedItems.map(i => `${i.qty}x ${i.description}`).join(', ')}`
            : null,
          `Generada desde WhatsApp — ${chat.pushName ?? chat.number}`,
        ].filter(Boolean).join('\n'),
        shippingAddress: parsed.shippingAddress ?? undefined,
        subtotal,
        tax: 0,
        total: subtotal,
        items: {
          create: matchedItems.map(i => ({
            productId: i.productId,
            qty: i.qty,
            unitPrice: i.unitPrice,
            discount: 0,
            subtotal: i.qty * i.unitPrice,
          })),
        },
      },
      select: { id: true, number: true },
    });

    res.json({
      quotationId: quotation.id,
      quotationNumber: quotation.number,
      clientFound: true,
      clientName: client.name,
      matchedItems,
      unmatchedItems,
      parsed,
    });
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

// ─── GET /api/whatsapp/chats/:jid/linked-client ───────────────

router.get('/chats/:jid/linked-client', async (req: AuthRequest, res: Response) => {
  const jid = decodeURIComponent(req.params.jid);
  try {
    const chat = await prisma.whatsAppChat.findFirst({
      where: { OR: [{ jid }, { number: jid }] },
    });
    if (!chat) { res.status(404).json({ client: null }); return; }

    const phoneClean = chat.number.replace(/^57/, '').replace(/\D/g, '');
    const phoneFull  = '57' + phoneClean;

    // 1) Match by phone/whatsapp field
    let client = await prisma.client.findFirst({
      where: {
        active: true,
        OR: [
          { whatsapp: { contains: phoneClean } },
          { whatsapp: { contains: phoneFull } },
          { phone:    { contains: phoneClean } },
        ],
      },
      select: { id: true, name: true, company: true, city: true, category: true, email: true, phone: true, whatsapp: true, tags: true, lifetimeValue: true, lastOrderAt: true },
    });

    // 2) Fallback: name similarity (split pushName into tokens)
    if (!client && chat.pushName) {
      const tokens = chat.pushName
        .split(/\s+/)
        .filter(t => t.length >= 3)
        .slice(0, 3);
      for (const token of tokens) {
        client = await prisma.client.findFirst({
          where: { active: true, name: { contains: token, mode: 'insensitive' } },
          select: { id: true, name: true, company: true, city: true, category: true, email: true, phone: true, whatsapp: true, tags: true, lifetimeValue: true, lastOrderAt: true },
        });
        if (client) break;
      }
    }

    if (!client) { res.json({ client: null }); return; }

    // Attach stats
    const orderCount = await prisma.order.count({ where: { clientId: client.id } });
    const quotationCount = await prisma.quotation.count({ where: { clientId: client.id } });

    res.json({ client: { ...client, orderCount, quotationCount } });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ─── GET /api/whatsapp/chats/:jid/media ──────────────────────

router.get('/chats/:jid/media', async (req: AuthRequest, res: Response) => {
  const jid = decodeURIComponent(req.params.jid);
  try {
    const chat = await prisma.whatsAppChat.findFirst({
      where: { OR: [{ jid }, { number: jid }] },
    });
    if (!chat) { res.status(404).json({ media: [] }); return; }

    const media = await prisma.whatsAppMessage.findMany({
      where: {
        chatId: chat.id,
        type: { in: ['image', 'document', 'video'] },
      },
      orderBy: { timestamp: 'desc' },
      take: 50,
      select: { id: true, type: true, mimeType: true, fileName: true, timestamp: true, fromMe: true },
    });

    res.json({ media });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
