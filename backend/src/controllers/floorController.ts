import { Request, Response } from 'express';
import prisma from '../lib/prisma';

// ── Floors ─────────────────────────────────────────────────────────────────────

export const getFloors = async (_req: Request, res: Response): Promise<void> => {
  try {
    const floors = await prisma.floor.findMany({ orderBy: { name: 'asc' } });
    res.json(floors);
  } catch { res.status(500).json({ message: 'Failed to fetch floors' }); }
};

export const createFloor = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name } = req.body;
    if (!name?.trim()) { res.status(400).json({ message: 'Floor name is required' }); return; }
    const floor = await prisma.floor.create({ data: { name: name.trim() } });
    res.status(201).json(floor);
  } catch (err: any) {
    if (err.code === 'P2002') { res.status(400).json({ message: 'Floor name already exists' }); return; }
    res.status(400).json({ message: 'Failed to create floor' });
  }
};

export const updateFloor = async (req: Request, res: Response): Promise<void> => {
  try {
    const floor = await prisma.floor.update({ where: { id: req.params.id }, data: { name: req.body.name?.trim() } });
    res.json(floor);
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ message: 'Floor not found' }); return; }
    res.status(400).json({ message: 'Failed to update floor' });
  }
};

export const deleteFloor = async (req: Request, res: Response): Promise<void> => {
  try {
    await prisma.table.deleteMany({ where: { floorId: req.params.id } });
    await prisma.floor.delete({ where: { id: req.params.id } });
    res.json({ message: 'Floor and tables deleted' });
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ message: 'Floor not found' }); return; }
    res.status(400).json({ message: 'Failed to delete floor' });
  }
};

// ── Tables ─────────────────────────────────────────────────────────────────────

export const getTables = async (req: Request, res: Response): Promise<void> => {
  try {
    const where: any = {};
    if (req.query.floor) where.floorId = req.query.floor as string;
    const tables = await prisma.table.findMany({ where, include: { floor: true }, orderBy: { tableNumber: 'asc' } });
    res.json(tables);
  } catch { res.status(500).json({ message: 'Failed to fetch tables' }); }
};

export const createTable = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tableNumber, seats, floorId, status } = req.body;
    if (!tableNumber || !floorId) { res.status(400).json({ message: 'tableNumber and floorId are required' }); return; }
    const table = await prisma.table.create({
      data: { tableNumber, seats: parseInt(seats) || 2, floorId, status: status?.toUpperCase() || 'AVAILABLE' },
      include: { floor: true },
    });
    res.status(201).json(table);
  } catch (err: any) {
    res.status(400).json({ message: 'Failed to create table' });
  }
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
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ message: 'Table not found' }); return; }
    res.status(400).json({ message: 'Failed to update table' });
  }
};

export const deleteTable = async (req: Request, res: Response): Promise<void> => {
  try {
    await prisma.table.delete({ where: { id: req.params.id } });
    res.json({ message: 'Table deleted' });
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ message: 'Table not found' }); return; }
    res.status(400).json({ message: 'Failed to delete table' });
  }
};
