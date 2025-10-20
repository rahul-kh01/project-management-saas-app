/**
 * Socket.IO Event Debugging Script
 * 
 * This script debugs the Socket.IO events to identify why room join and message sending are failing
 */

import axios from 'axios';
import { io } from 'socket.io-client';

const API_BASE_URL = 'https://project-management-saas-app.onrender.com';
const FRONTEND_URL = 'https://project-management-saas-app-1.onrender.com';

let authToken = null;
let projectId = null;

async function debugSocketEvents() {
  console.log('🔍 Debugging Socket.IO Events...\n');
  
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
    console.log(`   Token: ${authToken.substring(0, 20)}...`);
    console.log('');

    // Step 2: Create a test project
    console.log('2️⃣ Creating a test project...');
    const projectData = {
      name: 'Socket Debug Test Project',
      description: 'Project for debugging Socket.IO events',
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

    // Step 3: Test Socket.IO connection with detailed logging
    console.log('3️⃣ Testing Socket.IO connection with detailed logging...');
    
    const socket = io(API_BASE_URL, {
      path: '/socket.io/',
      namespace: '/chat',
      auth: {
        token: authToken,
      },
      transports: ['websocket', 'polling'],
      timeout: 30000,
      forceNew: true,
    });

    // Detailed connection events
    socket.on('connect', () => {
      console.log('✅ Socket connected successfully');
      console.log(`   Socket ID: ${socket.id}`);
      console.log(`   Transport: ${socket.io.engine.transport.name}`);
      console.log(`   Connected: ${socket.connected}`);
    });

    socket.on('disconnect', (reason) => {
      console.log('⚠️  Socket disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      console.log('❌ Socket connection error:', error.message);
      console.log('   Error details:', error);
    });

    socket.on('error', (error) => {
      console.log('❌ Socket error:', error);
    });

    // Chat-specific events
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
    console.log('   Waiting for connection...');
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

    console.log('✅ Connection established');
    console.log('');

    // Step 4: Test project room join with detailed debugging
    console.log('4️⃣ Testing project room join with detailed debugging...');
    
    // Set up event listeners before emitting
    let joinResponse = null;
    let joinError = null;
    
    socket.on('chat:joined', (data) => {
      joinResponse = data;
      console.log('✅ Join success event received:', data);
    });
    
    socket.on('chat:error', (data) => {
      joinError = data;
      console.log('❌ Join error event received:', data);
    });

    // Emit join event
    console.log(`   Emitting chat:join for project: ${projectId}`);
    socket.emit('chat:join', { projectId });
    
    // Wait for response
    await new Promise((resolve) => {
      const timeout = setTimeout(() => {
        console.log('⚠️  Join timeout - no response received');
        resolve();
      }, 10000);

      const checkResponse = () => {
        if (joinResponse || joinError) {
          clearTimeout(timeout);
          resolve();
        } else {
          setTimeout(checkResponse, 100);
        }
      };
      checkResponse();
    });

    if (joinResponse) {
      console.log('✅ Successfully joined project room');
    } else if (joinError) {
      console.log('❌ Failed to join project room:', joinError);
    } else {
      console.log('⚠️  No response received for join event');
    }
    console.log('');

    // Step 5: Test message sending with detailed debugging
    console.log('5️⃣ Testing message sending with detailed debugging...');
    
    let messageResponse = null;
    let messageError = null;
    let messageReceived = false;
    
    socket.on('chat:new-message', (data) => {
      messageReceived = true;
      console.log('✅ Message received event:', data);
    });

    // Test message sending
    const testMessage = {
      projectId,
      body: 'Debug test message',
      tempId: `debug-${Date.now()}`
    };

    console.log('   Sending test message:', testMessage);
    
    // Send message with callback
    socket.emit('chat:message', testMessage, (response) => {
      if (response && response.error) {
        messageError = response.error;
        console.log('❌ Message send callback error:', response.error);
      } else {
        messageResponse = response;
        console.log('✅ Message send callback success:', response);
      }
    });

    // Wait for message events
    await new Promise((resolve) => {
      const timeout = setTimeout(() => {
        console.log('⚠️  Message timeout - no response received');
        resolve();
      }, 10000);

      const checkMessage = () => {
        if (messageResponse || messageError || messageReceived) {
          clearTimeout(timeout);
          resolve();
        } else {
          setTimeout(checkMessage, 100);
        }
      };
      checkMessage();
    });

    console.log('   Message send result:');
    console.log(`     Callback response: ${messageResponse ? 'Success' : 'None'}`);
    console.log(`     Callback error: ${messageError || 'None'}`);
    console.log(`     Message received: ${messageReceived ? 'Yes' : 'No'}`);
    console.log('');

    // Step 6: Test typing indicator
    console.log('6️⃣ Testing typing indicator...');
    
    let typingReceived = false;
    socket.on('chat:user-typing', (data) => {
      typingReceived = true;
      console.log('✅ Typing indicator received:', data);
    });

    socket.emit('chat:typing', { projectId, isTyping: true });
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    socket.emit('chat:typing', { projectId, isTyping: false });
    
    console.log(`   Typing indicator received: ${typingReceived ? 'Yes' : 'No'}`);
    console.log('');

    // Step 7: Test direct API call to verify project membership
    console.log('7️⃣ Testing direct API call to verify project membership...');
    
    try {
      const messagesResponse = await axios.get(
        `${API_BASE_URL}/api/v1/chat/${projectId}/messages`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Origin': FRONTEND_URL
          }
        }
      );
      console.log('✅ API call successful - user is project member');
      console.log(`   Messages count: ${messagesResponse.data.data.total}`);
    } catch (apiError) {
      console.log('❌ API call failed:', apiError.response?.data?.message || apiError.message);
      console.log(`   Status: ${apiError.response?.status}`);
    }
    console.log('');

    // Step 8: Cleanup
    console.log('8️⃣ Cleaning up...');
    socket.emit('chat:leave', { projectId });
    socket.disconnect();
    console.log('✅ Socket disconnected');
    console.log('');

    console.log('🎉 Socket Event Debugging Completed!');
    console.log('\n📋 DEBUG SUMMARY:');
    console.log(`✅ Connection: ${socket.connected ? 'Stable' : 'Unstable'}`);
    console.log(`✅ Room Join: ${joinResponse ? 'Success' : 'Failed'}`);
    console.log(`✅ Message Send: ${messageResponse ? 'Success' : 'Failed'}`);
    console.log(`✅ Message Receive: ${messageReceived ? 'Success' : 'Failed'}`);
    console.log(`✅ Typing Indicator: ${typingReceived ? 'Success' : 'Failed'}`);

  } catch (error) {
    console.log('❌ Socket debugging failed:');
    console.log(`   Error: ${error.message}`);
    console.log(`   Stack: ${error.stack}`);
  }
}

// Run the debug
debugSocketEvents().then(() => {
  console.log('🏁 Socket Event Debugging Complete');
}).catch(error => {
  console.error('💥 Debug failed:', error.message);
});
