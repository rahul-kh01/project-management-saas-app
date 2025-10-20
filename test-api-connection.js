/**
 * API Connection Test Script
 * 
 * This script tests the API connection and login functionality
 * to verify that the frontend-backend communication is working.
 */

import axios from 'axios';

const API_BASE_URL = 'https://project-management-saas-app.onrender.com';
const FRONTEND_URL = 'https://project-management-saas-app-1.onrender.com';

// Test credentials
const testCredentials = [
  {
    email: 'admin@projectcamp.com',
    password: 'Admin123!',
    role: 'Admin'
  },
  {
    email: 'demo@projectcamp.com', 
    password: 'Demo123!',
    role: 'Demo'
  }
];

async function testAPIConnection() {
  console.log('🔍 Testing API Connection...\n');
  
  try {
    // Test 1: Health Check
    console.log('1️⃣ Testing Health Check...');
    const healthResponse = await axios.get(`${API_BASE_URL}/api/v1/healthcheck`);
    console.log('✅ Health Check:', healthResponse.data);
    console.log('');

    // Test 2: CORS Test
    console.log('2️⃣ Testing CORS Configuration...');
    try {
      const corsResponse = await axios.options(`${API_BASE_URL}/api/v1/auth/login`, {
        headers: {
          'Origin': FRONTEND_URL,
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type'
        }
      });
      console.log('✅ CORS Headers:', corsResponse.headers);
    } catch (corsError) {
      console.log('⚠️  CORS Test:', corsError.response?.status || corsError.message);
    }
    console.log('');

    // Test 3: Login Test
    console.log('3️⃣ Testing Login Functionality...');
    
    for (const credentials of testCredentials) {
      try {
        console.log(`   Testing login for: ${credentials.email}`);
        
        const loginResponse = await axios.post(`${API_BASE_URL}/api/v1/auth/login`, {
          email: credentials.email,
          password: credentials.password
        }, {
          headers: {
            'Content-Type': 'application/json',
            'Origin': FRONTEND_URL
          }
        });

        console.log(`   ✅ Login successful for ${credentials.email}`);
        console.log(`   User: ${loginResponse.data.data.user.fullName}`);
        console.log(`   Access Token: ${loginResponse.data.data.accessToken ? 'Present' : 'Missing'}`);
        console.log(`   Refresh Token: ${loginResponse.data.data.refreshToken ? 'Present' : 'Missing'}`);
        console.log('');

        // Test 4: Current User Test
        console.log(`4️⃣ Testing Current User for ${credentials.email}...`);
        const currentUserResponse = await axios.get(`${API_BASE_URL}/api/v1/auth/current-user`, {
          headers: {
            'Authorization': `Bearer ${loginResponse.data.data.accessToken}`,
            'Origin': FRONTEND_URL
          }
        });
        console.log(`   ✅ Current User: ${currentUserResponse.data.data.fullName}`);
        console.log('');

      } catch (loginError) {
        console.log(`   ❌ Login failed for ${credentials.email}`);
        console.log(`   Error: ${loginError.response?.data?.message || loginError.message}`);
        console.log(`   Status: ${loginError.response?.status}`);
        console.log('');
      }
    }

    // Test 5: Frontend-Backend URL Configuration
    console.log('5️⃣ Configuration Summary:');
    console.log(`   Frontend URL: ${FRONTEND_URL}`);
    console.log(`   Backend API URL: ${API_BASE_URL}`);
    console.log(`   Expected CORS Origin: ${FRONTEND_URL}`);
    console.log('');

  } catch (error) {
    console.log('❌ API Connection Failed:');
    console.log(`   Error: ${error.message}`);
    console.log(`   Status: ${error.response?.status}`);
    console.log(`   URL: ${error.config?.url}`);
    console.log('');
    
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Solution: Check if the backend is running and accessible');
    } else if (error.response?.status === 404) {
      console.log('💡 Solution: Check if the API endpoints are correctly configured');
    } else if (error.response?.status === 500) {
      console.log('💡 Solution: Check backend logs for server errors');
    }
  }
}

// Run the test
testAPIConnection().then(() => {
  console.log('🏁 API Connection Test Complete');
}).catch(error => {
  console.error('💥 Test failed:', error.message);
});
