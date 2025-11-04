import { Router } from 'express';
import {
  createComment,
  getComments,
  getComment,
  updateComment,
  deleteComment,
  likeComment,
  unlikeComment,
} from '../controllers/commentController';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * Comment Routes
 * All routes require authentication
 */

// Create a comment
router.post('/', authenticate, createComment);

// Get comments (with query params for filtering)
router.get('/', getComments);

// Get a specific comment with replies
router.get('/:commentId', getComment);

// Update a comment
router.put('/:commentId', authenticate, updateComment);

// Delete a comment
router.delete('/:commentId', authenticate, deleteComment);

// Like a comment
router.post('/:commentId/like', authenticate, likeComment);

// Unlike a comment
router.delete('/:commentId/like', authenticate, unlikeComment);

export default router;
