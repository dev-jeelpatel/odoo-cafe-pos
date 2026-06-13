import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';

const signToken = (id: string) =>
  jwt.sign({ id }, process.env.JWT_SECRET as string, { expiresIn: '7d' } as any);

export const signup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password } = req.body;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) { res.status(400).json({ message: 'Email already registered' }); return; }

    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({ data: { name, email, password: hashed, role: 'ADMIN' } });

    const session = await prisma.session.create({ data: { userId: user.id } });
    const token = signToken(user.id);

    await prisma.auditLog.create({ data: { userId: user.id, action: 'LOGIN', entityType: 'User', entityId: user.id } });

    res.status(201).json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      session,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.archived) { res.status(401).json({ message: 'Invalid email or password' }); return; }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) { res.status(401).json({ message: 'Invalid email or password' }); return; }

    const token = signToken(user.id);
    let session = await prisma.session.findFirst({ where: { userId: user.id, status: 'OPEN' } });
    if (!session) {
      session = await prisma.session.create({ data: { userId: user.id } });
    }

    await prisma.auditLog.create({ data: { userId: user.id, action: 'LOGIN', entityType: 'User', entityId: user.id } });

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      session,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const getMe = async (req: any, res: Response): Promise<void> => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { id: true, name: true, email: true, role: true, createdAt: true } });
  res.json(user);
};
