# HANDOFF — Backend Agent

> Última actualización: 2026-03-31
> Para el agente que trabaje en el backend (Node.js + Express + Prisma)

---

## Estado actual del backend

### Lo que está bien
- Express con TypeScript, estructura limpia
- Prisma 5 con modelo de datos sólido (14 entidades)
- JWT + bcrypt para autenticación
- Zod para validación en todas las rutas
- `requireRole` middleware funcionando
- ActivityLog para trazabilidad
- 13 archivos de rutas cubriendo todos los módulos

### Problemas críticos — resolver primero

#### P0: Enum mismatches
Los valores de enums en `schema.prisma` NO coinciden con los que el frontend espera.

**Archivos a tocar:**
- `backend/prisma/schema.prisma` — fuente de verdad de los enums
- `frontend/src/types/index.ts` — debe alinearse con el schema

**Diferencias específicas:**

| Enum | Valor en schema | Valor que frontend espera | Acción |
|------|----------------|--------------------------|--------|
| ProductLine | ESTANDAR, PREMIUM | ESTACION_BASE, MOVIL, HANDY, CABLES... | Frontend debe adoptar ESTANDAR/PREMIUM O redefinir schema |
| ProductionPhase | BASICO, PREENSAMBLE, ENSAMBLE_FINAL | CORTE, ENSAMBLE, SOLDADURA... | Frontend debe adoptar los del schema |
| ProductionStatus | TERMINADO | COMPLETADO | Frontend debe usar TERMINADO |
| InvoiceStatus | VIGENTE | PENDIENTE | Frontend debe usar VIGENTE |
| UserRole | no incluye ADMIN | incluye ADMIN | Frontend debe eliminar ADMIN |

**Decisión pendiente:** El ProductLine actual (ESTANDAR/PREMIUM) es una clasificación de línea de precio, no de categoría de producto. La categoría ya existe como `ProductCategory` (ESTACION_BASE, MOVIL, etc.). Verificar si el frontend confundía `line` con `category`.

#### P0: JWT Secret fallback
**Archivo:** `backend/src/lib/jwt.ts`
```typescript
// ACTUAL — PELIGROSO:
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-production';

// CORRECTO:
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET env var is required');
```

### Problemas P1

#### Sin CRUD de usuarios
No existen rutas para crear, editar o desactivar usuarios.
- `GET /api/users` — listar usuarios
- `POST /api/users` — crear usuario (solo GERENTE)
- `PUT /api/users/:id` — editar nombre, email, rol
- `DELETE /api/users/:id` — desactivar (soft delete, `active = false`)

El frontend tiene `usersApi` apuntando a estas rutas pero el backend no las implementa.

#### Página de configuración sin backend
El frontend tiene `/configuracion` pero no existen rutas de configuración en el backend.
Posibles endpoints necesarios:
- `GET /api/settings` — preferencias del sistema (logo, nombre empresa, etc.)
- `PUT /api/settings` — actualizar configuración

#### Sin logging de requests
No hay middleware de logging. Agregar al menos:
```typescript
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`${req.method} ${req.path} ${res.statusCode} ${Date.now()-start}ms userId=${req.user?.userId}`);
  });
  next();
});
```

#### Inconsistencia de paginación
Algunos endpoints usan `pageSize`, otros usan `limit`. Estandarizar a uno (preferir `limit` + `offset` o `page` + `pageSize`).

#### Módulo Sync incompleto
`backend/src/routes/sync.ts` es un esqueleto con estado en memoria. Opciones:
1. Eliminar hasta que se necesite
2. Implementar correctamente con tabla en DB

### Lo que NO tocó este agente (diagnóstico)
- No se modificó ningún archivo de código
- No se corrieron migraciones
- No se hicieron cambios a schema.prisma

### Dependencias
- Los enum fixes requieren coordinación con el frontend-agent (deben alinearse juntos)
- El CRUD de usuarios requiere que el frontend-agent agregue la página de administración

### Archivos clave del backend

```
backend/
├── src/
│   ├── index.ts              ← Entry point, configuración Express, montaje de rutas
│   ├── lib/
│   │   ├── prisma.ts         ← Singleton PrismaClient
│   │   └── jwt.ts            ← sign() y verify() — TIENE EL BUG DEL FALLBACK
│   ├── middleware/
│   │   └── auth.ts           ← authenticate + requireRole
│   └── routes/
│       ├── auth.ts           ← POST /login, GET /me
│       ├── clients.ts        ← CRUD + stats
│       ├── products.ts       ← CRUD + stock
│       ├── quotations.ts     ← CRUD + conversión + duplicar
│       ├── orders.ts         ← CRUD + fotos + PDF
│       ├── production.ts     ← CRUD + estados
│       ├── inventory.ts      ← movimientos
│       ├── purchases.ts      ← OC + recepción
│       ├── suppliers.ts      ← CRUD
│       ├── invoices.ts       ← facturas + pagos
│       ├── dashboard.ts      ← KPIs
│       ├── reports.ts        ← reportes (GERENTE + VENTAS)
│       └── sync.ts           ← INCOMPLETO
└── prisma/
    ├── schema.prisma         ← FUENTE DE VERDAD DE ENUMS Y MODELO
    └── seed.ts               ← Datos de prueba
```

### Siguiente paso recomendado
1. Leer `backend/src/lib/jwt.ts` y aplicar fix del JWT secret
2. Leer `backend/prisma/schema.prisma` y `frontend/src/types/index.ts` en paralelo
3. Decidir la alineación de enums y aplicarla
4. Crear `backend/src/routes/users.ts` con CRUD básico
5. Actualizar `docs/AGENT_LOG.md` con lo que hiciste
