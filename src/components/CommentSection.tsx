import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { commentService, Comment, CreateCommentPayload } from '../services/comment.service';
import { useAuth } from '../hooks/useAuth';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Card } from './ui/card';
import { Separator } from './ui/separator';
import { Heart, MessageCircle, Trash2, Edit, Send, MoreVertical } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { cn } from './ui/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

interface CommentSectionProps {
  entityType: 'product' | 'review' | 'activity';
  entityId: string;
  className?: string;
}

export function CommentSection({ entityType, entityId, className }: CommentSectionProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  // Fetch comments
  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['comments', entityType, entityId],
    queryFn: () => commentService.getComments(entityType, entityId),
    refetchInterval: 30000,
  });

  // Create comment mutation
  const createCommentMutation = useMutation({
    mutationFn: (payload: CreateCommentPayload) => commentService.createComment(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', entityType, entityId] });
      setCommentText('');
      setReplyingTo(null);
      toast.success('Comment posted');
    },
    onError: () => {
      toast.error('Failed to post comment');
    },
  });

  // Update comment mutation
  const updateCommentMutation = useMutation({
    mutationFn: ({ commentId, content }: { commentId: string; content: string }) =>
      commentService.updateComment(commentId, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', entityType, entityId] });
      setEditingComment(null);
      setEditText('');
      toast.success('Comment updated');
    },
    onError: () => {
      toast.error('Failed to update comment');
    },
  });

  // Delete comment mutation
  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) => commentService.deleteComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', entityType, entityId] });
      toast.success('Comment deleted');
    },
    onError: () => {
      toast.error('Failed to delete comment');
    },
  });

  // Like comment mutation
  const likeCommentMutation = useMutation({
    mutationFn: (commentId: string) => commentService.likeComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', entityType, entityId] });
    },
  });

  // Unlike comment mutation
  const unlikeCommentMutation = useMutation({
    mutationFn: (commentId: string) => commentService.unlikeComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', entityType, entityId] });
    },
  });

  const handleSubmitComment = () => {
    if (!commentText.trim() || !user) {
      if (!user) toast.error('Please sign in to comment');
      return;
    }

    createCommentMutation.mutate({
      entityType,
      entityId,
      content: commentText,
      parentId: replyingTo || undefined,
    });
  };

  const handleUpdateComment = (commentId: string) => {
    if (!editText.trim()) return;
    updateCommentMutation.mutate({ commentId, content: editText });
  };

  const handleLikeToggle = (comment: Comment) => {
    if (!user) {
      toast.error('Please sign in to like comments');
      return;
    }

    if (comment.isLiked) {
      unlikeCommentMutation.mutate(comment.id);
    } else {
      likeCommentMutation.mutate(comment.id);
    }
  };

  const CommentItem = ({ comment, isReply = false }: { comment: Comment; isReply?: boolean }) => {
    const isOwner = user?.id === comment.userId;
    const isEditing = editingComment === comment.id;

    return (
      <div className={cn('flex gap-3', isReply && 'ml-12 mt-3')}>
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src={comment.user?.avatarUrl} />
          <AvatarFallback>{comment.user?.name?.charAt(0).toUpperCase() || '?'}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{comment.user?.name || 'Unknown User'}</p>
                <p className="text-xs text-gray-500">
                  {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                </p>
              </div>
              {isOwner && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        setEditingComment(comment.id);
                        setEditText(comment.content);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => deleteCommentMutation.mutate(comment.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {isEditing ? (
              <div className="mt-2 space-y-2">
                <Textarea
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  className="min-h-[60px]"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleUpdateComment(comment.id)}>
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingComment(null);
                      setEditText('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm mt-2 whitespace-pre-wrap break-words">{comment.content}</p>
            )}
          </div>

          <div className="flex items-center gap-3 mt-2">
            <Button
              variant="ghost"
              size="sm"
              className={cn('h-7 px-2', comment.isLiked && 'text-red-600')}
              onClick={() => handleLikeToggle(comment)}
            >
              <Heart className={cn('h-4 w-4 mr-1', comment.isLiked && 'fill-current')} />
              {comment.likesCount > 0 && comment.likesCount}
            </Button>
            {!isReply && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
              >
                <MessageCircle className="h-4 w-4 mr-1" />
                Reply
              </Button>
            )}
          </div>

          {replyingTo === comment.id && (
            <div className="mt-3 flex gap-2">
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarImage src={user?.avatarUrl} />
                <AvatarFallback>{user?.name?.charAt(0).toUpperCase() || '?'}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <Textarea
                  placeholder="Write a reply..."
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  className="min-h-[80px]"
                />
                <div className="flex gap-2 mt-2">
                  <Button size="sm" onClick={handleSubmitComment}>
                    <Send className="h-4 w-4 mr-2" />
                    Reply
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setReplyingTo(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}

          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-3 space-y-3">
              {comment.replies.map(reply => (
                <CommentItem key={reply.id} comment={reply} isReply />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card className={cn('p-6', className)}>
      <h3 className="text-xl font-semibold mb-4">
        Comments {comments.length > 0 && `(${comments.length})`}
      </h3>

      {/* Comment Input */}
      {user ? (
        <div className="mb-6">
          <div className="flex gap-3">
            <Avatar className="h-10 w-10 flex-shrink-0">
              <AvatarImage src={user?.avatarUrl} />
              <AvatarFallback>{user?.name?.charAt(0).toUpperCase() || '?'}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Textarea
                placeholder="Write a comment..."
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                className="min-h-[100px]"
              />
              <div className="flex justify-end mt-2">
                <Button onClick={handleSubmitComment} disabled={!commentText.trim()}>
                  <Send className="h-4 w-4 mr-2" />
                  Post Comment
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg text-center">
          <p className="text-gray-600">Please sign in to comment</p>
        </div>
      )}

      <Separator className="mb-6" />

      {/* Comments List */}
      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Loading comments...</div>
      ) : comments.length === 0 ? (
        <div className="text-center py-12">
          <MessageCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">No comments yet. Be the first to comment!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {comments
            .filter(c => !c.parentId)
            .map(comment => (
              <CommentItem key={comment.id} comment={comment} />
            ))}
        </div>
      )}
    </Card>
  );
}
