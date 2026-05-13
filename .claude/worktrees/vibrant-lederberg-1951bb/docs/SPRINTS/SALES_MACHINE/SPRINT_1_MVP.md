# Sprint 1 — Arma de venta MVP

**Duración estimada:** 3–5 días
**Prioridad:** MÁXIMA — aprovechar ventana Syscom
**Depende de:** Sprint 0 completado
**Estado:** PLANIFICADO

## Objetivo de negocio

John lanza su **primera campaña de dipolos VHF** en la semana 1 a un subconjunto seleccionado de clientes. El sistema debe permitir:
- Crear una campaña con secuencia de 3–6 mensajes mezclando texto + imagen + PDF
- Segmentar destinatarios con filtros simples
- Enviar con pacing humano anti-ban
- Ver progreso en vivo
- Pausar / detener si algo sale mal

**NO incluye** IA asesora, Nano Banana ni conversión automática (eso va en Sprints 2–4). El foco es: **funcional, rápido, seguro.**

## Criterios de éxito

- [ ] John crea y dispara una campaña real a ≥50 clientes
- [ ] 0 números bloqueados por WhatsApp
- [ ] ≥90% de mensajes entregados
- [ ] Tasa de respuesta medible en el dashboard básico
- [ ] Kill switch detiene la cola en <5 segundos

---

## Tareas

### T1.1 — Backend: Rutas de campañas

**Archivos nuevos:** `backend/src/routes/campaigns.ts`

Endpoints:
- `GET /api/campaigns` — lista con filtros por estado, búsqueda por nombre
- `GET /api/campaigns/:id` — detalle con steps, recipients, metrics
- `POST /api/campaigns` — crear borrador
- `PUT /api/campaigns/:id` — actualizar borrador (nombre, objetivo)
- `DELETE /api/campaigns/:id` — solo si status = BORRADOR
- `POST /api/campaigns/:id/steps` — agregar paso (text/image/video/audio/document)
- `PUT /api/campaigns/:id/steps/:stepId` — editar paso
- `DELETE /api/campaigns/:id/steps/:stepId` — eliminar paso
- `POST /api/campaigns/:id/reorder-steps` — reordenar array de IDs
- `POST /api/campaigns/:id/audience` — body: `{filters: {...}}` → calcula y persiste recipients
- `GET /api/campaigns/:id/preview/:clientId` — renderiza la secuencia con variables aplicadas para ese cliente específico
- `POST /api/campaigns/:id/launch` — valida y pasa a estado EN_CURSO, encola envíos
- `POST /api/campaigns/:id/pause` — pausa cola
- `POST /api/campaigns/:id/resume` — reanuda
- `POST /api/campaigns/:id/cancel` — kill switch
- `GET /api/campaigns/:id/live` — stream/polling del progreso en vivo

Todas protegidas con `authenticate` + `authorize('GERENTE', 'VENTAS')`.

**Acceptance:** Postman/curl suite con los 14 endpoints, todos responden correctamente en local.

### T1.2 — Backend: Motor de envío con pacing humano

**Archivos nuevos:**
- `backend/src/lib/campaign-queue.ts` — cola de envíos
- `backend/src/lib/campaign-sender.ts` — worker que drena la cola
- `backend/src/lib/pacing.ts` — cálculo de delays

Diseño:
- Cola persistida en DB (tabla `CampaignRecipient` con status `SCHEDULED` + `scheduledAt`)
- Worker que cada 5 segundos busca recipients con `scheduledAt <= NOW()` y los envía
- Al enviar, reprograma el siguiente paso del mismo recipient con delay aleatorio
- Entre recipients diferentes, respeta "gap mínimo" configurable (default 8–25s)
- Cada 10 envíos consecutivos, inserta pausa de 60–180s
- Respeta ventana horaria (default 7am–10pm, zona horaria Colombia)
- Si Evolution API devuelve error 429 o 5xx → pausa cola 10 min y alerta

Anti-patterns explícitos:
- ❌ Nunca enviar a >300 contactos por día
- ❌ Nunca enviar el mismo texto exacto a >100 contactos sin variar alguna variable
- ❌ Nunca enviar entre 10pm–7am

**Acceptance:** Test de carga simulado con 50 recipients: todos se envían, tiempo total respeta pacing, 0 errores por rate-limit de Evolution.

### T1.3 — Backend: Consulta de audiencia con filtros

**Archivos nuevos:** `backend/src/lib/audience-query.ts`

Función `resolveAudience(filters: AudienceFilter): Promise<Client[]>` donde `AudienceFilter` soporta:
```
{
  segments?: ('IM'|'DS'|'CF')[],
  cities?: string[],
  interestTags?: string[],    // "al menos uno de"
  hasOrderedInLastMonths?: number | null,
  hasNotOrderedInLastMonths?: number | null,
  minLifetimeValue?: number,
  excludeActiveQuotations?: boolean,
  excludeActiveOrders?: boolean,
  excludeOptedOut?: boolean,   // default true
  excludeRecentCampaign?: number,   // últimos N días
}
```

Siempre aplica: `optedOut = false`, `whatsapp != null`.

**Acceptance:** Unit tests con 8 combinaciones cubriendo casos límite.

### T1.4 — Frontend: Página de campañas

**Archivos nuevos:** `frontend/src/pages/Campaigns.tsx`, rutas en `App.tsx`

Ruta: `/whatsapp/campanas` (dentro del layout de WhatsApp como segundo tab, junto a "Chats")

