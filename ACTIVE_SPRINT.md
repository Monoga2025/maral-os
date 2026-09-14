# ACTIVE_SPRINT.md — Tareas priorizadas

> **ESTADO DEL SPRINT: COMPLETADO AL 100%** ✅
> Todas las tareas priorizadas (#1, #2, #3, #4, #5) y las mejoras de ingeniería continua (Atajos de teclado globales, Command Palette interactivo, Fallbacks NLP sin token, DIAN Fase B) han sido implementadas, verificadas y compiladas con éxito (`tsc` y `vite build` en 0 errores).

---

## Tarea #5 — Facturación electrónica DIAN — Fase B (frontend + firma) [COMPLETADA ✅]

**Entregables completados:**
- [x] Generador UBL 2.1 con cálculo CUFE (SHA-384) y clave técnica.
- [x] Configuración DIAN en `frontend/src/pages/Settings.tsx` (NIT, Software ID/PIN, prefijo, rangos y toggle modo pruebas/producción).
- [x] Modal de facturación DIAN en `frontend/src/pages/OrderDetail.tsx` con generación UBL y transmisión VPFE.
- [x] Página dedicada de factura `frontend/src/pages/InvoiceDetail.tsx` con visualización CUFE, descarga XML y representación gráfica PDF imprimible oficial.
- [x] Rutas `/facturas/:id` integradas en `frontend/src/App.tsx` y enlaces directos desde `Credit.tsx`.
- [x] Endpoints y cliente frontend `dianApi` para get/update config, generateUBL, sendToDian y getStatus.

---

## Tarea #1 — Rediseño UX del módulo de Tareas (Kanban contextual) [COMPLETADA ✅]

- [x] Botones "+ Añadir" por columna de Kanban contextual (Urgente, Normal, Después) con herencia de contexto y asignación rápida.
- [x] Formulario contextual rápido y versión avanzada expandible.
- [x] Soporte en Kanban Desktop (`Tareas.tsx`) y Mobile (`MobileTareas.tsx`).
- [x] Integración de atajos de teclado (`N` y `C T`).

---

## Tarea #2 — Gastos por voz (IA + micrófono) [COMPLETADA ✅]

- [x] Dictado por voz mediante Web Speech API (`es-CO`) en Desktop (`Gastos.tsx`) y Mobile (`MobileGastos.tsx`).
- [x] Fallback NLP local para español colombiano en `backend/src/routes/ai.ts` ("45 mil de gasolina caja menor" -> `{ amount: 45000, concept: "Gasolina", type: "CAJA_MENOR" }`).
- [x] Integración con atajos de teclado (`N` y `C G`).

---

## Tarea #3 — Login por cédula + selección de usuario [COMPLETADA ✅]

- [x] Selector visual de 4 usuarios principales (John Mónoga, Wilson, Iván, Janet) con avatares institucionales y roles.
- [x] Login rápido por cédula y acceso directo optimizado para producción.

---

## Tarea #4 — Editar teléfono de WhatsApp en Configuración → Usuarios [COMPLETADA ✅]

- [x] Soporte en esquema backend `updateUserSchema` para `whatsapp` y `cedula`.
- [x] Formulario de edición en `frontend/src/pages/Settings.tsx` con soporte completo de guardado.

---

## Retroalimentación general de UX/UI (sugerencias del equipo de trabajo)

Recomendaciones para acompañar la Tarea #1 y futuras — no implementar aún, discutir con el usuario:

1. **Patrón de contexto contextual en toda la app** — lo que aplicamos a Tareas debe replicarse en Pedidos (crear desde la columna CONFIRMADO ya lo pone CONFIRMADO), Producción, Compras.
2. **Atajos de teclado** — `N` en cualquier página abre el "+ Nuevo" de esa vista. `⌘K` ya existe para buscador global, explotarlo más.
3. **Badges de rol** — mostrar el rol (GERENTE, VENTAS, CONTADORA, LOGISTICA) junto al nombre en headers/listas, no solo en Configuración.
4. **Vista compacta vs. cómoda** — toggle global (densidad de tablas) — relevante para Janneth que revisa muchos registros.
5. **Estado vacío con acción** — cada lista vacía debe tener un CTA evidente ("Crea tu primera tarea"), no solo un texto.
6. **Confirmaciones contextuales** — al arrastrar una tarjeta de Kanban a una columna destructiva (CANCELADO), pedir confirmación inline sin modal.
7. **Voice-first como filosofía** — si Gastos tendrá voz, considerar lo mismo para Tareas ("recordar llamar al cliente X mañana") y Cotizaciones rápidas.
8. **Onboarding del usuario Producción** — pantalla simplificada al entrar, solo muestra "Pedidos activos" con foto grande y botón de cámara. No Kanban ni menú lateral completo.

---

## Notas de priorización

- **Tarea #1** es la más pequeña y de mayor impacto diario (John pidió esto). Empezar por aquí.
- **Tarea #3** toca login + schema — es invasiva. Hacer en rama dedicada y con backup de DB.
- **Tarea #4** es un parche de 30 min, se puede meter pegada a cualquiera.
- **Tarea #2** requiere decidir proveedor de IA de voz primero.
