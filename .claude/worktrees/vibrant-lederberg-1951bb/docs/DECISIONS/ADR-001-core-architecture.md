# ADR-001 — Arquitectura core: Monolito modular con separación frontend/backend

**Fecha:** 2026-03-31
**Estado:** Aceptado
**Decidido por:** Arquitecto inicial del proyecto

---

## Contexto

MARAL OS es un ERP para una empresa familiar mediana. El equipo es pequeño (1-3 personas técnicas). La empresa necesita un sistema que funcione hoy, no en 6 meses.

Se evaluaron las siguientes alternativas:

1. **Microservicios** — Un servicio por dominio (clientes, pedidos, producción, etc.)
2. **Monolito modular** — Un backend con separación por dominio en carpetas/módulos
3. **Serverless/BaaS** — Supabase, Firebase, etc.
4. **Full-stack framework** — Next.js con API routes

---

## Decisión

Se eligió **monolito modular con separación estricta frontend/backend**:
- Backend: Node.js + Express + Prisma (un solo proceso)
- Frontend: React SPA separada (Vite)
- Base de datos: PostgreSQL (un solo schema)

---

## Razones

### Por qué NO microservicios
- Overhead operacional desproporcionado para el tamaño del equipo
- Cada módulo del ERP (CRM, pedidos, producción) comparte datos frecuentemente (un pedido necesita saber de cliente, producto y stock simultáneamente)
- Las transacciones distribuidas son complejas y frágiles
- La empresa no tiene ni necesita escalar a miles de usuarios concurrentes

### Por qué monolito modular
- Un solo repositorio, un solo deploy, un solo proceso que monitorear
- Las rutas están organizadas por dominio (`routes/clients.ts`, `routes/orders.ts`) — es modular sin ser distribuido
- Si en el futuro se necesita extraer un servicio, la separación de dominio ya está hecha
- Prisma facilita transacciones ACID entre múltiples entidades

### Por qué separación frontend/backend (no full-stack)
- Permite desplegar el frontend como estático (nginx) y el backend como API — más eficiente
- El frontend puede evolucionar independientemente del backend
- La API REST es consumible también por mobile o integraciones futuras
- EasyPanel maneja bien este patrón con Docker Compose

### Por qué PostgreSQL y no MongoDB
- El modelo de datos del ERP tiene relaciones complejas (pedido → cliente, items, producción, facturas)
- Las transacciones son críticas (no puedes tener un pedido sin stock actualizado)
- Prisma tiene mejor soporte y migraciones más seguras con PostgreSQL
- El equipo ya conoce SQL

---

## Consecuencias

**Positivas:**
- Simplicidad operacional: un solo proceso backend, un solo deploy
- Transacciones ACID garantizadas por PostgreSQL
- Rápido de desarrollar y mantener con equipo pequeño
- Fácil de entender y debuggear

**Negativas / trade-offs:**
- El backend no escala horizontalmente de forma nativa (solucionable con instancias adicionales y sticky sessions si se necesita)
- Una falla en un módulo puede afectar a todos (mitigado con error handling y health checks)
- El deploy requiere que todo el código esté listo (no canary deployments por módulo)

**Restricciones que impone:**
- No introducir estado mutable en memoria del proceso (usar DB para todo el estado persistente)
- Los uploads deben ir a almacenamiento externo o volumen montado (no en memoria del proceso)
- Las tareas asíncronas largas deben delegarse a jobs externos (no bloquear el event loop)

---

## Revisión

Esta decisión debe revisarse si:
- El equipo técnico crece a >5 personas trabajando en dominios distintos
- Se necesita escalar un módulo específico independientemente (ej: producción tiene 1000 usuarios concurrentes)
- Se necesita tecnología diferente para un módulo específico (ej: ML para predicción de demanda)

Hasta entonces, el monolito modular es la arquitectura correcta.