Vistas:
- **Lista** (`/whatsapp/campanas`) — tabla con: Nombre, Estado, Audiencia, Enviados, Respuestas, Creada, Acciones (ver / editar / eliminar)
- **Crear/Editar** (`/whatsapp/campanas/nueva`, `/whatsapp/campanas/:id/editar`) — el composer (T1.5)
- **Detalle en vivo** (`/whatsapp/campanas/:id`) — progreso + métricas + botón pausar/cancelar

### T1.5 — Frontend: Composer de campaña (el corazón)

**Archivos nuevos:** `frontend/src/components/campaigns/CampaignComposer.tsx` + subcomponentes

Layout en 3 columnas:

**Columna izquierda: Steps timeline**
- Lista de pasos verticales, arrastrables (drag-and-drop)
- Cada paso:
  - Selector tipo: Texto / Imagen / Video / Audio / PDF
  - Editor de contenido según tipo
  - Input de delay en segundos (default 10s)
- Botón "+ Agregar paso"

**Columna central: Preview WhatsApp**
- Emulación visual de un chat de WhatsApp mostrando cómo se verán los mensajes
- Selector "Preview para cliente: [dropdown]" — renderiza variables con datos reales de ese cliente
- Scroll automático al último paso editado

**Columna derecha: Audiencia + lanzar**
- Filtros (checkboxes y selectores):
  - Segmento: IM / DS / CF
  - Ciudades
  - Intereses (VHF / UHF / CABLE / BASE / DIPOLO / RADIO)
  - Clientes que compraron en los últimos X meses
  - Clientes que NO compraron en los últimos X meses
  - Excluir con cotización activa
  - Excluir con pedido activo
  - Excluir de campañas recientes (últimos X días)
- Contador en vivo: **"Vas a enviar a XX clientes"**
- Botón "Ver lista de destinatarios" → modal con tabla
- Botón **"Lanzar campaña"** (deshabilitado si audiencia = 0 o si hay steps inválidos)

**Variables disponibles** — chips clickeables que se insertan en el cursor:
`{nombre}` `{primerNombre}` `{ciudad}` `{ultimaCompra}` `{descuentoCategoria}` `{vendedor}`

### T1.6 — Frontend: Live view de campaña en curso

**Archivos nuevos:** `frontend/src/components/campaigns/CampaignLiveView.tsx`

- Progreso barra: X/Y enviados, porcentaje
- Tarjetas de métricas: Entregados / Leídos / Respondidos / Fallidos
- Tabla con últimos 20 recipients y su estado
- Botón rojo grande **"Pausar"** / **"Detener"**
- Polling cada 3s a `GET /api/campaigns/:id/live`

### T1.7 — Deduplicación y seguridad

Reglas automáticas que el motor respeta sin excepción:
- Un mismo `clientId` no puede estar en dos campañas activas al mismo tiempo
- Si durante una campaña el cliente responde algo → pausar su secuencia inmediatamente (no enviar los pasos siguientes) y alertar a Lady
- Si el cliente está marcado `optedOut = true` → nunca recibe, aunque esté en la audiencia filtrada
- Si el cliente tiene pedido activo (estado ≠ ENTREGADO/CANCELADO) y `excludeActiveOrders = true` → excluido

**Acceptance:** Tests de integración que simulan los 4 escenarios.

### T1.8 — Métricas básicas

**Archivos a modificar:** `backend/src/routes/campaigns.ts`, `backend/src/lib/campaign-sender.ts`

Al enviar, actualizar `CampaignMetric.sent++`
Al recibir ACK de Evolution API (delivered/read) → actualizar contadores
Cuando el webhook de WhatsApp detecta respuesta del cliente → marcar `repliedAt` en recipient + `CampaignMetric.replied++`

Dashboard mínimo en el detalle de la campaña:
- Sent / Delivered / Read / Replied con porcentajes
- Gráfica temporal simple (Recharts) de respuestas por hora

### T1.9 — Onboarding interactivo de John

**Archivos nuevos:** `frontend/src/tour/campaigns-tour.ts`

Tour de 5 pasos guiado la primera vez que John entra:
1. "Este es el composer — arrastra pasos aquí"
2. "Agrega un paso de imagen y súbela"
3. "Escribe el texto con variables como `{primerNombre}`"
4. "Filtra a quién mandarlo en el panel derecho"
5. "Haz clic en Lanzar y ve el progreso en vivo"

**Acceptance:** El tour aparece la primera vez y respeta el sistema de tours existente (`TourProvider`).

---

## Lo que queda fuera (explícito)

- ❌ IA asesora que sugiere copy (Sprint 2)
- ❌ Validación pre-envío con score (Sprint 2)
- ❌ Generación de imágenes con IA (Sprint 3)
- ❌ Clasificación de respuestas por temperatura (Sprint 4)
- ❌ A/B testing (Sprint 5)

## Entregables finales

- Módulo de campañas funcional end-to-end
- Motor de envío con pacing probado en stage
- Composer + audiencia + live view
- Documentación en `docs/MODULES/campaigns.md`
- Variables de entorno documentadas:
  - `CAMPAIGN_DAILY_LIMIT_PER_NUMBER` (default 300)
  - `CAMPAIGN_MIN_GAP_SECONDS` (default 8)
  - `CAMPAIGN_MAX_GAP_SECONDS` (default 25)
  - `CAMPAIGN_BATCH_SIZE` (default 10)
  - `CAMPAIGN_BATCH_PAUSE_SECONDS` (default 90)
  - `CAMPAIGN_QUIET_HOURS` (default "22-7")

## Handoff a Sprint 2

- Módulo funcional sin IA — Sprint 2 agrega el copiloto encima
- Ubicación de hooks para inyectar validación pre-envío identificada: endpoint `POST /api/campaigns/:id/launch`
- Ubicación del panel donde Marco vivirá: columna lateral colapsable en `CampaignComposer.tsx`
