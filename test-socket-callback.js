/**
 * Simple Socket Callback Test
 * Tests if socket callbacks are working at all
 */

import { io } from 'socket.io-client';

const API_BASE_URL = 'https://project-management-saas-app.onrender.com';

// Test with a valid token - we'll use the admin token from the main test
const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2OGY2NDI3YjJlNTVjM2IxMTQ3YjJjOTEiLCJlbWFpbCI6ImFkbWluQHByb2plY3RjYW1wLmNvbSIsInVzZXJuYW1lIjoiYWRtaW5fcHJvamVjdCIsImZ1bGxOYW1lIjoiQWRtaW4gVXNlciIsImlhdCI6MTczMDAzOTM1OSwiZXhwIjoxNzMwMDQ2NTU5fQ.invalid';

async function testSocketCallback() {
  console.log('🔍 Testing Socket Callback Mechanism...\n');

  // Connect to socket
  const socket = io(API_BASE_URL, {
    path: '/socket.io/',
    namespace: '/chat',
    auth: {
      token: 'dummy-token-for-testing',
    },
    transports: ['websocket', 'polling'],
    timeout: 10000,
    forceNew: true,
  });

  socket.on('connect', () => {
    console.log('✅ Connected:', socket.id);
    
    // Test a simple callback
    console.log('📤 Testing callback with dummy data...');
    socket.emit('chat:join', { projectId: 'test-123' }, (response) => {
      console.log('📥 Callback received:', response);
      socket.disconnect();
    });

    // Set timeout to detect if callback never comes
    setTimeout(() => {
      console.log('❌ Callback timeout - no response received');
      socket.disconnect();
    }, 5000);
  });

  socket.on('connect_error', (error) => {
    console.log('❌ Connection error:', error.message);
  });

  socket.on('disconnect', (reason) => {
    console.log('🔌 Disconnected:', reason);
  });
}

testSocketCallback().then(() => {
  console.log('🏁 Test Complete');
}).catch(error => {
  console.error('💥 Test failed:', error.message);
});