# Sprint 4 — Conversión y seguimiento

**Duración estimada:** 3–5 días
**Prioridad:** ALTA — cierra el loop dinero
**Depende de:** Sprint 1, 2 y 3 operativos
**Estado:** PLANIFICADO

## Objetivo de negocio

Hoy, aunque John dispare campañas brillantes (Sprint 1-3), el problema es que los leads calientes se pierden porque Lady no los prioriza o John no los ve a tiempo. Sprint 4 cierra el loop:

- Detecta automáticamente la **intención** del cliente cuando responde
- Clasifica el lead en **HOT / WARM / COLD / OPTOUT / OFFTOPIC**
- Prioriza los HOT para Lady/John (alerta proactiva)
- Secuencia goteo para WARM que aún no compran
- Cierra el ciclo enlazando campaña → cotización → pedido → revenue real

**Thesis:** 0% de leads HOT perdidos por >30 minutos. Revenue trazado a campaña específica.

## Criterios de éxito

- [ ] Cada respuesta a una campaña se clasifica en <5s
- [ ] Leads HOT disparan notificación a John + nota a Lady en ChatView
- [ ] Dashboard "Leads de campaña" muestra priorización clara
- [ ] Revenue de pedidos enlazado a `campaignId` de origen
- [ ] Drip de reactivación corre automático para COLD tras 72h

---

## Tareas

### T4.1 — Clasificador de intención (lead temperature)

**Archivos nuevos:** `backend/src/lib/lead-classifier.ts`

Función `classifyLead(message: string, context: { campaignId, clientHistory, step })`:

Usa Claude Haiku vía OpenRouter. Prompt estructurado:
- INPUT: mensaje del cliente + los 2 mensajes anteriores + contexto del producto de la campaña
- OUTPUT: JSON `{ temperature, confidence, intent, urgency, extractedData }`

Taxonomía:
- **HOT** — pide precio, cotización, "cuánto cuesta", "me interesa, cuándo lo tienen", "quiero uno"
- **WARM** — pregunta técnica, comparativa, "¿sirve para X?", "¿tienen otra referencia?"
- **COLD** — "después miro", "gracias", "interesante", respuesta neutra
- **OPTOUT** — "no me escribas más", "bórrame", "no estoy interesado"
- **OFFTOPIC** — no habla del producto, otro tema

`extractedData` intenta sacar:
- Cantidad solicitada (si la menciona)
- Producto específico (si diferente al ofrecido)
- Urgencia temporal ("esta semana", "antes del viernes")
- Ubicación de entrega mencionada

Cuando `temperature === 'OPTOUT'` → marcar `client.optedOut = true` automáticamente + excluir de todas las campañas activas.

### T4.2 — Trigger automático al recibir respuesta

**Archivos a modificar:** `backend/src/routes/whatsapp.ts` (webhook)

Al procesar un mensaje entrante en el webhook:
1. ¿El `jid` tiene `CampaignRecipient.status IN (SCHEDULED, SENT, DELIVERED, READ)`?
2. Si sí → clasificar con `classifyLead()`
3. Actualizar `CampaignRecipient.temperature`, `repliedAt`
4. Detener cualquier paso futuro de la secuencia para ese cliente (no enviar más)
5. Emitir evento interno (ver T4.3)

Hook idempotente: una misma respuesta se clasifica solo una vez.

### T4.3 — Sistema de notificaciones HOT

**Archivos nuevos:**
- `backend/src/lib/notifier.ts`
- `frontend/src/components/HotLeadsToast.tsx`

Cuando se detecta HOT:
1. Crear registro en `Notification` (modelo existente o nuevo si hace falta)
2. Push al frontend vía SSE/polling cada 15s en `/api/notifications`
3. Si `AlertConfig.pushToWhatsApp = true` → enviar mensaje al número interno de John: "🔥 HOT LEAD: {cliente} pide cotización de {producto} — campaña: {nombreCampaña}"

Frontend:
- Toast rojo en la esquina superior durante 15s
- Badge numérico en el tab "WhatsApp" con cantidad de HOT sin atender
- En `ChatView` de ese cliente, banner arriba: "Este cliente respondió a la campaña X y está caliente. Respóndele ya."

### T4.4 — Dashboard "Leads de campaña"

**Archivos nuevos:** `frontend/src/pages/CampaignLeads.tsx`

Ruta: `/whatsapp/leads` (tab dentro del layout WhatsApp).

Columnas tipo kanban:
- 🔥 HOT — orden por `repliedAt` desc (más reciente primero), máximo atención
- 🌡️ WARM — mismos pero menos urgentes
- ❄️ COLD — lista compacta
- 🚫 OPTOUT — registro de exclusiones (solo lectura)

