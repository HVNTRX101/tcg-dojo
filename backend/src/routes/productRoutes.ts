import { Router } from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../controllers/productController';
import { validate } from '../middleware/validation';
import { createProductSchema, updateProductSchema } from '../types';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/', asyncHandler(getProducts));
router.get('/:id', asyncHandler(getProductById));
router.post(
  '/',
  authenticate,
  authorize('SELLER', 'ADMIN'),
  validate(createProductSchema),
  asyncHandler(createProduct)
);
router.put(
  '/:id',
  authenticate,
  authorize('SELLER', 'ADMIN'),
  validate(updateProductSchema),
  asyncHandler(updateProduct)
);
router.delete(
  '/:id',
  authenticate,
  authorize('SELLER', 'ADMIN'),
  asyncHandler(deleteProduct)
);

export default router;
