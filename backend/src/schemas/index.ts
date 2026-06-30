import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

// ── Reusable primitives ───────────────────────────────────────────────────────
const safeString = (max = 255) => z.string().trim().min(1).max(max);
const optionalString = (max = 255) => z.string().trim().max(max).optional();
const email = z.string().trim().toLowerCase().email().max(254);
const password = z.string().min(8).max(128);
const positiveFloat = z.coerce.number().min(0);
const cuid = z.string().regex(/^[a-zA-Z0-9_\-]{1,50}$/, 'Invalid ID format');

// ── Middleware factory ────────────────────────────────────────────────────────
export function validate(schema: z.ZodTypeAny, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const errors = result.error.issues.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`);
      res.status(400).json({ message: 'Validation failed', errors });
      return;
    }
    req[source] = result.data;
    next();
  };
}

// ── Auth schemas ──────────────────────────────────────────────────────────────
export const signupSchema = z.object({
  name: safeString(100),
  email,
  password,
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1).max(128),
});

// ── User schemas ──────────────────────────────────────────────────────────────
export const createUserSchema = z.object({
  name: safeString(100),
  email,
  password,
  role: z.enum(['ADMIN', 'EMPLOYEE']).optional(),
});

export const updateUserSchema = z.object({
  name: safeString(100).optional(),
  email: email.optional(),
  role: z.enum(['ADMIN', 'EMPLOYEE']).optional(),
});

export const changePasswordSchema = z.object({
  password,
});

// ── Product schemas ───────────────────────────────────────────────────────────
export const createProductSchema = z.object({
  name: safeString(200),
  categoryId: cuid,
  price: positiveFloat,
  unit: z.enum(['PIECE', 'KG', 'LITER']).optional(),
  tax: z.coerce.number().min(0).max(100).optional(),
  description: optionalString(1000),
});

export const updateProductSchema = z.object({
  name: safeString(200).optional(),
  categoryId: cuid.optional(),
  price: positiveFloat.optional(),
  unit: z.enum(['PIECE', 'KG', 'LITER']).optional(),
  tax: z.coerce.number().min(0).max(100).optional(),
  description: optionalString(1000),
  active: z.boolean().optional(),
});

// ── Category schemas ──────────────────────────────────────────────────────────
export const createCategorySchema = z.object({
  name: safeString(100),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a hex color').optional(),
});

// ── Customer schemas ──────────────────────────────────────────────────────────
export const createCustomerSchema = z.object({
  name: safeString(100),
  email: email.optional().or(z.literal('')),
  phone: z.string().trim().max(20).optional(),
  address: optionalString(500),
  notes: optionalString(1000),
});

// ── Order schemas ─────────────────────────────────────────────────────────────
const orderItemSchema = z.object({
  productId: cuid.optional(),
  product: cuid.optional(),
  name: optionalString(200),
  productName: optionalString(200),
  price: positiveFloat,
  quantity: z.coerce.number().int().min(1).max(999),
  tax: z.coerce.number().min(0).max(100).optional(),
  categoryColor: optionalString(20),
});

export const createOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1).max(100),
  customerId: cuid.optional().nullable(),
  tableId: cuid.optional().nullable(),
  orderType: z.enum(['DINE_IN', 'TAKEAWAY', 'DELIVERY', 'dine-in', 'takeaway', 'delivery']).optional(),
  notes: optionalString(500),
  promotionDiscount: positiveFloat.optional(),
  couponDiscount: positiveFloat.optional(),
  couponCode: optionalString(50),
  promotionId: cuid.optional().nullable(),
});

// ── Inventory schemas ─────────────────────────────────────────────────────────
export const createInventoryItemSchema = z.object({
  name: safeString(200),
  sku: optionalString(100),
  categoryId: cuid,
  unit: z.enum(['G', 'KG', 'ML', 'L', 'PCS', 'DOZEN']),
  currentStock: positiveFloat.optional(),
  minStock: positiveFloat.optional(),
  maxStock: positiveFloat.optional().nullable(),
  unitCost: positiveFloat.optional(),
  supplierId: cuid.optional().nullable(),
  shelfLifeDays: z.coerce.number().int().min(0).optional(),
  storageLocation: optionalString(200),
});

export const updateInventoryItemSchema = z.object({
  name: safeString(200).optional(),
  sku: optionalString(100),
  categoryId: cuid.optional(),
  unit: z.enum(['G', 'KG', 'ML', 'L', 'PCS', 'DOZEN']).optional(),
  currentStock: positiveFloat.optional(),
  minStock: positiveFloat.optional(),
  maxStock: z.union([positiveFloat, z.null()]).optional(),
  unitCost: positiveFloat.optional(),
  supplierId: z.union([cuid, z.null()]).optional(),
  shelfLifeDays: z.coerce.number().int().min(0).optional(),
  storageLocation: optionalString(200),
  active: z.boolean().optional(),
});

// ── Supplier schemas ──────────────────────────────────────────────────────────
export const createSupplierSchema = z.object({
  name: safeString(200),
  email: email.optional().or(z.literal('')),
  phone: z.string().trim().max(20).optional(),
  address: optionalString(500),
  gstin: optionalString(20),
  notes: optionalString(1000),
});

// ── Wastage schemas ───────────────────────────────────────────────────────────
export const createWastageSchema = z.object({
  inventoryItemId: cuid,
  quantity: z.coerce.number().positive(),
  reason: optionalString(500),
  shift: z.enum(['MORNING', 'AFTERNOON', 'EVENING']).optional(),
  date: z.string().optional(),
});
