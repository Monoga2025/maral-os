/**
 * Script de uso único: fija el número de cotización para que arranque en 4519.
 * Ejecutar en EasyPanel console: npx tsx prisma/set-quotation-number.ts
 *
 * Si ya hay cotizaciones con número mayor a 4519, las respeta.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const TARGET = 4519;

async function main() {
  // Obtener el número más alto actual
  const maxRow = await prisma.quotation.findFirst({
    orderBy: { number: 'desc' },
    select: { number: true },
  });

  const currentMax = maxRow?.number ?? 0;
  const newSeq = Math.max(TARGET - 1, currentMax);

  // setval(seq, newSeq, true) → el PRÓXIMO valor será newSeq + 1
  await prisma.$executeRawUnsafe(
    `SELECT setval('"Quotation_number_seq"', ${newSeq}, true)`
  );

  console.log(`✓  Secuencia ajustada a ${newSeq} — próxima cotización: #${newSeq + 1}`);
  if (currentMax >= TARGET) {
    console.log(`⚠  Ya existían cotizaciones con número ${currentMax}. La secuencia no se redujo.`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
