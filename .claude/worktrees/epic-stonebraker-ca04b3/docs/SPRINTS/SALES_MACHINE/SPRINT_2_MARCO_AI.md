# Sprint 2 — Marco, el asesor de ventas IA

**Duración estimada:** 3–5 días
**Prioridad:** ALTA — multiplica el valor de Sprint 1
**Depende de:** Sprint 1 funcional
**Estado:** PLANIFICADO

## Objetivo de negocio

John no es marketer. Si le dejamos el composer vacío va a escribir campañas mediocres y quemar la base. Marco es el copiloto que:
- Le hace 3 preguntas estratégicas y genera una campaña completa lista
- Audita campañas antes de enviarlas (score + razones)
- Sugiere la audiencia óptima según el producto a vender
- Aprende de lo que funciona y lo que no

**Thesis:** Una campaña con Marco convierte ≥30% más que una campaña hecha sin IA.

## Criterios de éxito

- [ ] John genera una campaña completa (con Marco) en <5 minutos
- [ ] Marco detecta al menos 3 problemas comunes en campañas mal escritas (mensajes largos, emojis inapropiados, CTA débiles)
- [ ] Score de campaña se calcula automáticamente antes de lanzar
- [ ] Biblioteca de copys ganadores se alimenta con las 3 primeras campañas exitosas

---

## Tareas

### T2.1 — System prompt de Marco

**Archivos nuevos:** `backend/src/lib/marco-prompt.ts`

Personalidad Marco:
- Experto en ventas B2B Colombia, 15 años de experiencia
- Directo, tono "mentor que te dice la verdad sin rodeos"
- Conoce el catálogo MARAL (antenas, cables, bases, radios)
- Conoce la competencia (Syscom, Alcatel, otras)
- Español colombiano profesional (no tan casual como Lady)

Instrucciones duras:
- Nunca inventar precios ni fechas
- Si John dice algo ambiguo, preguntar UNA cosa específica antes de asumir
- Sus sugerencias deben caber en los límites de WhatsApp (≤3 oraciones por mensaje)
- Usar marcos probados: AIDA, PAS (Problema-Agitación-Solución), hook-value-CTA

Formato de respuesta obligatorio cuando genera campañas:
```json
{
  "steps": [
    { "order": 1, "type": "IMAGE", "suggestedPrompt": "...", "caption": "..." },
    { "order": 2, "type": "TEXT", "content": "...", "delaySeconds": 12 },
    ...
  ],
  "audienceSuggestion": {
    "filters": {...},
    "reasoning": "..."
  },
  "expectedMetrics": { "responseRate": "15-25%", "conversionRate": "8-12%" }
}
```

### T2.2 — Backend: Endpoint de conversación con Marco

**Archivos nuevos:** `backend/src/routes/marco.ts`

- `POST /api/marco/chat` — body: `{ campaignId?, message, conversationHistory }` → Marco responde y puede sugerir acciones (agregar step, cambiar audiencia, etc.)
- `POST /api/marco/generate-campaign` — body: `{ objective, context, productInfo }` → Marco genera la estructura completa JSON
- `POST /api/marco/audit-campaign/:id` — Marco audita una campaña existente y devuelve:
  ```json
  {
    "score": 82,
    "issues": [
      { "severity": "high", "step": 2, "message": "..." },
      ...
    ],
    "suggestions": [...],
    "estimatedPerformance": "..."
  }
  ```
- `POST /api/marco/suggest-audience` — body: `{ campaignId }` → analiza los steps y sugiere filtros óptimos

Modelo OpenRouter: `anthropic/claude-haiku-4-5` (rápido, barato, buena calidad para copy). Temperature 0.7.

### T2.3 — Frontend: Panel lateral de Marco

**Archivos nuevos:** `frontend/src/components/campaigns/MarcoPanel.tsx`

- Panel colapsable al lado derecho del composer (encima de la columna de audiencia)
- Header: avatar de Marco + nombre + estado ("Marco está aquí", "Marco pensando…")
- Conversación tipo chat (similar al ChatBot actual pero contextualizado)
- Botones rápidos arriba:
  - **"Genera una campaña nueva"** → wizard que pregunta: ¿qué producto?, ¿cuál es el contexto?, ¿quién es el cliente objetivo? → genera steps + audiencia
  - **"Audita mi campaña"** → muestra el score + issues inline en el composer
  - **"Sugiere audiencia"** → aplica los filtros sugeridos al panel derecho
