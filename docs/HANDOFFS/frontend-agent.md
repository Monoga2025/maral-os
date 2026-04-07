# HANDOFF — Frontend Agent

> Última actualización: 2026-03-31
> Para el agente que trabaje en el frontend (React + TypeScript + Tailwind)

---

## Estado actual del frontend

### Lo que está bien
- 18 páginas implementadas cubriendo todos los módulos
- Componentes UI reutilizables en `/components/ui/` (14+ componentes)
- Zustand para estado global (auth + ui)
- React Query para data fetching con caché
- Axios con interceptor de JWT automático
- React Hook Form para formularios
- Módulo de API bien organizado en `lib/api.ts` (un objeto por dominio)

### Problemas críticos — resolver coordinado con backend-agent

#### P0: Enum mismatches en types/index.ts
**Archivo:** `frontend/src/types/index.ts`

El frontend define enums que NO coinciden con los que devuelve el backend.

**Correcciones necesarias:**

```typescript
// ACTUAL (frontend) — INCORRECTO:
export type ProductLine = 'ESTACION_BASE' | 'MOVIL' | 'HANDY' | 'CABLES' | 'ACCESORIOS' | 'OTROS'

// CORRECTO (alinear con schema.prisma):
export type ProductLine = 'ESTANDAR' | 'PREMIUM'
// La categoría del producto ya existe como:
export type ProductCategory = 'ESTACION_BASE' | 'MOVIL' | 'HANDY' | 'CABLE' | 'CONECTOR' | 'BASE' | 'ACCESORIO' | 'MATERIA_PRIMA'
```

```typescript
// ACTUAL (frontend) — INCORRECTO:
export type ProductionPhase = 'CORTE' | 'ENSAMBLE' | 'SOLDADURA' | 'PINTURA' | 'PRUEBAS' | 'EMPAQUE'

// CORRECTO:
export type ProductionPhase = 'BASICO' | 'PREENSAMBLE' | 'ENSAMBLE_FINAL'
```

```typescript
// ACTUAL (frontend) — INCORRECTO:
export type ProductionStatus = 'PENDIENTE' | 'EN_PROCESO' | 'COMPLETADO' | 'CANCELADO'

// CORRECTO:
export type ProductionStatus = 'PENDIENTE' | 'EN_PROCESO' | 'TERMINADO' | 'EMPACADO'
```

```typescript
// ACTUAL (frontend) — INCORRECTO:
export type InvoiceStatus = 'PENDIENTE' | 'PAGADA' | 'VENCIDA' | 'ANULADA'

// CORRECTO:
export type InvoiceStatus = 'VIGENTE' | 'VENCIDA' | 'PAGADA'
```

```typescript
// ACTUAL (frontend) — INCORRECTO (incluye ADMIN que no existe en backend):
export type UserRole = 'GERENTE' | 'VENTAS' | 'LOGISTICA' | 'ADMIN'

// CORRECTO:
export type UserRole = 'GERENTE' | 'VENTAS' | 'LOGISTICA'
```

**Impacto:** Revisar qué componentes/páginas usan estos tipos y asegurarse de que los switches/cases y los labels de visualización se actualicen también.

### Problemas P1

#### Sin restricción de vistas por rol
El sidebar muestra todas las opciones independientemente del rol del usuario.

**Archivo:** `frontend/src/components/layout/Sidebar.tsx` (o similar)

Implementar según tabla de acceso en `docs/ARCHITECTURE.md`:
- VENTAS: no ve Producción, Inventario, Compras
- LOGISTICA: no ve CRM, Cotizaciones, Cartera, Reportes

El store de auth ya tiene el `user.role` disponible.

#### Página de configuración sin contenido funcional
`frontend/src/pages/Settings.tsx` — UI existe pero no conecta a backend.
Depende de que backend-agent cree las rutas primero.

#### Página de manual vacía
`frontend/src/pages/Manual.tsx` — UI sin contenido.
Puede llenarse con contenido estático mientras tanto.

#### ChatBot sin integración
`frontend/src/components/ChatBot.tsx` — componente existe pero sin lógica de IA.
No conectar hasta que la capa de IA esté definida (ver ADR-002).

### Mejoras de alto impacto para ventas

#### Pipeline de cotizaciones
En `frontend/src/pages/Quotations.tsx`:
- Agregar tiempo en estado (ej: "hace 5 días en ENVIADA")
- Destacar visualmente cotizaciones sin seguimiento (badge rojo si >3 días en ENVIADA)
- Columna de "última actividad"

#### Dashboard de clientes dormidos
En `frontend/src/pages/Clients.tsx`:
- Filtro: "sin actividad en >90 días"
- Badge de "sin compras recientes" en la lista

### Archivos clave del frontend

```
frontend/src/
├── App.tsx                   ← Router principal con todas las rutas
├── lib/
│   └── api.ts                ← Axios + módulos de API por dominio
├── store/
│   ├── auth.ts               ← user, token, isAuthenticated, login(), logout()
│   └── ui.ts                 ← sidebarCollapsed, commandPaletteOpen
├── types/
│   └── index.ts              ← AQUÍ ESTÁN LOS ENUMS INCORRECTOS
├── pages/
│   ├── Dashboard.tsx
│   ├── Clients.tsx / ClientDetail.tsx / ClientForm.tsx
│   ├── Quotations.tsx / QuotationForm.tsx
│   ├── Orders.tsx / OrderDetail.tsx / OrderForm.tsx
│   ├── Inventory.tsx
│   ├── Production.tsx
│   ├── Purchases.tsx
│   ├── Credit.tsx            ← Módulo de cartera/facturas
│   ├── Catalog.tsx
│   ├── Reports.tsx
│   ├── Settings.tsx          ← SIN BACKEND
│   ├── Manual.tsx            ← SIN CONTENIDO
│   └── Login.tsx
└── components/
    ├── layout/               ← AppLayout, Header, Sidebar
    ├── ui/                   ← 14+ componentes reutilizables
    └── tour/                 ← Guía interactiva
```

### Patrones de código a seguir

**Data fetching estándar:**
```typescript
const { data, isLoading } = useQuery({
  queryKey: ['resource', filters],
  queryFn: () => resourceApi.getAll(filters),
})
```

**Mutación estándar:**
```typescript
const mutation = useMutation({
  mutationFn: resourceApi.create,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['resource'] })
    toast.success('Creado correctamente')
  }
})
```

**Acceso a usuario actual:**
```typescript
const { user } = useAuthStore()
// user.role === 'GERENTE' | 'VENTAS' | 'LOGISTICA'
```

### Lo que NO tocó este agente (diagnóstico)
- No se modificó ningún archivo de código
- No se verificaron todos los componentes individuales (solo páginas y archivos core)

### Dependencias
- Los enum fixes requieren coordinación con backend-agent
- Settings page depende de que backend-agent cree las rutas

### Siguiente paso recomendado
1. Leer `frontend/src/types/index.ts` completo
2. Corregir los 5 enum mismatches
3. Buscar todos los usos de esos enums en páginas y componentes
4. Actualizar labels/textos que usen los valores viejos
5. Actualizar `docs/AGENT_LOG.md`
