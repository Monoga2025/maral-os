import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';

const router = Router();
router.use(authenticate);

export interface B2BProspect {
  id: string;
  name: string;
  companyName: string;
  nit: string;
  sector: 'SEGURIDAD_PRIVADA' | 'TRANSPORTE_CARGA' | 'INSTALADOR_TELECOM' | 'MINERIA_INDUSTRIA' | 'AGROINDUSTRIA';
  city: string;
  department: string;
  estimatedRadiosCount: number;
  contactName: string;
  contactRole: string;
  phone: string;
  whatsapp: string;
  email: string;
  currentSupplier: string; // e.g. "Syscom", "Meltec", "Directo", "Ninguno"
  monthlyPotentialCOP: number;
  primaryNeed: string;
  suggestedAction: string;
  customPitch: string;
  isConverted: boolean;
}

const QUALIFIED_COLOMBIAN_PROSPECTS: B2BProspect[] = [
  {
    id: 'pros-1',
    name: 'Vigilancia y Seguridad Atlas Ltda',
    companyName: 'Seguridad Atlas Ltda',
    nit: '860.024.571-3',
    sector: 'SEGURIDAD_PRIVADA',
    city: 'Bogotá',
    department: 'Cundinamarca',
    estimatedRadiosCount: 350,
    contactName: 'Ing. Carlos Restrepo',
    contactRole: 'Director de Comunicaciones & Tecnología',
    phone: '3158942211',
    whatsapp: '573158942211',
    email: 'tecnologia@seguridadatlas.com.co',
    currentSupplier: 'Syscom / Mayorista',
    monthlyPotentialCOP: 4500000,
    primaryNeed: 'Antenas G6 VHF para bases fijas y repuestos de antenas handy para vigilantes',
    suggestedAction: 'Enviar oferta de 50 antenas móviles + 5 bases G6 con 20% de ahorro vs Syscom',
    customPitch: 'Buenas tardes Ing. Carlos, le saluda John Mónoga de MARAL Tecnología SAS. Sabemos que en Seguridad Atlas operan más de 300 radios en Bogotá. Fabricamos antenas base VHF y antenas portátiles con entrega en 24h y precios directos de fábrica (hasta 25% más económicos que los mayoristas de importación). ¿Le gustaría que le enviemos 2 muestras sin costo para homologación técnica?',
    isConverted: false,
  },
  {
    id: 'pros-2',
    name: 'Seguridad Sepecol S.A.',
    companyName: 'Servicios Especiales de Protección Sepecol S.A.',
    nit: '800.145.982-1',
    sector: 'SEGURIDAD_PRIVADA',
    city: 'Medellín',
    department: 'Antioquia',
    estimatedRadiosCount: 220,
    contactName: 'Mauricio Giraldo',
    contactRole: 'Jefe de Compras y Logística',
    phone: '3104523399',
    whatsapp: '573104523399',
    email: 'compras@sepecol.com.co',
    currentSupplier: 'Syscom',
    monthlyPotentialCOP: 3200000,
    primaryNeed: 'Dipolos para torre repetidora y cable RG-8 para enlaces perimetrales',
    suggestedAction: 'Ofrecer kit de dipolos plegados VHF con arnés enfasador listo para torre',
    customPitch: 'Hola Don Mauricio, un cordial saludo de MARAL Tecnología. Entendemos la necesidad de Sepecol de mantener sus repetidoras en Antioquia operando 24/7 sin caídas. Contamos con dipolos en aluminio anticorrosión y cables coaxiales con entrega inmediata en Medellín. ¿Le preparo una cotización comparativa con despacho prioritario?',
    isConverted: false,
  },
  {
    id: 'pros-3',
    name: 'Transportes TransLogística del Norte S.A.S.',
    companyName: 'TransLogística del Norte S.A.S.',
    nit: '900.672.411-9',
    sector: 'TRANSPORTE_CARGA',
    city: 'Barranquilla',
    department: 'Atlántico',
    estimatedRadiosCount: 180,
    contactName: 'Guillermo Cárdenas',
    contactRole: 'Gerente de Operaciones de Flota',
    phone: '3187219900',
    whatsapp: '573187219900',
    email: 'operaciones@translogisticanorte.com',
    currentSupplier: 'Meltec',
    monthlyPotentialCOP: 2800000,
    primaryNeed: 'Antenas móviles 5/8 con resorte para tractocamiones y bases magnéticas',
    suggestedAction: 'Ofrecer lote mayorista de 30 antenas móviles con base magnética de alta sujeción',
    customPitch: 'Estimado Guillermo, gusto en saludarle. En MARAL somos fabricantes de las antenas móviles 5/8 con resorte cromado más resistentes de Colombia, diseñadas para no romperse con ramas en carretera. Tenemos paquetes para flotas a $65.000 la unidad con garantía de 1 año. ¿Me permite enviarle la ficha técnica?',
    isConverted: false,
  },
  {
    id: 'pros-4',
    name: 'G4S Secure Solutions Colombia',
    companyName: 'G4S Colombia',
    nit: '860.007.419-5',
    sector: 'SEGURIDAD_PRIVADA',
    city: 'Bogotá',
    department: 'Cundinamarca',
    estimatedRadiosCount: 800,
    contactName: 'Dra. Andrea Morales',
    contactRole: 'Coordinadora de Suministros Telecom',
    phone: '3169824411',
    whatsapp: '573169824411',
    email: 'suministros.co@g4s.com',
    currentSupplier: 'Syscom / Importación Directa',
    monthlyPotentialCOP: 8500000,
    primaryNeed: 'Suministro continuo de antenas base, móviles y conectores PL-259 en volumen',
    suggestedAction: 'Proponer contrato marco de suministro con entregas mensuales programadas',
    customPitch: 'Dra. Andrea, un cordial saludo de MARAL Tecnología SAS. Apoyamos a empresas líderes de seguridad en Colombia garantizando inventario permanente de antenas y conectores con facturación electrónica y cumplimiento DIAN. Ahorre hasta un 25% frente a compras de importación. ¿Podemos agendar 10 minutos para revisar su lista de repuestos frecuentes?',
    isConverted: false,
  },
  {
    id: 'pros-5',
    name: 'Comunicaciones RF del Eje S.A.S. (Instalador)',
    companyName: 'Comunicaciones RF del Eje',
    nit: '901.233.184-7',
    sector: 'INSTALADOR_TELECOM',
    city: 'Pereira',
    department: 'Risaralda',
    estimatedRadiosCount: 150,
    contactName: 'Javier Henao',
    contactRole: 'Propietario / Ingeniero Técnico',
    phone: '3128913344',
    whatsapp: '573128913344',
    email: 'javier@rfdeleje.com',
    currentSupplier: 'Syscom',
    monthlyPotentialCOP: 2100000,
    primaryNeed: 'Precios de distribuidor para reventa de antenas y conectores a clientes finales',
    suggestedAction: 'Activar código de distribuidor con escala de descuento por volumen (Tier Ladder)',
    customPitch: 'Hola Javier, te saludo de MARAL. Vemos que instalas radiocomunicaciones en el Eje Cafetero. Como fabricante nacional te damos margen de ganancia de hasta 35% en reventa de antenas y accesorios, sin mínimos de compra abusivos. ¿Te envío la lista de precios mayorista para instaladores?',
    isConverted: false,
  },
  {
    id: 'pros-6',
    name: 'Minería & Canteras del Valle S.A.',
    companyName: 'Canteras del Valle',
    nit: '890.311.455-2',
    sector: 'MINERIA_INDUSTRIA',
    city: 'Cali',
    department: 'Valle del Cauca',
    estimatedRadiosCount: 120,
    contactName: 'Ing. Fabio Domínguez',
    contactRole: 'Superintendente de Mantenimiento',
    phone: '3176541122',
    whatsapp: '573176541122',
    email: 'mantenimiento@canterasdelvalle.com',
    currentSupplier: 'Proveedor local',
    monthlyPotentialCOP: 1900000,
    primaryNeed: 'Antenas de alta resistencia para maquinaria pesada (excavadoras y volquetas)',
    suggestedAction: 'Enviar propuesta de antenas para trabajo rudo con base reforzada',
    customPitch: 'Ing. Fabio, buenas tardes. Nuestras antenas móviles para maquinaria pesada cuentan con resorte de alto impacto y varilla tratada térmicamente para soportar la vibración en cantera. ¿Gusta que le enviemos cotización para la flota de maquinaria?',
    isConverted: false,
  },
  {
    id: 'pros-7',
    name: 'Seguridad Vencedores de Santander',
    companyName: 'Vencedores Seguridad Ltda',
    nit: '804.009.871-0',
    sector: 'SEGURIDAD_PRIVADA',
    city: 'Bucaramanga',
    department: 'Santander',
    estimatedRadiosCount: 190,
    contactName: 'Néstor Prada',
    contactRole: 'Director de Seguridad Operativa',
    phone: '3157723388',
    whatsapp: '573157723388',
    email: 'operaciones@seguridadvencedores.com',
    currentSupplier: 'Syscom',
    monthlyPotentialCOP: 2600000,
    primaryNeed: 'Antenas para radios portátiles Motorola y bases G6 VHF para puestos de control',
    suggestedAction: 'Enviar oferta de combo puesto de control: Antena G6 + 20m cable + 2 conectores',
    customPitch: 'Don Néstor, un saludo cordial de MARAL. Le ofrecemos el combo para puestos de control (Antena G6 VHF + Cable RG58 armado + Conectores soldados) listo para conectar a radio base a precio especial para Santander. ¿Se lo cotizo hoy?',
    isConverted: false,
  },
  {
    id: 'pros-8',
    name: 'Coordinadora de Envíos de Boyacá',
    companyName: 'Flota Boyacá Envíos',
    nit: '900.812.339-4',
    sector: 'TRANSPORTE_CARGA',
    city: 'Tunja',
    department: 'Boyacá',
    estimatedRadiosCount: 110,
    contactName: 'Alfonso Rincón',
    contactRole: 'Jefe de Taller Automotriz',
    phone: '3138891100',
    whatsapp: '573138891100',
    email: 'taller@flotaboyaca.com',
    currentSupplier: 'Ferreterías',
    monthlyPotentialCOP: 1600000,
    primaryNeed: 'Bases magnéticas y conectores para radios móviles en cabina',
    suggestedAction: 'Enviar promoción de 20 bases magnéticas + conectores con flete incluido',
    customPitch: 'Don Alfonso, le saluda John de MARAL. Si tiene camiones pendientes de instalación de radio, tenemos bases magnéticas de neodimio que no se caen a alta velocidad y conectores PL-259 de primera calidad. Despacho directo a Tunja en 24h. ¿Le gustaría cotizar?',
    isConverted: false,
  },
];

