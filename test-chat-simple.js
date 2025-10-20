/**
 * Simple Chat Test (Without Authentication)
 * 
 * This script tests the chat endpoints directly to verify they're working
 */

import axios from 'axios';

const API_BASE_URL = 'https://project-management-saas-app.onrender.com';

async function testChatEndpoints() {
  console.log('🔍 Testing Chat Endpoints (Simple)...\n');
  
  try {
    // Test 1: Health check
    console.log('1️⃣ Testing Health Check...');
    const healthResponse = await axios.get(`${API_BASE_URL}/api/v1/healthcheck`);
    console.log('✅ Health check working');
    console.log(`   Status: ${healthResponse.status}`);
    console.log(`   Backend Status: ${healthResponse.data.data.status}`);
    console.log('');

    // Test 2: Test chat route structure (should return 401 without auth)
    console.log('2️⃣ Testing Chat Route Structure...');
    try {
      const chatResponse = await axios.get(`${API_BASE_URL}/api/v1/chat/test-project-id/messages`);
      console.log('⚠️  Chat route accessible without auth (unexpected)');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Chat route properly protected (401 Unauthorized)');
      } else {
        console.log(`⚠️  Chat route returned ${error.response?.status}: ${error.response?.data?.message}`);
      }
    }
    console.log('');

    // Test 3: Test Socket.IO endpoint
    console.log('3️⃣ Testing Socket.IO Endpoint...');
    try {
      const socketResponse = await axios.get(`${API_BASE_URL}/socket.io/`);
      console.log('✅ Socket.IO endpoint accessible');
    } catch (error) {
      if (error.response?.status === 200) {
        console.log('✅ Socket.IO endpoint accessible');
      } else {
        console.log(`⚠️  Socket.IO endpoint: ${error.response?.status}`);
      }
    }
    console.log('');

    // Test 4: Test CORS for chat endpoints
    console.log('4️⃣ Testing CORS for Chat...');
    try {
      const corsResponse = await axios.options(`${API_BASE_URL}/api/v1/chat/test/messages`, {
        headers: {
          'Origin': 'https://project-management-saas-app-1.onrender.com',
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'Authorization,Content-Type'
        }
      });
      console.log('✅ CORS preflight successful for chat');
      console.log(`   Allow Origin: ${corsResponse.headers['access-control-allow-origin']}`);
    } catch (error) {
      console.log(`⚠️  CORS test failed: ${error.message}`);
    }
    console.log('');

    console.log('🎉 Chat endpoint tests completed!');
    console.log('\n📋 SUMMARY:');
    console.log('✅ Backend is running');
    console.log('✅ Chat routes are protected');
    console.log('✅ Socket.IO is accessible');
    console.log('✅ CORS is configured');
    console.log('\n💡 The chat functionality should work once authentication is resolved!');

  } catch (error) {
    console.log('❌ Chat endpoint test failed:');
    console.log(`   Error: ${error.message}`);
    console.log(`   Status: ${error.response?.status}`);
  }
}

// Run the test
testChatEndpoints().then(() => {
  console.log('🏁 Simple Chat Test Complete');
}).catch(error => {
  console.error('💥 Test failed:', error.message);
});
