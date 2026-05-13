import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const EVOLUTION_API_URL = 'https://ia-evolution-api.psvi0v.easypanel.host';
const EVOLUTION_API_KEY = '429683C4C977415CAAFCCE10F7D57E11';
const EVOLUTION_INSTANCE = 'maral-info';

async function sendWA(phone: string, text: string) {
  const digits = phone.replace(/\D/g, '');
  const number = digits.startsWith('57') ? digits : `57${digits}`;
  const res = await fetch(`${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: EVOLUTION_API_KEY },
    body: JSON.stringify({ number, text }),
  });
  const data = await res.json();
  console.log('Evolution response:', JSON.stringify(data, null, 2));
  return data;
}

async function main() {
  // Buscar John
  const john = await prisma.user.findFirst({
    where: { name: { contains: 'John', mode: 'insensitive' } },
    select: { id: true, name: true, whatsapp: true, phone: true },
  });
  console.log('John encontrado:', john);

  if (!john) throw new Error('No se encontró a John');

  const wa = john.whatsapp ?? john.phone;
  if (!wa) throw new Error('John no tiene whatsapp/phone en la DB');

  // Crear tarea en DB
  const task = await prisma.task.create({
    data: {
      title: 'Comprar ganchos a Daniel',
      priority: 'NORMAL',
      assignedToId: john.id,
      createdById: john.id,
    },
  });
  console.log('Tarea creada:', task.id, task.title);

  // Enviar notificación
  const msg =
    `📋 *Nueva tarea asignada*\n` +
    `Hola ${john.name}, tienes una nueva tarea:\n\n` +
    `*${task.title}*\n` +
    `Prioridad: 🟡 Normal\n` +
    `Asignada por: Sistema`;

  await sendWA(wa, msg);
  console.log('Mensaje enviado a', wa);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
