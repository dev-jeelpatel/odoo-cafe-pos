import 'dotenv/config';
import mongoose from 'mongoose';
import Category from '../models/Category';
import Product from '../models/Product';

const categories = [
  { name: 'Hot Beverages',   color: '#f97316' },
  { name: 'Cold Beverages',  color: '#06b6d4' },
  { name: 'Starters',        color: '#f59e0b' },
  { name: 'Main Course',     color: '#10b981' },
  { name: 'Breads',          color: '#8b5cf6' },
  { name: 'Rice & Biryani',  color: '#ef4444' },
  { name: 'Desserts',        color: '#ec4899' },
  { name: 'Fast Food',       color: '#3b82f6' },
];

// Products per category: [name, price, tax, description]
const productData: Record<string, [string, number, number, string][]> = {
  'Hot Beverages': [
    ['Masala Chai',        30,  5,  'Spiced Indian tea with ginger & cardamom'],
    ['Filter Coffee',      40,  5,  'South Indian filter coffee with chicory'],
    ['Espresso',           80,  5,  'Strong single shot espresso'],
    ['Cappuccino',        120,  5,  'Espresso with steamed milk foam'],
    ['Latte',             130,  5,  'Espresso with smooth steamed milk'],
    ['Hot Chocolate',     150,  5,  'Rich creamy hot chocolate'],
    ['Green Tea',          60,  5,  'Light & refreshing green tea'],
    ['Ginger Lemon Tea',   50,  5,  'Hot tea with ginger and lemon'],
  ],
  'Cold Beverages': [
    ['Cold Coffee',       120,  5,  'Chilled coffee with ice cream'],
    ['Mango Lassi',        90,  5,  'Thick mango & yogurt drink'],
    ['Strawberry Shake',  130,  5,  'Fresh strawberry milkshake'],
    ['Oreo Shake',        150,  5,  'Blended Oreo cookie milkshake'],
    ['Fresh Lime Soda',    60,  5,  'Lime soda sweet or salted'],
    ['Virgin Mojito',      99,  5,  'Mint lime mocktail with soda'],
    ['Watermelon Juice',   80,  5,  'Fresh chilled watermelon juice'],
    ['Iced Tea',           80,  5,  'Chilled lemon iced tea'],
  ],
  'Starters': [
    ['Paneer Tikka',      220, 12,  'Cottage cheese marinated & grilled in tandoor'],
    ['Veg Spring Rolls',  160, 12,  'Crispy rolls stuffed with mixed vegetables'],
    ['Chicken Tikka',     280, 12,  'Juicy chicken grilled in tandoor'],
    ['Crispy Corn',       150, 12,  'Fried corn tossed in spices'],
    ['Dahi Puri',         120, 12,  'Puri filled with yogurt, chutney & sev'],
    ['Samosa (2 pcs)',     60, 12,  'Golden fried potato stuffed pastry'],
    ['Nachos & Salsa',    180, 12,  'Crunchy nachos with tomato salsa dip'],
    ['Hara Bhara Kabab',  180, 12,  'Spinach & potato kabab, shallow fried'],
  ],
  'Main Course': [
    ['Paneer Butter Masala', 280, 12, 'Paneer in rich buttery tomato gravy'],
    ['Dal Makhani',          220, 12, 'Slow-cooked black lentils in cream & butter'],
    ['Shahi Paneer',         300, 12, 'Paneer in creamy royal cashew gravy'],
    ['Butter Chicken',       320, 12, 'Tender chicken in mild buttery tomato sauce'],
    ['Chicken Kadai',        310, 12, 'Spiced chicken cooked with peppers & tomato'],
    ['Palak Paneer',         260, 12, 'Cottage cheese cubes in spinach gravy'],
    ['Veg Kadai',            240, 12, 'Mixed vegetables in spiced kadai masala'],
    ['Mutton Rogan Josh',    380, 12, 'Slow-cooked mutton in aromatic Kashmiri gravy'],
  ],
  'Breads': [
    ['Butter Naan',       50, 5, 'Soft leavened bread brushed with butter'],
    ['Garlic Naan',       60, 5, 'Naan topped with garlic & coriander'],
    ['Tandoori Roti',     30, 5, 'Whole wheat bread baked in tandoor'],
    ['Paratha',           50, 5, 'Layered whole wheat flatbread'],
    ['Puri (4 pcs)',      50, 5, 'Deep-fried puffed Indian bread'],
    ['Kulcha',            60, 5, 'Soft stuffed bread from tandoor'],
  ],
  'Rice & Biryani': [
    ['Veg Biryani',          220, 12, 'Fragrant basmati rice with spiced vegetables'],
    ['Chicken Biryani',      280, 12, 'Dum-cooked chicken biryani with raita'],
    ['Mutton Biryani',       350, 12, 'Slow-cooked mutton biryani, Hyderabadi style'],
    ['Egg Biryani',          240, 12, 'Biryani with boiled eggs in spiced rice'],
    ['Jeera Rice',           120, 12, 'Basmati rice tempered with cumin'],
    ['Veg Fried Rice',       180, 12, 'Wok-tossed rice with mixed vegetables'],
    ['Chicken Fried Rice',   220, 12, 'Stir-fried rice with chicken & egg'],
  ],
  'Desserts': [
    ['Gulab Jamun (2 pcs)', 80,  5,  'Soft milk solids soaked in rose sugar syrup'],
    ['Rasgulla (2 pcs)',    80,  5,  'Spongy cottage cheese balls in sugar syrup'],
    ['Kulfi',              100,  5,  'Traditional Indian ice cream — malai or mango'],
    ['Brownie',            150,  5,  'Warm chocolate brownie with vanilla ice cream'],
    ['Gajar Halwa',        100,  5,  'Sweet carrot pudding with ghee & nuts'],
    ['Phirni',             110,  5,  'Creamy rice pudding served chilled'],
    ['Ice Cream (2 scoops)',120,  5,  'Choice of vanilla, chocolate, or strawberry'],
  ],
  'Fast Food': [
    ['Veg Burger',        120, 12,  'Crispy veg patty with lettuce & sauce'],
    ['Chicken Burger',    160, 12,  'Grilled chicken with coleslaw & mayo'],
    ['Veg Pizza (7")',    220, 12,  'Thin crust pizza with veggies & cheese'],
    ['Chicken Pizza (7")',280, 12,  'Thin crust pizza with chicken & peppers'],
    ['French Fries',      100, 12,  'Crispy golden fries with ketchup'],
    ['Pav Bhaji',         130, 12,  'Spiced mashed veggies with buttered pav'],
    ['Chole Bhature',     140, 12,  'Spicy chickpeas with puffy fried bread'],
    ['Masala Dosa',       130, 12,  'Crispy rice crepe with spiced potato filling'],
  ],
};

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cafe-pos');
  console.log('✅ MongoDB connected');

  // Clear existing
  await Category.deleteMany({});
  await Product.deleteMany({});
  console.log('🗑️  Cleared existing categories & products');

  // Insert categories
  const insertedCategories = await Category.insertMany(categories);
  console.log(`📁 Inserted ${insertedCategories.length} categories`);

  // Build category name → _id map
  const catMap: Record<string, mongoose.Types.ObjectId> = {};
  for (const cat of insertedCategories) {
    catMap[cat.name] = cat._id as mongoose.Types.ObjectId;
  }

  // Build products array
  const products = [];
  for (const [catName, items] of Object.entries(productData)) {
    const categoryId = catMap[catName];
    for (const [name, price, tax, description] of items) {
      products.push({ name, price, tax, description, category: categoryId, unit: 'piece', isAvailable: true });
    }
  }

  await Product.insertMany(products);
  console.log(`🍽️  Inserted ${products.length} products`);
  console.log('\n🎉 Seed complete! Your menu is ready.');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