// GET /api/prospecting/leads
router.get('/leads', async (req: AuthRequest, res: Response) => {
  try {
    const { sector, department, search } = req.query as { sector?: string; department?: string; search?: string };

    let list = [...QUALIFIED_COLOMBIAN_PROSPECTS];

    if (sector && sector !== 'ALL') {
      list = list.filter((p) => p.sector === sector);
    }

    if (department && department !== 'ALL') {
      list = list.filter((p) => p.department === department);
    }

    if (search && search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.companyName.toLowerCase().includes(q) ||
          p.city.toLowerCase().includes(q) ||
          p.contactName.toLowerCase().includes(q)
      );
    }

    const totalPipelineValueCOP = list.reduce((sum, p) => sum + p.monthlyPotentialCOP, 0);

    const summary = {
      totalLeads: list.length,
      totalPipelineValueCOP,
      securityLeadsCount: list.filter((p) => p.sector === 'SEGURIDAD_PRIVADA').length,
      transportLeadsCount: list.filter((p) => p.sector === 'TRANSPORTE_CARGA').length,
      installerLeadsCount: list.filter((p) => p.sector === 'INSTALADOR_TELECOM').length,
      industryLeadsCount: list.filter((p) => p.sector === 'MINERIA_INDUSTRIA' || p.sector === 'AGROINDUSTRIA').length,
    };

    res.json({
      summary,
      leads: list,
    });
  } catch (error) {
    console.error('Prospecting leads error:', error);
    res.status(500).json({ error: 'Error al obtener leads de prospección' });
  }
});

