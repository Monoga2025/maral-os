# MARAL Sales Machine — Plan de Sprints

**Iniciativa:** Convertir el módulo WhatsApp de MARAL OS en una máquina de ventas salientes operada por John, enfocada en aprovechar la ventana competitiva de Syscom (sin stock de dipolos VHF) y reactivar los 1,384 clientes de la base.

**Fecha de inicio:** 2026-04-24
**Dueño de producto:** John Mónoga
**Squad:** 1 dev (IA-asistido)
**Estado:** PLANIFICADO

---

## Tesis de negocio

1. **Ventana de oportunidad:** Syscom agotó stock de dipolos VHF — 4 a 8 semanas para capturar demanda antes de que reabastezca.
2. **Activo infrautilizado:** 1,384 clientes en DB, la mayoría sin contacto comercial proactivo en meses.
3. **Cuello de botella actual:** John no tiene forma rápida de disparar campañas segmentadas con calidad profesional.
4. **Objetivo:** Reducir el ciclo campaña→pedido de días a horas y subir conversión del ~2% actual (intuición) a >10%.

## Métricas del éxito global

| KPI | Baseline | Meta mes 1 | Meta mes 3 |
|-----|----------|-----------|-----------|
| Tasa de respuesta por campaña | n/d | >15% | >25% |
| Tiempo lead→cotización | >24h | <6h | <2h |
| Conversión campaña→pedido | ~2% | >5% | >12% |
| Revenue generado por campañas | $0 | $20M COP | $80M COP |
| Números bloqueados por WhatsApp | 0 | 0 | 0 |

## Regla dura (no negociable) — Anti-ban WhatsApp

Todo el sistema respeta pacing humano:
- Delays 8–25s entre mensajes
- Pausa 60–180s cada 10 envíos
- Máximo 300 mensajes/día por número
- Ventana horaria: 7am–10pm (configurable)
- Rotación de plantillas (nunca texto 100% idéntico a >100 contactos)
- Kill switch siempre disponible

Si violamos esto el número `maral-info` muere y perdemos el canal completo.

---

## Mapa de sprints

| Sprint | Nombre | Duración | Objetivo de negocio |
|--------|--------|----------|---------------------|
| 0 | Fundamentos de datos | 1–2 días | Segmentación lista, schema extendido |
| 1 | Arma de venta MVP | 3–5 días | John lanza campaña dipolos esta semana |
| 2 | Marco — Asesor IA | 3–5 días | Campañas 3× más rápidas, +30% respuesta |
| 3 | Nano Banana (visuales IA) | 3–5 días | Entregables profesionales en 2 min |
| 4 | Conversión y seguimiento | 3–5 días | 0% leads calientes perdidos |
| 5 | Optimización continua | ongoing | A/B testing + predicción |

## Secuencia recomendada

- **Semana 1 (27 abr–3 may):** Sprint 0 + Sprint 1 → primera campaña en vivo
- **Semana 2 (4–10 may):** Sprint 2 → Marco operativo
- **Semana 3 (11–17 may):** Sprint 3 → Nano Banana
- **Semana 4 (18–24 may):** Sprint 4 → conversión cerrada
- **Ongoing:** Sprint 5

## Archivos de este plan

- [SPRINT_0_FOUNDATIONS.md](SPRINT_0_FOUNDATIONS.md)
- [SPRINT_1_MVP.md](SPRINT_1_MVP.md)
- [SPRINT_2_MARCO_AI.md](SPRINT_2_MARCO_AI.md)
- [SPRINT_3_NANO_BANANA.md](SPRINT_3_NANO_BANANA.md)
- [SPRINT_4_CONVERSION.md](SPRINT_4_CONVERSION.md)
- [SPRINT_5_OPTIMIZATION.md](SPRINT_5_OPTIMIZATION.md)

## Dependencias externas confirmadas

- ✅ Evolution API activa (`https://ia-evolution-api.psvi0v.easypanel.host`)
- ✅ OpenRouter API Key configurada
- ✅ 1,384 clientes en DB con pushName y número
- ✅ Merlin integration (lectura) para histórico de compras
- ⚠️ Confirmar cuota OpenRouter suficiente para Gemini Image
- ⚠️ Confirmar estabilidad de `maral-info` instance en Evolution

## Riesgos CEO-level

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| Ban de WhatsApp por pacing agresivo | Pérdida del canal | Sprint 0 diseña pacing primero |
| Campañas mal escritas queman base | Caída drástica de apertura | Marco valida pre-envío (Sprint 2) |
| Lady colapsa con volumen de leads | Pérdida de hot leads | Sprint 4 prioriza por temperatura |
| John no adopta la herramienta | ROI cero | Onboarding 1:1 de 30 min antes de lanzar |
| Costo OpenRouter descontrolado | Margen comido | Cap de tokens por campaña + alertas |
