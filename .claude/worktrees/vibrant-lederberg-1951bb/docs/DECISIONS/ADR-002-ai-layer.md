# ADR-002 — Capa de IA: Externa y desacoplada del core operativo

**Fecha:** 2026-03-31
**Estado:** Aceptado
**Decidido por:** Arquitecto inicial del proyecto

---

## Contexto

Existe interés en agregar automatización e inteligencia artificial a MARAL OS. Las ideas incluyen:
- Agente que haga seguimiento de cotizaciones
- Agente que gestione cobro de cartera
- Predicción de demanda para inventario
- Chatbot de consulta para el gerente

La pregunta es: ¿cómo integrar IA sin comprometer la estabilidad del sistema?

---

## Decisión

La capa de IA es **externa y desacoplada del core operativo**:

```
┌─────────────────────────────────────────┐
│          MARAL OS CORE (ERP)            │
│   Funciona 100% sin IA                  │
│   Expone: REST API + Eventos/Webhooks   │
└──────────────────┬──────────────────────┘
                   │ webhooks / polling API
┌──────────────────▼──────────────────────┐
│        CAPA DE AUTOMATIZACIÓN (futuro)  │
│   Agentes IA / Jobs / Notificaciones    │
│   Orquestador: Paperclip u otro         │
└─────────────────────────────────────────┘
```

**Reglas:**
1. El ERP arranca y funciona completamente sin ningún componente de IA
2. Los agentes se conectan al ERP como clientes externos (via API o webhooks)
3. Los agentes pueden leer datos y crear registros, pero no modificar el core
4. Toda acción de un agente queda registrada en ActivityLog con `userId` del agente
5. Las aprobaciones humanas se modelan como estados en el ERP (no en el agente)

---

## Razones

### Por qué NO integrar IA dentro del core
- Un bug en un modelo de IA no debe tumbar la facturación o los pedidos
- Los modelos de IA tienen costos variables — el ERP debe funcionar si se acaba el crédito de la API
- La IA evoluciona rápido — desacoplarla permite cambiar de proveedor sin tocar el ERP
- El equipo puede desarrollar y desplegar el ERP sin conocimiento de IA
- Auditoría: es más fácil separar qué hizo el sistema vs qué hizo un agente

### Por qué webhooks/eventos como interfaz
- El ERP ya tiene ActivityLog — puede extenderse a emitir webhooks en eventos de negocio
- El agente puede estar en cualquier infraestructura (serverless, otro servidor, etc.)
- La interfaz es la misma API REST que ya existe — no requiere nueva capa de integración
- Permite múltiples agentes independientes para diferentes dominios

### Sobre Paperclip
Paperclip (u otro orquestador de agentes) puede ser útil como capa externa de orquestación:
- **Ventaja:** Maneja reintentos, colas, observabilidad de agentes
- **Riesgo:** Dependencia de infraestructura adicional
- **Decisión:** Evaluarlo en Fase 6 del roadmap, solo si la complejidad de los agentes lo justifica
- **Restricción:** Nunca como dependencia del core — solo como capa adicional opcional

---

## Diseño para extensibilidad (sin implementar aún)

### Eventos de negocio a publicar (futuro)
```typescript
// Tabla en DB o webhook POST a URL configurada:
interface BusinessEvent {
  id: string
  type: 'quotation.sent' | 'invoice.overdue' | 'stock.critical' | ...
  entityId: string
  entityType: string
  payload: Record<string, unknown>
  occurredAt: Date
}
```

### Cómo un agente interactuaría
```
Agente de seguimiento comercial:
1. Escucha evento quotation.sent
2. Espera N días sin cambio de estado
3. Llama GET /api/quotations/:id para obtener datos
4. Genera borrador de mensaje para el vendedor
5. Crea nota en el CRM via POST /api/clients/:id/notes
6. Notifica al vendedor (Slack, WhatsApp, email)
```

El ERP no sabe que existe el agente. El agente sabe del ERP.

---

## Consecuencias

**Positivas:**
- El ERP es robusto e independiente
- La capa de IA puede iterar rápido sin riesgos para la operación
- Múltiples agentes pueden coexistir sin interferirse
- Fácil de auditar qué hicieron los agentes

**Negativas / trade-offs:**
- Latencia adicional: el agente debe polling o recibir webhooks (no es tiempo real sincrónico)
- Más infraestructura para gestionar cuando se active la capa de IA
- Requiere diseñar buenos endpoints de API que expongan el estado que los agentes necesitan

---

## Revisión

Esta decisión debe revisarse si:
- Se necesita que la IA tome decisiones síncronas bloqueantes (ej: aprobar automáticamente una cotización antes de enviar)
- El volumen de eventos es tan alto que webhooks no escalan

Hasta entonces: IA externa, ERP autónomo.
