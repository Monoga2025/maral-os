# Anti-patterns — lo que mata campañas

Lista negra. Frases, formatos y momentos prohibidos. Cada anti-patrón explica el porqué y muestra la versión correcta.

---

## Anti-patrones de apertura

### ❌ "Hola, le escribe Juan de MARAL Tecnología, somos una empresa con 22 años…"

**Por qué mata:** Patrón corporativo reconocido en 0.4s. Cerebro filtra como spam.
**Tasa de respuesta esperada:** <2%
**Versión correcta:**
✅ "Juan, no le escribo para venderle nada hoy. Le escribo para que tenga este número guardado…"

---

### ❌ "🚀 ¡APROVECHE NUESTRA OFERTA ÚNICA! 🎉"

**Por qué mata:** Caps + emojis + "oferta única" = bandera roja. Filtros de spam de WhatsApp lo detectan.
**Tasa de respuesta esperada:** <0.5%
**Versión correcta:**
✅ "Juan, una pregunta de ingeniero a ingeniero: ¿le ha pasado que…?"

---

### ❌ "Estimado señor Juan Pérez González, muy buenos días…"

**Por qué mata:** Suena a Mail Merge / oficio formal. WhatsApp es informal estructurado, no formal almidonado.
**Versión correcta:**
✅ "Juan, [hook directo]"
o ✅ "Don Juan, [hook directo]" si es muy senior y formal el sector

---

### ❌ "Reciba un cordial saludo de la familia MARAL…"

**Por qué mata:** "Familia MARAL" suena a catálogo de electrodomésticos. Cero diferenciación. Despierta defensa antimanipulación.
**Versión correcta:**
✅ "Juan, le escribo desde Curití directamente."

---

## Anti-patrones de copywriting

### ❌ "Tenemos las mejores antenas del mercado, calidad insuperable, garantía total."

**Por qué mata:** Adjetivos vacíos sin datos. "Mejor", "insuperable", "total" no significan nada hasta que se cuantifican.
**Versión correcta:**
✅ "Hace 22 años fabricamos antenas con 5 años de garantía escrita y 175 km/h soportados."

---

### ❌ "Estaríamos muy interesados en poder ofrecerle…"

**Por qué mata:** Condicional + gerundio + suavizador = oración floja. El comprador B2B colombiano lee floja como "no sabe bien lo que vende".
**Versión correcta:**
✅ "Le ofrezco la P-224F. Esto resuelve…"

---

### ❌ Mensajes de 6+ líneas con 4 datos diferentes

**Por qué mata:** WhatsApp móvil = scroll = abandono. La atención se pierde en línea 3.
**Versión correcta:**
✅ Partir en 2-3 mensajes con delays. Una idea por mensaje.

---

### ❌ "Ofrecemos soluciones integrales con valor agregado y experiencia diferencial."

**Por qué mata:** Corporativismo vacío. No dice nada concreto.
**Versión correcta:**
✅ "Fabricamos antenas VHF/UHF en Curití desde 2003. Vendemos directo, sin intermediarios."

---

## Anti-patrones de CTA

### ❌ CTA fuerte en frío

"COTICE YA, OFERTA ÚNICA POR HOY" en mensaje 1 a un cliente que nunca ha respondido = pérdida garantizada.
**Versión correcta:**
✅ Frío: "Guarde el número, cuando le toque me escribe."
✅ Tibio: "¿Le envío la ficha?"
✅ Caliente: "¿Cotizamos?"

---

### ❌ Múltiples preguntas en un CTA

"¿Le interesa la P-224F? ¿Para qué ciudad? ¿Cuántas unidades? ¿Qué frecuencia? ¿Cuándo la necesita?"
**Por qué mata:** Parálisis. La mente del cliente NO va a responder 5 preguntas en frío.
**Versión correcta:**
✅ Una pregunta por mensaje. Avanzar en escalera.

---

### ❌ CTA escondido

