/**
 * Socket.IO Performance Test
 * 
 * This script tests the optimized Socket.IO connection and performance
 */

import axios from 'axios';
import { io } from 'socket.io-client';

const API_BASE_URL = 'https://project-management-saas-app.onrender.com';
const FRONTEND_URL = 'https://project-management-saas-app-1.onrender.com';

let authToken = null;
let projectId = null;

async function testSocketPerformance() {
  console.log('🔍 Testing Socket.IO Performance...\n');
  
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
    const projectData = {
      name: 'Socket Performance Test Project',
      description: 'Project for testing Socket.IO performance',
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

    // Step 3: Test Socket.IO connection
    console.log('3️⃣ Testing Socket.IO connection...');
    
    const socket = io(API_BASE_URL, {
      path: '/socket.io/',
      namespace: '/chat',
      auth: {
        token: authToken,
      },
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
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

    socket.on('chat:error', (data) => {
      console.log('❌ Chat error:', data.message);
    });

    // Wait for connection
    await new Promise((resolve) => {
      if (socket.connected) {
        resolve();
      } else {
        socket.on('connect', resolve);
      }
    });

    // Step 4: Test joining project room
    console.log('4️⃣ Testing project room join...');
    socket.emit('chat:join', { projectId });
    
    await new Promise((resolve) => {
      socket.on('chat:joined', (data) => {
        console.log('✅ Successfully joined project room');
        console.log(`   Project ID: ${data.projectId}`);
        resolve();
      });
      
      socket.on('chat:error', (data) => {
        console.log('❌ Failed to join project room:', data.message);
        resolve();
      });
      
      // Timeout after 5 seconds
      setTimeout(() => {
        console.log('⚠️  Join timeout');
        resolve();
      }, 5000);
    });

    // Step 5: Test message sending performance
    console.log('5️⃣ Testing message sending performance...');
    
    const messageCount = 5;
    const messages = [];
    
    for (let i = 0; i < messageCount; i++) {
      const message = {
        projectId,
        body: `Performance test message ${i + 1}`,
        tempId: `temp-${Date.now()}-${i}`
      };
      
      const startTime = Date.now();
      
      socket.emit('chat:message', message, (response) => {
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        messages.push({
          message: message.body,
          duration,
          success: !response || !response.error
        });
        
        console.log(`   Message ${i + 1}: ${duration}ms ${response && response.error ? '❌' : '✅'}`);
      });
      
      // Small delay between messages
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Wait for all messages to be processed
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 6: Test message receiving
    console.log('6️⃣ Testing message receiving...');
    
    let receivedCount = 0;
    socket.on('chat:new-message', (data) => {
      receivedCount++;
      console.log(`   Received message: ${data.message.body}`);
    });

    // Wait for messages to be received
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 7: Performance analysis
    console.log('7️⃣ Performance Analysis...');
    
    const successfulMessages = messages.filter(m => m.success);
    const failedMessages = messages.filter(m => !m.success);
    const avgDuration = successfulMessages.reduce((sum, m) => sum + m.duration, 0) / successfulMessages.length;
    const maxDuration = Math.max(...successfulMessages.map(m => m.duration));
    const minDuration = Math.min(...successfulMessages.map(m => m.duration));

    console.log(`   Total Messages Sent: ${messageCount}`);
    console.log(`   Successful: ${successfulMessages.length}`);
    console.log(`   Failed: ${failedMessages.length}`);
    console.log(`   Average Duration: ${avgDuration.toFixed(2)}ms`);
    console.log(`   Min Duration: ${minDuration}ms`);
    console.log(`   Max Duration: ${maxDuration}ms`);
    console.log(`   Messages Received: ${receivedCount}`);
    console.log('');

    // Step 8: Test typing indicator
    console.log('8️⃣ Testing typing indicator...');
    socket.emit('chat:typing', { projectId, isTyping: true });
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    socket.emit('chat:typing', { projectId, isTyping: false });
    console.log('✅ Typing indicator test completed');
    console.log('');

    // Step 9: Cleanup
    console.log('9️⃣ Cleaning up...');
    socket.emit('chat:leave', { projectId });
    socket.disconnect();
    console.log('✅ Socket disconnected');
    console.log('');

    console.log('🎉 Socket.IO Performance Test Completed!');
    console.log('\n📋 PERFORMANCE SUMMARY:');
    console.log(`✅ Connection: ${socket.connected ? 'Stable' : 'Unstable'}`);
    console.log(`✅ Message Sending: ${successfulMessages.length}/${messageCount} successful`);
    console.log(`✅ Average Response Time: ${avgDuration.toFixed(2)}ms`);
    console.log(`✅ Message Receiving: ${receivedCount} messages received`);
    
    if (avgDuration < 1000) {
      console.log('🚀 Performance: Excellent (< 1s)');
    } else if (avgDuration < 3000) {
      console.log('⚡ Performance: Good (< 3s)');
    } else {
      console.log('⚠️  Performance: Needs improvement (> 3s)');
    }

  } catch (error) {
    console.log('❌ Socket performance test failed:');
    console.log(`   Error: ${error.response?.data?.message || error.message}`);
    console.log(`   Status: ${error.response?.status}`);
  }
}

// Run the test
testSocketPerformance().then(() => {
  console.log('🏁 Socket Performance Test Complete');
}).catch(error => {
  console.error('💥 Test failed:', error.message);
});
