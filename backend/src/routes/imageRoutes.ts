import { Router } from 'express';
import {
  uploadProductImage,
  uploadProductImages,
  getProductImages,
  deleteProductImage,
  setImageAsPrimary,
  reorderProductImages,
} from '../controllers/imageController';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, authorize } from '../middleware/auth';
import { uploadSingle, uploadMultiple } from '../middleware/upload';

const router = Router();

// Get all images for a product (public)
router.get('/products/:productId/images', asyncHandler(getProductImages));

// Upload single image
router.post(
  '/products/:productId/images',
  authenticate,
  authorize('SELLER', 'ADMIN'),
  uploadSingle,
  asyncHandler(uploadProductImage)
);

// Upload multiple images
router.post(
  '/products/:productId/images/bulk',
  authenticate,
  authorize('SELLER', 'ADMIN'),
  uploadMultiple,
  asyncHandler(uploadProductImages)
);

// Set image as primary
router.put(
  '/products/:productId/images/:imageId/primary',
  authenticate,
  authorize('SELLER', 'ADMIN'),
  asyncHandler(setImageAsPrimary)
);

// Reorder images
router.put(
  '/products/:productId/images/reorder',
  authenticate,
  authorize('SELLER', 'ADMIN'),
  asyncHandler(reorderProductImages)
);

// Delete an image
router.delete(
  '/products/:productId/images/:imageId',
  authenticate,
  authorize('SELLER', 'ADMIN'),
  asyncHandler(deleteProductImage)
);

export default router;