"Si por alguna razón le interesara obtener mayor información, podríamos eventualmente conversar al respecto en algún momento."
**Por qué mata:** No hay verbo de acción claro. El cliente no sabe qué hacer.
**Versión correcta:**
✅ "¿Le mando la ficha?" (verbo, claro, micro-compromiso)

---

## Anti-patrones de timing

### ❌ Enviar a las 11pm

**Por qué mata:** Intrusivo. Despierta defensas. Asume bot/spam.
**Versión correcta:** Solo 7am-8pm en días hábiles. Idealmente 9am-11am o 2pm-4pm.

---

### ❌ Enviar domingo

**Por qué mata:** B2B colombiano lee domingo como "este vendedor no respeta tiempo personal".
**Versión correcta:** Lunes 9:30am.

---

### ❌ Enviar mensaje 2 inmediatamente después del 1

**Por qué mata:** Rompe la pausa narrativa. Sobrecarga cognitiva.
**Versión correcta:** 18-25 segundos entre mensajes 1 y 2 (con delay aleatorio anti-ban).

---

### ❌ Esperar 6 días para responder un lead caliente

**Por qué mata:** Estudios InsideSales: probabilidad de cierre cae 7× después de 1ra hora. En Colombia, peor.
**Versión correcta:** SLA: HOT <30min, WARM <2h, COLD <24h.

---

## Anti-patrones de segmentación

### ❌ Mismo mensaje a 1,384 clientes

**Por qué mata 1:** WhatsApp Cloud API detecta y banea.
**Por qué mata 2:** Cero personalización = cero respuesta.
**Versión correcta:** Variar al menos `{primerNombre}` y `{ciudad}`. Diferentes mensajes para IM/DS/CF.

---

### ❌ Enviar campaña de antenas VHF a un cliente que solo compra cables

**Por qué mata:** Irrelevancia. El cliente lo vive como spam por desconocimiento.
**Versión correcta:** Filtrar por `interestTags` derivados del histórico Merlin. Solo enviar a quienes compraron afines.

---

### ❌ Enviar a quien dijo "no" hace una semana

**Por qué mata:** Acoso. Activa opt-out o reclamo.
**Versión correcta:** Si dice "no por ahora", esperar mínimo 60 días + cambio de contexto.

---

### ❌ Enviar a optedOut

**Por qué mata:** Ilegal (Habeas Data en Colombia, GDPR-like). Y antiético.
**Versión correcta:** `optedOut: true` → bloqueo permanente en código. Sin excepciones.

---

## Anti-patrones de objeciones

### ❌ Defensividad ante "está caro"

"Pero es que nuestros costos de fabricación son muy altos, las materias primas suben…"
**Por qué mata:** El cliente no compra excusas, compra valor. Suena a justificación.
**Versión correcta:**
✅ "Tiene razón en el precio inicial. Hagamos el cálculo TCO completo, le muestro por qué a 5 años queda 40% más bajo."

---

### ❌ Discutir con el cliente

"No es cierto que las nuestras sean caras, en realidad son…"
**Por qué mata:** Activa "reactancia psicológica" — el cliente se cierra más.
**Versión correcta:**
✅ "Acepto, en lista inicial somos más caros. Le explico por qué tiene sentido."

---

### ❌ Hablar mal de la competencia por nombre

"Las de Syscom son chinas disfrazadas, no duran nada."
**Por qué mata:** Suena resentido. Baja credibilidad propia. Riesgo legal.
**Versión correcta:**
✅ "Las antenas importadas en general tienen entre 12-24 meses de vida útil. Las nuestras 8-12 años verificados. Le mando los datos."

---

### ❌ Insistir cuando el cliente ya dijo no

3 mensajes seguidos de "¿pero seguro que no le interesa?" = bloqueo + reportar como spam.
**Versión correcta:**
✅ "Entendido. Cuando llegue el momento, me ubica acá." → silencio respetuoso → reactivar a 60+ días con contexto nuevo.

---

## Anti-patrones de imagen/multimedia

### ❌ Voice note en frío

