# CLAUDE.md — Reglas permanentes para Claude Code

## Identidad del proyecto

**MARAL OS** es la plataforma de gestión empresarial de Maral Tecnología y Comunicaciones S.A.S., empresa familiar colombiana de ensamble y comercialización de equipos electrónicos B2B.

Este sistema es el sustento operativo de la empresa y de la familia que la sostiene. Cada mejora tiene impacto real en caja, operación y bienestar familiar. Trabaja con esa responsabilidad.

---

## Stack tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Frontend | React + TypeScript + Vite + Tailwind CSS | 18 / 5 / 5 |
| Estado | Zustand + React Query | — |
| Backend | Node.js + Express + TypeScript | — |
| ORM | Prisma | 5 |
| Base de datos | PostgreSQL | 16 |
| Deploy | EasyPanel (Docker Compose) | — |

### Estructura de carpetas

```
maral-os/
├── backend/
│   ├── src/
│   │   ├── index.ts              ← servidor Express + registro de rutas
│   │   ├── lib/jwt.ts            ← helpers JWT
│   │   ├── lib/prisma.ts         ← instancia Prisma
│   │   ├── middleware/auth.ts    ← autenticación + autorización por rol
│   │   └── routes/              ← 16 rutas Express (ver mapa abajo)
│   ├── prisma/
│   │   ├── schema.prisma         ← modelos, enums, relaciones
│   │   └── seed.ts               ← datos de prueba
│   └── uploads/                 ← archivos subidos (imágenes de pedidos)
├── frontend/
│   └── src/
│       ├── App.tsx               ← definición de rutas React Router
│       ├── pages/               ← 19 páginas (ver mapa abajo)
│       ├── components/          ← ui/ (14 componentes), layout/, tour/
│       ├── lib/api.ts            ← todos los métodos HTTP al backend
│       ├── lib/utils.ts          ← helpers
│       ├── store/               ← auth.ts, ui.ts (Zustand)
│       └── types/index.ts       ← tipos TypeScript
├── docs/                        ← documentación del proyecto (ver abajo)
├── docker-compose.yml           ← servicios: postgres, backend, frontend
└── .claude/                     ← sistema QA multi-agente (ver sección final)
```

---

## Entornos

### Producción (EasyPanel)
- **URL:** https://monoga-frontend.psvi0v.easypanel.host
- **Deploy:** Docker Compose en EasyPanel — redeploy vía panel web
- **Login:** john@maral.com / maral2024
- **Estado actual:** Código desactualizado — `/api/users`, `/api/tasks`, `/api/expenses` dan 404. Pendiente redeploy con el código del QA 2026-04-01.
- **Datos:** 1.384 clientes y 283 productos en producción (importados de Merlin)

### Desarrollo local (SIN Docker)
**NO usar Docker** — consume demasiados recursos en el equipo de desarrollo.

PostgreSQL corre **nativamente** en Windows (instalado en `C:\Program Files\PostgreSQL\16`):
- Usuario: `maral` / Contraseña: `maral2024_cambiar_en_produccion`
- Base de datos: `maral_os`
- Puerto: `5432`
- Servicio Windows: `postgresql-x64-16`

```bash
# Terminal 1 — Backend (http://localhost:3001)
cd backend && npm run dev

# Terminal 2 — Frontend (http://localhost:5173)
cd frontend && npm run dev
```

> Si se pierde la contraseña del superusuario `postgres`: editar
> `C:\Program Files\PostgreSQL\16\data\pg_hba.conf`, cambiar `scram-sha-256` a `trust`,
> reiniciar el servicio como administrador (`Restart-Service postgresql-x64-16`),
> operar con psql, luego revertir el archivo y reiniciar de nuevo.

### Base de datos (Prisma)

```bash
cd backend

# Aplicar cambios del schema a la DB (sin migración, para desarrollo)
npm run db:push

# Crear y aplicar una migración formal
npm run db:migrate

# Poblar la DB con datos de prueba
npm run db:seed

# Regenerar el cliente Prisma (después de cambiar schema.prisma)
npm run db:generate

# Abrir Prisma Studio (explorador visual de la DB)
npx prisma studio
```

