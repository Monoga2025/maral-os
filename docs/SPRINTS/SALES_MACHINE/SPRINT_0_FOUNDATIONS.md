# Sprint 0 — Fundamentos de datos

**Duración estimada:** 1–2 días
**Prioridad:** BLOQUEANTE (sin esto los sprints siguientes no arrancan)
**Estado:** PLANIFICADO

## Objetivo de negocio

Tener la base de datos lista para responder en <200ms a preguntas como:
- "¿Qué clientes compraron dipolos VHF en los últimos 24 meses?"
- "¿Cuáles son clientes Importadores (IM) de Bogotá con pedido hace más de 6 meses?"
- "¿A quién NO debo contactar (opt-out)?"

Sin esto, Sprint 1 no puede segmentar y se envía a ciegas.

## Criterios de éxito

- [ ] 100% de los 1,384 clientes tienen al menos un tag de interés o la marca "sin histórico"
- [ ] 100% de los clientes tienen segmento (IM/DS/CF) o `null` explícito
- [ ] Query de segmentación corre en <500ms
- [ ] Tabla de opt-outs creada y poblada con exclusiones conocidas

---

## Tareas

### T0.1 — Extensión del schema Prisma

**Archivos a modificar:** `backend/prisma/schema.prisma`

Agregar a `Client`:
```
tags           String[]    @default([])
segment        CustomerSegment?   // enum IM | DS | CF
interestTags   String[]    @default([])  // ["VHF", "UHF", "CABLE", "BASE", "RADIO"]
lifetimeValue  Decimal?    @db.Decimal(15,2)
lastOrderAt    DateTime?
optedOut       Boolean     @default(false)
optedOutAt     DateTime?
optedOutReason String?
```

Nuevo enum:
```
enum CustomerSegment {
  IM  // Importador — descuento 36%
  DS  // Distribuidor — descuento 26%
  CF  // Cliente Final — descuento 10%
}
```

Nuevos modelos:
```
model Campaign {
  id            String   @id @default(cuid())
  name          String
  objective     String?
  status        CampaignStatus @default(BORRADOR)
  createdById   String
  createdBy     User     @relation(...)
  audienceFilter Json?   // JSON con filtros aplicados
  startedAt     DateTime?
  completedAt   DateTime?
  createdAt     DateTime @default(now())
  steps         CampaignStep[]
  recipients    CampaignRecipient[]
  metrics       CampaignMetric?
}

model CampaignStep {
  id            String @id @default(cuid())
  campaignId    String
  campaign      Campaign @relation(...)
  order         Int
  type          StepType   // TEXT | IMAGE | VIDEO | AUDIO | DOCUMENT
  content       String?    // texto o caption con {variables}
  mediaUrl      String?
  mimeType      String?
  fileName      String?
  delaySeconds  Int   @default(10)   // delay antes de enviar este paso
}

model CampaignRecipient {
  id            String @id @default(cuid())
  campaignId    String
  campaign      Campaign @relation(...)
  clientId      String
  client        Client   @relation(...)
  status        RecipientStatus @default(PENDING)
  temperature   LeadTemperature?    // HOT | WARM | COLD | OPTOUT
  currentStep   Int @default(0)
  sentAt        DateTime?
  deliveredAt   DateTime?
  readAt        DateTime?
  repliedAt     DateTime?
  convertedAt   DateTime?
  quotationId   String?
  revenueCOP    Decimal? @db.Decimal(15,2)
  lastError     String?
  @@unique([campaignId, clientId])
}

model CampaignMetric {
  id         String @id @default(cuid())
  campaignId String @unique
  campaign   Campaign @relation(...)
  sent       Int @default(0)
  delivered  Int @default(0)
  read       Int @default(0)
  replied    Int @default(0)
  converted  Int @default(0)
  revenueCOP Decimal @default(0) @db.Decimal(15,2)
  updatedAt  DateTime @updatedAt
}

enum CampaignStatus { BORRADOR VALIDANDO LISTA EN_CURSO PAUSADA COMPLETADA CANCELADA }
enum StepType { TEXT IMAGE VIDEO AUDIO DOCUMENT }
enum RecipientStatus { PENDING SCHEDULED SENT DELIVERED READ REPLIED CONVERTED FAILED EXCLUDED }
enum LeadTemperature { HOT WARM COLD OPTOUT OFFTOPIC }
```

**Acceptance:** `npm run db:push` aplica sin errores en local; el cliente Prisma regenerado compila.

### T0.2 — Migración de datos (backfill)

**Archivos nuevos:** `backend/scripts/backfill-campaigns.ts`

Script que:
1. Recorre los 1,384 clientes
2. Para cada uno, lee sus `orders.items.product` históricos
3. Infiere `interestTags` por nombre del producto:
   - Contiene "VHF" → tag "VHF"
   - Contiene "UHF" → tag "UHF"
   - Contiene "CABLE" → tag "CABLE"
   - Contiene "BASE" → tag "BASE"
   - Contiene "DIPOLO" → tag "DIPOLO"
4. Calcula `lastOrderAt` y `lifetimeValue` (suma total histórica)
5. Si el cliente ya tiene `merlinCode`, cruza con categoría Merlin para asignar `segment`
6. Sin histórico → tag "PROSPECTO"

**Acceptance:** Ejecutar `npm run backfill:campaigns` actualiza todos los clientes sin borrar nada existente. Idempotente.

### T0.3 — Tabla de opt-outs pre-poblada

**Archivos nuevos:** `backend/scripts/seed-optouts.ts`

- Consultar a John qué clientes históricamente pidieron no ser contactados
- Marcarlos con `optedOut = true`, `optedOutReason = "histórico pre-MARAL OS"`
- Si no se tiene info, dejar la tabla vacía (empezamos limpios)

**Acceptance:** Query `SELECT COUNT(*) FROM Client WHERE optedOut = true` devuelve >0 si hay exclusiones conocidas.

### T0.4 — Variables dinámicas — helper

**Archivos nuevos:** `backend/src/lib/campaign-vars.ts`

Función `renderVariables(template: string, client: Client): string` que reemplaza:
- `{nombre}` → `client.name`
- `{primerNombre}` → `client.name.split(' ')[0]`
- `{ciudad}` → `client.city ?? ''`
- `{ultimaCompra}` → formato relativo ("hace 3 meses")
- `{descuentoCategoria}` → según `segment` (36% / 26% / 10%)
- `{vendedor}` → nombre del vendedor asignado

**Acceptance:** Tests unitarios pasan con 5 casos cubiertos (happy path + cliente sin ciudad + sin segmento + sin última compra + sin vendedor).

### T0.5 — Índices de performance

**Archivos a modificar:** `backend/prisma/schema.prisma`

Agregar índices en:
- `Client.interestTags` (GIN para arrays)
- `Client.segment`
- `Client.lastOrderAt`
- `Client.optedOut`
- `CampaignRecipient.status`
- `CampaignRecipient.temperature`

**Acceptance:** `EXPLAIN ANALYZE` en queries típicas muestra uso de índice.

---

## Dependencias

Ninguna externa. Todo se hace local.

## Entregables finales

- Schema Prisma extendido y en producción (EasyPanel)
- Scripts de backfill corridos
- Helper de variables con tests
- Documento de segmentos actualizado en `docs/DOMAIN_MODEL.md`

## Handoff a Sprint 1

Al terminar Sprint 0, el dev de Sprint 1 recibe:
- Schema listo con modelos `Campaign*`
- 1,384 clientes tagueados y segmentados
- Helper de variables listo para usar en el composer
- Query de ejemplo documentada en `docs/MODULES/campaigns.md`
