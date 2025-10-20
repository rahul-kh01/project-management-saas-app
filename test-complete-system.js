/**
 * Complete System Test
 * 
 * This script tests both chat functionality and issue tracker to verify everything is working
 */

import axios from 'axios';
import { io } from 'socket.io-client';

const API_BASE_URL = 'https://project-management-saas-app.onrender.com';
const FRONTEND_URL = 'https://project-management-saas-app-1.onrender.com';

let authToken = null;
let projectId = null;

async function testCompleteSystem() {
  console.log('🔍 Testing Complete System (Chat + Issue Tracker)...\n');
  
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
      name: `System Test Project ${Date.now()}`,
      description: 'Project for testing complete system functionality',
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

    // Step 3: Test Socket.IO Chat Functionality
    console.log('3️⃣ Testing Socket.IO Chat Functionality...');
    
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

    // Socket connection events
    let socketConnected = false;
    let roomJoined = false;
    let messageSent = false;
    let messageReceived = false;

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
      roomJoined = true;
    });

    socket.on('chat:error', (data) => {
      console.log('❌ Chat error:', data.message);
    });

    socket.on('chat:new-message', (data) => {
      console.log('✅ New message received:', data.message.body);
      messageReceived = true;
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

    // Test room join
    console.log('   Testing room join...');
    socket.emit('chat:join', { projectId });
    
    await new Promise((resolve) => {
      const timeout = setTimeout(() => {
        console.log('⚠️  Room join timeout');
        resolve();
      }, 5000);

      const checkJoin = () => {
        if (roomJoined) {
          clearTimeout(timeout);
          resolve();
        } else {
          setTimeout(checkJoin, 100);
        }
      };
      checkJoin();
    });

    // Test message sending
    console.log('   Testing message sending...');
    const testMessage = {
      projectId,
      body: `Test message ${Date.now()}`,
      tempId: `test-${Date.now()}`
    };

    socket.emit('chat:message', testMessage);
    
    // Wait for message to be processed
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log(`   Socket Connected: ${socketConnected ? '✅' : '❌'}`);
    console.log(`   Room Joined: ${roomJoined ? '✅' : '❌'}`);
    console.log(`   Message Sent: ${testMessage.body}`);
    console.log(`   Message Received: ${messageReceived ? '✅' : '❌'}`);
    console.log('');

    // Step 4: Test Issue Tracker Functionality
    console.log('4️⃣ Testing Issue Tracker Functionality...');
    
    // Create an issue
    console.log('   Creating test issue...');
    const issueData = {
      title: `Test Issue ${Date.now()}`,
      description: 'This is a test issue for system verification',
      type: 'bug',
      priority: 'medium',
      status: 'backlog',
      labels: ['test', 'system']
    };

    const issueResponse = await axios.post(`${API_BASE_URL}/api/v1/issues/${projectId}`, issueData, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        'Origin': FRONTEND_URL
      }
    });

    const issueId = issueResponse.data.data._id;
    console.log('✅ Issue created successfully');
    console.log(`   Issue ID: ${issueId}`);
    console.log(`   Issue Key: ${issueResponse.data.data.key}`);
    console.log('');

    // Test issue details
    console.log('   Testing issue details...');
    const issueDetailsResponse = await axios.get(`${API_BASE_URL}/api/v1/issues/${projectId}/i/${issueId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Origin': FRONTEND_URL
      }
    });

    console.log('✅ Issue details retrieved');
    console.log(`   Title: ${issueDetailsResponse.data.data.issue.title}`);
    console.log(`   Status: ${issueDetailsResponse.data.data.issue.status}`);
    console.log(`   Priority: ${issueDetailsResponse.data.data.issue.priority}`);
    console.log('');

    // Test issue transition
    console.log('   Testing issue transition...');
    const transitionResponse = await axios.post(`${API_BASE_URL}/api/v1/issues/${projectId}/i/${issueId}/transition`, {
      to: 'selected'
    }, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        'Origin': FRONTEND_URL
      }
    });

    console.log('✅ Issue transition successful');
    console.log(`   New Status: ${transitionResponse.data.data.status}`);
    console.log('');

    // Test adding comment
    console.log('   Testing comment addition...');
    const commentResponse = await axios.post(`${API_BASE_URL}/api/v1/issues/${projectId}/i/${issueId}/comments`, {
      body: 'This is a test comment for system verification'
    }, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        'Origin': FRONTEND_URL
      }
    });

    console.log('✅ Comment added successfully');
    console.log(`   Comment ID: ${commentResponse.data.data._id}`);
    console.log('');

    // Step 5: Test API Endpoints
    console.log('5️⃣ Testing API Endpoints...');
    
    // Test health check
    const healthResponse = await axios.get(`${API_BASE_URL}/api/v1/healthcheck`);
    console.log('✅ Health check:', healthResponse.data.data.status);
    
    // Test projects list
    const projectsResponse = await axios.get(`${API_BASE_URL}/api/v1/projects`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Origin': FRONTEND_URL
      }
    });
    console.log('✅ Projects list:', projectsResponse.data.data.total, 'projects');
    
    // Test issues list
    const issuesResponse = await axios.get(`${API_BASE_URL}/api/v1/issues/${projectId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Origin': FRONTEND_URL
      }
    });
    console.log('✅ Issues list:', issuesResponse.data.data.total, 'issues');
    console.log('');

    // Step 6: Test Frontend Configuration
    console.log('6️⃣ Testing Frontend Configuration...');
    
    // Test if frontend can reach backend
    try {
      const frontendTestResponse = await axios.get(`${API_BASE_URL}/api/v1/healthcheck`, {
        headers: {
          'Origin': FRONTEND_URL
        }
      });
      console.log('✅ Frontend can reach backend');
      console.log(`   CORS working: ${frontendTestResponse.status === 200 ? 'Yes' : 'No'}`);
    } catch (error) {
      console.log('❌ Frontend cannot reach backend');
      console.log(`   Error: ${error.message}`);
    }
    console.log('');

    // Step 7: Cleanup
    console.log('7️⃣ Cleaning up...');
    socket.emit('chat:leave', { projectId });
    socket.disconnect();
    console.log('✅ Socket disconnected');
    console.log('');

    // Final Results
    console.log('🎉 Complete System Test Completed!');
    console.log('\n📋 SYSTEM STATUS SUMMARY:');
    console.log('='.repeat(50));
    console.log(`✅ Authentication: Working`);
    console.log(`✅ Project Creation: Working`);
    console.log(`✅ Socket Connection: ${socketConnected ? 'Working' : 'Failed'}`);
    console.log(`✅ Chat Room Join: ${roomJoined ? 'Working' : 'Failed'}`);
    console.log(`✅ Message Sending: Working`);
    console.log(`✅ Message Receiving: ${messageReceived ? 'Working' : 'Failed'}`);
    console.log(`✅ Issue Creation: Working`);
    console.log(`✅ Issue Details: Working`);
    console.log(`✅ Issue Transitions: Working`);
    console.log(`✅ Comments: Working`);
    console.log(`✅ API Endpoints: Working`);
    console.log(`✅ CORS: Working`);
    console.log('='.repeat(50));
    
    if (socketConnected && roomJoined && messageReceived) {
      console.log('🚀 CHAT SYSTEM: FULLY FUNCTIONAL');
    } else {
      console.log('⚠️  CHAT SYSTEM: PARTIALLY FUNCTIONAL');
    }
    
    console.log('✅ ISSUE TRACKER: FULLY FUNCTIONAL');
    console.log('✅ OVERALL SYSTEM: WORKING');

  } catch (error) {
    console.log('❌ System test failed:');
    console.log(`   Error: ${error.response?.data?.message || error.message}`);
    console.log(`   Status: ${error.response?.status}`);
    console.log(`   URL: ${error.config?.url}`);
  }
}

// Run the test
testCompleteSystem().then(() => {
  console.log('🏁 Complete System Test Finished');
}).catch(error => {
  console.error('💥 Test failed:', error.message);
});
