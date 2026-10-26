import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { connectDB } from '../src/config/db.js';
import User from '../src/models/user.model.js';
import Vendor from '../src/models/vendor.model.js';
import Product from '../src/models/product.model.js';
import { rebuildIndex } from './reindex.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Embedded fallback DummyJSON dataset (16 products) if offline
const FALLBACK_DUMMY_PRODUCTS = [
  {
    title: 'Essence Mascara Lash Princess',
    description: 'The Essence Lash Princess False Lash Effect Mascara achieves an intense false-lash look with its conic shape fiber brush.',
    category: 'beauty',
    price: 9.99,
    stock: 45,
    thumbnail: 'https://cdn.dummyjson.com/products/images/beauty/Essence%20Mascara%20Lash%20Princess/thumbnail.png',
    images: ['https://cdn.dummyjson.com/products/images/beauty/Essence%20Mascara%20Lash%20Princess/1.png'],
  },
  {
    title: 'Eyeshadow Palette with Mirror',
    description: 'The Eyeshadow Palette with Mirror offers a versatile range of pigmented shades for both subtle daytime and bold evening looks.',
    category: 'beauty',
    price: 19.99,
    stock: 28,
    thumbnail: 'https://cdn.dummyjson.com/products/images/beauty/Eyeshadow%20Palette%20with%20Mirror/thumbnail.png',
    images: ['https://cdn.dummyjson.com/products/images/beauty/Eyeshadow%20Palette%20with%20Mirror/1.png'],
  },
  {
    title: 'Powder Canister Loose Setting',
    description: 'The Powder Canister is a finely milled translucent setting powder designed to blur imperfections and control shine all day long.',
    category: 'beauty',
    price: 14.99,
    stock: 35,
    thumbnail: 'https://cdn.dummyjson.com/products/images/beauty/Powder%20Canister/thumbnail.png',
    images: ['https://cdn.dummyjson.com/products/images/beauty/Powder%20Canister/1.png'],
  },
  {
    title: 'Red Lipstick Matte Finish',
    description: 'The Red Lipstick delivers a rich, bold crimson finish with hydrating oils and long-wearing matte texture.',
    category: 'beauty',
    price: 12.99,
    stock: 40,
    thumbnail: 'https://cdn.dummyjson.com/products/images/beauty/Red%20Lipstick/thumbnail.png',
    images: ['https://cdn.dummyjson.com/products/images/beauty/Red%20Lipstick/1.png'],
  },
  {
    title: 'Red Nail Polish Glossy Coat',
    description: 'The Red Nail Polish delivers salon-grade high-gloss shine and chip-resistant wear in an iconic radiant red tone.',
    category: 'beauty',
    price: 8.99,
    stock: 50,
    thumbnail: 'https://cdn.dummyjson.com/products/images/beauty/Red%20Nail%20Polish/thumbnail.png',
    images: ['https://cdn.dummyjson.com/products/images/beauty/Red%20Nail%20Polish/1.png'],
  },
  {
    title: 'Calvin Klein CK One Fragrance',
    description: 'CK One by Calvin Klein is an iconic gender-neutral citrus aromatic eau de toilette featuring green tea, bergamot, and musk notes.',
    category: 'fragrances',
    price: 49.99,
    stock: 22,
    thumbnail: 'https://cdn.dummyjson.com/products/images/fragrances/Calvin%20Klein%20CK%20One/thumbnail.png',
    images: ['https://cdn.dummyjson.com/products/images/fragrances/Calvin%20Klein%20CK%20One/1.png'],
  },
  {
    title: 'Chanel Coco Noir Eau De Parfum',
    description: 'Coco Noir by Chanel is an intimate, sensual oriental luminous fragrance with notes of grapefruit, rose, patchouli and tonka bean.',
    category: 'fragrances',
    price: 129.99,
    stock: 14,
    thumbnail: 'https://cdn.dummyjson.com/products/images/fragrances/Chanel%20Coco%20Noir%20Eau%20De%20Parfum/thumbnail.png',
    images: ['https://cdn.dummyjson.com/products/images/fragrances/Chanel%20Coco%20Noir%20Eau%20De%20Parfum/1.png'],
  },
  {
    title: 'Dior J\'adore Floral Bouquet',
    description: 'J\'adore by Dior is an exquisite grand floral bouquet eau de parfum celebrated for ylang-ylang, damask rose, and jasmine sambac.',
    category: 'fragrances',
    price: 89.99,
    stock: 18,
    thumbnail: 'https://cdn.dummyjson.com/products/images/fragrances/Dior%20J\'adore/thumbnail.png',
    images: ['https://cdn.dummyjson.com/products/images/fragrances/Dior%20J\'adore/1.png'],
  },
  {
    title: 'Dolce Shine Eau De Parfum',
    description: 'Dolce Shine by Dolce & Gabbana is a sunny, cheerful fruity floral fragrance with juicy mango, jasmine, and blond woods.',
    category: 'fragrances',
    price: 69.99,
    stock: 25,
    thumbnail: 'https://cdn.dummyjson.com/products/images/fragrances/Dolce%20Shine%20Eau%20De%20Parfum/thumbnail.png',
    images: ['https://cdn.dummyjson.com/products/images/fragrances/Dolce%20Shine%20Eau%20De%20Parfum/1.png'],
  },
  {
    title: 'Gucci Bloom Eau De Parfum',
    description: 'Gucci Bloom captures the spirit of the contemporary woman with an authentic garden bouquet of tuberose and Rangoon creeper.',
    category: 'fragrances',
    price: 79.99,
    stock: 16,
    thumbnail: 'https://cdn.dummyjson.com/products/images/fragrances/Gucci%20Bloom%20Eau%20De%20Parfum/thumbnail.png',
    images: ['https://cdn.dummyjson.com/products/images/fragrances/Gucci%20Bloom%20Eau%20De%20Parfum/1.png'],
  },
  {
    title: 'Modern Annibale Colombo Bed',
    description: 'The Annibale Colombo Bed combines classic Italian handcrafted woodwork with ergonomic comfort and luxurious upholstery.',
    category: 'furniture',
    price: 399.99,
    stock: 8,
    thumbnail: 'https://cdn.dummyjson.com/products/images/furniture/Annibale%20Colombo%20Bed/thumbnail.png',
    images: ['https://cdn.dummyjson.com/products/images/furniture/Annibale%20Colombo%20Bed/1.png'],
  },
  {
    title: 'Scandinavian Annibale Colombo Sofa',
    description: 'A contemporary minimalist three-seater sofa crafted with high-density foam, solid ash wood legs, and stain-resistant fabric.',
    category: 'furniture',
    price: 299.99,
    stock: 10,
    thumbnail: 'https://cdn.dummyjson.com/products/images/furniture/Annibale%20Colombo%20Sofa/thumbnail.png',
    images: ['https://cdn.dummyjson.com/products/images/furniture/Annibale%20Colombo%20Sofa/1.png'],
  },
  {
    title: 'Modern Ergonomic Bedside Table',
    description: 'Sleek bedside storage with smooth-gliding drawers, integrated cable management grommet, and scratch-resistant matte finish.',
    category: 'furniture',
    price: 59.99,
    stock: 30,
    thumbnail: 'https://cdn.dummyjson.com/products/images/furniture/Bedside%20Table%20African%20Cherry/thumbnail.png',
    images: ['https://cdn.dummyjson.com/products/images/furniture/Bedside%20Table%20African%20Cherry/1.png'],
  },
  {
    title: 'Comfortable Modern Yellow Armchair',
    description: 'A striking accent armchair that pairs high-resilience foam cushioning with tailored mustard velvet upholstery and tapered metal legs.',
    category: 'furniture',
    price: 149.99,
    stock: 12,
    thumbnail: 'https://cdn.dummyjson.com/products/images/furniture/Knoll%20Saarinen%20Executive%20Conference%20Chair/thumbnail.png',
    images: ['https://cdn.dummyjson.com/products/images/furniture/Knoll%20Saarinen%20Executive%20Conference%20Chair/1.png'],
  },
  {
    title: 'Solid Oak Wood Dining Table',
    description: 'Sturdy solid oak dining table accommodating up to six persons with durable water-based satin lacquer finish.',
    category: 'furniture',
    price: 249.99,
    stock: 6,
    thumbnail: 'https://cdn.dummyjson.com/products/images/furniture/Wooden%20Bathroom%20Sink%20With%20Mirror/thumbnail.png',
    images: ['https://cdn.dummyjson.com/products/images/furniture/Wooden%20Bathroom%20Sink%20With%20Mirror/1.png'],
  },
  {
    title: 'Handcrafted Ceramic Plant Pot',
    description: 'Glazed artisan ceramic plant pot with drainage dish, suitable for succulents, herbs, and indoor botanical foliage.',
    category: 'home-decoration',
    price: 24.99,
    stock: 40,
    thumbnail: 'https://cdn.dummyjson.com/products/images/furniture/Plant%20Pot/thumbnail.png',
    images: ['https://cdn.dummyjson.com/products/images/furniture/Plant%20Pot/1.png'],
  },
];

