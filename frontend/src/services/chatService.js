import { io } from 'socket.io-client';
import api from '../config/api';

let socket = null;
let token = null;

export const chatService = {
  // Initialize Socket.IO connection
  connectSocket: (authToken) => {
    if (socket && socket.connected) {
      return socket;
    }

    token = authToken;

    const serverUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

    socket = io(serverUrl, {
      path: '/socket.io/',
      namespace: '/chat',
      auth: {
        token: authToken,
      },
      transports: ['websocket', 'polling'],
    });

    // Connection events
    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    socket.on('chat:error', (data) => {
      console.error('Chat error:', data.message);
    });

    return socket;
  },

  // Disconnect socket
  disconnectSocket: () => {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  },

  // Get current socket instance
  getSocket: () => {
    return socket;
  },

  // Join project chat room
  joinProject: (projectId) => {
    if (!socket) {
      console.error('Socket not connected');
      return;
    }

    socket.emit('chat:join', { projectId });
  },

  // Leave project chat room
  leaveProject: (projectId) => {
    if (!socket) return;

    socket.emit('chat:leave', { projectId });
  },

  // Send message
  sendMessage: ({ projectId, body, tempId }) => {
    if (!socket) {
      console.error('Socket not connected');
      return;
    }

    socket.emit('chat:message', { projectId, body, tempId });
  },

  // Listen for new messages
  onMessage: (callback) => {
    if (!socket) return;

    socket.on('chat:new-message', callback);

    // Return cleanup function
    return () => {
      socket.off('chat:new-message', callback);
    };
  },

  // Send typing indicator
  typing: ({ projectId, isTyping }) => {
    if (!socket) return;

    socket.emit('chat:typing', { projectId, isTyping });
  },

  // Listen for typing events
  onTyping: (callback) => {
    if (!socket) return;

    socket.on('chat:user-typing', callback);

    return () => {
      socket.off('chat:user-typing', callback);
    };
  },

  // Mark message as seen
  seen: ({ projectId, messageId }) => {
    if (!socket) return;

    socket.emit('chat:seen', { projectId, messageId });
  },

  // Listen for seen events
  onSeen: (callback) => {
    if (!socket) return;

    socket.on('chat:message-seen', callback);

    return () => {
      socket.off('chat:message-seen', callback);
    };
  },

  // Listen for user joined events
  onUserJoined: (callback) => {
    if (!socket) return;

    socket.on('chat:user-joined', callback);

    return () => {
      socket.off('chat:user-joined', callback);
    };
  },

  // Listen for user left events
  onUserLeft: (callback) => {
    if (!socket) return;

    socket.on('chat:user-left', callback);

    return () => {
      socket.off('chat:user-left', callback);
    };
  },

  // Listen for joined confirmation
  onJoined: (callback) => {
    if (!socket) return;

    socket.on('chat:joined', callback);

    return () => {
      socket.off('chat:joined', callback);
    };
  },

  // REST API - Fetch message history
  fetchMessages: async (projectId, params = {}) => {
    const queryParams = new URLSearchParams();

    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.before) queryParams.append('before', params.before);

    const queryString = queryParams.toString();
    const url = `/api/v1/chat/${projectId}/messages${queryString ? `?${queryString}` : ''}`;

    const response = await api.get(url);
    return response.data;
  },

  // REST API - Send message (fallback)
  postMessage: async (projectId, messageData) => {
    const response = await api.post(
      `/api/v1/chat/${projectId}/messages`,
      messageData
    );
    return response.data;
  },

  // REST API - Mark message as read
  markAsRead: async (projectId, messageId) => {
    const response = await api.post(
      `/api/v1/chat/${projectId}/messages/${messageId}/read`
    );
    return response.data;
  },
};

