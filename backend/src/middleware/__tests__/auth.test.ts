import { Request, Response, NextFunction } from 'express';
import { authenticate, authorize, AuthRequest } from '../auth';
import * as jwt from '../../utils/jwt';

// Mock the JWT utility
jest.mock('../../utils/jwt');

describe('Authentication Middleware', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn(() => ({ json: jsonMock }));
    mockRequest = {
      headers: {},
    };
    mockResponse = {
      status: statusMock as any,
      json: jsonMock,
    };
    nextFunction = jest.fn();
    jest.clearAllMocks();
  });

  describe('authenticate middleware', () => {
    it('should authenticate valid token and attach user to request', () => {
      const mockPayload = {
        userId: 'test-user-id',
        email: 'test@example.com',
        role: 'USER',
      };

      mockRequest.headers = {
        authorization: 'Bearer valid-token',
      };

      (jwt.verifyAccessToken as jest.Mock).mockReturnValue(mockPayload);

      authenticate(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(jwt.verifyAccessToken).toHaveBeenCalledWith('valid-token');
      expect(mockRequest.user).toEqual(mockPayload);
      expect(nextFunction).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should return 401 when no authorization header is provided', () => {
      mockRequest.headers = {};

      authenticate(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'No token provided' });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 when authorization header does not start with Bearer', () => {
      mockRequest.headers = {
        authorization: 'InvalidFormat token',
      };

      authenticate(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'No token provided' });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 when token verification fails', () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid-token',
      };

      (jwt.verifyAccessToken as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      authenticate(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(jwt.verifyAccessToken).toHaveBeenCalledWith('invalid-token');
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 when token is expired', () => {
      mockRequest.headers = {
        authorization: 'Bearer expired-token',
      };

      (jwt.verifyAccessToken as jest.Mock).mockImplementation(() => {
        throw new Error('Token expired');
      });

      authenticate(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(jwt.verifyAccessToken).toHaveBeenCalledWith('expired-token');
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should handle Bearer token with extra spaces', () => {
      const mockPayload = {
        userId: 'test-user-id',
        email: 'test@example.com',
        role: 'USER',
      };

      mockRequest.headers = {
        authorization: 'Bearer  token-with-space',
      };

      (jwt.verifyAccessToken as jest.Mock).mockReturnValue(mockPayload);

      authenticate(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(jwt.verifyAccessToken).toHaveBeenCalledWith(' token-with-space');
    });
  });

  describe('authorize middleware', () => {
    it('should allow access when user has required role', () => {
      mockRequest.user = {
        userId: 'test-user-id',
        email: 'admin@example.com',
        role: 'ADMIN',
      };

      const middleware = authorize('ADMIN');
      middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should allow access when user has one of multiple required roles', () => {
      mockRequest.user = {
        userId: 'test-user-id',
        email: 'seller@example.com',
        role: 'SELLER',
      };

      const middleware = authorize('ADMIN', 'SELLER');
      middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should return 401 when user is not authenticated', () => {
      mockRequest.user = undefined;

      const middleware = authorize('ADMIN');
      middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Authentication required' });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 403 when user does not have required role', () => {
      mockRequest.user = {
        userId: 'test-user-id',
        email: 'user@example.com',
        role: 'USER',
      };

      const middleware = authorize('ADMIN');
      middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 403 when user role does not match any of required roles', () => {
      mockRequest.user = {
        userId: 'test-user-id',
        email: 'user@example.com',
        role: 'USER',
      };

      const middleware = authorize('ADMIN', 'SELLER');
      middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should handle case-sensitive role matching', () => {
      mockRequest.user = {
        userId: 'test-user-id',
        email: 'admin@example.com',
        role: 'ADMIN',
      };

      const middleware = authorize('admin'); // lowercase
      middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  describe('Integration: authenticate then authorize', () => {
    it('should successfully authenticate and authorize ADMIN user', () => {
      const mockPayload = {
        userId: 'admin-id',
        email: 'admin@example.com',
        role: 'ADMIN',
      };

      mockRequest.headers = {
        authorization: 'Bearer admin-token',
      };

      (jwt.verifyAccessToken as jest.Mock).mockReturnValue(mockPayload);

      // First authenticate
      authenticate(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      expect(mockRequest.user).toEqual(mockPayload);
      expect(nextFunction).toHaveBeenCalledTimes(1);

      // Reset nextFunction mock
      nextFunction = jest.fn();

      // Then authorize
      const middleware = authorize('ADMIN');
      middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should fail authorization when authenticated user lacks required role', () => {
      const mockPayload = {
        userId: 'user-id',
        email: 'user@example.com',
        role: 'USER',
      };

      mockRequest.headers = {
        authorization: 'Bearer user-token',
      };

      (jwt.verifyAccessToken as jest.Mock).mockReturnValue(mockPayload);

      // First authenticate
      authenticate(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      expect(mockRequest.user).toEqual(mockPayload);
      expect(nextFunction).toHaveBeenCalledTimes(1);

      // Reset mocks
      nextFunction = jest.fn();
      jest.clearAllMocks();
      jsonMock = jest.fn();
      statusMock = jest.fn(() => ({ json: jsonMock }));
      mockResponse.status = statusMock as any;

      // Then try to authorize for ADMIN role
      const middleware = authorize('ADMIN');
      middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });
});
