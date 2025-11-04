import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  JWTPayload,
} from '../jwt';
import jwt from 'jsonwebtoken';

describe('JWT Utils', () => {
  const mockPayload: JWTPayload = {
    userId: 'user-123',
    email: 'test@example.com',
    role: 'USER',
  };

  describe('generateAccessToken', () => {
    it('should generate a valid access token', () => {
      const token = generateAccessToken(mockPayload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should include payload data in token', () => {
      const token = generateAccessToken(mockPayload);
      const decoded = jwt.decode(token) as any;

      expect(decoded.userId).toBe(mockPayload.userId);
      expect(decoded.email).toBe(mockPayload.email);
      expect(decoded.role).toBe(mockPayload.role);
    });

    it('should include expiration time', () => {
      const token = generateAccessToken(mockPayload);
      const decoded = jwt.decode(token) as any;

      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeGreaterThan(decoded.iat);
    });

    it('should generate different tokens for different payloads', () => {
      const payload1 = { ...mockPayload, userId: 'user-1' };
      const payload2 = { ...mockPayload, userId: 'user-2' };

      const token1 = generateAccessToken(payload1);
      const token2 = generateAccessToken(payload2);

      expect(token1).not.toBe(token2);
    });

    it('should be verifiable after generation', () => {
      const token = generateAccessToken(mockPayload);
      const decoded = verifyAccessToken(token);

      expect(decoded.userId).toBe(mockPayload.userId);
      expect(decoded.email).toBe(mockPayload.email);
      expect(decoded.role).toBe(mockPayload.role);
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid refresh token', () => {
      const token = generateRefreshToken(mockPayload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should include payload data in token', () => {
      const token = generateRefreshToken(mockPayload);
      const decoded = jwt.decode(token) as any;

      expect(decoded.userId).toBe(mockPayload.userId);
      expect(decoded.email).toBe(mockPayload.email);
      expect(decoded.role).toBe(mockPayload.role);
    });

    it('should have longer expiration than access token', () => {
      const accessToken = generateAccessToken(mockPayload);
      const refreshToken = generateRefreshToken(mockPayload);

      const accessDecoded = jwt.decode(accessToken) as any;
      const refreshDecoded = jwt.decode(refreshToken) as any;

      expect(refreshDecoded.exp - refreshDecoded.iat).toBeGreaterThan(
        accessDecoded.exp - accessDecoded.iat
      );
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify and decode a valid access token', () => {
      const token = generateAccessToken(mockPayload);
      const decoded = verifyAccessToken(token);

      expect(decoded.userId).toBe(mockPayload.userId);
      expect(decoded.email).toBe(mockPayload.email);
      expect(decoded.role).toBe(mockPayload.role);
    });

    it('should throw error for invalid token', () => {
      const invalidToken = 'invalid.token.here';

      expect(() => verifyAccessToken(invalidToken)).toThrow();
    });

    it('should throw error for malformed token', () => {
      const malformedToken = 'not-a-jwt-token';

      expect(() => verifyAccessToken(malformedToken)).toThrow();
    });

    it('should throw error for empty token', () => {
      expect(() => verifyAccessToken('')).toThrow();
    });

    it('should throw error for token signed with wrong secret', () => {
      const token = jwt.sign(mockPayload, 'wrong-secret', { expiresIn: '15m' });

      expect(() => verifyAccessToken(token)).toThrow();
    });

    it('should not verify refresh token as access token', () => {
      const refreshToken = generateRefreshToken(mockPayload);

      expect(() => verifyAccessToken(refreshToken)).toThrow();
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify and decode a valid refresh token', () => {
      const token = generateRefreshToken(mockPayload);
      const decoded = verifyRefreshToken(token);

      expect(decoded.userId).toBe(mockPayload.userId);
      expect(decoded.email).toBe(mockPayload.email);
      expect(decoded.role).toBe(mockPayload.role);
    });

    it('should throw error for invalid token', () => {
      const invalidToken = 'invalid.token.here';

      expect(() => verifyRefreshToken(invalidToken)).toThrow();
    });

    it('should not verify access token as refresh token', () => {
      const accessToken = generateAccessToken(mockPayload);

      expect(() => verifyRefreshToken(accessToken)).toThrow();
    });
  });

  describe('Token Integration', () => {
    it('should complete full token lifecycle', () => {
      // Generate tokens
      const accessToken = generateAccessToken(mockPayload);
      const refreshToken = generateRefreshToken(mockPayload);

      // Verify tokens
      const accessDecoded = verifyAccessToken(accessToken);
      const refreshDecoded = verifyRefreshToken(refreshToken);

      // Check decoded data
      expect(accessDecoded.userId).toBe(mockPayload.userId);
      expect(refreshDecoded.userId).toBe(mockPayload.userId);
    });

    it('should handle different user roles', () => {
      const roles = ['USER', 'SELLER', 'ADMIN'];

      roles.forEach(role => {
        const payload = { ...mockPayload, role };
        const token = generateAccessToken(payload);
        const decoded = verifyAccessToken(token);

        expect(decoded.role).toBe(role);
      });
    });

    it('should maintain payload integrity', () => {
      const customPayload: JWTPayload = {
        userId: 'custom-id-123',
        email: 'custom@example.com',
        role: 'SELLER',
      };

      const token = generateAccessToken(customPayload);
      const decoded = verifyAccessToken(token);

      expect(decoded).toMatchObject(customPayload);
    });
  });
});
