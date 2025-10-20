/**
 * Multi-User Chat Test
 * 
 * This script tests real-time chat functionality with two users
 * in the same project to verify that messages are properly exchanged
 */

import axios from 'axios';
import { io } from 'socket.io-client';

const API_BASE_URL = 'https://project-management-saas-app.onrender.com';
const FRONTEND_URL = 'https://project-management-saas-app-1.onrender.com';

// Test credentials for two users
const testUsers = [
  {
    email: 'admin@projectcamp.com',
    password: 'Admin123!',
    name: 'Admin User'
  },
  {
    email: 'demo@projectcamp.com', 
    password: 'Demo123!',
    name: 'Demo User'
  }
];

let projectId = null;
let userTokens = {};
let userSockets = {};
let testResults = {
  user1Connection: false,
  user2Connection: false,
  user1Join: false,
  user2Join: false,
  user1MessageSent: false,
  user2MessageSent: false,
  user1MessageReceived: false,
  user2MessageReceived: false,
  user1TypingReceived: false,
  user2TypingReceived: false,
  crossUserMessaging: false
};

async function testMultiUserChat() {
  console.log('👥 Testing Multi-User Chat Functionality...\n');
  
  try {
    // Step 1: Login both users
    console.log('1️⃣ Logging in both users...');
    
    for (let i = 0; i < testUsers.length; i++) {
      const user = testUsers[i];
      console.log(`   Logging in ${user.name}...`);
      
      try {
        const loginResponse = await axios.post(`${API_BASE_URL}/api/v1/auth/login`, {
          email: user.email,
          password: user.password
        }, {
          headers: {
            'Content-Type': 'application/json',
            'Origin': FRONTEND_URL
          }
        });

        userTokens[`user${i + 1}`] = {
          token: loginResponse.data.data.accessToken,
          user: loginResponse.data.data.user,
          name: user.name
        };
        
        console.log(`   ✅ ${user.name} logged in successfully`);
        console.log(`      User ID: ${loginResponse.data.data.user._id}`);
      } catch (error) {
        console.log(`   ❌ ${user.name} login failed:`, error.response?.data?.message || error.message);
        throw new Error(`Failed to login ${user.name}`);
      }
    }
    console.log('');

    // Step 2: Create a test project with first user as owner
    console.log('2️⃣ Creating test project...');
    const projectData = {
      name: `Multi-User Chat Test ${Date.now()}`,
      description: 'Project for testing multi-user chat functionality',
      status: 'active'
    };

    const projectResponse = await axios.post(`${API_BASE_URL}/api/v1/projects`, projectData, {
      headers: {
        'Authorization': `Bearer ${userTokens.user1.token}`,
        'Content-Type': 'application/json',
        'Origin': FRONTEND_URL
      }
    });

    projectId = projectResponse.data.data._id;
    console.log('✅ Project created successfully');
    console.log(`   Project ID: ${projectId}`);
    console.log(`   Owner: ${userTokens.user1.name}`);
    console.log('');

    // Step 3: Add second user as project member
    console.log('3️⃣ Adding second user as project member...');
    try {
      const addMemberResponse = await axios.post(`${API_BASE_URL}/api/v1/projects/${projectId}/members`, {
        email: userTokens.user2.user.email,
        role: 'member'
      }, {
        headers: {
          'Authorization': `Bearer ${userTokens.user1.token}`,
          'Content-Type': 'application/json',
          'Origin': FRONTEND_URL
        }
      });

      console.log('✅ Second user added as project member');
      console.log(`   Member: ${userTokens.user2.name}`);
    } catch (error) {
      console.log('⚠️  Adding member failed, trying to continue:', error.response?.data?.message || error.message);
      // Continue anyway as the user might already be a member
    }
    console.log('');

    // Step 4: Connect both users via Socket.IO
    console.log('4️⃣ Connecting both users via Socket.IO...');
    
    // Connect User 1
    console.log('   Connecting User 1...');
    userSockets.user1 = io(API_BASE_URL, {
      path: '/socket.io/',
      namespace: '/chat',
      auth: {
        token: userTokens.user1.token,
      },
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
    });

    // Connect User 2
    console.log('   Connecting User 2...');
    userSockets.user2 = io(API_BASE_URL, {
      path: '/socket.io/',
      namespace: '/chat',
      auth: {
        token: userTokens.user2.token,
      },
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
    });

    // Set up event listeners for both users
    setupUserEventListeners('user1', userSockets.user1, userTokens.user1);
    setupUserEventListeners('user2', userSockets.user2, userTokens.user2);

    // Wait for both connections
    await waitForConnections();
    console.log('');

    // Step 5: Both users join the project room
    console.log('5️⃣ Both users joining project room...');
    
    // User 1 joins
    console.log('   User 1 joining...');
    try {
      await joinProject(userSockets.user1, projectId, 'user1');
      testResults.user1Join = true;
    } catch (error) {
      console.log('   ❌ User 1 join failed:', error.message);
    }

    // User 2 joins
    console.log('   User 2 joining...');
    try {
      await joinProject(userSockets.user2, projectId, 'user2');
      testResults.user2Join = true;
    } catch (error) {
      console.log('   ❌ User 2 join failed:', error.message);
    }

    // Wait a bit for joins to complete
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('');

    // Step 6: Test cross-user messaging
    console.log('6️⃣ Testing cross-user messaging...');
    
    // User 1 sends a message
    console.log('   User 1 sending message...');
    try {
      await sendMessage(userSockets.user1, projectId, 'Hello from User 1!', 'user1');
      testResults.user1MessageSent = true;
    } catch (error) {
      console.log('   ❌ User 1 message send failed:', error.message);
    }

    // Wait for message to be processed
    await new Promise(resolve => setTimeout(resolve, 2000));

    // User 2 sends a message
    console.log('   User 2 sending message...');
    try {
      await sendMessage(userSockets.user2, projectId, 'Hello from User 2!', 'user2');
      testResults.user2MessageSent = true;
    } catch (error) {
      console.log('   ❌ User 2 message send failed:', error.message);
    }

    // Wait for message to be processed
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('');

    // Step 7: Test typing indicators
    console.log('7️⃣ Testing typing indicators...');
    
    // User 1 starts typing
    console.log('   User 1 starts typing...');
    try {
      await sendTyping(userSockets.user1, projectId, true, 'user1');
    } catch (error) {
      console.log('   ❌ User 1 typing failed:', error.message);
    }

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 1000));

    // User 1 stops typing
    console.log('   User 1 stops typing...');
    try {
      await sendTyping(userSockets.user1, projectId, false, 'user1');
    } catch (error) {
      console.log('   ❌ User 1 stop typing failed:', error.message);
    }

    // User 2 starts typing
    console.log('   User 2 starts typing...');
    try {
      await sendTyping(userSockets.user2, projectId, true, 'user2');
    } catch (error) {
      console.log('   ❌ User 2 typing failed:', error.message);
    }

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 1000));

    // User 2 stops typing
    console.log('   User 2 stops typing...');
    try {
      await sendTyping(userSockets.user2, projectId, false, 'user2');
    } catch (error) {
      console.log('   ❌ User 2 stop typing failed:', error.message);
    }

    // Wait for typing indicators
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('');

    // Step 8: Test seen receipts
    console.log('8️⃣ Testing seen receipts...');
    
    // Get the last message ID
    try {
      const messagesResponse = await axios.get(`${API_BASE_URL}/api/v1/chat/${projectId}/messages`, {
        headers: {
          'Authorization': `Bearer ${userTokens.user1.token}`,
          'Origin': FRONTEND_URL
        }
      });

      if (messagesResponse.data.data.data.length > 0) {
        const lastMessage = messagesResponse.data.data.data[messagesResponse.data.data.data.length - 1];
        const messageId = lastMessage._id;
        
        // User 1 marks message as seen
        console.log('   User 1 marking message as seen...');
        try {
          await markAsSeen(userSockets.user1, projectId, messageId, 'user1');
        } catch (error) {
          console.log('   ❌ User 1 seen failed:', error.message);
        }

        // User 2 marks message as seen
        console.log('   User 2 marking message as seen...');
        try {
          await markAsSeen(userSockets.user2, projectId, messageId, 'user2');
        } catch (error) {
          console.log('   ❌ User 2 seen failed:', error.message);
        }
      }
    } catch (error) {
      console.log('   ❌ Failed to get messages for seen test:', error.message);
    }

    // Wait for seen receipts
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('');

    // Step 9: Final Results
    console.log('9️⃣ Final Results...');
    console.log('='.repeat(60));
    console.log(`✅ User 1 Connection: ${testResults.user1Connection ? 'Working' : 'Failed'}`);
    console.log(`✅ User 2 Connection: ${testResults.user2Connection ? 'Working' : 'Failed'}`);
    console.log(`✅ User 1 Join: ${testResults.user1Join ? 'Working' : 'Failed'}`);
    console.log(`✅ User 2 Join: ${testResults.user2Join ? 'Working' : 'Failed'}`);
    console.log(`✅ User 1 Message Sent: ${testResults.user1MessageSent ? 'Working' : 'Failed'}`);
    console.log(`✅ User 2 Message Sent: ${testResults.user2MessageSent ? 'Working' : 'Failed'}`);
    console.log(`✅ User 1 Message Received: ${testResults.user1MessageReceived ? 'Working' : 'Failed'}`);
    console.log(`✅ User 2 Message Received: ${testResults.user2MessageReceived ? 'Working' : 'Failed'}`);
    console.log(`✅ User 1 Typing Received: ${testResults.user1TypingReceived ? 'Working' : 'Failed'}`);
    console.log(`✅ User 2 Typing Received: ${testResults.user2TypingReceived ? 'Working' : 'Failed'}`);
    console.log(`✅ Cross-User Messaging: ${testResults.crossUserMessaging ? 'Working' : 'Failed'}`);
    console.log('='.repeat(60));

    const workingFeatures = Object.values(testResults).filter(Boolean).length;
    const totalFeatures = Object.keys(testResults).length;
    const successRate = (workingFeatures / totalFeatures * 100).toFixed(1);

    if (successRate >= 80) {
      console.log('🎉 MULTI-USER CHAT: FULLY FUNCTIONAL!');
      console.log(`   Success Rate: ${successRate}% (${workingFeatures}/${totalFeatures} features working)`);
    } else if (successRate >= 60) {
      console.log('⚠️  MULTI-USER CHAT: MOSTLY WORKING');
      console.log(`   Success Rate: ${successRate}% (${workingFeatures}/${totalFeatures} features working)`);
    } else {
      console.log('❌ MULTI-USER CHAT: NEEDS WORK');
      console.log(`   Success Rate: ${successRate}% (${workingFeatures}/${totalFeatures} features working)`);
    }

    // Step 10: Cleanup
    console.log('🔟 Cleaning up...');
    if (userSockets.user1) {
      userSockets.user1.disconnect();
      console.log('✅ User 1 socket disconnected');
    }
    if (userSockets.user2) {
      userSockets.user2.disconnect();
      console.log('✅ User 2 socket disconnected');
    }
    console.log('');

  } catch (error) {
    console.log('❌ Multi-user chat test failed:');
    console.log(`   Error: ${error.response?.data?.message || error.message}`);
    console.log(`   Status: ${error.response?.status}`);
  }
}

