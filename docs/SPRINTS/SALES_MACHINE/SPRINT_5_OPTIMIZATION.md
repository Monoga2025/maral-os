# Sprint 5 — Optimización continua

**Duración estimada:** ongoing (incrementos semanales)
**Prioridad:** MEDIA — amplifica lo que ya funciona
**Depende de:** Sprint 4 operativo con data real de al menos 3 campañas
**Estado:** COMPLETADO — 2026-04-25

## Objetivo de negocio

Los Sprints 1-4 construyen la máquina. Sprint 5 la hace aprender sola. Cada semana debe rendir más que la anterior sin que John haga trabajo extra. El objetivo es que en 3 meses:

- La tasa de conversión suba de ~2% baseline a >12%
- El costo por lead caliente baje ≥40%
- La mayoría de las decisiones de horario/copy/audiencia se tomen automáticamente

**Thesis:** Una campaña optimizada por datos supera en 2× a una campaña escrita por el mejor humano, porque nadie humano puede analizar 1,384 patrones simultáneos.

## Criterios de éxito

- [ ] A/B testing automático corre en cada campaña grande (≥100 recipients)
- [ ] Mejor horario por cliente calculado y usado al programar envíos
- [ ] Probabilidad de compra por cliente visible antes de lanzar campaña
- [ ] Reporte semanal automático llega a WhatsApp de John

---

## Tareas

### T5.1 — A/B testing nativo en el composer

**Archivos a modificar:**
- `backend/prisma/schema.prisma` — extender `CampaignStep`
- `backend/src/routes/campaigns.ts`
- `frontend/src/components/campaigns/CampaignComposer.tsx`

```
model CampaignStep {
  ...
  variants      Json?   // [{ id, content, weight }, ...]
  variantMetric Json?   // { variantId: { sent, replied, converted } }
}
```

Flujo:
- John agrega un paso y hace clic "🧪 Probar 2 versiones"
- Aparecen dos textareas A y B
- Motor asigna aleatoriamente A o B a cada recipient con 50/50 (o pesos configurables)
- Dashboard muestra ganador en tiempo real cuando hay significancia estadística (mínimo 30 por grupo + diferencia >5%)
- Al terminar la campaña, el ganador se guarda como `WinningCopy`

Caps:
- Máximo 2 variantes por paso (no ABC, queda simple)
- Solo aplica a pasos tipo TEXT

### T5.2 — Best time to send por cliente

**Archivos nuevos:** `backend/src/lib/best-time.ts`

Job que corre cada noche:
1. Para cada cliente, busca sus respuestas históricas en las últimas 90 días
2. Agrupa por hora del día + día de la semana
3. Calcula `bestHourOfDay` y `bestDayOfWeek` (donde respondió más rápido o más veces)
4. Guarda en `Client.bestContactWindow: Json`

Ejemplo:
```json
{
  "bestHours": [8, 14, 19],
  "bestDays": ["MON", "WED", "FRI"],
  "avgResponseTimeSeconds": 3450,
  "samples": 12
}
```

Al encolar envíos en Sprint 1/4, si hay `bestContactWindow` con >3 samples → priorizar esa ventana. Si no hay data → usar ventana global por defecto.

### T5.3 — Lead scoring predictivo

**Archivos nuevos:**
- `backend/src/lib/purchase-predictor.ts`

Modelo simple heurístico (sin ML pesado al inicio):
```
score = (
  lifetime_value_normalized * 0.25 +
  recency_factor * 0.20 +     // 1.0 si compró últimos 30d, 0.3 si hace 1 año
  frequency_factor * 0.20 +    // basado en count de pedidos
  response_rate_history * 0.15 + // % de campañas donde respondió
  segment_weight * 0.10 +       // IM=1.0, DS=0.7, CF=0.4
  interest_match * 0.10         // si el producto de la campaña está en sus tags
)
```

Escala 0-100. Se calcula en vivo al seleccionar audiencia en el composer.

Frontend:
- En el panel de audiencia, una barra extra: **"Probabilidad de compra promedio de esta audiencia: 63/100"**
- Al hacer clic, distribución: cuántos clientes tienen score >80 (probables), 50-80 (posibles), <50 (largos)
- Sugerencia de Marco: "Si priorizas los 120 clientes con score >70, esperas ~18% de conversión"

