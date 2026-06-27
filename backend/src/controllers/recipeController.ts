import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export async function getRecipes(_req: Request, res: Response) {
  const recipes = await prisma.recipe.findMany({
    include: { product: { select: { id: true, name: true, imageUrl: true } }, ingredients: { include: { inventoryItem: { select: { id: true, name: true, unit: true } } } } },
    orderBy: { name: 'asc' },
  });
  res.json(recipes);
}

export async function getRecipe(req: Request, res: Response) {
  const recipe = await prisma.recipe.findUnique({
    where: { id: req.params.id },
    include: { product: true, ingredients: { include: { inventoryItem: true } } },
  });
  if (!recipe) return res.status(404).json({ message: 'Not found' });
  res.json(recipe);
}

export async function getRecipeByProduct(req: Request, res: Response) {
  const recipe = await prisma.recipe.findUnique({
    where: { productId: req.params.productId },
    include: { ingredients: { include: { inventoryItem: true } } },
  });
  res.json(recipe ?? null);
}

export async function upsertRecipe(req: Request, res: Response) {
  const { productId, name, yield: yieldAmt, ingredients } = req.body;

  const existing = await prisma.recipe.findUnique({ where: { productId } });

  if (existing) {
    // Delete old ingredients and replace
    await prisma.recipeIngredient.deleteMany({ where: { recipeId: existing.id } });
    const recipe = await prisma.recipe.update({
      where: { id: existing.id },
      data: {
        name: name ?? existing.name,
        yield: yieldAmt ?? existing.yield,
        ingredients: {
          create: ingredients.map((i: any) => ({
            inventoryItemId: i.inventoryItemId,
            quantity: i.quantity,
            unit: i.unit,
            notes: i.notes ?? '',
          })),
        },
      },
      include: { ingredients: { include: { inventoryItem: true } } },
    });
    return res.json(recipe);
  }

  const recipe = await prisma.recipe.create({
    data: {
      productId,
      name: name ?? 'Recipe',
      yield: yieldAmt ?? 1,
      ingredients: {
        create: ingredients.map((i: any) => ({
          inventoryItemId: i.inventoryItemId,
          quantity: i.quantity,
          unit: i.unit,
          notes: i.notes ?? '',
        })),
      },
    },
    include: { ingredients: { include: { inventoryItem: true } } },
  });
  res.status(201).json(recipe);
}

export async function deleteRecipe(req: Request, res: Response) {
  await prisma.recipe.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
}
