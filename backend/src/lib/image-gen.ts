import fs from 'fs';
import path from 'path';

const OR_BASE = 'https://openrouter.ai/api/v1/chat/completions';
const IMAGE_MODEL = 'google/gemini-2.5-flash-image-preview';

const BRAND_RULES = `
REGLAS DE MARCA MARAL (obligatorias):
- Paleta de colores: azul oscuro #1e3a5f como predominante, blanco, detalles dorados
- Si hay logo en las imágenes de referencia, inclúyelo en la esquina superior derecha
- Tipografía sans-serif moderna, limpia
- Sin texto en inglés — todo en español
- Estilo B2B profesional, corporativo, no infantil ni colorido en exceso
- Resolución y calidad alta, aspecto de diseño gráfico profesional colombiano
`;

const TEMPLATE_PROMPTS: Record<string, string> = {
  promo:       'Composición tipo flyer de promoción con precio grande y destacado. Sensación de urgencia y oferta limitada. Fondo con gradiente azul corporativo.',
  comparativa: 'Diseño comparativo split screen: versión Estándar vs Premium lado a lado con tabla de diferencias visuales clara.',
  lanzamiento: 'Hero shot del producto centrado con especificaciones técnicas clave flotando alrededor. Estilo lanzamiento oficial de producto.',
  testimonial: 'Producto en primer plano + frase testimonial de cliente en caja de cita estilizada. Transmite confianza y credibilidad.',
  educativo:   'Infografía limpia y clara con exactamente 3 puntos clave numerados. Iconos simples, texto conciso, mucho espacio blanco.',
};

const ASPECT_SIZES: Record<string, string> = {
  '1:1':  '1024x1024',
  '4:5':  '896x1120',
  '16:9': '1344x768',
};

export type ImageTemplate = 'promo' | 'comparativa' | 'lanzamiento' | 'testimonial' | 'educativo';
export type AspectRatio = '1:1' | '4:5' | '16:9';

export interface GenerateImageParams {
  referenceImages?: string[];
  prompt: string;
  template?: ImageTemplate;
  aspectRatio?: AspectRatio;
  brandLock?: boolean;
  campaignId?: string;
}

export interface GenerateImageResult {
  base64: string;
  mimeType: string;
  filePath: string;
  fileUrl: string;
}

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function buildPrompt(params: GenerateImageParams): string {
  const parts: string[] = [];

  if (params.template && TEMPLATE_PROMPTS[params.template]) {
    parts.push(`TIPO DE DISEÑO: ${TEMPLATE_PROMPTS[params.template]}`);
  }

  parts.push(`INSTRUCCIONES DEL USUARIO: ${params.prompt}`);

  if (params.brandLock !== false) {
    parts.push(BRAND_RULES);
  }

  const size = ASPECT_SIZES[params.aspectRatio ?? '1:1'];
  parts.push(`Genera una imagen de ${size} píxeles. Responde SOLO con la imagen generada, sin texto adicional.`);

  return parts.join('\n\n');
}

function buildContent(params: GenerateImageParams): object[] {
  const content: object[] = [];

  if (params.referenceImages && params.referenceImages.length > 0) {
    for (const img of params.referenceImages.slice(0, 3)) {
      if (img.startsWith('data:')) {
        const match = img.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          content.push({
            type: 'image_url',
            image_url: { url: img },
          });
        }
      } else if (img.startsWith('http')) {
        content.push({
          type: 'image_url',
          image_url: { url: img },
        });
      }
    }
  }

  content.push({
    type: 'text',
    text: buildPrompt(params),
  });

  return content;
}

export async function generateCampaignImage(params: GenerateImageParams): Promise<GenerateImageResult> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error('OPENROUTER_API_KEY no configurada');

  const body = {
    model: IMAGE_MODEL,
    messages: [{ role: 'user', content: buildContent(params) }],
    temperature: 0.7,
    // Gemini image generation flag via OpenRouter
    response_format: { type: 'image' },
  };

  const res = await fetch(OR_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
      'HTTP-Referer': 'https://maral-os.app',
      'X-Title': 'MARAL OS',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter error ${res.status}: ${err.slice(0, 300)}`);
  }

  const data = await res.json() as {
    choices?: {
      message?: {
        content?: string | Array<{
          type: string;
          image_url?: { url: string };
          inlineData?: { mimeType: string; data: string };
        }>;
      };
    }[];
  };

  const choice = data.choices?.[0]?.message?.content;
  let base64 = '';
  let mimeType = 'image/png';

  if (Array.isArray(choice)) {
    for (const part of choice) {
      if (part.type === 'image_url' && part.image_url?.url) {
        const url = part.image_url.url;
        if (url.startsWith('data:')) {
          const match = url.match(/^data:([^;]+);base64,(.+)$/);
          if (match) {
            mimeType = match[1];
            base64 = match[2];
          }
        }
        break;
      }
      if (part.type === 'image' && (part as unknown as { data?: string }).data) {
        base64 = (part as unknown as { data: string }).data;
        break;
      }
      if (part.inlineData) {
        mimeType = part.inlineData.mimeType;
        base64 = part.inlineData.data;
        break;
      }
    }
  } else if (typeof choice === 'string' && choice.startsWith('data:')) {
    const match = choice.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      mimeType = match[1];
      base64 = match[2];
    }
  }

  if (!base64) {
    throw new Error('El modelo no devolvió una imagen. Revisa que el modelo soporte generación de imágenes.');
  }

  const uploadDir = process.env.UPLOAD_DIR || './uploads';
  const genDir = path.join(uploadDir, 'campaigns', 'generated');
  ensureDir(genDir);

  const ext = mimeType.split('/')[1] || 'png';
  const filename = `${Date.now()}-${params.campaignId ?? 'img'}.${ext}`;
  const filePath = path.join(genDir, filename);

  fs.writeFileSync(filePath, Buffer.from(base64, 'base64'));

  const fileUrl = `/uploads/campaigns/generated/${filename}`;

  return { base64, mimeType, filePath, fileUrl };
}
