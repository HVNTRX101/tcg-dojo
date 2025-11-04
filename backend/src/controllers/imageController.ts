import { Response } from 'express';
import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import {
  optimizeAndUploadImage,
  deleteImage,
  deleteMultipleImages,
  validateImageFile,
} from '../services/cloudinaryService';
import { config } from '../config/env';
import {
  createUploadSession,
  updateUploadProgress,
  markUploadProcessing,
  completeUpload,
  failUpload,
} from '../services/fileUpload';

/**
 * Upload single image for a product
 * POST /api/products/:productId/images
 */
export const uploadProductImage = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const { productId } = req.params;
  const userId = req.user!.userId;
  const file = req.file;

  if (!file) {
    throw new AppError('No image file provided', 400);
  }

  // Validate file
  validateImageFile(file.mimetype, file.size);

  // Check if product exists and user has permission
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      seller: true,
      images: {
        orderBy: {
          displayOrder: 'asc',
        },
      },
    },
  });

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  if (product.seller.userId !== userId && req.user!.role !== 'ADMIN') {
    throw new AppError('You do not have permission to upload images for this product', 403);
  }

  // Create upload session for progress tracking
  const uploadId = createUploadSession(userId, file.originalname, file.size);

  try {
    // Simulate upload progress (file is already in memory, so we update immediately)
    updateUploadProgress(uploadId, file.size);

    // Mark as processing
    markUploadProcessing(uploadId);

    // Upload to Cloudinary
    const uploadResult = await optimizeAndUploadImage(
      file.buffer,
      `${config.cloudinary.folder}/products/${productId}`
    );

    // Determine if this should be the primary image
    const isPrimary = product.images.length === 0;

  // Get the next display order
  const displayOrder =
    product.images.length > 0
      ? Math.max(...product.images.map((img) => img.displayOrder)) + 1
      : 0;

    // Save to database
    const productImage = await prisma.productImage.create({
      data: {
        productId,
        url: uploadResult.url,
        publicId: uploadResult.publicId,
        isPrimary,
        displayOrder,
      },
    });

    // Mark upload as complete
    completeUpload(uploadId, uploadResult.url);

    res.status(201).json({
      message: 'Image uploaded successfully',
      image: productImage,
      uploadId,
    });
  } catch (error) {
    // Mark upload as failed
    failUpload(uploadId, error instanceof Error ? error.message : 'Upload failed');
    throw error;
  }
};

/**
 * Upload multiple images for a product
 * POST /api/products/:productId/images/bulk
 */
export const uploadProductImages = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const { productId } = req.params;
  const userId = req.user!.userId;
  const files = req.files as Express.Multer.File[];

  if (!files || files.length === 0) {
    throw new AppError('No image files provided', 400);
  }

  // Check if product exists and user has permission
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      seller: true,
      images: {
        orderBy: {
          displayOrder: 'asc',
        },
      },
    },
  });

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  if (product.seller.userId !== userId && req.user!.role !== 'ADMIN') {
    throw new AppError('You do not have permission to upload images for this product', 403);
  }

  // Validate all files
  files.forEach((file) => validateImageFile(file.mimetype, file.size));

  // Create upload sessions for all files
  const uploadSessions = files.map((file) => ({
    uploadId: createUploadSession(userId, file.originalname, file.size),
    file,
  }));

  try {
    // Upload all images with progress tracking
    const uploadPromises = uploadSessions.map(async ({ uploadId, file }, index) => {
      try {
        // Update progress
        updateUploadProgress(uploadId, file.size);
        markUploadProcessing(uploadId);

        // Upload to Cloudinary
        const result = await optimizeAndUploadImage(
          file.buffer,
          `${config.cloudinary.folder}/products/${productId}`
        );

        // Mark as complete
        completeUpload(uploadId, result.url);

        return {
          url: result.url,
          publicId: result.publicId,
          displayOrder: product.images.length + index,
          isPrimary: product.images.length === 0 && index === 0,
        };
      } catch (error) {
        failUpload(uploadId, error instanceof Error ? error.message : 'Upload failed');
        throw error;
      }
    });

    const uploadResults = await Promise.all(uploadPromises);

    // Save all to database
    const productImages = await Promise.all(
      uploadResults.map((result) =>
        prisma.productImage.create({
          data: {
            productId,
            ...result,
          },
        })
      )
    );

    res.status(201).json({
      message: `${productImages.length} image(s) uploaded successfully`,
      images: productImages,
      uploadIds: uploadSessions.map((s) => s.uploadId),
    });
  } catch (error) {
    // If any upload fails, the individual failures are already tracked
    throw error;
  }
};

