import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import Session from '../models/Session';

const signToken = (id: string) =>
  jwt.sign({ id }, process.env.JWT_SECRET as string, { expiresIn: '7d' } as any);

export const signup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password } = req.body;
    const existing = await User.findOne({ email });
    if (existing) {
      res.status(400).json({ message: 'Email already registered' });
      return;
    }
    const user = await User.create({ name, email, password, role: 'admin' });
    const token = signToken(user._id.toString());
    const session = await Session.create({ user: user._id });
    res.status(201).json({
      token,
      user: { _id: user._id, name: user.name, email: user.email, role: user.role },
      session,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email, isArchived: false });
    if (!user || !(await user.comparePassword(password))) {
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }
    const token = signToken(user._id.toString());
    // Auto-open session
    let session = await Session.findOne({ user: user._id, isOpen: true });
    if (!session) {
      session = await Session.create({ user: user._id });
    }
    res.json({
      token,
      user: { _id: user._id, name: user.name, email: user.email, role: user.role },
      session,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const getMe = async (req: any, res: Response): Promise<void> => {
  res.json(req.user);
};
