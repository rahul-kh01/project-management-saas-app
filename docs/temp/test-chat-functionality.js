/**
 * Chat Functionality Test Script
 * 
 * This script tests the chat functionality to identify middleware and data storage issues
 */

import axios from 'axios';

const API_BASE_URL = 'https://project-management-saas-app.onrender.com';
const FRONTEND_URL = 'https://project-management-saas-app-1.onrender.com';

// Test credentials
const testCredentials = {
  email: 'admin@projectcamp.com',
  password: 'Admin123!'
};

let authToken = null;
let projectId = null;

async function testChatFunctionality() {
  console.log('🔍 Testing Chat Functionality...\n');
  
  try {
    // Step 1: Login to get auth token
    console.log('1️⃣ Logging in to get auth token...');
    const loginResponse = await axios.post(`${API_BASE_URL}/api/v1/auth/login`, {
      email: testCredentials.email,
      password: testCredentials.password
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Origin': FRONTEND_URL
      }
    });

    authToken = loginResponse.data.data.accessToken;
    console.log('✅ Login successful');
    console.log(`   User: ${loginResponse.data.data.user.fullName}`);
    console.log(`   Token: ${authToken ? 'Present' : 'Missing'}`);
    console.log('');

    // Step 2: Create a test project
    console.log('2️⃣ Creating a test project...');
    const projectData = {
      name: 'Chat Test Project',
      description: 'Project for testing chat functionality',
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
    console.log(`   Project Name: ${projectResponse.data.data.name}`);
    console.log('');

    // Step 3: Test chat message posting
    console.log('3️⃣ Testing chat message posting...');
    const messageData = {
      body: 'Hello, this is a test message for chat functionality!'
    };

    const messageResponse = await axios.post(
      `${API_BASE_URL}/api/v1/chat/${projectId}/messages`, 
      messageData,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
          'Origin': FRONTEND_URL
        }
      }
    );

    console.log('✅ Message posted successfully');
    console.log(`   Message ID: ${messageResponse.data.data._id}`);
    console.log(`   Message Body: ${messageResponse.data.data.body}`);
    console.log(`   Sender: ${messageResponse.data.data.sender.fullName}`);
    console.log('');

    // Step 4: Test fetching messages
    console.log('4️⃣ Testing message fetching...');
    const messagesResponse = await axios.get(
      `${API_BASE_URL}/api/v1/chat/${projectId}/messages`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Origin': FRONTEND_URL
        }
      }
    );

    console.log('✅ Messages fetched successfully');
    console.log(`   Total Messages: ${messagesResponse.data.data.total}`);
    console.log(`   Messages in Response: ${messagesResponse.data.data.data.length}`);
    console.log('');

    // Step 5: Test mark as read
    console.log('5️⃣ Testing mark as read...');
    const messageId = messageResponse.data.data._id;
    const readResponse = await axios.post(
      `${API_BASE_URL}/api/v1/chat/${projectId}/messages/${messageId}/read`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
          'Origin': FRONTEND_URL
        }
      }
    );

    console.log('✅ Message marked as read successfully');
    console.log(`   Read By Count: ${readResponse.data.data.readBy.length}`);
    console.log('');

    // Step 6: Test Socket.IO connection (simulation)
    console.log('6️⃣ Testing Socket.IO connection simulation...');
    try {
      // Test if the socket endpoint is accessible
      const socketTest = await axios.get(`${API_BASE_URL}/socket.io/`, {
        headers: {
          'Origin': FRONTEND_URL
        }
      });
      console.log('✅ Socket.IO endpoint accessible');
    } catch (socketError) {
      console.log('⚠️  Socket.IO endpoint test failed (this might be normal)');
      console.log(`   Error: ${socketError.message}`);
    }
    console.log('');

    // Step 7: Test with different user (if possible)
    console.log('7️⃣ Testing with different user...');
    try {
      const demoLoginResponse = await axios.post(`${API_BASE_URL}/api/v1/auth/login`, {
        email: 'demo@projectcamp.com',
        password: 'Demo123!'
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Origin': FRONTEND_URL
        }
      });

      const demoToken = demoLoginResponse.data.data.accessToken;
      console.log('✅ Demo user login successful');

      // Try to access the same project (should work if user is added as member)
      const demoMessagesResponse = await axios.get(
        `${API_BASE_URL}/api/v1/chat/${projectId}/messages`,
        {
          headers: {
            'Authorization': `Bearer ${demoToken}`,
            'Origin': FRONTEND_URL
          }
        }
      );

      console.log('✅ Demo user can access project messages');
      console.log(`   Messages accessible: ${demoMessagesResponse.data.data.data.length}`);
    } catch (demoError) {
      console.log('⚠️  Demo user test failed (might need to be added as project member)');
      console.log(`   Error: ${demoError.response?.data?.message || demoError.message}`);
    }
    console.log('');

    console.log('🎉 Chat functionality test completed successfully!');
    console.log('\n📋 SUMMARY:');
    console.log('✅ Authentication working');
    console.log('✅ Project creation working');
    console.log('✅ Message posting working');
    console.log('✅ Message fetching working');
    console.log('✅ Mark as read working');
    console.log('✅ Data persistence working');

  } catch (error) {
    console.log('❌ Chat functionality test failed:');
    console.log(`   Error: ${error.response?.data?.message || error.message}`);
    console.log(`   Status: ${error.response?.status}`);
    console.log(`   URL: ${error.config?.url}`);
    
    if (error.response?.data) {
      console.log(`   Response Data:`, JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run the test
testChatFunctionality().then(() => {
  console.log('🏁 Chat Functionality Test Complete');
}).catch(error => {
  console.error('💥 Test failed:', error.message);
});
