import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getAddresses,
  getAddressById,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  getDefaultAddress,
} from '../controllers/addressController';

const router = Router();

/**
 * Address Routes
 * All routes require authentication
 */

// Get default address (must be before /:addressId route)
router.get('/default', authenticate, getDefaultAddress);

// Get all addresses
router.get('/', authenticate, getAddresses);

// Get address by ID
router.get('/:addressId', authenticate, getAddressById);

// Create new address
router.post('/', authenticate, createAddress);

// Update address
router.put('/:addressId', authenticate, updateAddress);

// Set address as default
router.put('/:addressId/set-default', authenticate, setDefaultAddress);

// Delete address
router.delete('/:addressId', authenticate, deleteAddress);

export default router;
