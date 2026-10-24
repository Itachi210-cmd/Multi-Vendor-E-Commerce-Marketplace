import mongoose from 'mongoose';
import { connectDB } from '../src/config/db.js';
import User from '../src/models/user.model.js';
import Vendor from '../src/models/vendor.model.js';
import Product from '../src/models/product.model.js';
import { rebuildIndex } from './reindex.js';

const seedVendors = async () => {
  try {
    console.log('[Seed] Connecting to MongoDB...');
    await connectDB();

    const defaultPassword = 'Vendor@123';
    const passwordHash = await User.hashPassword(defaultPassword);

    // Vendor 1: Electronics & Gadgets
    const email1 = 'vendor1@marketplace.com';
    let user1 = await User.findOne({ email: email1 });
    if (!user1) {
      user1 = await User.create({
        name: 'Rahul Sharma',
        email: email1,
        passwordHash,
        role: 'vendor',
      });
      console.log(`[Seed] Created user: ${email1}`);
    } else {
      user1.role = 'vendor';
      await user1.save();
    }

    let vendor1 = await Vendor.findOne({ userId: user1._id });
    if (!vendor1) {
      vendor1 = await Vendor.create({
        userId: user1._id,
        storeName: 'Aura Tech Hub',
        description: 'Premium consumer electronics, audio gear, and minimalist desk setups.',
        logoUrl: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=200&h=200&fit=crop',
        status: 'approved',
        commissionPct: 10,
      });
      console.log(`[Seed] Created vendor: ${vendor1.storeName}`);
    }

    // Products for Vendor 1
    const productsVendor1 = [
      {
        title: 'Wireless Noise-Cancelling Headphones',
        description: 'Active hybrid noise cancellation with 40-hour battery life and high-resolution dynamic sound drivers.',
        price: 4999,
        stock: 35,
        category: 'Electronics',
        tags: ['audio', 'wireless', 'headphones', 'bluetooth'],
        images: [
          'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&fit=crop',
          'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800&fit=crop',
        ],
      },
      {
        title: 'Ultra-Slim Wireless Mechanical Keyboard',
        description: 'Low-profile hot-swappable tactile switches with RGB per-key backlighting and multi-device Bluetooth pairing.',
        price: 3499,
        stock: 20,
        category: 'Electronics',
        tags: ['keyboard', 'mechanical', 'computer', 'wireless'],
        images: [
          'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&fit=crop',
        ],
      },
      {
        title: 'Ergonomic Wireless Gaming Mouse',
        description: 'Precision optical sensor up to 16,000 DPI with ultra-lightweight chassis and customizable macro buttons.',
        price: 1899,
        stock: 45,
        category: 'Electronics',
        tags: ['mouse', 'gaming', 'ergonomic'],
        images: [
          'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800&fit=crop',
        ],
      },
      {
        title: 'USB-C 7-in-1 Aluminum Hub',
        description: 'Expand your laptop with 4K HDMI, 100W Power Delivery, SD/TF card slots, and dual USB 3.0 ports.',
        price: 1299,
        stock: 60,
        category: 'Accessories',
        tags: ['hub', 'usbc', 'adapter', 'accessories'],
        images: [
          'https://images.unsplash.com/photo-1625842268584-8f3296236761?w=800&fit=crop',
        ],
      },
      {
        title: 'Portable Waterproof Bluetooth Speaker 20W',
        description: 'IPX7 waterproof rating, dual passive radiators for deep bass, and 14-hour continuous playback.',
        price: 2199,
        stock: 30,
        category: 'Audio',
        tags: ['speaker', 'audio', 'waterproof'],
        images: [
          'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800&fit=crop',
        ],
      },
      {
        title: 'Qi Fast Wireless Charging Stand',
        description: 'Dual-coil design for portrait and landscape viewing with intelligent temperature regulation.',
        price: 999,
        stock: 75,
        category: 'Accessories',
        tags: ['charger', 'wireless', 'accessories'],
        images: [
          'https://images.unsplash.com/photo-1586816879360-004f5b0c51e3?w=800&fit=crop',
        ],
      },
    ];

    // Vendor 2: Apparel & Lifestyle
    const email2 = 'vendor2@marketplace.com';
    let user2 = await User.findOne({ email: email2 });
    if (!user2) {
      user2 = await User.create({
        name: 'Priya Patel',
        email: email2,
        passwordHash,
        role: 'vendor',
      });
      console.log(`[Seed] Created user: ${email2}`);
    } else {
      user2.role = 'vendor';
      await user2.save();
    }

    let vendor2 = await Vendor.findOne({ userId: user2._id });
    if (!vendor2) {
      vendor2 = await Vendor.create({
        userId: user2._id,
        storeName: 'Urban Threads & Living',
        description: 'Handcrafted sustainable fashion, organic cotton streetwear, and curated home goods.',
        logoUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200&h=200&fit=crop',
        status: 'approved',
        commissionPct: 12,
      });
      console.log(`[Seed] Created vendor: ${vendor2.storeName}`);
    }

    // Products for Vendor 2
    const productsVendor2 = [
      {
        title: 'Vintage Washed Denim Jacket',
        description: 'Classic durable denim with a relaxed retro fit, antique brass buttons, and reinforced double stitching.',
        price: 2499,
        stock: 25,
        category: 'Fashion',
        tags: ['jacket', 'denim', 'vintage', 'fashion'],
        images: [
          'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=800&fit=crop',
        ],
      },
      {
        title: 'Organic Cotton Heavyweight Oversized Tee',
        description: '100% GOTS certified organic combed cotton with pre-shrunk fabric and ribbed crew neck.',
        price: 799,
        stock: 90,
        category: 'Fashion',
        tags: ['tshirt', 'cotton', 'oversized', 'casual'],
        images: [
          'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&fit=crop',
        ],
      },
      {
        title: 'Everyday Canvas Commuter Backpack',
        description: 'Water-resistant coated canvas with padded 15.6-inch laptop compartment and genuine leather straps.',
        price: 1699,
        stock: 40,
        category: 'Bags',
        tags: ['backpack', 'canvas', 'travel', 'commuter'],
        images: [
          'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&fit=crop',
        ],
      },
      {
        title: 'Breezy Linen Button-Down Shirt',
        description: 'Pure French flax linen offering natural breathability and effortless casual comfort in warm weather.',
        price: 1499,
        stock: 35,
        category: 'Fashion',
        tags: ['shirt', 'linen', 'summer', 'fashion'],
        images: [
          'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&fit=crop',
        ],
      },
      {
        title: 'Handcrafted Ceramic Coffee Mug Set',
        description: 'Set of 2 speckled stoneware mugs wheel-thrown by local artisans with smooth satin glaze.',
        price: 899,
        stock: 50,
        category: 'Home',
        tags: ['mug', 'ceramic', 'handmade', 'kitchen'],
        images: [
          'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&fit=crop',
        ],
      },
      {
        title: 'Minimalist Top-Grain Leather Slim Wallet',
        description: 'RFID-blocking slim cardholder crafted from vegetable-tanned leather holding up to 8 cards plus cash.',
        price: 699,
        stock: 65,
        category: 'Accessories',
        tags: ['wallet', 'leather', 'accessories', 'minimalist'],
        images: [
          'https://images.unsplash.com/photo-1627123424574-724758594e93?w=800&fit=crop',
        ],
      },
    ];

    // Seed products for Vendor 1
    for (const p of productsVendor1) {
      await Product.findOneAndUpdate(
        { vendorId: vendor1._id, title: p.title },
        { ...p, vendorId: vendor1._id, isActive: true },
        { upsert: true, new: true }
      );
    }
    console.log(`[Seed] Seeded 6 products for ${vendor1.storeName}`);

    // Seed products for Vendor 2
    for (const p of productsVendor2) {
      await Product.findOneAndUpdate(
        { vendorId: vendor2._id, title: p.title },
        { ...p, vendorId: vendor2._id, isActive: true },
        { upsert: true, new: true }
      );
    }
    console.log(`[Seed] Seeded 6 products for ${vendor2.storeName}`);

    // Synchronize seeded products to Elasticsearch index
    try {
      console.log('[Seed] Indexing seeded products into Elasticsearch...');
      await rebuildIndex();
    } catch (esErr) {
      console.warn(`[Seed] Notice: Could not sync with Elasticsearch (${esErr.message}). You can run 'npm run reindex' once Elasticsearch is up.`);
    }

    console.log('\n=============================================');
    console.log('[Seed] Vendors & Products Seeding Completed!');
    console.log('Vendor 1: vendor1@marketplace.com / Vendor@123 (Aura Tech Hub)');
    console.log('Vendor 2: vendor2@marketplace.com / Vendor@123 (Urban Threads & Living)');
    console.log('=============================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error(`[Seed] Error seeding vendors: ${error.message}`);
    await mongoose.disconnect();
    process.exit(1);
  }
};

seedVendors();
