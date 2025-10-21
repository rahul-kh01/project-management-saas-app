/**
 * Production-Grade Chat Service
 * 
 * This service provides robust real-time chat functionality with:
 * - Enhanced error handling and recovery
 * - Automatic reconnection
 * - Message queuing
 * - Performance optimizations
 * - Production-ready configuration
 */

import { io } from 'socket.io-client';
import api from '../config/api';

let socket = null;
let token = null;
let messageQueue = [];
let isConnected = false;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;

// Enhanced connection configuration for production
const getSocketConfig = (authToken) => ({
  path: '/socket.io/',
  auth: {
    token: authToken,
  },
  transports: ['websocket', 'polling'],
  // Production timeouts
  timeout: 30000,                    // 30 second connection timeout
  forceNew: true,                   // Force new connection
  reconnection: true,               // Enable reconnection
  reconnectionDelay: 1000,         // 1 second reconnection delay
  reconnectionAttempts: maxReconnectAttempts, // Max reconnection attempts
  reconnectionDelayMax: 5000,       // 5 second max reconnection delay
  randomizationFactor: 0.5,        // Randomization factor
  // Connection state recovery
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
    skipMiddlewares: true,
  },
  // Performance optimizations
  upgrade: true,                    // Enable upgrade
  rememberUpgrade: true,           // Remember upgrade
  autoConnect: true,               // Auto connect
  // Additional production settings
  compression: true,                // Enable compression
  multiplex: true,                  // Enable multiplexing
});

