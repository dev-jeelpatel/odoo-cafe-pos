import { Request, Response } from 'express';
import PaymentMethod from '../models/PaymentMethod';

export const getPaymentMethods = async (_req: Request, res: Response): Promise<void> => {
  const methods = await PaymentMethod.find();
  res.json(methods);
};

export const togglePaymentMethod = async (req: Request, res: Response): Promise<void> => {
  try {
    const method = await PaymentMethod.findByIdAndUpdate(
      req.params.id,
      { isEnabled: req.body.isEnabled },
      { new: true }
    );
    if (!method) { res.status(404).json({ message: 'Payment method not found' }); return; }
    res.json(method);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};
