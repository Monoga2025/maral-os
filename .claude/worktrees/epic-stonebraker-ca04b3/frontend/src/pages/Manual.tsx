import { useRef } from 'react'
import {
  BookOpen, Download, LayoutDashboard, Users, FileText, Package,
  Factory, BarChart3, ShoppingCart, CreditCard, Grid3X3,
  ChevronRight, AlertTriangle, CheckCircle2, Info, Star,
} from 'lucide-react'

const modules = [
  {
    id: 'dashboard',
    icon: <LayoutDashboard size={20} />,
    color: 'bg-blue-600',
    title: 'Dashboard',
    subtitle: 'Vista general de la empresa en tiempo real',
    sections: [
      {
        heading: '¿Qué muestra el Dashboard?',
        content: 'El dashboard es la pantalla principal que verás al iniciar sesión. Muestra un resumen completo del estado actual del negocio con métricas actualizadas automáticamente.',
        items: [
          'Ventas del mes actual vs meta mensual',
          'Pedidos activos por estado',
          'Cotizaciones pendientes de seguimiento',
          'Stock crítico (productos por debajo del mínimo)',
          'Cartera vencida y próxima a vencer',
          'Gráfica de ventas de los últimos 6 meses',
          'Actividad reciente del equipo',
        ],
      },
      {
        heading: 'Alertas importantes',
        type: 'warning',
        items: [
          'Tarjeta roja "Cartera Vencida": hay facturas sin pagar después de la fecha de vencimiento. Ir a Crédito para gestionar.',
          'Tarjeta naranja "Stock Crítico": productos por debajo del mínimo. Ir a Compras para ordenar.',
          'Tarjeta amarilla "Seguimientos": cotizaciones enviadas sin respuesta del cliente. Contactar al cliente.',
          'Tarjeta azul "Sin Confirmar": pedidos creados pero no confirmados por el cliente.',
        ],
      },
      {
        heading: 'Ejemplo de uso — John (Gerente)',
        type: 'example',
        content: 'Cada mañana John entra al Dashboard y revisa: ¿Cuánto llevamos vendido este mes? ¿Hay pedidos atrasados? ¿Hay clientes con cartera vencida? Con esto planifica el día sin necesitar llamar a nadie del equipo.',
      },
    ],
  },
  {
    id: 'clientes',
    icon: <Users size={20} />,
    color: 'bg-violet-600',
    title: 'Clientes',
    subtitle: 'Gestión del CRM y base de clientes',
    sections: [
      {
        heading: 'Cómo crear un cliente nuevo',
        steps: [
          'Hacer clic en "Nuevo Cliente" (botón azul, arriba a la derecha)',
          'Llenar el nombre completo o nombre de la empresa',
          'Ingresar NIT/RUT, teléfono, WhatsApp y correo',
          'Seleccionar la ciudad',
          'Elegir la categoría del cliente (ver abajo)',
          'Definir el cupo de crédito en pesos COP (ej: $5.000.000)',
          'Indicar los días de plazo de pago (ej: 30, 60, 90 días)',
          'Hacer clic en "Guardar"',
        ],
      },
      {
        heading: 'Categorías de clientes',
        type: 'info',
        items: [
          'FUNDADOR HISTÓRICO: Clientes de más de 10 años, estratégicos, máxima prioridad',
          'FUNDADOR MARAL: Clientes fundadores de la nueva etapa de la empresa',
          'ALIADO: Clientes recurrentes y confiables con buen historial de pago',
          'PROSPECTO: Clientes nuevos o potenciales, aún en etapa de conocer',
        ],
      },
      {
        heading: 'Cómo ver el detalle de un cliente',
        steps: [
          'Buscar el cliente por nombre en la barra de búsqueda',
          'Hacer clic sobre el nombre del cliente en la lista',
          'Se abre la ficha completa con: historial de pedidos, cotizaciones, facturas, cupo de crédito disponible y estado del factoring',
        ],
      },
      {
        heading: 'Ejemplo de uso — Lady (Ventas)',
        type: 'example',
        content: 'Lady recibe una llamada de Meltec pidiendo precios. Busca "Meltec" en Clientes, ve que tiene $8M de cupo disponible, que su factoring está ACTIVO y que su último pedido fue hace 45 días. Con esa información crea la cotización directamente desde la ficha del cliente.',
      },
    ],
  },
  {
    id: 'cotizaciones',
    icon: <FileText size={20} />,
    color: 'bg-emerald-600',
    title: 'Cotizaciones',
    subtitle: 'Crear, enviar y hacer seguimiento de cotizaciones',
    sections: [
      {
        heading: 'Cómo crear una cotización',
        steps: [
          'Ir a Cotizaciones → clic en "Nueva Cotización"',
          'Seleccionar el cliente de la lista (buscar por nombre)',
          'El sistema asigna automáticamente el número de cotización',
          'Agregar productos: escribir el nombre o referencia y seleccionar de la lista',
          'Para cada producto: ingresar cantidad y precio unitario',
          'Aplicar descuento si corresponde (campo % descuento)',
          'Revisar el subtotal y total calculados automáticamente',
          'Definir los días de validez (ej: 15 días)',
          'Agregar observaciones si el cliente lo requiere',
          'Hacer clic en "Guardar como Borrador" o "Enviar"',
        ],
      },
      {
        heading: 'Estados de una cotización',
        type: 'info',
        items: [
          'BORRADOR: Creada pero no enviada al cliente todavía',
          'ENVIADA: Se marcó como enviada, el cliente la tiene en su correo/WhatsApp',
          'VISTA: El cliente confirmó que la vio (actualizar manualmente)',
          'ACEPTADA: El cliente aprobó la cotización → convertir a pedido',
          'RECHAZADA: El cliente no quiso comprar → registrar el motivo en notas',
          'EXPIRADA: Pasaron los días de validez sin respuesta',
        ],
      },
      {
        heading: 'Convertir cotización a pedido',
        steps: [
          'Abrir la cotización aceptada',
          'Hacer clic en el botón "Convertir a Pedido"',
          'El sistema crea automáticamente el pedido con los mismos productos y precios',
          'Completar los datos de envío: dirección, ciudad, transportadora',
          'Confirmar el pedido',
        ],
      },
      {
        heading: 'Ejemplo de uso — Lady (Ventas)',
        type: 'example',
        content: 'Lady llama a ISEC para hacer seguimiento de la cotización C-2024-0032 enviada hace 5 días. ISEC dice que la acepta. Lady abre la cotización, cambia el estado a ACEPTADA y hace clic en "Convertir a Pedido". En 30 segundos el pedido P-2024-0087 está creado y aparece en el kanban de Pedidos para que Anyelo lo procese.',
      },
    ],
  },
  {
    id: 'pedidos',
    icon: <Package size={20} />,
    color: 'bg-orange-500',
    title: 'Pedidos',
    subtitle: 'Tablero Kanban y gestión del flujo de pedidos',
    sections: [
      {
        heading: 'El tablero Kanban — Vista principal',
        content: 'Los pedidos se mueven de izquierda a derecha por 5 columnas que representan el estado del pedido:',
        items: [
          'CONFIRMADO: Pedido recibido y confirmado, listo para producción',
          'EN PRODUCCIÓN: Los operarios están fabricando el producto',
          'EMPACADO: El producto está listo y empacado para despachar',
          'DESPACHADO: Ya salió con la transportadora, tiene guía',
          'ENTREGADO: El cliente lo recibió satisfactoriamente',
        ],
      },
      {
        heading: 'Cómo avanzar un pedido de estado',
        steps: [
          'En la tarjeta del pedido, hacer clic en "Avanzar →"',
          'El pedido pasa automáticamente al siguiente estado',
          'También se puede cambiar el estado desde el detalle del pedido',
          'Registrar el número de guía cuando se despache (campo Guía)',
        ],
      },
      {
        heading: 'Cómo crear un pedido nuevo (sin cotización)',
        steps: [
          'Clic en "Nuevo Pedido"',
          'Seleccionar el cliente',
          'Agregar productos con cantidad y precio',
          'Llenar datos de envío: nombre del destinatario, dirección, ciudad, teléfono',
          'Seleccionar transportadora (ej: Servientrega, TCC, Coordinadora)',
          'Indicar quién paga el flete y cómo (contra-entrega, prepago)',
          'Guardar — el pedido aparece en la columna CONFIRMADO',
        ],
      },
      {
        heading: 'Vista en tabla',
        content: 'Hacer clic en el ícono de tabla (arriba a la derecha) para ver todos los pedidos en formato lista. Útil para buscar un pedido específico o ver todos a la vez.',
      },
      {
        heading: 'Ejemplo de uso — Anyelo (Logística)',
        type: 'example',
        content: 'Anyelo llega a las 7am y abre Pedidos. Ve que hay 3 pedidos en EMPACADO. Los revisa, llama a Servientrega para el recogido, registra los números de guía en cada pedido y hace clic en "Avanzar" para pasarlos a DESPACHADO. El sistema registra automáticamente la hora y el usuario que hizo el cambio.',
      },
    ],
  },
  {
    id: 'inventario',
    icon: <BarChart3 size={20} />,
    color: 'bg-cyan-600',
    title: 'Inventario',
    subtitle: 'Control de stock y movimientos de materiales',
    sections: [
      {
        heading: 'Ver el inventario actual',
        steps: [
          'Ir a Inventario en el menú lateral',
          'Se muestra la lista de todos los productos con su stock actual',
          'Los productos con stock crítico (por debajo del mínimo) aparecen resaltados en rojo',
          'Usar la barra de búsqueda para encontrar un producto específico',
          'Filtrar por línea de producto (Estación Base, Móvil, Handy, etc.)',
        ],
      },
      {
        heading: 'Registrar un movimiento de inventario',
        steps: [
          'Hacer clic en "Registrar Movimiento"',
          'Seleccionar el tipo: ENTRADA (llegó mercancía), SALIDA (salió material), AJUSTE (corrección de conteo)',
          'Seleccionar el producto',
          'Ingresar la cantidad',
          'Escribir el motivo (ej: "Compra orden OC-2024-0012", "Ajuste conteo físico")',
          'Guardar — el stock se actualiza automáticamente',
        ],
      },
      {
        heading: 'Ejemplo de uso — Anyelo (Producción)',
        type: 'example',
        content: 'Llegó un pedido de 50 conectores PL-259 de Multivoltex. Anyelo va a Inventario → Registrar Movimiento → ENTRADA → selecciona "Conector PL-259" → cantidad 50 → motivo "OC-2024-0008 Multivoltex". El stock sube de 12 a 62 unidades automáticamente.',
      },
    ],
  },
  {
    id: 'produccion',
    icon: <Factory size={20} />,
    color: 'bg-red-600',
    title: 'Producción',
    subtitle: 'Órdenes de producción y fases de fabricación',
    sections: [
      {
        heading: 'Ver las órdenes de producción',
        content: 'En la pantalla de Producción se listan todas las órdenes activas con su estado: PENDIENTE, EN PROCESO, TERMINADO o EMPACADO. Cada orden indica el producto, la cantidad, la fase actual y la fecha requerida.',
      },
      {
        heading: 'Fases de producción MAXANT',
        type: 'info',
        items: [
          'BÁSICO: Preparación de componentes y materiales',
          'PREENSAMBLE: Integración de partes y subcomponentes',
          'ENSAMBLE FINAL: Producto terminado listo para empaque',
        ],
      },
      {
        heading: 'Cómo avanzar una orden de producción',
        steps: [
          'Hacer clic sobre la orden de producción',
          'Ver los detalles: producto, cantidad, materiales disponibles',
          'Cambiar el estado a EN PROCESO cuando se comienza a fabricar',
          'Cambiar a TERMINADO cuando el producto está listo',
          'Cambiar a EMPACADO cuando ya está empacado para despacho',
          'Agregar fotos del proceso si se requiere evidencia',
        ],
      },
      {
        heading: 'Ejemplo de uso — Anyelo (Producción)',
        type: 'example',
        content: 'El pedido P-0092 requiere 10 antenas G7. El sistema crea automáticamente la orden de producción OP-0045. Anyelo la abre, verifica que hay materiales disponibles (aluminio, conectores), cambia el estado a EN PROCESO y comienza la fabricación. Al terminar cambia a TERMINADO y luego a EMPACADO para que el pedido pueda despacharse.',
      },
    ],
  },
  {
    id: 'compras',
    icon: <ShoppingCart size={20} />,
    color: 'bg-amber-600',
    title: 'Compras',
    subtitle: 'Órdenes de compra y gestión de proveedores',
    sections: [
      {
        heading: 'Crear una orden de compra',
        steps: [
          'Ir a Compras → clic en "Nueva Orden de Compra"',
          'Seleccionar el proveedor (ej: Multivoltex, ATS, Cablemundo)',
          'Si el proveedor no existe, crearlo haciendo clic en "Nuevo Proveedor"',
          'Agregar los productos a comprar con cantidad y costo unitario',
          'Definir la fecha de entrega esperada',
          'Agregar notas o condiciones especiales',
          'Guardar en BORRADOR o cambiar a ENVIADA cuando se envíe al proveedor',
        ],
      },
      {
        heading: 'Registrar recepción de mercancía',
        steps: [
          'Buscar la orden de compra enviada',
          'Hacer clic en "Recibir Mercancía"',
          'Para cada producto, ingresar la cantidad realmente recibida',
          'Si llegó todo: la orden pasa a estado RECIBIDA',
          'El inventario se actualiza automáticamente con las cantidades recibidas',
        ],
      },
      {
        heading: 'Ejemplo de uso — John (Gerente)',
        type: 'example',
        content: 'John ve en el Dashboard que hay 3 productos en stock crítico: conectores PL-259, cable RG-8 y tubería de aluminio. Va a Compras, crea una orden a Multivoltex por los 3 ítems, la guarda y la envía por WhatsApp al proveedor. Cuando llega el pedido, Anyelo registra la recepción y el stock se actualiza solo.',
      },
    ],
  },
  {
    id: 'credito',
    icon: <CreditCard size={20} />,
    color: 'bg-pink-600',
    title: 'Crédito / Cartera',
    subtitle: 'Gestión de cartera, facturas y cupos de crédito',
    sections: [
      {
        heading: '¿Qué muestra el módulo de Crédito?',
        items: [
          'Resumen total de cartera vigente (lo que deben los clientes en plazo)',
          'Cartera vencida (lo que deben y ya venció el plazo de pago)',
          'Próxima a vencer en los siguientes 7 días',
          'Cupo disponible vs usado por cada cliente',
          'Estado del factoring (APROBADO, EN_ESTUDIO, RECHAZADO, NO_APLICA)',
          'Lista de facturas con su estado',
        ],
      },
      {
        heading: 'Registrar un pago de cliente',
        steps: [
          'Buscar la factura en la lista o buscar el cliente',
          'Hacer clic en "Registrar Pago"',
          'Ingresar el monto pagado',
          'Agregar notas (ej: "Pago por PSE", "Transferencia Bancolombia")',
          'Confirmar — la factura se actualiza y el cupo del cliente se libera',
        ],
      },
      {
        heading: 'Factoring (Financiación de facturas)',
        type: 'info',
        content: 'El factoring permite que Maral reciba el dinero de las facturas antes de que el cliente pague, a través de una entidad financiera. Los clientes aprobados son: Meltec, ISEC, Eleinco.',
        items: [
          'APROBADO: Cliente aprobado para usar el factoring',
          'EN_ESTUDIO: La entidad financiera está evaluando al cliente',
          'RECHAZADO: La entidad no aprobó al cliente',
          'NO_APLICA: Cliente sin solicitud de factoring',
        ],
      },
      {
        heading: 'Ejemplo de uso — John (Gerente)',
        type: 'example',
        content: 'A fin de mes John revisa Crédito y ve que ISEC tiene una factura de $12M vencida hace 15 días. Llama a su contacto, acuerdan el pago para el viernes. El viernes Lady registra el pago de $12M y la cartera se actualiza. El cupo de ISEC vuelve a quedar disponible para nuevos pedidos.',
      },
    ],
  },
  {
    id: 'catalogo',
    icon: <Grid3X3 size={20} />,
    color: 'bg-teal-600',
    title: 'Catálogo de Productos',
    subtitle: 'Gestión de productos, precios y stock',
    sections: [
      {
        heading: 'Ver el catálogo',
        content: 'El catálogo muestra todos los productos de MARAL/MAXANT en formato de tarjetas. Cada tarjeta muestra: referencia, nombre, línea, precio de lista, costo y margen de ganancia calculado automáticamente.',
      },
      {
        heading: 'Crear un producto nuevo',
        steps: [
          'Clic en "Nuevo Producto"',
          'Ingresar la referencia (ej: ANT-G7-5/8)',
          'Nombre completo del producto',
          'Seleccionar la línea: Estándar o Premium',
          'Seleccionar la categoría: Estación Base, Móvil, Handy, Cable, Conector, Base, Accesorio o Materia Prima',
          'Precio de lista (precio al que se vende al cliente)',
          'Costo (precio al que cuesta fabricarlo o comprarlo)',
          'Stock actual y stock mínimo (para alertas)',
          'Unidad de medida (ej: Unidad, Metro, Juego)',
          'Guardar',
        ],
      },
      {
        heading: 'Márgenes de ganancia',
        type: 'info',
        items: [
          'Verde (≥50%): Margen excelente, muy rentable',
          'Azul (30–49%): Margen bueno, dentro del objetivo',
          'Naranja (<30%): Margen bajo, revisar precio o costo',
        ],
      },
      {
        heading: 'Ejemplo de uso — John (Gerente)',
        type: 'example',
        content: 'Lady necesita cotizar una antena G6 pero no recuerda el precio. Abre el Catálogo, busca "G6", ve que el precio de lista es $485.000 con un margen del 52%. Con esa información crea la cotización sin necesitar llamar a John.',
      },
    ],
  },
]

