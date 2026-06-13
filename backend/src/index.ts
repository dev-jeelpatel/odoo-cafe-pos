import 'dotenv/config';
import express from 'express';
import http from 'http';
import { Server as SocketServer } from 'socket.io';
import cors from 'cors';
import mongoose from 'mongoose';
import routes from './routes';
import PaymentMethod from './models/PaymentMethod';

const app = express();
const server = http.createServer(app);
const io = new SocketServer(server, {
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true },
});

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json());

// Attach io to every request
app.use((req: any, _res, next) => {
  req.io = io;
  next();
});

app.use('/api', routes);

io.on('connection', socket => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});

async function seedDefaults() {
  const count = await PaymentMethod.countDocuments();
  if (count === 0) {
    await PaymentMethod.insertMany([
      { name: 'cash', label: 'Cash', isEnabled: true },
      { name: 'upi', label: 'UPI QR', isEnabled: true },
      { name: 'card', label: 'Card / Digital', isEnabled: true },
    ]);
    console.log('Seeded default payment methods');
  }
}

async function start() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cafe-pos');
  console.log('MongoDB connected');
  await seedDefaults();
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

start().catch(console.error);