**Por qué mata:** Intrusivo. Obliga a parar lo que hace para escuchar.
**Versión correcta:** Voice note solo en clientes que ya respondieron 2+ veces.

---

### ❌ Ficha técnica de 12 páginas como primer adjunto

**Por qué mata:** Sobrecarga. El cliente abre, ve PDF largo, cierra, no vuelve.
**Versión correcta:** Imagen única con 4-5 datos clave. PDF formal solo después de respuesta positiva.

---

### ❌ Stickers / GIFs / memes

**Por qué mata:** B2B Colombia (especialmente >40 años) lee como falta de seriedad.
**Versión correcta:** 0-1 emoji funcional. Cero stickers/GIFs/memes hasta cliente muy informal.

---

### ❌ Fotos de catálogo / stock photos

**Por qué mata:** Suena a comercio masivo. No diferencia.
**Versión correcta:** Foto real del producto en instalación real, mejor con contexto colombiano (sitio en cerro, torre operador).

---

## Anti-patrones de proceso interno

### ❌ Dejar caer un lead 48h sin responder

**Por qué mata:** Probabilidad de cierre cae a 14% del original.
**Versión correcta:** Marco alerta a John/Lady automáticamente cuando un lead pasa SLA.

---

### ❌ Enviar campaña sin tagging por temperatura

**Por qué mata:** Ceguera de métricas. No sabes qué funciona.
**Versión correcta:** Cada respuesta se clasifica HOT/WARM/COLD/OPTOUT en el dashboard de Marco.

---

### ❌ A/B test con muestra de <50 contactos por variante

**Por qué mata:** Resultados estadísticamente irrelevantes. Decidir basado en ruido.
**Versión correcta:** Mínimo 100 por variante. Idealmente 200+.

---

### ❌ Lanzar campaña sin "punto de salida limpio"

**Por qué mata:** Si después de 4 mensajes el cliente respondió "no", ¿qué pasa? Si Marco sigue mandando, te bloquea.
**Versión correcta:** Toda secuencia tiene rama de salida (silencio respetuoso, opt-out automático, reactivación a +60 días).

---

## Anti-patrones de análisis

### ❌ Medir solo "mensajes enviados"

Vanity metric. No predice ventas.
**Versión correcta:** Medir response rate, conversion to quote, conversion to order, ciclo de tiempo.

---

### ❌ Medir solo conversiones inmediatas

En B2B con ciclo 8-12 meses, el éxito de una campaña no se ve en 7 días.
**Versión correcta:** Medir 3 ventanas: inmediato (0-30d), medio plazo (30-180d), largo plazo (180-365d).

---

### ❌ Atribuir 100% de la venta a "última campaña"

Mata el aprendizaje real. La compra es resultado de exposición acumulada (efecto familiaridad).
**Versión correcta:** Atribución multi-touch — cada campaña que tocó al cliente recibe % proporcional.

---

## Resumen — la lista negra de Marco

Cuando Marco genera un mensaje, lo rechaza automáticamente si detecta:

```
[ ] Saludo formal "Estimado/Reciba un cordial saludo"
[ ] Caps lock para énfasis
[ ] Más de 1 emoji
[ ] Frases prohibidas: "OFERTA ÚNICA", "ÚLTIMAS UNIDADES", "APROVECHE YA"
[ ] Adjetivos sin dato ("mejor", "insuperable", "total")
[ ] Más de 5 líneas en un mensaje
[ ] CTA fuerte en mensaje frío
[ ] Múltiples preguntas en un mensaje
[ ] Anglicismos evitables
[ ] "El cual / la cual"
[ ] Gerundios encadenados
[ ] Plata en formato gringo ($1,300,000)
[ ] Variable {placeholder} sin valor real
[ ] Mensaje 100% idéntico a >100 contactos
[ ] Envío fuera de horario (antes 7am, después 8pm, festivos, domingo)
```

Si pasa los 15 filtros → mensaje listo.
Si falla 1+ → regenera explicando qué filtro violó.
