import { Request, Response } from 'express';
import prisma from '../config/database';

/**
 * Create a new collection
 * POST /api/collections
 */
export const createCollection = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { name, description, isPublic } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Collection name is required' });
    }

    const collection = await prisma.collection.create({
      data: {
        userId,
        name,
        description,
        isPublic: isPublic || false,
      },
    });

    return res.status(201).json({
      message: 'Collection created successfully',
      collection,
    });
  } catch (error) {
    console.error('Create collection error:', error);
    return res.status(500).json({ error: 'Failed to create collection' });
  }
};

/**
 * Get all collections for the authenticated user
 * GET /api/collections
 */
export const getUserCollections = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const collections = await prisma.collection.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              include: {
                game: true,
                set: true,
                images: {
                  where: { isPrimary: true },
                  take: 1,
                },
              },
            },
          },
        },
        _count: {
          select: {
            items: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate total value for each collection
    const collectionsWithStats = collections.map((collection) => {
      const totalValue = collection.items.reduce(
        (sum, item) => sum + item.product.price * item.quantity,
        0
      );
      const totalCards = collection.items.reduce(
        (sum, item) => sum + item.quantity,
        0
      );

      return {
        ...collection,
        stats: {
          totalValue,
          totalCards,
          uniqueCards: collection.items.length,
        },
      };
    });

    return res.json({ collections: collectionsWithStats });
  } catch (error) {
    console.error('Get user collections error:', error);
    return res.status(500).json({ error: 'Failed to fetch collections' });
  }
};

/**
 * Get a specific collection by ID
 * GET /api/collections/:collectionId
 */
export const getCollectionById = async (req: Request, res: Response): Promise<any> => {
  try {
    const { collectionId } = req.params;
    const userId = req.user?.userId;

    const collection = await prisma.collection.findUnique({
      where: { id: collectionId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        items: {
          include: {
            product: {
              include: {
                game: true,
                set: true,
                seller: {
                  select: {
                    id: true,
                    businessName: true,
                  },
                },
                images: {
                  where: { isPrimary: true },
                  take: 1,
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    // Check if user has access (owner or public collection)
    if (!collection.isPublic && collection.userId !== userId) {
      return res.status(403).json({ error: 'Access denied to private collection' });
    }

    // Calculate statistics
    const totalValue = collection.items.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    );
    const totalCards = collection.items.reduce(
      (sum, item) => sum + item.quantity,
      0
    );

    return res.json({
      collection: {
        ...collection,
        stats: {
          totalValue,
          totalCards,
          uniqueCards: collection.items.length,
        },
      },
    });
  } catch (error) {
    console.error('Get collection error:', error);
    return res.status(500).json({ error: 'Failed to fetch collection' });
  }
};

/**
 * Update a collection
 * PUT /api/collections/:collectionId
 */
export const updateCollection = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { collectionId } = req.params;
    const { name, description, isPublic } = req.body;

    // Check if collection exists and user owns it
    const collection = await prisma.collection.findUnique({
      where: { id: collectionId },
    });

    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    if (collection.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized to update this collection' });
    }

    // Update collection
    const updatedCollection = await prisma.collection.update({
      where: { id: collectionId },
      data: {
        name: name || collection.name,
        description: description !== undefined ? description : collection.description,
        isPublic: isPublic !== undefined ? isPublic : collection.isPublic,
      },
    });

    return res.json({
      message: 'Collection updated successfully',
      collection: updatedCollection,
    });
  } catch (error) {
    console.error('Update collection error:', error);
    return res.status(500).json({ error: 'Failed to update collection' });
  }
};

/**
 * Delete a collection
 * DELETE /api/collections/:collectionId
 */
export const deleteCollection = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { collectionId } = req.params;

    // Check if collection exists and user owns it
    const collection = await prisma.collection.findUnique({
      where: { id: collectionId },
    });

    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    if (collection.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this collection' });
    }

    // Delete collection (items will be cascade deleted)
    await prisma.collection.delete({
      where: { id: collectionId },
    });

    return res.json({ message: 'Collection deleted successfully' });
  } catch (error) {
    console.error('Delete collection error:', error);
    return res.status(500).json({ error: 'Failed to delete collection' });
  }
};

/**
 * Add item to collection
 * POST /api/collections/:collectionId/items
 */
export const addItemToCollection = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { collectionId } = req.params;
    const { productId, quantity = 1, notes } = req.body;

    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required' });
    }

    // Check if collection exists and user owns it
    const collection = await prisma.collection.findUnique({
      where: { id: collectionId },
    });

    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    if (collection.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized to modify this collection' });
    }

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check if item already exists in collection
    const existingItem = await prisma.collectionItem.findUnique({
      where: {
        collectionId_productId: {
          collectionId,
          productId,
        },
      },
    });

    if (existingItem) {
      // Update quantity
      const updatedItem = await prisma.collectionItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: existingItem.quantity + quantity,
          notes: notes || existingItem.notes,
        },
        include: {
          product: {
            include: {
              game: true,
              set: true,
              images: {
                where: { isPrimary: true },
                take: 1,
              },
            },
          },
        },
      });

      return res.json({
        message: 'Item quantity updated in collection',
        item: updatedItem,
      });
    }

    // Add new item
    const item = await prisma.collectionItem.create({
      data: {
        collectionId,
        productId,
        quantity,
        notes,
      },
      include: {
        product: {
          include: {
            game: true,
            set: true,
            images: {
              where: { isPrimary: true },
              take: 1,
            },
          },
        },
      },
    });

    return res.status(201).json({
      message: 'Item added to collection successfully',
      item,
    });
  } catch (error) {
    console.error('Add item to collection error:', error);
    return res.status(500).json({ error: 'Failed to add item to collection' });
  }
};

