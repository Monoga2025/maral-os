# ACTIVE_SPRINT.md — Tareas priorizadas

> Documento vivo. Las tareas aquí están **pendientes de orden explícita** para empezar. No implementar nada hasta que el usuario diga "inicia con tarea #N".

---

## Tarea #1 — Rediseño UX del módulo de Tareas (Kanban contextual)

**Problema actual:** El flujo de creación de tareas es idéntico sin importar el contexto. El usuario debe llenar todos los campos cada vez, incluso cuando el contexto ya debería inferirlos.

**Comportamiento esperado:**

### Botones "Añadir" por columna de Kanban (contextual)
Cada columna del Kanban debe tener un botón "+ Añadir" que herede contexto:

| Vista activa | Columna | Asignado automático | Prioridad automática |
|--------------|---------|---------------------|----------------------|
| Mis tareas | Urgente | Usuario logueado | URGENTE |
| Mis tareas | Normal | Usuario logueado | NORMAL |
| Mis tareas | Después | Usuario logueado | DESPUES |
| Vista de Janneth | Urgente | Janneth | URGENTE |
| Vista de Janneth | Normal | Janneth | NORMAL |
| Vista de John | cualquiera | John | (según columna) |

### Formulario contextual (corto)
Cuando se crea desde una columna, el formulario solo pregunta:
- **Título** (requerido)
- **Detalles** (opcional)
- **Fecha límite** (opcional)

No pregunta asignado ni prioridad — se inyectan del contexto.

### Formulario completo
El botón global "+ Nueva tarea" (header o dashboard, fuera de columnas) sigue pidiendo **todo** (asignado, prioridad, cliente, pedido, fecha, título, detalles).

### Archivos candidatos a tocar
- `frontend/src/pages/Tareas.tsx` (o donde viva el Kanban)
- `frontend/src/components/` — modal/form de tarea
- Backend ya soporta el patrón (`POST /api/tasks` acepta `assignedToId` y `priority`); no requiere cambios.

### Criterio de aceptación
- [ ] Desde cualquier columna del Kanban se crea tarea en 3 clicks o menos (abrir modal, título, guardar).
- [ ] El asignado y la prioridad se fijan silenciosamente desde el contexto.
- [ ] El botón global "Nueva tarea" conserva el formulario completo.
- [ ] La vista por usuario (Janneth / John / Mis tareas) se conserva con filtro `assignedToId`.

---

## Tarea #2 — Gastos por voz (IA + micrófono)

**Objetivo:** En `/gastos`, agregar botón de micrófono. El usuario dicta el gasto ("gasto de 45 mil pesos en gasolina, caja menor"), la IA transcribe + parsea + crea el gasto.

**Flujo propuesto:**
1. Usuario presiona botón 🎙️ en página Gastos.
2. Browser graba audio (`MediaRecorder` Web API).
3. Envío del audio al backend: `POST /api/expenses/voice` (multipart).
4. Backend transcribe (Whisper / equivalente) y parsea con LLM a estructura:
   ```json
   { "amount": 45000, "category": "COMBUSTIBLE", "method": "CAJA_MENOR", "description": "gasolina" }
   ```
5. Frontend muestra preview → usuario confirma → se crea el gasto.

**Decisiones pendientes (resolver antes de implementar):**
- Proveedor de transcripción (Whisper API vs. navegador `SpeechRecognition`).
- Categorías válidas de gasto — revisar enum existente.
- ¿Confirmación manual antes de crear o creación directa con posibilidad de revertir?

**Archivos candidatos:**
- `frontend/src/pages/Gastos.tsx` — botón micrófono + preview.
- `backend/src/routes/expenses.ts` — endpoint `/voice`.
- `backend/src/lib/` — nuevo cliente (ej. `openaiClient.ts` o `whisperClient.ts`).

### Criterio de aceptación
- [ ] El usuario puede dictar un gasto en español colombiano y queda registrado correctamente.
- [ ] Categoría y método de pago se detectan automáticamente si se mencionan.
- [ ] Hay fallback a edición manual si la IA no identifica algún campo.

---

## Tarea #3 — Login por cédula + selección de usuario

**Cambios:**

### Usuarios del sistema (nueva estructura)
| Usuario | Cédula | Rol | Notas |
|---------|--------|-----|-------|
| John Mónoga | 80163914 | GERENTE | — |
| Lady García | 63541610 | VENTAS | — |
| Janneth | 63328625 | CONTADORA | Nuevo rol (ya definido) |
| **Producción** | *(sin cédula)* | LOGISTICA | Usuario compartido — Angelo e Iván |
| ~~Angelo Pérez~~ | — | — | **Eliminar** (se reemplaza con "Producción") |
| ~~Iván~~ | — | — | **Eliminar** (se reemplaza con "Producción") |

### Pantalla de login rediseñada
1. **Paso 1:** Grid de tarjetas con los usuarios disponibles. Cada tarjeta muestra el **logo de iniciales** (J, L, J, P) — no foto. Fondo con color institucional.
2. **Paso 2:** Al click en una tarjeta con cédula → modal/campo "Ingresa tu cédula". Validar contra la cédula del usuario seleccionado.
3. **Excepción — usuario Producción:** Al click, entra directo sin pedir cédula.

### Permisos del usuario "Producción"
- Puede ver pedidos/producción asignados.
- Puede **tomar foto** y subir evidencia del producto terminado / paquete (`OrderPhoto` / upload existente).
- **No** puede ver: cartera, reportes, configuración, precios, clientes (datos comerciales).
- **No** puede crear clientes, cotizaciones, pedidos.

### Cambios backend
- `User.cedula` (String?, unique) — nuevo campo en schema.
- `POST /api/auth/login` — acepta `{ userId, cedula }` en vez de `{ email, password }`. Usuario "Producción" entra con `{ userId }` sin cedula.
- `GET /api/auth/users-public` — nuevo endpoint público: lista mínima (id, name, role, needsCedula) para pintar las tarjetas.
- Conservar login por email+password como fallback temporal.

### Cambios frontend
- `Login.tsx` — grid de tarjetas → paso cédula.
- `store/auth.ts` — ajustar payload.

### Cambios data
- `seed.ts` — eliminar Angelo/Iván, crear "Producción", agregar cédulas.

### Criterio de aceptación
- [ ] Al entrar a `/login` aparecen 4 tarjetas (John, Lady, Janneth, Producción).
- [ ] John / Lady / Janneth requieren su cédula para entrar.
- [ ] Producción entra con un click.
- [ ] Producción puede subir foto a un pedido pero no ve reportes/cartera.

---

## Tarea #4 — Editar teléfono de WhatsApp en Configuración → Usuarios

**Problema:** El campo `whatsapp` existe en el modelo `User` y en el seed, pero la UI de Configuración no permite editarlo. Las notificaciones de Evolution API leen de ahí.

**Cambios:**
- `frontend/src/pages/Settings.tsx` (o `Configuración.tsx`) — agregar campo "WhatsApp" al formulario de usuario (crear / editar).
- `backend/src/routes/users.ts` — extender `createUserSchema` y `updateUserSchema` con `whatsapp: z.string().optional()`.

### Criterio de aceptación
- [ ] Desde Configuración → Usuarios, un GERENTE puede editar el número de WhatsApp de cualquier usuario.
- [ ] Las notificaciones de Evolution API llegan al nuevo número tras la edición.
- [ ] Validación mínima de formato (solo dígitos / indicativo opcional).

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
