/**
 * Deployment Socket Test
 * 
 * Test to verify the deployed server is handling socket events correctly
 */

import axios from 'axios';
import { io } from 'socket.io-client';

const API_BASE_URL = 'https://project-management-saas-app.onrender.com';
const FRONTEND_URL = 'https://project-management-saas-app-1.onrender.com';

async function testDeploymentSocket() {
  console.log('🚀 Testing Deployed Socket Functionality...\n');
  
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
    console.log('✅ Login successful');
    console.log(`   User: ${user.fullName}`);
    console.log('');

    // Step 2: Create project
    console.log('2️⃣ Creating project...');
    const projectResponse = await axios.post(`${API_BASE_URL}/api/v1/projects`, {
      name: `Deployment Test ${Date.now()}`,
      description: 'Testing deployed socket functionality',
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

    // Step 4: Test join with detailed logging
    console.log('4️⃣ Testing join with detailed logging...');
    
    let joinSuccess = false;
    let joinError = null;
    
    socket.on('chat:joined', (data) => {
      joinSuccess = true;
      console.log('✅ Join success event:', data);
    });
    
    socket.on('chat:error', (data) => {
      joinError = data;
      console.log('❌ Join error event:', data);
    });

    // Test join with callback
    console.log('   Sending join request...');
    const joinResult = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Join callback timeout'));
      }, 10000);

      socket.emit('chat:join', { projectId }, (response) => {
        clearTimeout(timeout);
        console.log('   Join callback received:', response);
        if (response && response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });

    console.log('✅ Join callback result:', joinResult);
    
    // Wait for events
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log(`   Join success event: ${joinSuccess ? 'Received' : 'Not received'}`);
    console.log(`   Join error event: ${joinError ? 'Received' : 'Not received'}`);
    console.log('');

    // Step 5: Test message sending
    console.log('5️⃣ Testing message sending...');
    
    let messageReceived = false;
    socket.on('chat:new-message', (data) => {
      messageReceived = true;
      console.log('✅ Message received event:', data);
    });

    // Test message with callback
    console.log('   Sending message...');
    const messageResult = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Message callback timeout'));
      }, 10000);

      socket.emit('chat:message', { 
        projectId, 
        body: 'Deployment test message',
        tempId: 'deployment-test'
      }, (response) => {
        clearTimeout(timeout);
        console.log('   Message callback received:', response);
        if (response && response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });

    console.log('✅ Message callback result:', messageResult);
    
    // Wait for events
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log(`   Message received event: ${messageReceived ? 'Received' : 'Not received'}`);
    console.log('');

    // Step 6: Test typing indicator
    console.log('6️⃣ Testing typing indicator...');
    
    let typingReceived = false;
    socket.on('chat:user-typing', (data) => {
      typingReceived = true;
      console.log('✅ Typing event received:', data);
    });

    // Test typing with callback
    console.log('   Sending typing indicator...');
    const typingResult = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Typing callback timeout'));
      }, 10000);

      socket.emit('chat:typing', { 
        projectId, 
        isTyping: true 
      }, (response) => {
        clearTimeout(timeout);
        console.log('   Typing callback received:', response);
        if (response && response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });

    console.log('✅ Typing callback result:', typingResult);
    
    // Wait for events
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log(`   Typing event received: ${typingReceived ? 'Received' : 'Not received'}`);
    console.log('');

    // Step 7: Test API endpoints
    console.log('7️⃣ Testing API endpoints...');
    
    try {
      const messagesResponse = await axios.get(
        `${API_BASE_URL}/api/v1/chat/${projectId}/messages`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Origin': FRONTEND_URL
          }
        }
      );
      console.log('✅ Messages API working');
      console.log(`   Total messages: ${messagesResponse.data.data.total}`);
    } catch (apiError) {
      console.log('❌ Messages API failed:', apiError.response?.data?.message || apiError.message);
    }

    // Step 8: Cleanup
    console.log('8️⃣ Cleaning up...');
    socket.disconnect();
    console.log('✅ Socket disconnected');
    console.log('');

    console.log('🎉 Deployment Socket Test Completed!');
    console.log('\n📋 DEPLOYMENT TEST SUMMARY:');
    console.log(`✅ Connection: ${socket.connected ? 'Stable' : 'Unstable'}`);
    console.log(`✅ Join Callback: ${joinResult ? 'Working' : 'Failed'}`);
    console.log(`✅ Join Event: ${joinSuccess ? 'Working' : 'Failed'}`);
    console.log(`✅ Message Callback: ${messageResult ? 'Working' : 'Failed'}`);
    console.log(`✅ Message Event: ${messageReceived ? 'Working' : 'Failed'}`);
    console.log(`✅ Typing Callback: ${typingResult ? 'Working' : 'Failed'}`);
    console.log(`✅ Typing Event: ${typingReceived ? 'Working' : 'Failed'}`);

  } catch (error) {
    console.log('❌ Deployment socket test failed:');
    console.log(`   Error: ${error.message}`);
    console.log(`   Stack: ${error.stack}`);
  }
}

// Run the test
testDeploymentSocket().then(() => {
  console.log('🏁 Deployment Socket Test Complete');
}).catch(error => {
  console.error('💥 Test failed:', error.message);
});
