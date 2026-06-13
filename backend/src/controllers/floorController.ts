import { Request, Response } from 'express';
import Floor from '../models/Floor';
import Table from '../models/Table';

export const getFloors = async (_req: Request, res: Response): Promise<void> => {
  const floors = await Floor.find().sort('name');
  res.json(floors);
};

export const createFloor = async (req: Request, res: Response): Promise<void> => {
  try {
    const floor = await Floor.create(req.body);
    res.status(201).json(floor);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const updateFloor = async (req: Request, res: Response): Promise<void> => {
  try {
    const floor = await Floor.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!floor) { res.status(404).json({ message: 'Floor not found' }); return; }
    res.json(floor);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const deleteFloor = async (req: Request, res: Response): Promise<void> => {
  await Floor.findByIdAndDelete(req.params.id);
  await Table.deleteMany({ floor: req.params.id });
  res.json({ message: 'Floor and tables deleted' });
};

export const getTables = async (req: Request, res: Response): Promise<void> => {
  const filter: any = {};
  if (req.query.floor) filter.floor = req.query.floor;
  const tables = await Table.find(filter).populate('floor').sort('number');
  res.json(tables);
};

export const createTable = async (req: Request, res: Response): Promise<void> => {
  try {
    const table = await Table.create(req.body);
    const populated = await table.populate('floor');
    res.status(201).json(populated);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const updateTable = async (req: Request, res: Response): Promise<void> => {
  try {
    const table = await Table.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('floor');
    if (!table) { res.status(404).json({ message: 'Table not found' }); return; }
    res.json(table);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const deleteTable = async (req: Request, res: Response): Promise<void> => {
  await Table.findByIdAndDelete(req.params.id);
  res.json({ message: 'Table deleted' });
};
