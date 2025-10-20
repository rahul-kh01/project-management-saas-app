/**
 * Chat Test with Project Membership
 * 
 * This script ensures the user is a project member before testing chat functionality
 */

import axios from 'axios';
import { io } from 'socket.io-client';

const API_BASE_URL = 'https://project-management-saas-app.onrender.com';
const FRONTEND_URL = 'https://project-management-saas-app-1.onrender.com';

let authToken = null;
let projectId = null;
let socket = null;

async function testChatWithMembership() {
  console.log('🚀 Testing Chat with Project Membership...\n');
  
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
    const userId = loginResponse.data.data.user._id;
    console.log('✅ Login successful');
    console.log(`   User: ${loginResponse.data.data.user.fullName}`);
    console.log(`   User ID: ${userId}`);
    console.log('');

    // Step 2: Create a unique test project
    console.log('2️⃣ Creating a unique test project...');
    const projectData = {
      name: `Chat Membership Test ${Date.now()}`,
      description: 'Project for testing chat with proper membership',
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

    // Step 3: Verify user is project owner (should be automatically added as member)
    console.log('3️⃣ Verifying project membership...');
    const membersResponse = await axios.get(`${API_BASE_URL}/api/v1/projects/${projectId}/members`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Origin': FRONTEND_URL
      }
    });

    console.log('✅ Project members retrieved');
    console.log(`   Members count: ${membersResponse.data.data.length}`);
    console.log(`   User is member: ${membersResponse.data.data.some(m => m.user._id === userId)}`);
    console.log('');

    // Step 4: Test Socket.IO connection
    console.log('4️⃣ Testing Socket.IO connection...');
    
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

    // Test results tracking
    const testResults = {
      connection: false,
      roomJoin: false,
      messageSending: false,
      messageReceiving: false,
      acknowledgments: false
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
    });

    socket.on('chat:new-message', (data) => {
      console.log('✅ New message received:', data.message.body);
      console.log(`   Sender: ${data.message.sender.fullName}`);
      console.log(`   Temp ID: ${data.tempId || 'None'}`);
      testResults.messageReceiving = true;
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

    // Step 5: Test room join with detailed logging
    console.log('5️⃣ Testing room join with detailed logging...');
    
    try {
      const joinResponse = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Join timeout - no response from server'));
        }, 10000);

        console.log('   Sending join request...');
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

      console.log('✅ Join acknowledgment received:', joinResponse);
      testResults.acknowledgments = true;
    } catch (error) {
      console.log('❌ Join failed:', error.message);
    }
    
    // Wait a bit for the join event
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 6: Test message sending
    console.log('6️⃣ Testing message sending...');
    
    const testMessage = {
      projectId,
      body: `Membership test message ${Date.now()}`,
      tempId: `test-mem-${Date.now()}`
    };

    try {
      const messageResponse = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Message send timeout'));
        }, 15000);

        console.log('   Sending message...');
        socket.emit('chat:message', testMessage, (response) => {
          clearTimeout(timeout);
          console.log('   Message callback received:', response);
          
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
    
    // Wait for message to be processed
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 7: Final Results
    console.log('7️⃣ Final Results...');
    console.log('='.repeat(50));
    console.log(`✅ Socket Connection: ${testResults.connection ? 'Working' : 'Failed'}`);
    console.log(`✅ Room Join: ${testResults.roomJoin ? 'Working' : 'Failed'}`);
    console.log(`✅ Message Sending: ${testResults.messageSending ? 'Working' : 'Failed'}`);
    console.log(`✅ Message Receiving: ${testResults.messageReceiving ? 'Working' : 'Failed'}`);
    console.log(`✅ Acknowledgments: ${testResults.acknowledgments ? 'Working' : 'Failed'}`);
    console.log('='.repeat(50));

    const workingFeatures = Object.values(testResults).filter(Boolean).length;
    const totalFeatures = Object.keys(testResults).length;
    const successRate = (workingFeatures / totalFeatures * 100).toFixed(1);

    if (successRate >= 80) {
      console.log('🎉 CHAT SYSTEM: WORKING WITH MEMBERSHIP!');
      console.log(`   Success Rate: ${successRate}% (${workingFeatures}/${totalFeatures} features working)`);
    } else {
      console.log('❌ CHAT SYSTEM: STILL HAVING ISSUES');
      console.log(`   Success Rate: ${successRate}% (${workingFeatures}/${totalFeatures} features working)`);
    }

    // Step 8: Cleanup
    console.log('8️⃣ Cleaning up...');
    if (socket) {
      socket.disconnect();
      console.log('✅ Socket disconnected');
    }
    console.log('');

  } catch (error) {
    console.log('❌ Chat membership test failed:');
    console.log(`   Error: ${error.response?.data?.message || error.message}`);
    console.log(`   Status: ${error.response?.status}`);
  }
}

// Run the test
testChatWithMembership().then(() => {
  console.log('🏁 Chat Membership Test Complete');
}).catch(error => {
  console.error('💥 Test failed:', error.message);
});
