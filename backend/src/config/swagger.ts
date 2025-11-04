import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'TCG Marketplace API',
      version: '1.0.0',
      description:
        'A comprehensive API for a Trading Card Game (TCG) marketplace platform with user authentication, product management, orders, payments, and social features.',
      contact: {
        name: 'API Support',
        email: 'support@tcgmarketplace.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server',
      },
      {
        url: 'https://api.tcgmarketplace.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'User ID',
              example: 'clx123abc',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
              example: 'user@example.com',
            },
            name: {
              type: 'string',
              description: 'User full name',
              example: 'John Doe',
            },
            role: {
              type: 'string',
              enum: ['USER', 'SELLER', 'ADMIN'],
              description: 'User role',
              example: 'USER',
            },
            isVerified: {
              type: 'boolean',
              description: 'Email verification status',
              example: true,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Account creation timestamp',
            },
          },
        },
        Product: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Product ID',
            },
            name: {
              type: 'string',
              description: 'Product name',
              example: 'Charizard VMAX',
            },
            description: {
              type: 'string',
              description: 'Product description',
            },
            price: {
              type: 'number',
              format: 'float',
              description: 'Product price',
              example: 299.99,
            },
            game: {
              type: 'string',
              description: 'Game name',
              example: 'Pokemon',
            },
            category: {
              type: 'string',
              description: 'Product category',
              example: 'Singles',
            },
            rarity: {
              type: 'string',
              description: 'Card rarity',
              example: 'Ultra Rare',
            },
            condition: {
              type: 'string',
              description: 'Card condition',
              example: 'Near Mint',
            },
            stock: {
              type: 'number',
              description: 'Available stock',
              example: 5,
            },
          },
        },
        Order: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Order ID',
            },
            orderNumber: {
              type: 'string',
              description: 'Human-readable order number',
              example: 'ORD-2025-001',
            },
            status: {
              type: 'string',
              enum: ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
              description: 'Order status',
            },
            total: {
              type: 'number',
              format: 'float',
              description: 'Order total amount',
              example: 499.99,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Order creation timestamp',
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message',
              example: 'Invalid request',
            },
            message: {
              type: 'string',
              description: 'Detailed error message',
            },
          },
        },
        AuthResponse: {
          type: 'object',
          properties: {
            user: {
              $ref: '#/components/schemas/User',
            },
            token: {
              type: 'string',
              description: 'JWT access token',
            },
            refreshToken: {
              type: 'string',
              description: 'JWT refresh token',
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and registration endpoints',
      },
      {
        name: 'Products',
        description: 'Product management endpoints',
      },
      {
        name: 'Orders',
        description: 'Order management endpoints',
      },
      {
        name: 'Cart',
        description: 'Shopping cart endpoints',
      },
      {
        name: 'Admin',
        description: 'Admin-only endpoints',
      },
      {
        name: 'Search',
        description: 'Search and filter endpoints',
      },
      {
        name: 'Reviews',
        description: 'Product review endpoints',
      },
      {
        name: 'Messages',
        description: 'User messaging endpoints',
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'], // Path to the API routes
};

export const swaggerSpec = swaggerJsdoc(options);
