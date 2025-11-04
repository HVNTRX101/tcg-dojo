import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { messageService } from '../services/message.service';
import { useWebSocket } from '../contexts/WebSocketContext';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { ScrollArea } from '../components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { Search, Send, MoreVertical, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../hooks/useAuth';

export default function MessagesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { joinConversation, leaveConversation, startTyping, stopTyping, isConnected } =
    useWebSocket();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);

  // Fetch conversations
  const { data: conversations = [], isLoading: conversationsLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => messageService.getConversations(),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch messages for selected conversation
  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ['messages', selectedConversation],
    queryFn: () => messageService.getConversationMessages(selectedConversation!),
    enabled: !!selectedConversation,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: (content: string) =>
      messageService.sendMessage({
        conversationId: selectedConversation!,
        content,
      }),
    onSuccess: () => {
      setMessageInput('');
      queryClient.invalidateQueries({ queryKey: ['messages', selectedConversation] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: () => {
      toast.error('Failed to send message');
    },
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (conversationId: string) => messageService.markAsRead(conversationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  // Join/leave conversation rooms
  useEffect(() => {
    if (selectedConversation && isConnected) {
      joinConversation(selectedConversation);
      markAsReadMutation.mutate(selectedConversation);

      return () => {
        leaveConversation(selectedConversation);
      };
    }
  }, [selectedConversation, isConnected, joinConversation, leaveConversation, markAsReadMutation]);

  // Handle typing indicators
  const handleTyping = () => {
    if (!selectedConversation) return;

    // Clear existing timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }

    // Send typing start
    startTyping(selectedConversation);

    // Set timeout to send typing stop after 2 seconds of inactivity
    const timeout = setTimeout(() => {
      stopTyping(selectedConversation);
    }, 2000);

    setTypingTimeout(timeout);
  };

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedConversation) return;

    // Stop typing indicator
    if (selectedConversation) {
      stopTyping(selectedConversation);
    }

    sendMessageMutation.mutate(messageInput);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Filter conversations based on search
  const filteredConversations = conversations.filter(
    conv =>
      conv.participant?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.lastMessage?.content?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedConvData = conversations.find(c => c.id === selectedConversation);

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <h1 className="text-3xl font-bold mb-6">Messages</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-200px)]">
        {/* Conversations List */}
        <Card className="md:col-span-1 flex flex-col">
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            {conversationsLoading ? (
              <div className="p-4 text-center text-gray-500">Loading conversations...</div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center">
                <MessageCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500">No conversations yet</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredConversations.map(conversation => (
                  <button
                    key={conversation.id}
                    onClick={() => setSelectedConversation(conversation.id)}
                    className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                      selectedConversation === conversation.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar>
                        <AvatarImage src={conversation.participant?.avatarUrl} />
                        <AvatarFallback>
                          {conversation.participant?.name?.charAt(0).toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-semibold text-sm truncate">
                            {conversation.participant?.name || 'Unknown User'}
                          </p>
                          {conversation.lastMessageAt && (
                            <span className="text-xs text-gray-500">
                              {formatDistanceToNow(new Date(conversation.lastMessageAt), {
                                addSuffix: true,
                              })}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-gray-600 truncate">
                            {conversation.lastMessage?.content || 'No messages yet'}
                          </p>
                          {(conversation.unreadCount ?? 0) > 0 && (
                            <Badge variant="default" className="ml-2">
                              {conversation.unreadCount}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </Card>

        {/* Chat Window */}
        <Card className="md:col-span-2 flex flex-col">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={selectedConvData?.participant?.avatarUrl} />
                    <AvatarFallback>
                      {selectedConvData?.participant?.name?.charAt(0).toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="font-semibold">
                      {selectedConvData?.participant?.name || 'Unknown User'}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {isConnected ? 'Connected' : 'Disconnected'}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                {messagesLoading ? (
                  <div className="text-center text-gray-500">Loading messages...</div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-gray-500 mt-8">
                    No messages yet. Start the conversation!
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map(message => {
                      const isOwnMessage = message.senderId === user?.id;
                      return (
                        <div
                          key={message.id}
                          className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[70%] rounded-lg p-3 ${
                              isOwnMessage ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap break-words">
                              {message.content}
                            </p>
                            <p
                              className={`text-xs mt-1 ${
                                isOwnMessage ? 'text-blue-100' : 'text-gray-500'
                              }`}
                            >
                              {formatDistanceToNow(new Date(message.createdAt), {
                                addSuffix: true,
                              })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>

              {/* Message Input */}
              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={messageInput}
                    onChange={e => {
                      setMessageInput(e.target.value);
                      handleTyping();
                    }}
                    onKeyPress={handleKeyPress}
                    disabled={sendMessageMutation.isPending}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!messageInput.trim() || sendMessageMutation.isPending}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <MessageCircle className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p>Select a conversation to start messaging</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
