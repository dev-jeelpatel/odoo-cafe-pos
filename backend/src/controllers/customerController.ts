import { Request, Response } from 'express';
import Customer from '../models/Customer';

export const getCustomers = async (req: Request, res: Response): Promise<void> => {
  const filter: any = {};
  if (req.query.search) {
    filter.$or = [
      { name: { $regex: req.query.search, $options: 'i' } },
      { phone: { $regex: req.query.search, $options: 'i' } },
    ];
  }
  const customers = await Customer.find(filter).sort('name');
  res.json(customers);
};

export const createCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const customer = await Customer.create(req.body);
    res.status(201).json(customer);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const updateCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!customer) { res.status(404).json({ message: 'Customer not found' }); return; }
    res.json(customer);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const deleteCustomer = async (req: Request, res: Response): Promise<void> => {
  await Customer.findByIdAndDelete(req.params.id);
  res.json({ message: 'Customer deleted' });
};
