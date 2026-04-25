# Sprint 3 — Nano Banana (visuales IA)

**Duración estimada:** 3–5 días
**Prioridad:** MEDIA-ALTA — elimina dependencia de Canva
**Depende de:** Sprint 1 (composer) y Sprint 2 (Marco)
**Estado:** PLANIFICADO

## Objetivo de negocio

John diseña sus entregables en Canva y le quedan con el look "ochentero". Un entregable visualmente malo reduce la apertura y la credibilidad, queman la campaña desde el primer mensaje.

Nano Banana (Google Gemini 2.5 Flash Image vía OpenRouter) permite generar entregables profesionales a partir de:
- 2–3 imágenes de referencia (producto, logo, contexto)
- Un prompt de estilo + contenido
- Templates predefinidos por escenario

**Thesis:** Un entregable profesional sube la tasa de apertura visual ~20% y la percepción de marca (= más cierres).

## Criterios de éxito

- [ ] John genera un entregable en <2 minutos
- [ ] Los entregables respetan paleta MARAL (#1e3a5f) automáticamente
- [ ] Biblioteca de entregables reutilizables funciona
- [ ] 0 regeneraciones infinitas (cap de 5 intentos por generación)
- [ ] Costo por imagen medido y dentro del presupuesto

---

## Tareas

### T3.1 — Integración OpenRouter → Gemini 2.5 Flash Image

**Archivos nuevos:** `backend/src/lib/image-gen.ts`

Función `generateCampaignImage(params)`:
```
{
  referenceImages: string[],     // base64 o URLs
  prompt: string,
  template?: 'promo' | 'comparativa' | 'lanzamiento' | 'testimonial' | 'educativo',
  aspectRatio?: '1:1' | '4:5' | '16:9',
  brandLock: boolean   // default true → inyecta reglas de marca
}
```

Llama a OpenRouter con modelo `google/gemini-2.5-flash-image-preview`.

Cuando `brandLock = true`, el prompt final incluye:
- "Usa la paleta MARAL: azul oscuro #1e3a5f, blanco, detalles dorados"
- "Incluye el logo MARAL en la esquina superior derecha (usando la imagen de referencia del logo)"
- "Tipografía sans-serif moderna, sin comic sans ni fuentes decorativas"
- "Sin texto en inglés, todo en español"
- "Estilo B2B profesional, no infantil ni ochentero"

Guarda la imagen generada en `backend/uploads/campaigns/generated/` con nombre `{timestamp}-{campaignId}.png`.

### T3.2 — Backend: Endpoints de generación

**Archivos nuevos:** `backend/src/routes/image-gen.ts`

- `POST /api/image-gen/generate` — body con params, devuelve URL de la imagen
- `POST /api/image-gen/regenerate/:imageId` — regenera con el mismo prompt (+ seed variada)
- `POST /api/image-gen/variant/:imageId` — pide una variante con prompt adicional ("más colorida", "sin el precio")
- `GET /api/image-gen/library` — listado de imágenes generadas por el usuario
- `DELETE /api/image-gen/:imageId` — borrar de la biblioteca

Nuevo modelo:
```
model GeneratedImage {
  id             String @id @default(cuid())
  createdById    String
  createdBy      User @relation(...)
  url            String
  prompt         String
  template       String?
  referenceImages Json?  // array de URLs o IDs
  usedInCampaigns String[]  @default([])
  approvedByBrand Boolean @default(false)
  metadata       Json?
  createdAt      DateTime @default(now())
}
```

Rate limiting: máximo 20 generaciones/hora por usuario (anti-accidentes).

### T3.3 — Frontend: Editor de entregables IA

**Archivos nuevos:** `frontend/src/components/campaigns/ImageGenStudio.tsx`

Modal/panel que abre cuando John agrega un paso tipo IMAGE y hace clic en "Generar con IA".

Flujo:
1. **Subir referencias** — drop zone para 1–3 imágenes (producto, logo, contexto). Obligatorio mínimo 1.
2. **Elegir template** — cards visuales:
   - 🔥 Promo urgencia — composición con precio grande + stock limitado
   - ⚖️ Comparativa — split Standard vs Premium lado a lado
   - 🚀 Lanzamiento — hero shot + specs clave
   - 💬 Testimonial — producto + quote de cliente
   - 📚 Educativo — infografía simple con 3 puntos
3. **Prompt adicional** — textarea con placeholder de ejemplo: "Quiero que se vea potente, destacar los 5 años de garantía, mostrar el precio 2.327.300 grande"
4. **Aspect ratio** — botones 1:1 / 4:5 / 16:9
5. Botón **"Generar"** → loader con mensajes variados ("Diseñando…", "Aplicando marca MARAL…", "Casi listo…")
6. **Preview** — imagen generada grande
7. Botones: **Usar en la campaña** / **Regenerar** / **Pedir variante** / **Guardar en biblioteca**

### T3.4 — Brand Guard (validación automática)

**Archivos nuevos:** `backend/src/lib/brand-guard.ts`

Después de generar, correr un segundo llamado IA (Claude Haiku) que valida:
- ¿Tiene logo MARAL visible y legible?
- ¿Los colores predominantes están en paleta?
- ¿Hay errores ortográficos visibles?
- ¿El precio (si aparece) está en formato colombiano?
- ¿Se ve profesional (0–10)?

Devuelve `{ approved: boolean, issues: string[], professionalScore: number }`.

Si `professionalScore < 6` → mostrar warning al usuario antes de permitir usar la imagen.

### T3.5 — Biblioteca de entregables reutilizables

**Archivos nuevos:** `frontend/src/pages/ImageLibrary.tsx`

Ruta `/whatsapp/biblioteca` (tab dentro del layout WhatsApp).

- Grid de imágenes generadas
- Filtros por template, por campaña, por fecha
- Click → detalle + botón "Usar en nueva campaña"
- Botón "Pedir variante" que re-abre el studio con el prompt precargado

### T3.6 — Conexión con Marco

**Archivos a modificar:** `backend/src/routes/marco.ts`

Cuando Marco genera una campaña, sus steps de tipo IMAGE incluyen `suggestedPrompt`. Agregar botón en el composer "Generar esta imagen con Marco" que:
1. Abre el ImageGenStudio
2. Pre-rellena el prompt sugerido
3. Pre-selecciona el template correspondiente

### T3.7 — Control de costos

**Archivos nuevos:** `backend/src/lib/cost-tracker.ts`

- Registrar cada generación con costo estimado (según tarifa de OpenRouter)
- Dashboard en `/configuracion` para GERENTE: gasto total del mes en IA
- Alerta cuando se supere presupuesto configurable (`AI_MONTHLY_BUDGET_COP`, default 500.000 COP)

Nuevo modelo:
```
model AIUsageLog {
  id          String @id @default(cuid())
  userId      String
  operation   String  // "image-gen", "marco-chat", "lady-suggest", etc.
  model       String
  inputTokens Int?
  outputTokens Int?
  costUSD     Decimal? @db.Decimal(10,6)
  metadata    Json?
  createdAt   DateTime @default(now())
}
```

---

## Lo que queda fuera

- ❌ Generación de videos (fuera de scope)
- ❌ Animaciones / GIFs (fuera de scope)
- ❌ Edición manual tipo Photoshop (fuera de scope)

## Entregables finales

- Integración Gemini Image funcional
- Studio visual de generación
- Biblioteca de entregables
- Brand Guard automático
- Tracker de costos
- Documentación en `docs/MODULES/image-gen.md` con ejemplos de prompts efectivos

## Costos estimados (revisar antes de lanzar)

- Gemini 2.5 Flash Image: ~$0.04 USD por imagen (según tarifa actual OpenRouter)
- 100 generaciones/mes → ~$4 USD ≈ 16.000 COP/mes
- Presupuesto sugerido: 500.000 COP/mes (incluye Marco + Lady + imágenes combined)

## Handoff a Sprint 4

- Imágenes generadas se asocian a `CampaignStep` y se envían correctamente vía Evolution API
- Sprint 4 construye encima la capa de conversión y seguimiento
