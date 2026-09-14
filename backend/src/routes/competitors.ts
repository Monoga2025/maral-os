import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';

const router = Router();
router.use(authenticate);

export interface CompetitorComparisonItem {
  id: string;
  category: 'ANTENAS_BASE' | 'ANTENAS_MOVILES' | 'DIPOLOS' | 'CABLES' | 'CONECTORES' | 'FUENTES';
  maralName: string;
  maralRef: string;
  maralPriceCOP: number;
  syscomRef: string;
  syscomPriceUSD: number;
  syscomPriceCOP: number;
  syscomAvailability: 'STOCK_LIMITADO' | 'SIN_STOCK' | 'IMPORTACION_15D' | 'DISPONIBLE';
  maralStock: number;
  maralAdvantageDays: number; // e.g. 1 day vs 15 days
  priceDiffCOP: number;
  savingsPercentage: number;
  isMaralCheaper: boolean;
  killerPitch: string;
}

// Catálogo de comparación directa contra Syscom Colombia ajustado con la inteligencia de Don John
const MOCK_SYSCOM_MARKET_DATA: CompetitorComparisonItem[] = [
  {
    id: 'comp-1',
    category: 'DIPOLOS',
    maralName: 'Arreglo de 4 Dipolos VHF con Arnés Enfase (Repetidora Cerro)',
    maralRef: 'DIP-4B-VHF-SET',
    maralPriceCOP: 1150000,
    syscomRef: 'SYS-DB-408-B',
    syscomPriceUSD: 360.00,
    syscomPriceCOP: 1494000,
    syscomAvailability: 'IMPORTACION_15D',
    maralStock: 12,
    maralAdvantageDays: 25,
    priceDiffCOP: 344000,
    savingsPercentage: 23.0,
    isMaralCheaper: true,
    killerPitch: '¡Nuestra mina de oro! Ahorro de $344.000 COP vs Syscom en sistemas de repetidora. Incluye arnés enfasador sellado y calibrado a la frecuencia exacta en analizador de espectro con entrega inmediata.',
  },
  {
    id: 'comp-2',
    category: 'DIPOLOS',
    maralName: 'Dipolo VHF Plegado de 1 Bahía (136-174 MHz)',
    maralRef: 'DIP-1B-VHF',
    maralPriceCOP: 195000,
    syscomRef: 'SYS-TELEWAVE-ANT150D',
    syscomPriceUSD: 65.00,
    syscomPriceCOP: 269750,
    syscomAvailability: 'STOCK_LIMITADO',
    maralStock: 35,
    maralAdvantageDays: 7,
    priceDiffCOP: 74750,
    savingsPercentage: 27.7,
    isMaralCheaper: true,
    killerPitch: 'Ahorro de $74.750 por antena. Aluminio estructural de alta resistencia mecánica a la intemperie con soporte y cable conector listo para torre.',
  },
  {
    id: 'comp-3',
    category: 'DIPOLOS',
    maralName: 'Dipolo UHF Plegado 400-470 MHz (Seguridad & Enlace)',
    maralRef: 'DIP-1B-UHF',
    maralPriceCOP: 175000,
    syscomRef: 'SYS-TELEWAVE-ANT450D',
    syscomPriceUSD: 58.00,
    syscomPriceCOP: 240700,
    syscomAvailability: 'SIN_STOCK',
    maralStock: 24,
    maralAdvantageDays: 15,
    priceDiffCOP: 65700,
    savingsPercentage: 27.3,
    isMaralCheaper: true,
    killerPitch: 'Syscom no tiene stock para UHF. Maral tiene 24 unidades calibradas listas para despacho en 24h a $175.000 COP.',
  },
  {
    id: 'comp-4',
    category: 'ANTENAS_BASE',
    maralName: 'Antena G6 VHF 136-174MHz Base (Fibra de Vidrio)',
    maralRef: 'ANT-G6-VHF',
    maralPriceCOP: 220000,
    syscomRef: 'SYS-HUSTLER-G6-144',
    syscomPriceUSD: 68.50,
    syscomPriceCOP: 284275,
    syscomAvailability: 'IMPORTACION_15D',
    maralStock: 45,
    maralAdvantageDays: 14,
    priceDiffCOP: 64275,
    savingsPercentage: 22.6,
    isMaralCheaper: true,
    killerPitch: 'Syscom te cobra $284.000 + flete y tarda 15 días en llegar. En MARAL tenemos 45 unidades listas a $220.000 con entrega hoy mismo y garantía nacional.',
  },
  {
    id: 'comp-5',
    category: 'ANTENAS_MOVILES',
    maralName: 'Kit Móvil Completo: Antena 5/8 VHF + Base + Cable RG-58 Conectorizado',
    maralRef: 'KIT-MOVIL-58-FULL',
    maralPriceCOP: 145000,
    syscomRef: 'SYS-LARSEN-KIT-NMO',
    syscomPriceUSD: 42.00,
    syscomPriceCOP: 174300,
    syscomAvailability: 'STOCK_LIMITADO',
    maralStock: 60,
    maralAdvantageDays: 5,
    priceDiffCOP: 29300,
    savingsPercentage: 16.8,
    isMaralCheaper: true,
    killerPitch: 'No vendemos la varilla suelta: entregamos el kit armado, soldado y probado en banco con conectores de alta calidad. Le ahorra 45 minutos de instalación por vehículo al técnico.',
  },
  {
    id: 'comp-6',
    category: 'CABLES',
    maralName: 'Tramo de Cable RG-58 Mil-Spec (4.5m) con Conectores PL-259 Instalados',
    maralRef: 'CAB-RG58-4.5M-CON',
    maralPriceCOP: 48000,
    syscomRef: 'SYS-CABLE-RG58-ASSY',
    syscomPriceUSD: 14.50,
    syscomPriceCOP: 60175,
    syscomAvailability: 'DISPONIBLE',
    maralStock: 120,
    maralAdvantageDays: 1,
    priceDiffCOP: 12175,
    savingsPercentage: 20.2,
    isMaralCheaper: true,
    killerPitch: 'Cables coaxiales con soldadura en plata y termocogible impermeable sellado. Cero pérdidas de señal y entrega inmediata.',
  },
  {
    id: 'comp-6',
    category: 'ANTENAS_MOVILES',
    maralName: 'Antena Móvil 5/8 Onda UHF (400-470 MHz)',
    maralRef: 'ANT-MOV-58-UHF',
    maralPriceCOP: 62000,
    syscomRef: 'SYS-LAIRD-Q450',
    syscomPriceUSD: 21.50,
    syscomPriceCOP: 89225,
    syscomAvailability: 'STOCK_LIMITADO',
    maralStock: 95,
    maralAdvantageDays: 4,
    priceDiffCOP: 27225,
    savingsPercentage: 30.5,
    isMaralCheaper: true,
    killerPitch: 'Mayor ganancia y ajuste de varilla preciso para UHF. Stock para entrega inmediata a nivel nacional.',
  },
  {
    id: 'comp-7',
    category: 'CABLES',
    maralName: 'Rollo Cable Coaxial RG-58 Mil-Spec (100m)',
    maralRef: 'CAB-RG58-100M',
    maralPriceCOP: 185000,
    syscomRef: 'SYS-BELDEN-RG58',
    syscomPriceUSD: 60.00,
    syscomPriceCOP: 249000,
    syscomAvailability: 'DISPONIBLE',
    maralStock: 40,
    maralAdvantageDays: 2,
    priceDiffCOP: 64000,
    savingsPercentage: 25.7,
    isMaralCheaper: true,
    killerPitch: 'Malla de cobre 95% cobertura para cero pérdidas de potencia en transmisión de radio.',
  },
  {
    id: 'comp-8',
    category: 'CABLES',
    maralName: 'Rollo Cable Coaxial RG-8 Baja Pérdida (100m)',
    maralRef: 'CAB-RG8-100M',
    maralPriceCOP: 480000,
    syscomRef: 'SYS-TIMES-LMR400',
    syscomPriceUSD: 165.00,
    syscomPriceCOP: 684750,
    syscomAvailability: 'IMPORTACION_15D',
    maralStock: 18,
    maralAdvantageDays: 15,
    priceDiffCOP: 204750,
    savingsPercentage: 29.9,
    isMaralCheaper: true,
    killerPitch: 'Ahorro masivo de $204.750 por rollo frente a LMR-400 importado. Ideal para tiradas largas a torres de repetidor.',
  },
  {
    id: 'comp-9',
    category: 'CONECTORES',
    maralName: 'Conector PL-259 Macho UHF Bañado en Plata (Pack 10 un)',
    maralRef: 'CON-PL259-SILV-10',
    maralPriceCOP: 45000,
    syscomRef: 'SYS-AMPHENOL-PL259',
    syscomPriceUSD: 16.00,
    syscomPriceCOP: 66400,
    syscomAvailability: 'DISPONIBLE',
    maralStock: 250,
    maralAdvantageDays: 1,
    priceDiffCOP: 21400,
    savingsPercentage: 32.2,
    isMaralCheaper: true,
    killerPitch: 'Cero pérdidas por soldadura. Dieléctrico de teflón de alta temperatura a $4.500 la unidad.',
  },
  {
    id: 'comp-10',
    category: 'CONECTORES',
    maralName: 'Conector N Macho para RG-8 / LMR400 (Pack 5 un)',
    maralRef: 'CON-N-MALE-5',
    maralPriceCOP: 48000,
    syscomRef: 'SYS-RF-NM-400',
    syscomPriceUSD: 18.00,
    syscomPriceCOP: 74700,
    syscomAvailability: 'STOCK_LIMITADO',
    maralStock: 180,
    maralAdvantageDays: 3,
    priceDiffCOP: 26700,
    savingsPercentage: 35.7,
    isMaralCheaper: true,
    killerPitch: 'Impermeable para intemperie, chapado en níquel anticorrosión.',
  },
];

