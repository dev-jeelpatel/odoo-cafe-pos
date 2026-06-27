/**
 * Inventory Seed — run AFTER the main seed.ts
 * Creates: suppliers, inventory items, recipes for all 42 products,
 * purchase history (GRNs), and deducts stock for all existing paid orders.
 *
 * Usage:  npm run db:seed:inventory
 */

import 'dotenv/config';
import prisma from './lib/prisma';
import { InventoryUnit, StockMovementType, PurchaseOrderStatus, BatchStatus } from '@prisma/client';

const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };
const weeksAgo = (n: number) => daysAgo(n * 7);

async function main() {
  console.log('\n🌱  Inventory seed starting...\n');

  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!admin) throw new Error('No admin user — run main seed first.');

  const allProducts = await prisma.product.findMany();
  const pByName: Record<string, string> = {};
  for (const p of allProducts) pByName[p.name] = p.id;

  const invCats = await prisma.inventoryCategory.findMany();
  const ic: Record<string, string> = {};
  for (const c of invCats) ic[c.name] = c.id;

  // ── 1. SUPPLIERS ────────────────────────────────────────────────────────────
  console.log('Creating suppliers...');
  const supplierRows = [
    { id: 'sup-freshfarm',      name: 'FreshFarm Dairy Pvt Ltd',     contactPerson: 'Rajesh Sharma',  phone: '9811234567', email: 'supply@freshfarmdairy.in',   address: 'Plot 12, Industrial Area, Pune 411019',       gstNumber: '27AABCF1234A1Z5', paymentTerms: 'Net 15',  notes: 'Delivers daily 6–8 AM.' },
    { id: 'sup-metrofresh',     name: 'Metro Fresh Vegetables',       contactPerson: 'Sunita Patil',   phone: '9822345678', email: 'orders@metrofresh.in',        address: 'APMC Market, Vashi, Navi Mumbai 400703',       gstNumber: '27AABCM5678B2Z6', paymentTerms: 'COD',     notes: 'Order before 8 PM for next-day delivery.' },
    { id: 'sup-grainmasters',   name: 'Grain Masters India',          contactPerson: 'Vikram Gupta',   phone: '9833456789', email: 'sales@grainmasters.in',       address: 'Warehouse 7, MIDC, Nashik 422010',            gstNumber: '27AABCG9012C3Z7', paymentTerms: 'Net 30',  notes: 'Bulk pricing on orders > ₹5000.' },
    { id: 'sup-brewessentials', name: 'Brew Essentials Co.',          contactPerson: 'Priya Nair',     phone: '9844567890', email: 'info@brewessentials.in',      address: '45, Commercial Complex, Bengaluru 560001',    gstNumber: '29AABCB3456D4Z8', paymentTerms: 'Net 15',  notes: 'Coffee sourced from Coorg & Chikmagalur.' },
    { id: 'sup-frozendepot',    name: 'Frozen Foods Depot',           contactPerson: 'Amit Shah',      phone: '9855678901', email: 'depot@frozenfoods.in',        address: 'Cold Chain Park, Bhiwandi, Thane 421302',     gstNumber: '27AABCF7890E5Z9', paymentTerms: 'Net 7',   notes: 'Maintains cold chain throughout delivery.' },
  ];
  for (const s of supplierRows) {
    await prisma.supplier.upsert({ where: { id: s.id }, create: s, update: {} });
  }

  // ── 2. INVENTORY ITEMS ───────────────────────────────────────────────────────
  console.log('Creating inventory items...');

  type ItemDef = {
    id: string; name: string; sku: string; unit: InventoryUnit;
    currentStock: number; minStock: number; maxStock: number;
    unitCost: number; storageLocation: string;
    catName: string; supplierId: string;
    batchNumber: string; expiryDaysFromNow: number; shelfLifeDays?: number;
  };

  const items: ItemDef[] = [
    // ── DAIRY
    { id: 'inv-milk',          name: 'Full-Cream Milk',              sku: 'DAIRY-MILK-001', unit: 'L',   currentStock: 28,  minStock: 6,   maxStock: 50,  unitCost: 62,  storageLocation: 'Fridge A',      catName: 'Dairy',               supplierId: 'sup-freshfarm',      batchNumber: 'MLK-062801', expiryDaysFromNow: 5,   shelfLifeDays: 7  },
    { id: 'inv-mozz-cheese',   name: 'Mozzarella Cheese',            sku: 'DAIRY-MOZZ-001', unit: 'KG',  currentStock: 9,   minStock: 2,   maxStock: 15,  unitCost: 420, storageLocation: 'Fridge A',      catName: 'Dairy',               supplierId: 'sup-freshfarm',      batchNumber: 'MZZ-062802', expiryDaysFromNow: 12,  shelfLifeDays: 30 },
    { id: 'inv-cheese-slice',  name: 'Cheese Slices',                sku: 'DAIRY-CHSL-001', unit: 'PCS', currentStock: 85,  minStock: 20,  maxStock: 120, unitCost: 12,  storageLocation: 'Fridge A',      catName: 'Dairy',               supplierId: 'sup-freshfarm',      batchNumber: 'CSL-062803', expiryDaysFromNow: 20,  shelfLifeDays: 60 },
    { id: 'inv-paneer',        name: 'Fresh Paneer',                 sku: 'DAIRY-PANR-001', unit: 'KG',  currentStock: 7,   minStock: 2,   maxStock: 12,  unitCost: 285, storageLocation: 'Fridge A',      catName: 'Dairy',               supplierId: 'sup-freshfarm',      batchNumber: 'PNR-062804', expiryDaysFromNow: 4,   shelfLifeDays: 5  },
    { id: 'inv-butter',        name: 'Amul Butter',                  sku: 'DAIRY-BUTR-001', unit: 'KG',  currentStock: 4.5, minStock: 1,   maxStock: 8,   unitCost: 480, storageLocation: 'Fridge A',      catName: 'Dairy',               supplierId: 'sup-freshfarm',      batchNumber: 'BTR-062805', expiryDaysFromNow: 60,  shelfLifeDays: 90 },
    { id: 'inv-fresh-cream',   name: 'Fresh Cream (Heavy)',          sku: 'DAIRY-CREM-001', unit: 'L',   currentStock: 3.5, minStock: 0.5, maxStock: 6,   unitCost: 195, storageLocation: 'Fridge A',      catName: 'Dairy',               supplierId: 'sup-freshfarm',      batchNumber: 'CRM-062806', expiryDaysFromNow: 8,   shelfLifeDays: 14 },
    { id: 'inv-curd',          name: 'Fresh Curd',                   sku: 'DAIRY-CURD-001', unit: 'KG',  currentStock: 5.5, minStock: 1,   maxStock: 10,  unitCost: 80,  storageLocation: 'Fridge A',      catName: 'Dairy',               supplierId: 'sup-freshfarm',      batchNumber: 'CRD-062807', expiryDaysFromNow: 3,   shelfLifeDays: 5  },
    { id: 'inv-mascarpone',    name: 'Mascarpone Cheese',            sku: 'DAIRY-MASC-001', unit: 'KG',  currentStock: 1.8, minStock: 0.2, maxStock: 3,   unitCost: 650, storageLocation: 'Fridge A',      catName: 'Dairy',               supplierId: 'sup-freshfarm',      batchNumber: 'MSC-062808', expiryDaysFromNow: 30,  shelfLifeDays: 45 },
    { id: 'inv-khoya',         name: 'Khoya (Mawa)',                 sku: 'DAIRY-KHOY-001', unit: 'KG',  currentStock: 3.2, minStock: 0.5, maxStock: 6,   unitCost: 380, storageLocation: 'Fridge B',      catName: 'Dairy',               supplierId: 'sup-freshfarm',      batchNumber: 'KHY-062809', expiryDaysFromNow: 7,   shelfLifeDays: 10 },

    // ── GRAINS & FLOUR
    { id: 'inv-maida',         name: 'Maida (All Purpose Flour)',    sku: 'GRAIN-MAID-001', unit: 'KG',  currentStock: 12,  minStock: 2,   maxStock: 25,  unitCost: 42,  storageLocation: 'Dry Store Shelf 1', catName: 'Grains & Flour',  supplierId: 'sup-grainmasters',   batchNumber: 'MDH-062810', expiryDaysFromNow: 180, shelfLifeDays: 365 },
    { id: 'inv-rice-flour',    name: 'Rice Flour (Idli/Dosa)',       sku: 'GRAIN-RICF-001', unit: 'KG',  currentStock: 9,   minStock: 2,   maxStock: 20,  unitCost: 58,  storageLocation: 'Dry Store Shelf 1', catName: 'Grains & Flour',  supplierId: 'sup-grainmasters',   batchNumber: 'RFH-062811', expiryDaysFromNow: 120, shelfLifeDays: 180 },
    { id: 'inv-urad-dal',      name: 'Urad Dal (White, Split)',      sku: 'GRAIN-URDL-001', unit: 'KG',  currentStock: 7,   minStock: 1.5, maxStock: 15,  unitCost: 145, storageLocation: 'Dry Store Shelf 1', catName: 'Grains & Flour',  supplierId: 'sup-grainmasters',   batchNumber: 'UDL-062812', expiryDaysFromNow: 90,  shelfLifeDays: 180 },
    { id: 'inv-penne-pasta',   name: 'Penne Pasta (Durum)',          sku: 'GRAIN-PENN-001', unit: 'KG',  currentStock: 6.5, minStock: 1,   maxStock: 12,  unitCost: 125, storageLocation: 'Dry Store Shelf 2', catName: 'Grains & Flour',  supplierId: 'sup-grainmasters',   batchNumber: 'PNP-062813', expiryDaysFromNow: 365, shelfLifeDays: 730 },
    { id: 'inv-hakka-noodles', name: 'Hakka Noodles',               sku: 'GRAIN-HKND-001', unit: 'KG',  currentStock: 5.5, minStock: 1,   maxStock: 10,  unitCost: 105, storageLocation: 'Dry Store Shelf 2', catName: 'Grains & Flour',  supplierId: 'sup-grainmasters',   batchNumber: 'HND-062814', expiryDaysFromNow: 180, shelfLifeDays: 365 },
    { id: 'inv-gulab-mix',     name: 'Gulab Jamun Mix',             sku: 'GRAIN-GJMX-001', unit: 'KG',  currentStock: 4,   minStock: 0.5, maxStock: 8,   unitCost: 165, storageLocation: 'Dry Store Shelf 2', catName: 'Grains & Flour',  supplierId: 'sup-grainmasters',   batchNumber: 'GJM-062815', expiryDaysFromNow: 120, shelfLifeDays: 180 },

    // ── BAKERY & BREAD
    { id: 'inv-pizza-base',    name: 'Pizza Base (9-inch)',          sku: 'BAKERY-PZBS-001', unit: 'PCS', currentStock: 55,  minStock: 10,  maxStock: 80,  unitCost: 35,  storageLocation: 'Dry Store Shelf 3', catName: 'Bakery & Bread',  supplierId: 'sup-grainmasters',   batchNumber: 'PZB-062816', expiryDaysFromNow: 10,  shelfLifeDays: 14  },
    { id: 'inv-burger-bun',    name: 'Burger Buns',                  sku: 'BAKERY-BGBN-001', unit: 'PCS', currentStock: 90,  minStock: 20,  maxStock: 150, unitCost: 14,  storageLocation: 'Dry Store Shelf 3', catName: 'Bakery & Bread',  supplierId: 'sup-grainmasters',   batchNumber: 'BBN-062817', expiryDaysFromNow: 3,   shelfLifeDays: 5   },
    { id: 'inv-sandwich-bread',name: 'Sandwich Bread Slices',        sku: 'BAKERY-SWBD-001', unit: 'PCS', currentStock: 70,  minStock: 15,  maxStock: 120, unitCost: 6,   storageLocation: 'Dry Store Shelf 3', catName: 'Bakery & Bread',  supplierId: 'sup-grainmasters',   batchNumber: 'SWB-062818', expiryDaysFromNow: 4,   shelfLifeDays: 5   },
    { id: 'inv-spring-sheets', name: 'Spring Roll Sheets',           sku: 'BAKERY-SPRS-001', unit: 'PCS', currentStock: 90,  minStock: 20,  maxStock: 150, unitCost: 5,   storageLocation: 'Dry Store Shelf 3', catName: 'Bakery & Bread',  supplierId: 'sup-grainmasters',   batchNumber: 'SRS-062819', expiryDaysFromNow: 30,  shelfLifeDays: 60  },
    { id: 'inv-ladyfinger',    name: 'Savoiardi Ladyfinger Biscuits',sku: 'BAKERY-LDYF-001', unit: 'KG',  currentStock: 2.2, minStock: 0.3, maxStock: 4,   unitCost: 350, storageLocation: 'Dry Store Shelf 3', catName: 'Bakery & Bread',  supplierId: 'sup-grainmasters',   batchNumber: 'LDF-062820', expiryDaysFromNow: 90,  shelfLifeDays: 180 },

    // ── VEGETABLES & PRODUCE
    { id: 'inv-mixed-veg',     name: 'Mixed Vegetables (Diced)',     sku: 'VEG-MXVG-001', unit: 'KG',  currentStock: 14,  minStock: 3,   maxStock: 25,  unitCost: 65,  storageLocation: 'Walk-In Cooler A',  catName: 'Vegetables & Produce', supplierId: 'sup-metrofresh', batchNumber: 'MXV-062821', expiryDaysFromNow: 2,   shelfLifeDays: 3  },
    { id: 'inv-potato',        name: 'Potato',                       sku: 'VEG-POTR-001', unit: 'KG',  currentStock: 22,  minStock: 4,   maxStock: 40,  unitCost: 32,  storageLocation: 'Dry Store Bin 1',   catName: 'Vegetables & Produce', supplierId: 'sup-metrofresh', batchNumber: 'PTO-062822', expiryDaysFromNow: 14,  shelfLifeDays: 21 },
    { id: 'inv-tomato',        name: 'Tomato',                       sku: 'VEG-TOMT-001', unit: 'KG',  currentStock: 11,  minStock: 2,   maxStock: 20,  unitCost: 45,  storageLocation: 'Walk-In Cooler A',  catName: 'Vegetables & Produce', supplierId: 'sup-metrofresh', batchNumber: 'TMT-062823', expiryDaysFromNow: 4,   shelfLifeDays: 7  },
    { id: 'inv-onion',         name: 'Onion',                        sku: 'VEG-ONNR-001', unit: 'KG',  currentStock: 14,  minStock: 3,   maxStock: 30,  unitCost: 38,  storageLocation: 'Dry Store Bin 1',   catName: 'Vegetables & Produce', supplierId: 'sup-metrofresh', batchNumber: 'ONN-062824', expiryDaysFromNow: 21,  shelfLifeDays: 30 },
    { id: 'inv-lettuce',       name: 'Iceberg Lettuce',              sku: 'VEG-LTCE-001', unit: 'KG',  currentStock: 4.5, minStock: 0.5, maxStock: 8,   unitCost: 85,  storageLocation: 'Walk-In Cooler A',  catName: 'Vegetables & Produce', supplierId: 'sup-metrofresh', batchNumber: 'LTC-062825', expiryDaysFromNow: 5,   shelfLifeDays: 7  },
    { id: 'inv-cucumber',      name: 'Cucumber',                     sku: 'VEG-CCMB-001', unit: 'KG',  currentStock: 5.5, minStock: 1,   maxStock: 10,  unitCost: 32,  storageLocation: 'Walk-In Cooler A',  catName: 'Vegetables & Produce', supplierId: 'sup-metrofresh', batchNumber: 'CCM-062826', expiryDaysFromNow: 5,   shelfLifeDays: 7  },
    { id: 'inv-bell-pepper',   name: 'Bell Pepper (Mixed)',          sku: 'VEG-BLPP-001', unit: 'KG',  currentStock: 5.5, minStock: 1,   maxStock: 10,  unitCost: 95,  storageLocation: 'Walk-In Cooler A',  catName: 'Vegetables & Produce', supplierId: 'sup-metrofresh', batchNumber: 'BLP-062827', expiryDaysFromNow: 5,   shelfLifeDays: 7  },
    { id: 'inv-corn',          name: 'Sweet Corn Kernels',           sku: 'VEG-CORN-001', unit: 'KG',  currentStock: 6.5, minStock: 1,   maxStock: 12,  unitCost: 72,  storageLocation: 'Walk-In Cooler A',  catName: 'Vegetables & Produce', supplierId: 'sup-metrofresh', batchNumber: 'CRN-062828', expiryDaysFromNow: 7,   shelfLifeDays: 10 },
    { id: 'inv-sprouts',       name: 'Mixed Sprouts',                sku: 'VEG-SPRT-001', unit: 'KG',  currentStock: 4,   minStock: 0.5, maxStock: 8,   unitCost: 95,  storageLocation: 'Walk-In Cooler A',  catName: 'Vegetables & Produce', supplierId: 'sup-metrofresh', batchNumber: 'SPR-062829', expiryDaysFromNow: 3,   shelfLifeDays: 5  },
    { id: 'inv-mint',          name: 'Fresh Mint Leaves',            sku: 'VEG-MINT-001', unit: 'KG',  currentStock: 0.6, minStock: 0.05,maxStock: 1,   unitCost: 210, storageLocation: 'Walk-In Cooler A',  catName: 'Vegetables & Produce', supplierId: 'sup-metrofresh', batchNumber: 'MNT-062830', expiryDaysFromNow: 2,   shelfLifeDays: 3  },
    { id: 'inv-lemon',         name: 'Fresh Lemon',                  sku: 'VEG-LEMN-001', unit: 'PCS', currentStock: 70,  minStock: 10,  maxStock: 120, unitCost: 5,   storageLocation: 'Walk-In Cooler A',  catName: 'Vegetables & Produce', supplierId: 'sup-metrofresh', batchNumber: 'LMN-062831', expiryDaysFromNow: 14,  shelfLifeDays: 21 },
    { id: 'inv-carrot',        name: 'Carrot',                       sku: 'VEG-CART-001', unit: 'KG',  currentStock: 6.5, minStock: 1,   maxStock: 12,  unitCost: 42,  storageLocation: 'Walk-In Cooler A',  catName: 'Vegetables & Produce', supplierId: 'sup-metrofresh', batchNumber: 'CRT-062832', expiryDaysFromNow: 7,   shelfLifeDays: 14 },

    // ── BEVERAGES & COFFEE
    { id: 'inv-coffee-powder', name: 'Filter Coffee Powder',         sku: 'BEV-CFPW-001', unit: 'KG',  currentStock: 3.2, minStock: 0.5, maxStock: 6,   unitCost: 820, storageLocation: 'Dry Store Shelf 4', catName: 'Beverages & Coffee', supplierId: 'sup-brewessentials', batchNumber: 'CFP-062833', expiryDaysFromNow: 180, shelfLifeDays: 365 },
    { id: 'inv-tea-leaves',    name: 'Assam Tea Leaves (CTC)',       sku: 'BEV-TALF-001', unit: 'KG',  currentStock: 2.2, minStock: 0.3, maxStock: 5,   unitCost: 620, storageLocation: 'Dry Store Shelf 4', catName: 'Beverages & Coffee', supplierId: 'sup-brewessentials', batchNumber: 'TAL-062834', expiryDaysFromNow: 365, shelfLifeDays: 730 },
    { id: 'inv-green-tea-bags',name: 'Green Tea Bags',               sku: 'BEV-GTBG-001', unit: 'PCS', currentStock: 130, minStock: 20,  maxStock: 200, unitCost: 8,   storageLocation: 'Dry Store Shelf 4', catName: 'Beverages & Coffee', supplierId: 'sup-brewessentials', batchNumber: 'GTB-062835', expiryDaysFromNow: 730, shelfLifeDays: 1095 },
    { id: 'inv-cocoa-powder',  name: 'Cocoa Powder (Dutch Process)', sku: 'BEV-CCPW-001', unit: 'KG',  currentStock: 2.8, minStock: 0.3, maxStock: 5,   unitCost: 580, storageLocation: 'Dry Store Shelf 4', catName: 'Beverages & Coffee', supplierId: 'sup-brewessentials', batchNumber: 'CCP-062836', expiryDaysFromNow: 365, shelfLifeDays: 730 },
    { id: 'inv-mango-pulp',    name: 'Alphonso Mango Pulp',          sku: 'BEV-MGPL-001', unit: 'L',   currentStock: 5.5, minStock: 1,   maxStock: 10,  unitCost: 190, storageLocation: 'Fridge B',          catName: 'Beverages & Coffee', supplierId: 'sup-brewessentials', batchNumber: 'MGP-062837', expiryDaysFromNow: 180, shelfLifeDays: 365 },
    { id: 'inv-oreo-biscuits', name: 'Oreo Biscuits (crushed)',      sku: 'BEV-OREOB-001',unit: 'KG',  currentStock: 2.8, minStock: 0.5, maxStock: 6,   unitCost: 460, storageLocation: 'Dry Store Shelf 4', catName: 'Beverages & Coffee', supplierId: 'sup-brewessentials', batchNumber: 'ORE-062838', expiryDaysFromNow: 180, shelfLifeDays: 365 },
    { id: 'inv-soda-water',    name: 'Soda Water (1 L bottles)',     sku: 'BEV-SDWT-001', unit: 'L',   currentStock: 14,  minStock: 3,   maxStock: 30,  unitCost: 30,  storageLocation: 'Dry Store Shelf 5', catName: 'Beverages & Coffee', supplierId: 'sup-brewessentials', batchNumber: 'SDW-062839', expiryDaysFromNow: 365, shelfLifeDays: 730 },

    // ── SPICES & CONDIMENTS
    { id: 'inv-sugar',         name: 'Sugar (Fine Granulated)',      sku: 'SPICE-SUGR-001', unit: 'KG', currentStock: 16,  minStock: 3,   maxStock: 30,  unitCost: 48,  storageLocation: 'Dry Store Shelf 1', catName: 'Spices & Condiments', supplierId: 'sup-grainmasters', batchNumber: 'SGR-062840', expiryDaysFromNow: 365, shelfLifeDays: 730 },
    { id: 'inv-salt',          name: 'Iodised Salt',                 sku: 'SPICE-SALT-001', unit: 'KG', currentStock: 7,   minStock: 1,   maxStock: 15,  unitCost: 22,  storageLocation: 'Dry Store Shelf 1', catName: 'Spices & Condiments', supplierId: 'sup-grainmasters', batchNumber: 'SLT-062841', expiryDaysFromNow: 365, shelfLifeDays: 1095 },
    { id: 'inv-pizza-sauce',   name: 'Pizza Sauce (Tomato Base)',    sku: 'SPICE-PZSC-001', unit: 'KG', currentStock: 5.5, minStock: 1,   maxStock: 10,  unitCost: 125, storageLocation: 'Fridge B',          catName: 'Spices & Condiments', supplierId: 'sup-grainmasters', batchNumber: 'PZS-062842', expiryDaysFromNow: 30,  shelfLifeDays: 60  },
    { id: 'inv-tomato-puree',  name: 'Tomato Puree',                 sku: 'SPICE-TMPU-001', unit: 'KG', currentStock: 6.5, minStock: 1,   maxStock: 12,  unitCost: 95,  storageLocation: 'Dry Store Shelf 2', catName: 'Spices & Condiments', supplierId: 'sup-grainmasters', batchNumber: 'TMP-062843', expiryDaysFromNow: 120, shelfLifeDays: 365 },
    { id: 'inv-schezwan-sauce',name: 'Schezwan Sauce',               sku: 'SPICE-SHZS-001', unit: 'KG', currentStock: 3.2, minStock: 0.5, maxStock: 6,   unitCost: 185, storageLocation: 'Dry Store Shelf 2', catName: 'Spices & Condiments', supplierId: 'sup-grainmasters', batchNumber: 'SHZ-062844', expiryDaysFromNow: 180, shelfLifeDays: 365 },
    { id: 'inv-alfredo-sauce', name: 'Alfredo Sauce',                sku: 'SPICE-ALFS-001', unit: 'KG', currentStock: 2.8, minStock: 0.5, maxStock: 5,   unitCost: 225, storageLocation: 'Fridge B',          catName: 'Spices & Condiments', supplierId: 'sup-grainmasters', batchNumber: 'ALS-062845', expiryDaysFromNow: 14,  shelfLifeDays: 30  },
    { id: 'inv-caesar-dressing',name:'Caesar Dressing',              sku: 'SPICE-CSDR-001', unit: 'KG', currentStock: 2.2, minStock: 0.3, maxStock: 4,   unitCost: 290, storageLocation: 'Fridge B',          catName: 'Spices & Condiments', supplierId: 'sup-grainmasters', batchNumber: 'CSD-062846', expiryDaysFromNow: 14,  shelfLifeDays: 30  },
    { id: 'inv-peri-peri',     name: 'Peri Peri Seasoning',          sku: 'SPICE-PRPR-001', unit: 'KG', currentStock: 0.85,minStock: 0.1, maxStock: 2,   unitCost: 510, storageLocation: 'Dry Store Shelf 2', catName: 'Spices & Condiments', supplierId: 'sup-grainmasters', batchNumber: 'PRP-062847', expiryDaysFromNow: 365, shelfLifeDays: 730 },
    { id: 'inv-chai-spices',   name: 'Masala Chai Spice Mix',        sku: 'SPICE-CHSP-001', unit: 'KG', currentStock: 0.65,minStock: 0.1, maxStock: 1.5, unitCost: 460, storageLocation: 'Dry Store Shelf 2', catName: 'Spices & Condiments', supplierId: 'sup-grainmasters', batchNumber: 'CHS-062848', expiryDaysFromNow: 365, shelfLifeDays: 730 },
    { id: 'inv-choc-sauce',    name: 'Chocolate Sauce',              sku: 'SPICE-CHSC-001', unit: 'KG', currentStock: 2.8, minStock: 0.5, maxStock: 5,   unitCost: 310, storageLocation: 'Dry Store Shelf 2', catName: 'Spices & Condiments', supplierId: 'sup-grainmasters', batchNumber: 'CHS-062849', expiryDaysFromNow: 90,  shelfLifeDays: 180 },
    { id: 'inv-chaat-masala',  name: 'Chaat Masala',                 sku: 'SPICE-CHTM-001', unit: 'KG', currentStock: 0.55,minStock: 0.05,maxStock: 1,   unitCost: 420, storageLocation: 'Dry Store Shelf 2', catName: 'Spices & Condiments', supplierId: 'sup-grainmasters', batchNumber: 'CHT-062850', expiryDaysFromNow: 365, shelfLifeDays: 730 },

    // ── OILS & FATS
    { id: 'inv-cooking-oil',   name: 'Sunflower Cooking Oil',        sku: 'OIL-CKOIL-001', unit: 'L',  currentStock: 14,  minStock: 2,   maxStock: 25,  unitCost: 155, storageLocation: 'Dry Store Shelf 6', catName: 'Oils & Fats', supplierId: 'sup-grainmasters', batchNumber: 'COK-062851', expiryDaysFromNow: 365, shelfLifeDays: 730 },
    { id: 'inv-olive-oil',     name: 'Extra Virgin Olive Oil',       sku: 'OIL-OLOIL-001', unit: 'L',  currentStock: 3.2, minStock: 0.5, maxStock: 6,   unitCost: 600, storageLocation: 'Dry Store Shelf 6', catName: 'Oils & Fats', supplierId: 'sup-grainmasters', batchNumber: 'OLO-062852', expiryDaysFromNow: 365, shelfLifeDays: 730 },

    // ── FROZEN
    { id: 'inv-veg-patty',     name: 'Veg Patty (Pre-made, Frozen)',sku: 'FRZN-VGPT-001', unit: 'PCS', currentStock: 55,  minStock: 10,  maxStock: 100, unitCost: 36,  storageLocation: 'Freezer A',         catName: 'Frozen & Ice Cream', supplierId: 'sup-frozendepot', batchNumber: 'VPY-062853', expiryDaysFromNow: 90, shelfLifeDays: 180 },
    { id: 'inv-ice',           name: 'Ice (Crushed/Cubed)',          sku: 'FRZN-ICE-001',  unit: 'KG',  currentStock: 22,  minStock: 3,   maxStock: 40,  unitCost: 15,  storageLocation: 'Freezer A',         catName: 'Frozen & Ice Cream', supplierId: 'sup-frozendepot', batchNumber: 'ICE-062854', expiryDaysFromNow: 7,  shelfLifeDays: 30  },
  ];

  for (const item of items) {
    if (!ic[item.catName]) { console.warn(`  ⚠ Category not found: ${item.catName}`); continue; }
    await prisma.inventoryItem.upsert({
      where: { id: item.id },
      create: {
        id: item.id,
        name: item.name,
        sku: item.sku,
        unit: item.unit,
        currentStock: item.currentStock,
        minStock: item.minStock,
        maxStock: item.maxStock,
        unitCost: item.unitCost,
        storageLocation: item.storageLocation,
        categoryId: ic[item.catName],
        supplierId: item.supplierId,
        shelfLifeDays: item.shelfLifeDays,
        active: true,
      },
      update: { currentStock: item.currentStock, unitCost: item.unitCost },
    });

    // Create inventory batch for all items
    const expiryDate = daysAgo(-item.expiryDaysFromNow);
    const existingBatch = await prisma.inventoryBatch.findFirst({
      where: { inventoryItemId: item.id, batchNumber: item.batchNumber },
    });
    if (!existingBatch) {
      await prisma.inventoryBatch.create({
        data: {
          inventoryItemId: item.id,
          batchNumber: item.batchNumber,
          quantity: item.currentStock,
          expiryDate,
          purchaseDate: daysAgo(5),
          unitCost: item.unitCost,
          status: BatchStatus.ACTIVE,
        },
      });
    }
  }
  console.log(`  ✓ ${items.length} inventory items created`);

  // ── 3. RECIPES ───────────────────────────────────────────────────────────────
  console.log('Creating recipes...');

  type Ingredient = { itemId: string; qty: number };
  const recipes: Array<{ productName: string; ingredients: Ingredient[] }> = [
    // PIZZA
    { productName: 'Margherita Pizza',   ingredients: [{ itemId: 'inv-pizza-base', qty: 1 }, { itemId: 'inv-pizza-sauce', qty: 0.1 }, { itemId: 'inv-mozz-cheese', qty: 0.15 }, { itemId: 'inv-olive-oil', qty: 0.01 }] },
    { productName: 'Farmhouse Pizza',    ingredients: [{ itemId: 'inv-pizza-base', qty: 1 }, { itemId: 'inv-pizza-sauce', qty: 0.1 }, { itemId: 'inv-mozz-cheese', qty: 0.15 }, { itemId: 'inv-mixed-veg', qty: 0.1 }, { itemId: 'inv-bell-pepper', qty: 0.05 }, { itemId: 'inv-onion', qty: 0.04 }] },
    { productName: 'Paneer Tikka Pizza', ingredients: [{ itemId: 'inv-pizza-base', qty: 1 }, { itemId: 'inv-pizza-sauce', qty: 0.1 }, { itemId: 'inv-mozz-cheese', qty: 0.12 }, { itemId: 'inv-paneer', qty: 0.08 }, { itemId: 'inv-bell-pepper', qty: 0.05 }, { itemId: 'inv-onion', qty: 0.04 }] },
    { productName: 'Corn & Cheese Pizza',ingredients: [{ itemId: 'inv-pizza-base', qty: 1 }, { itemId: 'inv-pizza-sauce', qty: 0.1 }, { itemId: 'inv-mozz-cheese', qty: 0.15 }, { itemId: 'inv-corn', qty: 0.08 }, { itemId: 'inv-onion', qty: 0.03 }] },

    // BURGERS & SANDWICHES
    { productName: 'Veg Burger',         ingredients: [{ itemId: 'inv-burger-bun', qty: 1 }, { itemId: 'inv-veg-patty', qty: 1 }, { itemId: 'inv-lettuce', qty: 0.02 }, { itemId: 'inv-tomato', qty: 0.03 }, { itemId: 'inv-cheese-slice', qty: 1 }] },
    { productName: 'Paneer Burger',      ingredients: [{ itemId: 'inv-burger-bun', qty: 1 }, { itemId: 'inv-paneer', qty: 0.08 }, { itemId: 'inv-lettuce', qty: 0.02 }, { itemId: 'inv-tomato', qty: 0.03 }, { itemId: 'inv-cheese-slice', qty: 1 }, { itemId: 'inv-onion', qty: 0.02 }] },
    { productName: 'Aloo Tikki Burger',  ingredients: [{ itemId: 'inv-burger-bun', qty: 1 }, { itemId: 'inv-potato', qty: 0.1 }, { itemId: 'inv-lettuce', qty: 0.02 }, { itemId: 'inv-tomato', qty: 0.03 }, { itemId: 'inv-onion', qty: 0.02 }, { itemId: 'inv-chaat-masala', qty: 0.003 }] },
    { productName: 'Grilled Veg Sandwich',ingredients:[{ itemId: 'inv-sandwich-bread', qty: 2 }, { itemId: 'inv-mixed-veg', qty: 0.08 }, { itemId: 'inv-butter', qty: 0.015 }, { itemId: 'inv-cheese-slice', qty: 1 }] },
    { productName: 'Club Sandwich',      ingredients: [{ itemId: 'inv-sandwich-bread', qty: 3 }, { itemId: 'inv-mixed-veg', qty: 0.1 }, { itemId: 'inv-butter', qty: 0.02 }, { itemId: 'inv-cheese-slice', qty: 2 }, { itemId: 'inv-lettuce', qty: 0.02 }, { itemId: 'inv-tomato', qty: 0.04 }] },

    // SOUTH INDIAN
    { productName: 'Masala Dosa',        ingredients: [{ itemId: 'inv-rice-flour', qty: 0.15 }, { itemId: 'inv-urad-dal', qty: 0.05 }, { itemId: 'inv-potato', qty: 0.1 }, { itemId: 'inv-onion', qty: 0.03 }, { itemId: 'inv-cooking-oil', qty: 0.015 }, { itemId: 'inv-salt', qty: 0.003 }] },
    { productName: 'Idli Sambar',        ingredients: [{ itemId: 'inv-rice-flour', qty: 0.12 }, { itemId: 'inv-urad-dal', qty: 0.06 }, { itemId: 'inv-tomato', qty: 0.05 }, { itemId: 'inv-onion', qty: 0.03 }, { itemId: 'inv-salt', qty: 0.002 }] },
    { productName: 'Medu Vada',          ingredients: [{ itemId: 'inv-urad-dal', qty: 0.12 }, { itemId: 'inv-onion', qty: 0.03 }, { itemId: 'inv-cooking-oil', qty: 0.02 }, { itemId: 'inv-salt', qty: 0.002 }] },
    { productName: 'Uttapam',            ingredients: [{ itemId: 'inv-rice-flour', qty: 0.15 }, { itemId: 'inv-onion', qty: 0.05 }, { itemId: 'inv-tomato', qty: 0.04 }, { itemId: 'inv-mixed-veg', qty: 0.05 }, { itemId: 'inv-cooking-oil', qty: 0.015 }] },

    // SNACKS & STARTERS
    { productName: 'Veg Spring Rolls',   ingredients: [{ itemId: 'inv-spring-sheets', qty: 3 }, { itemId: 'inv-mixed-veg', qty: 0.08 }, { itemId: 'inv-cooking-oil', qty: 0.02 }] },
    { productName: 'Paneer Tikka',       ingredients: [{ itemId: 'inv-paneer', qty: 0.15 }, { itemId: 'inv-bell-pepper', qty: 0.05 }, { itemId: 'inv-onion', qty: 0.04 }, { itemId: 'inv-curd', qty: 0.05 }, { itemId: 'inv-cooking-oil', qty: 0.01 }] },
    { productName: 'French Fries',       ingredients: [{ itemId: 'inv-potato', qty: 0.2 }, { itemId: 'inv-cooking-oil', qty: 0.03 }, { itemId: 'inv-salt', qty: 0.005 }] },
    { productName: 'Peri Peri Fries',    ingredients: [{ itemId: 'inv-potato', qty: 0.2 }, { itemId: 'inv-cooking-oil', qty: 0.03 }, { itemId: 'inv-peri-peri', qty: 0.01 }, { itemId: 'inv-salt', qty: 0.003 }] },
    { productName: 'Veg Manchurian',     ingredients: [{ itemId: 'inv-mixed-veg', qty: 0.15 }, { itemId: 'inv-maida', qty: 0.03 }, { itemId: 'inv-schezwan-sauce', qty: 0.03 }, { itemId: 'inv-cooking-oil', qty: 0.02 }] },
    { productName: 'Cheese Corn Nuggets',ingredients: [{ itemId: 'inv-corn', qty: 0.1 }, { itemId: 'inv-mozz-cheese', qty: 0.05 }, { itemId: 'inv-maida', qty: 0.03 }, { itemId: 'inv-cooking-oil', qty: 0.02 }] },

    // SALADS & BOWLS
    { productName: 'Greek Salad',        ingredients: [{ itemId: 'inv-lettuce', qty: 0.08 }, { itemId: 'inv-tomato', qty: 0.06 }, { itemId: 'inv-cucumber', qty: 0.06 }, { itemId: 'inv-bell-pepper', qty: 0.04 }, { itemId: 'inv-olive-oil', qty: 0.01 }] },
    { productName: 'Caesar Salad',       ingredients: [{ itemId: 'inv-lettuce', qty: 0.1 }, { itemId: 'inv-cucumber', qty: 0.03 }, { itemId: 'inv-caesar-dressing', qty: 0.04 }, { itemId: 'inv-mozz-cheese', qty: 0.03 }] },
    { productName: 'Sprouts Salad',      ingredients: [{ itemId: 'inv-sprouts', qty: 0.15 }, { itemId: 'inv-tomato', qty: 0.04 }, { itemId: 'inv-cucumber', qty: 0.04 }, { itemId: 'inv-lemon', qty: 0.5 }, { itemId: 'inv-chaat-masala', qty: 0.005 }] },

    // PASTA & NOODLES
    { productName: 'Penne Alfredo',      ingredients: [{ itemId: 'inv-penne-pasta', qty: 0.15 }, { itemId: 'inv-alfredo-sauce', qty: 0.08 }, { itemId: 'inv-mozz-cheese', qty: 0.04 }, { itemId: 'inv-fresh-cream', qty: 0.03 }, { itemId: 'inv-butter', qty: 0.01 }] },
    { productName: 'Arrabiata Pasta',    ingredients: [{ itemId: 'inv-penne-pasta', qty: 0.15 }, { itemId: 'inv-tomato-puree', qty: 0.08 }, { itemId: 'inv-mixed-veg', qty: 0.06 }, { itemId: 'inv-olive-oil', qty: 0.01 }] },
    { productName: 'Veg Hakka Noodles', ingredients: [{ itemId: 'inv-hakka-noodles', qty: 0.15 }, { itemId: 'inv-mixed-veg', qty: 0.1 }, { itemId: 'inv-cooking-oil', qty: 0.02 }] },
    { productName: 'Schezwan Noodles',  ingredients: [{ itemId: 'inv-hakka-noodles', qty: 0.15 }, { itemId: 'inv-mixed-veg', qty: 0.1 }, { itemId: 'inv-schezwan-sauce', qty: 0.04 }, { itemId: 'inv-cooking-oil', qty: 0.02 }] },

    // HOT BEVERAGES
    { productName: 'Masala Chai',        ingredients: [{ itemId: 'inv-milk', qty: 0.15 }, { itemId: 'inv-tea-leaves', qty: 0.005 }, { itemId: 'inv-sugar', qty: 0.01 }, { itemId: 'inv-chai-spices', qty: 0.002 }] },
    { productName: 'Filter Coffee',      ingredients: [{ itemId: 'inv-milk', qty: 0.1 }, { itemId: 'inv-coffee-powder', qty: 0.008 }, { itemId: 'inv-sugar', qty: 0.01 }] },
    { productName: 'Cappuccino',         ingredients: [{ itemId: 'inv-milk', qty: 0.2 }, { itemId: 'inv-coffee-powder', qty: 0.012 }, { itemId: 'inv-sugar', qty: 0.01 }] },
    { productName: 'Hot Chocolate',      ingredients: [{ itemId: 'inv-milk', qty: 0.25 }, { itemId: 'inv-cocoa-powder', qty: 0.02 }, { itemId: 'inv-sugar', qty: 0.02 }] },
    { productName: 'Green Tea',          ingredients: [{ itemId: 'inv-green-tea-bags', qty: 1 }, { itemId: 'inv-sugar', qty: 0.005 }] },

    // COLD BEVERAGES
    { productName: 'Cold Coffee',        ingredients: [{ itemId: 'inv-milk', qty: 0.25 }, { itemId: 'inv-coffee-powder', qty: 0.015 }, { itemId: 'inv-sugar', qty: 0.02 }, { itemId: 'inv-ice', qty: 0.05 }] },
    { productName: 'Oreo Shake',         ingredients: [{ itemId: 'inv-milk', qty: 0.3 }, { itemId: 'inv-oreo-biscuits', qty: 0.05 }, { itemId: 'inv-sugar', qty: 0.015 }, { itemId: 'inv-ice', qty: 0.05 }] },
    { productName: 'Mango Smoothie',     ingredients: [{ itemId: 'inv-milk', qty: 0.2 }, { itemId: 'inv-mango-pulp', qty: 0.15 }, { itemId: 'inv-sugar', qty: 0.015 }, { itemId: 'inv-ice', qty: 0.05 }] },
    { productName: 'Fresh Lime Soda',    ingredients: [{ itemId: 'inv-lemon', qty: 1 }, { itemId: 'inv-sugar', qty: 0.015 }, { itemId: 'inv-soda-water', qty: 0.2 }, { itemId: 'inv-ice', qty: 0.04 }] },
    { productName: 'Iced Tea',           ingredients: [{ itemId: 'inv-tea-leaves', qty: 0.005 }, { itemId: 'inv-sugar', qty: 0.02 }, { itemId: 'inv-lemon', qty: 0.5 }, { itemId: 'inv-ice', qty: 0.05 }] },
    { productName: 'Virgin Mojito',      ingredients: [{ itemId: 'inv-mint', qty: 0.01 }, { itemId: 'inv-lemon', qty: 1 }, { itemId: 'inv-sugar', qty: 0.02 }, { itemId: 'inv-soda-water', qty: 0.2 }, { itemId: 'inv-ice', qty: 0.04 }] },

    // DESSERTS
    { productName: 'Chocolate Brownie',  ingredients: [{ itemId: 'inv-maida', qty: 0.08 }, { itemId: 'inv-cocoa-powder', qty: 0.02 }, { itemId: 'inv-butter', qty: 0.04 }, { itemId: 'inv-sugar', qty: 0.06 }, { itemId: 'inv-choc-sauce', qty: 0.03 }] },
    { productName: 'Gulab Jamun',        ingredients: [{ itemId: 'inv-gulab-mix', qty: 0.1 }, { itemId: 'inv-sugar', qty: 0.08 }, { itemId: 'inv-cooking-oil', qty: 0.02 }] },
    { productName: 'Chocolate Lava Cake',ingredients: [{ itemId: 'inv-maida', qty: 0.06 }, { itemId: 'inv-cocoa-powder', qty: 0.025 }, { itemId: 'inv-butter', qty: 0.05 }, { itemId: 'inv-sugar', qty: 0.05 }, { itemId: 'inv-choc-sauce', qty: 0.04 }] },
    { productName: 'Tiramisu',           ingredients: [{ itemId: 'inv-mascarpone', qty: 0.08 }, { itemId: 'inv-ladyfinger', qty: 0.08 }, { itemId: 'inv-coffee-powder', qty: 0.01 }, { itemId: 'inv-cocoa-powder', qty: 0.01 }, { itemId: 'inv-sugar', qty: 0.03 }] },
    { productName: 'Gajar Halwa',        ingredients: [{ itemId: 'inv-carrot', qty: 0.2 }, { itemId: 'inv-milk', qty: 0.1 }, { itemId: 'inv-sugar', qty: 0.05 }, { itemId: 'inv-khoya', qty: 0.05 }, { itemId: 'inv-butter', qty: 0.02 }] },
  ];

  // Load inventory items for unit lookups
  const allInvItems = await prisma.inventoryItem.findMany();
  const invItemMap: Record<string, { unit: string }> = {};
  for (const i of allInvItems) invItemMap[i.id] = { unit: i.unit };

  let recipeCount = 0;
  for (const r of recipes) {
    const productId = pByName[r.productName];
    if (!productId) { console.warn(`  ⚠ Product not found: ${r.productName}`); continue; }

    const existing = await prisma.recipe.findUnique({ where: { productId } });
    if (existing) {
      await prisma.recipeIngredient.deleteMany({ where: { recipeId: existing.id } });
      await prisma.recipe.delete({ where: { id: existing.id } });
    }

    await prisma.recipe.create({
      data: {
        productId,
        name: `${r.productName} Recipe`,
        yield: 1,
        active: true,
        ingredients: {
          create: r.ingredients.map(ing => ({
            inventoryItemId: ing.itemId,
            quantity: ing.qty,
            unit: invItemMap[ing.itemId]?.unit ?? 'KG',
          })),
        },
      },
    });
    recipeCount++;
  }
  console.log(`  ✓ ${recipeCount} recipes created`);

  // ── 4. PURCHASE HISTORY ──────────────────────────────────────────────────────
  console.log('Creating purchase history...');
  type POLine = { inventoryItemId: string; quantity: number; unitPrice: number };
  const purchaseHistory = [
    { supplierId: 'sup-freshfarm',      weeksBack: 10, items: [{ inventoryItemId: 'inv-milk', quantity: 50, unitPrice: 60 }, { inventoryItemId: 'inv-mozz-cheese', quantity: 12, unitPrice: 420 }, { inventoryItemId: 'inv-paneer', quantity: 10, unitPrice: 280 }, { inventoryItemId: 'inv-butter', quantity: 6, unitPrice: 480 }, { inventoryItemId: 'inv-fresh-cream', quantity: 5, unitPrice: 195 }, { inventoryItemId: 'inv-curd', quantity: 8, unitPrice: 80 }, { inventoryItemId: 'inv-cheese-slice', quantity: 100, unitPrice: 12 }] as POLine[] },
    { supplierId: 'sup-metrofresh',     weeksBack: 7,  items: [{ inventoryItemId: 'inv-mixed-veg', quantity: 20, unitPrice: 62 }, { inventoryItemId: 'inv-potato', quantity: 30, unitPrice: 30 }, { inventoryItemId: 'inv-tomato', quantity: 15, unitPrice: 42 }, { inventoryItemId: 'inv-onion', quantity: 20, unitPrice: 35 }, { inventoryItemId: 'inv-lettuce', quantity: 6, unitPrice: 82 }, { inventoryItemId: 'inv-cucumber', quantity: 8, unitPrice: 30 }, { inventoryItemId: 'inv-bell-pepper', quantity: 8, unitPrice: 92 }, { inventoryItemId: 'inv-corn', quantity: 8, unitPrice: 70 }, { inventoryItemId: 'inv-lemon', quantity: 80, unitPrice: 5 }] as POLine[] },
    { supplierId: 'sup-grainmasters',   weeksBack: 5,  items: [{ inventoryItemId: 'inv-maida', quantity: 20, unitPrice: 40 }, { inventoryItemId: 'inv-rice-flour', quantity: 15, unitPrice: 55 }, { inventoryItemId: 'inv-urad-dal', quantity: 10, unitPrice: 140 }, { inventoryItemId: 'inv-penne-pasta', quantity: 8, unitPrice: 120 }, { inventoryItemId: 'inv-hakka-noodles', quantity: 8, unitPrice: 100 }, { inventoryItemId: 'inv-pizza-base', quantity: 80, unitPrice: 35 }, { inventoryItemId: 'inv-burger-bun', quantity: 120, unitPrice: 14 }, { inventoryItemId: 'inv-sandwich-bread', quantity: 100, unitPrice: 6 }, { inventoryItemId: 'inv-spring-sheets', quantity: 120, unitPrice: 5 }, { inventoryItemId: 'inv-gulab-mix', quantity: 6, unitPrice: 160 }] as POLine[] },
    { supplierId: 'sup-brewessentials', weeksBack: 3,  items: [{ inventoryItemId: 'inv-coffee-powder', quantity: 4, unitPrice: 800 }, { inventoryItemId: 'inv-tea-leaves', quantity: 3, unitPrice: 600 }, { inventoryItemId: 'inv-green-tea-bags', quantity: 150, unitPrice: 8 }, { inventoryItemId: 'inv-cocoa-powder', quantity: 3, unitPrice: 550 }, { inventoryItemId: 'inv-mango-pulp', quantity: 8, unitPrice: 180 }, { inventoryItemId: 'inv-oreo-biscuits', quantity: 4, unitPrice: 450 }, { inventoryItemId: 'inv-soda-water', quantity: 20, unitPrice: 30 }] as POLine[] },
    { supplierId: 'sup-freshfarm',      weeksBack: 1,  items: [{ inventoryItemId: 'inv-milk', quantity: 30, unitPrice: 62 }, { inventoryItemId: 'inv-mozz-cheese', quantity: 10, unitPrice: 420 }, { inventoryItemId: 'inv-paneer', quantity: 8, unitPrice: 285 }, { inventoryItemId: 'inv-mascarpone', quantity: 2, unitPrice: 650 }, { inventoryItemId: 'inv-khoya', quantity: 4, unitPrice: 380 }] as POLine[] },
  ];

  let poSeq = 1001;
  for (const ph of purchaseHistory) {
    const poDate = weeksAgo(ph.weeksBack);
    const grnDate = new Date(poDate.getTime() + 2 * 86400000);
    const poNum = `PO-2026-${String(poSeq).padStart(5, '0')}`;
    const grnNum = `GRN-2026-${String(poSeq).padStart(5, '0')}`;
    poSeq++;

    const totalAmount = ph.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);

    // Skip if PO already exists
    const existingPO = await prisma.purchaseOrder.findUnique({ where: { poNumber: poNum } });
    if (existingPO) continue;

    const po = await prisma.purchaseOrder.create({
      data: {
        poNumber: poNum,
        supplierId: ph.supplierId,
        status: PurchaseOrderStatus.RECEIVED,
        expectedDate: new Date(poDate.getTime() + 3 * 86400000),
        totalAmount,
        createdBy: admin.id,
        createdAt: poDate,
        items: { create: ph.items.map(i => ({ inventoryItemId: i.inventoryItemId, quantity: i.quantity, unitPrice: i.unitPrice, totalPrice: i.quantity * i.unitPrice })) },
      },
    });

    await prisma.goodsReceivedNote.create({
      data: {
        grnNumber: grnNum,
        poId: po.id,
        receivedDate: grnDate,
        receivedBy: admin.id,
        createdAt: grnDate,
        items: {
          create: ph.items.map(i => ({
            inventoryItemId: i.inventoryItemId,
            orderedQty: i.quantity,
            receivedQty: i.quantity,
            unitPrice: i.unitPrice,
          })),
        },
      },
    });

    for (const line of ph.items) {
      const invItem = await prisma.inventoryItem.findUnique({ where: { id: line.inventoryItemId } });
      if (!invItem) continue;
      await prisma.stockMovement.create({
        data: {
          inventoryItemId: line.inventoryItemId,
          type: StockMovementType.PURCHASE,
          quantity: line.quantity,
          stockBefore: 0,
          stockAfter: line.quantity,
          referenceType: 'GRN',
          referenceId: po.id,
          createdBy: admin.id,
          createdAt: grnDate,
        },
      });
    }
  }
  console.log(`  ✓ ${purchaseHistory.length} purchase orders + GRNs created`);

  // ── 5. DEDUCT STOCK FOR EXISTING PAID ORDERS ─────────────────────────────────
  console.log('Deducting stock for existing paid orders...');
  const paidOrders = await prisma.order.findMany({
    where: { isPaid: true },
    include: { items: true },
  });

  const alreadyDeducted = new Set(
    (await prisma.stockMovement.findMany({ where: { type: StockMovementType.ORDER_DEDUCTION }, select: { referenceId: true } }))
      .map(m => m.referenceId)
  );

  let deductCount = 0;
  for (const order of paidOrders) {
    if (alreadyDeducted.has(order.id)) continue;

    for (const orderItem of order.items) {
      const recipe = await prisma.recipe.findUnique({
        where: { productId: orderItem.productId },
        include: { ingredients: { include: { inventoryItem: true } } },
      });
      if (!recipe || !recipe.active) continue;

      for (const ing of recipe.ingredients) {
        const deductQty = ing.quantity * orderItem.quantity;
        const invItem = await prisma.inventoryItem.findUnique({ where: { id: ing.inventoryItemId } });
        if (!invItem) continue;

        const newStock = Math.max(0, invItem.currentStock - deductQty);
        await prisma.inventoryItem.update({ where: { id: invItem.id }, data: { currentStock: newStock } });
        await prisma.stockMovement.create({
          data: {
            inventoryItemId: invItem.id,
            type: StockMovementType.ORDER_DEDUCTION,
            quantity: -deductQty,
            stockBefore: invItem.currentStock,
            stockAfter: newStock,
            referenceType: 'Order',
            referenceId: order.id,
            createdBy: admin.id,
            createdAt: order.updatedAt,
          },
        });
      }
    }
    deductCount++;
  }
  console.log(`  ✓ Processed ${deductCount} paid orders for stock deduction`);

  // ── 6. HISTORICAL WASTAGE ────────────────────────────────────────────────────
  console.log('Creating historical wastage entries...');
  const [kitchenR, expiryR, cookErrR] = await Promise.all([
    prisma.wastageReason.findFirst({ where: { name: 'Kitchen Wastage' } }),
    prisma.wastageReason.findFirst({ where: { name: 'Expired Product' } }),
    prisma.wastageReason.findFirst({ where: { name: 'Cooking Error' } }),
  ]);

  if (kitchenR && expiryR && cookErrR) {
    const wastage = [
      { itemId: 'inv-milk',      qty: 2,    reasonId: kitchenR.id,  notes: 'Milk turned sour before use',               date: weeksAgo(8), shift: 'MORNING' },
      { itemId: 'inv-mixed-veg', qty: 1.5,  reasonId: expiryR.id,   notes: 'Not used within 2 days of delivery',        date: weeksAgo(6), shift: 'AFTERNOON' },
      { itemId: 'inv-lettuce',   qty: 0.5,  reasonId: expiryR.id,   notes: 'Wilted lettuce — unusable',                  date: weeksAgo(5), shift: 'MORNING' },
      { itemId: 'inv-paneer',    qty: 0.3,  reasonId: kitchenR.id,  notes: 'Prep/cutting waste',                         date: weeksAgo(4), shift: 'MORNING' },
      { itemId: 'inv-tomato',    qty: 0.8,  reasonId: expiryR.id,   notes: 'Overripe batch — not suitable for service',  date: weeksAgo(3), shift: 'AFTERNOON' },
      { itemId: 'inv-potato',    qty: 1.0,  reasonId: cookErrR.id,  notes: 'Over-fried batch discarded',                 date: weeksAgo(2), shift: 'EVENING' },
      { itemId: 'inv-coffee-powder', qty: 0.05, reasonId: kitchenR.id, notes: 'Grounds clogged machine filter',          date: weeksAgo(1), shift: 'MORNING' },
    ];

    for (const w of wastage) {
      const invItem = await prisma.inventoryItem.findUnique({ where: { id: w.itemId } });
      if (!invItem) continue;

      const entry = await prisma.wastageEntry.create({
        data: {
          inventoryItemId: w.itemId,
          date: w.date,
          quantity: w.qty,
          unit: invItem.unit,
          reasonId: w.reasonId,
          cost: w.qty * invItem.unitCost,
          notes: w.notes,
          shift: w.shift as any,
          status: 'APPROVED',
          reportedBy: admin.id,
          approvedBy: admin.id,
          approvedAt: new Date(w.date.getTime() + 3600000),
        },
      });

      const newStock = Math.max(0, invItem.currentStock - w.qty);
      await prisma.stockMovement.create({
        data: {
          inventoryItemId: w.itemId,
          type: StockMovementType.WASTAGE,
          quantity: -w.qty,
          stockBefore: invItem.currentStock,
          stockAfter: newStock,
          referenceType: 'WastageEntry',
          referenceId: entry.id,
          createdBy: admin.id,
          createdAt: w.date,
        },
      });
    }
    console.log(`  ✓ ${wastage.length} wastage entries created`);
  }

  // ── SUMMARY ──────────────────────────────────────────────────────────────────
  const finalItems = await prisma.inventoryItem.findMany({ where: { active: true } });
  const lowStock = finalItems.filter(i => i.currentStock <= i.minStock);
  const totalValue = finalItems.reduce((s, i) => s + i.currentStock * i.unitCost, 0);
  const movements = await prisma.stockMovement.count();
  const recipesFinal = await prisma.recipe.count();

  console.log('\n✅  Inventory seed complete!');
  console.log(`    Items:      ${finalItems.length}`);
  console.log(`    Recipes:    ${recipesFinal}`);
  console.log(`    Movements:  ${movements}`);
  console.log(`    Low stock:  ${lowStock.length} (${lowStock.map(i => i.name).join(', ') || 'none'})`);
  console.log(`    Inv value:  ₹${totalValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}\n`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
