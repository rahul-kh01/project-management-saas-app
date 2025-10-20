/**
 * Simple Socket Test
 * 
 * Test to verify server socket handlers are working
 */

import { io } from 'socket.io-client';
import axios from 'axios';

const API_BASE_URL = 'https://project-management-saas-app.onrender.com';
const FRONTEND_URL = 'https://project-management-saas-app-1.onrender.com';

async function simpleSocketTest() {
  console.log('🔍 Simple Socket Test...\n');
  
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
    console.log('✅ Logged in successfully');
    console.log('');

    // Step 2: Connect socket
    console.log('2️⃣ Connecting socket...');
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

    // Step 3: Test join with callback
    console.log('3️⃣ Testing join with callback...');
    try {
      const joinResult = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Join callback timeout'));
        }, 10000);

        console.log('📤 Sending join request...');
        socket.emit('chat:join', { projectId: 'test-project-123' }, (response) => {
          clearTimeout(timeout);
          console.log('📥 Join callback received:', response);
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

    // Step 4: Cleanup
    console.log('4️⃣ Cleaning up...');
    socket.disconnect();
    console.log('✅ Socket disconnected');

  } catch (error) {
    console.log('❌ Simple socket test failed:');
    console.log(`   Error: ${error.message}`);
  }
}

// Run the test
simpleSocketTest().then(() => {
  console.log('🏁 Simple Socket Test Complete');
}).catch(error => {
  console.error('💥 Test failed:', error.message);
});
