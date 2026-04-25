# Bug Explorer Memory — MARAL OS

## Sesión 2026-04-25

### Archivos analizados
- backend/src/routes/dian.ts
- backend/src/routes/whatsapp.ts
- backend/src/routes/ai.ts
- backend/src/routes/campaigns.ts
- backend/src/routes/notifications.ts
- backend/src/routes/sync.ts
- backend/src/routes/image-gen.ts
- backend/src/lib/dian.ts
- backend/src/lib/notifier.ts
- backend/src/lib/experiment-registry.ts
- backend/src/lib/image-gen.ts
- backend/src/lib/drip-scheduler.ts
- backend/src/lib/cost-tracker.ts
- backend/src/lib/brand-guard.ts
- backend/src/lib/pacing.ts
- backend/src/lib/campaign-sender.ts
- backend/src/lib/evolutionApi.ts

### Bugs encontrados

| ID | Archivo | Línea | Severidad | Descripción |
|----|---------|-------|-----------|-------------|
| BE-001 | sync.ts | 18 | P1 | Estado de sync en memoria, se pierde al reiniciar |
| BE-002 | sync.ts | 6+50 | P0 | Agente local bloqueado por authenticate en rutas de polling |
| BE-003 | sync.ts | 67 | P1 | /complete y /merlin-done sin requireRole |
| BE-004 | routes/dian.ts | 238 | P0 | Envío DIAN bloqueado en producción — XAdES no implementado (Fase B) |
| BE-005 | lib/dian.ts | 501 | P0 | NIT '222222222' hardcodeado como fallback en facturas UBL |
| BE-006 | lib/dian.ts | 458 | P1 | IVA hardcodeado 19% para todos los productos |
| BE-007 | lib/dian.ts | 477 | P1 | Ítem sintético genérico cuando Invoice no tiene líneas de detalle |
| BE-008 | whatsapp.ts | 469 | P1 | Webhook sin validación de firma HMAC |
| BE-009 | whatsapp.ts | 238 | P1 | Mensajes sin remoteId se duplican en cada reintento |
| BE-010 | whatsapp.ts | 549 | P2 | fromMeLast siempre false |
| BE-011 | campaigns.ts | 483 | P0 | GET/POST /experiments y POST /analyze-photo inaccesibles (capturadas por /:id) |
| BE-012 | campaigns.ts | 376 | P1 | Launch sin validar Evolution configurado |
| BE-013 | notifications.ts | 26 | P0 | PATCH /read-all inaccesible — capturada por /:id/read |
| BE-014 | notifications.ts | 99 | P2 | /leads/:id/attended sin requireRole |
| BE-015 | image-gen.ts | 21 | P1 | Rate limit nunca se aplica si AIUsageLog no está en schema |
| BE-016 | lib/image-gen.ts | 114 | P1 | response_format: {type:'image'} no estándar en OpenRouter |
| BE-017 | ai.ts | 87 | P2 | POST /briefing retorna null sin contrato claro |
| BE-018 | ai.ts | 143 | P2 | Rol CONTADORA hardcodeado — no existe en UserRole enum |
| BE-019 | experiment-registry.ts | 29 | P1 | Experimentos en memoria — se pierden al reiniciar |
| BE-020 | cost-tracker.ts | 21 | P1 | aIUsageLog accedido con as any — logging siempre silenciado |

### Patrones recurrentes identificados
1. RUTAS INALCANZABLES: Rutas con path fijo registradas DESPUÉS de rutas con parámetro dinámico `/:id`. Afecta campaigns (/experiments, /analyze-photo), notifications (/read-all).
2. ESTADO EN MEMORIA SIN PERSISTENCIA: sync.ts (syncStatus) y experiment-registry.ts (registry Map). Ambos se pierden al reiniciar.
3. MODELOS PRISMA OPCIONALES CON as any: cost-tracker.ts accede a `aIUsageLog` con optional chaining sobre cast. Si el modelo no existe en schema, el código falla silenciosamente.
4. AUTENTICACIÓN EN RUTAS DE AGENTE: sync.ts usa router.use(authenticate) global, bloqueando al agente local Python que no lleva JWT.
5. DIAN INCOMPLETA: Todo el módulo DIAN es Fase A — genera XML pero NO puede enviar a producción (falta firma XAdES, ZIP, y los datos de items son sintéticos).