/**
 * Update item in collection
 * PUT /api/collections/:collectionId/items/:itemId
 */
export const updateCollectionItem = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { collectionId, itemId } = req.params;
    const { quantity, notes } = req.body;

    // Check if collection exists and user owns it
    const collection = await prisma.collection.findUnique({
      where: { id: collectionId },
    });

    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    if (collection.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized to modify this collection' });
    }

    // Update item
    const item = await prisma.collectionItem.update({
      where: { id: itemId },
      data: {
        quantity: quantity !== undefined ? quantity : undefined,
        notes: notes !== undefined ? notes : undefined,
      },
      include: {
        product: {
          include: {
            game: true,
            set: true,
            images: {
              where: { isPrimary: true },
              take: 1,
            },
          },
        },
      },
    });

    return res.json({
      message: 'Collection item updated successfully',
      item,
    });
  } catch (error) {
    console.error('Update collection item error:', error);
    return res.status(500).json({ error: 'Failed to update collection item' });
  }
};

/**
 * Remove item from collection
 * DELETE /api/collections/:collectionId/items/:itemId
 */
export const removeItemFromCollection = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { collectionId, itemId } = req.params;

    // Check if collection exists and user owns it
    const collection = await prisma.collection.findUnique({
      where: { id: collectionId },
    });

    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    if (collection.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized to modify this collection' });
    }

    // Delete item
    await prisma.collectionItem.delete({
      where: { id: itemId },
    });

    return res.json({ message: 'Item removed from collection successfully' });
  } catch (error) {
    console.error('Remove item from collection error:', error);
    return res.status(500).json({ error: 'Failed to remove item from collection' });
  }
};

/**
 * Export collection to JSON
 * GET /api/collections/:collectionId/export
 */