/**
 * Convert DummyJSON price in USD to sensible rounded INR price (ending in 99 or 499)
 */
function toSensibleInrPrice(usdPrice) {
  const approx = Math.round((Number(usdPrice) || 20) * 80);
  if (approx <= 1000) {
    return Math.max(199, Math.round(approx / 100) * 100 - 1);
  }
  if (approx <= 5000) {
    return Math.round(approx / 500) * 500 - 1;
  }
  return Math.round(approx / 1000) * 1000 - 1;
}

/**
 * Format raw category string into clean storefront category title
 */
function formatCategory(cat) {
  if (!cat) return 'General';
  return cat
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

async function runDemoSeed() {
  console.log('--- Multi-Vendor Marketplace: Demo Products Seed ---');

  // Guard: Must only run when ALLOW_DEMO_SEED=true
  if (process.env.ALLOW_DEMO_SEED !== 'true') {
    console.error('[seed:demo] Aborted: ALLOW_DEMO_SEED is not set to "true".');
    console.error('To run this seed script, please set ALLOW_DEMO_SEED=true in your .env file or environment.');
    process.exit(1);
  }

  const isReset = process.argv.includes('--reset');

  try {
    await connectDB();

    if (isReset) {
      console.log('[seed:demo] --reset flag detected: Deactivating all existing products (setting isActive=false)...');
      const deactivateResult = await Product.updateMany({}, { isActive: false });
      console.log(`[seed:demo] Deactivated ${deactivateResult.modifiedCount} existing products. (Users, orders, and payouts were not touched).`);
    }

    // Locate the two demo vendors
    let vendor1 = await Vendor.findOne({ storeName: 'Aura Tech Hub' });
    let vendor2 = await Vendor.findOne({ storeName: 'Velvet & Thread' });

    // Fallbacks if named stores don't exist
    if (!vendor1 || !vendor2) {
      const approvedVendors = await Vendor.find({ status: 'approved' }).limit(2);
      if (approvedVendors[0] && !vendor1) vendor1 = approvedVendors[0];
      if (approvedVendors[1] && !vendor2) vendor2 = approvedVendors[1];
    }

    // If still missing, ensure demo vendor users and documents exist
    if (!vendor1) {
      let u1 = await User.findOne({ email: 'vendor1@marketplace.com' });
      if (!u1) {
        const hash = await User.hashPassword('Vendor@123');
        u1 = await User.create({ name: 'Rahul Sharma', email: 'vendor1@marketplace.com', passwordHash: hash, role: 'vendor' });
      }
      vendor1 = await Vendor.create({
        userId: u1._id,
        storeName: 'Aura Tech Hub',
        description: 'Premium consumer electronics, audio gear, and minimalist lifestyle tech.',
        status: 'approved',
        commissionPct: 10,
      });
      console.log('[seed:demo] Created default Vendor 1: Aura Tech Hub');
    }

    if (!vendor2) {
      let u2 = await User.findOne({ email: 'vendor2@marketplace.com' });
      if (!u2) {
        const hash = await User.hashPassword('Vendor@123');
        u2 = await User.create({ name: 'Priya Patel', email: 'vendor2@marketplace.com', passwordHash: hash, role: 'vendor' });
      }
      vendor2 = await Vendor.create({
        userId: u2._id,
        storeName: 'Velvet & Thread',
        description: 'Artisan lifestyle decor, curated beauty essentials, and home accents.',
        status: 'approved',
        commissionPct: 12,
      });
      console.log('[seed:demo] Created default Vendor 2: Velvet & Thread');
    }

    console.log(`[seed:demo] Target Vendor 1: ${vendor1.storeName} (${vendor1._id})`);
    console.log(`[seed:demo] Target Vendor 2: ${vendor2.storeName} (${vendor2._id})`);

    // Fetch up to 30 products from DummyJSON API
    let rawProducts = [];
    try {
      console.log('[seed:demo] Fetching 30 products from DummyJSON (https://dummyjson.com/products?limit=30)...');
      const res = await fetch('https://dummyjson.com/products?limit=30', {
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.products && Array.isArray(data.products) && data.products.length >= 16) {
          rawProducts = data.products;
          console.log(`[seed:demo] Successfully fetched ${rawProducts.length} products from DummyJSON.`);
        }
      }
    } catch (err) {
      console.warn(`[seed:demo] Could not fetch from DummyJSON network (${err.message}). Using built-in realistic dataset.`);
    }

    if (rawProducts.length < 16) {
      rawProducts = FALLBACK_DUMMY_PRODUCTS;
    }

    // Select 16 items
    const selected = rawProducts.slice(0, 16);
    console.log(`[seed:demo] Preparing 16 demo products across multiple categories...`);

    const createdDocs = [];

    for (let i = 0; i < selected.length; i++) {
      const item = selected[i];
      // Distribute evenly: first 8 to Vendor 1, next 8 to Vendor 2
      const targetVendor = i < 8 ? vendor1 : vendor2;

      const title = String(item.title || `Demo Product ${i + 1}`).trim().slice(0, 120);
      const description = String(item.description || 'High quality marketplace product with dependable specifications.').trim().slice(0, 2000);
      const price = toSensibleInrPrice(item.price);
      // Stock between 5 and 60
      const stock = Math.min(60, Math.max(5, typeof item.stock === 'number' ? (item.stock % 56) + 5 : 20));
      const category = formatCategory(item.category);
      const images = (item.images && item.images.length > 0)
        ? item.images.slice(0, 3)
        : [item.thumbnail || 'https://dummyjson.com/image/400x400?type=webp&text=Product'];

      const tags = [
        item.category ? String(item.category).toLowerCase() : 'demo',
        targetVendor.storeName.toLowerCase().split(' ')[0],
        'trending',
      ];

      const productDoc = await Product.create({
        vendorId: targetVendor._id,
        title,
        description,
        price,
        stock,
        category,
        tags,
        images,
        isActive: true,
        ratingAvg: Number((4.0 + (i % 10) * 0.1).toFixed(1)),
        ratingCount: (i * 3) + 5,
      });

      createdDocs.push(productDoc);
      console.log(`  [+] [Vendor: ${targetVendor.storeName}] ${title} - ₹${price} (Stock: ${stock})`);
    }

    console.log(`[seed:demo] Successfully inserted ${createdDocs.length} active demo products into MongoDB.`);

    // Rebuild Elasticsearch index to ensure all products are indexed and searchable
    console.log('[seed:demo] Synchronizing and reindexing Elasticsearch...');
    try {
      await rebuildIndex();
      console.log('[seed:demo] Elasticsearch reindex completed successfully.');
    } catch (esErr) {
      console.warn(`[seed:demo] Warning: Elasticsearch reindex encountered an issue: ${esErr.message}`);
    }

    console.log('--- Demo Seed Complete ---');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('[seed:demo] Fatal error during demo seeding:', err);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
}

runDemoSeed();