- Chat libre para preguntar cosas ("¿qué precio pongo?", "¿cómo empiezo el mensaje?")

### T2.4 — Validador pre-envío (gate obligatorio)

**Archivos a modificar:** `backend/src/routes/campaigns.ts` — endpoint `POST /api/campaigns/:id/launch`

Antes de mover la campaña a `EN_CURSO`:
1. Correr `marco.auditCampaign(id)` automáticamente
2. Si `score < 60` → rechazar lanzamiento con el listado de issues
3. Si `60 ≤ score < 80` → permitir pero mostrar warning modal en el frontend ("Marco detectó X problemas. ¿Lanzar de todos modos?")
4. Si `score ≥ 80` → lanzar directo

Issues que Marco siempre detecta:
- Mensaje de texto >500 caracteres
- Más de 3 emojis en un solo mensaje
- Frases prohibidas: "oferta única", "¡¡no te lo pierdas!!", "PROMOCIÓN" en caps, "descuento increíble"
- Delay entre pasos <5s (parece bot)
- Primer mensaje sin saludo personalizado cuando hay `{primerNombre}` disponible
- CTA faltante en el último paso
- Variables mal escritas (`{Nombre}` en vez de `{nombre}`)

### T2.5 — Biblioteca de copys ganadores (memoria de Marco)

**Archivos nuevos:**
- Nuevo modelo `WinningCopy` en schema
- `backend/src/routes/winning-copies.ts`

```
model WinningCopy {
  id           String @id @default(cuid())
  scenario     String   // "lanzamiento" | "promo" | "recuperacion" | "competencia"
  productType  String?  // "VHF", "UHF", etc.
  hookText     String
  fullCampaign Json     // estructura de steps
  metrics      Json     // response rate, conversion rate real
  campaignId   String?  // referencia a la campaña original
  createdAt    DateTime @default(now())
}
```

Proceso:
- Cuando una campaña termina con >15% de response rate → Marco la sugiere guardar como "copy ganador"
- Al generar nueva campaña del mismo escenario + producto, Marco cita el copy ganador
- John puede marcar manualmente una campaña como "plantilla ganadora"

### T2.6 — Templates iniciales (cold start)

Marco necesita semilla para el primer mes. Pre-cargar 6 templates:

1. **Lanzamiento con urgencia competencia** (el caso Syscom-dipolos)
   - Hook: "Syscom está sin stock de dipolos VHF. Nosotros tenemos disponible entrega inmediata."
   - Valor: diferenciación premium vs standard, 5 años garantía
   - CTA: "¿Te cotizo para entrega esta semana?"

2. **Reactivación cliente inactivo 6+ meses**
   - Hook: "Hola {primerNombre}, hace tiempo no nos hablamos"
   - Valor: mostrar qué hay nuevo
   - CTA: "¿Te envío el catálogo actualizado?"

3. **Venta cruzada cliente activo**
   - Hook: personalizado según último pedido
   - Valor: producto complementario
   - CTA: "¿Lo sumamos a tu próximo pedido?"

4. **Promo de precio por categoría**
   - Hook: "{primerNombre}, como cliente {segmento} te aplica 36% de descuento"
   - Valor: cálculo del ahorro
   - CTA: "¿Aprovechas esta semana?"

5. **Educativo — diferenciación Standard vs Premium**
   - 3 mensajes educativos + 1 CTA suave
   - Sin presión comercial

6. **Seguimiento post-cotización no respondida**
   - Hook: "{primerNombre}, ¿pudiste revisar la cotización?"
   - Valor: aclarar dudas comunes
   - CTA: "¿Algo que quieras ajustar?"

**Archivos nuevos:** `backend/prisma/seeds/marco-templates.ts`

---

## Lo que queda fuera

- ❌ Generación de imágenes (Sprint 3)
- ❌ Clasificación automática de respuestas (Sprint 4)
- ❌ A/B testing automático (Sprint 5)

## Entregables finales

- System prompt Marco versionado
- Endpoints de IA funcionando con OpenRouter
- Panel de Marco integrado al composer
- Gate de validación pre-envío activo
- 6 templates iniciales pre-cargados
- Modelo de `WinningCopy` listo para aprender

## Handoff a Sprint 3

- Marco ya sabe pedir imágenes al sugerir steps (`suggestedPrompt` en el JSON)
- Sprint 3 implementa la generación real con Nano Banana usando esos prompts
