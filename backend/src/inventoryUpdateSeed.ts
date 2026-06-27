/**
 * Inventory Update Seed
 * Maps ALL 65 products (including demo + user-created ones) to recipes.
 * Adds missing inventory items (Tortilla Wrap).
 * Run: npm run db:seed:inventory:update
 */
import 'dotenv/config';
import prisma from './lib/prisma';
import { InventoryUnit, BatchStatus } from '@prisma/client';

const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };

async function main() {
  console.log('\n🔄  Inventory update seed starting...\n');

  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!admin) throw new Error('No admin user found.');

  // ── Load existing data ────────────────────────────────────────────────────
  const allProducts = await prisma.product.findMany({ include: { category: true } });
  const existingRecipes = await prisma.recipe.findMany({ select: { productId: true } });
  const recipedProductIds = new Set(existingRecipes.map(r => r.productId));
  const invItems = await prisma.inventoryItem.findMany();
  const iMap: Record<string, string> = {}; // name → id
  const iById: Record<string, any> = {};
  for (const i of invItems) { iMap[i.name] = i.id; iById[i.id] = i; }

  const invCats = await prisma.inventoryCategory.findMany();
  const catMap: Record<string, string> = {};
  for (const c of invCats) catMap[c.name] = c.id;

  // ── 1. Add new inventory item: Tortilla Wrap ──────────────────────────────
  console.log('Adding missing inventory items...');
  const tortillaExists = await prisma.inventoryItem.findUnique({ where: { id: 'inv-tortilla-wrap' } });
  if (!tortillaExists) {
    await prisma.inventoryItem.create({
      data: {
        id: 'inv-tortilla-wrap',
        name: 'Tortilla Wrap (8-inch)',
        sku: 'BAKERY-TWRP-001',
        unit: 'PCS',
        currentStock: 60,
        minStock: 10,
        maxStock: 100,
        unitCost: 10,
        storageLocation: 'Dry Store Shelf 3',
        categoryId: catMap['Bakery & Bread'],
        supplierId: 'sup-grainmasters',
        shelfLifeDays: 7,
        active: true,
      },
    });
    await prisma.inventoryBatch.create({
      data: { inventoryItemId: 'inv-tortilla-wrap', batchNumber: 'TWR-062855', quantity: 60, expiryDate: daysAgo(-5), purchaseDate: daysAgo(2), unitCost: 10, status: BatchStatus.ACTIVE },
    });
    iMap['Tortilla Wrap (8-inch)'] = 'inv-tortilla-wrap';
    console.log('  ✓ Added Tortilla Wrap (8-inch)');
  } else {
    iMap['Tortilla Wrap (8-inch)'] = 'inv-tortilla-wrap';
    console.log('  ✓ Tortilla Wrap already exists');
  }

  // Refresh iById
  const allInvItems = await prisma.inventoryItem.findMany();
  for (const i of allInvItems) iById[i.id] = i;

  // ── 2. Build the full recipe map for ALL products ─────────────────────────
  // key = product name (case-insensitive match), value = ingredients
  type Ing = { id: string; qty: number };

  const I = (name: string): string => {
    const found = iMap[name];
    if (!found) throw new Error(`Inventory item not found: "${name}"`);
    return found;
  };

  // Helper: return unit from item id
  const U = (id: string): string => iById[id]?.unit ?? 'KG';

  const recipeTemplates: Record<string, Ing[]> = {
    // ── PIZZA ──────────────────────────────────────────────────────────────
    'Margherita Pizza': [
      { id: I('Pizza Base (9-inch)'), qty: 1 },
      { id: I('Pizza Sauce (Tomato Base)'), qty: 0.1 },
      { id: I('Mozzarella Cheese'), qty: 0.15 },
      { id: I('Extra Virgin Olive Oil'), qty: 0.01 },
    ],
    'Farmhouse Pizza': [
      { id: I('Pizza Base (9-inch)'), qty: 1 },
      { id: I('Pizza Sauce (Tomato Base)'), qty: 0.1 },
      { id: I('Mozzarella Cheese'), qty: 0.15 },
      { id: I('Mixed Vegetables (Diced)'), qty: 0.1 },
      { id: I('Bell Pepper (Mixed)'), qty: 0.05 },
      { id: I('Onion'), qty: 0.04 },
    ],
    'Paneer Tikka Pizza': [
      { id: I('Pizza Base (9-inch)'), qty: 1 },
      { id: I('Pizza Sauce (Tomato Base)'), qty: 0.1 },
      { id: I('Mozzarella Cheese'), qty: 0.12 },
      { id: I('Fresh Paneer'), qty: 0.08 },
      { id: I('Bell Pepper (Mixed)'), qty: 0.05 },
      { id: I('Onion'), qty: 0.04 },
    ],
    'Corn & Cheese Pizza': [
      { id: I('Pizza Base (9-inch)'), qty: 1 },
      { id: I('Pizza Sauce (Tomato Base)'), qty: 0.1 },
      { id: I('Mozzarella Cheese'), qty: 0.15 },
      { id: I('Sweet Corn Kernels'), qty: 0.08 },
      { id: I('Onion'), qty: 0.03 },
    ],
    // Pepperoni Pizza (veg) — uses veg-based mixed veg + extra cheese as filling
    'Pepperoni Pizza': [
      { id: I('Pizza Base (9-inch)'), qty: 1 },
      { id: I('Pizza Sauce (Tomato Base)'), qty: 0.12 },
      { id: I('Mozzarella Cheese'), qty: 0.18 },
      { id: I('Mixed Vegetables (Diced)'), qty: 0.08 },
      { id: I('Bell Pepper (Mixed)'), qty: 0.06 },
    ],

    // ── BURGERS & SANDWICHES ───────────────────────────────────────────────
    'Veg Burger': [
      { id: I('Burger Buns'), qty: 1 },
      { id: I('Veg Patty (Pre-made, Frozen)'), qty: 1 },
      { id: I('Iceberg Lettuce'), qty: 0.02 },
      { id: I('Tomato'), qty: 0.03 },
      { id: I('Cheese Slices'), qty: 1 },
    ],
    'Classic Burger': [
      { id: I('Burger Buns'), qty: 1 },
      { id: I('Veg Patty (Pre-made, Frozen)'), qty: 1 },
      { id: I('Iceberg Lettuce'), qty: 0.02 },
      { id: I('Tomato'), qty: 0.03 },
      { id: I('Onion'), qty: 0.02 },
    ],
    'Cheese Burger': [
      { id: I('Burger Buns'), qty: 1 },
      { id: I('Veg Patty (Pre-made, Frozen)'), qty: 1 },
      { id: I('Cheese Slices'), qty: 2 },
      { id: I('Iceberg Lettuce'), qty: 0.02 },
      { id: I('Tomato'), qty: 0.03 },
      { id: I('Onion'), qty: 0.02 },
    ],
    'Paneer Burger': [
      { id: I('Burger Buns'), qty: 1 },
      { id: I('Fresh Paneer'), qty: 0.08 },
      { id: I('Iceberg Lettuce'), qty: 0.02 },
      { id: I('Tomato'), qty: 0.03 },
      { id: I('Cheese Slices'), qty: 1 },
      { id: I('Onion'), qty: 0.02 },
    ],
    'Aloo Tikki Burger': [
      { id: I('Burger Buns'), qty: 1 },
      { id: I('Potato'), qty: 0.1 },
      { id: I('Iceberg Lettuce'), qty: 0.02 },
      { id: I('Tomato'), qty: 0.03 },
      { id: I('Onion'), qty: 0.02 },
      { id: I('Chaat Masala'), qty: 0.003 },
    ],
    'Grilled Veg Sandwich': [
      { id: I('Sandwich Bread Slices'), qty: 2 },
      { id: I('Mixed Vegetables (Diced)'), qty: 0.08 },
      { id: I('Amul Butter'), qty: 0.015 },
      { id: I('Cheese Slices'), qty: 1 },
    ],
    'Grilled Sandwich': [
      { id: I('Sandwich Bread Slices'), qty: 2 },
      { id: I('Mixed Vegetables (Diced)'), qty: 0.08 },
      { id: I('Amul Butter'), qty: 0.015 },
      { id: I('Cheese Slices'), qty: 1 },
    ],
    'Club Sandwich': [
      { id: I('Sandwich Bread Slices'), qty: 3 },
      { id: I('Mixed Vegetables (Diced)'), qty: 0.1 },
      { id: I('Amul Butter'), qty: 0.02 },
      { id: I('Cheese Slices'), qty: 2 },
      { id: I('Iceberg Lettuce'), qty: 0.02 },
      { id: I('Tomato'), qty: 0.04 },
    ],
    'Paneer Wrap': [
      { id: I('Tortilla Wrap (8-inch)'), qty: 1 },
      { id: I('Fresh Paneer'), qty: 0.1 },
      { id: I('Bell Pepper (Mixed)'), qty: 0.04 },
      { id: I('Onion'), qty: 0.03 },
      { id: I('Fresh Curd'), qty: 0.04 },
      { id: I('Amul Butter'), qty: 0.01 },
    ],

    // ── SOUTH INDIAN ───────────────────────────────────────────────────────
    'Masala Dosa': [
      { id: I('Rice Flour (Idli/Dosa)'), qty: 0.15 },
      { id: I('Urad Dal (White, Split)'), qty: 0.05 },
      { id: I('Potato'), qty: 0.1 },
      { id: I('Onion'), qty: 0.03 },
      { id: I('Sunflower Cooking Oil'), qty: 0.015 },
      { id: I('Iodised Salt'), qty: 0.003 },
    ],
    'Idli Sambar': [
      { id: I('Rice Flour (Idli/Dosa)'), qty: 0.12 },
      { id: I('Urad Dal (White, Split)'), qty: 0.06 },
      { id: I('Tomato'), qty: 0.05 },
      { id: I('Onion'), qty: 0.03 },
      { id: I('Iodised Salt'), qty: 0.002 },
    ],
    'Medu Vada': [
      { id: I('Urad Dal (White, Split)'), qty: 0.12 },
      { id: I('Onion'), qty: 0.03 },
      { id: I('Sunflower Cooking Oil'), qty: 0.02 },
      { id: I('Iodised Salt'), qty: 0.002 },
    ],
    'Uttapam': [
      { id: I('Rice Flour (Idli/Dosa)'), qty: 0.15 },
      { id: I('Onion'), qty: 0.05 },
      { id: I('Tomato'), qty: 0.04 },
      { id: I('Mixed Vegetables (Diced)'), qty: 0.05 },
      { id: I('Sunflower Cooking Oil'), qty: 0.015 },
    ],

    // ── SNACKS & STARTERS ──────────────────────────────────────────────────
    'Veg Spring Rolls': [
      { id: I('Spring Roll Sheets'), qty: 3 },
      { id: I('Mixed Vegetables (Diced)'), qty: 0.08 },
      { id: I('Sunflower Cooking Oil'), qty: 0.02 },
    ],
    'Spring Rolls': [
      { id: I('Spring Roll Sheets'), qty: 3 },
      { id: I('Mixed Vegetables (Diced)'), qty: 0.08 },
      { id: I('Sunflower Cooking Oil'), qty: 0.02 },
    ],
    'Paneer Tikka': [
      { id: I('Fresh Paneer'), qty: 0.15 },
      { id: I('Bell Pepper (Mixed)'), qty: 0.05 },
      { id: I('Onion'), qty: 0.04 },
      { id: I('Fresh Curd'), qty: 0.05 },
      { id: I('Sunflower Cooking Oil'), qty: 0.01 },
    ],
    'tawa paneer': [
      { id: I('Fresh Paneer'), qty: 0.15 },
      { id: I('Bell Pepper (Mixed)'), qty: 0.05 },
      { id: I('Onion'), qty: 0.04 },
      { id: I('Tomato'), qty: 0.05 },
      { id: I('Amul Butter'), qty: 0.02 },
      { id: I('Sunflower Cooking Oil'), qty: 0.01 },
    ],
    'French Fries': [
      { id: I('Potato'), qty: 0.2 },
      { id: I('Sunflower Cooking Oil'), qty: 0.03 },
      { id: I('Iodised Salt'), qty: 0.005 },
    ],
    'Peri Peri Fries': [
      { id: I('Potato'), qty: 0.2 },
      { id: I('Sunflower Cooking Oil'), qty: 0.03 },
      { id: I('Peri Peri Seasoning'), qty: 0.01 },
      { id: I('Iodised Salt'), qty: 0.003 },
    ],
    'Veg Manchurian': [
      { id: I('Mixed Vegetables (Diced)'), qty: 0.15 },
      { id: I('Maida (All Purpose Flour)'), qty: 0.03 },
      { id: I('Schezwan Sauce'), qty: 0.03 },
      { id: I('Sunflower Cooking Oil'), qty: 0.02 },
    ],
    'Cheese Corn Nuggets': [
      { id: I('Sweet Corn Kernels'), qty: 0.1 },
      { id: I('Mozzarella Cheese'), qty: 0.05 },
      { id: I('Maida (All Purpose Flour)'), qty: 0.03 },
      { id: I('Sunflower Cooking Oil'), qty: 0.02 },
    ],

    // ── SALADS ─────────────────────────────────────────────────────────────
    'Greek Salad': [
      { id: I('Iceberg Lettuce'), qty: 0.08 },
      { id: I('Tomato'), qty: 0.06 },
      { id: I('Cucumber'), qty: 0.06 },
      { id: I('Bell Pepper (Mixed)'), qty: 0.04 },
      { id: I('Extra Virgin Olive Oil'), qty: 0.01 },
    ],
    'Caesar Salad': [
      { id: I('Iceberg Lettuce'), qty: 0.1 },
      { id: I('Cucumber'), qty: 0.03 },
      { id: I('Caesar Dressing'), qty: 0.04 },
      { id: I('Mozzarella Cheese'), qty: 0.03 },
    ],
    'Sprouts Salad': [
      { id: I('Mixed Sprouts'), qty: 0.15 },
      { id: I('Tomato'), qty: 0.04 },
      { id: I('Cucumber'), qty: 0.04 },
      { id: I('Fresh Lemon'), qty: 0.5 },
      { id: I('Chaat Masala'), qty: 0.005 },
    ],

    // ── PASTA & NOODLES ────────────────────────────────────────────────────
    'Penne Alfredo': [
      { id: I('Penne Pasta (Durum)'), qty: 0.15 },
      { id: I('Alfredo Sauce'), qty: 0.08 },
      { id: I('Mozzarella Cheese'), qty: 0.04 },
      { id: I('Fresh Cream (Heavy)'), qty: 0.03 },
      { id: I('Amul Butter'), qty: 0.01 },
    ],
    'Arrabiata Pasta': [
      { id: I('Penne Pasta (Durum)'), qty: 0.15 },
      { id: I('Tomato Puree'), qty: 0.08 },
      { id: I('Mixed Vegetables (Diced)'), qty: 0.06 },
      { id: I('Extra Virgin Olive Oil'), qty: 0.01 },
    ],
    'Veg Hakka Noodles': [
      { id: I('Hakka Noodles'), qty: 0.15 },
      { id: I('Mixed Vegetables (Diced)'), qty: 0.1 },
      { id: I('Sunflower Cooking Oil'), qty: 0.02 },
    ],
    'Schezwan Noodles': [
      { id: I('Hakka Noodles'), qty: 0.15 },
      { id: I('Mixed Vegetables (Diced)'), qty: 0.1 },
      { id: I('Schezwan Sauce'), qty: 0.04 },
      { id: I('Sunflower Cooking Oil'), qty: 0.02 },
    ],

    // ── HOT BEVERAGES ──────────────────────────────────────────────────────
    'Masala Chai': [
      { id: I('Full-Cream Milk'), qty: 0.15 },
      { id: I('Assam Tea Leaves (CTC)'), qty: 0.005 },
      { id: I('Sugar (Fine Granulated)'), qty: 0.01 },
      { id: I('Masala Chai Spice Mix'), qty: 0.002 },
    ],
    'Filter Coffee': [
      { id: I('Full-Cream Milk'), qty: 0.1 },
      { id: I('Filter Coffee Powder'), qty: 0.008 },
      { id: I('Sugar (Fine Granulated)'), qty: 0.01 },
    ],
    'Cappuccino': [
      { id: I('Full-Cream Milk'), qty: 0.2 },
      { id: I('Filter Coffee Powder'), qty: 0.012 },
      { id: I('Sugar (Fine Granulated)'), qty: 0.01 },
    ],
    'Latte': [
      { id: I('Full-Cream Milk'), qty: 0.3 },
      { id: I('Filter Coffee Powder'), qty: 0.012 },
      { id: I('Sugar (Fine Granulated)'), qty: 0.01 },
    ],
    'Espresso': [
      { id: I('Filter Coffee Powder'), qty: 0.018 },
      { id: I('Sugar (Fine Granulated)'), qty: 0.005 },
    ],
    'Hot Chocolate': [
      { id: I('Full-Cream Milk'), qty: 0.25 },
      { id: I('Cocoa Powder (Dutch Process)'), qty: 0.02 },
      { id: I('Sugar (Fine Granulated)'), qty: 0.02 },
    ],
    'Green Tea': [
      { id: I('Green Tea Bags'), qty: 1 },
      { id: I('Sugar (Fine Granulated)'), qty: 0.005 },
    ],

    // ── COLD BEVERAGES ─────────────────────────────────────────────────────
    'Cold Coffee': [
      { id: I('Full-Cream Milk'), qty: 0.25 },
      { id: I('Filter Coffee Powder'), qty: 0.015 },
      { id: I('Sugar (Fine Granulated)'), qty: 0.02 },
      { id: I('Ice (Crushed/Cubed)'), qty: 0.05 },
    ],
    'Oreo Shake': [
      { id: I('Full-Cream Milk'), qty: 0.3 },
      { id: I('Oreo Biscuits (crushed)'), qty: 0.05 },
      { id: I('Sugar (Fine Granulated)'), qty: 0.015 },
      { id: I('Ice (Crushed/Cubed)'), qty: 0.05 },
    ],
    'Mango Smoothie': [
      { id: I('Full-Cream Milk'), qty: 0.2 },
      { id: I('Alphonso Mango Pulp'), qty: 0.15 },
      { id: I('Sugar (Fine Granulated)'), qty: 0.015 },
      { id: I('Ice (Crushed/Cubed)'), qty: 0.05 },
    ],
    'Mango Shake': [
      { id: I('Full-Cream Milk'), qty: 0.25 },
      { id: I('Alphonso Mango Pulp'), qty: 0.15 },
      { id: I('Sugar (Fine Granulated)'), qty: 0.02 },
      { id: I('Ice (Crushed/Cubed)'), qty: 0.05 },
    ],
    'Fresh Lime Soda': [
      { id: I('Fresh Lemon'), qty: 1 },
      { id: I('Sugar (Fine Granulated)'), qty: 0.015 },
      { id: I('Soda Water (1 L bottles)'), qty: 0.2 },
      { id: I('Ice (Crushed/Cubed)'), qty: 0.04 },
    ],
    'Iced Tea': [
      { id: I('Assam Tea Leaves (CTC)'), qty: 0.005 },
      { id: I('Sugar (Fine Granulated)'), qty: 0.02 },
      { id: I('Fresh Lemon'), qty: 0.5 },
      { id: I('Ice (Crushed/Cubed)'), qty: 0.05 },
    ],
    'Iced Lemon Tea': [
      { id: I('Assam Tea Leaves (CTC)'), qty: 0.005 },
      { id: I('Sugar (Fine Granulated)'), qty: 0.02 },
      { id: I('Fresh Lemon'), qty: 1 },
      { id: I('Ice (Crushed/Cubed)'), qty: 0.05 },
    ],
    'Virgin Mojito': [
      { id: I('Fresh Mint Leaves'), qty: 0.01 },
      { id: I('Fresh Lemon'), qty: 1 },
      { id: I('Sugar (Fine Granulated)'), qty: 0.02 },
      { id: I('Soda Water (1 L bottles)'), qty: 0.2 },
      { id: I('Ice (Crushed/Cubed)'), qty: 0.04 },
    ],

    // ── DESSERTS ───────────────────────────────────────────────────────────
    'Chocolate Brownie': [
      { id: I('Maida (All Purpose Flour)'), qty: 0.08 },
      { id: I('Cocoa Powder (Dutch Process)'), qty: 0.02 },
      { id: I('Amul Butter'), qty: 0.04 },
      { id: I('Sugar (Fine Granulated)'), qty: 0.06 },
      { id: I('Chocolate Sauce'), qty: 0.03 },
    ],
    'Brownie': [
      { id: I('Maida (All Purpose Flour)'), qty: 0.08 },
      { id: I('Cocoa Powder (Dutch Process)'), qty: 0.02 },
      { id: I('Amul Butter'), qty: 0.04 },
      { id: I('Sugar (Fine Granulated)'), qty: 0.06 },
      { id: I('Chocolate Sauce'), qty: 0.03 },
    ],
    'Chocolate Cake': [
      { id: I('Maida (All Purpose Flour)'), qty: 0.1 },
      { id: I('Cocoa Powder (Dutch Process)'), qty: 0.03 },
      { id: I('Amul Butter'), qty: 0.05 },
      { id: I('Sugar (Fine Granulated)'), qty: 0.08 },
      { id: I('Chocolate Sauce'), qty: 0.05 },
      { id: I('Fresh Cream (Heavy)'), qty: 0.03 },
    ],
    'Chocolate Lava Cake': [
      { id: I('Maida (All Purpose Flour)'), qty: 0.06 },
      { id: I('Cocoa Powder (Dutch Process)'), qty: 0.025 },
      { id: I('Amul Butter'), qty: 0.05 },
      { id: I('Sugar (Fine Granulated)'), qty: 0.05 },
      { id: I('Chocolate Sauce'), qty: 0.04 },
    ],
    'Gulab Jamun': [
      { id: I('Gulab Jamun Mix'), qty: 0.1 },
      { id: I('Sugar (Fine Granulated)'), qty: 0.08 },
      { id: I('Sunflower Cooking Oil'), qty: 0.02 },
    ],
    'Tiramisu': [
      { id: I('Mascarpone Cheese'), qty: 0.08 },
      { id: I('Savoiardi Ladyfinger Biscuits'), qty: 0.08 },
      { id: I('Filter Coffee Powder'), qty: 0.01 },
      { id: I('Cocoa Powder (Dutch Process)'), qty: 0.01 },
      { id: I('Sugar (Fine Granulated)'), qty: 0.03 },
    ],
    'Gajar Halwa': [
      { id: I('Carrot'), qty: 0.2 },
      { id: I('Full-Cream Milk'), qty: 0.1 },
      { id: I('Sugar (Fine Granulated)'), qty: 0.05 },
      { id: I('Khoya (Mawa)'), qty: 0.05 },
      { id: I('Amul Butter'), qty: 0.02 },
    ],
    // Cheese Angoori — Indian sweet made from small paneer balls in sugar syrup
    'chesse angoori': [
      { id: I('Fresh Paneer'), qty: 0.1 },
      { id: I('Sugar (Fine Granulated)'), qty: 0.08 },
      { id: I('Khoya (Mawa)'), qty: 0.03 },
      { id: I('Fresh Cream (Heavy)'), qty: 0.03 },
    ],
  };

  // ── 3. Create recipes for all products that don't have one ────────────────
  console.log('Creating recipes for unrecipied products...');
  let created = 0, skipped = 0, noTemplate = 0;

  for (const product of allProducts) {
    if (recipedProductIds.has(product.id)) { skipped++; continue; }

    const template = recipeTemplates[product.name];
    if (!template) {
      console.warn(`  ⚠ No recipe template for: "${product.name}" (${product.category.name}) — skipping`);
      noTemplate++;
      continue;
    }

    await prisma.recipe.create({
      data: {
        productId: product.id,
        name: `${product.name} Recipe`,
        yield: 1,
        active: true,
        ingredients: {
          create: template.map(ing => ({
            inventoryItemId: ing.id,
            quantity: ing.qty,
            unit: U(ing.id),
          })),
        },
      },
    });
    console.log(`  ✓ Recipe: ${product.name} (${product.category.name})`);
    created++;
  }

  // ── 4. Summary ───────────────────────────────────────────────────────────
  const totalRecipes = await prisma.recipe.count();
  const totalProducts = await prisma.product.count();
  const totalInvItems = await prisma.inventoryItem.count({ where: { active: true } });

  console.log(`\n✅  Update complete!`);
  console.log(`    New recipes created:  ${created}`);
  console.log(`    Already had recipes:  ${skipped}`);
  console.log(`    No template found:    ${noTemplate}`);
  console.log(`    Total recipes in DB:  ${totalRecipes} / ${totalProducts} products`);
  console.log(`    Total inventory items: ${totalInvItems}\n`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
