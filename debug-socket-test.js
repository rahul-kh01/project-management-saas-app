/**
 * Debug Socket Test
 * 
 * Simple test to debug socket connection and acknowledgment issues
 */

import axios from 'axios';
import { io } from 'socket.io-client';

const API_BASE_URL = 'https://project-management-saas-app.onrender.com';
const FRONTEND_URL = 'https://project-management-saas-app-1.onrender.com';

async function debugSocketTest() {
  console.log('🔍 Debug Socket Test...\n');
  
  try {
    // Step 1: Login
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
    const user = loginResponse.data.data.user;
    console.log('✅ Logged in successfully');
    console.log(`   User: ${user.username}`);
    console.log('');

    // Step 2: Create project
    console.log('2️⃣ Creating project...');
    const projectResponse = await axios.post(`${API_BASE_URL}/api/v1/projects`, {
      name: `Debug Test ${Date.now()}`,
      description: 'Project for debugging socket issues',
      status: 'active'
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Origin': FRONTEND_URL
      }
    });

    const projectId = projectResponse.data.data._id;
    console.log('✅ Project created successfully');
    console.log(`   Project ID: ${projectId}`);
    console.log('');

    // Step 3: Connect socket
    console.log('3️⃣ Connecting socket...');
    const socket = io(API_BASE_URL, {
      path: '/socket.io/',
      namespace: '/chat',
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

    // Step 4: Test join with callback
    console.log('4️⃣ Testing join with callback...');
    try {
      const joinResult = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Join callback timeout'));
        }, 15000);

        socket.emit('chat:join', { projectId }, (response) => {
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

    // Step 5: Test message with callback
    console.log('5️⃣ Testing message with callback...');
    try {
      const messageResult = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Message callback timeout'));
        }, 15000);

        socket.emit('chat:message', { 
          projectId, 
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

    // Step 6: Test typing with callback
    console.log('6️⃣ Testing typing with callback...');
    try {
      const typingResult = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Typing callback timeout'));
        }, 10000);

        socket.emit('chat:typing', { 
          projectId, 
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

    // Step 7: Cleanup
    console.log('7️⃣ Cleaning up...');
    socket.disconnect();
    console.log('✅ Socket disconnected');

  } catch (error) {
    console.log('❌ Debug test failed:');
    console.log(`   Error: ${error.message}`);
    console.log(`   Status: ${error.response?.status}`);
  }
}

// Run the test
debugSocketTest().then(() => {
  console.log('🏁 Debug Socket Test Complete');
}).catch(error => {
  console.error('💥 Test failed:', error.message);
});