### Build para producción

```bash
cd backend && npm run build && npm start
cd frontend && npm run build  # resultado en frontend/dist/
```

---

## Mapa Backend → Frontend

| Ruta backend | Método | Página frontend | Componente |
|-------------|--------|-----------------|-----------|
| `/api/auth/login` | POST | `/login` | `Login.tsx` |
| `/api/auth/me` | GET | (global, en AppLayout) | `store/auth.ts` |
| `/api/dashboard/*` | GET | `/` | `Dashboard.tsx` |
| `/api/clients` | GET/POST | `/clientes` | `Clients.tsx` |
| `/api/clients/:id` | GET/PUT/DELETE | `/clientes/:id` | `ClientDetail.tsx` |
| `/api/clients/:id` | PUT | `/clientes/:id/editar` | `ClientForm.tsx` |
| `/api/quotations` | GET/POST | `/cotizaciones` | `Quotations.tsx` |
| `/api/quotations/:id` | GET/PUT | `/cotizaciones/:id` | `QuotationForm.tsx` |
| `/api/quotations/:id/convert-to-order` | POST | `/cotizaciones/:id` | `QuotationForm.tsx` |
| `/api/orders` | GET/POST | `/pedidos` | `Orders.tsx` |
| `/api/orders/:id` | GET | `/pedidos/:id` | `OrderDetail.tsx` |
| `/api/orders/:id/status` | PATCH | `/pedidos/:id` | `OrderDetail.tsx` |
| `/api/inventory` | GET | `/inventario` | `Inventory.tsx` |
| `/api/inventory/movement` | POST | `/inventario` | `Inventory.tsx` |
| `/api/production` | GET/POST | `/produccion` | `Production.tsx` |
| `/api/production/:id/status` | PATCH | `/produccion` | `Production.tsx` |
| `/api/purchases` | GET/POST | `/compras` | `Purchases.tsx` |
| `/api/purchases/:id/receive` | PUT | `/compras` | `Purchases.tsx` |
| `/api/suppliers` | GET/POST | `/compras` | `Purchases.tsx` |
| `/api/invoices` | GET/POST | `/credito` | `Credit.tsx` |
| `/api/invoices/:id/pay` | PUT | `/credito` | `Credit.tsx` |
| `/api/products` | GET/POST | `/catalogo` | `Catalog.tsx` |
| `/api/products/:id` | GET/PUT | `/catalogo/:id/editar` | `ProductForm.tsx` |
| `/api/products/:id/components` | GET/PUT | `/catalogo/:id/editar` | `ProductForm.tsx` |
| `/api/reports/*` | GET | `/reportes` | `Reports.tsx` |
| `/api/users` | GET/POST/PUT/DELETE | `/configuracion` | `Settings.tsx` |
| `/api/expenses` | GET/POST/PATCH | `/configuracion` | `Settings.tsx` |
| `/api/tasks` | GET/POST/PUT/PATCH | (panel lateral/dashboard) | `Dashboard.tsx` |
| `/api/sync` | POST | (background) | — |

### Enums críticos (deben coincidir exacto entre schema y frontend)

| Enum | Valores válidos |
|------|----------------|
| `ProductionStatus` | `PENDIENTE`, `EN_PROCESO`, `TERMINADO`, `EMPACADO` |
| `InvoiceStatus` | `VIGENTE`, `VENCIDA`, `PAGADA` |
| `OrderStatus` | `COTIZADO`, `CONFIRMADO`, `EN_PRODUCCION`, `LISTO`, `DESPACHADO`, `ENTREGADO`, `CANCELADO` |
| `QuotationStatus` | `BORRADOR`, `ENVIADA`, `APROBADA`, `RECHAZADA`, `CONVERTIDA` |
| `UserRole` | `GERENTE`, `VENTAS`, `LOGISTICA` |
| `TaskPriority` | `URGENTE`, `NORMAL`, `DESPUES` |
| `TaskStatus` | `PENDIENTE`, `EN_PROGRESO`, `COMPLETADA`, `CANCELADA` |

