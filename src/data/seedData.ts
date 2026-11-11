import {
  Product,
  Batch,
  Customer,
  Order,
  WriteOff,
  PurchaseRequest,
  SupplierQuotation,
  ProductSalesHistory,
  AlertThresholds,
  CategoryThresholdOverride,
  InterviewNotes,
} from '../types';

export const BASE_TODAY = '2026-11-15';

// Seeded PRNG for deterministic, repeatable dataset
class SeededRandom {
  private seed: number;
  constructor(seed = 42) {
    this.seed = seed;
  }
  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
  range(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
  choice<T>(arr: T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
}

const rng = new SeededRandom(1337);

// 40 Realistic Pakistani SKUs for Demo Foods Pvt Ltd (Multan)
export const SEED_PRODUCTS: Product[] = [
  // 1. Biscuits
  {
    sku: 'SKU-BIS-001',
    name: 'Sooper Classic Egg & Milk Biscuits',
    category: 'Biscuits',
    unit: 'carton',
    shelfLifeDays: 180,
    unitCost: 1850,
    unitPrice: 2400,
    avgDailySales: 28,
    leadTimeDays: 7,
    safetyStock: 120,
    supplier: 'Multan Flour & Agro Mills',
    description: 'Crisp traditional tea biscuit, 48 packs per master carton.',
  },
  {
    sku: 'SKU-BIS-002',
    name: 'Rio Strawberry Cream Sandwich Biscuits',
    category: 'Biscuits',
    unit: 'carton',
    shelfLifeDays: 180,
    unitCost: 2100,
    unitPrice: 2800,
    avgDailySales: 22,
    leadTimeDays: 7,
    safetyStock: 100,
    supplier: 'Multan Flour & Agro Mills',
    description: 'Double sandwich cream biscuit with fruit flavouring.',
  },
  {
    sku: 'SKU-BIS-003',
    name: 'Prince Chocolate Cream Biscuits',
    category: 'Biscuits',
    unit: 'carton',
    shelfLifeDays: 180,
    unitCost: 2250,
    unitPrice: 3000,
    avgDailySales: 25,
    leadTimeDays: 7,
    safetyStock: 110,
    supplier: 'Multan Flour & Agro Mills',
    description: 'Cocoa cream sandwich biscuit popular among school children.',
  },
  {
    sku: 'SKU-BIS-004',
    name: 'Gala Roasted Coconut Biscuits',
    category: 'Biscuits',
    unit: 'carton',
    shelfLifeDays: 150,
    unitCost: 1650,
    unitPrice: 2200,
    avgDailySales: 18,
    leadTimeDays: 8,
    safetyStock: 90,
    supplier: 'Chenab Grains Ltd',
    description: 'Desiccated coconut enriched crisp tea snack.',
  },
  {
    sku: 'SKU-BIS-005',
    name: 'Bakeri Traditional Nankhatai Biscuits',
    category: 'Biscuits',
    unit: 'carton',
    shelfLifeDays: 120,
    unitCost: 2600,
    unitPrice: 3500,
    avgDailySales: 14,
    leadTimeDays: 10,
    safetyStock: 70,
    supplier: 'Chenab Grains Ltd',
    description: 'Cardamom and ghee flavoured traditional Pakistani shortbread.',
  },
  {
    sku: 'SKU-BIS-006',
    name: 'Candi Brown Sugar Caramel Biscuits',
    category: 'Biscuits',
    unit: 'carton',
    shelfLifeDays: 180,
    unitCost: 2000,
    unitPrice: 2650,
    avgDailySales: 20,
    leadTimeDays: 7,
    safetyStock: 95,
    supplier: 'Multan Flour & Agro Mills',
    description: 'Caramelized brown sugar biscuit ideal for cheesecake crusts.',
  },

  // 2. Wafers
  {
    sku: 'SKU-WAF-001',
    name: 'Cocomo Choco Filled Bites 24x',
    category: 'Wafers',
    unit: 'carton',
    shelfLifeDays: 240,
    unitCost: 2400,
    unitPrice: 3200,
    avgDailySales: 35,
    leadTimeDays: 6,
    safetyStock: 150,
    supplier: 'Indus Valley Confections',
    description: 'Crisp wafer pillows filled with rich milk chocolate.',
  },
  {
    sku: 'SKU-WAF-002',
    name: 'Ding Dong Vanilla Cream Wafers',
    category: 'Wafers',
    unit: 'carton',
    shelfLifeDays: 210,
    unitCost: 1750,
    unitPrice: 2350,
    avgDailySales: 16,
    leadTimeDays: 7,
    safetyStock: 80,
    supplier: 'Indus Valley Confections',
    description: '3-layer crispy wafer fingers with sweet Madagascar vanilla cream.',
  },
  {
    sku: 'SKU-WAF-003',
    name: 'Bravo Double Chocolate Wafer Rolls',
    category: 'Wafers',
    unit: 'carton',
    shelfLifeDays: 210,
    unitCost: 2900,
    unitPrice: 3900,
    avgDailySales: 15,
    leadTimeDays: 8,
    safetyStock: 75,
    supplier: 'Indus Valley Confections',
    description: 'Rolled hollow wafers coated and filled with dark chocolate.',
  },
  {
    sku: 'SKU-WAF-004',
    name: 'Jubilee Hazelnut Crunch Wafer Bar',
    category: 'Wafers',
    unit: 'carton',
    shelfLifeDays: 180,
    unitCost: 3100,
    unitPrice: 4200,
    avgDailySales: 12,
    leadTimeDays: 9,
    safetyStock: 60,
    supplier: 'Indus Valley Confections',
    description: 'Hazelnut praline layered wafer coated in milk chocolate.',
  },

  // 3. Confectionery
  {
    sku: 'SKU-CNF-001',
    name: 'Eclairs Creamy Rich Toffees 1kg Bag',
    category: 'Confectionery',
    unit: 'carton',
    shelfLifeDays: 360,
    unitCost: 3400,
    unitPrice: 4500,
    avgDailySales: 24,
    leadTimeDays: 10,
    safetyStock: 110,
    supplier: 'Shakar Sugar & Confections',
    description: 'Chewy caramel toffee with liquid chocolate core.',
  },
  {
    sku: 'SKU-CNF-002',
    name: 'Soft Chews Chaunsa Mango Flavour 1kg',
    category: 'Confectionery',
    unit: 'carton',
    shelfLifeDays: 270,
    unitCost: 2800,
    unitPrice: 3800,
    avgDailySales: 20,
    leadTimeDays: 10,
    safetyStock: 90,
    supplier: 'Shakar Sugar & Confections',
    description: 'Pectin-based soft fruit chew infused with Multani mango pulp.',
  },
  {
    sku: 'SKU-CNF-003',
    name: 'Royal Butter Toffee Supreme 800g',
    category: 'Confectionery',
    unit: 'carton',
    shelfLifeDays: 300,
    unitCost: 2600,
    unitPrice: 3500,
    avgDailySales: 15,
    leadTimeDays: 10,
    safetyStock: 80,
    supplier: 'Shakar Sugar & Confections',
    description: 'Traditional slow-cooked milk and dairy butter hard toffees.',
  },
  {
    sku: 'SKU-CNF-004',
    name: 'Multan Rose Milk Drops 500g',
    category: 'Confectionery',
    unit: 'carton',
    shelfLifeDays: 240,
    unitCost: 2200,
    unitPrice: 3100,
    avgDailySales: 8,
    leadTimeDays: 12,
    safetyStock: 50,
    supplier: 'Shakar Sugar & Confections',
    description: 'Fragrant pink rose essence boiled sweets.',
  },
  {
    sku: 'SKU-CNF-005',
    name: 'Choco Delight Dark Bar 45g (Box of 24)',
    category: 'Confectionery',
    unit: 'box',
    shelfLifeDays: 240,
    unitCost: 1800,
    unitPrice: 2500,
    avgDailySales: 16,
    leadTimeDays: 10,
    safetyStock: 80,
    supplier: 'Indus Valley Confections',
    description: '55% cocoa dark chocolate bar with roasted almond bits.',
  },

  // 4. Pasta
  {
    sku: 'SKU-PAS-001',
    name: 'Kolson Durum Wheat Elbow Macaroni 400g',
    category: 'Pasta',
    unit: 'carton',
    shelfLifeDays: 540,
    unitCost: 1950,
    unitPrice: 2600,
    avgDailySales: 30,
    leadTimeDays: 8,
    safetyStock: 140,
    supplier: 'Chenab Grains Ltd',
    description: '100% durum semolina pasta, 24 poly bags per carton.',
  },
  {
    sku: 'SKU-PAS-002',
    name: 'Kolson Italian Spaghetti 500g',
    category: 'Pasta',
    unit: 'carton',
    shelfLifeDays: 540,
    unitCost: 2300,
    unitPrice: 3100,
    avgDailySales: 22,
    leadTimeDays: 8,
    safetyStock: 110,
    supplier: 'Chenab Grains Ltd',
    description: 'Long thin pasta extruded through bronze dies.',
  },
  {
    sku: 'SKU-PAS-003',
    name: 'Quick Cook Egg Noodles Supreme 350g',
    category: 'Pasta',
    unit: 'carton',
    shelfLifeDays: 360,
    unitCost: 2100,
    unitPrice: 2850,
    avgDailySales: 26,
    leadTimeDays: 7,
    safetyStock: 130,
    supplier: 'Chenab Grains Ltd',
    description: 'Steamed quick noodles with dehydrated seasoning sachets.',
  },
  {
    sku: 'SKU-PAS-004',
    name: 'Penne Rigate Durum Semolina 400g',
    category: 'Pasta',
    unit: 'carton',
    shelfLifeDays: 540,
    unitCost: 2150,
    unitPrice: 2900,
    avgDailySales: 18,
    leadTimeDays: 8,
    safetyStock: 90,
    supplier: 'Chenab Grains Ltd',
    description: 'Grooved cylindrical pasta ideal for thick sauces.',
  },
  {
    sku: 'SKU-PAS-005',
    name: 'Fusilli Spiral Tricolore 400g',
    category: 'Pasta',
    unit: 'carton',
    shelfLifeDays: 450,
    unitCost: 2500,
    unitPrice: 3400,
    avgDailySales: 10,
    leadTimeDays: 10,
    safetyStock: 60,
    supplier: 'Chenab Grains Ltd',
    description: 'Three-colour corkscrew pasta with spinach and tomato powder.',
  },

  // 5. Sauces
  {
    sku: 'SKU-SAU-001',
    name: 'Zesty Multan Tomato Ketchup 800g Squeeze',
    category: 'Sauces',
    unit: 'carton',
    shelfLifeDays: 360,
    unitCost: 3100,
    unitPrice: 4200,
    avgDailySales: 25,
    leadTimeDays: 9,
    safetyStock: 120,
    supplier: 'Punjab Agro Foods Pvt Ltd',
    description: 'Rich tomato paste with vinegar, cloves and cinnamon in PET bottle.',
  },
  {
    sku: 'SKU-SAU-002',
    name: 'Multan Chilli Garlic Sauce 500g Bottle',
    category: 'Sauces',
    unit: 'carton',
    shelfLifeDays: 360,
    unitCost: 2850,
    unitPrice: 3900,
    avgDailySales: 32,
    leadTimeDays: 9,
    safetyStock: 150,
    supplier: 'Punjab Agro Foods Pvt Ltd',
    description: 'Spicy garlic condiment formulated for samosas and barbecue.',
  },
  {
    sku: 'SKU-SAU-003',
    name: 'Green Chilli Fiery Sauce 300g Bottle',
    category: 'Sauces',
    unit: 'carton',
    shelfLifeDays: 270,
    unitCost: 2100,
    unitPrice: 2900,
    avgDailySales: 14,
    leadTimeDays: 9,
    safetyStock: 70,
    supplier: 'Punjab Agro Foods Pvt Ltd',
    description: 'Pungent crushed green pepper dip with salt and vinegar.',
  },
  {
    sku: 'SKU-SAU-004',
    name: 'Traditional Mango Chutney Sweet & Sour 400g',
    category: 'Sauces',
    unit: 'carton',
    shelfLifeDays: 360,
    unitCost: 3200,
    unitPrice: 4400,
    avgDailySales: 11,
    leadTimeDays: 12,
    safetyStock: 65,
    supplier: 'Punjab Agro Foods Pvt Ltd',
    description: 'Chunks of unripe Sindhri mango stewed with jaggery and mustard.',
  },
  {
    sku: 'SKU-SAU-005',
    name: 'Pizza & Pasta Herb Sauce 450g Pouch',
    category: 'Sauces',
    unit: 'carton',
    shelfLifeDays: 270,
    unitCost: 2600,
    unitPrice: 3600,
    avgDailySales: 12,
    leadTimeDays: 10,
    safetyStock: 60,
    supplier: 'Punjab Agro Foods Pvt Ltd',
    description: 'Oregano and basil infused tomato base for quick pizzeria use.',
  },

  // 6. Snacks
  {
    sku: 'SKU-SNK-001',
    name: 'Multani Spicy Namkeen Mix 200g Pouch',
    category: 'Snacks',
    unit: 'carton',
    shelfLifeDays: 120,
    unitCost: 1900,
    unitPrice: 2700,
    avgDailySales: 34,
    leadTimeDays: 6,
    safetyStock: 160,
    supplier: 'Sadiqabad Oil & Food Mills',
    description: 'Chickpea flour sev, fried peanuts, lentils with chaat masala.',
  },
  {
    sku: 'SKU-SNK-002',
    name: 'Masala Potato Crinkles 60g Pack',
    category: 'Snacks',
    unit: 'carton',
    shelfLifeDays: 90,
    unitCost: 1700,
    unitPrice: 2400,
    avgDailySales: 40,
    leadTimeDays: 5,
    safetyStock: 180,
    supplier: 'Sadiqabad Oil & Food Mills',
    description: 'Thin crinkle-cut potato crisps tossed in spicy tandoori spice.',
  },
  {
    sku: 'SKU-SNK-003',
    name: 'Roasted Salted Peanuts 100g Vacuum Pack',
    category: 'Snacks',
    unit: 'carton',
    shelfLifeDays: 180,
    unitCost: 2500,
    unitPrice: 3500,
    avgDailySales: 15,
    leadTimeDays: 7,
    safetyStock: 80,
    supplier: 'Sadiqabad Oil & Food Mills',
    description: 'Chakwal origin roasted peanuts in inert gas sealed pouches.',
  },
  {
    sku: 'SKU-SNK-004',
    name: 'Crispy Dal Moong 150g Pouch',
    category: 'Snacks',
    unit: 'carton',
    shelfLifeDays: 150,
    unitCost: 2000,
    unitPrice: 2800,
    avgDailySales: 21,
    leadTimeDays: 7,
    safetyStock: 100,
    supplier: 'Sadiqabad Oil & Food Mills',
    description: 'Lightly salted and flash-fried yellow moong pulse.',
  },
  {
    sku: 'SKU-SNK-005',
    name: 'Cheesy Corn Puffs 75g Pack',
    category: 'Snacks',
    unit: 'carton',
    shelfLifeDays: 120,
    unitCost: 1800,
    unitPrice: 2500,
    avgDailySales: 22,
    leadTimeDays: 6,
    safetyStock: 110,
    supplier: 'Sadiqabad Oil & Food Mills',
    description: 'Extruded puffed corn coated in cheddar cheese powder.',
  },

  // 7. Ingredients
  {
    sku: 'SKU-ING-001',
    name: 'Refined White Cane Sugar 50kg Bag',
    category: 'Ingredients',
    unit: 'bag',
    shelfLifeDays: 730,
    unitCost: 7200,
    unitPrice: 7900,
    avgDailySales: 12,
    leadTimeDays: 10,
    safetyStock: 60,
    supplier: 'Thal Industries Sugar Mills',
    description: 'ICUMSA 45 pharma-grade refined sugar crystals for confection production.',
  },
  {
    sku: 'SKU-ING-002',
    name: 'High-Grade Wheat Maida Flour 50kg Bag',
    category: 'Ingredients',
    unit: 'bag',
    shelfLifeDays: 180,
    unitCost: 5100,
    unitPrice: 5700,
    avgDailySales: 16,
    leadTimeDays: 7,
    safetyStock: 80,
    supplier: 'Multan Flour & Agro Mills',
    description: 'Finely milled low-ash wheat flour with 11% gluten content.',
  },
  {
    sku: 'SKU-ING-003',
    name: 'RBD Palm Olein Oil 16kg Tin',
    category: 'Ingredients',
    unit: 'box',
    shelfLifeDays: 360,
    unitCost: 6800,
    unitPrice: 7500,
    avgDailySales: 10,
    leadTimeDays: 12,
    safetyStock: 50,
    supplier: 'Habib Oil Mills Karachi',
    description: 'Refined bleached deodorised edible cooking oil for deep frying.',
  },
  {
    sku: 'SKU-ING-004',
    name: 'Alkalized Dutch Cocoa Powder 25kg Bag',
    category: 'Ingredients',
    unit: 'bag',
    shelfLifeDays: 540,
    unitCost: 26000,
    unitPrice: 29500,
    avgDailySales: 3,
    leadTimeDays: 20,
    safetyStock: 25,
    supplier: 'Indus Valley Confections',
    description: 'Imported high-fat 10-12% alkalised dark cocoa powder.',
  },
  {
    sku: 'SKU-ING-005',
    name: 'Full Cream Whole Milk Powder 25kg Bag',
    category: 'Ingredients',
    unit: 'bag',
    shelfLifeDays: 360,
    unitCost: 22000,
    unitPrice: 25000,
    avgDailySales: 4,
    leadTimeDays: 15,
    safetyStock: 30,
    supplier: 'Engro Foods Pakistan',
    description: 'Spray-dried pasteurised dairy powder 26% butterfat content.',
  },
  {
    sku: 'SKU-ING-006',
    name: 'Food Grade Corn Starch 25kg Bag',
    category: 'Ingredients',
    unit: 'bag',
    shelfLifeDays: 730,
    unitCost: 4800,
    unitPrice: 5400,
    avgDailySales: 5,
    leadTimeDays: 10,
    safetyStock: 35,
    supplier: 'Rafhan Best Foods Faisalabad',
    description: 'Odourless high-viscosity thickener for sauces and puddings.',
  },

  // 8. Packaging
  {
    sku: 'SKU-PKG-001',
    name: 'BOPP Printed Biscuit Wrappers 25kg Roll',
    category: 'Packaging',
    unit: 'roll',
    shelfLifeDays: 1095,
    unitCost: 14500,
    unitPrice: 16000,
    avgDailySales: 2,
    leadTimeDays: 18,
    safetyStock: 20,
    supplier: 'Packages Ltd Lahore',
    description: 'Metallised biaxially-oriented polypropylene rotogravure printed rolls.',
  },
  {
    sku: 'SKU-PKG-002',
    name: '5-Ply Corrugated Master Cartons (Pack of 50)',
    category: 'Packaging',
    unit: 'pack',
    shelfLifeDays: 1460,
    unitCost: 6500,
    unitPrice: 7300,
    avgDailySales: 8,
    leadTimeDays: 10,
    safetyStock: 50,
    supplier: 'Packages Ltd Lahore',
    description: 'Heavy burst strength brown kraft corrugated boxes.',
  },
  {
    sku: 'SKU-PKG-003',
    name: 'PET Squeeze Bottles 800g w/ Flip Caps (Pack of 100)',
    category: 'Packaging',
    unit: 'pack',
    shelfLifeDays: 1460,
    unitCost: 4200,
    unitPrice: 4900,
    avgDailySales: 5,
    leadTimeDays: 14,
    safetyStock: 40,
    supplier: 'Indus Plastic Blowers Faisalabad',
    description: 'Transparent food-contact virgin PET preform blown bottles.',
  },
  {
    sku: 'SKU-PKG-004',
    name: 'Aluminium Foil Sauce Standup Pouches (Pack of 500)',
    category: 'Packaging',
    unit: 'pack',
    shelfLifeDays: 1095,
    unitCost: 7800,
    unitPrice: 8900,
    avgDailySales: 4,
    leadTimeDays: 14,
    safetyStock: 35,
    supplier: 'Packages Ltd Lahore',
    description: 'High-barrier retortable stand-up zipper pouches with tear notch.',
  },
];

// 15 Realistic Pakistani Customers across Retail, Wholesaler, Distributor, Export
export const SEED_CUSTOMERS: Customer[] = [
  {
    id: 'CUST-001',
    name: 'Metro Cash & Carry Pakistan',
    type: 'Retail chain',
    minRemainingShelfLifeDays: 60,
    city: 'Lahore & Multan Branches',
    contactPerson: 'Tariq Mehmood (Category Buyer)',
  },
  {
    id: 'CUST-002',
    name: 'Imtiaz Super Market',
    type: 'Retail chain',
    minRemainingShelfLifeDays: 60,
    city: 'Karachi, Lahore & Faisalabad',
    contactPerson: 'Khurram Shehzad (Procurement Lead)',
  },
  {
    id: 'CUST-003',
    name: 'Chase Up Shopping City',
    type: 'Retail chain',
    minRemainingShelfLifeDays: 60,
    city: 'Multan Bosan Road & Karachi',
    contactPerson: 'Farhan Akhtar (Operations)',
  },
  {
    id: 'CUST-004',
    name: 'Al-Fatah Department Store',
    type: 'Retail chain',
    minRemainingShelfLifeDays: 60,
    city: 'Lahore & Islamabad',
    contactPerson: 'Bilal Chaudhry (FMCG Head)',
  },
  {
    id: 'CUST-005',
    name: 'Jalal Sons Gourmet Grocery',
    type: 'Retail chain',
    minRemainingShelfLifeDays: 60,
    city: 'Lahore Main Boulevard',
    contactPerson: 'Usman Jalal (Director Sourcing)',
  },
  {
    id: 'CUST-006',
    name: 'Multan Ghalla Mandi Wholesalers',
    type: 'Wholesaler',
    minRemainingShelfLifeDays: 30,
    city: 'Multan Grain Market',
    contactPerson: 'Haji Abdul Sattar (Proprietor)',
  },
  {
    id: 'CUST-007',
    name: 'Faisalabad Grain & Dry Goods Co.',
    type: 'Wholesaler',
    minRemainingShelfLifeDays: 30,
    city: 'Faisalabad Rail Bazaar',
    contactPerson: 'Mian Rashid Iqbal',
  },
  {
    id: 'CUST-008',
    name: 'Lahore Akbari Mandi Spice & Confection Traders',
    type: 'Wholesaler',
    minRemainingShelfLifeDays: 30,
    city: 'Lahore Akbari Gate',
    contactPerson: 'Sheikh Noman Ahmed',
  },
  {
    id: 'CUST-009',
    name: 'Rawalpindi Ganj Mandi Bulk Supplies',
    type: 'Wholesaler',
    minRemainingShelfLifeDays: 30,
    city: 'Rawalpindi City',
    contactPerson: 'Malik Jahangir Khan',
  },
  {
    id: 'CUST-010',
    name: 'South Punjab Fast Distribution Network',
    type: 'Distributor',
    minRemainingShelfLifeDays: 45,
    city: 'Multan & Khanewal Hub',
    contactPerson: 'Chaudhry Waseem Abbas',
  },
  {
    id: 'CUST-011',
    name: 'Chenab Logistics & FMCG Distribution',
    type: 'Distributor',
    minRemainingShelfLifeDays: 45,
    city: 'Muzaffargarh & D.G. Khan',
    contactPerson: 'Syed Ali Raza Gardezi',
  },
  {
    id: 'CUST-012',
    name: 'Rohi FMCG Distributors Bahawalpur',
    type: 'Distributor',
    minRemainingShelfLifeDays: 45,
    city: 'Bahawalpur & Rahim Yar Khan',
    contactPerson: 'Majid Nawaz Tarar',
  },
  {
    id: 'CUST-013',
    name: 'Gulf Crescent Foods Dubai LLC',
    type: 'Export',
    minRemainingShelfLifeDays: 120,
    city: 'Dubai (Al Ras District), UAE',
    contactPerson: 'Ahmed Al-Mansoor',
  },
  {
    id: 'CUST-014',
    name: 'Khyber Afghan Transit Traders Peshawar',
    type: 'Export',
    minRemainingShelfLifeDays: 120,
    city: 'Peshawar & Torkham Border',
    contactPerson: 'Gulbaz Khan Afridi',
  },
  {
    id: 'CUST-015',
    name: 'UK Desi Bazaar Imports Ltd',
    type: 'Export',
    minRemainingShelfLifeDays: 120,
    city: 'Birmingham & London, UK',
    contactPerson: 'Zeeshan Qureshi',
  },
];

// Helper to format date offset from BASE_TODAY ('2026-11-15')
function offsetDate(baseDateStr: string, dayOffset: number): string {
  const d = new Date(baseDateStr);
  d.setDate(d.getDate() + dayOffset);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Generate 120+ batches matching the deliberate distribution:
 * ~8 already expired (<0 days)
 * ~12 expiring within 7 days
 * ~15 within 8–30 days
 * ~15 within 31–60 days
 * ~10 on quality Hold
 * ~3 Rejected
 * ~10 slow movers (days-of-cover > remaining shelf life)
 * Healthy batches (>60 days)
 *
 * CRITICAL TEST REQUIREMENT: At least 5 products must have two or more eligible batches
 * with different expiry dates, so FEFO has clear allocation demonstrations!
 */
export function generateSeedBatches(): Batch[] {
  const batches: Batch[] = [];

  // Group 1: Demonstrable FEFO test products (At least 5 SKUs with multiple eligible Released batches)
  // 1. SKU-BIS-001 (Sooper Classic Egg & Milk Biscuits) - 3 batches
  batches.push({
    batchNo: 'B-SOOP-2601',
    sku: 'SKU-BIS-001',
    qty: 60,
    location: 'WH1-A-01',
    mfgDate: offsetDate(BASE_TODAY, -110),
    expiryDate: offsetDate(BASE_TODAY, 70), // 70 days left (Eligible for Retail & Wholesaler & Distributor)
    receivedDate: offsetDate(BASE_TODAY, -108),
    qualityStatus: 'Released',
    note: 'First production run batch',
  });
  batches.push({
    batchNo: 'B-SOOP-2602',
    sku: 'SKU-BIS-001',
    qty: 90,
    location: 'WH1-A-02',
    mfgDate: offsetDate(BASE_TODAY, -80),
    expiryDate: offsetDate(BASE_TODAY, 100), // 100 days left
    receivedDate: offsetDate(BASE_TODAY, -78),
    qualityStatus: 'Released',
    note: 'Second production run batch',
  });
  batches.push({
    batchNo: 'B-SOOP-2603',
    sku: 'SKU-BIS-001',
    qty: 120,
    location: 'WH1-A-03',
    mfgDate: offsetDate(BASE_TODAY, -40),
    expiryDate: offsetDate(BASE_TODAY, 140), // 140 days left (Eligible for Export too)
    receivedDate: offsetDate(BASE_TODAY, -38),
    qualityStatus: 'Released',
    note: 'Recent fresh stock run',
  });

  // 2. SKU-WAF-001 (Cocomo Choco Filled Bites) - 3 batches
  batches.push({
    batchNo: 'B-COCO-2601',
    sku: 'SKU-WAF-001',
    qty: 80,
    location: 'WH1-B-04',
    mfgDate: offsetDate(BASE_TODAY, -170),
    expiryDate: offsetDate(BASE_TODAY, 70), // 70 days left
    receivedDate: offsetDate(BASE_TODAY, -168),
    qualityStatus: 'Released',
    note: 'Eligible for local retail',
  });
  batches.push({
    batchNo: 'B-COCO-2602',
    sku: 'SKU-WAF-001',
    qty: 110,
    location: 'WH1-B-05',
    mfgDate: offsetDate(BASE_TODAY, -130),
    expiryDate: offsetDate(BASE_TODAY, 110), // 110 days left
    receivedDate: offsetDate(BASE_TODAY, -128),
    qualityStatus: 'Released',
    note: 'Mid-term expiry stock',
  });
  batches.push({
    batchNo: 'B-COCO-2603',
    sku: 'SKU-WAF-001',
    qty: 150,
    location: 'WH1-B-06',
    mfgDate: offsetDate(BASE_TODAY, -60),
    expiryDate: offsetDate(BASE_TODAY, 180), // 180 days left
    receivedDate: offsetDate(BASE_TODAY, -58),
    qualityStatus: 'Released',
    note: 'Fresh export grade stock',
  });

  // 3. SKU-PAS-001 (Kolson Durum Wheat Elbow Macaroni) - 2 batches
  batches.push({
    batchNo: 'B-MAC-2601',
    sku: 'SKU-PAS-001',
    qty: 75,
    location: 'WH1-C-02',
    mfgDate: offsetDate(BASE_TODAY, -200),
    expiryDate: offsetDate(BASE_TODAY, 80), // 80 days left
    receivedDate: offsetDate(BASE_TODAY, -198),
    qualityStatus: 'Released',
  });
  batches.push({
    batchNo: 'B-MAC-2602',
    sku: 'SKU-PAS-001',
    qty: 130,
    location: 'WH1-C-03',
    mfgDate: offsetDate(BASE_TODAY, -100),
    expiryDate: offsetDate(BASE_TODAY, 180), // 180 days left
    receivedDate: offsetDate(BASE_TODAY, -98),
    qualityStatus: 'Released',
  });

  // 4. SKU-SAU-001 (Zesty Multan Tomato Ketchup) - 3 batches
  batches.push({
    batchNo: 'B-KETC-2601',
    sku: 'SKU-SAU-001',
    qty: 65,
    location: 'WH2-A-01',
    mfgDate: offsetDate(BASE_TODAY, -120),
    expiryDate: offsetDate(BASE_TODAY, 75), // 75 days left
    receivedDate: offsetDate(BASE_TODAY, -118),
    qualityStatus: 'Released',
  });
  batches.push({
    batchNo: 'B-KETC-2602',
    sku: 'SKU-SAU-001',
    qty: 90,
    location: 'WH2-A-02',
    mfgDate: offsetDate(BASE_TODAY, -80),
    expiryDate: offsetDate(BASE_TODAY, 115), // 115 days left
    receivedDate: offsetDate(BASE_TODAY, -78),
    qualityStatus: 'Released',
  });
  batches.push({
    batchNo: 'B-KETC-2603',
    sku: 'SKU-SAU-001',
    qty: 140,
    location: 'WH2-A-03',
    mfgDate: offsetDate(BASE_TODAY, -30),
    expiryDate: offsetDate(BASE_TODAY, 165), // 165 days left
    receivedDate: offsetDate(BASE_TODAY, -28),
    qualityStatus: 'Released',
  });

  // 5. SKU-SNK-001 (Multani Spicy Namkeen Mix) - 2 batches
  batches.push({
    batchNo: 'B-NAMK-2601',
    sku: 'SKU-SNK-001',
    qty: 85,
    location: 'WH2-B-07',
    mfgDate: offsetDate(BASE_TODAY, -50),
    expiryDate: offsetDate(BASE_TODAY, 70), // 70 days left
    receivedDate: offsetDate(BASE_TODAY, -48),
    qualityStatus: 'Released',
  });
  batches.push({
    batchNo: 'B-NAMK-2602',
    sku: 'SKU-SNK-001',
    qty: 120,
    location: 'WH2-B-08',
    mfgDate: offsetDate(BASE_TODAY, -20),
    expiryDate: offsetDate(BASE_TODAY, 100), // 100 days left
    receivedDate: offsetDate(BASE_TODAY, -18),
    qualityStatus: 'Released',
  });

  // Group 2: ~8 Already Expired Batches (<0 days left)
  const expiredSkus = [
    { sku: 'SKU-BIS-004', days: -18, qty: 35, loc: 'WH1-A-12', note: 'Expired during storage' },
    { sku: 'SKU-BIS-005', days: -10, qty: 25, loc: 'WH1-A-14', note: 'Unsold festive shortbread' },
    { sku: 'SKU-WAF-004', days: -5, qty: 30, loc: 'WH1-B-11', note: 'Passed 180d limit' },
    { sku: 'SKU-CNF-004', days: -22, qty: 40, loc: 'WH1-D-09', note: 'Old stock in back aisle' },
    { sku: 'SKU-PAS-005', days: -4, qty: 18, loc: 'WH1-C-15', note: 'Tri-color promo stock' },
    { sku: 'SKU-SAU-003', days: -12, qty: 45, loc: 'WH2-A-14', note: 'Excess fiery sauce run' },
    { sku: 'SKU-SNK-002', days: -8, qty: 50, loc: 'WH2-B-12', note: 'Crinkles past 90d freshness' },
    { sku: 'SKU-ING-002', days: -15, qty: 20, loc: 'WH3-A-04', note: 'Weevil check failed, expired' },
  ];
  expiredSkus.forEach((item, idx) => {
    batches.push({
      batchNo: `B-EXP-90${idx + 1}`,
      sku: item.sku,
      qty: item.qty,
      location: item.loc,
      mfgDate: offsetDate(BASE_TODAY, item.days - 180),
      expiryDate: offsetDate(BASE_TODAY, item.days),
      receivedDate: offsetDate(BASE_TODAY, item.days - 175),
      qualityStatus: 'Released', // Was released before expiring
      note: item.note,
    });
  });

  // Group 3: ~12 Expiring within 1 to 7 days (Critical alert zone)
  const criticalItems = [
    { sku: 'SKU-BIS-002', days: 2, qty: 42, loc: 'WH1-A-07' },
    { sku: 'SKU-BIS-003', days: 4, qty: 38, loc: 'WH1-A-09' },
    { sku: 'SKU-BIS-006', days: 6, qty: 50, loc: 'WH1-A-16' },
    { sku: 'SKU-WAF-002', days: 3, qty: 28, loc: 'WH1-B-08' },
    { sku: 'SKU-WAF-003', days: 5, qty: 35, loc: 'WH1-B-10' },
    { sku: 'SKU-CNF-002', days: 1, qty: 40, loc: 'WH1-D-04' },
    { sku: 'SKU-CNF-005', days: 7, qty: 60, loc: 'WH1-D-12' },
    { sku: 'SKU-PAS-002', days: 3, qty: 55, loc: 'WH1-C-06' },
    { sku: 'SKU-PAS-003', days: 6, qty: 48, loc: 'WH1-C-09' },
    { sku: 'SKU-SAU-002', days: 4, qty: 70, loc: 'WH2-A-07' },
    { sku: 'SKU-SNK-003', days: 2, qty: 32, loc: 'WH2-B-14' },
    { sku: 'SKU-SNK-005', days: 5, qty: 46, loc: 'WH2-B-16' },
  ];
  criticalItems.forEach((item, idx) => {
    batches.push({
      batchNo: `B-CRIT-80${idx + 1}`,
      sku: item.sku,
      qty: item.qty,
      location: item.loc,
      mfgDate: offsetDate(BASE_TODAY, item.days - 180),
      expiryDate: offsetDate(BASE_TODAY, item.days),
      receivedDate: offsetDate(BASE_TODAY, item.days - 170),
      qualityStatus: 'Released',
      note: 'Critical remaining shelf-life: urgent clearance recommended',
    });
  });

  // Group 4: ~15 Expiring within 8 to 30 days (High / Warning zone)
  const warningItems = [
    { sku: 'SKU-BIS-001', days: 12, qty: 40, loc: 'WH1-A-05' },
    { sku: 'SKU-BIS-002', days: 18, qty: 55, loc: 'WH1-A-08' },
    { sku: 'SKU-BIS-003', days: 22, qty: 45, loc: 'WH1-A-10' },
    { sku: 'SKU-BIS-005', days: 26, qty: 30, loc: 'WH1-A-15' },
    { sku: 'SKU-WAF-001', days: 15, qty: 65, loc: 'WH1-B-03' },
    { sku: 'SKU-WAF-002', days: 25, qty: 42, loc: 'WH1-B-09' },
    { sku: 'SKU-CNF-001', days: 20, qty: 50, loc: 'WH1-D-02' },
    { sku: 'SKU-CNF-003', days: 28, qty: 36, loc: 'WH1-D-07' },
    { sku: 'SKU-PAS-001', days: 14, qty: 48, loc: 'WH1-C-01' },
    { sku: 'SKU-PAS-004', days: 24, qty: 52, loc: 'WH1-C-11' },
    { sku: 'SKU-SAU-001', days: 16, qty: 60, loc: 'WH2-A-04' },
    { sku: 'SKU-SAU-004', days: 29, qty: 35, loc: 'WH2-A-16' },
    { sku: 'SKU-SNK-001', days: 10, qty: 70, loc: 'WH2-B-05' },
    { sku: 'SKU-SNK-002', days: 21, qty: 65, loc: 'WH2-B-10' },
    { sku: 'SKU-SNK-004', days: 27, qty: 40, loc: 'WH2-B-15' },
  ];
  warningItems.forEach((item, idx) => {
    batches.push({
      batchNo: `B-WARN-70${idx + 1}`,
      sku: item.sku,
      qty: item.qty,
      location: item.loc,
      mfgDate: offsetDate(BASE_TODAY, item.days - 180),
      expiryDate: offsetDate(BASE_TODAY, item.days),
      receivedDate: offsetDate(BASE_TODAY, item.days - 170),
      qualityStatus: 'Released',
      note: 'Approaching expiry threshold: below retail 60d requirement',
    });
  });

  // Group 5: ~15 Expiring within 31 to 60 days (Amber zone - below Retail 60d minimum)
  const amberItems = [
    { sku: 'SKU-BIS-002', days: 35, qty: 60, loc: 'WH1-A-11' },
    { sku: 'SKU-BIS-004', days: 42, qty: 48, loc: 'WH1-A-13' },
    { sku: 'SKU-BIS-006', days: 50, qty: 65, loc: 'WH1-A-17' },
    { sku: 'SKU-WAF-003', days: 38, qty: 44, loc: 'WH1-B-12' },
    { sku: 'SKU-WAF-004', days: 48, qty: 38, loc: 'WH1-B-14' },
    { sku: 'SKU-CNF-001', days: 55, qty: 70, loc: 'WH1-D-03' },
    { sku: 'SKU-CNF-002', days: 36, qty: 42, loc: 'WH1-D-05' },
    { sku: 'SKU-CNF-004', days: 58, qty: 30, loc: 'WH1-D-10' },
    { sku: 'SKU-PAS-002', days: 45, qty: 80, loc: 'WH1-C-07' },
    { sku: 'SKU-PAS-003', days: 52, qty: 60, loc: 'WH1-C-10' },
    { sku: 'SKU-SAU-002', days: 40, qty: 90, loc: 'WH2-A-08' },
    { sku: 'SKU-SAU-005', days: 56, qty: 45, loc: 'WH2-A-18' },
    { sku: 'SKU-SNK-001', days: 34, qty: 75, loc: 'WH2-B-06' },
    { sku: 'SKU-SNK-003', days: 46, qty: 50, loc: 'WH2-B-13' },
    { sku: 'SKU-SNK-005', days: 59, qty: 55, loc: 'WH2-B-17' },
  ];
  amberItems.forEach((item, idx) => {
    batches.push({
      batchNo: `B-AMBR-60${idx + 1}`,
      sku: item.sku,
      qty: item.qty,
      location: item.loc,
      mfgDate: offsetDate(BASE_TODAY, item.days - 180),
      expiryDate: offsetDate(BASE_TODAY, item.days),
      receivedDate: offsetDate(BASE_TODAY, item.days - 170),
      qualityStatus: 'Released',
      note: 'Valid for wholesalers (30d) and distributors (45d), but excluded for Tier-1 retail (60d)',
    });
  });

  // Group 6: ~10 on Quality Hold
  const holdItems = [
    { sku: 'SKU-BIS-001', days: 120, qty: 40, loc: 'WH1-A-04', note: 'Packaging seal integrity test pending' },
    { sku: 'SKU-WAF-001', days: 150, qty: 50, loc: 'WH1-B-07', note: 'Moisture content re-assay in lab' },
    { sku: 'SKU-CNF-003', days: 180, qty: 35, loc: 'WH1-D-08', note: 'Caramel cooking temperature validation' },
    { sku: 'SKU-PAS-001', days: 300, qty: 60, loc: 'WH1-C-04', note: 'Extruder pressure deviation investigation' },
    { sku: 'SKU-SAU-001', days: 240, qty: 45, loc: 'WH2-A-05', note: 'Acidity titration outside target specification' },
    { sku: 'SKU-SAU-002', days: 200, qty: 55, loc: 'WH2-A-09', note: 'Viscosity re-test requested by QA officer' },
    { sku: 'SKU-SNK-002', days: 80, qty: 30, loc: 'WH2-B-11', note: 'Oil rancidity verification in incubator' },
    { sku: 'SKU-ING-001', days: 400, qty: 25, loc: 'WH3-A-02', note: 'Certificate of Analysis pending from Thal Sugar' },
    { sku: 'SKU-ING-004', days: 300, qty: 15, loc: 'WH3-A-08', note: 'Import documentation customs clearance hold' },
    { sku: 'SKU-PKG-001', days: 600, qty: 10, loc: 'WH3-B-03', note: 'Color registration smudge check on roll' },
  ];
  holdItems.forEach((item, idx) => {
    batches.push({
      batchNo: `B-HOLD-50${idx + 1}`,
      sku: item.sku,
      qty: item.qty,
      location: item.loc,
      mfgDate: offsetDate(BASE_TODAY, -30),
      expiryDate: offsetDate(BASE_TODAY, item.days),
      receivedDate: offsetDate(BASE_TODAY, -28),
      qualityStatus: 'Hold',
      note: item.note,
      statusChangeHistory: [
        {
          date: offsetDate(BASE_TODAY, -2),
          from: 'Released',
          to: 'Hold',
          reason: item.note,
          changedBy: 'Quality Inspector (Amna Farooq)',
        },
      ],
    });
  });

  // Group 7: ~3 Rejected Batches
  const rejectedItems = [
    { sku: 'SKU-BIS-003', days: 90, qty: 25, loc: 'WH1-A-18', note: 'Burnt batch detected during oven discharge' },
    { sku: 'SKU-SAU-004', days: 120, qty: 20, loc: 'WH2-A-17', note: 'Bacterial count exceeded microbiological limit' },
    { sku: 'SKU-PKG-003', days: 500, qty: 15, loc: 'WH3-B-07', note: 'Cap thread mismatch causing leaks' },
  ];
  rejectedItems.forEach((item, idx) => {
    batches.push({
      batchNo: `B-REJ-40${idx + 1}`,
      sku: item.sku,
      qty: item.qty,
      location: item.loc,
      mfgDate: offsetDate(BASE_TODAY, -40),
      expiryDate: offsetDate(BASE_TODAY, item.days),
      receivedDate: offsetDate(BASE_TODAY, -38),
      qualityStatus: 'Rejected',
      note: item.note,
      statusChangeHistory: [
        {
          date: offsetDate(BASE_TODAY, -5),
          from: 'Hold',
          to: 'Rejected',
          reason: item.note,
          changedBy: 'QA Manager (Dr. Asad Malik)',
        },
      ],
    });
  });

  // Group 8: ~10 Slow Movers whose days-of-cover exceeds remaining shelf life
  // High stock on hand, very low avg daily sales, relatively short remaining shelf life
  const slowMovers = [
    { sku: 'SKU-CNF-004', days: 95, qty: 120, loc: 'WH1-D-11', note: 'Rose drops slow velocity (8/day sales vs 120+ stock)' },
    { sku: 'SKU-PAS-005', days: 110, qty: 180, loc: 'WH1-C-16', note: 'Tricolore pasta niche demand (10/day vs 180 stock)' },
    { sku: 'SKU-SAU-004', days: 100, qty: 160, loc: 'WH2-A-19', note: 'Mango chutney off-season accumulation' },
    { sku: 'SKU-SAU-005', days: 85, qty: 140, loc: 'WH2-A-20', note: 'Pizza sauce slower uptake outside metros' },
    { sku: 'SKU-BIS-005', days: 80, qty: 150, loc: 'WH1-A-19', note: 'Nankhatai stock excessive post-festival' },
    { sku: 'SKU-WAF-004', days: 90, qty: 140, loc: 'WH1-B-15', note: 'Jubilee hazelnut slow retail turnover' },
    { sku: 'SKU-SNK-003', days: 75, qty: 160, loc: 'WH2-B-18', note: 'Peanuts vacuum pack facing high price resistance' },
    { sku: 'SKU-ING-004', days: 130, qty: 35, loc: 'WH3-A-09', note: 'Cocoa bags consumption 3/day vs 35 stock' },
    { sku: 'SKU-ING-006', days: 140, qty: 65, loc: 'WH3-A-12', note: 'Starch consumption 5/day vs 65 stock' },
    { sku: 'SKU-PKG-004', days: 120, qty: 45, loc: 'WH3-B-09', note: 'Foil pouch surplus before design update' },
  ];
  slowMovers.forEach((item, idx) => {
    batches.push({
      batchNo: `B-SLOW-30${idx + 1}`,
      sku: item.sku,
      qty: item.qty,
      location: item.loc,
      mfgDate: offsetDate(BASE_TODAY, -60),
      expiryDate: offsetDate(BASE_TODAY, item.days),
      receivedDate: offsetDate(BASE_TODAY, -55),
      qualityStatus: 'Released',
      note: item.note,
    });
  });

  // Group 9: Healthy Released Batches across remaining SKUs (>60 days, up to 180-500 days)
  SEED_PRODUCTS.forEach((prod, pIdx) => {
    // Add 1 or 2 healthy batches for each product
    const qty1 = rng.range(40, 160);
    const days1 = rng.range(90, Math.min(prod.shelfLifeDays, 365));
    batches.push({
      batchNo: `B-HLTH-${String(pIdx + 1).padStart(2, '0')}A`,
      sku: prod.sku,
      qty: qty1,
      location: `WH${(pIdx % 3) + 1}-${String.fromCharCode(65 + (pIdx % 4))}-${String((pIdx % 20) + 1).padStart(2, '0')}`,
      mfgDate: offsetDate(BASE_TODAY, -30),
      expiryDate: offsetDate(BASE_TODAY, days1),
      receivedDate: offsetDate(BASE_TODAY, -25),
      qualityStatus: 'Released',
      note: 'Normal regular inventory',
    });

    if (pIdx % 3 === 0) {
      const qty2 = rng.range(60, 200);
      const days2 = rng.range(days1 + 30, Math.min(prod.shelfLifeDays + 60, 450));
      batches.push({
        batchNo: `B-HLTH-${String(pIdx + 1).padStart(2, '0')}B`,
        sku: prod.sku,
        qty: qty2,
        location: `WH${((pIdx + 1) % 3) + 1}-${String.fromCharCode(65 + ((pIdx + 1) % 4))}-${String(((pIdx + 2) % 20) + 1).padStart(2, '0')}`,
        mfgDate: offsetDate(BASE_TODAY, -10),
        expiryDate: offsetDate(BASE_TODAY, days2),
        receivedDate: offsetDate(BASE_TODAY, -8),
        qualityStatus: 'Released',
        note: 'Fresh replenishment inventory',
      });
    }
  });

  return batches;
}

/**
 * 12 months synthetic monthly sales history per finished product with seasonality:
 * Ramadan / Eid spike (March-April & June), summer dip for chocolates/wafers (July-August),
 * winter surge for soups/pasta/namkeen (Nov-Jan).
 */
export function generateSalesHistory(): ProductSalesHistory[] {
  const months = [
    'Dec 2025',
    'Jan 2026',
    'Feb 2026',
    'Mar 2026 (Ramadan)',
    'Apr 2026 (Eid-ul-Fitr)',
    'May 2026',
    'Jun 2026 (Eid-ul-Adha)',
    'Jul 2026 (Summer)',
    'Aug 2026 (Summer)',
    'Sep 2026',
    'Oct 2026',
    'Nov 2026',
  ];

  return SEED_PRODUCTS.map((prod) => {
    const baseMonthly = prod.avgDailySales * 30;
    const history = months.map((month, idx) => {
      let seasonalFactor = 1.0;
      // Ramadan/Eid peak in Mar, Apr, Jun
      if (idx === 3 || idx === 4) {
        seasonalFactor = prod.category === 'Biscuits' || prod.category === 'Confectionery' || prod.category === 'Sauces' ? 1.45 : 1.15;
      } else if (idx === 6) {
        seasonalFactor = 1.35;
      } else if (idx === 7 || idx === 8) {
        // Summer heat dip for chocolate/cream
        seasonalFactor = prod.category === 'Confectionery' || prod.category === 'Wafers' ? 0.72 : 0.92;
      } else if (idx === 0 || idx === 1 || idx === 11) {
        // Winter boost for namkeen/pasta/tea biscuits
        seasonalFactor = prod.category === 'Snacks' || prod.category === 'Pasta' || prod.category === 'Biscuits' ? 1.25 : 1.05;
      }

      // Small deterministic variance
      const variance = 0.92 + ((prod.sku.charCodeAt(7) + idx * 7) % 17) / 100;
      const sales = Math.round(baseMonthly * seasonalFactor * variance);
      return { month, sales };
    });

    return { sku: prod.sku, history };
  });
}

/**
 * 20 Historical Dispatched/Pending Orders
 */
export function generateSeedOrders(): Order[] {
  const orders: Order[] = [];
  const dates = [
    offsetDate(BASE_TODAY, -35),
    offsetDate(BASE_TODAY, -30),
    offsetDate(BASE_TODAY, -28),
    offsetDate(BASE_TODAY, -25),
    offsetDate(BASE_TODAY, -22),
    offsetDate(BASE_TODAY, -20),
    offsetDate(BASE_TODAY, -18),
    offsetDate(BASE_TODAY, -15),
    offsetDate(BASE_TODAY, -12),
    offsetDate(BASE_TODAY, -10),
    offsetDate(BASE_TODAY, -8),
    offsetDate(BASE_TODAY, -6),
    offsetDate(BASE_TODAY, -5),
    offsetDate(BASE_TODAY, -4),
    offsetDate(BASE_TODAY, -3),
    offsetDate(BASE_TODAY, -2),
    offsetDate(BASE_TODAY, -1),
    offsetDate(BASE_TODAY, 0),
    offsetDate(BASE_TODAY, 0),
    offsetDate(BASE_TODAY, 0),
  ];

  for (let i = 0; i < 20; i++) {
    const cust = SEED_CUSTOMERS[i % SEED_CUSTOMERS.length];
    const isRecent = i >= 17;
    const status = isRecent ? 'Pending' : 'Dispatched';
    const sku1 = SEED_PRODUCTS[i % 12].sku;
    const sku2 = SEED_PRODUCTS[(i + 4) % 12].sku;

    orders.push({
      id: `ORD-2026-${String(i + 101).padStart(4, '0')}`,
      orderNo: `SO-MLT-${String(i + 101).padStart(4, '0')}`,
      customerId: cust.id,
      date: dates[i],
      status,
      totalQty: 90 + i * 5,
      totalValue: (90 + i * 5) * 2500,
      dispatchedAt: status === 'Dispatched' ? dates[i] : undefined,
      dispatchedBy: status === 'Dispatched' ? 'Warehouse Supervisor (Rashid Minhas)' : undefined,
      lines: [
        {
          id: `LINE-${i}-1`,
          sku: sku1,
          requestedQty: 50 + (i % 20),
          status: 'Fulfilled',
          shortfall: 0,
          allocatedBatches: [
            {
              batchNo: `B-HIST-${i}A`,
              qty: 50 + (i % 20),
              location: 'WH1-A-02',
              mfgDate: offsetDate(dates[i], -90),
              expiryDate: offsetDate(dates[i], 120),
              daysLeft: 120,
              reason: 'Selected by FEFO rule: earliest expiry meeting customer shelf-life constraint',
            },
          ],
          excludedBatches: [],
        },
        {
          id: `LINE-${i}-2`,
          sku: sku2,
          requestedQty: 40 + (i % 15),
          status: 'Fulfilled',
          shortfall: 0,
          allocatedBatches: [
            {
              batchNo: `B-HIST-${i}B`,
              qty: 40 + (i % 15),
              location: 'WH2-A-03',
              mfgDate: offsetDate(dates[i], -60),
              expiryDate: offsetDate(dates[i], 150),
              daysLeft: 150,
              reason: 'Selected by FEFO rule: earliest valid released batch',
            },
          ],
          excludedBatches: [],
        },
      ],
    });
  }

  return orders;
}

/**
 * 10 Historical Write-Off Records
 */
export const SEED_WRITE_OFFS: WriteOff[] = [
  {
    id: 'WO-2026-001',
    date: offsetDate(BASE_TODAY, -45),
    batchNo: 'B-OLD-901',
    sku: 'SKU-BIS-004',
    qty: 40,
    unitCost: 1650,
    value: 66000,
    reason: 'Expired',
    approvedBy: 'Plant Manager (M. Qureshi)',
    notes: 'Exceeded remaining shelf life after cancellation of export consignment to Kabul.',
  },
  {
    id: 'WO-2026-002',
    date: offsetDate(BASE_TODAY, -38),
    batchNo: 'B-DMG-102',
    sku: 'SKU-SAU-001',
    qty: 25,
    unitCost: 3100,
    value: 77500,
    reason: 'Damaged',
    approvedBy: 'Warehouse Manager (Rashid Minhas)',
    notes: 'Forklift mast punctured pallet lower tier in aisle WH2-A.',
  },
  {
    id: 'WO-2026-003',
    date: offsetDate(BASE_TODAY, -32),
    batchNo: 'B-REJ-203',
    sku: 'SKU-BIS-003',
    qty: 30,
    unitCost: 2250,
    value: 67500,
    reason: 'Quality rejection',
    approvedBy: 'QA Manager (Dr. Asad Malik)',
    notes: 'Oven temperature calibration failure led to burnt crust smell.',
  },
  {
    id: 'WO-2026-004',
    date: offsetDate(BASE_TODAY, -28),
    batchNo: 'B-RET-304',
    sku: 'SKU-SNK-001',
    qty: 20,
    unitCost: 1900,
    value: 38000,
    reason: 'Returned unsaleable',
    approvedBy: 'Sales Operations (Kashif Javed)',
    notes: 'Rain water leak during regional delivery transit to Muzaffargarh distributor.',
  },
  {
    id: 'WO-2026-005',
    date: offsetDate(BASE_TODAY, -21),
    batchNo: 'B-OLD-905',
    sku: 'SKU-WAF-004',
    qty: 35,
    unitCost: 3100,
    value: 108500,
    reason: 'Expired',
    approvedBy: 'Plant Manager (M. Qureshi)',
    notes: 'Hazelnut wafer passed 180-day shelf life during monsoon demand slow down.',
  },
  {
    id: 'WO-2026-006',
    date: offsetDate(BASE_TODAY, -18),
    batchNo: 'B-REJ-206',
    sku: 'SKU-SAU-004',
    qty: 22,
    unitCost: 3200,
    value: 70400,
    reason: 'Quality rejection',
    approvedBy: 'QA Manager (Dr. Asad Malik)',
    notes: 'PH meter drift caused sauce batch to exceed maximum permissible acidity.',
  },
  {
    id: 'WO-2026-007',
    date: offsetDate(BASE_TODAY, -14),
    batchNo: 'B-DMG-107',
    sku: 'SKU-ING-001',
    qty: 8,
    unitCost: 7200,
    value: 57600,
    reason: 'Damaged',
    approvedBy: 'Warehouse Manager (Rashid Minhas)',
    notes: 'Torn sugar bags during warehouse restacking operations.',
  },
  {
    id: 'WO-2026-008',
    date: offsetDate(BASE_TODAY, -10),
    batchNo: 'B-OLD-908',
    sku: 'SKU-SNK-002',
    qty: 45,
    unitCost: 1700,
    value: 76500,
    reason: 'Expired',
    approvedBy: 'Plant Manager (M. Qureshi)',
    notes: 'Crinkles batch expired on floor awaiting customer pickup.',
  },
  {
    id: 'WO-2026-009',
    date: offsetDate(BASE_TODAY, -6),
    batchNo: 'B-REJ-209',
    sku: 'SKU-PKG-003',
    qty: 12,
    unitCost: 4200,
    value: 50400,
    reason: 'Quality rejection',
    approvedBy: 'QA Officer (Amna Farooq)',
    notes: 'Defective neck threads on PET squeeze bottles causing filling line jams.',
  },
  {
    id: 'WO-2026-010',
    date: offsetDate(BASE_TODAY, -2),
    batchNo: 'B-RET-310',
    sku: 'SKU-CNF-004',
    qty: 18,
    unitCost: 2200,
    value: 39600,
    reason: 'Returned unsaleable',
    approvedBy: 'Finance Controller (Sajjad Haider)',
    notes: 'Retailer return: melted sweets due to uncooled display unit at distributor warehouse.',
  },
];

// 6 Purchase Requests in various workflow states
export const SEED_PURCHASE_REQUESTS: PurchaseRequest[] = [
  {
    id: 'PR-2026-001',
    prNumber: 'PR-MLT-801',
    sku: 'SKU-ING-001', // Sugar 50kg
    requestedQty: 100,
    estimatedCost: 720000,
    status: 'Pending approval',
    requestedBy: 'Production Planner (Zahid Qureshi)',
    date: offsetDate(BASE_TODAY, -1),
    calculationBreakdown: {
      avgDailySales: 12,
      leadTimeDays: 10,
      safetyStock: 60,
      leadTimeDemand: 120,
      grossRequirement: 180,
      usableStockConsumedBeforeExpiry: 80,
      usableStockExpiringBeforeUse: 0,
      openPOQty: 0,
      netSuggestedOrderQty: 100,
    },
  },
  {
    id: 'PR-2026-002',
    prNumber: 'PR-MLT-802',
    sku: 'SKU-ING-002', // Wheat Flour 50kg
    requestedQty: 120,
    estimatedCost: 612000,
    status: 'Approved',
    requestedBy: 'Production Planner (Zahid Qureshi)',
    date: offsetDate(BASE_TODAY, -5),
    approver: 'Finance Controller (Sajjad Haider)',
    approverComment: 'Approved as per seasonal flour price lock agreement.',
    approvedDate: offsetDate(BASE_TODAY, -4),
    simulatedPO: 'PO-2026-0941',
    calculationBreakdown: {
      avgDailySales: 16,
      leadTimeDays: 7,
      safetyStock: 80,
      leadTimeDemand: 112,
      grossRequirement: 192,
      usableStockConsumedBeforeExpiry: 72,
      usableStockExpiringBeforeUse: 0,
      openPOQty: 0,
      netSuggestedOrderQty: 120,
    },
  },
  {
    id: 'PR-2026-003',
    prNumber: 'PR-MLT-803',
    sku: 'SKU-ING-003', // Palm Oil 16kg Tin
    requestedQty: 150,
    estimatedCost: 1020000,
    status: 'Pending approval',
    requestedBy: 'Procurement Officer (Nabeel Tariq)',
    date: offsetDate(BASE_TODAY, 0),
    calculationBreakdown: {
      avgDailySales: 10,
      leadTimeDays: 12,
      safetyStock: 50,
      leadTimeDemand: 120,
      grossRequirement: 170,
      usableStockConsumedBeforeExpiry: 20,
      usableStockExpiringBeforeUse: 0,
      openPOQty: 0,
      netSuggestedOrderQty: 150,
    },
  },
  {
    id: 'PR-2026-004',
    prNumber: 'PR-MLT-804',
    sku: 'SKU-PKG-002', // 5-Ply Cartons
    requestedQty: 80,
    estimatedCost: 520000,
    status: 'Draft',
    requestedBy: 'Warehouse Supervisor (Rashid Minhas)',
    date: offsetDate(BASE_TODAY, 0),
    calculationBreakdown: {
      avgDailySales: 8,
      leadTimeDays: 10,
      safetyStock: 50,
      leadTimeDemand: 80,
      grossRequirement: 130,
      usableStockConsumedBeforeExpiry: 50,
      usableStockExpiringBeforeUse: 0,
      openPOQty: 0,
      netSuggestedOrderQty: 80,
    },
  },
  {
    id: 'PR-2026-005',
    prNumber: 'PR-MLT-805',
    sku: 'SKU-ING-004', // Cocoa Powder 25kg
    requestedQty: 40,
    estimatedCost: 1040000,
    status: 'Rejected',
    requestedBy: 'Production Planner (Zahid Qureshi)',
    date: offsetDate(BASE_TODAY, -8),
    approver: 'Plant Manager (M. Qureshi)',
    approverComment: 'Rejected: Cocoa inventory on hand is sufficient for next 45 days, re-evaluate after chocolate line maintenance.',
    approvedDate: offsetDate(BASE_TODAY, -7),
    calculationBreakdown: {
      avgDailySales: 3,
      leadTimeDays: 20,
      safetyStock: 25,
      leadTimeDemand: 60,
      grossRequirement: 85,
      usableStockConsumedBeforeExpiry: 45,
      usableStockExpiringBeforeUse: 0,
      openPOQty: 0,
      netSuggestedOrderQty: 40,
    },
  },
  {
    id: 'PR-2026-006',
    prNumber: 'PR-MLT-806',
    sku: 'SKU-PKG-001', // Biscuit Wrappers Roll
    requestedQty: 30,
    estimatedCost: 435000,
    status: 'Approved',
    requestedBy: 'Procurement Officer (Nabeel Tariq)',
    date: offsetDate(BASE_TODAY, -3),
    approver: 'Plant Manager (M. Qureshi)',
    approverComment: 'Approved for Sooper line continuous packaging run.',
    approvedDate: offsetDate(BASE_TODAY, -2),
    simulatedPO: 'PO-2026-0948',
    calculationBreakdown: {
      avgDailySales: 2,
      leadTimeDays: 18,
      safetyStock: 20,
      leadTimeDemand: 36,
      grossRequirement: 56,
      usableStockConsumedBeforeExpiry: 26,
      usableStockExpiringBeforeUse: 0,
      openPOQty: 0,
      netSuggestedOrderQty: 30,
    },
  },
];

// Supplier Quotations for Comparison Table (with best-value highlighting)
export const SEED_SUPPLIER_QUOTATIONS: SupplierQuotation[] = [
  // For Sugar (SKU-ING-001)
  {
    id: 'QUOT-SUG-01',
    sku: 'SKU-ING-001',
    supplier: 'Thal Industries Sugar Mills',
    city: 'Layyah / Multan Depot',
    pricePerUnit: 7200,
    leadTimeDays: 8,
    moq: 50,
    paymentTerms: 'Net 30 days',
    notes: 'Local regional mill with rail siding, lower freight cost.',
    isBestValue: true,
    bestValueReason: 'Lowest unit landed cost (PKR 7,200) and shortest lead time (8 days) with standard Net 30 credit.',
  },
  {
    id: 'QUOT-SUG-02',
    sku: 'SKU-ING-001',
    supplier: 'Jauharabad Sugar Mills Ltd',
    city: 'Khushab',
    pricePerUnit: 7350,
    leadTimeDays: 12,
    moq: 80,
    paymentTerms: 'Net 15 days',
    notes: 'Higher freight from northern Punjab.',
    isBestValue: false,
  },
  {
    id: 'QUOT-SUG-03',
    sku: 'SKU-ING-001',
    supplier: 'Chishtia Agro Commodities',
    city: 'Faisalabad',
    pricePerUnit: 7150,
    leadTimeDays: 15,
    moq: 150,
    paymentTerms: '100% Advance Payment',
    notes: 'Slightly cheaper base price but restrictive 150-bag MOQ and cash advance required.',
    isBestValue: false,
  },

  // For Wheat Flour (SKU-ING-002)
  {
    id: 'QUOT-FLR-01',
    sku: 'SKU-ING-002',
    supplier: 'Multan Flour & Agro Mills',
    city: 'Industrial Estate Multan',
    pricePerUnit: 5100,
    leadTimeDays: 5,
    moq: 60,
    paymentTerms: 'Net 30 days',
    notes: 'Adjacent to factory premises, zero inter-city transit delay.',
    isBestValue: true,
    bestValueReason: 'Optimal local supply: 5-day delivery, PKR 5,100 per bag with flexible offloading.',
  },
  {
    id: 'QUOT-FLR-02',
    sku: 'SKU-ING-002',
    supplier: 'Chenab Roller Flour Mills',
    city: 'Muzaffargarh',
    pricePerUnit: 5200,
    leadTimeDays: 7,
    moq: 100,
    paymentTerms: 'Net 21 days',
    notes: 'Requires chartered Bedford trucks.',
    isBestValue: false,
  },

  // For Palm Oil (SKU-ING-003)
  {
    id: 'QUOT-OIL-01',
    sku: 'SKU-ING-003',
    supplier: 'Habib Oil Mills Karachi',
    city: 'Port Qasim Terminal',
    pricePerUnit: 6800,
    leadTimeDays: 10,
    moq: 80,
    paymentTerms: 'Net 30 days',
    notes: 'Consistent peroxide value and smoke point.',
    isBestValue: true,
    bestValueReason: 'Prime certified edible grade at PKR 6,800/tin with reliable 10-day road transport from port.',
  },
  {
    id: 'QUOT-OIL-02',
    sku: 'SKU-ING-003',
    supplier: 'Dalda Foods Ltd',
    city: 'Karachi / Lahore Hub',
    pricePerUnit: 7100,
    leadTimeDays: 12,
    moq: 100,
    paymentTerms: 'Net 15 days',
    notes: 'Premium brand premium pricing.',
    isBestValue: false,
  },
];

// Default Alert Thresholds
export const DEFAULT_ALERT_THRESHOLDS: AlertThresholds = {
  criticalDays: 7,
  highDays: 14,
  warningDays: 30,
  infoDays: 60,
};

// Initial Category Overrides
export const DEFAULT_CATEGORY_OVERRIDES: CategoryThresholdOverride = {
  Snacks: {
    criticalDays: 5,
    highDays: 10,
    warningDays: 20,
    infoDays: 45,
  },
  Packaging: {
    criticalDays: 15,
    highDays: 30,
    warningDays: 60,
    infoDays: 120,
  },
};

// Seed Interview Notes for Roles & Interview Notes Page
export const SEED_INTERVIEW_NOTES: InterviewNotes = {
  Warehouse:
    'Interview conducted with Rashid Minhas (Warehouse Supervisor):\n- "Manual bin cards often lag physical movement by 24-48 hours during peak Ramadan dispatches."\n- "Truck loaders frequently grab front pallets regardless of date because back-stacking makes older stock hard to reach."\n- Need barcoding/location clear-marking on racks WH1 and WH2.',
  Procurement:
    'Interview conducted with Nabeel Tariq (Senior Procurement Officer):\n- "We currently order based on supplier price drops rather than simulated shelf-life consumption, leading to periodic cocoa and packaging surpluses."\n- "Payment terms with southern Punjab sugar mills fluctuate wildly between crushing season (Nov-Feb) and summer off-season."',
  Sales:
    'Interview conducted with Kashif Javed (National Sales Coordinator):\n- "Retail chains like Metro and Imtiaz reject any shipment with under 60 days remaining shelf life, sending drivers back at our expense."\n- "Wholesalers in Akbari Mandi and Multan Ghalla Mandi are happy to take 30-day stock if we offer a 5-8% promotional allowance."',
  Quality:
    'Interview conducted with Dr. Asad Malik (Head of Quality Assurance):\n- "Batch hold release requires microbiological incubation (minimum 72 hours for sauces, 24 hours for biscuits)."\n- "Physical paper hold tags sometimes get torn off during forklift pallet moves; system-enforced digital hold lock is essential."',
  Finance:
    'Interview conducted with Sajjad Haider (Finance Controller):\n- "Write-offs are currently booked at standard costing rather than net realisable value, skewing monthly cost-of-goods-sold variances."\n- "Need automated tie-in between write-off authorization and general ledger provision."',
};
