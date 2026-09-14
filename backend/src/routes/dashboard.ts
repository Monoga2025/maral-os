import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET /api/dashboard/kpis
router.get('/kpis', async (req: AuthRequest, res: Response) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);

    const [
      monthlySales,
      activeOrders,
      pendingQuotations,
      overdueInvoices,
      criticalStockProducts,
      unconfirmedOrders,
      quotationsWithoutFollowup,
      recentActivity,
      stalledOrders,
    ] = await Promise.all([
      // Monthly sales (orders dispatched or delivered this month)
      prisma.order.aggregate({
        where: {
          status: { in: ['DESPACHADO', 'ENTREGADO'] },
          updatedAt: { gte: startOfMonth, lte: endOfMonth },
        },
        _sum: { total: true },
        _count: true,
      }),
      // Active orders (not cancelled, not delivered)
      prisma.order.count({
        where: { status: { in: ['CONFIRMADO', 'EN_PRODUCCION', 'EMPACADO', 'DESPACHADO'] } },
      }),
      // Pending quotations (sent but not responded)
      prisma.quotation.count({
        where: { status: { in: ['ENVIADA', 'APROBADA', 'BORRADOR'] } },
      }),
      // Overdue invoices
      prisma.invoice.aggregate({
        where: { status: 'VENCIDA' },
        _sum: { amount: true },
        _count: true,
      }),
      // Critical stock count
      prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*) as count FROM "Product"
        WHERE active = true AND "minStock" > 0 AND stock <= "minStock"
      `,
      // Unconfirmed orders older than 3 days
      prisma.order.count({
        where: {
          confirmed: false,
          status: 'CONFIRMADO',
          createdAt: { lte: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000) },
        },
      }),
      // Quotations sent more than 7 days ago without follow-up
      prisma.quotation.count({
        where: {
          status: { in: ['ENVIADA', 'APROBADA'] },
          OR: [
            { followUpDate: null },
            { followUpDate: { lt: now } },
          ],
          createdAt: { lte: sevenDaysAgo },
        },
      }),
      // Recent activity logs
      prisma.activityLog.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, role: true } },
        },
      }),
      // Pedidos confirmados/en producción sin actualizar en 5+ días
      prisma.order.count({
        where: {
          status: { in: ['CONFIRMADO', 'EN_PRODUCCION'] },
          updatedAt: { lte: fiveDaysAgo },
        },
      }),
    ]);

    // Count orders by status
    const ordersByStatusRaw = await prisma.order.groupBy({
      by: ['status'],
      where: { status: { in: ['CONFIRMADO', 'EN_PRODUCCION', 'EMPACADO', 'DESPACHADO', 'ENTREGADO', 'CANCELADO'] } },
      _count: { status: true },
    });
    const ordersByStatus: Record<string, number> = {};
    ordersByStatusRaw.forEach((row) => {
      ordersByStatus[row.status] = row._count.status;
    });

    res.json({
      salesThisMonth: monthlySales._sum.total || 0,
      salesGoal: 40000000,
      activeOrders,
      ordersByStatus,
      pendingQuotations,
      overdueFollowUps: quotationsWithoutFollowup,
      overdueReceivables: overdueInvoices._sum.amount || 0,
      criticalStock: Number((criticalStockProducts[0] as { count: bigint })?.count ?? 0),
      unconfirmedOrders,
      quotationsWithoutFollowup,
      stalledOrders,
      overdueInvoicesCount: overdueInvoices._count,
      recentActivity: recentActivity.map((a) => ({
        id: a.id,
        userId: a.userId,
        user: a.user,
        action: a.action,
        entity: a.entityType,
        entityId: a.entityId || '',
        description: (() => {
          const actions: Record<string, string> = { CREATE: 'Creó', UPDATE: 'Actualizó', DELETE: 'Eliminó', APPROVE: 'Aprobó', REJECT: 'Rechazó', CONVERT: 'Convirtió', PAY: 'Pagó', RECEIVE: 'Recibió' };
          const entities: Record<string, string> = { Quotation: 'cotización', Order: 'pedido', Client: 'cliente', Product: 'producto', Invoice: 'factura', PurchaseOrder: 'compra', ProductionOrder: 'producción', Expense: 'gasto' };
          const act = actions[a.action] ?? a.action;
          const ent = entities[a.entityType] ?? a.entityType;
          return `${act} ${ent}`;
        })(),
        createdAt: a.createdAt.toISOString(),
      })),
      period: {
        from: startOfMonth.toISOString(),
        to: endOfMonth.toISOString(),
      },
    });
  } catch (error) {
    console.error('Dashboard KPIs error:', error);
    res.status(500).json({ error: 'Error al obtener KPIs' });
  }
});

// GET /api/dashboard/sales-chart
router.get('/sales-chart', async (req: AuthRequest, res: Response) => {
  try {
    const months: { month: string; label: string; sales: number; orders: number }[] = [];
    const now = new Date();

    const monthNames = [
      'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
      'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
    ];

    const ranges = Array.from({ length: 6 }, (_, i) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const start = new Date(date.getFullYear(), date.getMonth(), 1);
      const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
      return { date, start, end };
    });

    const results = await Promise.all(
      ranges.map(({ start, end }) =>
        prisma.order.aggregate({
          where: {
            status: { in: ['DESPACHADO', 'ENTREGADO'] },
            updatedAt: { gte: start, lte: end },
          },
          _sum: { total: true },
          _count: true,
        })
      )
    );

    ranges.forEach(({ date }, i) => {
      months.push({
        month: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
        label: `${monthNames[date.getMonth()]} ${date.getFullYear()}`,
        sales: results[i]._sum.total || 0,
        orders: results[i]._count,
      });
    });

    res.json(months);
  } catch (error) {
    console.error('Sales chart error:', error);
    res.status(500).json({ error: 'Error al obtener datos de ventas' });
  }
});

// GET /api/dashboard/sales-by-line
router.get('/sales-by-line', async (req: AuthRequest, res: Response) => {
  try {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    // Get all order items with product category this year
    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: {
          status: { in: ['DESPACHADO', 'ENTREGADO'] },
          updatedAt: { gte: startOfYear },
        },
      },
      include: {
        product: { select: { category: true, line: true } },
        order: { select: { status: true } },
      },
    });

    const byCategory: Record<string, { revenue: number; units: number }> = {};
    const byLine: Record<string, { revenue: number; units: number }> = {};

    orderItems.forEach((item) => {
      const revenue = item.qty * item.unitPrice;
      const cat = item.product.category;
      const line = item.product.line;

      if (!byCategory[cat]) byCategory[cat] = { revenue: 0, units: 0 };
      byCategory[cat].revenue += revenue;
      byCategory[cat].units += item.qty;

      if (!byLine[line]) byLine[line] = { revenue: 0, units: 0 };
      byLine[line].revenue += revenue;
      byLine[line].units += item.qty;
    });

    const total = Object.values(byCategory).reduce((s, v) => s + v.revenue, 0);

    const categoriesData = Object.entries(byCategory)
      .map(([category, data]) => ({
        category,
        ...data,
        percentage: total > 0 ? (data.revenue / total) * 100 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    res.json({
      byCategory: categoriesData,
      byLine: Object.entries(byLine).map(([line, data]) => ({
        line,
        ...data,
        percentage: total > 0 ? (data.revenue / total) * 100 : 0,
      })),
      total,
      period: { from: startOfYear.toISOString(), to: now.toISOString() },
    });
  } catch (error) {
    console.error('Sales by line error:', error);
    res.status(500).json({ error: 'Error al obtener ventas por línea' });
  }
});

// GET /api/dashboard/alerts
router.get('/alerts', async (req: AuthRequest, res: Response) => {
  try {
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      criticalStock,
      unconfirmedOrders,
      quotationsWithoutFollowup,
      overdueInvoiceCount,
    ] = await Promise.all([
      // Critical stock
      prisma.$queryRaw<{ id: string; reference: string; name: string; stock: number; minStock: number }[]>`
        SELECT id, reference, name, stock, "minStock"
        FROM "Product"
        WHERE active = true AND "minStock" > 0 AND stock <= "minStock"
        ORDER BY stock ASC
        LIMIT 10
      `,
      // Unconfirmed orders older than 3 days
      prisma.order.findMany({
        where: {
          confirmed: false,
          status: 'CONFIRMADO',
          createdAt: { lte: threeDaysAgo },
        },
        include: { client: { select: { name: true } } },
        orderBy: { createdAt: 'asc' },
        take: 10,
      }),
      // Quotations sent more than 7 days ago without follow-up
      prisma.quotation.findMany({
        where: {
          status: { in: ['ENVIADA', 'APROBADA'] },
          OR: [
            { followUpDate: null },
            { followUpDate: { lt: now } },
          ],
          createdAt: { lte: sevenDaysAgo },
        },
        include: {
          client: { select: { name: true } },
          seller: { select: { name: true } },
        },
        orderBy: { createdAt: 'asc' },
        take: 10,
      }),
      prisma.invoice.count({ where: { status: 'VENCIDA' } }),
    ]);

    const alerts = [];

    if (criticalStock.length > 0) {
      alerts.push({
        type: 'STOCK_CRITICO',
        severity: 'HIGH',
        count: criticalStock.length,
        message: `${criticalStock.length} producto(s) con stock crítico`,
        items: criticalStock,
      });
    }

    if (unconfirmedOrders.length > 0) {
      alerts.push({
        type: 'PEDIDOS_SIN_CONFIRMAR',
        severity: 'MEDIUM',
        count: unconfirmedOrders.length,
        message: `${unconfirmedOrders.length} pedido(s) sin confirmar por más de 3 días`,
        items: unconfirmedOrders.map((o) => ({
          id: o.id,
          number: o.number,
          client: o.client.name,
          createdAt: o.createdAt,
        })),
      });
    }

    if (quotationsWithoutFollowup.length > 0) {
      alerts.push({
        type: 'COTIZACIONES_SIN_SEGUIMIENTO',
        severity: 'LOW',
        count: quotationsWithoutFollowup.length,
        message: `${quotationsWithoutFollowup.length} cotización(es) sin seguimiento`,
        items: quotationsWithoutFollowup.map((q) => ({
          id: q.id,
          number: q.number,
          client: q.client.name,
          seller: q.seller.name,
          createdAt: q.createdAt,
        })),
      });
    }

    if (overdueInvoiceCount > 0) {
      alerts.push({
        type: 'CARTERA_VENCIDA',
        severity: 'HIGH',
        count: overdueInvoiceCount,
        message: `${overdueInvoiceCount} factura(s) vencida(s) pendientes de cobro`,
      });
    }

    res.json({ alerts, generatedAt: now.toISOString() });
  } catch (error) {
    console.error('Dashboard alerts error:', error);
    res.status(500).json({ error: 'Error al obtener alertas' });
  }
});

// GET /api/dashboard/reactivation-radar
router.get('/reactivation-radar', async (req: AuthRequest, res: Response) => {
  try {
    const now = new Date();

    const clients = await prisma.client.findMany({
      where: { active: true, isProvider: false },
      include: {
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 3,
          include: {
            items: {
              include: {
                product: { select: { name: true, reference: true } },
              },
            },
          },
        },
        quotations: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    const analyzedClients = clients.map((c) => {
      const deliveredOrders = c.orders.filter((o) =>
        ['DESPACHADO', 'ENTREGADO', 'CONFIRMADO'].includes(o.status)
      );
      const totalSpent = deliveredOrders.reduce((sum, o) => sum + o.total, 0);
      const lastOrder = c.orders[0] || null;
      const lastOrderDate = lastOrder ? lastOrder.createdAt : null;

      let daysInactive = 999;
      if (lastOrderDate) {
        daysInactive = Math.floor((now.getTime() - new Date(lastOrderDate).getTime()) / (1000 * 60 * 60 * 24));
      } else {
        const clientCreatedDays = Math.floor((now.getTime() - new Date(c.createdAt).getTime()) / (1000 * 60 * 60 * 24));
        daysInactive = clientCreatedDays;
      }

      let urgency: 'CRITICO' | 'DORMIDO' | 'ENFRIANDOSE' | 'SEGUIMIENTO' | 'ACTIVO' = 'SEGUIMIENTO';
      if (lastOrderDate) {
        if (daysInactive >= 90) urgency = 'CRITICO';
        else if (daysInactive >= 60) urgency = 'DORMIDO';
        else if (daysInactive >= 30) urgency = 'ENFRIANDOSE';
        else if (daysInactive >= 7) urgency = 'SEGUIMIENTO';
        else urgency = 'ACTIVO';
      } else {
        urgency = daysInactive >= 30 ? 'ENFRIANDOSE' : 'SEGUIMIENTO';
      }

      const lastProducts = lastOrder?.items.map((i) => i.product.name).filter(Boolean) || [];
      const primaryProduct = lastProducts[0] || 'equipos y accesorios electrónicos';

      const contactPerson = c.purchaseContactName || c.ownerName || c.name.split(' ')[0] || 'estimado cliente';
      const cleanPhone = (c.whatsapp || c.phone || '').replace(/\D/g, '');
      const waNumber = cleanPhone.length === 10 ? `57${cleanPhone}` : cleanPhone;

      const pitchText = `Hola ${contactPerson}, un cordial saludo de MARAL Tecnología y Comunicaciones ⚡. Estaba revisando tu historial y vi que tu última adquisición con nosotros fue de ${primaryProduct}. Queremos contarte que tenemos lotes disponibles y condiciones comerciales preferenciales para ti esta semana. ¿Te gustaría que te preparemos una propuesta actualizada?`;

      return {
        id: c.id,
        name: c.name,
        company: c.company,
        phone: c.phone,
        whatsapp: c.whatsapp,
        waNumber,
        city: c.city,
        category: c.category,
        totalSpent,
        orderCount: c.orders.length,
        daysInactive,
        lastOrderDate: lastOrderDate ? lastOrderDate.toISOString() : null,
        lastProducts,
        primaryProduct,
        urgency,
        suggestedPitch: pitchText,
      };
    });

    const urgencyWeight: Record<string, number> = {
      CRITICO: 5,
      DORMIDO: 4,
      ENFRIANDOSE: 3,
      SEGUIMIENTO: 2,
      ACTIVO: 1,
    };

    const sortedClients = [...analyzedClients].sort((a, b) => {
      const weightDiff = (urgencyWeight[b.urgency] || 0) - (urgencyWeight[a.urgency] || 0);
      if (weightDiff !== 0) return weightDiff;
      return b.totalSpent - a.totalSpent;
    });

    const summary = {
      totalOpportunities: sortedClients.length,
      criticalCount: sortedClients.filter((c) => c.urgency === 'CRITICO').length,
      dormantCount: sortedClients.filter((c) => c.urgency === 'DORMIDO').length,
      coolingCount: sortedClients.filter((c) => c.urgency === 'ENFRIANDOSE').length,
      followUpCount: sortedClients.filter((c) => c.urgency === 'SEGUIMIENTO').length,
      potentialRevenueCOP: sortedClients.reduce((acc, c) => acc + (c.totalSpent > 0 ? c.totalSpent * 0.35 : 1200000), 0),
    };

    res.json({ summary, clients: sortedClients.slice(0, 15) });
  } catch (error) {
    console.error('Reactivation radar error:', error);
    res.status(500).json({ error: 'Error al calcular radar de reactivación' });
  }
});

export default router;