/**
 * Get all images for a product
 * GET /api/products/:productId/images
 */
export const getProductImages = async (req: AuthRequest, res: Response): Promise<void> => {
  const { productId } = req.params;

  const images = await prisma.productImage.findMany({
    where: { productId },
    orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }],
  });

  res.json({ images });
};

/**
 * Delete a product image
 * DELETE /api/products/:productId/images/:imageId
 */
export const deleteProductImage = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const { productId, imageId } = req.params;
  const userId = req.user!.userId;

  // Check if product exists and user has permission
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      seller: true,
    },
  });

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  if (product.seller.userId !== userId && req.user!.role !== 'ADMIN') {
    throw new AppError('You do not have permission to delete images for this product', 403);
  }

  // Find the image
  const image = await prisma.productImage.findUnique({
    where: { id: imageId },
  });

  if (!image || image.productId !== productId) {
    throw new AppError('Image not found', 404);
  }

  // Delete from Cloudinary if publicId exists
  if (image.publicId) {
    try {
      await deleteImage(image.publicId);
    } catch (error) {
      console.error('Failed to delete image from Cloudinary:', error);
      // Continue with database deletion even if Cloudinary deletion fails
    }
  }

  // Delete from database
  await prisma.productImage.delete({
    where: { id: imageId },
  });

  // If this was the primary image, set another image as primary
  if (image.isPrimary) {
    const remainingImages = await prisma.productImage.findFirst({
      where: { productId },
      orderBy: { displayOrder: 'asc' },
    });

    if (remainingImages) {
      await prisma.productImage.update({
        where: { id: remainingImages.id },
        data: { isPrimary: true },
      });
    }
  }

  res.json({ message: 'Image deleted successfully' });
};

/**
 * Set an image as primary
 * PUT /api/products/:productId/images/:imageId/primary
 */
export const setImageAsPrimary = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const { productId, imageId } = req.params;
  const userId = req.user!.userId;

  // Check if product exists and user has permission
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      seller: true,
    },
  });

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  if (product.seller.userId !== userId && req.user!.role !== 'ADMIN') {
    throw new AppError('You do not have permission to modify images for this product', 403);
  }

  // Verify image belongs to product
  const image = await prisma.productImage.findUnique({
    where: { id: imageId },
  });

  if (!image || image.productId !== productId) {
    throw new AppError('Image not found', 404);
  }

  // Remove primary flag from all images
  await prisma.productImage.updateMany({
    where: { productId },
    data: { isPrimary: false },
  });

  // Set this image as primary
  const updatedImage = await prisma.productImage.update({
    where: { id: imageId },
    data: { isPrimary: true },
  });

  res.json({
    message: 'Primary image updated successfully',
    image: updatedImage,
  });
};

/**
 * Reorder product images
 * PUT /api/products/:productId/images/reorder
 */
export const reorderProductImages = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const { productId } = req.params;
  const userId = req.user!.userId;
  const { imageIds } = req.body; // Array of image IDs in desired order

  if (!Array.isArray(imageIds) || imageIds.length === 0) {
    throw new AppError('imageIds must be a non-empty array', 400);
  }

  // Check if product exists and user has permission
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      seller: true,
    },
  });

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  if (product.seller.userId !== userId && req.user!.role !== 'ADMIN') {
    throw new AppError('You do not have permission to modify images for this product', 403);
  }

  // Update display order for each image
  const updatePromises = imageIds.map((imageId, index) =>
    prisma.productImage.updateMany({
      where: {
        id: imageId,
        productId, // Ensure image belongs to this product
      },
      data: {
        displayOrder: index,
      },
    })
  );

  await Promise.all(updatePromises);

  // Fetch updated images
  const updatedImages = await prisma.productImage.findMany({
    where: { productId },
    orderBy: { displayOrder: 'asc' },
  });

  res.json({
    message: 'Images reordered successfully',
    images: updatedImages,
  });
};