---

## Roles de usuario

| Rol | Acceso |
|-----|--------|
| `GERENTE` | Todo el sistema |
| `VENTAS` | CRM, cotizaciones, pedidos, cartera (ver), reportes, gastos |
| `LOGISTICA` | Pedidos (ver+estado), producción, inventario, compras, gastos (crear) |

El control de roles está en `backend/src/middleware/auth.ts` — función `authorize(...roles)`.
El frontend no restringe vistas por rol (solo el backend bloquea la data).

---

## Reglas permanentes de trabajo

### 1. El repositorio es la única fuente de verdad
- Toda decisión técnica importante va documentada en `/docs`.
- Ningún agente debe asumir contexto implícito.
- Antes de cualquier cambio relevante, leer: `docs/PROJECT_MASTER.md`, `docs/ARCHITECTURE.md`, `docs/DOMAIN_MODEL.md` y `docs/AGENT_LOG.md`.
- Antes de modificar cualquier API call o formulario que envíe datos al backend, leer: `frontend/src/lib/contracts.ts` (fuente de verdad de nombres de campos).

### 2. No hagas cambios a ciegas
- Primero lee el código que vas a modificar.
- Primero diagnostica; después propone; después actúa.
- Si una respuesta no termina en documentación reutilizable, el trabajo está incompleto.

### 3. Deja huella clara
- Después de cada sesión de trabajo, actualiza `docs/AGENT_LOG.md`.
- Actualiza el handoff del rol correspondiente en `docs/HANDOFFS/`.
- Si tomaste una decisión arquitectónica importante, crea o actualiza un ADR en `docs/DECISIONS/`.

### 4. Prioridad de negocio sobre complejidad técnica
- Priorizar impacto real: caja, velocidad de cotización, visibilidad de pedidos, cobro.
- No introducir frameworks o dependencias nuevas sin justificar costo, beneficio y mantenimiento.
- No agregar features llamativas si no resuelven un problema operativo real.

### 5. La capa de IA es externa y desacoplada
- El core del ERP debe funcionar 100% sin IA.
- Cualquier automatización o agente debe conectarse por encima (webhooks, eventos, jobs), nunca acoplado al core.
- No introducir dependencias de IA como requisito de arranque del sistema.

### 6. Coordinación multiagente
- Ningún agente asume contexto implícito. Todo queda escrito.
- Todo agente debe dejar handoff claro para el siguiente.
- Los handoffs viven en `docs/HANDOFFS/`.

### 7. Seguridad
- `JWT_SECRET` SIEMPRE desde variable de entorno, nunca hardcodeado.
- No ampliar superficie de ataque sin análisis previo.
- No hacer cambios en autenticación/autorización sin documentarlos en un ADR.

---

## Directorios prohibidos

No leer, modificar ni crear archivos en:

| Directorio | Razón |
|-----------|-------|
| `node_modules/` | Dependencias externas, regeneradas con npm install |
| `dist/` | Build artifacts, regenerados en cada compilación |
| `.git/` | Historial de git, nunca manipular directamente |
| `backend/uploads/` | Archivos binarios subidos por usuarios |
| `.claude/qa-session/` | Estado temporal de sesiones QA (ignorado en git) |

---

## Documentación del proyecto

```
docs/
  PROJECT_MASTER.md     ← visión, contexto de negocio, estado actual
  ROADMAP.md            ← fases y prioridades
  ARCHITECTURE.md       ← arquitectura técnica actual y objetivo
  DOMAIN_MODEL.md       ← entidades y relaciones del negocio
  AGENT_LOG.md          ← bitácora cronológica global
  qa_context.md         ← contexto completo para sesiones QA
  REPORTS/              ← reportes de auditorías QA
  HANDOFFS/             ← handoffs por rol de agente
  DECISIONS/            ← ADRs de decisiones arquitectónicas
  MODULES/              ← documentación por módulo de negocio
```

