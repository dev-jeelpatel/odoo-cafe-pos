import { Request, Response } from 'express';
import prisma from '../lib/prisma';

// ── Floors ─────────────────────────────────────────────────────────────────

export const getFloors = async (_req: Request, res: Response): Promise<void> => {
  const floors = await prisma.floor.findMany({ orderBy: { name: 'asc' } });
  res.json(floors);
};

export const createFloor = async (req: Request, res: Response): Promise<void> => {
  try {
    const floor = await prisma.floor.create({ data: { name: req.body.name } });
    res.status(201).json(floor);
  } catch (err: any) { res.status(400).json({ message: err.message }); }
};

export const updateFloor = async (req: Request, res: Response): Promise<void> => {
  try {
    const floor = await prisma.floor.update({ where: { id: req.params.id }, data: { name: req.body.name } });
    res.json(floor);
  } catch (err: any) { res.status(400).json({ message: err.message }); }
};

export const deleteFloor = async (req: Request, res: Response): Promise<void> => {
  try {
    await prisma.table.deleteMany({ where: { floorId: req.params.id } });
    await prisma.floor.delete({ where: { id: req.params.id } });
    res.json({ message: 'Floor and tables deleted' });
  } catch (err: any) { res.status(400).json({ message: err.message }); }
};

// ── Tables ─────────────────────────────────────────────────────────────────

export const getTables = async (req: Request, res: Response): Promise<void> => {
  const where: any = {};
  if (req.query.floor) where.floorId = req.query.floor as string;
  const tables = await prisma.table.findMany({ where, include: { floor: true }, orderBy: { tableNumber: 'asc' } });
  res.json(tables);
};

export const createTable = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tableNumber, seats, floorId, status } = req.body;
    const table = await prisma.table.create({
      data: { tableNumber, seats: parseInt(seats), floorId, status: status?.toUpperCase() || 'AVAILABLE' },
      include: { floor: true },
    });
    res.status(201).json(table);
  } catch (err: any) { res.status(400).json({ message: err.message }); }
};

export const updateTable = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tableNumber, seats, floorId, status, active } = req.body;
    const table = await prisma.table.update({
      where: { id: req.params.id },
      data: { tableNumber, seats: seats ? parseInt(seats) : undefined, floorId, status: status?.toUpperCase(), active },
      include: { floor: true },
    });
    res.json(table);
  } catch (err: any) { res.status(400).json({ message: err.message }); }
};

export const deleteTable = async (req: Request, res: Response): Promise<void> => {
  try {
    await prisma.table.delete({ where: { id: req.params.id } });
    res.json({ message: 'Table deleted' });
  } catch (err: any) { res.status(400).json({ message: err.message }); }
};