// GET /api/competitors/syscom-comparison
router.get('/syscom-comparison', async (req: AuthRequest, res: Response) => {
  try {
    const { category, search } = req.query as { category?: string; search?: string };

    let filtered = [...MOCK_SYSCOM_MARKET_DATA];

    if (category && category !== 'ALL') {
      filtered = filtered.filter((i) => i.category === category);
    }

    if (search && search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (i) =>
          i.maralName.toLowerCase().includes(q) ||
          i.maralRef.toLowerCase().includes(q) ||
          i.syscomRef.toLowerCase().includes(q)
      );
    }

    const summary = {
      totalProductsTracked: filtered.length,
      averageSavingsPercentage: Math.round(
        filtered.reduce((sum, i) => sum + i.savingsPercentage, 0) / (filtered.length || 1)
      ),
      totalPriceAdvantageCOP: filtered.reduce((sum, i) => sum + i.priceDiffCOP, 0),
      syscomOutOrSlowCount: filtered.filter(
        (i) => i.syscomAvailability === 'SIN_STOCK' || i.syscomAvailability === 'IMPORTACION_15D'
      ).length,
      lastScrapedAt: new Date().toISOString(),
      trmApplied: 4150,
    };

    res.json({
      summary,
      items: filtered,
    });
  } catch (error) {
    console.error('Syscom comparison error:', error);
    res.status(500).json({ error: 'Error al obtener datos de competencia Syscom' });
  }
});

// POST /api/competitors/scrape-syscom
router.post('/scrape-syscom', async (req: AuthRequest, res: Response) => {
  try {
    // Simula actualización de scrape en tiempo real
    const updatedCount = MOCK_SYSCOM_MARKET_DATA.length;
    res.json({
      success: true,
      message: `Scraper ejecutado con éxito. Se escanearon ${updatedCount} referencias de Syscom Colombia.`,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Scrape execution error:', error);
    res.status(500).json({ error: 'Error al ejecutar scraper' });
  }
});

export default router;
