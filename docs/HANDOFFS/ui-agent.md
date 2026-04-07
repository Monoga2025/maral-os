# HANDOFF — UI Agent

> Última actualización: 2026-03-31
> Para el agente que trabaje en UX/UI, experiencia del usuario y diseño de interfaces

---

## Estado actual de la UI

### Componentes disponibles (`frontend/src/components/ui/`)
- Button, Input, Card, Table, Modal, Badge, Tabs, Select
- Pagination, KPICard, StatusBadge, EmptyState, LoadingSkeleton, Hint

### Biblioteca de estilos
- Tailwind CSS 3.4
- Recharts 2.10 para gráficos
- Sin librería de componentes externa (UI custom)

### Puntos de mejora de alto impacto (ordenados por valor de negocio)

---

## 1. Pipeline visual de cotizaciones

**Página:** `frontend/src/pages/Quotations.tsx`
**Impacto:** Directo en ventas — el vendedor necesita saber qué cotizaciones requieren acción hoy.

Diseño sugerido:
- Vista de columnas por estado (Kanban style): BORRADOR | ENVIADA | VISTA | ACEPTADA | RECHAZADA
- En cada tarjeta:
  - Nombre del cliente + empresa
  - Total de la cotización
  - Días en estado actual (badge de color: verde <3d, amarillo 3-7d, rojo >7d)
  - Botón de acción rápida según estado

---

## 2. Dashboard ejecutivo mejorado

**Página:** `frontend/src/pages/Dashboard.tsx`
**Impacto:** Gerente necesita ver el estado del negocio en 30 segundos.

KPIs prioritarios a destacar:
- Ventas del mes vs mes anterior (con flecha arriba/abajo)
- Cotizaciones sin seguimiento (número + alerta visual si >0)
- Facturas vencidas (número + alerta visual si >0)
- Pedidos sin confirmar >3 días (número + alerta)
- Productos en stock crítico (número)

Gráfico sugerido: línea de ventas últimos 6 meses (ya existe, verificar)

---

## 3. Indicadores de alerta en sidebar

**Componente:** `frontend/src/components/layout/Sidebar.tsx`
**Impacto:** El usuario ve problemas urgentes sin abrir cada módulo.

Badges de notificación en el menú:
- Cotizaciones: N sin seguimiento
- Cartera: N facturas vencidas
- Inventario: N productos en stock crítico
- Pedidos: N sin confirmar

---

## 4. Vista de cliente: 360°

**Página:** `frontend/src/pages/ClientDetail.tsx`
**Impacto:** Vendedor tiene todo el contexto antes de contactar al cliente.

Secciones sugeridas:
- Header: datos del cliente + categoría + estado de crédito
- Resumen rápido: total comprado, última compra hace X días, facturas pendientes
- Timeline de interacciones: cotizaciones, pedidos, pagos (cronológico)
- Acciones rápidas: Nueva cotización, Ver cartera, Ver historial de pedidos

---

## 5. Restricción visual por rol

**Componente:** `frontend/src/components/layout/Sidebar.tsx`
**Impacto:** Cada usuario ve solo lo que le corresponde.

Ver tabla de acceso en `docs/ARCHITECTURE.md`.

Usar `useAuthStore()` para leer el rol y filtrar ítems del menú.

---

## Sistema de colores (estado actual de badges)

Usar consistentemente en todas las páginas:

| Estado | Color sugerido |
|--------|---------------|
| Activo / Bueno / OK | verde |
| Advertencia / Pendiente | amarillo |
| Urgente / Vencido / Crítico | rojo |
| Borrador / Inactivo | gris |
| En proceso | azul |
| Completado / Pagado | verde oscuro |

---

## Patrones de UX a mantener

- Usar `EmptyState` cuando una lista está vacía (no mostrar tabla vacía)
- Usar `LoadingSkeleton` mientras carga (no spinner genérico)
- Confirmación modal antes de acciones destructivas (eliminar, cancelar pedido)
- Toast de éxito/error después de mutaciones
- Feedback visual inmediato al cambiar estado (no recargar la página)

---

## Archivos clave para UI

```
frontend/src/
├── components/
│   ├── layout/
│   │   ├── AppLayout.tsx     ← Shell principal
│   │   ├── Header.tsx        ← Barra superior
│   │   └── Sidebar.tsx       ← Navegación lateral
│   └── ui/
│       ├── KPICard.tsx       ← Tarjeta de métrica
│       ├── StatusBadge.tsx   ← Badge de estado
│       ├── Table.tsx         ← Tabla reutilizable
│       └── Modal.tsx         ← Modal reutilizable
├── pages/
│   ├── Dashboard.tsx         ← KPIs principales
│   ├── Quotations.tsx        ← Pipeline comercial
│   └── ClientDetail.tsx      ← Vista 360° del cliente
└── index.css                 ← Estilos globales
```

### Siguiente paso recomendado
1. Implementar badges de alerta en Sidebar (requiere endpoint de conteos)
2. Mejorar vista de Quotations con indicador de días sin respuesta
3. Restringir sidebar por rol usando `useAuthStore()`
4. Actualizar `docs/AGENT_LOG.md`
