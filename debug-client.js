/**
 * Debug Client
 * 
 * Simple client to test socket callbacks
 */

import { io } from 'socket.io-client';
import axios from 'axios';

const API_BASE_URL = 'https://project-management-saas-app.onrender.com';
const DEBUG_SERVER_URL = 'http://localhost:3001';
const FRONTEND_URL = 'https://project-management-saas-app-1.onrender.com';

async function debugClientTest() {
  console.log('🔍 Debug Client Test...\n');
  
  try {
    // Step 1: Login to get token
    console.log('1️⃣ Logging in...');
    const loginResponse = await axios.post(`${API_BASE_URL}/api/v1/auth/login`, {
      email: 'admin@projectcamp.com',
      password: 'Admin123!'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Origin': FRONTEND_URL
      }
    });

    const token = loginResponse.data.data.accessToken;
    console.log('✅ Logged in successfully');
    console.log('');

    // Step 2: Connect to debug server
    console.log('2️⃣ Connecting to debug server...');
    const socket = io(DEBUG_SERVER_URL, {
      auth: {
        token: token,
      },
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
    });

    // Set up event listeners
    socket.on('connect', () => {
      console.log('✅ Socket connected:', socket.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('⚠️  Socket disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      console.log('❌ Connection error:', error.message);
    });

    socket.on('chat:joined', (data) => {
      console.log('✅ Received chat:joined event:', data);
    });

    socket.on('chat:error', (data) => {
      console.log('❌ Received chat:error event:', data);
    });

    socket.on('chat:new-message', (data) => {
      console.log('✅ Received chat:new-message event:', data);
    });

    // Wait for connection
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 10000);

      socket.on('connect', () => {
        clearTimeout(timeout);
        resolve();
      });

      socket.on('connect_error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });

    console.log('');

    // Step 3: Test join with callback
    console.log('3️⃣ Testing join with callback...');
    try {
      const joinResult = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Join callback timeout'));
        }, 5000);

        socket.emit('chat:join', { projectId: 'test-project' }, (response) => {
          clearTimeout(timeout);
          console.log('📤 Join callback received:', response);
          if (response && response.error) {
            reject(new Error(response.error));
          } else {
            resolve(response);
          }
        });
      });

      console.log('✅ Join successful:', joinResult);
    } catch (error) {
      console.log('❌ Join failed:', error.message);
    }

    console.log('');

    // Step 4: Test message with callback
    console.log('4️⃣ Testing message with callback...');
    try {
      const messageResult = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Message callback timeout'));
        }, 5000);

        socket.emit('chat:message', { 
          projectId: 'test-project', 
          body: 'Test message', 
          tempId: 'test-123' 
        }, (response) => {
          clearTimeout(timeout);
          console.log('📤 Message callback received:', response);
          if (response && response.error) {
            reject(new Error(response.error));
          } else {
            resolve(response);
          }
        });
      });

      console.log('✅ Message successful:', messageResult);
    } catch (error) {
      console.log('❌ Message failed:', error.message);
    }

    console.log('');

    // Step 5: Test typing with callback
    console.log('5️⃣ Testing typing with callback...');
    try {
      const typingResult = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Typing callback timeout'));
        }, 5000);

        socket.emit('chat:typing', { 
          projectId: 'test-project', 
          isTyping: true 
        }, (response) => {
          clearTimeout(timeout);
          console.log('📤 Typing callback received:', response);
          if (response && response.error) {
            reject(new Error(response.error));
          } else {
            resolve(response);
          }
        });
      });

      console.log('✅ Typing successful:', typingResult);
    } catch (error) {
      console.log('❌ Typing failed:', error.message);
    }

    console.log('');

    // Step 6: Cleanup
    console.log('6️⃣ Cleaning up...');
    socket.disconnect();
    console.log('✅ Socket disconnected');

  } catch (error) {
    console.log('❌ Debug client test failed:');
    console.log(`   Error: ${error.message}`);
  }
}

// Run the test
debugClientTest().then(() => {
  console.log('🏁 Debug Client Test Complete');
}).catch(error => {
  console.error('💥 Test failed:', error.message);
});