### T5.4 — Predicción post-campaña (antes de lanzar)

**Archivos a modificar:** `backend/src/routes/marco.ts` — endpoint `audit-campaign`

Ampliar Marco para devolver también:
```json
{
  "predicted": {
    "responseRate": "18-24%",
    "expectedConversions": "9-12",
    "estimatedRevenue": "$14M - $19M COP",
    "confidence": "medium"
  }
}
```

Usa promedios históricos de campañas similares (mismo template, mismo segmento) + lead scores agregados de la audiencia.

### T5.5 — Reporte semanal automático

**Archivos nuevos:**
- `backend/src/jobs/weekly-report.ts`

Cron cada domingo 7pm. Genera un resumen y lo envía al WhatsApp interno de John vía Evolution API:

```
📊 MARAL — Resumen semanal

Campañas lanzadas: 3
Mensajes enviados: 412
Tasa de respuesta: 22%
Leads HOT: 18 (15 atendidos)
Cotizaciones generadas: 11
Pedidos cerrados: 4
Revenue generado: $38.2M COP

🏆 Campaña top: "Dipolos VHF urgencia Syscom"
- Response rate 31%
- Revenue: $22M

⚠️ Atención:
- 3 leads HOT sin atender hace >4h
- Mejor hora para enviar: martes 9am
```

John hace clic en un link corto → abre MARAL OS en `/reportes/campanas` con el rango semanal ya aplicado.

### T5.6 — Aprendizaje de frases prohibidas

**Archivos nuevos:** `backend/src/lib/forbidden-patterns.ts`

Análisis mensual:
- Identificar frases que aparecen en campañas con <5% response rate
- Proponerlas a John como "frases que no funcionan" para banear en Marco
- John acepta o rechaza

El banlist va a `WinningCopy` (invertido: qué evitar).

### T5.7 — Auto-pause de campañas malas

**Archivos a modificar:** `backend/src/lib/campaign-sender.ts`

Mientras la campaña corre:
- Si después de 30 envíos la tasa de respuesta está >50% por debajo del promedio histórico de campañas similares
- Pausar automáticamente + notificar a John: "Campaña X está respondiendo mal (3% vs 15% esperado). ¿Seguir o ajustar?"

Anti-falsos-positivos:
- No pausar antes de 30 envíos o antes de 1 hora
- Comparar con baseline del mismo tipo de campaña, no promedio global

### T5.8 — Experimentación controlada (future-proofing)

**Archivos nuevos:** `backend/src/lib/experiment-registry.ts`

Sistema simple de feature flags para experimentos:
- Cada experimento tiene nombre, hipótesis, metric, start/end
- A los clientes se les asigna cohort (A/B/control)
- Se mide diferencia estadística
- Se publica resultado en `docs/EXPERIMENTS/`

Experimentos candidato para el primer mes:
1. ¿Enviar el sábado vs entre semana mejora respuesta?
2. ¿Emojis en primer mensaje vs sin emojis?
3. ¿Incluir precio en el primer mensaje vs en el tercero?

---

## Lo que queda fuera

- ❌ Machine learning entrenado (viene en Sprint 6+ si el volumen justifica)
- ❌ Integración con analytics externos tipo Mixpanel
- ❌ Personalización 1-a-1 con LLM en tiempo real por cada envío (costo x10)

## Entregables finales

- A/B testing integrado al composer
- Mejor hora de contacto por cliente calculada
- Score de probabilidad visible al armar campañas
- Reporte semanal automático en WhatsApp de John
- Sistema de auto-pause para campañas fallidas
- Registro de experimentos

## Métricas que debemos ver mes 3

- Revenue mensual por campañas: ≥$80M COP
- Conversión campaña → pedido: ≥12%
- % de campañas que Marco predice correctamente (±5% error): ≥70%
- Tiempo humano invertido por campaña: ≤10 minutos de John

## Cierre de la iniciativa Sales Machine

Al completarse Sprint 5:
- MARAL OS tiene un módulo WhatsApp completo de ventas salientes
- John opera la máquina con <1h/día de supervisión
- Lady maneja reactivamente a los HOT con Marco de apoyo
- Datos de 3+ meses permiten decidir si invertir en ML avanzado (Sprint 6+)
- Syscom ya no es vulnerable — pero ya tomamos la cuota de mercado