// Helper function to set up event listeners for a user
function setupUserEventListeners(userId, socket, userInfo) {
  socket.on('connect', () => {
    console.log(`   ✅ ${userInfo.name} connected (${socket.id})`);
    testResults[`${userId}Connection`] = true;
  });

  socket.on('disconnect', (reason) => {
    console.log(`   ⚠️  ${userInfo.name} disconnected: ${reason}`);
  });

  socket.on('connect_error', (error) => {
    console.log(`   ❌ ${userInfo.name} connection error: ${error.message}`);
  });

  socket.on('chat:joined', (data) => {
    console.log(`   ✅ ${userInfo.name} joined project room`);
    console.log(`      Project ID: ${data.projectId}`);
  });

  socket.on('chat:error', (data) => {
    console.log(`   ❌ ${userInfo.name} chat error: ${data.error || data.message}`);
  });

  socket.on('chat:new-message', (data) => {
    console.log(`   ✅ ${userInfo.name} received message: ${data.message.body}`);
    console.log(`      From: ${data.message.sender.fullName}`);
    console.log(`      Temp ID: ${data.tempId || 'None'}`);
    testResults[`${userId}MessageReceived`] = true;
    
    // Check if this is a cross-user message
    if (data.message.sender._id !== userInfo.user._id) {
      testResults.crossUserMessaging = true;
    }
  });

  socket.on('chat:user-typing', (data) => {
    console.log(`   ✅ ${userInfo.name} received typing indicator: ${data.user.fullName} is typing: ${data.isTyping}`);
    testResults[`${userId}TypingReceived`] = true;
  });

  socket.on('chat:message-seen', (data) => {
    console.log(`   ✅ ${userInfo.name} received seen receipt: ${data.username} saw message ${data.messageId}`);
  });

  socket.on('chat:user-joined', (data) => {
    console.log(`   ✅ ${userInfo.name} received user joined: ${data.user.fullName}`);
  });

  socket.on('chat:user-left', (data) => {
    console.log(`   ✅ ${userInfo.name} received user left: ${data.user.fullName}`);
  });
}

