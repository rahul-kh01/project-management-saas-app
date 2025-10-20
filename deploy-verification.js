/**
 * Deploy Verification Script
 * 
 * This script verifies that the deployed server has the latest socket fixes
 * and provides deployment status information
 */

import axios from 'axios';
import { io } from 'socket.io-client';

const API_BASE_URL = 'https://project-management-saas-app.onrender.com';
const FRONTEND_URL = 'https://project-management-saas-app-1.onrender.com';

async function verifyDeployment() {
  console.log('🔍 Verifying Deployment Status...\n');
  
  try {
    // Step 1: Check server health and uptime
    console.log('1️⃣ Checking server health...');
    const healthResponse = await axios.get(`${API_BASE_URL}/api/v1/healthcheck`);
    const uptime = healthResponse.data.data.uptime;
    const status = healthResponse.data.data.status;
    
    console.log('✅ Server is healthy');
    console.log(`   Status: ${status}`);
    console.log(`   Uptime: ${Math.round(uptime / 60)} minutes`);
    console.log(`   Environment: ${healthResponse.data.data.environment}`);
    console.log('');

    // Step 2: Test authentication
    console.log('2️⃣ Testing authentication...');
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
    console.log('✅ Authentication working');
    console.log(`   User: ${loginResponse.data.data.user.fullName}`);
    console.log('');

    // Step 3: Test socket connection
    console.log('3️⃣ Testing socket connection...');
    
    const socket = io(API_BASE_URL, {
      path: '/socket.io/',
      namespace: '/chat',
      auth: {
        token: token,
      },
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

    // Wait for connection
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 10000);

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

    console.log('✅ Socket connection established');
    console.log('');

    // Step 4: Test socket callback with shorter timeout
    console.log('4️⃣ Testing socket callback with shorter timeout...');
    
    let callbackReceived = false;
    let callbackData = null;
    
    try {
      const callbackResult = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Callback timeout'));
        }, 5000); // 5 second timeout

        socket.emit('chat:join', { projectId: 'test-project-123' }, (response) => {
          clearTimeout(timeout);
          callbackReceived = true;
          callbackData = response;
          console.log('   ✅ Callback received:', response);
          resolve(response);
        });
      });

      console.log('✅ Socket callback working!');
      console.log(`   Response: ${JSON.stringify(callbackResult)}`);
    } catch (error) {
      console.log('❌ Socket callback failed:', error.message);
      console.log('   This indicates the server still has the old socket handlers');
    }
    console.log('');

    // Step 5: Test project creation
    console.log('5️⃣ Testing project creation...');
    try {
      const projectResponse = await axios.post(`${API_BASE_URL}/api/v1/projects`, {
        name: `Deploy Test ${Date.now()}`,
        description: 'Testing deployment',
        status: 'active'
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Origin': FRONTEND_URL
        }
      });

      const projectId = projectResponse.data.data._id;
      console.log('✅ Project creation working');
      console.log(`   Project ID: ${projectId}`);
      console.log('');

      // Step 6: Test chat with real project
      console.log('6️⃣ Testing chat with real project...');
      
      let chatCallbackReceived = false;
      try {
        const chatResult = await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Chat callback timeout'));
          }, 5000);

          socket.emit('chat:join', { projectId }, (response) => {
            clearTimeout(timeout);
            chatCallbackReceived = true;
            console.log('   ✅ Chat callback received:', response);
            resolve(response);
          });
        });

        console.log('✅ Chat functionality working!');
        console.log(`   Response: ${JSON.stringify(chatResult)}`);
      } catch (error) {
        console.log('❌ Chat callback failed:', error.message);
      }
      
    } catch (error) {
      console.log('❌ Project creation failed:', error.response?.data?.message || error.message);
    }

    // Step 7: Cleanup
    console.log('7️⃣ Cleaning up...');
    socket.disconnect();
    console.log('✅ Socket disconnected');
    console.log('');

    // Step 8: Summary
    console.log('📋 DEPLOYMENT VERIFICATION SUMMARY:');
    console.log(`✅ Server Health: ${status === 'healthy' ? 'Good' : 'Issues'}`);
    console.log(`✅ Authentication: Working`);
    console.log(`✅ Socket Connection: Working`);
    console.log(`✅ Socket Callbacks: ${callbackReceived ? 'Working' : 'Failed'}`);
    console.log(`✅ Chat Functionality: ${chatCallbackReceived ? 'Working' : 'Failed'}`);
    console.log('');
    
    if (!callbackReceived) {
      console.log('🚨 ISSUE DETECTED:');
      console.log('   The deployed server still has the old socket handlers.');
      console.log('   Render may not have detected the changes yet.');
      console.log('   Try manually triggering a redeploy in Render dashboard.');
    } else {
      console.log('🎉 SUCCESS:');
      console.log('   The deployed server has the latest socket fixes!');
      console.log('   Chat functionality should be working properly.');
    }

  } catch (error) {
    console.log('❌ Deployment verification failed:');
    console.log(`   Error: ${error.message}`);
  }
}

// Run the verification
verifyDeployment().then(() => {
  console.log('🏁 Deployment Verification Complete');
}).catch(error => {
  console.error('💥 Verification failed:', error.message);
});
