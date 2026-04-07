import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();
const SALT_ROUNDS = 10;
async function main() {
  console.log('🌱 Starting MARAL OS seed...\n');
  // ── Clean up existing data ──────────────────────────────
  console.log('Cleaning existing data...');
  await prisma.activityLog.deleteMany();
  await prisma.inventoryMovement.deleteMany();
  await prisma.orderPhoto.deleteMany();
  await prisma.productionOrder.deleteMany();
  await prisma.purchaseItem.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.task.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.quotationItemComponent.deleteMany();
  await prisma.quotationItem.deleteMany();
  await prisma.quotation.deleteMany();
  await prisma.productComponent.deleteMany();
  await prisma.product.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();
  console.log('Done.\n');
  // ── Users ───────────────────────────────────────────────
  console.log('Creating users...');
  const passwordHash = await bcrypt.hash('maral2024', SALT_ROUNDS);
  const gerente = await prisma.user.create({
    data: {
      name: 'John Mónoga',
      email: 'john@maral.com',
      password: passwordHash,
      role: 'GERENTE',
    },
  });
  const vendedora = await prisma.user.create({
    data: {
      name: 'Lady García',
      email: 'lady@maral.com',
      password: passwordHash,
      role: 'VENTAS',
    },
  });
  const logistica = await prisma.user.create({
    data: {
      name: 'Angelo Pérez',
      email: 'angelo@maral.com',
      password: passwordHash,
      role: 'LOGISTICA',
    },
  });
  console.log(`  ✓ ${gerente.name} (GERENTE)`);
  console.log(`  ✓ ${vendedora.name} (VENTAS)`);
  console.log(`  ✓ ${logistica.name} (LOGISTICA)\n`);
  // ── Clients ─────────────────────────────────────────────
  console.log('Creating clients...');
  const clientsData = [
    {
      name: 'Carlos Méndez',
      company: 'Meltec S.A.S.',
      rut: '900123456-1',
      city: 'Bogotá',
      department: 'Cundinamarca',
      phone: '3012345678',
      whatsapp: '3012345678',
      email: 'cmendez@meltec.com.co',
      address: 'Calle 72 #15-30 Of. 401',
      category: 'FUNDADOR_HISTORICO' as const,
      howFound: 'Referido',
      allowWhiteLabel: true,
      creditLimit: 5000000,
      paymentDays: 30,
      factoringStatus: 'APROBADO' as const,
      notes: 'Cliente fundador desde 2018. Excelente historial de pago.',
    },
    {
      name: 'Andrés Ospina',
      company: 'ISEC Colombia',
      rut: '800987654-2',
      city: 'Medellín',
      department: 'Antioquia',
      phone: '3123456789',
      whatsapp: '3123456789',
      email: 'aospina@isec.com.co',
      address: 'Carrera 43A #16A-48',
      category: 'FUNDADOR_HISTORICO' as const,
      howFound: 'Feria de telecomunicaciones',
      allowWhiteLabel: true,
      creditLimit: 3000000,
      paymentDays: 30,
      factoringStatus: 'APROBADO' as const,
      notes: 'Distribuidor principal en Antioquia.',
    },
    {
      name: 'Patricia Valencia',
      company: 'Eleinco',
      rut: '700456789-3',
      city: 'Cali',
      department: 'Valle del Cauca',
      phone: '3209876543',
      whatsapp: '3209876543',
      email: 'pvalencia@eleinco.com',
      address: 'Avenida 6N #23-45',
      category: 'FUNDADOR_MARAL' as const,
      howFound: 'Referido por Meltec',
      allowWhiteLabel: false,
      creditLimit: 2000000,
      paymentDays: 30,
      factoringStatus: 'APROBADO' as const,
      notes: 'Especialistas en sistemas de radiocomunicación para minería.',
    },
    {
      name: 'Roberto Barrios',
      company: 'Radiotrans del Caribe',
      rut: '901234567-4',
      city: 'Barranquilla',
      department: 'Atlántico',
      phone: '3054567890',
      whatsapp: '3054567890',
      email: 'rbarrios@radiotrans.co',
      address: 'Calle 76 #45-23',
      category: 'FUNDADOR_MARAL' as const,
      howFound: 'Página web',
      allowWhiteLabel: false,
      creditLimit: 1500000,
      paymentDays: 15,
      factoringStatus: 'EN_ESTUDIO' as const,
      notes: 'Distribuidor costa atlántica.',
    },
    {
      name: 'Gustavo Hernández',
      company: 'Comunicaciones del Llano',
      rut: '801122334-5',
      city: 'Villavicencio',
      department: 'Meta',
      phone: '3176543210',
      whatsapp: '3176543210',
      email: 'ghernandez@comllano.com',
      address: 'Carrera 32 #12-18',
      category: 'ALIADO' as const,
      howFound: 'Instagram',
      creditLimit: 0,
      paymentDays: 0,
      factoringStatus: 'NO_APLICA' as const,
      notes: 'Atiende mercado llanero y petrolero.',
    },
    {
      name: 'Sandra Montoya',
      company: 'Tecnocom Pereira',
      rut: '900765432-6',
      city: 'Pereira',
      department: 'Risaralda',
      phone: '3168765432',
      whatsapp: '3168765432',
      email: 'smontoya@tecnocom.co',
      address: 'Avenida 30 de Agosto #35-67',
      category: 'ALIADO' as const,
      howFound: 'WhatsApp',
      creditLimit: 0,
      paymentDays: 0,
      factoringStatus: 'NO_APLICA' as const,
    },
    {
      name: 'Miguel Ángel Rojas',
      company: 'Distribuidora RF Bucaramanga',
      rut: '700112233-7',
      city: 'Bucaramanga',
      department: 'Santander',
      phone: '3107654321',
      whatsapp: '3107654321',
      email: 'mrojas@rfbga.com',
      address: 'Calle 34 #23-45',
      category: 'ALIADO' as const,
      howFound: 'Feria de seguridad electrónica',
      creditLimit: 0,
      paymentDays: 0,
      factoringStatus: 'NO_APLICA' as const,
    },
    {
      name: 'Jesús Contreras',
      company: 'Antenas y Más',
      rut: '901234890-8',
      city: 'Cúcuta',
      department: 'Norte de Santander',
      phone: '3123344556',
      whatsapp: '3123344556',
      email: 'jcontreras@antenasymas.com',
      address: 'Diagonal Santander #5-43',
      category: 'ALIADO' as const,
      howFound: 'Referido',
      allowWhiteLabel: true,
      creditLimit: 0,
      paymentDays: 0,
      factoringStatus: 'NO_APLICA' as const,
      notes: 'Exporta a Venezuela. Requiere factura en USD para algunos pedidos.',
    },
    {
      name: 'Hernando Gómez',
      company: 'Colwave',
      rut: '800234567-9',
      city: 'Bogotá',
      department: 'Cundinamarca',
      phone: '3014455667',
      whatsapp: '3014455667',
      email: 'hgomez@colwave.com.co',
      address: 'Carrera 7 #32-45',
      category: 'ALIADO' as const,
      howFound: 'Google',
      creditLimit: 0,
      paymentDays: 0,
      factoringStatus: 'NO_APLICA' as const,
    },
    {
      name: 'Ana Lucía Torres',
      company: 'ComSat Ibagué',
      city: 'Ibagué',
      department: 'Tolima',
      phone: '3156677889',
      whatsapp: '3156677889',
      email: 'altorres@comsat.co',
      category: 'PROSPECTO' as const,
      howFound: 'Instagram',
      creditLimit: 0,
      paymentDays: 0,
      factoringStatus: 'NO_APLICA' as const,
    },
    {
      name: 'Diego Zuluaga',
      company: 'RadioFrec Manizales',
      city: 'Manizales',
      department: 'Caldas',
      phone: '3187788990',
      email: 'dzuluaga@radiofrec.com',
      category: 'PROSPECTO' as const,
      howFound: 'Feria',
      creditLimit: 0,
      paymentDays: 0,
      factoringStatus: 'NO_APLICA' as const,
    },
    {
      name: 'Claudia Reyes',
      company: 'TeleCom Palmira',
      city: 'Palmira',
      department: 'Valle del Cauca',
      phone: '3209988776',
      email: 'creyes@telecompalmira.com',
      category: 'PROSPECTO' as const,
      howFound: 'WhatsApp',
      creditLimit: 0,
      paymentDays: 0,
      factoringStatus: 'NO_APLICA' as const,
    },
    {
      name: 'Ramiro Pantoja',
      company: 'Fronteras Radio',
      rut: '801345678-3',
      city: 'Ipiales',
      department: 'Nariño',
      phone: '3114433221',
      whatsapp: '3114433221',
      email: 'rpantoja@fronterasradio.com',
      address: 'Calle 5 #10-23',
      category: 'ALIADO' as const,
      howFound: 'Referido',
      allowWhiteLabel: true,
      creditLimit: 0,
      paymentDays: 0,
      factoringStatus: 'NO_APLICA' as const,
      notes: 'Exporta a Ecuador. Mercado frontera colombo-ecuatoriana.',
    },
    {
      name: 'Luis Fernando Muñoz',
      company: 'Sistemas RF Pasto',
      city: 'Pasto',
      department: 'Nariño',
      phone: '3143322110',
      email: 'lfmunoz@sistemasrf.com',
      category: 'PROSPECTO' as const,
      howFound: 'Instagram',
      creditLimit: 0,
      paymentDays: 0,
      factoringStatus: 'NO_APLICA' as const,
    },
    {
      name: 'Jorge Pertuz',
      company: 'Seguridad Total Cartagena',
      rut: '900876543-5',
      city: 'Cartagena',
      department: 'Bolívar',
      phone: '3055544332',
      whatsapp: '3055544332',
      email: 'jpertuz@seguridadtotal.com.co',
      address: 'Bocagrande, Carrera 1 #8-34',
      category: 'ALIADO' as const,
      howFound: 'Feria de seguridad',
      creditLimit: 0,
      paymentDays: 0,
      factoringStatus: 'NO_APLICA' as const,
      notes: 'Especialistas en seguridad privada y comunicaciones.',
    },
  ];
  const clients = await Promise.all(clientsData.map((c) => prisma.client.create({ data: c })));
  console.log(`  ✓ ${clients.length} clientes creados\n`);
  const [meltec, isec, eleinco, radiotrans, comllano, , rfBga, antenasYMas, colwave, comsat] = clients;
  // ── Products ─────────────────────────────────────────────
  console.log('Creating products...');
  const productsData = [
    // Estación Base
    {
      reference: 'ANT-G6-VHF',
      name: 'Antena G6 VHF 136-174MHz',
      line: 'ESTANDAR' as const,
      category: 'ESTACION_BASE' as const,
      priceList: 450000,
      priceDistributor: 360000,
      cost: 180000,
      warrantyYears: 2,
      stock: 12,
      minStock: 5,
      unit: 'und',
      location: 'A-01',
      applications: ['Radio base VHF', 'Sistemas repetidores', 'Comunicación rural'],
      specs: { gain: '6 dBd', impedance: '50 Ohm', connector: 'N-Hembra', material: 'Aluminio 6061' },
    },
    {
      reference: 'ANT-G6-VHF-P',
      name: 'Antena G6 VHF Premium 136-174MHz',
      line: 'PREMIUM' as const,
      category: 'ESTACION_BASE' as const,
      priceList: 680000,
      priceDistributor: 544000,
      cost: 250000,
      warrantyYears: 3,
      stock: 8,
      minStock: 3,
      unit: 'und',
      location: 'A-02',
      applications: ['Radio base VHF profesional', 'Sistemas críticos'],
      specs: { gain: '6 dBd', impedance: '50 Ohm', connector: 'N-Hembra', material: 'Aluminio aeronáutico', finish: 'Anodizado marino' },
    },
    {
      reference: 'ANT-G6-UHF',
      name: 'Antena G6 UHF 400-470MHz',
      line: 'ESTANDAR' as const,
      category: 'ESTACION_BASE' as const,
      priceList: 430000,
      priceDistributor: 344000,
      cost: 170000,
      warrantyYears: 2,
      stock: 15,
      minStock: 5,
      unit: 'und',
      location: 'A-03',
      applications: ['Radio base UHF', 'PMR446', 'Sistemas trunking'],
      specs: { gain: '6 dBd', impedance: '50 Ohm', connector: 'N-Hembra' },
    },
    {
      reference: 'ANT-G7-VHF',
      name: 'Antena G7 VHF 136-174MHz',
      line: 'ESTANDAR' as const,
      category: 'ESTACION_BASE' as const,
      priceList: 650000,
      priceDistributor: 520000,
      cost: 260000,
      warrantyYears: 2,
      stock: 6,
      minStock: 3,
      unit: 'und',
      location: 'A-04',
      applications: ['Radio base VHF alta ganancia', 'Cobertura rural extendida'],
      specs: { gain: '7 dBd', impedance: '50 Ohm', connector: 'N-Hembra' },
    },
    {
      reference: 'ANT-G7-UHF',
      name: 'Antena G7 UHF 400-470MHz',
      line: 'ESTANDAR' as const,
      category: 'ESTACION_BASE' as const,
      priceList: 620000,
      priceDistributor: 496000,
      cost: 240000,
      warrantyYears: 2,
      stock: 4,
      minStock: 3,
      unit: 'und',
      location: 'A-05',
      applications: ['Radio base UHF alta ganancia'],
      specs: { gain: '7 dBd', impedance: '50 Ohm', connector: 'N-Hembra' },
    },
    {
      reference: 'ANT-DIP-VHF',
      name: 'Dipolo VHF 136-174MHz',
      line: 'ESTANDAR' as const,
      category: 'ESTACION_BASE' as const,
      priceList: 280000,
      priceDistributor: 224000,
      cost: 90000,
      warrantyYears: 2,
      stock: 20,
      minStock: 8,
      unit: 'und',
      location: 'A-06',
      applications: ['Punto de repetición', 'Cobertura pequeña', 'Indoor/outdoor'],
      specs: { gain: '0 dBd', impedance: '50 Ohm', connector: 'N-Hembra' },
    },
    {
      reference: 'ANT-DIP-UHF',
      name: 'Dipolo UHF 400-470MHz',
      line: 'ESTANDAR' as const,
      category: 'ESTACION_BASE' as const,
      priceList: 260000,
      priceDistributor: 208000,
      cost: 85000,
      warrantyYears: 2,
      stock: 18,
      minStock: 8,
      unit: 'und',
      location: 'A-07',
      applications: ['Punto de repetición UHF', 'Indoor/outdoor'],
      specs: { gain: '0 dBd', impedance: '50 Ohm', connector: 'N-Hembra' },
    },
    // Móviles
    {
      reference: 'ANT-MOV-58-VHF',
      name: 'Antena Móvil 5/8 VHF',
      line: 'ESTANDAR' as const,
      category: 'MOVIL' as const,
      priceList: 65000,
      priceDistributor: 52000,
      cost: 22000,
      warrantyYears: 1,
      stock: 45,
      minStock: 20,
      unit: 'und',
      location: 'B-01',
      applications: ['Radios móviles VHF', 'Vehículos', 'Camiones'],
      specs: { gain: '3 dBd', impedance: '50 Ohm', connector: 'PL-259', length: '145cm' },
    },
    {
      reference: 'ANT-MOV-58-UHF',
      name: 'Antena Móvil 5/8 UHF',
      line: 'ESTANDAR' as const,
      category: 'MOVIL' as const,
      priceList: 62000,
      priceDistributor: 49600,
      cost: 20000,
      warrantyYears: 1,
      stock: 38,
      minStock: 20,
      unit: 'und',
      location: 'B-02',
      applications: ['Radios móviles UHF', 'Vehículos'],
      specs: { gain: '3 dBd', impedance: '50 Ohm', connector: 'PL-259', length: '85cm' },
    },
    {
      reference: 'ANT-MOV-58-VHF-P',
      name: 'Antena Móvil 5/8 VHF Premium',
      line: 'PREMIUM' as const,
      category: 'MOVIL' as const,
      priceList: 95000,
      priceDistributor: 76000,
      cost: 35000,
      warrantyYears: 2,
      stock: 22,
      minStock: 10,
      unit: 'und',
      location: 'B-03',
      applications: ['Radios móviles VHF profesionales', 'Flotas corporativas'],
      specs: { gain: '3 dBd', impedance: '50 Ohm', connector: 'PL-259', length: '145cm', finish: 'Cromado' },
    },
    // Handy
    {
      reference: 'ANT-HND-VHF',
      name: 'Antena Handy VHF',
      line: 'ESTANDAR' as const,
      category: 'HANDY' as const,
      priceList: 35000,
      priceDistributor: 28000,
      cost: 12000,
      warrantyYears: 1,
      stock: 60,
      minStock: 30,
      unit: 'und',
      location: 'C-01',
      applications: ['Walkies-talkies VHF', 'Radios portátiles'],
      specs: { gain: '0 dBd', connector: 'SMA-Hembra' },
    },
    {
      reference: 'ANT-HND-UHF',
      name: 'Antena Handy UHF',
      line: 'ESTANDAR' as const,
      category: 'HANDY' as const,
      priceList: 32000,
      priceDistributor: 25600,
      cost: 11000,
      warrantyYears: 1,
      stock: 55,
      minStock: 30,
      unit: 'und',
      location: 'C-02',
      applications: ['Walkies-talkies UHF', 'Radios portátiles'],
      specs: { gain: '0 dBd', connector: 'SMA-Hembra' },
    },
    // Bases
    {
      reference: 'BASE-MAG',
      name: 'Base Magnética Universal',
      line: 'ESTANDAR' as const,
      category: 'BASE' as const,
      priceList: 45000,
      priceDistributor: 36000,
      cost: 15000,
      warrantyYears: 1,
      stock: 30,
      minStock: 15,
      unit: 'und',
      location: 'D-01',
      applications: ['Montaje rápido en vehículos', 'Superficies metálicas'],
      specs: { cable: '5m RG58', connector: 'PL-259', magnetForce: '12kg' },
    },
    {
      reference: 'BASE-NMO',
      name: 'Base NMO para Vehículo',
      line: 'ESTANDAR' as const,
      category: 'BASE' as const,
      priceList: 38000,
      priceDistributor: 30400,
      cost: 12000,
      warrantyYears: 1,
      stock: 25,
      minStock: 10,
      unit: 'und',
      location: 'D-02',
      applications: ['Instalación permanente en vehículos'],
      specs: { connector: 'NMO', cable: '4m RG58' },
    },
    // Cables
    {
      reference: 'CAB-RG58-MT',
      name: 'Cable Coaxial RG58 (por metro)',
      line: 'ESTANDAR' as const,
      category: 'CABLE' as const,
      priceList: 12000,
      priceDistributor: 9600,
      cost: 5000,
      warrantyYears: 1,
      stock: 200,
      minStock: 100,
      unit: 'mt',
      location: 'E-01',
      applications: ['Conexiones cortas', 'Handy', 'Móvil'],
      specs: { impedance: '50 Ohm', attenuation: '6.0 dB/100m @100MHz' },
    },
    {
      reference: 'CAB-RG8-MT',
      name: 'Cable Coaxial RG8 (por metro)',
      line: 'ESTANDAR' as const,
      category: 'CABLE' as const,
      priceList: 18000,
      priceDistributor: 14400,
      cost: 8000,
      warrantyYears: 1,
      stock: 150,
      minStock: 80,
      unit: 'mt',
      location: 'E-02',
      applications: ['Estación base', 'Conexiones largas'],
      specs: { impedance: '50 Ohm', attenuation: '2.5 dB/100m @100MHz' },
    },
    // Conectores
    {
      reference: 'CON-PL259',
      name: 'Conector PL-259 para RG58',
      line: 'ESTANDAR' as const,
      category: 'CONECTOR' as const,
      priceList: 8000,
      priceDistributor: 6400,
      cost: 2500,
      warrantyYears: 1,
      stock: 150,
      minStock: 80,
      unit: 'und',
      location: 'F-01',
      applications: ['Terminación cable RG58', 'Antenas móviles'],
      specs: { material: 'Latón niquelado' },
    },
    {
      reference: 'CON-NM',
      name: 'Conector N Macho',
      line: 'ESTANDAR' as const,
      category: 'CONECTOR' as const,
      priceList: 12000,
      priceDistributor: 9600,
      cost: 4000,
      warrantyYears: 1,
      stock: 2,        // STOCK CRÍTICO
      minStock: 50,
      unit: 'und',
      location: 'F-02',
      applications: ['Estación base', 'Terminación RG8'],
      specs: { material: 'Latón plateado', impedance: '50 Ohm' },
    },
    {
      reference: 'CON-SO239',
      name: 'Conector SO-239',
      line: 'ESTANDAR' as const,
      category: 'CONECTOR' as const,
      priceList: 7500,
      priceDistributor: 6000,
      cost: 2200,
      warrantyYears: 1,
      stock: 4,        // STOCK CRÍTICO
      minStock: 50,
      unit: 'und',
      location: 'F-03',
      applications: ['Panel trasero equipos', 'Conector hembra estaciones'],
      specs: { material: 'Latón niquelado' },
    },
    {
      reference: 'CON-BNC',
      name: 'Conector BNC Macho',
      line: 'ESTANDAR' as const,
      category: 'CONECTOR' as const,
      priceList: 6500,
      priceDistributor: 5200,
      cost: 2000,
      warrantyYears: 1,
      stock: 80,
      minStock: 40,
      unit: 'und',
      location: 'F-04',
      applications: ['Instrumentación', 'Medición RF'],
      specs: { material: 'Latón dorado' },
    },
  ];
  const products = await Promise.all(productsData.map((p) => prisma.product.create({ data: p })));
  console.log(`  ✓ ${products.length} productos creados\n`);
  const [
    antG6Vhf, antG6VhfP, antG6Uhf, antG7Vhf, antG7Uhf,
    antDipVhf, antDipUhf,
    antMov58Vhf, antMov58Uhf, antMov58VhfP,
    antHndVhf, antHndUhf,
    baseMag, baseNmo,
    cabRg58, cabRg8,
    conPl259, conNm, conSo239, conBnc,
  ] = products;
  // ── Suppliers ────────────────────────────────────────────
  console.log('Creating suppliers...');
  const suppliersData = [
    {
      name: 'Insumos Metálicos Colombia',
      contact: 'Carlos Ruiz',
      phone: '3004455667',
      city: 'Bogotá',
      paymentTerms: '30 días',
      notes: 'Proveedor principal de aluminio y materiales para producción de antenas.',
    },
    {
      name: 'Electrónica del Valle',
      contact: 'María Torres',
      phone: '3116677889',
      city: 'Cali',
      paymentTerms: 'Contado',
      notes: 'Proveedor de conectores y accesorios electrónicos.',
    },
    {
      name: 'Importaciones RF',
      contact: 'Pedro Gómez',
      phone: '3227788990',
      city: 'Medellín',
      paymentTerms: '15 días',
      notes: 'Importador de componentes RF especializados.',
    },
  ];
  const suppliers = await Promise.all(suppliersData.map((s) => prisma.supplier.create({ data: s })));
  console.log(`  ✓ ${suppliers.length} proveedores creados\n`);
  const [insumosMetalicos, electronicaValle, importacionesRF] = suppliers;
  // ── Quotations ───────────────────────────────────────────
  console.log('Creating quotations...');
  const q1 = await prisma.quotation.create({
    data: {
      clientId: meltec.id,
      sellerId: vendedora.id,
      status: 'ENVIADA',
      validityDays: 15,
      paymentTerms: '30 días crédito',
      subtotal: 2760000,
      tax: 0,
      total: 2760000,
      followUpDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      notes: 'Pedido mensual estándar. Cliente fundador con precio especial.',
      items: {
        create: [
          { productId: antG6Vhf.id, qty: 4, unitPrice: 360000, discount: 0, subtotal: 1440000 },
          { productId: antG6Uhf.id, qty: 3, unitPrice: 344000, discount: 0, subtotal: 1032000 },
          { productId: conNm.id, qty: 30, unitPrice: 9600, discount: 0, subtotal: 288000 },
        ],
      },
    },
  });
  const q2 = await prisma.quotation.create({
    data: {
      clientId: isec.id,
      sellerId: vendedora.id,
      status: 'ENVIADA',
      validityDays: 15,
      paymentTerms: '30 días crédito',
      subtotal: 1720000,
      tax: 0,
      total: 1720000,
      followUpDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      notes: 'Distribución zona Antioquia.',
      items: {
        create: [
          { productId: antMov58Vhf.id, qty: 20, unitPrice: 52000, discount: 0, subtotal: 1040000 },
          { productId: antMov58Uhf.id, qty: 10, unitPrice: 49600, discount: 0, subtotal: 496000 },
          { productId: baseMag.id, qty: 5, unitPrice: 36000, discount: 0, subtotal: 180000 },
        ],
      },
    },
  });
  const q3 = await prisma.quotation.create({
    data: {
      clientId: eleinco.id,
      sellerId: gerente.id,
      status: 'APROBADA',
      validityDays: 15,
      paymentTerms: '30 días crédito',
      subtotal: 3400000,
      tax: 0,
      total: 3400000,
      notes: 'Proyecto minería Cerro Matoso.',
      items: {
        create: [
          { productId: antG6VhfP.id, qty: 3, unitPrice: 544000, discount: 0, subtotal: 1632000 },
          { productId: antG7Vhf.id, qty: 2, unitPrice: 520000, discount: 0, subtotal: 1040000 },
          { productId: cabRg8.id, qty: 40, unitPrice: 14400, discount: 0, subtotal: 576000 },
          { productId: conNm.id, qty: 16, unitPrice: 9600, discount: 0, subtotal: 153600 },
        ],
      },
    },
  });
  const q4 = await prisma.quotation.create({
    data: {
      clientId: comsat.id,
      sellerId: vendedora.id,
      status: 'BORRADOR',
      validityDays: 15,
      paymentTerms: 'Contado',
      subtotal: 210000,
      tax: 0,
      total: 210000,
      items: {
        create: [
          { productId: antHndVhf.id, qty: 3, unitPrice: 35000, discount: 0, subtotal: 105000 },
          { productId: antHndUhf.id, qty: 3, unitPrice: 32000, discount: 0, subtotal: 96000 },
          { productId: conBnc.id, qty: 2, unitPrice: 6500, discount: 5, subtotal: 12350 }, // con descuento
        ],
      },
    },
  });
  const q5 = await prisma.quotation.create({
    data: {
      clientId: radiotrans.id,
      sellerId: vendedora.id,
      status: 'RECHAZADA',
      validityDays: 15,
      paymentTerms: 'Contado',
      subtotal: 875000,
      tax: 0,
      total: 875000,
      notes: 'No aprobó por precio. Revisar para la próxima.',
      items: {
        create: [
          { productId: antG7Uhf.id, qty: 1, unitPrice: 496000, discount: 0, subtotal: 496000 },
          { productId: antDipVhf.id, qty: 2, unitPrice: 224000, discount: 5, subtotal: 425000 },
        ],
      },
    },
  });
  console.log(`  ✓ 5 cotizaciones creadas\n`);
  // ── Orders ───────────────────────────────────────────────
  console.log('Creating orders...');
  // Order 1 - Meltec, DESPACHADO (converted from q3 equivalent)
  const order1 = await prisma.order.create({
    data: {
      clientId: meltec.id,
      quotationId: q3.id,
      status: 'DESPACHADO',
      confirmed: true,
      recipientName: 'Carlos Méndez',
      address: 'Calle 72 #15-30 Of. 401',
      city: 'Bogotá',
      phone: '3012345678',
      carrier: 'Servientrega',
      freightPayer: 'DESTINATARIO',
      freightPayment: 'CONTADO',
      type: 'PEDIDO',
      guideNumber: 'SVE-20240301-001',
      dispatchDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      total: 3400000,
      notes: 'Proyecto minería Cerro Matoso.',
      items: {
        create: [
          { productId: antG6VhfP.id, qty: 3, unitPrice: 544000, picked: true },
          { productId: antG7Vhf.id, qty: 2, unitPrice: 520000, picked: true },
          { productId: cabRg8.id, qty: 40, unitPrice: 14400, picked: true },
        ],
      },
    },
  });
  // Order 2 - ISEC, EN_PRODUCCION
  const order2 = await prisma.order.create({
    data: {
      clientId: isec.id,
      status: 'EN_PRODUCCION',
      confirmed: true,
      recipientName: 'Andrés Ospina',
      address: 'Carrera 43A #16A-48',
      city: 'Medellín',
      phone: '3123456789',
      carrier: 'Coordinadora',
      freightPayer: 'REMITENTE',
      freightPayment: 'CONTADO',
      type: 'PEDIDO',
      total: 2176000,
      items: {
        create: [
          { productId: antG6Vhf.id, qty: 3, unitPrice: 360000, picked: false },
          { productId: antG6Uhf.id, qty: 2, unitPrice: 344000, picked: false },
          { productId: antDipVhf.id, qty: 3, unitPrice: 224000, picked: false },
        ],
      },
    },
  });
  // Order 3 - Eleinco, CONFIRMADO (unconfirmed)
  const order3 = await prisma.order.create({
    data: {
      clientId: eleinco.id,
      status: 'CONFIRMADO',
      confirmed: false,
      recipientName: 'Patricia Valencia',
      address: 'Avenida 6N #23-45',
      city: 'Cali',
      phone: '3209876543',
      carrier: 'Deprisa',
      freightPayer: 'DESTINATARIO',
      freightPayment: 'CRÉDITO',
      type: 'PEDIDO',
      total: 780000,
      notes: 'Verificar dirección de entrega.',
      items: {
        create: [
          { productId: antMov58Vhf.id, qty: 10, unitPrice: 52000, picked: false },
          { productId: antMov58VhfP.id, qty: 2, unitPrice: 76000, picked: false },
        ],
      },
    },
  });
  // Order 4 - Radiotrans, EMPACADO
  const order4 = await prisma.order.create({
    data: {
      clientId: radiotrans.id,
      status: 'EMPACADO',
      confirmed: true,
      recipientName: 'Roberto Barrios',
      address: 'Calle 76 #45-23',
      city: 'Barranquilla',
      phone: '3054567890',
      carrier: 'Envia',
      freightPayer: 'DESTINATARIO',
      freightPayment: 'CONTADO',
      type: 'PEDIDO',
      total: 1360000,
      items: {
        create: [
          { productId: antHndVhf.id, qty: 20, unitPrice: 35000, picked: true },
          { productId: antHndUhf.id, qty: 20, unitPrice: 32000, picked: true },
          { productId: conPl259.id, qty: 20, unitPrice: 8000, picked: true },
        ],
      },
    },
  });
  // Order 5 - ComLlano, ENTREGADO
  await prisma.order.create({
    data: {
      clientId: comllano.id,
      status: 'ENTREGADO',
      confirmed: true,
      recipientName: 'Gustavo Hernández',
      address: 'Carrera 32 #12-18',
      city: 'Villavicencio',
      phone: '3176543210',
      carrier: 'TCC',
      freightPayer: 'DESTINATARIO',
      freightPayment: 'CONTADO',
      type: 'PEDIDO',
      guideNumber: 'TCC-20240228-445',
      dispatchDate: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
      total: 975000,
      items: {
        create: [
          { productId: antDipVhf.id, qty: 2, unitPrice: 224000, picked: true },
          { productId: antDipUhf.id, qty: 2, unitPrice: 208000, picked: true },
          { productId: cabRg58.id, qty: 30, unitPrice: 9600, picked: true },
        ],
      },
    },
  });
  // Order 6 - RF Bga, CONFIRMADO
  await prisma.order.create({
    data: {
      clientId: rfBga.id,
      status: 'CONFIRMADO',
      confirmed: true,
      recipientName: 'Miguel Ángel Rojas',
      address: 'Calle 34 #23-45',
      city: 'Bucaramanga',
      phone: '3107654321',
      carrier: 'Servientrega',
      freightPayer: 'DESTINATARIO',
      freightPayment: 'CONTADO',
      type: 'PEDIDO',
      total: 558000,
      items: {
        create: [
          { productId: antMov58Uhf.id, qty: 8, unitPrice: 49600, picked: false },
          { productId: baseNmo.id, qty: 5, unitPrice: 30400, picked: false },
        ],
      },
    },
  });
  // Order 7 - Antenas y Más, GARANTIA
  await prisma.order.create({
    data: {
      clientId: antenasYMas.id,
      status: 'CONFIRMADO',
      confirmed: true,
      recipientName: 'Jesús Contreras',
      address: 'Diagonal Santander #5-43',
      city: 'Cúcuta',
      phone: '3123344556',
      carrier: 'Interrapidísimo',
      freightPayer: 'REMITENTE',
      freightPayment: 'CONTADO',
      type: 'GARANTIA',
      total: 0,
      notes: 'Garantía por antena G6 VHF defectuosa. Lote feb 2024.',
      items: {
        create: [
          { productId: antG6Vhf.id, qty: 1, unitPrice: 0, picked: false },
        ],
      },
    },
  });
  // Order 8 - Colwave, CANCELADO
  await prisma.order.create({
    data: {
      clientId: colwave.id,
      status: 'CANCELADO',
      confirmed: false,
      recipientName: 'Hernando Gómez',
      address: 'Carrera 7 #32-45',
      city: 'Bogotá',
      phone: '3014455667',
      carrier: 'Servientrega',
      freightPayer: 'DESTINATARIO',
      freightPayment: 'CONTADO',
      type: 'PEDIDO',
      total: 345000,
      notes: 'Cliente canceló. Solicita reembolso.',
      items: {
        create: [
          { productId: antHndVhf.id, qty: 5, unitPrice: 35000, picked: false },
          { productId: antHndUhf.id, qty: 5, unitPrice: 32000, picked: false },
        ],
      },
    },
  });
  console.log('  ✓ 8 pedidos creados\n');
  // ── Production Orders ────────────────────────────────────
  console.log('Creating production orders...');
  await prisma.productionOrder.create({
    data: {
      orderId: order2.id,
      productId: antG6Vhf.id,
      qty: 3,
      phase: 'ENSAMBLE_FINAL',
      status: 'EN_PROCESO',
      assignedTo: logistica.id,
      notes: 'Urgente, cliente espera.',
      requiredDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    },
  });
  await prisma.productionOrder.create({
    data: {
      orderId: order2.id,
      productId: antG6Uhf.id,
      qty: 2,
      phase: 'PREENSAMBLE',
      status: 'PENDIENTE',
      requiredDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    },
  });
  await prisma.productionOrder.create({
    data: {
      productId: antG7Vhf.id,
      qty: 5,
      phase: 'BASICO',
      status: 'PENDIENTE',
      notes: 'Producción para stock.',
      requiredDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });
  console.log('  ✓ 3 órdenes de producción creadas\n');
  // ── Purchase Orders ──────────────────────────────────────
  console.log('Creating purchase orders...');
  await prisma.purchaseOrder.create({
    data: {
      supplierId: electronicaValle.id,
      status: 'ENVIADA',
      total: 412000,
      notes: 'Urgente. Reabastecer conectores N y SO-239.',
      items: {
        create: [
          { productId: conNm.id, qty: 100, unitCost: 4000, received: false },
          { productId: conSo239.id, qty: 100, unitCost: 2200, received: false },
        ],
      },
    },
  });
  await prisma.purchaseOrder.create({
    data: {
      supplierId: insumosMetalicos.id,
      status: 'RECIBIDA',
      total: 1200000,
      receivedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      notes: 'Materiales para producción marzo.',
      items: {
        create: [
          { productId: cabRg8.id, qty: 100, unitCost: 8000, received: true },
          { productId: cabRg58.id, qty: 50, unitCost: 5000, received: true },
        ],
      },
    },
  });
  await prisma.purchaseOrder.create({
    data: {
      supplierId: importacionesRF.id,
      status: 'BORRADOR',
      total: 350000,
      notes: 'Solicitud de cotización pendiente de aprobación.',
      items: {
        create: [
          { productId: conPl259.id, qty: 100, unitCost: 2500, received: false },
          { productId: conBnc.id, qty: 50, unitCost: 2000, received: false },
        ],
      },
    },
  });
  console.log('  ✓ 3 órdenes de compra creadas\n');
  // ── Invoices ─────────────────────────────────────────────
  console.log('Creating invoices...');
  // Invoice for order1 (Meltec) - PAGADA
  await prisma.invoice.create({
    data: {
      orderId: order1.id,
      clientId: meltec.id,
      amount: 3400000,
      dueDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      paidAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      status: 'PAGADA',
    },
  });
  // Invoice for order4 (Radiotrans) - VIGENTE
  await prisma.invoice.create({
    data: {
      orderId: order4.id,
      clientId: radiotrans.id,
      amount: 1360000,
      dueDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
      status: 'VIGENTE',
    },
  });
  // Old invoice for ISEC - VENCIDA
  await prisma.invoice.create({
    data: {
      clientId: isec.id,
      amount: 850000,
      dueDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
      status: 'VENCIDA',
    },
  });
  // Another invoice for Meltec - VIGENTE
  await prisma.invoice.create({
    data: {
      clientId: meltec.id,
      amount: 1240000,
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      status: 'VIGENTE',
    },
  });
  // Overdue invoice for Eleinco
  await prisma.invoice.create({
    data: {
      clientId: eleinco.id,
      amount: 680000,
      dueDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      status: 'VENCIDA',
    },
  });
  console.log('  ✓ 5 facturas creadas\n');
  // ── Activity Logs ────────────────────────────────────────
  console.log('Creating activity logs...');
  const logEntries = [
    { userId: vendedora.id, action: 'LOGIN', entityType: 'User', entityId: vendedora.id, metadata: { ip: '192.168.1.10' } },
    { userId: vendedora.id, action: 'CREATE', entityType: 'Quotation', entityId: q1.id, metadata: { number: q1.number, total: 2760000 } },
    { userId: vendedora.id, action: 'UPDATE', entityType: 'Quotation', entityId: q1.id, metadata: { status: 'ENVIADA' } },
    { userId: gerente.id, action: 'CREATE', entityType: 'Order', entityId: order1.id, metadata: { number: order1.number, total: 3400000 } },
    { userId: logistica.id, action: 'UPDATE', entityType: 'Order', entityId: order1.id, metadata: { status: 'DESPACHADO' } },
    { userId: logistica.id, action: 'UPDATE', entityType: 'Order', entityId: order2.id, metadata: { status: 'EN_PRODUCCION' } },
    { userId: gerente.id, action: 'CREATE', entityType: 'PurchaseOrder', entityId: undefined, metadata: { total: 412000 } },
    { userId: vendedora.id, action: 'CREATE', entityType: 'Client', entityId: comsat.id, metadata: { name: 'ComSat Ibagué' } },
    { userId: logistica.id, action: 'INVENTORY_MOVEMENT', entityType: 'Product', entityId: antG6Vhf.id, metadata: { type: 'SALIDA', qty: 3 } },
    { userId: gerente.id, action: 'LOGIN', entityType: 'User', entityId: gerente.id, metadata: { ip: '192.168.1.1' } },
  ];
  for (const entry of logEntries) {
    await prisma.activityLog.create({ data: entry });
  }
  console.log(`  ✓ ${logEntries.length} registros de actividad creados\n`);
  // ── Summary ──────────────────────────────────────────────
  console.log('═══════════════════════════════════════════');
  console.log('  MARAL OS — Seed completado exitosamente');
  console.log('═══════════════════════════════════════════');
  console.log('');
  console.log('  Usuarios creados:');
  console.log('  ┌─────────────────────────────────────┐');
  console.log('  │ Email           │ Password  │ Rol    │');
  console.log('  ├─────────────────────────────────────┤');
  console.log('  │ john@maral.com  │ maral2024 │ GERENTE│');
  console.log('  │ lady@maral.com  │ maral2024 │ VENTAS │');
  console.log('  │ angelo@maral.com│ maral2024 │ LOGIST.│');
  console.log('  └─────────────────────────────────────┘');
  console.log('');
  console.log(`  → ${clients.length} clientes`);
  console.log(`  → ${products.length} productos (2 con stock crítico)`);
  console.log(`  → ${suppliers.length} proveedores`);
  console.log('  → 5 cotizaciones');
  console.log('  → 8 pedidos');
  console.log('  → 3 órdenes de producción');
  console.log('  → 3 órdenes de compra');
  console.log('  → 5 facturas');
  console.log('');
}
main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
