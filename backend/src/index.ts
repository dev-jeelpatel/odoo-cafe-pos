import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import { Server as SocketServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import prisma from './lib/prisma';
import routes from './routes';
import { docsHtml } from './docs';

const app = express();
const server = http.createServer(app);

const isProd = process.env.NODE_ENV === 'production';
const ALLOWED_ORIGIN = process.env.CLIENT_URL || 'http://localhost:3000';

// ── Socket.io ─────────────────────────────────────────────────────────────────
const io = new SocketServer(server, {
  cors: { origin: ALLOWED_ORIGIN, credentials: true },
});

// ── Security headers (helmet) ─────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginEmbedderPolicy: false, // needed for docs HTML iframe embedding
    contentSecurityPolicy: isProd
      ? undefined // use helmet defaults in production
      : false,    // disable CSP in dev for ease of local testing
  })
);

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(cors({ origin: ALLOWED_ORIGIN, credentials: true }));

// ── Body parsing (with 1 MB size limit to prevent payload floods) ─────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

// ── Rate limiting ─────────────────────────────────────────────────────────────
// Strict limit on auth endpoints (login / signup)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,                   // max 20 attempts per IP per 15 min
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' },
});

// General API limiter
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 300,            // 300 requests/min per IP — generous for a POS
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' },
});

// Apply auth limiter before routes register
app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);

// ── Attach io to every request ────────────────────────────────────────────────
app.use((req: any, _res, next) => { req.io = io; next(); });

// ── Routes ────────────────────────────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({ status: 'ok', message: 'Cafe POS API is running', version: '1.0.0' });
});

app.get('/docs', (_req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(docsHtml);
});

app.use('/api', routes);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// ── Global error handler (never leaks stack traces in production) ─────────────
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status ?? err.statusCode ?? 500;
  const message = isProd && status === 500 ? 'Internal server error' : (err.message ?? 'Internal server error');
  if (!isProd) console.error('[ERROR]', err);
  res.status(status).json({ message });
});

// ── Socket.io ─────────────────────────────────────────────────────────────────
io.on('connection', socket => {
  if (!isProd) console.log(`Socket connected: ${socket.id}`);
  socket.on('disconnect', () => {
    if (!isProd) console.log(`Socket disconnected: ${socket.id}`);
  });
});

// ── Unhandled rejection / exception safety net ────────────────────────────────
process.on('unhandledRejection', (reason) => {
  console.error('[UnhandledRejection]', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[UncaughtException]', err);
  process.exit(1);
});

// ── Startup ───────────────────────────────────────────────────────────────────
async function seedDefaults() {
  const count = await prisma.paymentMethodConfig.count();
  if (count === 0) {
    await prisma.paymentMethodConfig.createMany({
      data: [
        { method: 'CASH', label: 'Cash', enabled: true },
        { method: 'UPI', label: 'UPI QR', enabled: true },
        { method: 'CARD', label: 'Card / Digital', enabled: true },
      ],
    });
    console.log('Seeded default payment methods');
  }
}

async function start() {
  await prisma.$connect();
  console.log('PostgreSQL connected via Prisma');
  await seedDefaults();
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}

start().catch(err => {
  console.error('Startup failed:', err);
  process.exit(1);
});
