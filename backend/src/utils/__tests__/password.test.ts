import { hashPassword, comparePassword } from '../password';
import bcrypt from 'bcrypt';

describe('Password Utils', () => {
  describe('hashPassword', () => {
    it('should hash a password successfully', async () => {
      const password = 'TestPassword123!';
      const hashedPassword = await hashPassword(password);

      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword.length).toBeGreaterThan(0);
    });

    it('should generate different hashes for the same password', async () => {
      const password = 'TestPassword123!';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty password', async () => {
      const password = '';
      const hashedPassword = await hashPassword(password);

      expect(hashedPassword).toBeDefined();
      expect(hashedPassword.length).toBeGreaterThan(0);
    });

    it('should handle special characters in password', async () => {
      const password = 'P@$$w0rd!#%&*()';
      const hashedPassword = await hashPassword(password);

      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(password);
    });

    it('should hash long passwords', async () => {
      const password = 'a'.repeat(100);
      const hashedPassword = await hashPassword(password);

      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(password);
    });
  });

  describe('comparePassword', () => {
    it('should return true for matching passwords', async () => {
      const password = 'TestPassword123!';
      const hashedPassword = await hashPassword(password);
      const result = await comparePassword(password, hashedPassword);

      expect(result).toBe(true);
    });

    it('should return false for non-matching passwords', async () => {
      const password = 'TestPassword123!';
      const wrongPassword = 'WrongPassword456!';
      const hashedPassword = await hashPassword(password);
      const result = await comparePassword(wrongPassword, hashedPassword);

      expect(result).toBe(false);
    });

    it('should be case sensitive', async () => {
      const password = 'TestPassword123!';
      const hashedPassword = await hashPassword(password);
      const result = await comparePassword('testpassword123!', hashedPassword);

      expect(result).toBe(false);
    });

    it('should handle empty password comparison', async () => {
      const hashedPassword = await hashPassword('test');
      const result = await comparePassword('', hashedPassword);

      expect(result).toBe(false);
    });

    it('should handle special characters correctly', async () => {
      const password = 'P@$$w0rd!#%&*()';
      const hashedPassword = await hashPassword(password);
      const result = await comparePassword(password, hashedPassword);

      expect(result).toBe(true);
    });

    it('should handle invalid hash format', async () => {
      const password = 'TestPassword123!';
      const invalidHash = 'invalid_hash_string';

      // bcrypt.compare returns false for invalid hashes instead of throwing
      const result = await comparePassword(password, invalidHash);
      expect(result).toBe(false);
    });
  });

  describe('Integration', () => {
    it('should handle full password lifecycle', async () => {
      const originalPassword = 'MySecurePassword123!';

      // Hash the password
      const hashedPassword = await hashPassword(originalPassword);

      // Verify correct password
      const correctMatch = await comparePassword(originalPassword, hashedPassword);
      expect(correctMatch).toBe(true);

      // Verify incorrect password
      const incorrectMatch = await comparePassword('WrongPassword123!', hashedPassword);
      expect(incorrectMatch).toBe(false);
    });

    it('should be compatible with bcrypt directly', async () => {
      const password = 'TestPassword123!';
      const hashedPassword = await hashPassword(password);

      // Use bcrypt directly to compare
      const result = await bcrypt.compare(password, hashedPassword);
      expect(result).toBe(true);
    });
  });
});
