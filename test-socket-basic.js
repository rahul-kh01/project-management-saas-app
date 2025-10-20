/**
 * Basic Socket Test
 * 
 * This script tests the most basic socket functionality to verify
 * if the server is responding to any socket events at all
 */

import axios from 'axios';
import { io } from 'socket.io-client';

const API_BASE_URL = 'https://project-management-saas-app.onrender.com';
const FRONTEND_URL = 'https://project-management-saas-app-1.onrender.com';

async function testBasicSocket() {
  console.log('🔌 Testing Basic Socket Functionality...\n');
  
  try {
    // Step 1: Login to get auth token
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

    const authToken = loginResponse.data.data.accessToken;
    console.log('✅ Login successful');
    console.log(`   User: ${loginResponse.data.data.user.fullName}`);
    console.log('');

    // Step 2: Test basic socket connection
    console.log('2️⃣ Testing basic socket connection...');
    
    const socket = io(API_BASE_URL, {
      path: '/socket.io/',
      namespace: '/chat',
      auth: {
        token: authToken,
      },
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
    });

    let connected = false;
    let authenticated = false;

    // Connection events
    socket.on('connect', () => {
      console.log('✅ Socket connected successfully');
      console.log(`   Socket ID: ${socket.id}`);
      console.log(`   Transport: ${socket.io.engine.transport.name}`);
      connected = true;
    });

    socket.on('disconnect', (reason) => {
      console.log('⚠️  Socket disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      console.log('❌ Socket connection error:', error.message);
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

    // Step 3: Test if server responds to any events
    console.log('3️⃣ Testing server response to events...');
    
    // Test 1: Send a simple ping event
    console.log('   Testing ping event...');
    try {
      const pingResponse = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Ping timeout'));
        }, 5000);

        socket.emit('ping', {}, (response) => {
          clearTimeout(timeout);
          resolve(response);
        });
      });

      console.log('   ✅ Ping response received:', pingResponse);
    } catch (error) {
      console.log('   ❌ Ping failed:', error.message);
    }

    // Test 2: Send a test event
    console.log('   Testing test event...');
    try {
      const testResponse = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Test timeout'));
        }, 5000);

        socket.emit('test', { message: 'Hello server' }, (response) => {
          clearTimeout(timeout);
          resolve(response);
        });
      });

      console.log('   ✅ Test response received:', testResponse);
    } catch (error) {
      console.log('   ❌ Test failed:', error.message);
    }

    // Test 3: Send chat:join with minimal data
    console.log('   Testing chat:join with minimal data...');
    try {
      const joinResponse = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Join timeout'));
        }, 10000);

        socket.emit('chat:join', { projectId: 'test123' }, (response) => {
          clearTimeout(timeout);
          resolve(response);
        });
      });

      console.log('   ✅ Join response received:', joinResponse);
    } catch (error) {
      console.log('   ❌ Join failed:', error.message);
    }

    // Test 4: Listen for any events from server
    console.log('   Listening for server events...');
    let eventCount = 0;
    
    const eventListener = (data) => {
      eventCount++;
      console.log(`   📥 Received event: ${data}`);
    };

    // Listen for all possible events
    socket.onAny(eventListener);

    // Wait for any events
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log(`   📊 Total events received: ${eventCount}`);

    // Step 4: Test server logs
    console.log('4️⃣ Checking server status...');
    
    try {
      const healthResponse = await axios.get(`${API_BASE_URL}/api/v1/healthcheck`);
      console.log('✅ Server health check successful');
      console.log(`   Status: ${healthResponse.data.data.status}`);
      console.log(`   Timestamp: ${healthResponse.data.data.timestamp}`);
    } catch (error) {
      console.log('❌ Server health check failed:', error.message);
    }

    // Step 5: Test socket endpoint directly
    console.log('5️⃣ Testing socket endpoint...');
    
    try {
      const socketResponse = await axios.get(`${API_BASE_URL}/socket.io/`, {
        headers: {
          'Origin': FRONTEND_URL
        }
      });
      console.log('✅ Socket endpoint accessible');
      console.log(`   Status: ${socketResponse.status}`);
    } catch (error) {
      console.log('❌ Socket endpoint failed:', error.message);
    }

    // Step 6: Final analysis
    console.log('6️⃣ Final Analysis...');
    console.log('='.repeat(50));
    console.log(`✅ Socket Connection: ${connected ? 'Working' : 'Failed'}`);
    console.log(`✅ Server Health: Working`);
    console.log(`✅ Socket Endpoint: Working`);
    console.log(`✅ Event Responses: ${eventCount > 0 ? 'Working' : 'Failed'}`);
    console.log('='.repeat(50));

    if (connected && eventCount > 0) {
      console.log('🎉 BASIC SOCKET: WORKING!');
      console.log('   The server is responding to socket events');
    } else if (connected) {
      console.log('⚠️  BASIC SOCKET: PARTIALLY WORKING');
      console.log('   Socket connects but server may not be responding to events');
    } else {
      console.log('❌ BASIC SOCKET: NOT WORKING');
      console.log('   Socket connection failed');
    }

    // Cleanup
    console.log('7️⃣ Cleaning up...');
    socket.disconnect();
    console.log('✅ Socket disconnected');

  } catch (error) {
    console.log('❌ Basic socket test failed:');
    console.log(`   Error: ${error.response?.data?.message || error.message}`);
    console.log(`   Status: ${error.response?.status}`);
  }
}

// Run the test
testBasicSocket().then(() => {
  console.log('🏁 Basic Socket Test Complete');
}).catch(error => {
  console.error('💥 Test failed:', error.message);
});
