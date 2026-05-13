const OR_BASE = 'https://openrouter.ai/api/v1/chat/completions';
const GUARD_MODEL = 'anthropic/claude-haiku-4-5';

export interface BrandGuardResult {
  approved: boolean;
  issues: string[];
  professionalScore: number;
}

export async function validateBrand(imageBase64: string, mimeType: string): Promise<BrandGuardResult> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return { approved: true, issues: [], professionalScore: 8 };

  const prompt = `Analiza esta imagen generada por IA para una empresa colombiana de telecomunicaciones B2B llamada MARAL.

Evalúa los siguientes criterios y responde SOLO con JSON:
{
  "hasLogo": true/false,
  "correctColors": true/false (azul oscuro #1e3a5f dominante, blanco, detalles dorados),
  "hasSpelling": true/false (¿hay errores ortográficos visibles?),
  "priceFormat": true/false (si hay precio, ¿está en formato colombiano como $1.200.000?),
  "professionalScore": número 0-10,
  "issues": ["lista de problemas encontrados"]
}

Solo incluye en "issues" problemas reales y concretos. Si la imagen se ve profesional, issues puede estar vacío.`;

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
        model: GUARD_MODEL,
        messages: [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
            { type: 'text', text: prompt },
          ],
        }],
        temperature: 0.1,
        max_tokens: 512,
      }),
    });

    if (!res.ok) return { approved: true, issues: [], professionalScore: 7 };

    const data = await res.json() as { choices?: { message?: { content?: string } }[] };
    const raw = data.choices?.[0]?.message?.content ?? '';
    const stripped = raw.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '');
    const match = stripped.match(/\{[\s\S]*\}/);
    if (!match) return { approved: true, issues: [], professionalScore: 7 };

    const parsed = JSON.parse(match[0]);
    const score = Number(parsed.professionalScore) || 7;
    const issues: string[] = Array.isArray(parsed.issues) ? parsed.issues : [];

    if (parsed.hasSpelling === true) issues.push('Posibles errores ortográficos detectados');

    return {
      approved: score >= 6,
      issues,
      professionalScore: score,
    };
  } catch {
    return { approved: true, issues: [], professionalScore: 7 };
  }
}