Cada card muestra:
- Nombre del cliente + último mensaje (truncado)
- Nombre de la campaña
- Tiempo desde que respondió (live tick)
- Botones: **Abrir chat** / **Crear cotización** / **Marcar atendido**

Filtros:
- Por campaña
- Por vendedor asignado
- Por ciudad/segmento
- "Solo sin atender" (toggle)

### T4.5 — Cierre del loop: campaign → quotation → order → revenue

**Archivos a modificar:**
- `backend/src/routes/quotations.ts` — agregar campo `sourceCampaignId`
- `backend/src/routes/orders.ts` — agregar campo `sourceCampaignId`
- `backend/prisma/schema.prisma`

```
model Quotation {
  ...
  sourceCampaignId String?
  sourceCampaign   Campaign? @relation(...)
}

model Order {
  ...
  sourceCampaignId String?
  sourceCampaign   Campaign? @relation(...)
}
```

Flujo automático:
- Cuando se crea una cotización desde el botón "Crear cotización" en el dashboard de leads → auto-rellenar `sourceCampaignId` y `CampaignRecipient.quotationId`
- Cuando la cotización se convierte en pedido → propagar `sourceCampaignId`
- Cuando el pedido pasa a `ENTREGADO` → actualizar `CampaignRecipient.convertedAt` + `revenueCOP` + `CampaignMetric.converted++` y `revenueCOP += total`

Nueva vista en detalle de campaña:
- Sección **"Resultados reales"**: cotizaciones generadas, pedidos cerrados, revenue total, ROI (revenue vs costo estimado de IA + tiempo)

### T4.6 — Secuencia de goteo para WARM y COLD

**Archivos nuevos:**
- `backend/src/lib/drip-scheduler.ts`
- Modelo `DripSequence`

```
model DripSequence {
  id         String @id @default(cuid())
  trigger    String  // "WARM_NO_CONVERT_3D" | "COLD_FOLLOWUP_7D" | "HOT_NOT_ATTENDED_1H"
  steps      Json    // array de { delayHours, template, variables }
  active     Boolean @default(true)
}

model DripEnrollment {
  id             String @id @default(cuid())
  sequenceId     String
  clientId       String
  campaignId     String?
  currentStep    Int @default(0)
  nextSendAt     DateTime
  status         String  // ACTIVE | COMPLETED | CANCELLED
  createdAt      DateTime @default(now())
}
```

Drips pre-cargadas:
1. **WARM_NO_CONVERT_3D** — 3 días después de WARM sin cotización, Lady envía: "Hola {primerNombre}, te había escrito sobre {producto}. ¿Alguna duda que pueda aclararte?"
2. **COLD_FOLLOWUP_7D** — 7 días después de COLD, mensaje educativo sin presión
3. **HOT_NOT_ATTENDED_1H** — alerta interna para John/Lady si un HOT lleva 1h sin respuesta humana

Worker cron cada 10 minutos drena `DripEnrollment` con `nextSendAt <= NOW()`.

### T4.7 — Integración con Lady IA (contexto enriquecido)

**Archivos a modificar:** `backend/src/routes/whatsapp.ts` — `LADY_PROMPT` y `suggest` endpoint

Cuando Lady sugiere respuesta a un cliente que está en una campaña activa:
- Inyectar en el contexto: "Este cliente respondió a la campaña '{nombre}' sobre {producto}. Su temperatura es {HOT/WARM/COLD}. Intent detectado: {intent}."
- Si HOT y Lady sugiere respuesta, el botón **"Enviar ya"** queda destacado con badge "🔥 Lead caliente"

### T4.8 — Reporting CEO-level

**Archivos nuevos:** `frontend/src/pages/CampaignReports.tsx`

Ruta: `/reportes/campanas` (tab dentro de Reportes).

Gráficos:
- Funnel global: Enviados → Entregados → Leídos → Respondidos → HOT → Cotizados → Pedidos → Revenue
- Tabla comparativa por campaña: nombre, costo IA, revenue generado, ROI, response rate, conversion rate
- Top 5 productos con mejor conversión por campaña
- Top 5 horarios con mejor response rate
- Heatmap por segmento (IM/DS/CF) × tipo de hook

Export a CSV para junta directiva.

---

## Lo que queda fuera

- ❌ Predicción ML de probabilidad de compra (Sprint 5)
- ❌ A/B testing automático (Sprint 5)
- ❌ Integración con contabilidad DIAN (fuera de alcance)

## Entregables finales

- Clasificador de leads funcional con precisión ≥85%
- Dashboard de leads priorizado operativo
- Modelo de cierre de loop campaign → revenue real
- 3 drip sequences pre-cargadas
- Reporting CEO en `/reportes/campanas`

## Handoff a Sprint 5

- Tenemos data real de qué campañas funcionan y cuáles no
- Base de respuestas clasificadas lista para entrenar modelos
- Métricas de horario/segmento/template listas para optimización automática