export const chatService = {
  // Initialize Socket.IO connection with production settings
  connectSocket: (authToken) => {
    if (socket && socket.connected) {
      return socket;
    }

    token = authToken;
    const serverUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

    // Connect to the /chat namespace
    socket = io(serverUrl + '/chat', getSocketConfig(authToken));

    // Enhanced connection events with better error handling
    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      isConnected = true;
      reconnectAttempts = 0;
      
      // Process queued messages
      this.processMessageQueue();
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      isConnected = false;
      
      if (reason === 'io server disconnect') {
        // Server disconnected, try to reconnect
        socket.connect();
      }
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      isConnected = false;
      reconnectAttempts++;
      
      // Handle specific error types
      if (error.message === 'Authentication failed') {
        console.error('Authentication failed, please login again');
        this.handleAuthError();
      }
      
      // Exponential backoff for reconnection
      if (reconnectAttempts < maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 5000);
        setTimeout(() => {
          socket.connect();
        }, delay);
      }
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log('Socket reconnected after', attemptNumber, 'attempts');
      isConnected = true;
      reconnectAttempts = 0;
    });

    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('Socket reconnection attempt:', attemptNumber);
    });

    socket.on('reconnect_error', (error) => {
      console.error('Socket reconnection error:', error);
    });

    socket.on('reconnect_failed', () => {
      console.error('Socket reconnection failed');
      this.handleConnectionFailure();
    });

    socket.on('chat:error', (data) => {
      console.error('Chat error:', data.error || data.message);
    });

    return socket;
  },

  // Handle authentication errors
  handleAuthError: () => {
    // Clear tokens and redirect to login
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    window.location.href = '/login';
  },

  // Handle connection failure
  handleConnectionFailure: () => {
    console.error('Connection failed after maximum attempts');
    // Could implement fallback to REST API here
  },

  // Process queued messages when connection is restored
  processMessageQueue: () => {
    if (messageQueue.length > 0) {
      console.log(`Processing ${messageQueue.length} queued messages`);
      messageQueue.forEach(message => {
        this.sendMessage(message);
      });
      messageQueue = [];
    }
  },

  // Queue message for later sending
  queueMessage: (message) => {
    messageQueue.push(message);
    console.log(`Message queued: ${messageQueue.length} messages in queue`);
  },

  // Disconnect socket
  disconnectSocket: () => {
    if (socket) {
      socket.disconnect();
      socket = null;
      isConnected = false;
    }
  },

  // Get current socket instance
  getSocket: () => {
    return socket;
  },

  // Check if socket is connected
  isConnected: () => {
    return isConnected && socket && socket.connected;
  },

  // Join project chat room with enhanced error handling
  joinProject: (projectId) => {
    if (!socket) {
      console.error('Socket not connected');
      return Promise.reject(new Error('Socket not connected'));
    }

    if (!this.isConnected()) {
      console.error('Socket not connected, attempting to reconnect...');
      socket.connect();
      return Promise.reject(new Error('Socket not connected, please try again'));
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.error('Join timeout for project:', projectId);
        reject(new Error('Join timeout - no response from server'));
      }, 20000); // 20 second timeout

      console.log('Attempting to join project:', projectId);
      socket.emit('chat:join', { projectId }, (response) => {
        clearTimeout(timeout);
        
        if (response && response.error) {
          console.error('Join failed:', response.error);
          reject(new Error(response.error));
        } else {
          console.log('Successfully joined project:', response);
          resolve(response);
        }
      });
    });
  },

  // Leave project chat room with enhanced error handling
  leaveProject: (projectId) => {
    if (!socket) return Promise.reject(new Error('Socket not connected'));

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Leave timeout - no response from server'));
      }, 10000); // 10 second timeout

      socket.emit('chat:leave', { projectId }, (response) => {
        clearTimeout(timeout);
        
        if (response && response.error) {
          console.error('Leave failed:', response.error);
          reject(new Error(response.error));
        } else {
          console.log('Successfully left project:', response);
          resolve(response);
        }
      });
    });
  },

  // Send message with enhanced retry mechanism and queuing
  sendMessage: ({ projectId, body, tempId }) => {
    if (!socket) {
      console.error('Socket not connected');
      return Promise.reject(new Error('Socket not connected'));
    }

    if (!this.isConnected()) {
      console.error('Socket not connected, queuing message');
      this.queueMessage({ projectId, body, tempId });
      return Promise.reject(new Error('Socket not connected, message queued'));
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.error('Message send timeout for project:', projectId, 'body:', body);
        reject(new Error('Message send timeout - no response from server'));
      }, 25000); // 25 second timeout

      console.log('Sending message to project:', projectId, 'body:', body);
      socket.emit('chat:message', { projectId, body, tempId }, (response) => {
        clearTimeout(timeout);
        
        if (response && response.error) {
          console.error('Message send failed:', response.error);
          reject(new Error(response.error));
        } else {
          console.log('Message sent successfully:', response);
          resolve(response);
        }
      });
    });
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

  // Send typing indicator with enhanced error handling
  typing: ({ projectId, isTyping }) => {
    if (!socket) return Promise.reject(new Error('Socket not connected'));

    if (!this.isConnected()) {
      console.error('Socket not connected for typing indicator');
      return Promise.reject(new Error('Socket not connected'));
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.error('Typing indicator timeout for project:', projectId);
        reject(new Error('Typing indicator timeout - no response from server'));
      }, 15000); // 15 second timeout

      console.log('Sending typing indicator for project:', projectId, 'isTyping:', isTyping);
      socket.emit('chat:typing', { projectId, isTyping }, (response) => {
        clearTimeout(timeout);
        
        if (response && response.error) {
          console.error('Typing indicator failed:', response.error);
          reject(new Error(response.error));
        } else {
          console.log('Typing indicator sent successfully:', response);
          resolve(response);
        }
      });
    });
  },

  // Listen for typing events
  onTyping: (callback) => {
    if (!socket) return;

    socket.on('chat:user-typing', callback);

    return () => {
      socket.off('chat:user-typing', callback);
    };
  },

  // Mark message as seen with enhanced error handling
  seen: ({ projectId, messageId }) => {
    if (!socket) return Promise.reject(new Error('Socket not connected'));

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Seen indicator timeout - no response from server'));
      }, 10000); // 10 second timeout

      socket.emit('chat:seen', { projectId, messageId }, (response) => {
        clearTimeout(timeout);
        
        if (response && response.error) {
          console.error('Seen indicator failed:', response.error);
          reject(new Error(response.error));
        } else {
          console.log('Seen indicator sent successfully:', response);
          resolve(response);
        }
      });
    });
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

  // REST API - Fetch message history with enhanced error handling
  fetchMessages: async (projectId, params = {}) => {
    try {
      const queryParams = new URLSearchParams();

      if (params.page) queryParams.append('page', params.page);
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.before) queryParams.append('before', params.before);

      const queryString = queryParams.toString();
      const url = `/api/v1/chat/${projectId}/messages${queryString ? `?${queryString}` : ''}`;

      const response = await api.get(url);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      throw error;
    }
  },

  // REST API - Send message (fallback)
  postMessage: async (projectId, messageData) => {
    try {
      const response = await api.post(
        `/api/v1/chat/${projectId}/messages`,
        messageData
      );
      return response.data;
    } catch (error) {
      console.error('Failed to post message:', error);
      throw error;
    }
  },

  // REST API - Mark message as read
  markAsRead: async (projectId, messageId) => {
    try {
      const response = await api.post(
        `/api/v1/chat/${projectId}/messages/${messageId}/read`
      );
      return response.data;
    } catch (error) {
      console.error('Failed to mark as read:', error);
      throw error;
    }
  },

  // Get connection status
  getConnectionStatus: () => {
    return {
      connected: this.isConnected(),
      socketId: socket?.id,
      reconnectAttempts,
      queuedMessages: messageQueue.length
    };
  }
};
