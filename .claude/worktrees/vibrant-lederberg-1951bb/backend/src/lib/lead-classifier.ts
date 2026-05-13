const OR_BASE  = 'https://openrouter.ai/api/v1/chat/completions';
const OR_MODEL = 'anthropic/claude-haiku-4-5';

export type LeadTemperature = 'HOT' | 'WARM' | 'COLD' | 'OPTOUT' | 'OFFTOPIC';

export interface LeadClassification {
  temperature:   LeadTemperature;
  confidence:    number;          // 0-1
  intent:        string;
  urgency:       string | null;
  extractedData: {
    qty?:          number;
    product?:      string;
    urgencyTime?:  string;
    deliveryCity?: string;
  };
}

const SYSTEM_PROMPT = `Eres un clasificador de intención comercial B2B para MARAL TECNOLOGÍA Y COMUNICACIONES (electrónica de telecomunicaciones colombiana).

Clasifica el mensaje del cliente en UNA de estas categorías:
- HOT: pide precio, cotización, "¿cuánto cuesta?", "me interesa, ¿cuándo lo tienen?", "quiero uno/varios", urgencia clara de compra
- WARM: pregunta técnica, comparativa, "¿sirve para X?", "¿tienen otra referencia?", interés pero sin intención inmediata
- COLD: "después miro", "gracias", "interesante", respuesta neutra, sin intención clara
- OPTOUT: "no me escribas más", "bórrame", "no estoy interesado, por favor no insistas", quiere salir
- OFFTOPIC: no habla del producto o campaña, tema completamente diferente

Responde SOLO con JSON:
{
  "temperature": "HOT|WARM|COLD|OPTOUT|OFFTOPIC",
  "confidence": 0.0-1.0,
  "intent": "descripción corta de la intención en español (max 60 chars)",
  "urgency": "descripción de urgencia temporal si la hay o null",
  "extractedData": {
    "qty": número o null,
    "product": "nombre del producto específico mencionado o null",
    "urgencyTime": "esta semana / antes del viernes / etc. o null",
    "deliveryCity": "ciudad de entrega mencionada o null"
  }
}`;

export async function classifyLead(
  message: string,
  context?: { campaignObjective?: string; previousMessages?: string[] }
): Promise<LeadClassification> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    return {
      temperature: 'COLD',
      confidence: 0.5,
      intent: 'Sin clasificar (API key no configurada)',
      urgency: null,
      extractedData: {},
    };
  }

  const contextLines: string[] = [];
  if (context?.campaignObjective) {
    contextLines.push(`Contexto de la campaña: "${context.campaignObjective}"`);
  }
  if (context?.previousMessages?.length) {
    contextLines.push('Mensajes anteriores:');
    contextLines.push(...context.previousMessages.slice(-3).map((m, i) => `  ${i + 1}. ${m}`));
  }
  contextLines.push(`Mensaje a clasificar: "${message}"`);

  try {
    const res = await fetch(OR_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
        'HTTP-Referer': 'https://maral-os.app',
        'X-Title': 'MARAL OS',
      },
      body: JSON.stringify({
        model: OR_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: contextLines.join('\n') },
        ],
        temperature: 0.1,
        max_tokens: 300,
      }),
    });

    if (!res.ok) throw new Error(`OpenRouter ${res.status}`);

    const data = await res.json() as { choices?: { message?: { content?: string } }[] };
    const raw = data.choices?.[0]?.message?.content ?? '';
    const stripped = raw.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '');
    const match = stripped.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Invalid JSON response');

    const parsed = JSON.parse(match[0]) as LeadClassification;

    const validTemps: LeadTemperature[] = ['HOT', 'WARM', 'COLD', 'OPTOUT', 'OFFTOPIC'];
    if (!validTemps.includes(parsed.temperature)) parsed.temperature = 'COLD';
    parsed.confidence = Math.min(1, Math.max(0, Number(parsed.confidence) || 0.5));

    return parsed;
  } catch (err) {
    console.error('[lead-classifier] error:', (err as Error).message?.slice(0, 100));
    return {
      temperature: 'COLD',
      confidence: 0.3,
      intent: 'Error al clasificar',
      urgency: null,
      extractedData: {},
    };
  }
}