---

## Sistema QA multi-agente

Este proyecto incluye un sistema de control de calidad automatizado en `.claude/agents/`. Los agentes disponibles son:

| Agente | Rol | Modelo |
|--------|-----|--------|
| `qa-orchestrator` | Coordina el ciclo QA completo | claude-opus-4-6 |
| `bug-explorer` | Detecta bugs de lógica en backend/routes y middleware | claude-sonnet-4-6 |
| `data-auditor` | Audita queries Prisma, enums, relaciones, seed | claude-sonnet-4-6 |
| `ui-auditor` | Revisa componentes React, formularios, rutas, API | claude-sonnet-4-6 |
| `bug-fixer` | Corrige bugs priorizados con cambios mínimos | claude-sonnet-4-6 |
| `qa-verifier` | Verifica cada corrección con ✓ o ✗ | claude-sonnet-4-6 |

Los agentes mantienen su memoria en `.claude/memory/<agent-name>.md`.
El estado temporal de sesiones QA se guarda en `.claude/qa-session/` (ignorado en git).

Para lanzar un ciclo QA completo, invoca al `qa-orchestrator`.

---

## Integración con Merlin (sistema contable)

Merlin es el ERP contable legacy de la empresa. Vive en `C:\Users\danie\OneDrive\Desktop\Merlin\`.

| Archivo/Carpeta | Descripción |
|----------------|-------------|
| `Merlin4.8\Dat\MaralSAS.accdb` | Base de datos activa de Merlin (Microsoft Access) |
| `exports\` | CSVs exportados desde Merlin (clientes, productos, movimientos) |
| `sync_maral.py` | Lee los CSVs y hace POST a la API de MARAL OS (clientes + productos) |
| `sync_agent.py` | Corre en background, polling `/api/sync/pending` — ejecuta sync_maral.py cuando el usuario presiona "Sincronizar" en la UI |
| `simple-web-server\` | Express + SQLite: expone los terceros de Merlin como REST API en :3000 |

**Flujo de sincronización:**
```
Merlin (.accdb) → exporta CSVs → exports/
    sync_maral.py lee CSVs → POST /api/clients + /api/products en MARAL OS
    sync_agent.py polling /api/sync/pending → dispara sync_maral.py
