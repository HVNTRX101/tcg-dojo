# Database Query Optimization Guide

## Overview
This document outlines the database optimization strategies implemented in Phase 5 to improve query performance and scalability.

## Indexes Added

### User & Authentication
- **idx_users_email**: Fast email lookups for authentication
- **idx_users_role**: Role-based queries (USER, SELLER, ADMIN)
- **idx_users_created_at**: User registration analytics
- **idx_users_is_verified**: Filter verified users

### Product Queries (Critical Path)
- **idx_products_game_id**: Filter by game
- **idx_products_seller_id**: Seller product listings
- **idx_products_price**: Price range queries and sorting
- **idx_products_name**: Product name searches
- **idx_products_condition**: Filter by condition
- **idx_products_rarity**: Filter by rarity
- **Composite idx_products_game_price**: Game + price queries
- **Composite idx_products_game_set**: Game + set queries

### Orders & Transactions
- **idx_orders_user_id**: User order history
- **idx_orders_status**: Filter by order status
- **idx_orders_payment_status**: Payment tracking
- **idx_orders_created_at**: Order date sorting
- **Composite idx_orders_user_status**: User's orders by status
- **Composite idx_orders_user_created**: User's orders by date

### Reviews & Ratings
- **idx_reviews_product_id**: Product reviews
- **idx_reviews_seller_id**: Seller reviews
- **idx_reviews_rating**: Filter by rating
- **Composite idx_reviews_product_created**: Latest product reviews
- **Composite idx_reviews_seller_rating**: Seller ratings analysis

### Messages & Notifications
- **idx_messages_conversation_id**: Conversation messages
- **idx_messages_receiver_id**: Inbox queries
- **idx_messages_is_read**: Unread messages
- **idx_notifications_user_read**: Unread notifications count
- **idx_notifications_user_created**: Latest notifications

### Analytics (Phase 4)
- **idx_sales_analytics_date_period**: Time-series analytics
- **idx_user_behavior_analytics_date_period**: User metrics over time
- **idx_inventory_analytics_date_period**: Inventory trends

## Query Optimization Best Practices

### 1. Use Select Specific Fields
```typescript
// ❌ Bad - Selects all fields
const product = await prisma.product.findUnique({
  where: { id: productId }
});

// ✅ Good - Selects only needed fields
const product = await prisma.product.findUnique({
  where: { id: productId },
  select: {
    id: true,
    name: true,
    price: true,
    imageUrl: true
  }
});
```

### 2. Use Pagination
```typescript
// ✅ Always paginate large result sets
const products = await prisma.product.findMany({
  take: 20,
  skip: (page - 1) * 20,
  orderBy: { createdAt: 'desc' }
});
```

### 3. Use Cursor-based Pagination for Large Datasets
```typescript
// ✅ Better for large datasets
const products = await prisma.product.findMany({
  take: 20,
  cursor: lastProductId ? { id: lastProductId } : undefined,
  skip: lastProductId ? 1 : 0,
  orderBy: { createdAt: 'desc' }
});
```

### 4. Optimize Relation Queries
```typescript
// ❌ Bad - N+1 query problem
const orders = await prisma.order.findMany();
for (const order of orders) {
  const items = await prisma.orderItem.findMany({
    where: { orderId: order.id }
  });
}

// ✅ Good - Single query with include
const orders = await prisma.order.findMany({
  include: {
    items: {
      include: {
        product: {
          select: { name: true, price: true }
        }
      }
    }
  }
});
```

### 5. Use Aggregations Wisely
```typescript
// ✅ Use database aggregations instead of fetching all data
const stats = await prisma.product.aggregate({
  where: { sellerId },
  _count: true,
  _avg: { price: true },
  _sum: { quantity: true }
});
```

### 6. Cache Expensive Queries
```typescript
// ✅ Use Redis cache for expensive queries
import { cacheService, CacheTTL } from '../services/cache.service';

const getProductStats = async (sellerId: string) => {
  const cacheKey = `seller:${sellerId}:stats`;

  return await cacheService.wrap(
    cacheKey,
    async () => {
      return await prisma.product.aggregate({
        where: { sellerId },
        _count: true,
        _avg: { price: true }
      });
    },
    CacheTTL.LONG
  );
};
```

### 7. Use Transactions for Consistency
```typescript
// ✅ Use transactions for related operations
await prisma.$transaction(async (tx) => {
  const order = await tx.order.create({ data: orderData });

  await tx.orderItem.createMany({
    data: items.map(item => ({
      orderId: order.id,
      ...item
    }))
  });

  await tx.product.updateMany({
    where: { id: { in: productIds } },
    data: { quantity: { decrement: 1 } }
  });
});
```

