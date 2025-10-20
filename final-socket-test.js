/**
 * Final Socket Test
 * 
 * This script tests the socket functionality with minimal complexity
 * to identify the exact issue with the deployed server
 */

import axios from 'axios';
import { io } from 'socket.io-client';

const API_BASE_URL = 'https://project-management-saas-app.onrender.com';
const FRONTEND_URL = 'https://project-management-saas-app-1.onrender.com';

async function finalSocketTest() {
  console.log('🔧 Final Socket Test - Minimal Complexity...\n');
  
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
    console.log('✅ Login successful');
    console.log(`   User: ${loginResponse.data.data.user.fullName}`);
    console.log('');

    // Step 2: Create project
    console.log('2️⃣ Creating project...');
    const projectResponse = await axios.post(`${API_BASE_URL}/api/v1/projects`, {
      name: `Final Test ${Date.now()}`,
      description: 'Final socket test',
      status: 'active'
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Origin': FRONTEND_URL
      }
    });

    const projectId = projectResponse.data.data._id;
    console.log('✅ Project created');
    console.log(`   Project ID: ${projectId}`);
    console.log('');

    // Step 3: Test socket connection with different configurations
    console.log('3️⃣ Testing socket connection configurations...');
    
    // Test 1: Default namespace
    console.log('   Testing default namespace...');
    const defaultSocket = io(API_BASE_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      timeout: 10000,
    });

    defaultSocket.on('connect', () => {
      console.log('   ✅ Default namespace connected');
    });

    defaultSocket.on('connect_error', (error) => {
      console.log('   ❌ Default namespace error:', error.message);
    });

    // Test 2: Chat namespace
    console.log('   Testing chat namespace...');
    const chatSocket = io(API_BASE_URL, {
      path: '/socket.io/',
      namespace: '/chat',
      auth: { token },
      transports: ['websocket', 'polling'],
      timeout: 10000,
    });

    chatSocket.on('connect', () => {
      console.log('   ✅ Chat namespace connected');
    });

    chatSocket.on('connect_error', (error) => {
      console.log('   ❌ Chat namespace error:', error.message);
    });

    // Wait for connections
    await new Promise(resolve => setTimeout(resolve, 3000));
    console.log('');

    // Step 4: Test simple event emission
    console.log('4️⃣ Testing simple event emission...');
    
    if (chatSocket.connected) {
      console.log('   Testing chat:join with callback...');
      
      const joinResult = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Join timeout'));
        }, 5000);

        chatSocket.emit('chat:join', { projectId }, (response) => {
          clearTimeout(timeout);
          console.log('   📥 Join callback received:', response);
          resolve(response);
        });
      });

      console.log('   ✅ Join successful:', joinResult);
    } else {
      console.log('   ❌ Chat socket not connected');
    }

    // Step 5: Test message sending
    console.log('5️⃣ Testing message sending...');
    
    if (chatSocket.connected) {
      console.log('   Testing chat:message with callback...');
      
      const messageResult = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Message timeout'));
        }, 5000);

        chatSocket.emit('chat:message', { 
          projectId, 
          body: 'Final test message',
          tempId: 'final-test'
        }, (response) => {
          clearTimeout(timeout);
          console.log('   📥 Message callback received:', response);
          resolve(response);
        });
      });

      console.log('   ✅ Message successful:', messageResult);
    } else {
      console.log('   ❌ Chat socket not connected');
    }

    // Step 6: Test server logs
    console.log('6️⃣ Checking server response...');
    
    try {
      const healthResponse = await axios.get(`${API_BASE_URL}/api/v1/healthcheck`);
      console.log('   ✅ Server is responding');
      console.log(`   Uptime: ${Math.round(healthResponse.data.data.uptime / 60)} minutes`);
    } catch (error) {
      console.log('   ❌ Server health check failed:', error.message);
    }

    // Step 7: Cleanup
    console.log('7️⃣ Cleaning up...');
    defaultSocket.disconnect();
    chatSocket.disconnect();
    console.log('   ✅ Sockets disconnected');
    console.log('');

    console.log('🎉 Final Socket Test Complete!');
    console.log('\n📋 FINAL TEST SUMMARY:');
    console.log(`✅ Authentication: Working`);
    console.log(`✅ Project Creation: Working`);
    console.log(`✅ Default Socket: ${defaultSocket.connected ? 'Connected' : 'Failed'}`);
    console.log(`✅ Chat Socket: ${chatSocket.connected ? 'Connected' : 'Failed'}`);
    console.log(`✅ Socket Callbacks: ${chatSocket.connected ? 'Testing...' : 'Failed'}`);

  } catch (error) {
    console.log('❌ Final socket test failed:');
    console.log(`   Error: ${error.message}`);
    console.log(`   Stack: ${error.stack}`);
  }
}

// Run the test
finalSocketTest().then(() => {
  console.log('🏁 Final Socket Test Complete');
}).catch(error => {
  console.error('💥 Test failed:', error.message);
});
