/**
 * Chat Fixes Test
 * 
 * This script tests all the chat fixes including acknowledgments and real-time functionality
 */

import axios from 'axios';
import { io } from 'socket.io-client';

const API_BASE_URL = 'https://project-management-saas-app.onrender.com';
const FRONTEND_URL = 'https://project-management-saas-app-1.onrender.com';

let authToken = null;
let projectId = null;

async function testChatFixes() {
  console.log('🔍 Testing Chat Fixes...\n');
  
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

    // Step 2: Create a unique test project
    console.log('2️⃣ Creating a unique test project...');
    const projectData = {
      name: `Chat Fix Test Project ${Date.now()}`,
      description: 'Project for testing chat fixes',
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

    // Step 3: Test Socket.IO with acknowledgments
    console.log('3️⃣ Testing Socket.IO with acknowledgments...');
    
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

    // Connection events
    let socketConnected = false;
    let roomJoined = false;
    let messageSent = false;
    let messageReceived = false;
    let typingReceived = false;

    socket.on('connect', () => {
      console.log('✅ Socket connected successfully');
      console.log(`   Socket ID: ${socket.id}`);
      console.log(`   Transport: ${socket.io.engine.transport.name}`);
      socketConnected = true;
    });

    socket.on('disconnect', (reason) => {
      console.log('⚠️  Socket disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      console.log('❌ Socket connection error:', error.message);
    });

    socket.on('chat:joined', (data) => {
      console.log('✅ Successfully joined project room');
      console.log(`   Project ID: ${data.projectId}`);
      console.log(`   Message: ${data.message}`);
      roomJoined = true;
    });

    socket.on('chat:error', (data) => {
      console.log('❌ Chat error:', data.error || data.message);
    });

    socket.on('chat:new-message', (data) => {
      console.log('✅ New message received:', data.message.body);
      console.log(`   Sender: ${data.message.sender.fullName}`);
      console.log(`   Temp ID: ${data.tempId || 'None'}`);
      messageReceived = true;
    });

    socket.on('chat:user-typing', (data) => {
      console.log('✅ Typing indicator received:', data.user.fullName, 'is typing:', data.isTyping);
      typingReceived = true;
    });

    // Wait for connection
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Socket connection timeout'));
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

    // Step 4: Test room join with acknowledgment
    console.log('4️⃣ Testing room join with acknowledgment...');
    
    const joinPromise = new Promise((resolve) => {
      socket.emit('chat:join', { projectId }, (response) => {
        if (response && response.error) {
          console.log('❌ Join callback error:', response.error);
        } else {
          console.log('✅ Join callback success:', response);
        }
        resolve(response);
      });
    });

    await joinPromise;
    
    // Wait a bit for the join event
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 5: Test message sending with acknowledgment
    console.log('5️⃣ Testing message sending with acknowledgment...');
    
    const testMessage = {
      projectId,
      body: `Test message with acknowledgment ${Date.now()}`,
      tempId: `test-ack-${Date.now()}`
    };

    const messagePromise = new Promise((resolve) => {
      socket.emit('chat:message', testMessage, (response) => {
        if (response && response.error) {
          console.log('❌ Message callback error:', response.error);
        } else {
          console.log('✅ Message callback success:', response);
          messageSent = true;
        }
        resolve(response);
      });
    });

    await messagePromise;
    
    // Wait for message to be processed and received
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 6: Test typing indicator with acknowledgment
    console.log('6️⃣ Testing typing indicator with acknowledgment...');
    
    const typingPromise = new Promise((resolve) => {
      socket.emit('chat:typing', { projectId, isTyping: true }, (response) => {
        if (response && response.error) {
          console.log('❌ Typing callback error:', response.error);
        } else {
          console.log('✅ Typing callback success:', response);
        }
        resolve(response);
      });
    });

    await typingPromise;
    
    // Wait for typing indicator
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Stop typing
    socket.emit('chat:typing', { projectId, isTyping: false }, (response) => {
      if (response && response.error) {
        console.log('❌ Stop typing callback error:', response.error);
      } else {
        console.log('✅ Stop typing callback success:', response);
      }
    });

    // Step 7: Test seen functionality
    console.log('7️⃣ Testing seen functionality...');
    
    // First, get the last message ID
    const messagesResponse = await axios.get(`${API_BASE_URL}/api/v1/chat/${projectId}/messages`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Origin': FRONTEND_URL
      }
    });

    if (messagesResponse.data.data.data.length > 0) {
      const lastMessage = messagesResponse.data.data.data[messagesResponse.data.data.data.length - 1];
      const messageId = lastMessage._id;
      
      const seenPromise = new Promise((resolve) => {
        socket.emit('chat:seen', { projectId, messageId }, (response) => {
          if (response && response.error) {
            console.log('❌ Seen callback error:', response.error);
          } else {
            console.log('✅ Seen callback success:', response);
          }
          resolve(response);
        });
      });

      await seenPromise;
    }

    // Step 8: Test leave functionality
    console.log('8️⃣ Testing leave functionality...');
    
    const leavePromise = new Promise((resolve) => {
      socket.emit('chat:leave', { projectId }, (response) => {
        if (response && response.error) {
          console.log('❌ Leave callback error:', response.error);
        } else {
          console.log('✅ Leave callback success:', response);
        }
        resolve(response);
      });
    });

    await leavePromise;

    // Step 9: Final Results
    console.log('9️⃣ Final Results...');
    console.log('='.repeat(50));
    console.log(`✅ Socket Connected: ${socketConnected ? 'Yes' : 'No'}`);
    console.log(`✅ Room Joined: ${roomJoined ? 'Yes' : 'No'}`);
    console.log(`✅ Message Sent: ${messageSent ? 'Yes' : 'No'}`);
    console.log(`✅ Message Received: ${messageReceived ? 'Yes' : 'No'}`);
    console.log(`✅ Typing Indicator: ${typingReceived ? 'Yes' : 'No'}`);
    console.log('='.repeat(50));

    if (socketConnected && roomJoined && messageSent && messageReceived) {
      console.log('🎉 CHAT SYSTEM: FULLY FUNCTIONAL!');
    } else {
      console.log('⚠️  CHAT SYSTEM: PARTIALLY FUNCTIONAL');
    }

    // Step 10: Cleanup
    console.log('🔟 Cleaning up...');
    socket.disconnect();
    console.log('✅ Socket disconnected');
    console.log('');

  } catch (error) {
    console.log('❌ Chat fixes test failed:');
    console.log(`   Error: ${error.response?.data?.message || error.message}`);
    console.log(`   Status: ${error.response?.status}`);
  }
}

// Run the test
testChatFixes().then(() => {
  console.log('🏁 Chat Fixes Test Complete');
}).catch(error => {
  console.error('💥 Test failed:', error.message);
});