export const exportCollection = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user?.userId;
    const { collectionId } = req.params;
    const { format = 'json' } = req.query;

    const collection = await prisma.collection.findUnique({
      where: { id: collectionId },
      include: {
        user: {
          select: {
            name: true,
          },
        },
        items: {
          include: {
            product: {
              include: {
                game: true,
                set: true,
              },
            },
          },
        },
      },
    });

    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    // Check if user has access
    if (!collection.isPublic && collection.userId !== userId) {
      return res.status(403).json({ error: 'Access denied to private collection' });
    }

    if (format === 'csv') {
      // Export as CSV
      const csv = convertCollectionToCSV(collection);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${collection.name.replace(/[^a-z0-9]/gi, '_')}.csv"`
      );
      return res.send(csv);
    } else {
      // Export as JSON (default)
      const exportData = {
        collection: {
          name: collection.name,
          description: collection.description,
          owner: collection.user.name,
          exportedAt: new Date().toISOString(),
        },
        items: collection.items.map((item) => ({
          cardName: item.product.name,
          game: item.product.game.name,
          set: item.product.set?.name || 'N/A',
          condition: item.product.condition,
          quantity: item.quantity,
          price: item.product.price,
          totalValue: item.product.price * item.quantity,
          rarity: item.product.rarity,
          finish: item.product.finish,
          cardNumber: item.product.cardNumber,
          notes: item.notes,
        })),
        summary: {
          totalCards: collection.items.reduce((sum, item) => sum + item.quantity, 0),
          uniqueCards: collection.items.length,
          totalValue: collection.items.reduce(
            (sum, item) => sum + item.product.price * item.quantity,
            0
          ),
        },
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${collection.name.replace(/[^a-z0-9]/gi, '_')}.json"`
      );
      return res.json(exportData);
    }
  } catch (error) {
    console.error('Export collection error:', error);
    return res.status(500).json({ error: 'Failed to export collection' });
  }
};

/**
 * Import collection from JSON
 * POST /api/collections/import
 */
export const importCollection = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { collectionName, items } = req.body;

    if (!collectionName || !Array.isArray(items)) {
      return res.status(400).json({
        error: 'Collection name and items array are required',
      });
    }

    // Create collection
    const collection = await prisma.collection.create({
      data: {
        userId,
        name: collectionName,
        description: `Imported on ${new Date().toLocaleDateString()}`,
      },
    });

    // Import items
    const importResults = {
      successful: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const item of items) {
      try {
        // Find product by name and game (or other unique identifiers)
        const product = await prisma.product.findFirst({
          where: {
            name: item.cardName,
            game: {
              name: item.game,
            },
          },
        });

        if (!product) {
          importResults.failed++;
          importResults.errors.push(
            `Product not found: ${item.cardName} (${item.game})`
          );
          continue;
        }

        // Add to collection
        await prisma.collectionItem.create({
          data: {
            collectionId: collection.id,
            productId: product.id,
            quantity: item.quantity || 1,
            notes: item.notes,
          },
        });

        importResults.successful++;
      } catch (error) {
        importResults.failed++;
        importResults.errors.push(`Error importing ${item.cardName}: ${error}`);
      }
    }

    return res.status(201).json({
      message: 'Collection imported successfully',
      collection,
      importResults,
    });
  } catch (error) {
    console.error('Import collection error:', error);
    return res.status(500).json({ error: 'Failed to import collection' });
  }
};

/**
 * Get public collections
 * GET /api/collections/public
 */
export const getPublicCollections = async (req: Request, res: Response): Promise<any> => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {
      isPublic: true,
    };

    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: 'insensitive' } },
        { description: { contains: String(search), mode: 'insensitive' } },
      ];
    }

    const [collections, total] = await Promise.all([
      prisma.collection.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              items: true,
            },
          },
        },
      }),
      prisma.collection.count({ where }),
    ]);

    return res.json({
      collections,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get public collections error:', error);
    return res.status(500).json({ error: 'Failed to fetch public collections' });
  }
};

// Helper function to convert collection to CSV
function convertCollectionToCSV(collection: any): string {
  const headers = [
    'Card Name',
    'Game',
    'Set',
    'Condition',
    'Quantity',
    'Price',
    'Total Value',
    'Rarity',
    'Finish',
    'Card Number',
    'Notes',
  ];

  const rows = collection.items.map((item: any) => [
    item.product.name,
    item.product.game.name,
    item.product.set?.name || 'N/A',
    item.product.condition,
    item.quantity,
    item.product.price,
    item.product.price * item.quantity,
    item.product.rarity || 'N/A',
    item.product.finish,
    item.product.cardNumber || 'N/A',
    item.notes || '',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row: any[]) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ),
  ].join('\n');

  return csvContent;
}
