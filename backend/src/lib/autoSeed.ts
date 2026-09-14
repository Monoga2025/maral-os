import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

export async function ensureSeedData() {
  try {
    const userCount = await prisma.user.count();
    if (userCount > 0) {
      console.log('✅ Base de datos ya cuenta con usuarios iniciales.');
      return;
    }

    console.log('🌱 Base de datos vacía detectada en la nube. Creando datos iniciales de MARAL OS...');
    const passwordHash = await bcrypt.hash('maral2024', SALT_ROUNDS);

    const gerente = await prisma.user.create({
      data: {
        name: 'John Mónoga',
        email: 'john@maral.com',
        password: passwordHash,
        role: 'GERENTE',
        title: 'Gerente General',
        phone: '3177606126',
        whatsapp: '573177606126',
        cedula: '80163914',
      },
    });

    const ventas = await prisma.user.create({
      data: {
        name: 'Wilson',
        email: 'wilson@industriasmaral.com',
        password: passwordHash,
        role: 'VENTAS',
        title: 'Encargado de Ventas & Mercadeo',
        phone: '3167760692',
        whatsapp: '573167760692',
        cedula: '1098670002',
      },
    });

    const logistica = await prisma.user.create({
      data: {
        name: 'Iván',
        email: 'ivan@industriasmaral.com',
        password: passwordHash,
        role: 'LOGISTICA',
        title: 'Encargado de Producción & Logística',
        phone: '3177606126',
        whatsapp: '573177606126',
        cedula: '1098670001',
      },
    });

    const contabilidad = await prisma.user.create({
      data: {
        name: 'Janet',
        email: 'janet@industriasmaral.com',
        password: passwordHash,
        role: 'CONTADORA',
        title: 'Encargada de Contabilidad',
        phone: '3164526523',
        whatsapp: '573164526523',
        cedula: '63328625',
      },
    });

    // Clientes iniciales para cartera y prospección
    const meltec = await prisma.client.create({
      data: {
        name: 'Carlos Méndez',
        company: 'Meltec S.A.S.',
        rut: '900123456-1',
        city: 'Bogotá',
        department: 'Cundinamarca',
        phone: '3012345678',
        whatsapp: '573012345678',
        email: 'cmendez@meltec.com.co',
        address: 'Calle 72 #15-30 Of. 401',
        category: 'FUNDADOR_HISTORICO',
        howFound: 'Referido',
        allowWhiteLabel: true,
        creditLimit: 15000000,
        paymentDays: 30,
      },
    });

    const radioenlaces = await prisma.client.create({
      data: {
        name: 'Mauricio Gómez',
        company: 'Radioenlaces de Colombia Ltda.',
        rut: '900987654-3',
        city: 'Medellín',
        department: 'Antioquia',
        phone: '3159876543',
        whatsapp: '573159876543',
        email: 'mgomez@radioenlaces.com.co',
        address: 'Cra 43A #1-50',
        category: 'A_MAYORISTA',
        howFound: 'Web',
        allowWhiteLabel: false,
        creditLimit: 8000000,
        paymentDays: 15,
      },
    });

    // Facturas vencidas para cobrar en Paso 1
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 12);

    await prisma.invoice.create({
      data: {
        clientId: meltec.id,
        amount: 4500000,
        dueDate: pastDate,
        status: 'VENCIDA',
        merlinRef: 'FAC-2026-089',
      },
    });

    const pastDate2 = new Date();
    pastDate2.setDate(pastDate2.getDate() - 5);

    await prisma.invoice.create({
      data: {
        clientId: radioenlaces.id,
        amount: 3200000,
        dueDate: pastDate2,
        status: 'VENCIDA',
        merlinRef: 'FAC-2026-094',
      },
    });

    // Productos estrella
    const dipolo = await prisma.product.create({
      data: {
        reference: 'MAR-DIP-VHF-2B',
        name: 'Arreglo 2 Dipolos Enfasados VHF 136-174 MHz',
        category: 'ESTACION_BASE',
        priceList: 490000,
        priceDistributor: 420000,
        cost: 210000,
        stock: 8,
        minStock: 3,
        unit: 'und',
        specs: {
          gain: '6 dBd',
          frequencyRange: '136-174 MHz',
          connectorType: 'N-Hembra',
          maxPower: '500 W',
        },
        applications: ['Repetidoras', 'Seguridad Privada', 'Empresas de Transporte'],
      },
    });

    const movil = await prisma.product.create({
      data: {
        reference: 'MAR-MOV-UHF-KIT',
        name: 'Antena Móvil UHF 5/8 λ Kit Conectorizado Base Magnética',
        category: 'MOVIL',
        priceList: 120000,
        priceDistributor: 95000,
        cost: 45000,
        stock: 35,
        minStock: 10,
        unit: 'kit',
        specs: {
          gain: '3.5 dBi',
          frequencyRange: '400-470 MHz',
          connectorType: 'PL-259 / Mini-UHF',
        },
        applications: ['Flotas de Vehículos', 'Taxis', 'Logística'],
      },
    });

    // Órdenes de producción iniciales
    await prisma.productionOrder.create({
      data: {
        productId: dipolo.id,
        qty: 4,
        phase: 'PREENSAMBLE',
        status: 'EN_PROCESO',
        assignedTo: logistica.id,
        notes: 'Corte de tubo y conectorizado de arnés para Meltec S.A.S.',
      },
    });

    console.log('✅ Datos iniciales de Don John, clientes, productos y taller creados con éxito.');
  } catch (error) {
    console.error('⚠️ Error al verificar/crear datos iniciales:', error);
  }
}
