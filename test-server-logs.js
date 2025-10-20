/**
 * Test Server Logs
 * 
 * This script tests if the server is actually receiving socket events
 * and provides detailed logging to identify the issue
 */

import axios from 'axios';
import { io } from 'socket.io-client';

const API_BASE_URL = 'https://project-management-saas-app.onrender.com';
const FRONTEND_URL = 'https://project-management-saas-app-1.onrender.com';

async function testServerLogs() {
  console.log('🔍 Testing Server Logs and Socket Events...\n');
  
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
      name: `Server Log Test ${Date.now()}`,
      description: 'Testing server logs',
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

    // Step 3: Test socket connection
    console.log('3️⃣ Testing socket connection...');
    
    const socket = io(API_BASE_URL, {
      path: '/socket.io/',
      namespace: '/chat',
      auth: { token },
      transports: ['websocket', 'polling'],
      timeout: 30000,
      forceNew: true,
    });

    // Connection events
    socket.on('connect', () => {
      console.log('✅ Socket connected');
      console.log(`   Socket ID: ${socket.id}`);
      console.log(`   Transport: ${socket.io.engine.transport.name}`);
    });

    socket.on('disconnect', (reason) => {
      console.log('⚠️  Socket disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      console.log('❌ Connection error:', error.message);
    });

    // Chat events
    socket.on('chat:joined', (data) => {
      console.log('✅ Chat joined event received:', data);
    });

    socket.on('chat:error', (data) => {
      console.log('❌ Chat error event received:', data);
    });

    socket.on('chat:new-message', (data) => {
      console.log('✅ New message event received:', data);
    });

    socket.on('chat:user-typing', (data) => {
      console.log('✅ User typing event received:', data);
    });

    // Wait for connection
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
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

    console.log('✅ Connection established');
    console.log('');

    // Step 4: Test join with immediate callback
    console.log('4️⃣ Testing join with immediate callback...');
    
    try {
      const joinResult = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Join callback timeout'));
        }, 3000); // 3 second timeout

        console.log('   Sending join request...');
        socket.emit('chat:join', { projectId }, (response) => {
          clearTimeout(timeout);
          console.log('   📥 Join callback received:', response);
          resolve(response);
        });
      });

      console.log('✅ Join callback working!');
      console.log(`   Response: ${JSON.stringify(joinResult)}`);
    } catch (error) {
      console.log('❌ Join callback failed:', error.message);
      console.log('   This indicates the server is not responding to socket events');
    }
    console.log('');

    // Step 5: Test message with immediate callback
    console.log('5️⃣ Testing message with immediate callback...');
    
    try {
      const messageResult = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Message callback timeout'));
        }, 3000); // 3 second timeout

        console.log('   Sending message...');
        socket.emit('chat:message', { 
          projectId, 
          body: 'Server log test message',
          tempId: 'server-log-test'
        }, (response) => {
          clearTimeout(timeout);
          console.log('   📥 Message callback received:', response);
          resolve(response);
        });
      });

      console.log('✅ Message callback working!');
      console.log(`   Response: ${JSON.stringify(messageResult)}`);
    } catch (error) {
      console.log('❌ Message callback failed:', error.message);
    }
    console.log('');

    // Step 6: Test typing with immediate callback
    console.log('6️⃣ Testing typing with immediate callback...');
    
    try {
      const typingResult = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Typing callback timeout'));
        }, 3000); // 3 second timeout

        console.log('   Sending typing...');
        socket.emit('chat:typing', { 
          projectId, 
          isTyping: true 
        }, (response) => {
          clearTimeout(timeout);
          console.log('   📥 Typing callback received:', response);
          resolve(response);
        });
      });

      console.log('✅ Typing callback working!');
      console.log(`   Response: ${JSON.stringify(typingResult)}`);
    } catch (error) {
      console.log('❌ Typing callback failed:', error.message);
    }
    console.log('');

    // Step 7: Check server status
    console.log('7️⃣ Checking server status...');
    
    try {
      const healthResponse = await axios.get(`${API_BASE_URL}/api/v1/healthcheck`);
      console.log('✅ Server is healthy');
      console.log(`   Uptime: ${Math.round(healthResponse.data.data.uptime / 60)} minutes`);
      console.log(`   Environment: ${healthResponse.data.data.environment}`);
    } catch (error) {
      console.log('❌ Server health check failed:', error.message);
    }

    // Step 8: Cleanup
    console.log('8️⃣ Cleaning up...');
    socket.disconnect();
    console.log('✅ Socket disconnected');
    console.log('');

    console.log('🎉 Server Log Test Complete!');
    console.log('\n📋 SERVER LOG TEST SUMMARY:');
    console.log(`✅ Authentication: Working`);
    console.log(`✅ Project Creation: Working`);
    console.log(`✅ Socket Connection: Working`);
    console.log(`✅ Join Callback: ${socket.connected ? 'Testing...' : 'Failed'}`);
    console.log(`✅ Message Callback: ${socket.connected ? 'Testing...' : 'Failed'}`);
    console.log(`✅ Typing Callback: ${socket.connected ? 'Testing...' : 'Failed'}`);

  } catch (error) {
    console.log('❌ Server log test failed:');
    console.log(`   Error: ${error.message}`);
    console.log(`   Stack: ${error.stack}`);
  }
}

// Run the test
testServerLogs().then(() => {
  console.log('🏁 Server Log Test Complete');
}).catch(error => {
  console.error('💥 Test failed:', error.message);
});
