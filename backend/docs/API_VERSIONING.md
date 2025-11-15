# API Versioning Strategy

## Overview

TCG Dojo API uses URL-based versioning to ensure backward compatibility while allowing new features and breaking changes.

## Versioning Scheme

### URL-Based Versioning (Recommended)

```
https://api.tcgdojo.com/api/v1/products
https://api.tcgdojo.com/api/v2/products
```

### Header-Based Versioning (Alternative)

```http
GET /api/products HTTP/1.1
Host: api.tcgdojo.com
API-Version: 2
```

or

```http
GET /api/products HTTP/1.1
Host: api.tcgdojo.com
Accept-Version: 2.0
```

## Supported Versions

- **v1** (Current/Default) - Original API, stable and production-ready
- **v2** (Latest) - New features, improved performance, some breaking changes

## Migration Path

### Current Unversioned Routes

All current unversioned routes (e.g., `/api/products`) are treated as **v1** by default.

```javascript
// These are equivalent:
GET /api/products
GET /api/v1/products
```

### Migrating to v2

To use v2 features, explicitly specify the version:

```javascript
// URL-based
GET /api/v2/products

// Header-based
GET /api/products
API-Version: 2
```

## Breaking Changes in v2

### 1. Authentication Response

**v1:**
```json
{
  "user": { "id": "123", "email": "user@example.com" },
  "accessToken": "...",
  "refreshToken": "..."
}
```

**v2:**
```json
{
  "user": { "id": "123", "email": "user@example.com" }
  // Tokens now in HttpOnly cookies (not in response)
}
```

### 2. Pagination Format

**v1:**
```json
{
  "products": [...],
  "total": 100,
  "page": 1,
  "limit": 20
}
```

**v2:**
```json
{
  "data": [...],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5,
    "hasNext": true,
    "hasPrevious": false
  }
}
```

### 3. Error Response Format

**v1:**
```json
{
  "error": "Product not found",
  "message": "...",
  "code": "PRODUCT_NOT_FOUND"
}
```

**v2:**
```json
{
  "status": "error",
  "error": {
    "code": "PRODUCT_NOT_FOUND",
    "message": "Product not found",
    "details": {...}
  },
  "requestId": "req-123-456"
}
```

## Implementation Guide

### For Backend Developers

#### 1. Add Version to Existing Routes

```typescript
import { Router } from 'express';
import { apiVersionMiddleware } from '../middleware/apiVersion';

const router = Router();

// Apply version middleware
router.use(apiVersionMiddleware);

// Version-specific handlers
router.get('/products', (req: VersionedRequest, res) => {
  if (req.apiVersion === '2') {
    // v2 logic
    return res.json({ data: products, pagination: {...} });
  }

  // v1 logic (default)
  return res.json({ products, total, page, limit });
});
```

#### 2. Deprecate Old Endpoints

```typescript
import { deprecateInVersion } from '../middleware/apiVersion';

router.get(
  '/old-endpoint',
  deprecateInVersion('1', 'This endpoint is deprecated. Use /api/v2/new-endpoint instead'),
  handler
);
```

#### 3. Version-Specific Routes

```typescript
import { versionedRoute, requireApiVersion } from '../middleware/apiVersion';

// Only available in v2
router.get('/new-feature', requireApiVersion('2'), newFeatureHandler);

// Different logic per version
router.get('/products',
  versionedRoute('2', getProductsV2),
  versionedRoute('1', getProductsV1)
);
```

### For Frontend Developers

#### 1. Specify API Version

```typescript
// axios configuration
const api = axios.create({
  baseURL: 'https://api.tcgdojo.com/api/v2',
  headers: {
    'API-Version': '2',
  },
});
```

#### 2. Handle Version Errors

```typescript
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 400 && error.response?.data?.error === 'Unsupported API version') {
      console.error('API version not supported:', error.response.data);
      // Fallback to v1 or show upgrade message
    }
    return Promise.reject(error);
  }
);
```

#### 3. Check Deprecation Warnings

```typescript
api.interceptors.response.use((response) => {
  if (response.headers['deprecation'] === 'true') {
    console.warn('API Deprecation Warning:', {
      endpoint: response.config.url,
      sunset: response.headers['sunset'],
      message: response.data._deprecation?.message,
    });
  }
  return response;
});
```

## Version Lifecycle

### 1. Development Phase

- New version is in beta/preview
- Can have breaking changes
- Not recommended for production

### 2. Stable Release

- Version is production-ready
- No breaking changes within version
- Full documentation available

### 3. Deprecation

- Old version marked as deprecated
- Deprecation headers added
- Migration guide provided
- 90-day sunset period

### 4. Sunset

- Old version no longer supported
- Returns 410 Gone for deprecated endpoints
- Users must migrate to new version

## Best Practices

### 1. Always Specify Version

```typescript
// Good
GET /api/v2/products

// Avoid (relies on default)
GET /api/products
```

### 2. Monitor Deprecation Warnings

```typescript
// Log all deprecation warnings
if (response.data._deprecation) {
  logger.warn('Deprecated API usage', {
    endpoint: url,
    warning: response.data._deprecation,
  });
}
```

### 3. Test Both Versions

```typescript
// Integration tests
describe('Products API', () => {
  it('should work in v1', async () => {
    const res = await request(app).get('/api/v1/products');
    expect(res.body).toHaveProperty('products');
  });

  it('should work in v2', async () => {
    const res = await request(app).get('/api/v2/products');
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('pagination');
  });
});
```

### 4. Gradual Migration

```typescript
// Phase 1: Support both versions
if (apiVersion === '2') {
  return newImplementation();
}
return legacyImplementation();

// Phase 2: Migrate majority of traffic
// Phase 3: Deprecate old version
// Phase 4: Remove old version
```

## FAQ

### Q: Can I use different versions for different endpoints?

**A:** Yes! You can mix versions:
```
GET /api/v1/products  // v1 products
GET /api/v2/orders    // v2 orders
```

### Q: What happens if I don't specify a version?

**A:** Unversioned routes default to v1 for backward compatibility.

### Q: How long are old versions supported?

**A:** Each version is supported for at least 6 months after deprecation. We provide 90 days' notice before sunset.

### Q: Can I opt-in to beta features?

**A:** Yes, use version numbers like `v2-beta` or check feature flags API.

## Support

- Documentation: https://docs.tcgdojo.com/api
- Migration guides: https://docs.tcgdojo.com/api/migration
- Changelog: https://docs.tcgdojo.com/api/changelog

## Examples

See `examples/api-versioning/` for complete examples of:
- Version migration scripts
- Client libraries with version support
- Testing strategies for multi-version APIs