```

El módulo `/api/sync` en MARAL OS es un **esqueleto** — solo maneja estado en memoria (no persiste entre reinicios del backend).

---

## Contexto de negocio crítico

- La empresa tiene caída de ventas. El impacto es directo en la familia propietaria.
- Las prioridades son: reactivación comercial, velocidad de cotización, visibilidad de producción, control de cartera.
- Los módulos core están construidos. El foco ahora es robustez, consistencia y usabilidad, no features nuevas.

## Estado al 2026-04-06

- Sistema local corre SIN Docker: backend :3001, frontend :5173
- PostgreSQL nativo Windows :5432, DB: maral_os, usuario: maral
- Integración Merlin: SOLO LECTURA (sync clientes+productos desde Merlin hacia MARAL OS)
- PDF de cotización implementado: `GET /api/quotations/:id/pdf` (pdfkit, Letter, paleta #1e3a5f)
  - Incluye etiqueta remite/destino con línea punteada de corte
  - Datos empresa desde variables de entorno COMPANY_*
  - Dirección de destino: campo `shippingAddress` de la cotización, fallback a `client.address`
- Campo `shippingAddress String?` agregado a modelo `Quotation` (db:push aplicado)
- Modo edición de cotizaciones: `QuotationForm` detecta `:id` en URL → carga cotización existente
  - Ruta: `/cotizaciones/:id/editar`
  - Arranca en Step 2 (productos ya cargados), campo "Dirección de envío" prellenado
- Botón Editar (Pencil) en lista de cotizaciones: visible excepto estado CONVERTIDA
- Pendiente: correr sync_maral.py para poblar merlinCode en 853 clientes
- Pendiente: deploy EasyPanel (usar `prisma migrate deploy`, configurar COMPANY_* en panel)
- Pendiente: AutoHotkey para abrir ficha de cliente en Merlin desde MARAL OS
- Pendiente: reemplazar logo placeholder "M" con PNG real cuando esté disponible

CRÍTICO: Merlin maneja facturación electrónica DIAN. NUNCA escribir en VENMovimientos ni CXCMovimientos. La integración con Merlin es SOLO lectura. La factura electrónica la genera el contador manualmente en Merlin.

ARQUITECTURA DEFINITIVA: MARAL OS no escribe en Merlin. Merlin es solo lectura (sync clientes+productos). La factura electrónica DIAN la genera el contador manualmente en Merlin. El módulo Cartera de MARAL OS es seguimiento interno, no reemplaza Merlin. Flujo: Pre-cotización → Cotización (PDF) → Pedido → Producción → Despacho → el contador factura en Merlin.

## Estado al 2026-04-15 — QA exhaustivo + tours

### Bugs corregidos (15, commit `6709dfe`)
- **Header breadcrumb mostraba IDs crudos** → `Header.tsx`: detectar cuid2 (25 chars) con `length >= 20`, mostrar "Detalle".
- **Contador de clientes en 0** → `Clients.tsx`: backend devuelve `pagination.total`, no `total`.
- **Pedidos: `activos` incluía CANCELADO y kanban mostraba 0 ítems** → `Orders.tsx`: filtrar `!== 'CANCELADO'` y usar `_count.items`.
- **Cotizaciones: botón eliminar faltante para RECHAZADA + "— 0d" con validUntil null** → `Quotations.tsx`: habilitar eliminar en RECHAZADA; guardia `q.validUntil && daysLeft <= 3`.
- **Reportes: PieChart vacío (dataKey mismatch) + loading/empty para tab operaciones** → `Reports.tsx`: `dataKey="amount"`, query separada `opsData`, empty-state.
- **Compras: kanban ítems en 0 + link azul sin destino** → `Purchases.tsx`: `_count.items`; color neutro.
- **Producción: columna "Asignado a" mostraba ID de usuario** → `Production.tsx`: `ASSIGNEES.includes(...)` fallback `—`.
- **Inventario: crítico=285 en dashboard vs 2 en página** → `Inventory.tsx`: alinear con backend (`minStock > 0 && stock <= minStock`).
- **Actividad reciente en inglés ("CREATE en Quotation")** → `backend/src/routes/dashboard.ts`: maps de traducción acción+entidad.

### Sistema de tours expandido (commit pendiente)
- **Escape cierra tour/welcome** → `TourProvider.tsx`: `keydown` handler que marca el tour como visto.
- **Overlay sin target no bloqueaba clicks** → `TourOverlay.tsx`: `pointer-events-none` en fallback.
- **Tours nuevos**: `tareas` (4 pasos) y `gastos` (3 pasos) en `tours.ts`.
- **TourButton + data-tour attrs** agregados en `Tareas.tsx` y `Gastos.tsx`.
- **WelcomeModal** mapea rutas para `tareas` y `gastos`.

### Bugs no corregidos (requieren cambios arquitectónicos, pendiente)
- Navegación por número secuencial en URLs (`/pedidos/7` vs cuid) — requiere endpoint `findByNumber`.
- Pedido #7 con total $0 — problema de seed, no de código.
- Buscador global ⌘K / notificaciones — código parece correcto; posible estado de navegador.

### Convenciones de respuesta backend (para evitar regresiones)
- Listas paginadas: `{ data: [...], pagination: { total, page, pages, limit } }`.
- Aggregations de hijos: `_count: { items: N }` (no preload `items`).
- Totales agrupados (gastos): `{ data, pagination, totals: { CAJA_MENOR, TARJETA } }`.
- Enums y status: en **español** y mayúsculas (ver tabla de enums arriba).

