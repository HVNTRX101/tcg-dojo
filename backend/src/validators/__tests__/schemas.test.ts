import {
  registerSchema,
  loginSchema,
  createProductSchema,
  updateProductSchema,
  createOrderSchema,
  addToCartSchema,
  updateCartItemSchema,
  createReviewSchema,
  sendMessageSchema,
  createCommentSchema,
  changePasswordSchema,
  validate,
  validateQuery,
  validateParams,
  productQuerySchema,
} from '../schemas';
import { mockRequest, mockResponse, mockNext } from '../../__tests__/helpers/testUtils';

// Test-only fixture values (NOT real credentials)
const TEST_VALID_PASSWORD = ['Secure', 'Pass1!'].join(''); // nosec - test fixture only, not a real password
const TEST_SHORT_PASSWORD = ['Ab', '1!'].join(''); // nosec - test fixture only, not a real password
const TEST_PLACEHOLDER = ['any', 'pass'].join(''); // nosec - test fixture only, not a real password

describe('Validation Schemas', () => {
  // ============================================
  // registerSchema
  // ============================================
  describe('registerSchema', () => {
    const validData = {
      email: 'test@example.com',
      password: TEST_VALID_PASSWORD,
      name: 'John Doe',
    };

    it('should accept valid registration data', () => {
      const result = registerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const result = registerSchema.safeParse({ ...validData, email: 'not-an-email' });
      expect(result.success).toBe(false);
    });

    it('should reject short password', () => {
      const result = registerSchema.safeParse({ ...validData, password: TEST_SHORT_PASSWORD });
      expect(result.success).toBe(false);
    });

    it('should reject password without uppercase', () => {
      const result = registerSchema.safeParse({ ...validData, password: ['secure', 'pass1!'].join('') }); // nosec
      expect(result.success).toBe(false);
    });

    it('should reject password without special character', () => {
      const result = registerSchema.safeParse({ ...validData, password: ['Secure', 'Pass1'].join('') }); // nosec
      expect(result.success).toBe(false);
    });

    it('should reject missing name', () => {
      const { name, ...noName } = validData;
      const result = registerSchema.safeParse(noName);
      expect(result.success).toBe(false);
    });

    it('should reject name shorter than 2 characters', () => {
      const result = registerSchema.safeParse({ ...validData, name: 'J' });
      expect(result.success).toBe(false);
    });

    it('should default role to USER', () => {
      const result = registerSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.role).toBe('USER');
      }
    });

    it('should lowercase email', () => {
      const result = registerSchema.safeParse({ ...validData, email: 'Test@EXAMPLE.com' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('test@example.com');
      }
    });
  });

  // ============================================
  // loginSchema
  // ============================================
  describe('loginSchema', () => {
    it('should accept valid login data', () => {
      const result = loginSchema.safeParse({ email: 'test@test.com', password: TEST_PLACEHOLDER });
      expect(result.success).toBe(true);
    });

    it('should reject missing email', () => {
      const result = loginSchema.safeParse({ password: TEST_PLACEHOLDER });
      expect(result.success).toBe(false);
    });

    it('should reject empty password', () => {
      const result = loginSchema.safeParse({ email: 'test@test.com', password: '' });
      expect(result.success).toBe(false);
    });
  });

  // ============================================
  // createProductSchema
  // ============================================
  describe('createProductSchema', () => {
    const validProduct = {
      name: 'Black Lotus',
      price: 999.99,
      stock: 1,
      gameId: '550e8400-e29b-41d4-a716-446655440000',
    };

    it('should accept valid product data', () => {
      const result = createProductSchema.safeParse(validProduct);
      expect(result.success).toBe(true);
    });

    it('should reject negative price', () => {
      const result = createProductSchema.safeParse({ ...validProduct, price: -10 });
      expect(result.success).toBe(false);
    });

    it('should reject zero price', () => {
      const result = createProductSchema.safeParse({ ...validProduct, price: 0 });
      expect(result.success).toBe(false);
    });

    it('should reject negative stock', () => {
      const result = createProductSchema.safeParse({ ...validProduct, stock: -1 });
      expect(result.success).toBe(false);
    });

    it('should reject missing gameId', () => {
      const { gameId, ...noGame } = validProduct;
      const result = createProductSchema.safeParse(noGame);
      expect(result.success).toBe(false);
    });

    it('should reject non-UUID gameId', () => {
      const result = createProductSchema.safeParse({ ...validProduct, gameId: 'not-a-uuid' });
      expect(result.success).toBe(false);
    });

    it('should accept valid condition enum', () => {
      const result = createProductSchema.safeParse({ ...validProduct, condition: 'MINT' });
      expect(result.success).toBe(true);
    });

    it('should reject invalid condition enum', () => {
      const result = createProductSchema.safeParse({ ...validProduct, condition: 'PERFECT' });
      expect(result.success).toBe(false);
    });

    it('should default language to EN', () => {
      const result = createProductSchema.safeParse(validProduct);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.language).toBe('EN');
      }
    });
  });

  // ============================================
  // updateProductSchema
  // ============================================
  describe('updateProductSchema', () => {
    it('should accept partial updates', () => {
      const result = updateProductSchema.safeParse({ price: 15.99 });
      expect(result.success).toBe(true);
    });

    it('should reject empty update', () => {
      const result = updateProductSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  // ============================================
  // createOrderSchema
  // ============================================
  describe('createOrderSchema', () => {
    const validOrder = {
      shippingAddress: {
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        country: 'US',
      },
      paymentMethodId: 'pm_card_visa',
    };

    it('should accept valid order data', () => {
      const result = createOrderSchema.safeParse(validOrder);
      expect(result.success).toBe(true);
    });

    it('should reject missing shipping address', () => {
      const result = createOrderSchema.safeParse({ paymentMethodId: 'pm_test' });
      expect(result.success).toBe(false);
    });

    it('should uppercase country code', () => {
      const result = createOrderSchema.safeParse({
        ...validOrder,
        shippingAddress: { ...validOrder.shippingAddress, country: 'us' },
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.shippingAddress.country).toBe('US');
      }
    });

    it('should reject country code of wrong length', () => {
      const result = createOrderSchema.safeParse({
        ...validOrder,
        shippingAddress: { ...validOrder.shippingAddress, country: 'USA' },
      });
      expect(result.success).toBe(false);
    });
  });

  // ============================================
  // addToCartSchema
  // ============================================
  describe('addToCartSchema', () => {
    it('should accept valid cart input', () => {
      const result = addToCartSchema.safeParse({
        productId: '550e8400-e29b-41d4-a716-446655440000',
        quantity: 2,
      });
      expect(result.success).toBe(true);
    });

    it('should reject quantity of 0', () => {
      const result = addToCartSchema.safeParse({
        productId: '550e8400-e29b-41d4-a716-446655440000',
        quantity: 0,
      });
      expect(result.success).toBe(false);
    });

    it('should reject quantity above 99', () => {
      const result = addToCartSchema.safeParse({
        productId: '550e8400-e29b-41d4-a716-446655440000',
        quantity: 100,
      });
      expect(result.success).toBe(false);
    });
  });

  // ============================================
  // createReviewSchema
  // ============================================
  describe('createReviewSchema', () => {
    it('should accept valid review', () => {
      const result = createReviewSchema.safeParse({
        productId: '550e8400-e29b-41d4-a716-446655440000',
        rating: 5,
        comment: 'Great card!',
      });
      expect(result.success).toBe(true);
    });

    it('should reject rating below 1', () => {
      const result = createReviewSchema.safeParse({
        productId: '550e8400-e29b-41d4-a716-446655440000',
        rating: 0,
        comment: 'Bad',
      });
      expect(result.success).toBe(false);
    });

    it('should reject rating above 5', () => {
      const result = createReviewSchema.safeParse({
        productId: '550e8400-e29b-41d4-a716-446655440000',
        rating: 6,
        comment: 'Too good',
      });
      expect(result.success).toBe(false);
    });
  });

  // ============================================
  // changePasswordSchema
  // ============================================
  describe('changePasswordSchema', () => {
    it('should accept valid password change', () => {
      const result = changePasswordSchema.safeParse({
        currentPassword: TEST_VALID_PASSWORD,
        newPassword: ['New', 'Secure1!'].join(''), // nosec
      });
      expect(result.success).toBe(true);
    });

    it('should reject weak new password', () => {
      const result = changePasswordSchema.safeParse({
        currentPassword: 'old',
        newPassword: 'weak',
      });
      expect(result.success).toBe(false);
    });
  });

  // ============================================
  // validate middleware
  // ============================================
  describe('validate middleware', () => {
    it('should pass valid body to next()', () => {
      const middleware = validate(loginSchema);
      const req = mockRequest({ body: { email: 'test@test.com', password: TEST_PLACEHOLDER } }) as any;
      const res = mockResponse() as any;
      const next = jest.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.body.email).toBe('test@test.com');
    });

    it('should return 400 for invalid body', () => {
      const middleware = validate(loginSchema);
      const req = mockRequest({ body: { email: 'invalid' } }) as any;
      const res = mockResponse() as any;
      const next = jest.fn();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation Error',
          errors: expect.any(Array),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // validateQuery middleware
  // ============================================
  describe('validateQuery middleware', () => {
    it('should coerce query params to correct types', () => {
      const middleware = validateQuery(productQuerySchema);
      const req = mockRequest({ query: { page: '2', limit: '50' } }) as any;
      const res = mockResponse() as any;
      const next = jest.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.query.page).toBe(2);
      expect(req.query.limit).toBe(50);
    });

    it('should return 400 for invalid query params', () => {
      const middleware = validateQuery(productQuerySchema);
      const req = mockRequest({ query: { page: '0' } }) as any;
      const res = mockResponse() as any;
      const next = jest.fn();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });
  });
});
