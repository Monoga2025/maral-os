import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';

// Routes
import authRoutes from './routes/auth';
import clientRoutes from './routes/clients';
import productRoutes from './routes/products';
import quotationRoutes from './routes/quotations';
import orderRoutes from './routes/orders';
import inventoryRoutes from './routes/inventory';
import productionRoutes from './routes/production';
import purchaseRoutes from './routes/purchases';
import supplierRoutes from './routes/suppliers';
import invoiceRoutes from './routes/invoices';
import dashboardRoutes from './routes/dashboard';
import reportRoutes from './routes/reports';
import syncRouter from './routes/sync';
import userRoutes from './routes/users';
import taskRoutes from './routes/tasks';
import expenseRoutes from './routes/expenses';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

// Ensure uploads directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// ── Middleware ──────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Request logger ──────────────────────────────────────────
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    const color =
      res.statusCode >= 500 ? '\x1b[31m' :
      res.statusCode >= 400 ? '\x1b[33m' :
      '\x1b[32m';
    const userId = (req as { user?: { userId: string } }).user?.userId ?? '-';
    console.log(`${color}${req.method}\x1b[0m ${req.path} ${res.statusCode} ${ms}ms user=${userId}`);
  });
  next();
});

// Serve uploaded files
app.use('/uploads', express.static(path.resolve(UPLOAD_DIR)));

// ── Health check ────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'maral-os-backend',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// ── API Routes ──────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/products', productRoutes);
app.use('/api/quotations', quotationRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/production', productionRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/sync', syncRouter);
app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/expenses', expenseRoutes);

// ── Serve frontend in production ────────────────────────────
if (process.env.NODE_ENV === 'production') {
  const frontendDist = path.resolve(__dirname, '../../frontend/dist');
  if (fs.existsSync(frontendDist)) {
    app.use(express.static(frontendDist));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(frontendDist, 'index.html'));
    });
  }
}

// ── Global error handler ────────────────────────────────────
app.use(
  (
    err: Error & { status?: number },
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error('Unhandled error:', err);
    res.status(err.status || 500).json({
      error: err.message || 'Error interno del servidor',
    });
  }
);

// ── Start server ────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('  ╔═══════════════════════════════════════════╗');
  console.log('  ║       MARAL OS — Backend Server           ║');
  console.log('  ╠═══════════════════════════════════════════╣');
  console.log(`  ║  Port    : ${PORT}                            ║`);
  console.log(`  ║  Env     : ${(process.env.NODE_ENV || 'development').padEnd(30)}║`);
  console.log(`  ║  Health  : http://localhost:${PORT}/health    ║`);
  console.log('  ╚═══════════════════════════════════════════╝');
  console.log('');
});

export default app;
