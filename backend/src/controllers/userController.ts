import { Request, Response } from 'express';
import User from '../models/User';

export const getUsers = async (_req: Request, res: Response): Promise<void> => {
  const users = await User.find().select('-password');
  res.json(users);
};

export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, role } = req.body;
    const user = await User.create({ name, email, password, role });
    res.status(201).json({ _id: user._id, name: user.name, email: user.email, role: user.role });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, role } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { name, email, role }, { new: true }).select('-password');
    if (!user) { res.status(404).json({ message: 'User not found' }); return; }
    res.json(user);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const changePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) { res.status(404).json({ message: 'User not found' }); return; }
    user.password = req.body.password;
    await user.save();
    res.json({ message: 'Password updated' });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const archiveUser = async (req: Request, res: Response): Promise<void> => {
  const user = await User.findByIdAndUpdate(req.params.id, { isArchived: true }, { new: true }).select('-password');
  if (!user) { res.status(404).json({ message: 'User not found' }); return; }
  res.json(user);
};

export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  await User.findByIdAndDelete(req.params.id);
  res.json({ message: 'User deleted' });
};
