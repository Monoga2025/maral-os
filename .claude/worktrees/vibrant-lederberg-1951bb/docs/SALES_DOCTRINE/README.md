# MARAL Sales Doctrine

**Para qué existe esto:** El cerebro de ventas de MARAL OS. Lo que sabe el mejor vendedor que jamás trabajó aquí, escrito y reusable por máquinas.

**Quién lo usa:**
- **Marco** (agente IA, Sprint 2) — system prompt y reglas de generación de copy
- **Lady** (agente IA conversacional WhatsApp) — guía de tono y manejo de objeciones
- **John** y vendedores humanos — playbook práctico
- **Futuros agentes de venta** — base de entrenamiento

**Cómo se mantiene:**
- Cada campaña real que supera 25% response rate genera una entrada en `TEMPLATES_GANADORES.md`
- Cada campaña que falla bajo 5% se documenta en `ANTI_PATTERNS.md` con el porqué
- Marco va aprendiendo de la data real (Sprint 4-5)

---

## Archivos

| Archivo | Para qué sirve |
|---------|----------------|
| `PRINCIPIOS.md` | Las 10 reglas que NUNCA se violan en una venta MARAL |
| `FRAMEWORKS.md` | Biblioteca de frameworks (AIDA, PAS, Challenger, Hormozi, Cialdini) adaptados al B2B colombiano |
| `WHATSAPP_PLAYBOOK.md` | Qué SÍ funciona y qué NO en WhatsApp B2B Colombia (con datos reales) |
| `VOICE_AND_TONE.md` | Cómo habla el vendedor MARAL: sintaxis, palabras prohibidas, registros |
| `PSICOLOGIA_DECISION.md` | Sesgos cognitivos del comprador B2B colombiano y cómo trabajarlos éticamente |
| `TEMPLATES_GANADORES.md` | Las plantillas que han convertido (>15% response, >5% conversion) |
| `ANTI_PATTERNS.md` | Lo que mata campañas — frases, formatos, momentos prohibidos |
| `CASE_DIPOLOS_VHF.md` | Caso aplicado: la primera campaña real, con razonamiento detrás de cada mensaje |

---

## La tesis central de MARAL Sales

> **El cliente B2B colombiano no compra productos. Compra dormir tranquilo.**
>
> Una antena no es metal y bobinas: es la garantía de que el contrato del operador no se cae a las 3am, que el cliente no tiene que subir a un cerro a reparar, que su reputación con el operador final queda intacta.
>
> Vender en MARAL es hacer evidente que esa tranquilidad la fabricamos nosotros — no Syscom, no la importación china, no el ensamblador del barrio.

---

## Reglas duras (resumen)

1. **Nunca vender en el primer mensaje.** Vender es la respuesta a la pregunta del cliente, no la apertura.
2. **Pattern interrupt obligatorio.** El primer mensaje debe romper la expectativa de spam corporativo.
3. **Especificidad > generalidad.** "175 km/h en una torre del Llano" gana a "alta resistencia".
4. **Honestidad > superlativos.** "No somos los más baratos" genera más confianza que "somos los mejores".
5. **El cliente es el héroe.** MARAL es el guía. Si el mensaje habla más de MARAL que del cliente, está mal.
6. **CTA débil > CTA fuerte (en frío).** "¿Le suena?" gana a "Cotice ya".
7. **Voz humana, no corporativa.** "Juan" firma, no "el equipo MARAL".
8. **Curiosidad antes que información.** Abrir loops > cerrar loops.
9. **Una idea por mensaje.** WhatsApp no es correo, no es brochure.
10. **Tiempo de respuesta = trust.** Lead caliente sin atender en 1h pierde 60% probabilidad.
