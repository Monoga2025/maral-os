const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const johnEmail = 'john@maral.com';
const ladyEmail = 'lady@maral.com';
const jannethEmail = 'janneth@industriasmaral.com';

const tasks = [
  {
    title: 'Pedir ganchos Daniel',
    priority: 'NORMAL',
    creatorEmail: johnEmail,
    dueDate: '2026-04-23',
  },
  {
    title: 'Revisar factura de @andrea',
    priority: 'NORMAL',
    creatorEmail: ladyEmail,
    dueDate: '2026-04-23',
  },
  {
    title: 'Cobrar a German Velandia Fact MR506 $ 274.979 DEL 19 MARZO',
    priority: 'NORMAL',
    creatorEmail: ladyEmail,
    dueDate: '2026-04-24',
  },
  {
    title: 'Solicitar Factura D1',
    priority: 'NORMAL',
    creatorEmail: ladyEmail,
    dueDate: '2026-04-26',
  },
  {
    title: 'Doblar platinas',
    priority: 'URGENTE',
    creatorEmail: johnEmail,
    dueDate: '2026-04-26',
  },
  {
    title: 'Fabricar antena dipolo Cliente famlia Lorduy',
    priority: 'URGENTE',
    creatorEmail: ladyEmail,
    dueDate: '2026-04-29',
  },
  {
    title: 'Por favor me envia al grupo de pedidos la guia de SERATEL bogota.cali',
    priority: 'URGENTE',
    creatorEmail: ladyEmail,
    dueDate: '2026-05-08',
  },
  {
    title: 'Solicitar factura a Reforplas',
    priority: 'NORMAL',
    creatorEmail: ladyEmail,
    dueDate: '2026-05-13',
  },
  {
    title: 'Por favor gestionar la devolucion de la antena dual band de Febetronic, la cual se ambio por 10 antenas 1/4 Onda',
    priority: 'NORMAL',
    creatorEmail: ladyEmail,
    dueDate: '2026-05-13',
  },
  {
    title: 'Por favor confirmar con Elecsu si hacemos cruce de cuentas, con la factura que tenemos por pagar del cable y las facturas que ellos nos deben, quedaria un saldo final a favor de ellos de $238.489',
    priority: 'NORMAL',
    creatorEmail: ladyEmail,
    dueDate: '2026-05-13',
  },
  {
    title: 'solicitar factura electronica Estelar, pago guia Coalum',
    priority: 'NORMAL',
    creatorEmail: ladyEmail,
    dueDate: '2026-05-13',
  },
  {
    title: 'John buenos dias, el 07-05-26 se hizo una Transferencia a REFORPLAST por $368.900 y a la fecha no han enviado la factura a contabilidad, por favor solicitar factura urgente ya van 8 dias',
    priority: 'URGENTE',
    creatorEmail: jannethEmail,
    dueDate: '2026-05-15',
  },
  {
    title: 'Entregar inventarios a Diciembre 31 de 2025 y costos en sistema de facturacion para cierre fiscal, Camara de Comercio e Informacion Exogena DIAN',
    description:
      'Janneth solicita la informacion de inventarios a Diciembre 31 de 2025 y los costos en el sistema de facturacion para poder cerrar fiscalmente, renovar Camara de Comercio y presentar Informacion Exogena ante la DIAN.',
    priority: 'URGENTE',
    creatorEmail: jannethEmail,
    dueDate: '2026-05-15',
  },
];

function atBogotaNoon(date) {
  return new Date(`${date}T12:00:00-05:00`);
}

async function main() {
  const users = await prisma.user.findMany({
    where: { email: { in: [johnEmail, ladyEmail, jannethEmail] } },
  });
  const usersByEmail = Object.fromEntries(users.map((user) => [user.email, user]));
  const john = usersByEmail[johnEmail];

  if (!john || !usersByEmail[ladyEmail] || !usersByEmail[jannethEmail]) {
    throw new Error('Faltan usuarios requeridos: John, Lady o Janneth');
  }

  await prisma.user.update({
    where: { email: johnEmail },
    data: { cedula: '80163914' },
  });

  let created = 0;
  let skipped = 0;

  for (const task of tasks) {
    const creator = usersByEmail[task.creatorEmail];
    const existing = await prisma.task.findFirst({
      where: {
        title: task.title,
        assignedToId: john.id,
      },
      select: { id: true },
    });

    if (existing) {
      skipped += 1;
      console.log(`skip: ${task.title.slice(0, 70)}`);
      continue;
    }

    await prisma.task.create({
      data: {
        title: task.title,
        description: task.description,
        priority: task.priority,
        status: 'PENDIENTE',
        assignedToId: john.id,
        createdById: creator.id,
        dueDate: atBogotaNoon(task.dueDate),
      },
    });

    created += 1;
    console.log(`ok: ${task.title.slice(0, 70)}`);
  }

  console.log(`Listo. Creadas: ${created}. Omitidas por duplicado: ${skipped}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