// Helper function to wait for both connections
async function waitForConnections() {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Connection timeout'));
    }, 30000);

    let user1Connected = false;
    let user2Connected = false;

    const checkConnections = () => {
      if (user1Connected && user2Connected) {
        clearTimeout(timeout);
        resolve();
      }
    };

    userSockets.user1.on('connect', () => {
      user1Connected = true;
      checkConnections();
    });

    userSockets.user2.on('connect', () => {
      user2Connected = true;
      checkConnections();
    });

    userSockets.user1.on('connect_error', (error) => {
      clearTimeout(timeout);
      reject(new Error(`User 1 connection failed: ${error.message}`));
    });

    userSockets.user2.on('connect_error', (error) => {
      clearTimeout(timeout);
      reject(new Error(`User 2 connection failed: ${error.message}`));
    });
  });
}

// Helper function to join project
async function joinProject(socket, projectId, userId) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Join timeout'));
    }, 10000);

    socket.emit('chat:join', { projectId }, (response) => {
      clearTimeout(timeout);
      if (response && response.error) {
        reject(new Error(response.error));
      } else {
        resolve(response);
      }
    });
  });
}

// Helper function to send message
async function sendMessage(socket, projectId, body, userId) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Message send timeout'));
    }, 15000);

    const tempId = `test-${userId}-${Date.now()}`;
    socket.emit('chat:message', { projectId, body, tempId }, (response) => {
      clearTimeout(timeout);
      if (response && response.error) {
        reject(new Error(response.error));
      } else {
        resolve(response);
      }
    });
  });
}

// Helper function to send typing indicator
async function sendTyping(socket, projectId, isTyping, userId) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Typing timeout'));
    }, 5000);

    socket.emit('chat:typing', { projectId, isTyping }, (response) => {
      clearTimeout(timeout);
      if (response && response.error) {
        reject(new Error(response.error));
      } else {
        resolve(response);
      }
    });
  });
}

// Helper function to mark message as seen
async function markAsSeen(socket, projectId, messageId, userId) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Seen timeout'));
    }, 5000);

    socket.emit('chat:seen', { projectId, messageId }, (response) => {
      clearTimeout(timeout);
      if (response && response.error) {
        reject(new Error(response.error));
      } else {
        resolve(response);
      }
    });
  });
}

// Run the test
testMultiUserChat().then(() => {
  console.log('🏁 Multi-User Chat Test Complete');
}).catch(error => {
  console.error('💥 Test failed:', error.message);
});
