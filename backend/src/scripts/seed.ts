import prisma from '../config/database';
import { hashPassword } from '../utils/password';

async function seed() {
  try {
    console.log('🌱 Starting database seed...');

    // Create Games
    console.log('Creating games...');
    const pokemon = await prisma.game.create({
      data: {
        name: 'Pokemon',
        description: 'Pokemon Trading Card Game',
        imageUrl: 'https://example.com/pokemon.jpg',
      },
    });

    const magic = await prisma.game.create({
      data: {
        name: 'Magic: The Gathering',
        description: 'Magic: The Gathering Trading Card Game',
        imageUrl: 'https://example.com/mtg.jpg',
      },
    });

    const yugioh = await prisma.game.create({
      data: {
        name: 'Yu-Gi-Oh!',
        description: 'Yu-Gi-Oh! Trading Card Game',
        imageUrl: 'https://example.com/yugioh.jpg',
      },
    });

    // Create Sets
    console.log('Creating sets...');
    const baseSet = await prisma.set.create({
      data: {
        gameId: pokemon.id,
        name: 'Base Set',
        code: 'BS',
        releaseDate: new Date('1999-01-09'),
      },
    });

    const swordShield = await prisma.set.create({
      data: {
        gameId: pokemon.id,
        name: 'Sword & Shield',
        code: 'SWSH',
        releaseDate: new Date('2020-02-07'),
      },
    });

    const alphaEdition = await prisma.set.create({
      data: {
        gameId: magic.id,
        name: 'Alpha Edition',
        code: 'LEA',
        releaseDate: new Date('1993-08-05'),
      },
    });

    // Create Users
    console.log('Creating users...');
    const password = await hashPassword('password123');

    const user1 = await prisma.user.create({
      data: {
        email: 'john@example.com',
        password,
        name: 'John Doe',
        role: 'USER',
        isVerified: true,
      },
    });

    const user2 = await prisma.user.create({
      data: {
        email: 'seller@example.com',
        password,
        name: 'Jane Smith',
        role: 'SELLER',
        isVerified: true,
      },
    });

    const adminUser = await prisma.user.create({
      data: {
        email: 'admin@example.com',
        password,
        name: 'Admin User',
        role: 'ADMIN',
        isVerified: true,
      },
    });

    // Create Sellers
    console.log('Creating sellers...');
    const seller1 = await prisma.seller.create({
      data: {
        userId: user2.id,
        businessName: 'Card Kingdom',
        description: 'Premium trading card seller with over 20 years of experience',
        rating: 4.8,
        totalSales: 1500,
        isVerified: true,
      },
    });

    const seller2 = await prisma.seller.create({
      data: {
        userId: adminUser.id,
        businessName: 'TCG Vault',
        description: 'Specialized in rare and vintage cards',
        rating: 4.9,
        totalSales: 3200,
        isVerified: true,
      },
    });

    // Create Products
    console.log('Creating products...');
    const products = [
      {
        gameId: pokemon.id,
        setId: baseSet.id,
        sellerId: seller1.id,
        name: 'Charizard',
        description: 'Rare holographic Charizard from Base Set',
        price: 499.99,
        quantity: 3,
        condition: 'NEAR_MINT',
        rarity: 'Rare Holo',
        finish: 'HOLO',
        cardNumber: '4/102',
      },
      {
        gameId: pokemon.id,
        setId: baseSet.id,
        sellerId: seller1.id,
        name: 'Blastoise',
        description: 'Rare holographic Blastoise from Base Set',
        price: 299.99,
        quantity: 5,
        condition: 'NEAR_MINT',
        rarity: 'Rare Holo',
        finish: 'HOLO',
        cardNumber: '2/102',
      },
      {
        gameId: pokemon.id,
        setId: swordShield.id,
        sellerId: seller1.id,
        name: 'Pikachu VMAX',
        description: 'Pikachu VMAX from Sword & Shield',
        price: 89.99,
        quantity: 10,
        condition: 'MINT',
        rarity: 'Ultra Rare',
        finish: 'FULL_ART',
        cardNumber: '044/185',
      },
      {
        gameId: magic.id,
        setId: alphaEdition.id,
        sellerId: seller2.id,
        name: 'Black Lotus',
        description: 'Iconic Black Lotus from Alpha Edition - Near Mint condition',
        price: 25000.00,
        quantity: 1,
        condition: 'NEAR_MINT',
        rarity: 'Rare',
        finish: 'NORMAL',
      },
      {
        gameId: magic.id,
        setId: alphaEdition.id,
        sellerId: seller2.id,
        name: 'Ancestral Recall',
        description: 'Power Nine card from Alpha Edition',
        price: 8500.00,
        quantity: 2,
        condition: 'EXCELLENT',
        rarity: 'Rare',
        finish: 'NORMAL',
      },
      {
        gameId: pokemon.id,
        setId: swordShield.id,
        sellerId: seller2.id,
        name: 'Charizard V',
        description: 'Charizard V from Sword & Shield',
        price: 45.99,
        quantity: 15,
        condition: 'MINT',
        rarity: 'Rare Holo V',
        finish: 'HOLO',
        cardNumber: '019/189',
      },
      {
        gameId: yugioh.id,
        sellerId: seller1.id,
        name: 'Blue-Eyes White Dragon',
        description: 'Classic Blue-Eyes White Dragon',
        price: 150.00,
        quantity: 8,
        condition: 'NEAR_MINT',
        rarity: 'Ultra Rare',
        finish: 'FOIL',
      },
      {
        gameId: yugioh.id,
        sellerId: seller2.id,
        name: 'Dark Magician',
        description: 'Dark Magician - Original artwork',
        price: 120.00,
        quantity: 6,
        condition: 'NEAR_MINT',
        rarity: 'Ultra Rare',
        finish: 'FOIL',
      },
    ];

    for (const productData of products) {
      await prisma.product.create({ data: productData });
    }

    // Create some addresses
    console.log('Creating addresses...');
    await prisma.address.create({
      data: {
        userId: user1.id,
        fullName: 'John Doe',
        addressLine1: '123 Main St',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
        country: 'USA',
        phone: '555-0123',
        isDefault: true,
      },
    });

    // Create test coupons
    console.log('Creating coupons...');
    await prisma.coupon.create({
      data: {
        code: 'WELCOME10',
        description: '10% off your first order',
        discountType: 'PERCENTAGE',
        discountValue: 10,
        minPurchase: 50,
        maxDiscount: 50,
        usageLimit: 100,
        isActive: true,
      },
    });

    await prisma.coupon.create({
      data: {
        code: 'SAVE20',
        description: '$20 off orders over $100',
        discountType: 'FIXED',
        discountValue: 20,
        minPurchase: 100,
        usageLimit: 50,
        isActive: true,
      },
    });

    await prisma.coupon.create({
      data: {
        code: 'FREESHIP',
        description: 'Free shipping on any order',
        discountType: 'FIXED',
        discountValue: 5.99,
        minPurchase: 0,
        isActive: true,
      },
    });

    await prisma.coupon.create({
      data: {
        code: 'EXPIRED',
        description: 'Expired coupon for testing',
        discountType: 'PERCENTAGE',
        discountValue: 50,
        minPurchase: 0,
        isActive: true,
        validUntil: new Date('2024-01-01'),
      },
    });

    console.log('✅ Database seeded successfully!');
    console.log('\n📧 Test accounts:');
    console.log('User: john@example.com / password123');
    console.log('Seller: seller@example.com / password123');
    console.log('Admin: admin@example.com / password123');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seed();
