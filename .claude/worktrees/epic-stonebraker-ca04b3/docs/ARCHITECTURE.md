# ARCHITECTURE.md — Arquitectura técnica de MARAL OS

> Última actualización: 2026-03-31

---

## 1. Arquitectura actual

### Patrón general

Monolito modular con separación estricta frontend/backend.

```
┌─────────────────────────────────────────────────┐
│                  USUARIO (browser)               │
└──────────────────────┬──────────────────────────┘
                       │ HTTP/HTTPS
┌──────────────────────▼──────────────────────────┐
│              FRONTEND (React SPA)                │
│  React 18 + TypeScript + Vite + Tailwind         │
│  Estado: Zustand + React Query                   │
│  Router: React Router 6                          │
│  HTTP client: Axios                              │
└──────────────────────┬──────────────────────────┘
                       │ REST API /api/*
┌──────────────────────▼──────────────────────────┐
│              BACKEND (Node.js API)               │
│  Express + TypeScript                            │
│  Validación: Zod                                 │
│  Auth: JWT (Bearer token)                        │
│  ORM: Prisma 5                                   │
└──────────────────────┬──────────────────────────┘
                       │ TCP
┌──────────────────────▼──────────────────────────┐
│              BASE DE DATOS                       │
│  PostgreSQL 16                                   │
└─────────────────────────────────────────────────┘
```

### Deploy (EasyPanel)

```
Internet → EasyPanel (Docker)
             ├── nginx (reverse proxy)
             ├── frontend container (React build estático)
             ├── backend container (Node.js API :3001)
             └── PostgreSQL container (:5432)
```

---

## 2. Estructura de carpetas (estado actual)

```
maral-os/
├── CLAUDE.md
├── docker-compose.yml
├── .env / .env.example
├── docs/                         ← Documentación del proyecto
│   ├── PROJECT_MASTER.md
│   ├── ROADMAP.md
│   ├── ARCHITECTURE.md
│   ├── DOMAIN_MODEL.md
│   ├── AGENT_LOG.md
│   ├── HANDOFFS/
│   ├── DECISIONS/
│   └── MODULES/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma         ← Modelo de datos
│   │   ├── migrations/
│   │   └── seed.ts
│   └── src/
│       ├── index.ts              ← Entry point + Express setup
│       ├── lib/
│       │   ├── prisma.ts         ← Singleton Prisma client
│       │   └── jwt.ts            ← JWT sign/verify
│       ├── middleware/
│       │   └── auth.ts           ← authenticate + requireRole
│       └── routes/               ← 13 archivos de rutas
│           ├── auth.ts
│           ├── clients.ts
│           ├── products.ts
│           ├── quotations.ts
│           ├── orders.ts
│           ├── production.ts
│           ├── inventory.ts
│           ├── purchases.ts
│           ├── suppliers.ts
│           ├── invoices.ts
│           ├── dashboard.ts
│           ├── reports.ts
│           └── sync.ts           ← Incompleto
└── frontend/
    └── src/
        ├── App.tsx               ← Router principal
        ├── main.tsx
        ├── index.css
        ├── lib/
        │   └── api.ts            ← Axios instance + módulos de API
        ├── store/
        │   ├── auth.ts           ← Zustand: sesión de usuario
        │   └── ui.ts             ← Zustand: estado de UI global
        ├── types/
        │   └── index.ts          ← Interfaces TypeScript
        ├── pages/                ← 18 páginas
        └── components/
            ├── layout/           ← AppLayout, Header, Sidebar
            ├── ui/               ← 14+ componentes reutilizables
            └── tour/             ← TourProvider, TourOverlay
```

---

## 3. Flujo de autenticación

```
Login (email+password)
  → POST /api/auth/login
  → Backend valida contra DB (bcrypt)
  → Genera JWT (payload: { userId, role }, expiry: 7 días)
  → Frontend guarda token en Zustand store (persistido en localStorage)
  → Axios interceptor inyecta "Authorization: Bearer <token>" en cada request
  → 401 en cualquier request → redirect automático a /login
```

---

## 4. Flujo de datos (patrón estándar)

```
Componente React
  → useQuery (React Query) llama api.getAll(filtros)
  → Axios: GET /api/recurso?param=valor
  → Express route handler
  → Zod validation de query params
  → Prisma query a PostgreSQL
  → Respuesta JSON: { data: [...], pagination: { total, page, pageSize } }
  → React Query cachea el resultado
  → Componente renderiza
```

---

## 5. Modelo de autorización

| Rol | Dashboard | CRM | Cotiz. | Pedidos | Producción | Inventario | Compras | Cartera | Reportes |
|-----|-----------|-----|--------|---------|------------|------------|---------|---------|----------|
| GERENTE | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| VENTAS | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ (ver) | ✅ |
| LOGISTICA | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |

> ⚠️ El frontend actualmente no restringe vistas por rol. El backend sí tiene `requireRole` en reportes.

---

## 6. Inconsistencias conocidas (enum mismatches)

| Entidad | Frontend (types/index.ts) | Backend (schema.prisma) |
|---------|--------------------------|------------------------|
| ProductLine | ESTACION_BASE, MOVIL, HANDY, CABLES... | ESTANDAR, PREMIUM |
| ProductionPhase | CORTE, ENSAMBLE, SOLDADURA... | BASICO, PREENSAMBLE, ENSAMBLE_FINAL |
| ProductionStatus | COMPLETADO | TERMINADO |
| InvoiceStatus | PENDIENTE | VIGENTE |
| UserRole | incluye ADMIN | no incluye ADMIN |

**Prioridad de corrección: P0**

---

## 7. Arquitectura objetivo (a evolucionar)

### Principios de diseño objetivo

1. **Separación por dominio** — cada módulo tiene su propio dominio de datos y lógica
2. **Eventos de negocio explícitos** — las transiciones importantes se registran como eventos
3. **Capa de automatización externa** — webhooks/jobs por encima del ERP, no dentro
4. **Trazabilidad completa** — ActivityLog para auditoría, al menos en operaciones críticas

### Módulos objetivo y sus dominios

```
┌─────────────────────────────────────────────────────────────────┐
│                        MARAL OS CORE                            │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │   CRM    │  │ COTIZ.   │  │ PEDIDOS  │  │  PRODUCCIÓN  │   │
│  │ clientes │→ │ pipeline │→ │ kanban   │→ │ 3 fases      │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────┘   │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │INVENTARIO│  │ COMPRAS  │  │ CARTERA  │  │  REPORTES    │   │
│  │ stock    │  │ OC       │  │ facturas │  │  KPIs        │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────┘   │
│                                                                 │
└──────────────────────────────┬──────────────────────────────────┘
                               │ Eventos / Webhooks (futuro)
┌──────────────────────────────▼──────────────────────────────────┐
│                    CAPA DE AUTOMATIZACIÓN (futuro)               │
│          Agentes IA / Notificaciones / Jobs / Alertas            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. Decisiones arquitectónicas

Ver `docs/DECISIONS/` para ADRs:
- ADR-001: Por qué monolito modular (no microservicios)
- ADR-002: Por qué IA como capa externa desacoplada
