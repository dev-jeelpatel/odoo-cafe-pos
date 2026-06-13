import 'dotenv/config';
import express from 'express';
import http from 'http';
import { Server as SocketServer } from 'socket.io';
import cors from 'cors';
import prisma from './lib/prisma';
import routes from './routes';
import { docsHtml } from './docs';

const app = express();
const server = http.createServer(app);
const io = new SocketServer(server, {
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true },
});

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json());

// Attach io to every request
app.use((req: any, _res, next) => { req.io = io; next(); });

app.get('/', (_req, res) => {
  res.json({ status: 'ok', message: 'Cafe POS API is running', version: '1.0.0', docs: 'http://localhost:5000/docs' });
});

app.get('/docs', (_req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(docsHtml);
});

app.use('/api', routes);

io.on('connection', socket => {
  console.log(`Socket connected: ${socket.id}`);
  socket.on('disconnect', () => console.log(`Socket disconnected: ${socket.id}`));
});

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
