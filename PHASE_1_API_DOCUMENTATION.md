# Phase 1 - Complete API Documentation

**Version**: 1.0
**Last Updated**: November 2, 2025
**Base URL**: `http://localhost:3000`
**Status**: Phase 1 Complete ✅

---

## Table of Contents

1. [Authentication](#authentication)
2. [Products](#products)
3. [Search](#search)
4. [Price History](#price-history)
5. [Recommendations](#recommendations)
6. [Images](#images)
7. [Cart](#cart)
8. [Orders](#orders)
9. [Payment](#payment)
10. [Games & Sets](#games--sets)
11. [Error Handling](#error-handling)

---

## Authentication

### Register User

Creates a new user account.

**Endpoint**: `POST /api/auth/register`

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "John Doe",
  "role": "USER"
}
```

**Roles**: `USER`, `SELLER`, `ADMIN`

**Response** (200):
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "USER"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### Login

Authenticates a user and returns tokens.

**Endpoint**: `POST /api/auth/login`

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response** (200):
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "USER"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### Refresh Token

Gets a new access token using refresh token.

**Endpoint**: `POST /api/auth/refresh`

**Request Body**:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response** (200):
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## Products

### Get All Products

Retrieves a paginated list of products.

**Endpoint**: `GET /api/products`

**Query Parameters**:
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 20)
- `gameId` (string, optional): Filter by game
- `setId` (string, optional): Filter by set
- `condition` (string, optional): Filter by condition
- `finish` (string, optional): Filter by finish
- `minPrice` (number, optional): Minimum price
- `maxPrice` (number, optional): Maximum price

**Response** (200):
```json
{
  "products": [
    {
      "id": "uuid",
      "name": "Charizard VMAX",
      "description": "Rare holographic card",
      "price": 499.99,
      "quantity": 5,
      "condition": "NEAR_MINT",
      "rarity": "Ultra Rare",
      "finish": "HOLO",
      "language": "English",
      "cardNumber": "4/102",
      "game": {
        "id": "uuid",
        "name": "Pokemon"
      },
      "set": {
        "id": "uuid",
        "name": "Base Set",
        "code": "BASE"
      },
      "seller": {
        "id": "uuid",
        "businessName": "Card Kingdom",
        "rating": 4.8,
        "isVerified": true
      },
      "images": [
        {
          "id": "uuid",
          "url": "https://res.cloudinary.com/...",
          "isPrimary": true,
          "displayOrder": 0
        }
      ],
      "createdAt": "2025-11-02T10:00:00Z",
      "updatedAt": "2025-11-02T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

---

### Get Product by ID

Retrieves detailed information about a specific product.

**Endpoint**: `GET /api/products/:productId`

**Response** (200):
```json
{
  "id": "uuid",
  "name": "Charizard VMAX",
  "description": "Rare holographic card from Base Set",
  "price": 499.99,
  "quantity": 5,
  "condition": "NEAR_MINT",
  "rarity": "Ultra Rare",
  "finish": "HOLO",
  "language": "English",
  "cardNumber": "4/102",
  "imageUrl": null,
  "game": {
    "id": "uuid",
    "name": "Pokemon",
    "description": "Pokemon Trading Card Game",
    "imageUrl": "https://..."
  },
  "set": {
    "id": "uuid",
    "name": "Base Set",
    "code": "BASE",
    "releaseDate": "1999-01-09"
  },
  "seller": {
    "id": "uuid",
    "businessName": "Card Kingdom",
    "description": "Premium TCG seller",
    "rating": 4.8,
    "isVerified": true,
    "totalSales": 1000,
    "joinedDate": "2020-01-01"
  },
  "images": [
    {
      "id": "uuid",
      "url": "https://res.cloudinary.com/...",
      "alt": "Charizard VMAX front",
      "isPrimary": true,
      "displayOrder": 0
    }
  ],
  "createdAt": "2025-11-02T10:00:00Z",
  "updatedAt": "2025-11-02T10:00:00Z"
}
```

---

### Create Product

Creates a new product listing (SELLER/ADMIN only).

**Endpoint**: `POST /api/products`

**Headers**:
- `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "name": "Black Lotus",
  "description": "Alpha Edition - Near Mint",
  "gameId": "uuid",
  "setId": "uuid",
  "price": 25000.00,
  "quantity": 1,
  "condition": "NEAR_MINT",
  "rarity": "Rare",
  "finish": "NORMAL",
  "language": "English",
  "cardNumber": "A1"
}
```

**Response** (201):
```json
{
  "id": "uuid",
  "name": "Black Lotus",
  "price": 25000.00,
  ...
}
```

---

### Update Product

Updates an existing product (SELLER/ADMIN only).

**Endpoint**: `PUT /api/products/:productId`

**Headers**:
- `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "price": 24500.00,
  "quantity": 2
}
```

**Response** (200):
```json
{
  "id": "uuid",
  "name": "Black Lotus",
  "price": 24500.00,
  "quantity": 2,
  ...
}
```

**Note**: Price updates automatically create price history records.

---

### Delete Product

Deletes a product (SELLER/ADMIN only).

**Endpoint**: `DELETE /api/products/:productId`

**Headers**:
- `Authorization: Bearer <token>`

**Response** (200):
```json
{
  "message": "Product deleted successfully"
}
```

---

## Search

### Enhanced Product Search

Performs intelligent product search with relevance scoring.

**Endpoint**: `GET /api/search/products`

**Query Parameters**:
- `q` (string, required): Search query
- `gameId` (string, optional): Filter by game
- `setId` (string, optional): Filter by set
- `condition` (string, optional): Filter by condition
- `finish` (string, optional): Filter by finish
- `minPrice` (number, optional): Minimum price
- `maxPrice` (number, optional): Maximum price
- `rarity` (string or array, optional): Filter by rarity
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 20)
- `sortBy` (string, optional): Sort field (default: "relevance")
- `sortOrder` (string, optional): "asc" or "desc" (default: "desc")

**Example Request**:
```
GET /api/search/products?q=charizard&gameId=uuid&minPrice=10&maxPrice=100&sortBy=relevance
```

**Response** (200):
```json
{
  "query": "charizard",
  "products": [
    {
      "id": "uuid",
      "name": "Charizard VMAX",
      "price": 79.99,
      "relevanceScore": 100,
      "game": { "id": "uuid", "name": "Pokemon" },
      "set": { "id": "uuid", "name": "Sword & Shield", "code": "SWSH" },
      "seller": { "id": "uuid", "businessName": "TCG Vault", "rating": 4.9 },
      "images": [...]
    }
  ],
  "pagination": {
    "total": 25,
    "page": 1,
    "limit": 20,
    "totalPages": 2
  }
}
```

**Relevance Scoring Algorithm**:
- Exact name match: 100 points
- Name starts with query: 50 points
- Name contains query: 30 points
- Card number match: 40 points
- Description contains query: 10 points
- Fuzzy match (≤3 char distance): 5-15 points

---

### Search Autocomplete

Provides search suggestions as user types.

**Endpoint**: `GET /api/search/autocomplete`

**Query Parameters**:
- `q` (string, required): Partial search query (min 2 characters)
- `limit` (number, optional): Max suggestions (default: 10)

**Example Request**:
```
GET /api/search/autocomplete?q=char&limit=5
```

**Response** (200):
```json
{
  "query": "char",
  "suggestions": [
    {
      "id": "uuid",
      "name": "Charizard",
      "cardNumber": "4/102",
      "game": "Pokemon",
      "set": "Base Set",
      "suggestion": "Charizard (4/102) - Pokemon"
    },
    {
      "id": "uuid",
      "name": "Charizard V",
      "cardNumber": "019/189",
      "game": "Pokemon",
      "set": "Sword & Shield",
      "suggestion": "Charizard V (019/189) - Pokemon"
    }
  ],
  "count": 2
}
```

---

### Popular Searches

Gets most popular products based on review count.

**Endpoint**: `GET /api/search/popular`

**Query Parameters**:
- `limit` (number, optional): Max results (default: 10)

**Response** (200):
```json
{
  "popular": [
    {
      "name": "Charizard",
      "game": "Pokemon",
      "reviewCount": 150
    },
    {
      "name": "Black Lotus",
      "game": "Magic: The Gathering",
      "reviewCount": 89
    }
  ],
  "count": 10
}
```

---

### Trending Searches

Gets products with recent price drops.

**Endpoint**: `GET /api/search/trending`

**Query Parameters**:
- `limit` (number, optional): Max results (default: 10)

**Response** (200):
```json
{
  "trending": [
    {
      "productId": "uuid",
      "name": "Pikachu VMAX",
      "game": "Pokemon",
      "priceDropPercentage": -15.5
    }
  ],
  "count": 5
}
```

---

## Price History

### Get Price History

Retrieves price history for a product.

**Endpoint**: `GET /api/price-history/products/:productId/price-history`

**Query Parameters**:
- `limit` (number, optional): Max records (default: 50)

**Response** (200):
```json
{
  "productId": "uuid",
  "history": [
    {
      "id": "uuid",
      "price": 29.99,
      "previousPrice": 34.99,
      "changeType": "DECREASE",
      "changePercentage": -14.29,
      "createdAt": "2025-11-02T10:00:00Z"
    }
  ],
  "count": 10
}
```

---

### Get Price Trends

Gets price trend analysis and statistics.

**Endpoint**: `GET /api/price-history/products/:productId/price-trends`

**Response** (200):
```json
{
  "productId": "uuid",
  "trends": {
    "currentPrice": 29.99,
    "lowestPrice": 25.00,
    "highestPrice": 45.00,
    "averagePrice": 32.50,
    "totalChanges": 15,
    "increases": 7,
    "decreases": 8
  }
}
```

---

### Get Recent Price Drops

Finds products with recent price decreases.

**Endpoint**: `GET /api/price-history/price-drops`

**Query Parameters**:
- `days` (number, optional): Lookback period (default: 7)
- `limit` (number, optional): Max results (default: 20)

**Response** (200):
```json
{
  "priceDrops": [
    {
      "product": {
        "id": "uuid",
        "name": "Charizard V",
        "currentPrice": 39.99,
        "game": { "name": "Pokemon" },
        "seller": { "businessName": "TCG Vault" }
      },
      "priceChange": {
        "oldPrice": 45.99,
        "newPrice": 39.99,
        "changePercentage": -13.05,
        "changedAt": "2025-11-01T15:30:00Z"
      }
    }
  ],
  "count": 5
}
```

---

### Compare Product Prices

Compares prices across sellers for similar products.

**Endpoint**: `GET /api/price-history/compare`

**Query Parameters**:
- `productName` (string, required): Product name to search
- `gameId` (string, required): Game ID
- `setId` (string, optional): Set ID

**Example Request**:
```
GET /api/price-history/compare?productName=Charizard&gameId=uuid
```

**Response** (200):
```json
{
  "query": {
    "productName": "Charizard",
    "gameId": "uuid",
    "setId": null
  },
  "results": [
    {
      "id": "uuid",
      "name": "Charizard V",
      "currentPrice": 45.99,
      "condition": "MINT",
      "finish": "HOLO",
      "seller": {
        "id": "uuid",
        "businessName": "TCG Vault",
        "rating": 4.9,
        "isVerified": true
      },
      "lastPriceChange": {
        "price": 45.99,
        "previousPrice": 49.99,
        "changeType": "DECREASE",
        "changePercentage": -8.0,
        "createdAt": "2025-10-28T10:00:00Z"
      }
    },
    {
      "id": "uuid",
      "name": "Charizard",
      "currentPrice": 499.99,
      "condition": "NEAR_MINT",
      "finish": "HOLO",
      "seller": {
        "id": "uuid",
        "businessName": "Card Kingdom",
        "rating": 4.8,
        "isVerified": true
      },
      "lastPriceChange": null
    }
  ],
  "count": 2
}
```

---

### Get Price Recommendations

Finds products that are good deals based on price history.

**Endpoint**: `GET /api/price-history/recommendations`

**Query Parameters**:
- `limit` (number, optional): Max results (default: 20)

**Response** (200):
```json
{
  "recommendations": [
    {
      "product": {
        "id": "uuid",
        "name": "Pikachu VMAX",
        "currentPrice": 75.00,
        "averagePrice": 90.00,
        "discount": 16.67
      }
    }
  ],
  "count": 10
}
```

---

## Recommendations

### Get Related Products

Gets products similar to the specified product.

**Endpoint**: `GET /api/recommendations/products/:productId/related`

**Query Parameters**:
- `limit` (number, optional): Max results (default: 10)

**Response** (200):
```json
{
  "productId": "uuid",
  "products": [
    {
      "id": "uuid",
      "name": "Pikachu VMAX",
      "similarityScore": 95,
      "price": 89.99,
      "game": { "name": "Pokemon" },
      "set": { "name": "Sword & Shield" },
      "seller": { "businessName": "Card Kingdom" },
      "images": [...]
    }
  ],
  "count": 5
}
```

**Similarity Algorithm**:
- Same game (required)
- Same set: +50 points
- Same rarity: +30 points
- Same finish: +20 points
- Similar price (within 50%): +15 points
- Same condition: +10 points
- Verified seller: +5 points

---

### Get Products from Same Seller

Gets other products from the same seller.

**Endpoint**: `GET /api/recommendations/products/:productId/same-seller`

**Query Parameters**:
- `limit` (number, optional): Max results (default: 10)

**Response** (200):
```json
{
  "productId": "uuid",
  "products": [
    {
      "id": "uuid",
      "name": "Black Lotus",
      "price": 25000.00,
      "game": { "name": "Magic: The Gathering" },
      "seller": { "businessName": "TCG Vault" }
    }
  ],
  "count": 3
}
```

---

### Get Products from Same Set

Gets other products from the same card set.

**Endpoint**: `GET /api/recommendations/products/:productId/same-set`

**Query Parameters**:
- `limit` (number, optional): Max results (default: 10)

**Response** (200):
```json
{
  "productId": "uuid",
  "products": [
    {
      "id": "uuid",
      "name": "Blastoise",
      "price": 299.99,
      "set": { "name": "Base Set", "code": "BASE" }
    }
  ],
  "count": 5
}
```

---

### Get Frequently Bought Together

Gets products often purchased together.

**Endpoint**: `GET /api/recommendations/products/:productId/bought-together`

**Query Parameters**:
- `limit` (number, optional): Max results (default: 10)

**Response** (200):
```json
{
  "productId": "uuid",
  "products": [
    {
      "id": "uuid",
      "name": "Card Sleeves",
      "price": 9.99,
      "coOccurrenceCount": 25
    }
  ],
  "count": 5
}
```

---

### Get Personalized Recommendations

Gets personalized product recommendations based on user history.

**Endpoint**: `GET /api/recommendations/personalized`

**Headers**:
- `Authorization: Bearer <token>`

**Query Parameters**:
- `limit` (number, optional): Max results (default: 20)

**Response** (200):
```json
{
  "recommendations": [
    {
      "id": "uuid",
      "name": "Recommended Product",
      "price": 49.99,
      "reason": "Based on your Pokemon purchases"
    }
  ],
  "count": 20
}
```

---

## Images

### Get Product Images

Gets all images for a product.

**Endpoint**: `GET /api/products/:productId/images`

**Response** (200):
```json
{
  "images": [
    {
      "id": "uuid",
      "productId": "uuid",
      "url": "https://res.cloudinary.com/...",
      "publicId": "tcg-marketplace/abc123",
      "alt": "Charizard front",
      "displayOrder": 0,
      "isPrimary": true,
      "createdAt": "2025-11-02T10:00:00Z"
    }
  ]
}
```

---

### Upload Single Image

Uploads a single product image (SELLER/ADMIN only).

**Endpoint**: `POST /api/products/:productId/images`

**Headers**:
- `Authorization: Bearer <token>`
- `Content-Type: multipart/form-data`

**Form Data**:
- `image` (file): Image file (JPEG, PNG, GIF, WebP)
- `alt` (string, optional): Alt text

**Max File Size**: 10MB

**Response** (201):
```json
{
  "image": {
    "id": "uuid",
    "url": "https://res.cloudinary.com/...",
    "publicId": "tcg-marketplace/abc123",
    "alt": null,
    "isPrimary": true,
    "displayOrder": 0
  },
  "message": "Image uploaded successfully"
}
```

**Image Processing**:
- Automatic resizing (max 2000x2000px)
- JPEG optimization (85% quality)
- Progressive loading
- Thumbnail generation (300x300px)

---

### Upload Multiple Images

Uploads multiple product images (SELLER/ADMIN only).

**Endpoint**: `POST /api/products/:productId/images/bulk`

**Headers**:
- `Authorization: Bearer <token>`
- `Content-Type: multipart/form-data`

**Form Data**:
- `images` (files): Multiple image files (max 10)

**Response** (201):
```json
{
  "images": [
    {
      "id": "uuid",
      "url": "https://res.cloudinary.com/...",
      "isPrimary": false,
      "displayOrder": 1
    }
  ],
  "count": 3,
  "message": "3 images uploaded successfully"
}
```

---

### Set Primary Image

Sets an image as the primary product image (SELLER/ADMIN only).

**Endpoint**: `PUT /api/products/:productId/images/:imageId/primary`

**Headers**:
- `Authorization: Bearer <token>`

**Response** (200):
```json
{
  "image": {
    "id": "uuid",
    "isPrimary": true
  },
  "message": "Primary image updated"
}
```

---

### Reorder Images

Changes the display order of product images (SELLER/ADMIN only).

**Endpoint**: `PUT /api/products/:productId/images/reorder`

**Headers**:
- `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "imageIds": ["uuid1", "uuid2", "uuid3"]
}
```

**Response** (200):
```json
{
  "images": [
    {
      "id": "uuid1",
      "displayOrder": 0
    },
    {
      "id": "uuid2",
      "displayOrder": 1
    }
  ],
  "message": "Image order updated"
}
```

---

### Delete Image

Deletes a product image (SELLER/ADMIN only).

**Endpoint**: `DELETE /api/products/:productId/images/:imageId`

**Headers**:
- `Authorization: Bearer <token>`

**Response** (200):
```json
{
  "message": "Image deleted successfully"
}
```

**Note**: If deleting the primary image, another image will automatically become primary.

---

## Cart

### Get Cart

Gets the current user's shopping cart.

**Endpoint**: `GET /api/cart`

**Headers**:
- `Authorization: Bearer <token>`

**Response** (200):
```json
{
  "cart": {
    "id": "uuid",
    "userId": "uuid",
    "items": [
      {
        "id": "uuid",
        "productId": "uuid",
        "quantity": 2,
        "product": {
          "id": "uuid",
          "name": "Charizard",
          "price": 499.99,
          "images": [...]
        },
        "subtotal": 999.98
      }
    ],
    "subtotal": 999.98,
    "tax": 89.99,
    "total": 1089.97,
    "itemCount": 2
  }
}
```

---

### Add Item to Cart

Adds a product to the cart.

**Endpoint**: `POST /api/cart/items`

**Headers**:
- `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "productId": "uuid",
  "quantity": 1
}
```

**Response** (201):
```json
{
  "item": {
    "id": "uuid",
    "productId": "uuid",
    "quantity": 1
  },
  "cart": {
    "itemCount": 3,
    "total": 1589.96
  }
}
```

---

### Update Cart Item

Updates the quantity of a cart item.

**Endpoint**: `PUT /api/cart/items/:itemId`

**Headers**:
- `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "quantity": 3
}
```

**Response** (200):
```json
{
  "item": {
    "id": "uuid",
    "quantity": 3
  },
  "cart": {
    "total": 1499.97
  }
}
```

---

### Remove Cart Item

Removes an item from the cart.

**Endpoint**: `DELETE /api/cart/items/:itemId`

**Headers**:
- `Authorization: Bearer <token>`

**Response** (200):
```json
{
  "message": "Item removed from cart",
  "cart": {
    "itemCount": 1,
    "total": 499.99
  }
}
```

---

### Clear Cart

Removes all items from the cart.

**Endpoint**: `DELETE /api/cart`

**Headers**:
- `Authorization: Bearer <token>`

**Response** (200):
```json
{
  "message": "Cart cleared successfully"
}
```

---

### Apply Coupon

Applies a coupon code to the cart.

**Endpoint**: `POST /api/cart/coupon`

**Headers**:
- `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "code": "SUMMER2025"
}
```

**Response** (200):
```json
{
  "coupon": {
    "code": "SUMMER2025",
    "discountType": "PERCENTAGE",
    "discountValue": 15.0
  },
  "cart": {
    "subtotal": 999.98,
    "discount": 150.00,
    "total": 849.98
  }
}
```

---

## Orders

### Create Order

Creates an order from the current cart.

**Endpoint**: `POST /api/orders`

**Headers**:
- `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "shippingAddress": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "USA"
  },
  "paymentMethodId": "pm_1234567890"
}
```

**Response** (201):
```json
{
  "order": {
    "id": "uuid",
    "orderNumber": "ORD-20251102-001",
    "status": "PENDING",
    "items": [...],
    "subtotal": 999.98,
    "tax": 89.99,
    "shipping": 10.00,
    "total": 1099.97,
    "shippingAddress": {...},
    "createdAt": "2025-11-02T10:00:00Z"
  },
  "paymentIntent": {
    "clientSecret": "pi_1234567890_secret"
  }
}
```

---

### Get Orders

Gets user's order history.

**Endpoint**: `GET /api/orders`

**Headers**:
- `Authorization: Bearer <token>`

**Query Parameters**:
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 20)
- `status` (string, optional): Filter by status

**Response** (200):
```json
{
  "orders": [
    {
      "id": "uuid",
      "orderNumber": "ORD-20251102-001",
      "status": "SHIPPED",
      "total": 1099.97,
      "itemCount": 2,
      "createdAt": "2025-11-02T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 15,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

---

### Get Order Details

Gets detailed information about a specific order.

**Endpoint**: `GET /api/orders/:orderId`

**Headers**:
- `Authorization: Bearer <token>`

**Response** (200):
```json
{
  "id": "uuid",
  "orderNumber": "ORD-20251102-001",
  "status": "SHIPPED",
  "items": [
    {
      "id": "uuid",
      "product": {
        "name": "Charizard",
        "price": 499.99
      },
      "quantity": 2,
      "price": 499.99,
      "subtotal": 999.98
    }
  ],
  "subtotal": 999.98,
  "tax": 89.99,
  "shipping": 10.00,
  "total": 1099.97,
  "shippingAddress": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "USA"
  },
  "trackingNumber": "1Z999AA10123456784",
  "createdAt": "2025-11-02T10:00:00Z",
  "shippedAt": "2025-11-03T14:30:00Z"
}
```

---

## Payment

### Create Payment Intent

Creates a Stripe payment intent for checkout.

**Endpoint**: `POST /api/payment/create-intent`

**Headers**:
- `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "amount": 109997
}
```

**Note**: Amount in cents (e.g., $1099.97 = 109997 cents)

**Response** (200):
```json
{
  "clientSecret": "pi_1234567890_secret_abcdefghijklmn",
  "paymentIntentId": "pi_1234567890"
}
```

---

### Confirm Payment

Confirms a successful payment.

**Endpoint**: `POST /api/payment/confirm`

**Headers**:
- `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "paymentIntentId": "pi_1234567890",
  "orderId": "uuid"
}
```

**Response** (200):
```json
{
  "success": true,
  "order": {
    "id": "uuid",
    "status": "PAID",
    "paymentStatus": "COMPLETED"
  },
  "message": "Payment confirmed successfully"
}
```

---

### Stripe Webhook

Handles Stripe webhook events (internal endpoint).

**Endpoint**: `POST /api/payment/webhook`

**Headers**:
- `stripe-signature`: Stripe webhook signature

**Events Handled**:
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `charge.refunded`

---

## Games & Sets

### Get All Games

Gets list of all trading card games.

**Endpoint**: `GET /api/games`

**Response** (200):
```json
{
  "games": [
    {
      "id": "uuid",
      "name": "Pokemon",
      "description": "Pokemon Trading Card Game",
      "imageUrl": "https://...",
      "productCount": 150,
      "createdAt": "2025-01-01T00:00:00Z"
    }
  ]
}
```

---

### Get Game by ID

Gets detailed information about a specific game.

**Endpoint**: `GET /api/games/:gameId`

**Response** (200):
```json
{
  "id": "uuid",
  "name": "Pokemon",
  "description": "Pokemon Trading Card Game",
  "imageUrl": "https://...",
  "sets": [
    {
      "id": "uuid",
      "name": "Base Set",
      "code": "BASE",
      "releaseDate": "1999-01-09",
      "productCount": 50
    }
  ],
  "productCount": 150
}
```

---

### Get Sets by Game

Gets all card sets for a specific game.

**Endpoint**: `GET /api/games/:gameId/sets`

**Response** (200):
```json
{
  "sets": [
    {
      "id": "uuid",
      "gameId": "uuid",
      "name": "Base Set",
      "code": "BASE",
      "releaseDate": "1999-01-09",
      "productCount": 50,
      "createdAt": "2025-01-01T00:00:00Z"
    }
  ]
}
```

---

## Error Handling

### Standard Error Response

All endpoints return errors in a consistent format:

```json
{
  "error": "Error message",
  "status": "error",
  "code": "ERROR_CODE"
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 422 | Validation Error |
| 500 | Internal Server Error |

### Common Error Codes

- `UNAUTHORIZED`: Missing or invalid authentication token
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `VALIDATION_ERROR`: Invalid input data
- `DUPLICATE`: Resource already exists
- `OUT_OF_STOCK`: Product not available
- `PAYMENT_FAILED`: Payment processing failed

### Validation Error Format

```json
{
  "error": "Validation failed",
  "status": "error",
  "code": "VALIDATION_ERROR",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    },
    {
      "field": "password",
      "message": "Password must be at least 8 characters"
    }
  ]
}
```

---

## Rate Limiting

- **Standard endpoints**: 100 requests per minute per IP
- **Search endpoints**: 60 requests per minute per IP
- **Authentication endpoints**: 10 requests per minute per IP

**Rate Limit Headers**:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1635789600
```

---

## Pagination

All list endpoints support pagination with consistent parameters:

**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)

**Response Format**:
```json
{
  "data": [...],
  "pagination": {
    "total": 500,
    "page": 2,
    "limit": 20,
    "totalPages": 25,
    "hasNext": true,
    "hasPrev": true
  }
}
```

---

## Testing

### Health Check

**Endpoint**: `GET /health`

**Response** (200):
```json
{
  "status": "OK",
  "timestamp": "2025-11-02T20:42:04.698Z"
}
```

### Database Status

**Endpoint**: `GET /health/db`

**Response** (200):
```json
{
  "status": "OK",
  "database": "connected",
  "latency": "15ms"
}
```

---

## Postman Collection

A complete Postman collection with all endpoints and examples is available at:
`/docs/postman/TCG-Marketplace-API.postman_collection.json`

---

## Changelog

### Version 1.0 (November 2, 2025)

#### Phase 1 Complete
- ✅ Authentication system with JWT
- ✅ Product CRUD operations
- ✅ Enhanced search with relevance scoring
- ✅ Search autocomplete
- ✅ Price history tracking
- ✅ Price comparison across sellers
- ✅ Intelligent recommendations (5 algorithms)
- ✅ Image upload with Cloudinary
- ✅ Cart management
- ✅ Order processing
- ✅ Stripe payment integration
- ✅ Email notifications
- ✅ Games and sets management

---

## Support

For issues or questions:
- GitHub: [repository-url]
- Email: support@tcgmarketplace.com
- Documentation: [docs-url]

---

**API Version**: 1.0
**Last Updated**: November 2, 2025
**Status**: Production Ready ✅
