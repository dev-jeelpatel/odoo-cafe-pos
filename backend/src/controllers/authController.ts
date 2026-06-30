import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const signToken = (id: string) =>
  jwt.sign({ id }, process.env.JWT_SECRET as string, { expiresIn: '7d' } as any);

export const signup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    // Input validation
    if (!name || typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) {
      res.status(400).json({ message: 'Name must be 2–100 characters' }); return;
    }
    if (!email || typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
      res.status(400).json({ message: 'Valid email is required' }); return;
    }
    if (!password || typeof password !== 'string' || password.length < 8) {
      res.status(400).json({ message: 'Password must be at least 8 characters' }); return;
    }
    if (password.length > 128) {
      res.status(400).json({ message: 'Password too long' }); return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existing) { res.status(400).json({ message: 'Email already registered' }); return; }

    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name: name.trim(), email: cleanEmail, password: hashed, role: 'ADMIN' },
    });

    const session = await prisma.session.create({ data: { userId: user.id } });
    const token = signToken(user.id);

    await prisma.auditLog.create({
      data: { userId: user.id, action: 'LOGIN', entityType: 'User', entityId: user.id },
    });

    res.status(201).json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      session,
    });
  } catch (err: any) {
    res.status(500).json({ message: 'Registration failed' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Input validation
    if (!email || typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
      res.status(400).json({ message: 'Valid email is required' }); return;
    }
    if (!password || typeof password !== 'string' || password.length < 1) {
      res.status(400).json({ message: 'Password is required' }); return;
    }
    // Reject absurdly long passwords to prevent bcrypt DoS
    if (password.length > 128) {
      res.status(401).json({ message: 'Invalid email or password' }); return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: cleanEmail } });

    // Use same error message for missing user & bad password (prevents user enumeration)
    if (!user || user.archived) {
      await bcrypt.compare(password, '$2b$12$invalidhashtopreventtimingattacks000000000000000000000'); // timing-safe
      res.status(401).json({ message: 'Invalid email or password' }); return;
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) { res.status(401).json({ message: 'Invalid email or password' }); return; }

    const token = signToken(user.id);
    let session = await prisma.session.findFirst({ where: { userId: user.id, status: 'OPEN' } });
    if (!session) {
      session = await prisma.session.create({ data: { userId: user.id } });
    }

    await prisma.auditLog.create({
      data: { userId: user.id, action: 'LOGIN', entityType: 'User', entityId: user.id },
    });

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      session,
    });
  } catch (err: any) {
    res.status(500).json({ message: 'Login failed' });
  }
};

export const getMe = async (req: any, res: Response): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
  res.json(user);
};

export const logout = async (req: any, res: Response): Promise<void> => {
  try {
    // Close any open cashier sessions for this user
    await prisma.session.updateMany({
      where: { userId: req.user.id, status: 'OPEN' },
      data: { status: 'CLOSED', closedAt: new Date() },
    });
    await prisma.auditLog.create({
      data: { userId: req.user.id, action: 'LOGOUT', entityType: 'User', entityId: req.user.id },
    });
    res.json({ message: 'Logged out successfully' });
  } catch (err: any) {
    res.status(500).json({ message: 'Logout failed' });
  }
};
