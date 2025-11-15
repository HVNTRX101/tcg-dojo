import { Request, Response, NextFunction } from 'express';
import {
  xssProtection,
  hppProtection,
  csrfProtection,
  sqlInjectionProtection,
  securityLogger,
} from '../security';
import { mockRequest, mockResponse, mockNext } from '../../__tests__/helpers/testUtils';

// Mock Redis module to prevent actual Redis connections during tests
jest.mock('../../config/redis', () => ({
  getRedisClient: jest.fn().mockReturnValue(null),
  isRedisConnected: jest.fn().mockReturnValue(false),
}));

describe('Security Middleware', () => {
  describe('xssProtection', () => {
    it('should sanitize XSS in request body', () => {
      const req = mockRequest({
        body: {
          name: '<script>alert("XSS")</script>',
          description: 'Normal text with <img src=x onerror=alert("XSS")>',
        },
      });
      const res = mockResponse();
      const next = mockNext();

      xssProtection(req as Request, res as Response, next);

      expect(req.body.name).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;');
      expect(req.body.description).toContain('&lt;img');
      expect(next).toHaveBeenCalled();
    });

    it('should sanitize XSS in query parameters', () => {
      const req = mockRequest({
        query: {
          search: '<script>alert("XSS")</script>',
        },
      });
      const res = mockResponse();
      const next = mockNext();

      xssProtection(req as Request, res as Response, next);

      expect(req.query!.search).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;');
      expect(next).toHaveBeenCalled();
    });

    it('should sanitize XSS in URL parameters', () => {
      const req = mockRequest({
        params: {
          id: '<script>alert("XSS")</script>',
        },
      });
      const res = mockResponse();
      const next = mockNext();

      xssProtection(req as Request, res as Response, next);

      expect(req.params!.id).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;');
      expect(next).toHaveBeenCalled();
    });

    it('should handle nested objects', () => {
      const req = mockRequest({
        body: {
          user: {
            name: '<script>alert("XSS")</script>',
            profile: {
              bio: '<img src=x onerror=alert("XSS")>',
            },
          },
        },
      });
      const res = mockResponse();
      const next = mockNext();

      xssProtection(req as Request, res as Response, next);

      expect(req.body.user.name).toContain('&lt;script&gt;');
      expect(req.body.user.profile.bio).toContain('&lt;img');
      expect(next).toHaveBeenCalled();
    });

    it('should handle arrays', () => {
      const req = mockRequest({
        body: {
          items: ['<script>alert("XSS")</script>', 'normal text'],
        },
      });
      const res = mockResponse();
      const next = mockNext();

      xssProtection(req as Request, res as Response, next);

      expect(req.body.items[0]).toContain('&lt;script&gt;');
      expect(req.body.items[1]).toBe('normal text');
      expect(next).toHaveBeenCalled();
    });

    it('should not modify non-string values', () => {
      const req = mockRequest({
        body: {
          count: 123,
          active: true,
          data: null,
        },
      });
      const res = mockResponse();
      const next = mockNext();

      xssProtection(req as Request, res as Response, next);

      expect(req.body.count).toBe(123);
      expect(req.body.active).toBe(true);
      expect(req.body.data).toBe(null);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('hppProtection', () => {
    it('should prevent parameter pollution for non-whitelisted params', () => {
      const req = mockRequest({
        query: {
          id: ['1', '2', '3'],
        },
      });
      const res = mockResponse();
      const next = mockNext();

      hppProtection(req as Request, res as Response, next);

      expect(req.query!.id).toBe('3'); // Should take last value
      expect(next).toHaveBeenCalled();
    });

    it('should allow arrays for whitelisted parameters', () => {
      const req = mockRequest({
        query: {
          tags: ['tag1', 'tag2', 'tag3'],
          filters: ['filter1', 'filter2'],
        },
      });
      const res = mockResponse();
      const next = mockNext();

      hppProtection(req as Request, res as Response, next);

      expect(Array.isArray(req.query!.tags)).toBe(true);
      expect(req.query!.tags).toHaveLength(3);
      expect(Array.isArray(req.query!.filters)).toBe(true);
      expect(req.query!.filters).toHaveLength(2);
      expect(next).toHaveBeenCalled();
    });

    it('should handle mixed whitelisted and non-whitelisted params', () => {
      const req = mockRequest({
        query: {
          tags: ['tag1', 'tag2'],
          id: ['1', '2'],
        },
      });
      const res = mockResponse();
      const next = mockNext();

      hppProtection(req as Request, res as Response, next);

      expect(Array.isArray(req.query!.tags)).toBe(true);
      expect(req.query!.id).toBe('2');
      expect(next).toHaveBeenCalled();
    });
  });

  describe('csrfProtection', () => {
    it('should allow GET requests without origin check', () => {
      const req = mockRequest({
        method: 'GET',
      });
      const res = mockResponse();
      const next = mockNext();

      csrfProtection(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
    });

    it('should allow HEAD requests without origin check', () => {
      const req = mockRequest({
        method: 'HEAD',
      });
      const res = mockResponse();
      const next = mockNext();

      csrfProtection(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
    });

    it('should allow OPTIONS requests without origin check', () => {
      const req = mockRequest({
        method: 'OPTIONS',
      });
      const res = mockResponse();
      const next = mockNext();

      csrfProtection(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
    });

    it('should allow POST requests from allowed origins', () => {
      const req = mockRequest({
        method: 'POST',
        headers: {
          origin: 'http://localhost:5173',
        },
      });
      const res = mockResponse();
      const next = mockNext();

      csrfProtection(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
    });

    it('should reject POST requests from disallowed origins', () => {
      const req = mockRequest({
        method: 'POST',
        headers: {
          origin: 'http://malicious-site.com',
        },
      });
      const res = mockResponse();
      const next = mockNext();

      csrfProtection(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Forbidden',
        message: 'CSRF validation failed: Invalid origin',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should allow requests without origin header (same-origin)', () => {
      const req = mockRequest({
        method: 'POST',
      });
      const res = mockResponse();
      const next = mockNext();

      csrfProtection(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('sqlInjectionProtection', () => {
    it('should block requests with SQL injection patterns in body', () => {
      const req = mockRequest({
        body: {
          query: "SELECT * FROM users WHERE id = '1' OR '1'='1'",
        },
      });
      const res = mockResponse();
      const next = mockNext();

      sqlInjectionProtection(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Bad Request',
        message: 'Invalid input detected',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should block requests with SQL injection patterns in query params', () => {
      const req = mockRequest({
        query: {
          search: 'test; DROP TABLE users;',
        },
      });
      const res = mockResponse();
      const next = mockNext();

      sqlInjectionProtection(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });

    it('should block requests with various SQL keywords', () => {
      const keywords = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER', 'EXEC', 'UNION'];

      keywords.forEach(keyword => {
        const req = mockRequest({
          body: {
            text: `Some text with ${keyword} keyword`,
          },
        });
        const res = mockResponse();
        const next = mockNext();

        sqlInjectionProtection(req as Request, res as Response, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(next).not.toHaveBeenCalled();
      });
    });

    it('should allow normal requests without SQL patterns', () => {
      const req = mockRequest({
        body: {
          name: 'John Doe',
          email: 'john@example.com',
          message: 'Hello, this is a normal message',
        },
      });
      const res = mockResponse();
      const next = mockNext();

      sqlInjectionProtection(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should handle nested objects with SQL injection attempts', () => {
      const req = mockRequest({
        body: {
          user: {
            profile: {
              bio: 'DROP TABLE users',
            },
          },
        },
      });
      const res = mockResponse();
      const next = mockNext();

      sqlInjectionProtection(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('securityLogger', () => {
    it('should attach security log information to request', () => {
      const req = mockRequest({
        method: 'POST',
        path: '/api/users',
        ip: '127.0.0.1',
        headers: {
          'user-agent': 'Mozilla/5.0',
          origin: 'http://localhost:5173',
          referer: 'http://localhost:5173/login',
        },
      });
      const res = mockResponse();
      const next = mockNext();

      securityLogger(req as Request, res as Response, next);

      expect((req as any).securityLog).toBeDefined();
      expect((req as any).securityLog.userAgent).toBe('Mozilla/5.0');
      expect((req as any).securityLog.ip).toBe('127.0.0.1');
      expect((req as any).securityLog.method).toBe('POST');
      expect((req as any).securityLog.path).toBe('/api/users');
      expect((req as any).securityLog.origin).toBe('http://localhost:5173');
      expect((req as any).securityLog.referer).toBe('http://localhost:5173/login');
      expect(next).toHaveBeenCalled();
    });

    it('should handle missing headers gracefully', () => {
      const req = mockRequest({
        method: 'GET',
        path: '/api/health',
      });
      const res = mockResponse();
      const next = mockNext();

      securityLogger(req as Request, res as Response, next);

      expect((req as any).securityLog).toBeDefined();
      expect((req as any).securityLog.userAgent).toBeUndefined();
      expect((req as any).securityLog.origin).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });
  });
});
