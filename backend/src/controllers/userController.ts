import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';

export const getUsers = async (_req: Request, res: Response): Promise<void> => {
  const users = await prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, archived: true, createdAt: true }, orderBy: { name: 'asc' } });
  res.json(users);
};

export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, role } = req.body;
    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({ data: { name, email, password: hashed, role }, select: { id: true, name: true, email: true, role: true, archived: true } });
    res.status(201).json(user);
  } catch (err: any) { res.status(400).json({ message: err.message }); }
};

export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, role } = req.body;
    const user = await prisma.user.update({ where: { id: req.params.id }, data: { name, email, role }, select: { id: true, name: true, email: true, role: true, archived: true } });
    res.json(user);
  } catch (err: any) { res.status(400).json({ message: err.message }); }
};

export const changePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const hashed = await bcrypt.hash(req.body.password, 12);
    await prisma.user.update({ where: { id: req.params.id }, data: { password: hashed } });
    res.json({ message: 'Password updated' });
  } catch (err: any) { res.status(400).json({ message: err.message }); }
};

export const archiveUser = async (req: Request, res: Response): Promise<void> => {
  const existing = await prisma.user.findUnique({ where: { id: req.params.id }, select: { archived: true } });
  const user = await prisma.user.update({ where: { id: req.params.id }, data: { archived: !existing?.archived }, select: { id: true, name: true, email: true, role: true, archived: true } });
  res.json(user);
};

export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  await prisma.user.delete({ where: { id: req.params.id } });
  res.json({ message: 'User deleted' });
};
