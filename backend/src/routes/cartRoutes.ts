import { Router } from 'express';
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
} from '../controllers/cartController';
import { validate } from '../middleware/validation';
import { addToCartSchema, updateCartItemSchema } from '../types';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate); // All cart routes require authentication

router.get('/', asyncHandler(getCart));
router.post('/', validate(addToCartSchema), asyncHandler(addToCart));
router.put('/:itemId', validate(updateCartItemSchema), asyncHandler(updateCartItem));
router.delete('/:itemId', asyncHandler(removeFromCart));
router.delete('/', asyncHandler(clearCart));

export default router;
