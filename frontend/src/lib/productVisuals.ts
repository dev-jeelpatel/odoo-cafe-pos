// Maps a product/category name to a relatable emoji illustration used as a
// placeholder "image" on POS cards when no imageUrl is set.
const KEYWORD_EMOJI: [RegExp, string][] = [
  [/pizza/i, '🍕'],
  [/burger/i, '🍔'],
  [/sandwich|club/i, '🥪'],
  [/wrap/i, '🌯'],
  [/dosa|uttapam/i, '🫓'],
  [/idli|vada/i, '🍙'],
  [/spring roll|roll/i, '🥟'],
  [/tikka|paneer/i, '🧀'],
  [/manchurian|noodle|hakka|schezwan/i, '🍜'],
  [/pasta|penne|alfredo|arrabiata/i, '🍝'],
  [/fries|nugget/i, '🍟'],
  [/salad|sprouts/i, '🥗'],
  [/chai|tea/i, '🍵'],
  [/coffee|espresso|cappuccino|latte/i, '☕'],
  [/chocolate|hot chocolate/i, '🍫'],
  [/shake|smoothie|mango/i, '🥤'],
  [/lime|soda|mojito|iced/i, '🧊'],
  [/brownie|cake|lava/i, '🍰'],
  [/gulab jamun|jamun/i, '🍩'],
  [/halwa/i, '🍮'],
  [/green tea/i, '🍵'],
];

const CATEGORY_EMOJI: Record<string, string> = {
  'Pizza': '🍕',
  'Burgers & Sandwiches': '🍔',
  'Burgers': '🍔',
  'South Indian': '🫓',
  'Snacks & Starters': '🥟',
  'Starters': '🥟',
  'Salads & Bowls': '🥗',
  'Pasta & Noodles': '🍝',
  'Hot Beverages': '☕',
  'Hot Drinks': '☕',
  'Cold Beverages': '🥤',
  'Cold Drinks': '🥤',
  'Drinks': '🥤',
  'Desserts': '🍰',
  'Food': '🍽️',
};

export function getProductEmoji(name: string, categoryName?: string): string {
  for (const [pattern, emoji] of KEYWORD_EMOJI) {
    if (pattern.test(name)) return emoji;
  }
  if (categoryName && CATEGORY_EMOJI[categoryName]) return CATEGORY_EMOJI[categoryName];
  return '🍽️';
}