### 8. Avoid Selecting Unnecessary Relations
```typescript
// ❌ Bad - Loads all relations
const user = await prisma.user.findUnique({
  where: { id: userId },
  include: {
    orders: true,
    reviews: true,
    collections: true,
    // ... many more relations
  }
});

// ✅ Good - Only load what you need
const user = await prisma.user.findUnique({
  where: { id: userId },
  select: {
    id: true,
    name: true,
    email: true
  }
});
```

### 9. Use Batch Operations
```typescript
// ❌ Bad - Multiple individual queries
for (const item of items) {
  await prisma.product.update({
    where: { id: item.id },
    data: { quantity: item.quantity }
  });
}

// ✅ Good - Single batch operation
await prisma.$transaction(
  items.map(item =>
    prisma.product.update({
      where: { id: item.id },
      data: { quantity: item.quantity }
    })
  )
);
```

### 10. Use Database Functions
```typescript
// ✅ Use raw queries for complex operations
const topSellers = await prisma.$queryRaw`
  SELECT
    s.id,
    s.businessName,
    COUNT(o.id) as orderCount,
    SUM(o.total) as totalRevenue
  FROM sellers s
  LEFT JOIN products p ON p.sellerId = s.id
  LEFT JOIN order_items oi ON oi.productId = p.id
  LEFT JOIN orders o ON o.id = oi.orderId
  WHERE o.status = 'DELIVERED'
  GROUP BY s.id, s.businessName
  ORDER BY totalRevenue DESC
  LIMIT 10
`;
```

## Monitoring Query Performance

### 1. Enable Query Logging (Development)
```typescript
// In prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
  log      = ["query", "info", "warn", "error"]
}
```

### 2. Use Query Metrics
```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: [
    {
      emit: 'event',
      level: 'query',
    },
  ],
});

prisma.$on('query', (e) => {
  console.log('Query: ' + e.query);
  console.log('Duration: ' + e.duration + 'ms');
});
```

### 3. Monitor Slow Queries
Set up alerts for queries taking longer than threshold:
```typescript
prisma.$on('query', (e) => {
  if (e.duration > 1000) { // 1 second
    console.warn('Slow query detected:', {
      query: e.query,
      duration: e.duration,
      params: e.params
    });
    // Send to monitoring service (Sentry, DataDog, etc.)
  }
});
```

## Performance Benchmarks

### Expected Query Performance (with indexes)

| Operation | Target | Notes |
|-----------|--------|-------|
| User login | <50ms | Email index |
| Product list (paginated) | <100ms | Game + price composite index |
| Product search | <200ms | Full-text search needed for large datasets |
| Order creation | <300ms | Transaction with multiple writes |
| Cart operations | <50ms | User ID index |
| Review queries | <100ms | Product/Seller indexes |
| Analytics queries | <500ms | Pre-aggregated in analytics tables |

## Database Maintenance

### 1. Regular Index Maintenance
```sql
-- Analyze tables for query planner
ANALYZE;

-- Check index usage
SELECT * FROM sqlite_stat1;
```

### 2. Monitor Database Size
```typescript
const dbSize = await prisma.$queryRaw`
  SELECT page_count * page_size as size
  FROM pragma_page_count(), pragma_page_size()
`;
```

### 3. Vacuum Database (SQLite)
```sql
-- Reclaim unused space
VACUUM;
```

## Production Recommendations

### 1. Use PostgreSQL for Production
SQLite is great for development, but PostgreSQL is recommended for production:
- Better concurrent write performance
- Full-text search capabilities
- Advanced indexing (GiST, GIN)
- Partial indexes
- Better JSON support

### 2. Connection Pooling
```typescript
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: ['error'],
  connectionLimit: 10, // Adjust based on load
});
```

### 3. Read Replicas
For high-traffic applications, use read replicas for read-heavy operations.

## Troubleshooting

### Slow Queries
1. Check if indexes are being used
2. Reduce relations being loaded
3. Add pagination
4. Consider caching
5. Profile the query execution plan

### High Memory Usage
1. Reduce result set size
2. Use pagination
3. Select only necessary fields
4. Close connections properly

### Lock Timeouts
1. Keep transactions short
2. Avoid long-running queries in transactions
3. Use optimistic locking where appropriate

## Next Steps

1. **Implement Full-Text Search**: Use PostgreSQL's full-text search or Elasticsearch for product search
2. **Query Caching**: Implement Redis caching layer for frequently accessed data
3. **Database Monitoring**: Set up APM tools (New Relic, DataDog)
4. **Load Testing**: Benchmark queries under load
5. **Index Optimization**: Analyze query patterns and add/remove indexes as needed
