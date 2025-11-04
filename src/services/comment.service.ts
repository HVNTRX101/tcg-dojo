import { apiClient } from './api';

/**
 * Comment Service
 * Handles comment API calls
 */

export interface Comment {
  id: string;
  userId: string;
  entityType: 'product' | 'review' | 'activity';
  entityId: string;
  content: string;
  parentId?: string;
  likesCount: number;
  isLiked?: boolean;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  };
  replies?: Comment[];
}

export interface CreateCommentPayload {
  entityType: 'product' | 'review' | 'activity';
  entityId: string;
  content: string;
  parentId?: string;
}

export interface UpdateCommentPayload {
  content: string;
}

export const commentService = {
  /**
   * Get comments for an entity
   */
  getComments: async (
    entityType: 'product' | 'review' | 'activity',
    entityId: string
  ): Promise<Comment[]> => {
    return apiClient.get<Comment[]>(`/comments/${entityType}/${entityId}`);
  },

  /**
   * Create a new comment
   */
  createComment: async (payload: CreateCommentPayload): Promise<Comment> => {
    return apiClient.post<Comment>('/comments', payload);
  },

  /**
   * Update a comment
   */
  updateComment: async (commentId: string, payload: UpdateCommentPayload): Promise<Comment> => {
    return apiClient.put<Comment>(`/comments/${commentId}`, payload);
  },

  /**
   * Delete a comment
   */
  deleteComment: async (commentId: string): Promise<void> => {
    return apiClient.delete<void>(`/comments/${commentId}`);
  },

  /**
   * Like a comment
   */
  likeComment: async (commentId: string): Promise<{ likesCount: number }> => {
    return apiClient.post<{ likesCount: number }>(`/comments/${commentId}/like`);
  },

  /**
   * Unlike a comment
   */
  unlikeComment: async (commentId: string): Promise<{ likesCount: number }> => {
    return apiClient.delete<{ likesCount: number }>(`/comments/${commentId}/like`);
  },
};
