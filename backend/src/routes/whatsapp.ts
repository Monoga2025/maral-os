import { Router, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
const OR_BASE     = 'https://openrouter.ai/api/v1/chat/completions';
const OR_MODEL    = 'google/gemini-2.0-flash-001';

// ─── WhatsApp export types ────────────────────────────────────

interface WaMessage {
  chat_jid: string;
  chat_number: string;
  chat_name: string;
  chat_type: string;
  message_id: string;
  from_me: boolean;
  sender: string;
  timestamp: string;
  message_type: string;
  text: string;
  local_file?: string;
  status?: string;
}

let _cachedMessages: WaMessage[] = [];
let _lastLoaded = 0;

function loadMessages(): WaMessage[] {
  const exportPath = process.env.WHATSAPP_EXPORT_PATH;
  if (!exportPath) return [];

  const filePath = path.join(exportPath, 'mensajes_todos.json');
  if (!fs.existsSync(filePath)) return [];

  const now = Date.now();
  if (now - _lastLoaded < 60_000 && _cachedMessages.length > 0) return _cachedMessages;

  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    _cachedMessages = JSON.parse(raw) as WaMessage[];
    _lastLoaded = now;
  } catch {
    // keep stale cache
  }
  return _cachedMessages;
}

// ─── Lady persona (built from real WhatsApp history) ──────────

const LADY_SYSTEM_PROMPT = `Eres Lady, asesora comercial de MARAL TECNOLOGÍA Y COMUNICACIONES S.A.S., empresa colombiana de ensamble y venta de equipos de telecomunicaciones (antenas, bases, cables, radios VHF/UHF).

Tu estilo en WhatsApp:
- Cálida, amable, directa y profesional
- Tratas de "Don" o "Doña" + nombre al cliente cuando lo conoces
- Mensajes cortos: máximo 2-3 oraciones, nunca listas ni bullets
- Emojis con moderación: 👌🏼 🙏🏻 ✨ 😊 🌺 🥰
- "Con gusto, ya..." para confirmar acción inmediata
- "Ya le confirmo..." cuando necesitas verificar internamente
- "Quedo atenta" para cerrar conversación
- Español colombiano casual — nunca corporativo ni formal
- Nunca dices "Entiendo tu preocupación" ni "es importante destacar"
- Para preguntas de precio que no sabes: "Ya le confirmo el valor en un momentico 👌🏼"

Ejemplos reales de tus mensajes:
- "Claro que sí, con gusto ya genero la prefactura! 👌🏼"
- "Don William por favor confirmar que esté correcta su prefactura, quedo atenta! 👌🏼"
- "Don Carlos esa antena tiene un valor de $84.715 + IVA"
- "Perfecto don Gabriel, esperemos a que le den respuesta! 👌🏼"
- "Con gusto, ya anexamos los 30 metros de cable! 👌🏼"
- "Que Dios te multiplique y te permita suplir todas tus necesidades! 😘🙏🏻✨"
- "Bueno quedamos atentos, que tengan un bendecido FDS! 🥰🙌🏼💫"

Genera UNA SOLA respuesta corta como Lady la escribiría en WhatsApp. Sin encabezados.`;

// ─── AI helper (Gemini direct → OpenRouter fallback) ─────────

