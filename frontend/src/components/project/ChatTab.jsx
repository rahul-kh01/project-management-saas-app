import { useState, useEffect, useCallback } from 'react';
import { chatService } from '../../services/chatService.production';
import { useAuth } from '../../contexts/AuthContext';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import TypingIndicator from './TypingIndicator';
import Card from '../common/Card';
import { MessageSquare, WifiOff, Wifi } from 'lucide-react';

const ChatTab = ({ projectId }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  // Initialize socket connection and fetch messages
  useEffect(() => {
    if (!user || !projectId) return;

    let socket = null;

    const initChat = async () => {
      try {
        // Get auth token from cookies or localStorage
        const token =
          document.cookie
            .split('; ')
            .find((row) => row.startsWith('accessToken='))
            ?.split('=')[1] || localStorage.getItem('accessToken');

        if (!token) {
          console.error('No auth token found');
          setConnected(false);
          setLoading(false);
          return;
        }

        // Connect socket
        socket = chatService.connectSocket(token);

        // Socket event listeners with proper cleanup
        const handleConnect = async () => {
          console.log('Chat connected:', socket.id);
          setConnected(true);
          try {
            await chatService.joinProject(projectId);
            console.log('Successfully joined project chat');
          } catch (error) {
            console.error('Failed to join project chat:', error);
            setConnected(false);
          }
        };

        const handleDisconnect = (reason) => {
          console.log('Chat disconnected:', reason);
          setConnected(false);
        };

        const handleConnectError = (error) => {
          console.error('Socket connection error:', error);
          setConnected(false);
        };

        const handleReconnect = () => {
          console.log('Chat reconnected');
          setConnected(true);
          // Rejoin project after reconnection
          chatService.joinProject(projectId).catch(error => {
            console.error('Failed to rejoin project after reconnect:', error);
          });
        };

        // Attach event listeners
        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);
        socket.on('connect_error', handleConnectError);
        socket.on('reconnect', handleReconnect);

        // If already connected, trigger connect handler
        if (socket.connected) {
          handleConnect();
        }

        // Fetch message history
        const response = await chatService.fetchMessages(projectId, {
          page: 1,
          limit: 50,
        });

        setMessages(response.data.data || []);
        setHasMore(response.data.hasMore);
        setLoading(false);
      } catch (error) {
        console.error('Failed to initialize chat:', error);
        setLoading(false);
        setConnected(false);
      }
    };

    initChat();

    // Cleanup on unmount
    return () => {
      if (socket) {
        // Remove event listeners
        socket.off('connect');
        socket.off('disconnect');
        socket.off('connect_error');
        socket.off('reconnect');
      }
      
      if (projectId) {
        chatService.leaveProject(projectId).catch(error => {
          console.error('Error leaving project chat:', error);
        });
      }
    };
  }, [user, projectId]);

  // Listen for new messages
  useEffect(() => {
    const cleanup = chatService.onMessage(({ message, tempId }) => {
      setMessages((prev) => {
        // If message has tempId, replace the temp message
        if (tempId) {
          const tempIndex = prev.findIndex((m) => m.tempId === tempId);
          if (tempIndex !== -1) {
            const updated = [...prev];
            updated[tempIndex] = message;
            return updated;
          }
        }

        // Otherwise, add new message if it doesn't exist
        const exists = prev.some((m) => m._id === message._id);
        if (!exists) {
          return [...prev, message];
        }
        return prev;
      });
    });

    return cleanup;
  }, []);

  // Listen for typing events
  useEffect(() => {
    const cleanup = chatService.onTyping(({ user: typingUser, isTyping }) => {
      setTypingUsers((prev) => {
        if (isTyping) {
          // Add user if not already in the list
          const exists = prev.some((u) => u._id === typingUser._id);
          if (!exists) {
            return [...prev, typingUser];
          }
          return prev;
        } else {
          // Remove user from typing list
          return prev.filter((u) => u._id !== typingUser._id);
        }
      });
    });

    return cleanup;
  }, []);

  // Listen for read receipts
  useEffect(() => {
    const cleanup = chatService.onSeen(({ messageId, userId }) => {
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg._id === messageId) {
            const readBy = msg.readBy || [];
            if (!readBy.includes(userId)) {
              return { ...msg, readBy: [...readBy, userId] };
            }
          }
          return msg;
        })
      );
    });

    return cleanup;
  }, []);

  // Handle sending message
  const handleSendMessage = async ({ body, attachments }) => {
    if (!body.trim() && attachments.length === 0) return;

    // Generate temporary ID for optimistic UI update
    const tempId = `temp_${Date.now()}`;

    // Add message optimistically
    const tempMessage = {
      tempId,
      body,
      sender: {
        _id: user._id,
        username: user.username,
        fullName: user.fullName,
        avatar: user.avatar,
      },
      createdAt: new Date().toISOString(),
      readBy: [user._id],
      attachments: [],
    };

    setMessages((prev) => [...prev, tempMessage]);

    try {
      // Send via socket with acknowledgment
      await chatService.sendMessage({ projectId, body, tempId });
      console.log('Message sent successfully');
    } catch (error) {
      console.error('Failed to send message:', error);
      // Remove the temporary message on error
      setMessages((prev) => prev.filter(msg => msg.tempId !== tempId));
    }
  };

  // Handle typing indicator
  const handleTyping = async (isTyping) => {
    try {
      await chatService.typing({ projectId, isTyping });
    } catch (error) {
      console.error('Failed to send typing indicator:', error);
    }
  };

  // Load more messages
  const handleLoadMore = useCallback(async () => {
    if (!hasMore || loading) return;

    try {
      setLoading(true);
      const oldestMessage = messages[0];
      const before = oldestMessage?.createdAt;

      const response = await chatService.fetchMessages(projectId, {
        page: page + 1,
        limit: 50,
        before,
      });

      const newMessages = response.data.data || [];
      setMessages((prev) => [...newMessages, ...prev]);
      setHasMore(response.data.hasMore);
      setPage((prev) => prev + 1);
    } catch (error) {
      console.error('Failed to load more messages:', error);
    } finally {
      setLoading(false);
    }
  }, [messages, page, hasMore, loading, projectId]);

  return (
    <div className="h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 p-4 bg-white border-b">
        <div className="flex items-center gap-3">
          <MessageSquare size={24} className="text-primary-600" />
          <div>
            <h2 className="text-xl font-semibold">Project Chat</h2>
            <p className="text-sm text-neutral-500">
              Real-time messaging with your team
            </p>
          </div>
        </div>

        {/* Connection Status */}
        <div className="flex items-center gap-2">
          {connected ? (
            <>
              <Wifi size={16} className="text-success-500" />
              <span className="text-sm text-success-600">Connected</span>
            </>
          ) : (
            <>
              <WifiOff size={16} className="text-danger-500" />
              <span className="text-sm text-danger-600">Disconnected</span>
            </>
          )}
        </div>
      </div>

      {/* Chat Container */}
      <Card className="overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 300px)' }}>
        {/* Messages */}
        <MessageList
          messages={messages}
          currentUserId={user?._id}
          onScroll={handleLoadMore}
          loading={loading && page > 1}
        />

        {/* Typing Indicator */}
        <TypingIndicator typingUsers={typingUsers} />

        {/* Message Input */}
        <MessageInput
          onSend={handleSendMessage}
          onTyping={handleTyping}
          disabled={!connected}
        />
      </Card>
    </div>
  );
};

export default ChatTab;

