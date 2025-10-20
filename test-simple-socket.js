/**
 * Simple Socket.IO Test
 * 
 * This script tests basic Socket.IO functionality without the chat namespace
 */

import axios from 'axios';
import { io } from 'socket.io-client';

const API_BASE_URL = 'https://project-management-saas-app.onrender.com';
const FRONTEND_URL = 'https://project-management-saas-app-1.onrender.com';

async function testSimpleSocket() {
  console.log('🔍 Testing Simple Socket.IO...\n');
  
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

    const authToken = loginResponse.data.data.accessToken;
    console.log('✅ Login successful');
    console.log('');

    // Step 2: Test basic Socket.IO connection (without namespace)
    console.log('2️⃣ Testing basic Socket.IO connection...');
    
    const socket = io(API_BASE_URL, {
      path: '/socket.io/',
      // No namespace - test basic connection
      auth: {
        token: authToken,
      },
      transports: ['websocket', 'polling'],
      timeout: 10000,
    });

    // Basic connection events
    socket.on('connect', () => {
      console.log('✅ Basic socket connected');
      console.log(`   Socket ID: ${socket.id}`);
      console.log(`   Transport: ${socket.io.engine.transport.name}`);
    });

    socket.on('disconnect', (reason) => {
      console.log('⚠️  Basic socket disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      console.log('❌ Basic socket connection error:', error.message);
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

    console.log('✅ Basic connection established');
    console.log('');

    // Step 3: Test chat namespace connection
    console.log('3️⃣ Testing chat namespace connection...');
    
    const chatSocket = io(API_BASE_URL, {
      path: '/socket.io/',
      namespace: '/chat',
      auth: {
        token: authToken,
      },
      transports: ['websocket', 'polling'],
      timeout: 10000,
    });

    // Chat connection events
    chatSocket.on('connect', () => {
      console.log('✅ Chat socket connected');
      console.log(`   Chat Socket ID: ${chatSocket.id}`);
    });

    chatSocket.on('disconnect', (reason) => {
      console.log('⚠️  Chat socket disconnected:', reason);
    });

    chatSocket.on('connect_error', (error) => {
      console.log('❌ Chat socket connection error:', error.message);
      console.log('   Error details:', error);
    });

    // Wait for chat connection
    try {
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Chat connection timeout'));
        }, 10000);

        if (chatSocket.connected) {
          clearTimeout(timeout);
          resolve();
        } else {
          chatSocket.on('connect', () => {
            clearTimeout(timeout);
            resolve();
          });
          
          chatSocket.on('connect_error', (error) => {
            clearTimeout(timeout);
            reject(error);
          });
        }
      });

      console.log('✅ Chat namespace connection established');
    } catch (error) {
      console.log('❌ Chat namespace connection failed:', error.message);
    }
    console.log('');

    // Step 4: Test simple ping-pong
    console.log('4️⃣ Testing simple ping-pong...');
    
    if (socket.connected) {
      socket.emit('ping', { message: 'Hello server' }, (response) => {
        console.log('✅ Ping response received:', response);
      });

      // Wait for response
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Step 5: Test chat events with minimal data
    console.log('5️⃣ Testing chat events with minimal data...');
    
    if (chatSocket.connected) {
      // Test join with a simple project ID
      chatSocket.emit('chat:join', { projectId: '507f1f77bcf86cd799439011' });
      
      // Wait for response
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Test message with simple data
      chatSocket.emit('chat:message', { 
        projectId: '507f1f77bcf86cd799439011', 
        body: 'Test message',
        tempId: 'test-123'
      });
      
      // Wait for response
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    // Step 6: Cleanup
    console.log('6️⃣ Cleaning up...');
    socket.disconnect();
    chatSocket.disconnect();
    console.log('✅ Sockets disconnected');
    console.log('');

    console.log('🎉 Simple Socket Test Completed!');
    console.log('\n📋 SUMMARY:');
    console.log(`✅ Basic Socket: ${socket.connected ? 'Connected' : 'Disconnected'}`);
    console.log(`✅ Chat Socket: ${chatSocket.connected ? 'Connected' : 'Disconnected'}`);

  } catch (error) {
    console.log('❌ Simple socket test failed:');
    console.log(`   Error: ${error.message}`);
  }
}

// Run the test
testSimpleSocket().then(() => {
  console.log('🏁 Simple Socket Test Complete');
}).catch(error => {
  console.error('💥 Test failed:', error.message);
});
