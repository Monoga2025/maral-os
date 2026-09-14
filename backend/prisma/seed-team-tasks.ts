import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const john = await prisma.user.findFirst({ where: { role: 'GERENTE', active: true } });
  const ivan = await prisma.user.findFirst({ where: { name: 'Iván', active: true } });
  const wilson = await prisma.user.findFirst({ where: { name: 'Wilson', active: true } });
  const janet = await prisma.user.findFirst({ where: { name: 'Janet', active: true } });

  if (!john) return;

  if (janet) {
    await prisma.task.create({
      data: {
        title: 'Conciliación bancaria y revisión de facturas vencidas',
        description: 'Verificar pagos recibidos en Bancolombia y cuadrar cartera del mes.',
        priority: 'URGENTE',
        status: 'PENDIENTE',
        createdById: john.id,
        assignedToId: janet.id,
        dueDate: new Date(Date.now() + 86400000 * 2),
      },
    });
  }

  if (wilson) {
    await prisma.task.create({
      data: {
        title: 'Seguimiento a clientes mayoristas y cotizaciones pendientes',
        description: 'Contactar a Meltec y Radioenlaces para cierre de cotizaciones.',
        priority: 'NORMAL',
        status: 'PENDIENTE',
        createdById: john.id,
        assignedToId: wilson.id,
        dueDate: new Date(Date.now() + 86400000 * 1),
      },
    });
  }

  if (ivan) {
    await prisma.task.create({
      data: {
        title: 'Supervisión de producción de antenas y verificación de stock',
        description: 'Revisar orden de taller para despacho del viernes.',
        priority: 'NORMAL',
        status: 'PENDIENTE',
        createdById: john.id,
        assignedToId: ivan.id,
        dueDate: new Date(Date.now() + 86400000 * 2),
      },
    });
  }

  console.log('✅ Tareas iniciales del equipo creadas.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