function StepList({ steps }: { steps: string[] }) {
  return (
    <ol className="space-y-2 mt-3">
      {steps.map((step, i) => (
        <li key={i} className="flex items-start gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-bold mt-0.5">
            {i + 1}
          </span>
          <span className="text-gray-700 text-sm leading-relaxed">{step}</span>
        </li>
      ))}
    </ol>
  )
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5 mt-3">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2">
          <ChevronRight size={14} className="shrink-0 text-blue-500 mt-1" />
          <span className="text-gray-700 text-sm leading-relaxed">{item}</span>
        </li>
      ))}
    </ul>
  )
}

type Section = {
  heading: string
  type?: string
  content?: string
  steps?: string[]
  items?: string[]
}

function SectionBlock({ section }: { section: Section }) {
  const baseClass = 'rounded-xl p-4 mb-4'

  if (section.type === 'warning') {
    return (
      <div className={`${baseClass} bg-amber-50 border border-amber-200`}>
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle size={16} className="text-amber-600" />
          <h4 className="font-semibold text-amber-800 text-sm">{section.heading}</h4>
        </div>
        {section.items && <BulletList items={section.items} />}
      </div>
    )
  }

  if (section.type === 'example') {
    return (
      <div className={`${baseClass} bg-green-50 border border-green-200`}>
        <div className="flex items-center gap-2 mb-2">
          <Star size={16} className="text-green-600" />
          <h4 className="font-semibold text-green-800 text-sm">{section.heading}</h4>
        </div>
        {section.content && <p className="text-sm text-green-800 leading-relaxed">{section.content}</p>}
      </div>
    )
  }

  if (section.type === 'info') {
    return (
      <div className={`${baseClass} bg-blue-50 border border-blue-200`}>
        <div className="flex items-center gap-2 mb-2">
          <Info size={16} className="text-blue-600" />
          <h4 className="font-semibold text-blue-800 text-sm">{section.heading}</h4>
        </div>
        {section.content && <p className="text-sm text-blue-800 leading-relaxed mb-2">{section.content}</p>}
        {section.items && <BulletList items={section.items} />}
      </div>
    )
  }

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-1">
        <CheckCircle2 size={15} className="text-gray-400" />
        <h4 className="font-semibold text-gray-800 text-sm">{section.heading}</h4>
      </div>
      {section.content && <p className="text-sm text-gray-600 leading-relaxed mt-1">{section.content}</p>}
      {section.steps && <StepList steps={section.steps} />}
      {section.items && <BulletList items={section.items} />}
    </div>
  )
}

