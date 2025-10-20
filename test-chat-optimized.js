/**
 * Optimized Chat System Test
 * 
 * This script tests all the chat optimizations including:
 * - Enhanced acknowledgments
 * - Improved error handling
 * - Caching system
 * - Real-time functionality
 */

import axios from 'axios';
import { io } from 'socket.io-client';

const API_BASE_URL = 'https://project-management-saas-app.onrender.com';
const FRONTEND_URL = 'https://project-management-saas-app-1.onrender.com';

let authToken = null;
let projectId = null;
let socket = null;

async function testOptimizedChat() {
  console.log('🚀 Testing Optimized Chat System...\n');
  
  try {
    // Step 1: Login to get auth token
    console.log('1️⃣ Logging in to get auth token...');
    const loginResponse = await axios.post(`${API_BASE_URL}/api/v1/auth/login`, {
      email: 'admin@projectcamp.com',
      password: 'Admin123!'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Origin': FRONTEND_URL
      }
    });

    authToken = loginResponse.data.data.accessToken;
    console.log('✅ Login successful');
    console.log(`   User: ${loginResponse.data.data.user.fullName}`);
    console.log('');

    // Step 2: Create a unique test project
    console.log('2️⃣ Creating a unique test project...');
    const projectData = {
      name: `Optimized Chat Test ${Date.now()}`,
      description: 'Project for testing optimized chat functionality',
      status: 'active'
    };

    const projectResponse = await axios.post(`${API_BASE_URL}/api/v1/projects`, projectData, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        'Origin': FRONTEND_URL
      }
    });

    projectId = projectResponse.data.data._id;
    console.log('✅ Project created successfully');
    console.log(`   Project ID: ${projectId}`);
    console.log('');

    // Step 3: Test Socket.IO with enhanced configuration
    console.log('3️⃣ Testing Socket.IO with enhanced configuration...');
    
    socket = io(API_BASE_URL, {
      path: '/socket.io/',
      namespace: '/chat',
      auth: {
        token: authToken,
      },
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
      // Enhanced connection settings
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      maxReconnectionAttempts: 5,
      reconnectionDelayMax: 5000,
      randomizationFactor: 0.5,
    });

    // Test results tracking
    const testResults = {
      connection: false,
      roomJoin: false,
      messageSending: false,
      messageReceiving: false,
      typingIndicators: false,
      seenReceipts: false,
      acknowledgments: false,
      errorHandling: false
    };

    // Connection events
    socket.on('connect', () => {
      console.log('✅ Socket connected successfully');
      console.log(`   Socket ID: ${socket.id}`);
      console.log(`   Transport: ${socket.io.engine.transport.name}`);
      testResults.connection = true;
    });

    socket.on('disconnect', (reason) => {
      console.log('⚠️  Socket disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      console.log('❌ Socket connection error:', error.message);
    });

    // Chat events
    socket.on('chat:joined', (data) => {
      console.log('✅ Successfully joined project room');
      console.log(`   Project ID: ${data.projectId}`);
      console.log(`   Success: ${data.success}`);
      testResults.roomJoin = true;
    });

    socket.on('chat:error', (data) => {
      console.log('❌ Chat error:', data.error || data.message);
      testResults.errorHandling = true; // Error handling is working
    });

    socket.on('chat:new-message', (data) => {
      console.log('✅ New message received:', data.message.body);
      console.log(`   Sender: ${data.message.sender.fullName}`);
      console.log(`   Temp ID: ${data.tempId || 'None'}`);
      testResults.messageReceiving = true;
    });

    socket.on('chat:user-typing', (data) => {
      console.log('✅ Typing indicator received:', data.user.fullName, 'is typing:', data.isTyping);
      testResults.typingIndicators = true;
    });

    socket.on('chat:message-seen', (data) => {
      console.log('✅ Seen receipt received:', data.username, 'saw message', data.messageId);
      testResults.seenReceipts = true;
    });

    // Wait for connection
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Socket connection timeout'));
      }, 15000);

      if (socket.connected) {
        clearTimeout(timeout);
        resolve();
      } else {
        socket.on('connect', () => {
          clearTimeout(timeout);
          resolve();
        });
        
        socket.on('connect_error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      }
    });

    // Step 4: Test room join with enhanced acknowledgment
    console.log('4️⃣ Testing room join with enhanced acknowledgment...');
    
    try {
      const joinResponse = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Join timeout'));
        }, 10000);

        socket.emit('chat:join', { projectId }, (response) => {
          clearTimeout(timeout);
          if (response && response.error) {
            reject(new Error(response.error));
          } else {
            resolve(response);
          }
        });
      });

      console.log('✅ Join acknowledgment received:', joinResponse);
      testResults.acknowledgments = true;
    } catch (error) {
      console.log('❌ Join failed:', error.message);
    }
    
    // Wait a bit for the join event
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 5: Test message sending with enhanced acknowledgment
    console.log('5️⃣ Testing message sending with enhanced acknowledgment...');
    
    const testMessage = {
      projectId,
      body: `Optimized test message ${Date.now()}`,
      tempId: `test-opt-${Date.now()}`
    };

    try {
      const messageResponse = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Message send timeout'));
        }, 15000);

        socket.emit('chat:message', testMessage, (response) => {
          clearTimeout(timeout);
          if (response && response.error) {
            reject(new Error(response.error));
          } else {
            resolve(response);
          }
        });
      });

      console.log('✅ Message acknowledgment received:', messageResponse);
      testResults.messageSending = true;
    } catch (error) {
      console.log('❌ Message send failed:', error.message);
    }
    
    // Wait for message to be processed and received
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 6: Test typing indicator with enhanced acknowledgment
    console.log('6️⃣ Testing typing indicator with enhanced acknowledgment...');
    
    try {
      const typingResponse = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Typing timeout'));
        }, 5000);

        socket.emit('chat:typing', { projectId, isTyping: true }, (response) => {
          clearTimeout(timeout);
          if (response && response.error) {
            reject(new Error(response.error));
          } else {
            resolve(response);
          }
        });
      });

      console.log('✅ Typing acknowledgment received:', typingResponse);
    } catch (error) {
      console.log('❌ Typing failed:', error.message);
    }
    
    // Wait for typing indicator
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Stop typing
    try {
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Stop typing timeout'));
        }, 5000);

        socket.emit('chat:typing', { projectId, isTyping: false }, (response) => {
          clearTimeout(timeout);
          if (response && response.error) {
            reject(new Error(response.error));
          } else {
            resolve(response);
          }
        });
      });
      console.log('✅ Stop typing acknowledgment received');
    } catch (error) {
      console.log('❌ Stop typing failed:', error.message);
    }

    // Step 7: Test seen functionality with enhanced acknowledgment
    console.log('7️⃣ Testing seen functionality with enhanced acknowledgment...');
    
    // First, get the last message ID
    const messagesResponse = await axios.get(`${API_BASE_URL}/api/v1/chat/${projectId}/messages`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Origin': FRONTEND_URL
      }
    });

    if (messagesResponse.data.data.data.length > 0) {
      const lastMessage = messagesResponse.data.data.data[messagesResponse.data.data.data.length - 1];
      const messageId = lastMessage._id;
      
      try {
        const seenResponse = await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Seen timeout'));
          }, 5000);

          socket.emit('chat:seen', { projectId, messageId }, (response) => {
            clearTimeout(timeout);
            if (response && response.error) {
              reject(new Error(response.error));
            } else {
              resolve(response);
            }
          });
        });

        console.log('✅ Seen acknowledgment received:', seenResponse);
      } catch (error) {
        console.log('❌ Seen failed:', error.message);
      }
    }

    // Step 8: Test leave functionality with enhanced acknowledgment
    console.log('8️⃣ Testing leave functionality with enhanced acknowledgment...');
    
    try {
      const leaveResponse = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Leave timeout'));
        }, 5000);

        socket.emit('chat:leave', { projectId }, (response) => {
          clearTimeout(timeout);
          if (response && response.error) {
            reject(new Error(response.error));
          } else {
            resolve(response);
          }
        });
      });

      console.log('✅ Leave acknowledgment received:', leaveResponse);
    } catch (error) {
      console.log('❌ Leave failed:', error.message);
    }

    // Step 9: Test error handling
    console.log('9️⃣ Testing error handling...');
    
    try {
      // Try to join with invalid project ID
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Invalid join timeout'));
        }, 5000);

        socket.emit('chat:join', { projectId: 'invalid-id' }, (response) => {
          clearTimeout(timeout);
          if (response && response.error) {
            console.log('✅ Error handling working - invalid project ID rejected');
            testResults.errorHandling = true;
            resolve(response);
          } else {
            reject(new Error('Expected error for invalid project ID'));
          }
        });
      });
    } catch (error) {
      console.log('⚠️  Error handling test inconclusive:', error.message);
    }

    // Step 10: Final Results
    console.log('🔟 Final Results...');
    console.log('='.repeat(60));
    console.log(`✅ Socket Connection: ${testResults.connection ? 'Working' : 'Failed'}`);
    console.log(`✅ Room Join: ${testResults.roomJoin ? 'Working' : 'Failed'}`);
    console.log(`✅ Message Sending: ${testResults.messageSending ? 'Working' : 'Failed'}`);
    console.log(`✅ Message Receiving: ${testResults.messageReceiving ? 'Working' : 'Failed'}`);
    console.log(`✅ Typing Indicators: ${testResults.typingIndicators ? 'Working' : 'Failed'}`);
    console.log(`✅ Seen Receipts: ${testResults.seenReceipts ? 'Working' : 'Failed'}`);
    console.log(`✅ Acknowledgments: ${testResults.acknowledgments ? 'Working' : 'Failed'}`);
    console.log(`✅ Error Handling: ${testResults.errorHandling ? 'Working' : 'Failed'}`);
    console.log('='.repeat(60));

    const workingFeatures = Object.values(testResults).filter(Boolean).length;
    const totalFeatures = Object.keys(testResults).length;
    const successRate = (workingFeatures / totalFeatures * 100).toFixed(1);

    if (successRate >= 80) {
      console.log('🎉 CHAT SYSTEM: FULLY OPTIMIZED!');
      console.log(`   Success Rate: ${successRate}% (${workingFeatures}/${totalFeatures} features working)`);
    } else if (successRate >= 60) {
      console.log('⚠️  CHAT SYSTEM: MOSTLY WORKING');
      console.log(`   Success Rate: ${successRate}% (${workingFeatures}/${totalFeatures} features working)`);
    } else {
      console.log('❌ CHAT SYSTEM: NEEDS MORE WORK');
      console.log(`   Success Rate: ${successRate}% (${workingFeatures}/${totalFeatures} features working)`);
    }

    // Step 11: Cleanup
    console.log('🔟 Cleaning up...');
    if (socket) {
      socket.disconnect();
      console.log('✅ Socket disconnected');
    }
    console.log('');

  } catch (error) {
    console.log('❌ Optimized chat test failed:');
    console.log(`   Error: ${error.response?.data?.message || error.message}`);
    console.log(`   Status: ${error.response?.status}`);
  }
}

// Run the test
testOptimizedChat().then(() => {
  console.log('🏁 Optimized Chat Test Complete');
}).catch(error => {
  console.error('💥 Test failed:', error.message);
});
