import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { generateRandomString, generateRandomEmail, generateRandomNumber } from './testUtils';

export class TestDataFactory {
  constructor(private prisma: PrismaClient) {}

  async createUser(overrides: any = {}) {
    const defaultPassword = 'Test123!@#';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    return this.prisma.user.create({
      data: {
        email: overrides.email || generateRandomEmail(),
        password: hashedPassword,
        name: overrides.name || 'Test User',
        role: overrides.role || 'USER',
        isVerified: overrides.isVerified !== undefined ? overrides.isVerified : true,
        ...overrides,
      },
    });
  }

  async createSeller(userId?: string, overrides: any = {}) {
    const user = userId
      ? await this.prisma.user.findUnique({ where: { id: userId } })
      : await this.createUser({ role: 'SELLER' });

    if (!user) throw new Error('User not found');

    const safeOverrides = { ...overrides };
    delete safeOverrides.businessEmail;
    delete safeOverrides.businessPhone;

    return this.prisma.seller.create({
      data: {
        userId: user.id,
        businessName: overrides.businessName || `Test Business ${generateRandomString()}`,
        contactEmail: overrides.contactEmail || overrides.businessEmail || generateRandomEmail(),
        contactPhone: overrides.contactPhone || overrides.businessPhone || '1234567890',
        isVerified: overrides.isVerified !== undefined ? overrides.isVerified : true,
        ...safeOverrides,
      },
    });
  }

  async createGame(overrides: any = {}) {
    const safeOverrides = { ...overrides };
    delete safeOverrides.publisher;
    delete safeOverrides.releaseYear;

    return this.prisma.game.create({
      data: {
        name: safeOverrides.name || `Test Game ${generateRandomString()}`,
        description: safeOverrides.description || 'A test trading card game',
        ...safeOverrides,
      },
    });
  }

  async createSet(gameId?: string, overrides: any = {}) {
    const game = gameId
      ? await this.prisma.game.findUnique({ where: { id: gameId } })
      : await this.createGame();

    if (!game) throw new Error('Game not found');

    const safeOverrides = { ...overrides };
    delete safeOverrides.totalCards;

    return this.prisma.set.create({
      data: {
        gameId: game.id,
        name: safeOverrides.name || `Test Set ${generateRandomString()}`,
        code: safeOverrides.code || generateRandomString(5).toUpperCase(),
        releaseDate: safeOverrides.releaseDate || new Date(),
        ...safeOverrides,
      },
    });
  }

  async createProduct(sellerId?: string, overrides: any = {}) {
    const seller = sellerId
      ? await this.prisma.seller.findUnique({ where: { id: sellerId } })
      : await this.createSeller();

    if (!seller) throw new Error('Seller not found');

    const game = await this.createGame();
    const set = await this.createSet(game.id);

    const safeOverrides = { ...overrides };
    // `stock` is a legacy alias for `quantity`; exclude from spread but still use as fallback
    delete safeOverrides.stock;

    return this.prisma.product.create({
      data: {
        sellerId: seller.id,
        gameId: game.id,
        setId: set.id,
        name: safeOverrides.name || `Test Product ${generateRandomString()}`,
        description: safeOverrides.description || 'A test trading card',
        price: safeOverrides.price || generateRandomNumber(1, 100),
        quantity: safeOverrides.quantity || overrides.stock || generateRandomNumber(1, 100),
        condition: safeOverrides.condition || 'NEAR_MINT',
        rarity: safeOverrides.rarity || 'Common',
        cardNumber: safeOverrides.cardNumber || generateRandomString(5),
        ...safeOverrides,
      },
    });
  }

  async createCart(userId?: string, overrides: any = {}) {
    const user = userId
      ? await this.prisma.user.findUnique({ where: { id: userId } })
      : await this.createUser();

    if (!user) throw new Error('User not found');

    return this.prisma.cart.create({
      data: {
        userId: user.id,
        ...overrides,
      },
    });
  }

  async createCartItem(cartId: string, productId: string, overrides: any = {}) {
    return this.prisma.cartItem.create({
      data: {
        cartId,
        productId,
        quantity: overrides.quantity || 1,
        ...overrides,
      },
    });
  }

  async createOrder(userId?: string, overrides: any = {}) {
    const user = userId
      ? await this.prisma.user.findUnique({ where: { id: userId } })
      : await this.createUser();

    if (!user) throw new Error('User not found');

    const safeOverrides = { ...overrides };
    delete safeOverrides.totalAmount;
    delete safeOverrides.shippingCity;
    delete safeOverrides.shippingState;
    delete safeOverrides.shippingZip;
    delete safeOverrides.shippingCountry;

    return this.prisma.order.create({
      data: {
        userId: user.id,
        status: safeOverrides.status || 'PENDING',
        total: safeOverrides.total || overrides.totalAmount || generateRandomNumber(10, 1000),
        subtotal: safeOverrides.subtotal || safeOverrides.total || overrides.totalAmount || 100,
        shippingAddress: safeOverrides.shippingAddress || '{"line1":"123 Test St","city":"Test City","state":"TS","zip":"12345","country":"US"}',
        ...safeOverrides,
      },
    });
  }

  async createOrderItem(orderId: string, productId: string, sellerId: string, overrides: any = {}) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new Error('Product not found');

    return this.prisma.orderItem.create({
      data: {
        orderId,
        productId,
        sellerId,
        quantity: overrides.quantity || 1,
        price: overrides.price || product.price,
        ...overrides,
      },
    });
  }

  async createReview(productId: string, userId?: string, overrides: any = {}) {
    const user = userId
      ? await this.prisma.user.findUnique({ where: { id: userId } })
      : await this.createUser();

    if (!user) throw new Error('User not found');

    return this.prisma.review.create({
      data: {
        productId,
        userId: user.id,
        rating: overrides.rating || generateRandomNumber(1, 5),
        comment: overrides.comment || 'Great product!',
        ...overrides,
      },
    });
  }

  // Clean up all test data
  async cleanup() {
    await this.prisma.$executeRawUnsafe('PRAGMA foreign_keys = OFF;');

    const tables = await this.prisma.$queryRaw<Array<{ name: string }>>`
      SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != '_prisma_migrations';
    `;

    for (const { name } of tables) {
      await this.prisma.$executeRawUnsafe(`DELETE FROM "${name}";`);
    }

    await this.prisma.$executeRawUnsafe('PRAGMA foreign_keys = ON;');
  }
}
