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
      // Performance optimizations
      timeout: 20000,                    // Connection timeout
      forceNew: true,                    // Force new connection
      reconnection: true,                // Enable reconnection
      reconnectionDelay: 1000,           // Reconnection delay
      reconnectionAttempts: 5,           // Max reconnection attempts
      maxReconnectionAttempts: 5,        // Max reconnection attempts
      reconnectionDelayMax: 5000,        // Max reconnection delay
      randomizationFactor: 0.5,          // Randomization factor
      // Connection state recovery
      connectionStateRecovery: {
        maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
        skipMiddlewares: true,
      },
      // Additional optimizations
      upgrade: true,                     // Enable upgrade
      rememberUpgrade: true,             // Remember upgrade
      autoConnect: true,                 // Auto connect
    });

    // Connection events with better error handling
    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      // Clear any pending reconnection attempts
      socket.io.engine.reconnectAttempts = 0;
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      if (reason === 'io server disconnect') {
        // Server disconnected, try to reconnect
        socket.connect();
      }
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      // Handle specific error types
      if (error.message === 'Authentication failed') {
        console.error('Authentication failed, please login again');
        // Clear tokens and redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log('Socket reconnected after', attemptNumber, 'attempts');
    });

    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('Socket reconnection attempt:', attemptNumber);
    });

    socket.on('reconnect_error', (error) => {
      console.error('Socket reconnection error:', error);
    });

    socket.on('reconnect_failed', () => {
      console.error('Socket reconnection failed');
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

  // Join project chat room with acknowledgment
  joinProject: (projectId) => {
    if (!socket) {
      console.error('Socket not connected');
      return Promise.reject(new Error('Socket not connected'));
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Join timeout - no response from server'));
      }, 10000); // 10 second timeout

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

  // Leave project chat room with acknowledgment
  leaveProject: (projectId) => {
    if (!socket) return Promise.reject(new Error('Socket not connected'));

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Leave timeout - no response from server'));
      }, 5000); // 5 second timeout

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

  // Send message with retry mechanism and acknowledgment
  sendMessage: ({ projectId, body, tempId }) => {
    if (!socket) {
      console.error('Socket not connected');
      return Promise.reject(new Error('Socket not connected'));
    }

    if (!socket.connected) {
      console.error('Socket not connected, attempting to reconnect...');
      socket.connect();
      // Queue message for when connection is restored
      return new Promise((resolve, reject) => {
        socket.once('connect', () => {
          this.sendMessage({ projectId, body, tempId })
            .then(resolve)
            .catch(reject);
        });
        
        socket.once('connect_error', (error) => {
          reject(new Error('Failed to reconnect: ' + error.message));
        });
      });
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Message send timeout - no response from server'));
      }, 15000); // 15 second timeout

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

  // Send typing indicator with acknowledgment
  typing: ({ projectId, isTyping }) => {
    if (!socket) return Promise.reject(new Error('Socket not connected'));

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Typing indicator timeout - no response from server'));
      }, 5000); // 5 second timeout

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

  // Mark message as seen with acknowledgment
  seen: ({ projectId, messageId }) => {
    if (!socket) return Promise.reject(new Error('Socket not connected'));

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Seen indicator timeout - no response from server'));
      }, 5000); // 5 second timeout

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

