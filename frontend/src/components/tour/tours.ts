export interface TourStep {
  target: string        // data-tour attribute value (or 'center' for centered)
  title: string
  content: string
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'auto'
  highlightPadding?: number
}

export interface Tour {
  id: string
  title: string
  steps: TourStep[]
}

export const TOURS: Record<string, Tour> = {
  dashboard: {
    id: 'dashboard',
    title: 'Tour del Dashboard',
    steps: [
      {
        target: 'center',
        title: '¡Bienvenidos a MARAL OS! 👋',
        content: 'Esta es la pantalla principal. Aquí verás en tiempo real cómo va la empresa: ventas, pedidos, alertas y actividad del equipo. Te mostramos cada sección en 30 segundos.',
        placement: 'auto',
      },
      {
        target: 'kpi-cards',
        title: 'Métricas del negocio',
        content: 'Estas 4 tarjetas muestran lo más importante: cuánto se ha vendido este mes vs la meta de $40M, cuántos pedidos están activos, cotizaciones pendientes y cartera vencida. Haz clic en cualquiera para ir al módulo.',
        placement: 'bottom',
        highlightPadding: 12,
      },
      {
        target: 'sales-chart',
        title: 'Gráfica de ventas',
        content: 'Muestra la tendencia de ventas de los últimos 6 meses. Si la línea va subiendo, ¡vamos bien! Si baja, es momento de revisar qué está pasando con los clientes.',
        placement: 'top',
        highlightPadding: 12,
      },
      {
        target: 'alerts-section',
        title: 'Alertas del sistema',
        content: '¡Muy importante! Estas alertas aparecen cuando hay algo urgente: stock crítico, pedidos sin confirmar, cotizaciones sin seguimiento. Haz clic en cada alerta para ir directamente a solucionarlo.',
        placement: 'top',
        highlightPadding: 8,
      },
      {
        target: 'activity-log',
        title: 'Actividad reciente',
        content: 'Aquí ves todo lo que hizo el equipo: cotizaciones creadas, pedidos enviados, pagos registrados. Es el historial de la operación del día.',
        placement: 'top',
        highlightPadding: 8,
      },
    ],
  },

  pedidos: {
    id: 'pedidos',
    title: 'Tour de Pedidos',
    steps: [
      {
        target: 'center',
        title: 'Módulo de Pedidos 📦',
        content: 'Aquí se gestiona toda la vida de un pedido: desde que el cliente lo confirma hasta que lo recibe. Funciona como un tablero visual (Kanban) para que todos vean el estado de cada pedido.',
        placement: 'auto',
      },
      {
        target: 'new-order-btn',
        title: 'Crear un pedido nuevo',
        content: 'Haz clic aquí para crear un pedido nuevo. Vas a seleccionar el cliente, agregar los productos, y llenar los datos de envío: dirección, transportadora y quién paga el flete.',
        placement: 'bottom',
        highlightPadding: 8,
      },
      {
        target: 'view-toggle',
        title: 'Dos vistas disponibles',
        content: 'Puedes ver los pedidos en tablero Kanban (ícono de cuadros) o en tabla (ícono de lista). El Kanban es ideal para ver el flujo. La tabla es mejor para buscar un pedido específico.',
        placement: 'bottom',
        highlightPadding: 8,
      },
      {
        target: 'kanban-board',
        title: 'Tablero Kanban — el corazón del módulo',
        content: 'Cada columna es un estado del pedido. Los pedidos se mueven de izquierda a derecha: CONFIRMADO → EN PRODUCCIÓN → EMPACADO → DESPACHADO → ENTREGADO. Así todos saben dónde está cada pedido en tiempo real.',
        placement: 'top',
        highlightPadding: 12,
      },
      {
        target: 'kanban-col-confirmado',
        title: 'Columna: Confirmado',
        content: 'Aquí llegan los pedidos nuevos. Cada tarjeta muestra el cliente, cuántos ítems tiene, el valor y hace cuántos días se creó. Haz clic en la tarjeta para ver todos los detalles.',
        placement: 'right',
        highlightPadding: 8,
      },
    ],
  },

  cotizaciones: {
    id: 'cotizaciones',
    title: 'Tour de Cotizaciones',
    steps: [
      {
        target: 'center',
        title: 'Módulo de Cotizaciones 📄',
        content: 'Aquí se crean y gestionan las cotizaciones para los clientes. Una cotización es una propuesta de precio antes de hacer el pedido. El flujo es: crear → enviar al cliente → el cliente acepta → convertir a pedido.',
        placement: 'auto',
      },
      {
        target: 'new-quotation-btn',
        title: 'Crear cotización',
        content: 'Haz clic aquí para crear una nueva cotización. Seleccionas el cliente, agregas los productos con cantidad y precio, defines la validez y guardas. El sistema le asigna un número automáticamente.',
        placement: 'bottom',
        highlightPadding: 8,
      },
      {
        target: 'quotation-search',
        title: 'Buscar cotizaciones',
        content: 'Escribe el nombre del cliente o el número de cotización para encontrarla rápido. No necesitas hacer scroll por toda la lista.',
        placement: 'bottom',
        highlightPadding: 8,
      },
      {
        target: 'status-tabs',
        title: 'Filtrar por estado',
        content: 'Usa estas pestañas para ver solo las cotizaciones en un estado específico. Por ejemplo, "Enviada" te muestra las que están esperando respuesta del cliente — son las que necesitan seguimiento.',
        placement: 'bottom',
        highlightPadding: 8,
      },
      {
        target: 'quotation-table',
        title: 'Lista de cotizaciones',
        content: 'Cada fila es una cotización. El punto naranja indica que el seguimiento ya venció — hay que llamar al cliente. Haz clic en cualquier fila para ver el detalle o editarla. El botón verde "→ Pedido" convierte la cotización a pedido cuando el cliente acepta.',
        placement: 'top',
        highlightPadding: 8,
      },
    ],
  },

  clientes: {
    id: 'clientes',
    title: 'Tour de Clientes',
    steps: [
      {
        target: 'center',
        title: 'Módulo de Clientes (CRM) 👥',
        content: 'Aquí está toda la información de los clientes de Maral. Puedes ver su historial de compras, cupo de crédito disponible, estado del factoring y crear cotizaciones directamente desde su ficha.',
        placement: 'auto',
      },
      {
        target: 'new-client-btn',
        title: 'Agregar un cliente nuevo',
        content: 'Haz clic aquí para registrar un cliente nuevo. Llenas nombre, NIT, teléfono, WhatsApp, email, ciudad y la categoría (Fundador, Aliado o Prospecto). También defines el cupo de crédito y los días de plazo de pago.',
        placement: 'bottom',
        highlightPadding: 8,
      },
      {
        target: 'client-search',
        title: 'Buscar un cliente',
        content: 'Escribe el nombre o empresa para encontrar el cliente. También puedes filtrar por ciudad o categoría.',
        placement: 'bottom',
        highlightPadding: 8,
      },
      {
        target: 'client-list',
        title: 'Lista de clientes',
        content: 'Haz clic en cualquier cliente para ver su ficha completa: historial de pedidos, cotizaciones activas, facturas pendientes y cuánto cupo de crédito tiene disponible. Todo en un solo lugar.',
        placement: 'top',
        highlightPadding: 8,
      },
    ],
  },

  inventario: {
    id: 'inventario',
    title: 'Tour de Inventario',
    steps: [
      {
        target: 'center',
        title: 'Módulo de Inventario 📊',
        content: 'Aquí ves el stock de todos los productos en tiempo real. Los productos en rojo tienen stock por debajo del mínimo y necesitan reposición. Se actualiza automáticamente cuando entran o salen materiales.',
        placement: 'auto',
      },
      {
        target: 'register-movement-btn',
        title: 'Registrar un movimiento',
        content: 'Usa este botón para registrar cuando llega mercancía (ENTRADA), sale material para producción (SALIDA), o necesitas corregir el conteo (AJUSTE). Siempre escribe el motivo para tener trazabilidad.',
        placement: 'bottom',
        highlightPadding: 8,
      },
      {
        target: 'inventory-list',
        title: 'Lista de productos',
        content: 'Cada fila muestra el producto, su stock actual, el mínimo requerido y la línea de producto. Los que están en rojo son críticos — hay que ordenarlos en Compras.',
        placement: 'top',
        highlightPadding: 8,
      },
    ],
  },

  produccion: {
    id: 'produccion',
    title: 'Tour de Producción',
    steps: [
      {
        target: 'center',
        title: 'Módulo de Producción 🏭',
        content: 'Aquí se gestionan las órdenes internas de fabricación. Cuando hay un pedido que requiere fabricar piezas, se crea una orden de producción y se asigna a Angelo o Iván. El flujo es: Pendiente → En Proceso → Terminado → Empacado.',
        placement: 'auto',
      },
      {
        target: 'new-production-btn',
        title: 'Crear orden de producción',
        content: 'Haz clic aquí para crear una nueva orden. Seleccionas el producto a fabricar, la cantidad, la fase en que inicia (Básico, Preensamble o Ensamble Final), a quién se asigna y la fecha en que debe estar listo.',
        placement: 'bottom',
        highlightPadding: 8,
      },
      {
        target: 'production-phases',
        title: 'Las 3 fases de producción',
        content: 'Maral produce en 3 fases: Procesos Básicos (cortes, dobleces, perforaciones), Preensamble (bobinas, racores, sub-ensambles) y Ensamble Final (producto terminado listo para empacar). Cada número muestra cuántas órdenes hay activas en esa fase.',
        placement: 'bottom',
        highlightPadding: 12,
      },
      {
        target: 'production-table',
        title: 'Tabla de órdenes activas',
        content: 'Cada fila es una orden de producción. El botón "→" avanza el estado al siguiente paso. Cuando una orden llega a "Empacado", el pedido puede despacharse.',
        placement: 'top',
        highlightPadding: 8,
      },
    ],
  },

  compras: {
    id: 'compras',
    title: 'Tour de Compras',
    steps: [
      {
        target: 'center',
        title: 'Módulo de Compras 🛒',
        content: 'Aquí se gestionan las órdenes de compra a proveedores. Cuando el inventario está bajo, se genera una orden de compra para reponer. El sistema te avisa automáticamente qué productos están en stock crítico.',
        placement: 'auto',
      },
      {
        target: 'new-purchase-btn',
        title: 'Nueva orden de compra',
        content: 'Haz clic aquí para crear una orden de compra. Seleccionas el proveedor, agregas los productos que necesitas con sus cantidades y costos, y el sistema calcula el total automáticamente.',
        placement: 'bottom',
        highlightPadding: 8,
      },
      {
        target: 'critical-alert',
        title: 'Alerta de stock crítico',
        content: 'Cuando hay productos por debajo del mínimo, aparece esta alerta en rojo. El botón "Crear orden urgente" agrega automáticamente todos esos productos a la orden de compra con las cantidades necesarias para volver al mínimo.',
        placement: 'bottom',
        highlightPadding: 8,
      },
      {
        target: 'purchases-table',
        title: 'Órdenes de compra',
        content: 'Cada fila es una orden enviada a un proveedor. Cuando llegue la mercancía al almacén, haz clic en "Recibir" — esto actualiza el inventario automáticamente y cierra la orden.',
        placement: 'top',
        highlightPadding: 8,
      },
    ],
  },

  credito: {
    id: 'credito',
    title: 'Tour de Crédito y Cartera',
    steps: [
      {
        target: 'center',
        title: 'Módulo de Crédito y Cartera 💳',
        content: 'Aquí se controla toda la cartera de Maral: qué clientes deben, cuánto tienen disponible de cupo, qué facturas están vencidas y el estado del factoring con FINANCIA. Es clave para no dejar que la cartera crezca sin control.',
        placement: 'auto',
      },
      {
        target: 'credit-kpis',
        title: 'Resumen de cartera',
        content: 'Tres números clave: Cartera Vigente (facturas dentro del plazo), Cartera Vencida (facturas con mora — ¡requieren acción inmediata!) y Próximos 7 días (lo que vence pronto para anticiparse).',
        placement: 'bottom',
        highlightPadding: 12,
      },
      {
        target: 'credit-rules',
        title: 'Reglas de crédito FINANCIA',
        content: 'Maral usa factoring con FINANCIA. Las reglas son claras: 3 pagos puntuales = sube el cupo; 1 retraso = baja el cupo; 2 retrasos = solo contado. Esto define si se puede vender a crédito o no.',
        placement: 'bottom',
        highlightPadding: 8,
      },
      {
        target: 'credit-invoices',
        title: 'Facturas por cobrar',
        content: 'Lista de todas las facturas pendientes. Las filas en rojo están vencidas. Para registrar cuando un cliente paga, haz clic en "Registrar pago" — esto actualiza el cupo disponible automáticamente.',
        placement: 'top',
        highlightPadding: 8,
      },
    ],
  },

  catalogo: {
    id: 'catalogo',
    title: 'Tour del Catálogo',
    steps: [
      {
        target: 'center',
        title: 'Catálogo de Productos 📦',
        content: 'Aquí están todos los productos que vende Maral con sus precios, costos y márgenes. Es el corazón del negocio — desde aquí se consulta la información para cotizaciones y pedidos.',
        placement: 'auto',
      },
      {
        target: 'new-product-btn',
        title: 'Agregar producto nuevo',
        content: 'Haz clic para registrar un producto nuevo. Llenas referencia, nombre, categoría, precio lista, precio distribuidor, costo y stock mínimo. El sistema calcula el margen automáticamente.',
        placement: 'bottom',
        highlightPadding: 8,
      },
      {
        target: 'catalog-filters',
        title: 'Filtrar por línea',
        content: 'Usa los botones de línea para ver solo los productos de Estación Base, Móvil, Handy, Cables, etc. También puedes buscar por nombre o referencia en el campo de búsqueda.',
        placement: 'bottom',
        highlightPadding: 8,
      },
      {
        target: 'catalog-grid',
        title: 'Tarjetas de productos',
        content: 'Cada tarjeta muestra el precio de lista, el costo y el margen. Verde = margen ≥50% (excelente), Azul = ≥30% (bueno), Naranja = <30% (revisar). El badge rojo "Crítico" indica stock bajo. Haz clic en una tarjeta para editar el producto.',
        placement: 'top',
        highlightPadding: 8,
      },
    ],
  },

  reportes: {
    id: 'reportes',
    title: 'Tour de Reportes',
    steps: [
      {
        target: 'center',
        title: 'Módulo de Reportes 📈',
        content: 'Aquí puedes analizar el negocio en detalle: ventas por período, por línea de producto, top clientes, y métricas operativas. Selecciona el rango de fechas que quieras analizar.',
        placement: 'auto',
      },
      {
        target: 'reports-date-range',
        title: 'Rango de fechas',
        content: 'Define el período a analizar. Puedes ver el último mes, el trimestre, el año, o cualquier rango personalizado. Los datos se actualizan automáticamente al cambiar las fechas.',
        placement: 'bottom',
        highlightPadding: 8,
      },
      {
        target: 'reports-tabs',
        title: 'Ventas vs Operaciones',
        content: 'La pestaña Ventas muestra ingresos, pedidos, ticket promedio y clientes únicos con gráficas. La pestaña Operaciones muestra pedidos despachados, pendientes y tiempos de entrega.',
        placement: 'bottom',
        highlightPadding: 8,
      },
      {
        target: 'reports-content',
        title: 'Exportar a Excel',
        content: 'Cada sección tiene un botón CSV para descargar los datos en Excel. Útil para compartir con el equipo o hacer análisis más profundos fuera de la plataforma.',
        placement: 'top',
        highlightPadding: 8,
      },
    ],
  },

  tareas: {
    id: 'tareas',
    title: 'Tour de Tareas',
    steps: [
      {
        target: 'center',
        title: 'Módulo de Tareas ✅',
        content: 'Aquí centralizas los pendientes del equipo: quién hace qué, para cuándo, y con qué prioridad. Es el tablero compartido de la operación del día.',
        placement: 'auto',
      },
      {
        target: 'tasks-new-btn',
        title: 'Crear una tarea',
        content: 'Pulsa "Nueva Tarea" para abrir el formulario: título, descripción, prioridad (Urgente/Normal/Después), responsable y fecha límite. Incluye chips de fecha rápida (Hoy, Mañana, 3 días).',
        placement: 'bottom',
        highlightPadding: 8,
      },
      {
        target: 'tasks-filters',
        title: 'Filtros por estado y prioridad',
        content: 'Filtra por estado (Pendientes, En Progreso, Completadas) y prioridad. Útil para enfocarte en lo urgente o revisar lo que ya se cerró.',
        placement: 'bottom',
        highlightPadding: 8,
      },
      {
        target: 'tasks-list',
        title: 'Completar y eliminar',
        content: 'Marca la tarea como completada con el círculo verde a la izquierda. El icono de papelera elimina la tarea (solo quien la creó o el gerente).',
        placement: 'top',
        highlightPadding: 8,
      },
    ],
  },

  gastos: {
    id: 'gastos',
    title: 'Tour de Gastos',
    steps: [
      {
        target: 'center',
        title: 'Módulo de Gastos 💰',
        content: 'Aquí registras los gastos del día (caja menor y tarjeta). El gerente aprueba cada gasto; así mantenemos control real del flujo de caja.',
        placement: 'auto',
      },
      {
        target: 'expenses-new-btn',
        title: 'Registrar un gasto',
        content: 'Pulsa "Nuevo Gasto" y llena concepto, monto, tipo (Caja Menor / Tarjeta) y fecha. El gasto queda pendiente de aprobación del gerente.',
        placement: 'bottom',
        highlightPadding: 8,
      },
      {
        target: 'expenses-summary',
        title: 'Resumen rápido',
        content: 'Las 3 tarjetas muestran el total del mes por tipo (Caja Menor, Tarjeta y Total). Te dicen en qué se está yendo la plata hoy.',
        placement: 'bottom',
        highlightPadding: 8,
      },
    ],
  },

  campanas: {
    id: 'campanas',
    title: 'Tour de Campañas WhatsApp',
    steps: [
      {
        target: 'center',
        title: 'Campañas de WhatsApp',
        content: 'Aquí creas y lanzas secuencias automáticas de mensajes a tus clientes. Puedes segmentar por tipo de cliente, intereses y actividad reciente.',
        placement: 'auto',
      },
      {
        target: 'campaigns-new',
        title: 'Nueva campaña',
        content: 'Empieza aquí. Le das nombre, escribes los mensajes paso a paso, y configuras a quién va dirigida.',
        placement: 'bottom',
        highlightPadding: 8,
      },
      {
        target: 'campaigns-filters',
        title: 'Filtros',
        content: 'Busca por nombre o filtra por estado: Borrador, En curso, Pausada, Completada.',
        placement: 'bottom',
        highlightPadding: 8,
      },
      {
        target: 'campaigns-table',
        title: 'Lista de campañas',
        content: 'Cada fila muestra destinatarios, mensajes enviados y tasa de respuesta. Haz clic en una campaña para editarla o ver el estado en vivo.',
        placement: 'top',
        highlightPadding: 8,
      },
    ],
  },

  composer: {
    id: 'composer',
    title: 'Tour del Composer de campaña',
    steps: [
      {
        target: 'center',
        title: 'El Composer',
        content: 'Esta es la herramienta para diseñar tu campaña. Tienes tres paneles: pasos (izquierda), preview (centro) y audiencia (derecha).',
        placement: 'auto',
      },
      {
        target: 'composer-steps',
        title: 'Pasos de la campaña',
        content: 'Agrega mensajes de texto, imágenes, videos, audios o documentos. Cada paso tiene un delay — cuántos segundos esperar antes de enviarlo.',
        placement: 'right',
        highlightPadding: 8,
      },
      {
        target: 'composer-preview',
        title: 'Preview en tiempo real',
        content: 'Así verá el cliente los mensajes en WhatsApp. Las variables como {primerNombre} se reemplazarán con el dato real de cada cliente.',
        placement: 'left',
        highlightPadding: 8,
      },
      {
        target: 'composer-audience',
        title: 'Audiencia y lanzamiento',
        content: 'Filtra por segmento (Importador, Distribuidor, Cliente Final) y por intereses. Calcula la audiencia y cuando estés listo, lanza la campaña.',
        placement: 'left',
        highlightPadding: 8,
      },
    ],
  },
}