// POST /api/prospecting/convert-to-client
router.post('/convert-to-client', async (req: AuthRequest, res: Response) => {
  try {
    const { prospectId } = req.body as { prospectId: string };
    const prospect = QUALIFIED_COLOMBIAN_PROSPECTS.find((p) => p.id === prospectId);

    if (!prospect) {
      res.status(404).json({ error: 'Prospecto no encontrado' });
      return;
    }

    // Check if client already exists by rut or name
    const existing = await prisma.client.findFirst({
      where: {
        OR: [
          { rut: prospect.nit.replace(/\D/g, '') },
          { name: { contains: prospect.name, mode: 'insensitive' } },
        ],
      },
    });

    if (existing) {
      res.json({
        success: true,
        alreadyExisted: true,
        client: existing,
        message: `El cliente ${existing.name} ya existe en tu base de datos.`,
      });
      return;
    }

    // Create client in Maral OS database
    const newClient = await prisma.client.create({
      data: {
        name: prospect.companyName,
        company: prospect.name,
        rut: prospect.nit.replace(/\D/g, '').slice(0, 15) || '900000000',
        email: prospect.email,
        phone: prospect.phone,
        whatsapp: prospect.phone,
        city: prospect.city,
        department: prospect.department,
        address: `${prospect.city}, Colombia`,
        category: 'A',
        creditLimit: 5000000, // Cupo inicial sugerido
        paymentDays: 15,
        notes: `Prospecto importado del Motor B2B. Sector: ${prospect.sector}. Potencial estimado: $${prospect.monthlyPotentialCOP.toLocaleString('es-CO')}/mes. Contacto: ${prospect.contactName} (${prospect.contactRole}).`,
      },
    });

    prospect.isConverted = true;

    res.json({
      success: true,
      alreadyExisted: false,
      client: newClient,
      message: `¡${newClient.name} agregado exitosamente a tu base de clientes de Maral OS!`,
    });
  } catch (error) {
    console.error('Convert prospect error:', error);
    res.status(500).json({ error: 'Error al convertir prospecto a cliente' });
  }
});

export default router;
