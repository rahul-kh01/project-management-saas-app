/**
 * Debug Socket Test
 * 
 * This script tests the debug socket handler to verify acknowledgments work
 */

import axios from 'axios';
import { io } from 'socket.io-client';

const API_BASE_URL = 'https://project-management-saas-app.onrender.com';
const FRONTEND_URL = 'https://project-management-saas-app-1.onrender.com';

let authToken = null;
let projectId = null;
let socket = null;

async function testDebugSocket() {
  console.log('🔧 Testing Debug Socket Handler...\n');
  
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

    // Step 2: Create a test project
    console.log('2️⃣ Creating a test project...');
    const projectResponse = await axios.post(`${API_BASE_URL}/api/v1/projects`, {
      name: `Debug Test Project ${Date.now()}`,
      description: 'Project for testing debug socket',
      status: 'active'
    }, {
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

    // Step 3: Test Socket.IO connection
    console.log('3️⃣ Testing Socket.IO connection...');
    
    socket = io(API_BASE_URL, {
      path: '/socket.io/',
      namespace: '/chat',
      auth: {
        token: authToken,
      },
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
    });

    // Connection events
    socket.on('connect', () => {
      console.log('✅ Socket connected successfully');
      console.log(`   Socket ID: ${socket.id}`);
      console.log(`   Transport: ${socket.io.engine.transport.name}`);
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
      console.log(`   Response:`, data);
    });

    socket.on('chat:error', (data) => {
      console.log('❌ Chat error:', data);
    });

    socket.on('chat:new-message', (data) => {
      console.log('✅ New message received:', data);
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

    // Step 4: Test room join with debug handler
    console.log('4️⃣ Testing room join with debug handler...');
    
    try {
      const joinResponse = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Join timeout'));
        }, 5000);

        console.log('   Sending join request...');
        socket.emit('chat:join', { projectId }, (response) => {
          clearTimeout(timeout);
          console.log('   Join callback received:', response);
          resolve(response);
        });
      });

      console.log('✅ Join acknowledgment received:', joinResponse);
    } catch (error) {
      console.log('❌ Join failed:', error.message);
    }
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 5: Test message sending with debug handler
    console.log('5️⃣ Testing message sending with debug handler...');
    
    try {
      const messageResponse = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Message timeout'));
        }, 5000);

        console.log('   Sending message...');
        socket.emit('chat:message', { 
          projectId, 
          body: 'Debug test message',
          tempId: 'debug-test'
        }, (response) => {
          clearTimeout(timeout);
          console.log('   Message callback received:', response);
          resolve(response);
        });
      });

      console.log('✅ Message acknowledgment received:', messageResponse);
    } catch (error) {
      console.log('❌ Message send failed:', error.message);
    }
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 6: Test typing with debug handler
    console.log('6️⃣ Testing typing with debug handler...');
    
    try {
      const typingResponse = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Typing timeout'));
        }, 5000);

        console.log('   Sending typing...');
        socket.emit('chat:typing', { 
          projectId, 
          isTyping: true 
        }, (response) => {
          clearTimeout(timeout);
          console.log('   Typing callback received:', response);
          resolve(response);
        });
      });

      console.log('✅ Typing acknowledgment received:', typingResponse);
    } catch (error) {
      console.log('❌ Typing failed:', error.message);
    }

    // Step 7: Cleanup
    console.log('7️⃣ Cleaning up...');
    if (socket) {
      socket.disconnect();
      console.log('✅ Socket disconnected');
    }
    console.log('');

    console.log('🎉 Debug socket test completed!');

  } catch (error) {
    console.log('❌ Debug socket test failed:');
    console.log(`   Error: ${error.response?.data?.message || error.message}`);
    console.log(`   Status: ${error.response?.status}`);
  }
}

// Run the test
testDebugSocket().then(() => {
  console.log('🏁 Debug Socket Test Complete');
}).catch(error => {
  console.error('💥 Test failed:', error.message);
});
