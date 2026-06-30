import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import { Server as SocketServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import morgan from 'morgan';
import jwt from 'jsonwebtoken';
import prisma from './lib/prisma';
import routes from './routes';
import { docsHtml } from './docs';
import { sanitizeBody } from './middleware/sanitize';

const app = express();
const server = http.createServer(app);

const isProd = process.env.NODE_ENV === 'production';
const ALLOWED_ORIGIN = process.env.CLIENT_URL || 'http://localhost:3000';

// ── Socket.io ─────────────────────────────────────────────────────────────────
const io = new SocketServer(server, {
  cors: { origin: ALLOWED_ORIGIN, credentials: true },
});

// Socket.io JWT authentication — every connection must send a valid token
io.use((socket, next) => {
  const token = socket.handshake.auth?.token as string | undefined;
  if (!token) return next(new Error('Authentication required'));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string };
    (socket as any).userId = decoded.id;
    next();
  } catch {
    next(new Error('Invalid or expired token'));
  }
});

// ── Security headers (helmet) ─────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: isProd ? undefined : false,
  })
);

// ── Gzip compression (cuts response sizes 60-80%) ─────────────────────────────
app.use(compression());

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: ALLOWED_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── HTTP request logging ──────────────────────────────────────────────────────
app.use(morgan(isProd ? 'combined' : 'dev'));

// ── Body parsing with size limit ──────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

// ── XSS / injection sanitization for all incoming string inputs ────────────────
app.use(sanitizeBody);

// ── Rate limiting ─────────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' },
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' },
});

app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);

// ── Attach io to every request ────────────────────────────────────────────────
app.use((req: any, _res, next) => { req.io = io; next(); });

// ── Routes ────────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

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

// ── Global error handler (no stack traces in production) ──────────────────────
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status ?? err.statusCode ?? 500;
  const message = isProd && status === 500 ? 'Internal server error' : (err.message ?? 'Internal server error');
  if (!isProd) console.error('[ERROR]', err);
  res.status(status).json({ message });
});

// ── Socket.io connection tracking ─────────────────────────────────────────────
io.on('connection', socket => {
  if (!isProd) console.log(`[Socket] ${socket.id} connected (user ${(socket as any).userId})`);
  socket.on('disconnect', () => {
    if (!isProd) console.log(`[Socket] ${socket.id} disconnected`);
  });
});

// ── Process safety nets ───────────────────────────────────────────────────────
process.on('unhandledRejection', (reason) => {
  console.error('[UnhandledRejection]', reason);
});

process.on('uncaughtException', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    const port = process.env.PORT || 5000;
    console.error(`\n[Error] Port ${port} is already in use — another backend instance is running.`);
    console.error('[Fix] Run one of these to free the port:');
    console.error(`       Windows: netstat -ano | findstr :${port}   then: taskkill /PID <pid> /F`);
    console.error(`       Or set a different PORT in backend/.env`);
    process.exit(1);
  }
  console.error('[UncaughtException]', err);
  process.exit(1);
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────
async function gracefulShutdown(signal: string) {
  console.log(`\n[Shutdown] ${signal} — shutting down gracefully`);
  server.close(async () => {
    await prisma.$disconnect();
    console.log('[Shutdown] Complete');
    process.exit(0);
  });
  setTimeout(() => { process.exit(1); }, 10_000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

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
    console.log('[Seed] Default payment methods created');
  }
}

async function start() {
  await prisma.$connect();
  console.log('[DB] PostgreSQL connected via Prisma');
  await seedDefaults();

  const PORT = parseInt(String(process.env.PORT || '5000'));

  // Catch port-in-use BEFORE server tries to listen
  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n[Error] Port ${PORT} is already in use.`);
      console.error('[Fix] Windows: netstat -ano | findstr :' + PORT + '   then: taskkill /PID <pid> /F');
      process.exit(1);
    }
    throw err;
  });

  server.listen(PORT, () => {
    console.log(`[Server] http://localhost:${PORT}  [${isProd ? 'production' : 'development'}]`);
  });
}

start().catch(err => {
  console.error('[Startup] Failed:', err);
  process.exit(1);
});