async function callAI(systemPrompt: string, userContent: string): Promise<string> {
  const geminiKey = process.env.GOOGLE_AI_KEY;
  const orKey     = process.env.OPENROUTER_API_KEY;

  if (!geminiKey && !orKey) throw new Error('Configura GOOGLE_AI_KEY o OPENROUTER_API_KEY');

  // Try Gemini API first
  if (geminiKey) {
    const res = await fetch(`${GEMINI_BASE}?key=${geminiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userContent }] }],
        generationConfig: { temperature: 0.78, maxOutputTokens: 300 },
      }),
    });
    if (res.ok) {
      const data = await res.json() as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (text) return text;
    }
  }

  // Fallback: OpenRouter
  if (orKey) {
    const res = await fetch(OR_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${orKey}`,
        'HTTP-Referer': 'https://maral-os.app',
        'X-Title': 'MARAL OS',
      },
      body: JSON.stringify({
        model: OR_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        temperature: 0.78,
        max_tokens: 300,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenRouter ${res.status}: ${err.slice(0, 200)}`);
    }
    const data = await res.json() as {
      choices?: { message?: { content?: string } }[];
    };
    return data.choices?.[0]?.message?.content?.trim() ?? '';
  }

  throw new Error('Sin respuesta de IA');
}

// ─── Routes ──────────────────────────────────────────────────

// GET /api/whatsapp/chats
router.get('/chats', (_req: AuthRequest, res: Response) => {
  const msgs = loadMessages();

  const chatMap = new Map<string, {
    jid: string;
    number: string;
    name: string;
    type: string;
    messageCount: number;
    lastMessage: string;
    lastTimestamp: string;
    fromMeLast: boolean;
    unanswered: boolean;
  }>();

  for (const m of msgs) {
    const existing = chatMap.get(m.chat_jid);
    if (!existing) {
      chatMap.set(m.chat_jid, {
        jid: m.chat_jid,
        number: m.chat_number,
        name: m.chat_name,
        type: m.chat_type,
        messageCount: 1,
        lastMessage: m.text || `[${m.message_type}]`,
        lastTimestamp: m.timestamp,
        fromMeLast: m.from_me,
        unanswered: !m.from_me,
      });
    } else {
      existing.messageCount++;
      if (new Date(m.timestamp) > new Date(existing.lastTimestamp)) {
        existing.lastMessage = m.text || `[${m.message_type}]`;
        existing.lastTimestamp = m.timestamp;
        existing.fromMeLast = m.from_me;
        existing.unanswered = !m.from_me;
      }
    }
  }

  const chats = Array.from(chatMap.values())
    .sort((a, b) => new Date(b.lastTimestamp).getTime() - new Date(a.lastTimestamp).getTime());

  res.json({ data: chats, total: chats.length, configured: !!process.env.WHATSAPP_EXPORT_PATH });
});

// GET /api/whatsapp/chats/:number
router.get('/chats/:number', (req: AuthRequest, res: Response) => {
  const msgs = loadMessages();
  const { number } = req.params;

  const thread = msgs
    .filter(m => m.chat_number === number || m.chat_jid.startsWith(number))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  if (thread.length === 0) {
    res.status(404).json({ error: 'Chat no encontrado' });
    return;
  }

  const chatInfo = {
    jid: thread[0].chat_jid,
    number: thread[0].chat_number,
    name: thread[0].chat_name,
    type: thread[0].chat_type,
  };

  res.json({ chat: chatInfo, messages: thread });
});

// POST /api/whatsapp/suggest
router.post('/suggest', async (req: AuthRequest, res: Response) => {
  const { newMessage, context, clientName } = req.body as {
    newMessage: string;
    context?: { role: 'cliente' | 'lady'; text: string }[];
    clientName?: string;
  };

  if (!newMessage?.trim()) {
    res.status(400).json({ error: 'newMessage es requerido' });
    return;
  }

  try {
    let contextStr = '';
    if (context && context.length > 0) {
      const recent = context.slice(-10);
      contextStr = '\nHistorial de la conversación:\n' + recent
        .map(m => `${m.role === 'lady' ? 'Lady' : 'Cliente'}: ${m.text}`)
        .join('\n');
    }

    const clientLabel = clientName && clientName !== 'Sin nombre'
      ? `El cliente se llama ${clientName}.`
      : '';

    const userContent = `${clientLabel}${contextStr}

Mensaje nuevo del cliente: "${newMessage}"

Responde como Lady respondería en WhatsApp:`;

    const suggestion = await callAI(LADY_SYSTEM_PROMPT, userContent);
    res.json({ suggestion });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.includes('GOOGLE_AI_KEY') || msg.includes('OPENROUTER')) {
      res.status(503).json({ error: 'IA no disponible — configura GOOGLE_AI_KEY' });
    } else {
      res.status(500).json({ error: msg });
    }
  }
});

export default router;
