import express from 'express';
import {
  createCollection,
  getUserCollections,
  getCollectionById,
  updateCollection,
  deleteCollection,
  addItemToCollection,
  updateCollectionItem,
  removeItemFromCollection,
  exportCollection,
  importCollection,
  getPublicCollections,
} from '../controllers/collectionController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Public routes
router.get('/public', getPublicCollections);
router.get('/:collectionId', getCollectionById);
router.get('/:collectionId/export', exportCollection);

// Protected routes - require authentication
router.post('/', authenticate, createCollection);
router.get('/user/my-collections', authenticate, getUserCollections);
router.put('/:collectionId', authenticate, updateCollection);
router.delete('/:collectionId', authenticate, deleteCollection);
router.post('/:collectionId/items', authenticate, addItemToCollection);
router.put('/:collectionId/items/:itemId', authenticate, updateCollectionItem);
router.delete('/:collectionId/items/:itemId', authenticate, removeItemFromCollection);
router.post('/import', authenticate, importCollection);

export default router;
