import { PrismaClient, UserRole, ProductCondition, OrderStatus } from '@prisma/client';
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
        firstName: overrides.firstName || 'Test',
        lastName: overrides.lastName || 'User',
        role: overrides.role || UserRole.USER,
        isVerified: overrides.isVerified !== undefined ? overrides.isVerified : true,
        ...overrides,
      },
    });
  }

  async createSeller(userId?: string, overrides: any = {}) {
    const user = userId
      ? await this.prisma.user.findUnique({ where: { id: userId } })
      : await this.createUser({ role: UserRole.SELLER });

    if (!user) throw new Error('User not found');

    return this.prisma.seller.create({
      data: {
        userId: user.id,
        businessName: overrides.businessName || `Test Business ${generateRandomString()}`,
        businessEmail: overrides.businessEmail || generateRandomEmail(),
        businessPhone: overrides.businessPhone || '1234567890',
        isVerified: overrides.isVerified !== undefined ? overrides.isVerified : true,
        ...overrides,
      },
    });
  }

  async createGame(overrides: any = {}) {
    return this.prisma.game.create({
      data: {
        name: overrides.name || `Test Game ${generateRandomString()}`,
        description: overrides.description || 'A test trading card game',
        publisher: overrides.publisher || 'Test Publisher',
        releaseYear: overrides.releaseYear || 2020,
        ...overrides,
      },
    });
  }

  async createSet(gameId?: string, overrides: any = {}) {
    const game = gameId
      ? await this.prisma.game.findUnique({ where: { id: gameId } })
      : await this.createGame();

    if (!game) throw new Error('Game not found');

    return this.prisma.set.create({
      data: {
        gameId: game.id,
        name: overrides.name || `Test Set ${generateRandomString()}`,
        code: overrides.code || generateRandomString(5).toUpperCase(),
        releaseDate: overrides.releaseDate || new Date(),
        totalCards: overrides.totalCards || generateRandomNumber(100, 500),
        ...overrides,
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

    return this.prisma.product.create({
      data: {
        sellerId: seller.id,
        gameId: game.id,
        setId: set.id,
        name: overrides.name || `Test Product ${generateRandomString()}`,
        description: overrides.description || 'A test trading card',
        price: overrides.price || generateRandomNumber(1, 100),
        stock: overrides.stock || generateRandomNumber(1, 100),
        condition: overrides.condition || ProductCondition.NEAR_MINT,
        rarity: overrides.rarity || 'Common',
        cardNumber: overrides.cardNumber || generateRandomString(5),
        ...overrides,
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

    return this.prisma.order.create({
      data: {
        userId: user.id,
        status: overrides.status || OrderStatus.PENDING,
        totalAmount: overrides.totalAmount || generateRandomNumber(10, 1000),
        shippingAddress: overrides.shippingAddress || '123 Test St',
        shippingCity: overrides.shippingCity || 'Test City',
        shippingState: overrides.shippingState || 'TS',
        shippingZip: overrides.shippingZip || '12345',
        shippingCountry: overrides.shippingCountry || 'US',
        ...overrides,
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
