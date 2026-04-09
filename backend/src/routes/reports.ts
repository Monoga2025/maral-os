import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);
router.use(requireRole('GERENTE', 'VENTAS'));

const dateRangeSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  clientId: z.string().optional(),
  productLine: z.string().optional(),
  category: z.string().optional(),
  city: z.string().optional(),
});

// GET /api/reports/sales
router.get('/sales', async (req: AuthRequest, res: Response) => {
  try {
    const validation = dateRangeSchema.safeParse({
      from: req.query.from,
      to: req.query.to,
      clientId: req.query.clientId,
      productLine: req.query.productLine,
      category: req.query.category,
      city: req.query.city,
    });

    if (!validation.success) {
      res.status(400).json({ error: 'Parámetros inválidos', details: validation.error.flatten() });
      return;
    }

    const { from, to, clientId, city } = validation.data;

    const orderWhere: Record<string, unknown> = {
      status: { in: ['DESPACHADO', 'ENTREGADO'] },
    };

    if (from || to) {
      orderWhere.createdAt = {};
      const dateFilter = orderWhere.createdAt as Record<string, Date>;
      if (from) dateFilter.gte = new Date(from);
      if (to) dateFilter.lte = new Date(to);
    }

    if (clientId) orderWhere.clientId = clientId;
    if (city) orderWhere.city = { contains: city, mode: 'insensitive' };

    // Get all completed orders with items
    const orders = await prisma.order.findMany({
      where: orderWhere,
      include: {
        client: { select: { id: true, name: true, company: true, city: true, department: true } },
        items: {
          include: {
            product: {
              select: { id: true, reference: true, name: true, category: true, line: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Aggregate by client
    const byClient: Record<string, { clientId: string; name: string; orders: number; revenue: number; units: number }> = {};
    // Aggregate by city
    const byCity: Record<string, { city: string; orders: number; revenue: number }> = {};
    // Aggregate by product category
    const byCategory: Record<string, { category: string; revenue: number; units: number }> = {};
    // Aggregate by product line
    const byLine: Record<string, { line: string; revenue: number; units: number }> = {};
    // Top products
    const byProduct: Record<string, { productId: string; reference: string; name: string; revenue: number; units: number }> = {};

    let totalRevenue = 0;
    let totalOrders = orders.length;

    orders.forEach((order) => {
      totalRevenue += order.total;

      // By client
      const clientKey = order.clientId;
      if (!byClient[clientKey]) {
        byClient[clientKey] = {
          clientId: order.clientId,
          name: order.client.name,
          orders: 0,
          revenue: 0,
          units: 0,
        };
      }
      byClient[clientKey].orders++;
      byClient[clientKey].revenue += order.total;

      // By city
      const cityKey = order.client.city ?? 'Sin ciudad';
      if (!byCity[cityKey]) {
        byCity[cityKey] = { city: cityKey, orders: 0, revenue: 0 };
      }
      byCity[cityKey].orders++;
      byCity[cityKey].revenue += order.total;

      // By items
      order.items.forEach((item) => {
        const revenue = item.qty * item.unitPrice;

        byClient[clientKey].units += item.qty;

        const catKey = item.product.category;
        if (!byCategory[catKey]) byCategory[catKey] = { category: catKey, revenue: 0, units: 0 };
        byCategory[catKey].revenue += revenue;
        byCategory[catKey].units += item.qty;

        const lineKey = item.product.line;
        if (!byLine[lineKey]) byLine[lineKey] = { line: lineKey, revenue: 0, units: 0 };
        byLine[lineKey].revenue += revenue;
        byLine[lineKey].units += item.qty;

        const prodKey = item.productId;
        if (!byProduct[prodKey]) {
          byProduct[prodKey] = {
            productId: item.productId,
            reference: item.product.reference,
            name: item.product.name,
            revenue: 0,
            units: 0,
          };
        }
        byProduct[prodKey].revenue += revenue;
        byProduct[prodKey].units += item.qty;
      });
    });

    const uniqueClients = Object.keys(byClient).length;

    res.json({
      totalAmount: totalRevenue,
      totalOrders,
      avgTicket: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      uniqueClients,
      byClient: Object.values(byClient)
        .sort((a, b) => b.revenue - a.revenue)
        .map((c) => ({ clientName: c.name, amount: c.revenue, orders: c.orders })),
      byCity: Object.values(byCity).sort((a, b) => b.revenue - a.revenue),
      byCategory: Object.values(byCategory)
        .sort((a, b) => b.revenue - a.revenue)
        .map((c) => ({ category: c.category, amount: c.revenue, units: c.units })),
      byLine: Object.values(byLine)
        .sort((a, b) => b.revenue - a.revenue)
        .map((l) => ({ line: l.line, amount: l.revenue, units: l.units })),
      topProducts: Object.values(byProduct)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 20),
    });
  } catch (error) {
    console.error('Sales report error:', error);
    res.status(500).json({ error: 'Error al generar reporte de ventas' });
  }
});

// GET /api/reports/operations
router.get('/operations', async (req: AuthRequest, res: Response) => {
  try {
    const from = req.query.from ? new Date(req.query.from as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const to = req.query.to ? new Date(req.query.to as string) : new Date();

    const [
      totalOrders,
      dispatchedOrders,
      pendingOrders,
      cancelledOrders,
      productionOrders,
    ] = await Promise.all([
      prisma.order.count({ where: { createdAt: { gte: from, lte: to } } }),
      prisma.order.findMany({
        where: {
          status: { in: ['DESPACHADO', 'ENTREGADO'] },
          dispatchDate: { not: null },
          createdAt: { gte: from, lte: to },
        },
        select: { createdAt: true, dispatchDate: true, status: true },
      }),
      prisma.order.count({
        where: {
          status: { in: ['CONFIRMADO', 'EN_PRODUCCION', 'EMPACADO'] },
          createdAt: { gte: from, lte: to },
        },
      }),
      prisma.order.count({
        where: { status: 'CANCELADO', createdAt: { gte: from, lte: to } },
      }),
      prisma.productionOrder.findMany({
        where: { createdAt: { gte: from, lte: to } },
        select: { status: true, phase: true, createdAt: true, updatedAt: true },
      }),
    ]);

    // Calculate avg fulfillment time
    let totalFulfillmentDays = 0;
    let fulfillmentCount = 0;

    dispatchedOrders.forEach((order) => {
      if (order.dispatchDate) {
        const days =
          (new Date(order.dispatchDate).getTime() - new Date(order.createdAt).getTime()) /
          (1000 * 60 * 60 * 24);
        if (days >= 0) {
          totalFulfillmentDays += days;
          fulfillmentCount++;
        }
      }
    });

    const avgFulfillmentDays =
      fulfillmentCount > 0 ? totalFulfillmentDays / fulfillmentCount : 0;

    // Production breakdown
    const productionByStatus: Record<string, number> = {};
    const productionByPhase: Record<string, number> = {};

    productionOrders.forEach((po) => {
      productionByStatus[po.status] = (productionByStatus[po.status] || 0) + 1;
      productionByPhase[po.phase] = (productionByPhase[po.phase] || 0) + 1;
    });

    res.json({
      period: { from: from.toISOString(), to: to.toISOString() },
      dispatched: dispatchedOrders.length,
      pending: pendingOrders,
      cancelled: cancelledOrders,
      total: totalOrders,
      avgFulfillmentDays: parseFloat(avgFulfillmentDays.toFixed(1)),
      fulfillmentRate: totalOrders > 0 ? parseFloat(((dispatchedOrders.length / totalOrders) * 100).toFixed(1)) : 0,
      topProducts: [],
      production: {
        total: productionOrders.length,
        byStatus: productionByStatus,
        byPhase: productionByPhase,
      },
    });
  } catch (error) {
    console.error('Operations report error:', error);
    res.status(500).json({ error: 'Error al generar reporte de operaciones' });
  }
});

export default router;