export default function Manual() {
  const printRef = useRef<HTMLDivElement>(null)

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between no-print">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen size={24} className="text-blue-600" />
            Manual de Uso — MARAL OS
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Guía paso a paso para John, Lady y Anyelo
          </p>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
        >
          <Download size={16} />
          Descargar PDF
        </button>
      </div>

      {/* Print header (only visible when printing) */}
      <div className="print-only hidden">
        <div className="text-center py-6 border-b-2 border-gray-200 mb-8">
          <h1 className="text-3xl font-bold text-gray-900">MARAL OS — Manual de Usuario</h1>
          <p className="text-lg text-gray-600 mt-2">Maral Tecnología y Comunicaciones S.A.S. · MAXANT</p>
          <p className="text-sm text-gray-400 mt-1">Guía completa para uso de la plataforma de gestión</p>
        </div>
      </div>

      {/* TOC */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 no-print">
        <h2 className="font-bold text-gray-800 mb-3 text-sm uppercase tracking-wide">Contenido</h2>
        <div className="grid grid-cols-3 gap-2">
          {modules.map((mod) => (
            <a
              key={mod.id}
              href={`#${mod.id}`}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 py-1"
            >
              <ChevronRight size={12} className="text-gray-400" />
              {mod.title}
            </a>
          ))}
        </div>
      </div>

      {/* Intro box */}
      <div className="bg-blue-600 text-white rounded-xl p-6">
        <h2 className="text-lg font-bold mb-2">Bienvenidos a MARAL OS</h2>
        <p className="text-blue-100 text-sm leading-relaxed">
          MARAL OS es la plataforma digital de Maral Tecnología y Comunicaciones S.A.S. Esta herramienta reemplaza los
          Excel, las planillas de Drive, los grupos de WhatsApp y la memoria para gestionar clientes, cotizaciones,
          pedidos, inventario, producción, compras y cartera — todo en un solo lugar, en tiempo real.
        </p>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {[
            { name: 'John Mónoga', role: 'Gerente', desc: 'Dashboard, reportes, crédito, aprobaciones' },
            { name: 'Lady', role: 'Ventas', desc: 'Clientes, cotizaciones, pedidos, cartera' },
            { name: 'Anyelo', role: 'Logística/Producción', desc: 'Pedidos, inventario, producción, compras' },
          ].map((p) => (
            <div key={p.name} className="bg-white/10 rounded-lg p-3">
              <p className="font-bold text-sm">{p.name}</p>
              <p className="text-blue-200 text-xs">{p.role}</p>
              <p className="text-blue-100 text-xs mt-1">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Modules */}
      <div ref={printRef} className="space-y-8">
        {modules.map((mod, idx) => (
          <div
            key={mod.id}
            id={mod.id}
            className="bg-white rounded-xl border border-gray-200 overflow-hidden page-break-inside-avoid"
          >
            {/* Module header */}
            <div className={`${mod.color} px-6 py-4 flex items-center gap-3`}>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 text-white">
                {mod.icon}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-white/60 text-sm font-medium">Módulo {idx + 1}</span>
                </div>
                <h2 className="text-xl font-bold text-white leading-tight">{mod.title}</h2>
                <p className="text-white/80 text-sm">{mod.subtitle}</p>
              </div>
            </div>

            {/* Module content */}
            <div className="p-6">
              {mod.sections.map((section, si) => (
                <SectionBlock key={si} section={section} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Tips section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Consejos generales</h2>
        <div className="grid grid-cols-2 gap-4">
          {[
            { tip: 'Usa la barra de búsqueda', desc: 'En cada módulo hay un campo de búsqueda. Escribe el nombre del cliente, número de pedido o referencia del producto para encontrarlo rápido.' },
            { tip: 'El sistema guarda todo', desc: 'No necesitas hacer nada extra para guardar. Cada cambio queda registrado con la hora y el usuario que lo hizo.' },
            { tip: 'Los colores son señales', desc: 'Rojo = urgente o problema. Amarillo = atención. Verde = todo bien. Azul = en proceso normal.' },
            { tip: 'Consulta al asistente IA', desc: 'Haz clic en el ícono de chat (esquina inferior derecha) para preguntar cualquier duda. El asistente conoce toda la plataforma.' },
            { tip: 'Actualiza los estados', desc: 'Lo más importante es mantener los estados actualizados (cotizaciones, pedidos, producción). Así todos en el equipo saben qué está pasando.' },
            { tip: 'Reportes al fin de mes', desc: 'John puede ir a Reportes para ver ventas del período, pedidos por estado y rendimiento del equipo de ventas.' },
          ].map((item) => (
            <div key={item.tip} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
              <CheckCircle2 size={18} className="text-blue-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm text-gray-900">{item.tip}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="text-center text-xs text-gray-400 py-4 no-print">
        MARAL OS · Maral Tecnología y Comunicaciones S.A.S. · Desarrollado por Daniel Mónoga
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { background: white !important; }
          .page-break-inside-avoid { page-break-inside: avoid; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  )
}
