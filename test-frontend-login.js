/**
 * Frontend Login Test Script
 * 
 * This script simulates the frontend login process to identify issues
 */

import axios from 'axios';

const API_BASE_URL = 'https://project-management-saas-app.onrender.com';
const FRONTEND_URL = 'https://project-management-saas-app-1.onrender.com';

// Test credentials from create-test-users.js
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

async function testFrontendLogin() {
  console.log('🔍 Testing Frontend Login Process...\n');
  
  try {
    // Test 1: Simulate frontend API configuration
    console.log('1️⃣ Testing Frontend API Configuration...');
    const api = axios.create({
      baseURL: API_BASE_URL,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
        'Origin': FRONTEND_URL
      },
    });

    console.log(`   API Base URL: ${API_BASE_URL}`);
    console.log(`   Frontend URL: ${FRONTEND_URL}`);
    console.log(`   With Credentials: true`);
    console.log('');

    // Test 2: Test login endpoint with frontend headers
    console.log('2️⃣ Testing Login with Frontend Headers...');
    
    for (const credentials of testCredentials) {
      try {
        console.log(`   Testing login for: ${credentials.email}`);
        
        const response = await api.post('/api/v1/auth/login', {
          email: credentials.email,
          password: credentials.password
        });

        console.log(`   ✅ Login successful for ${credentials.email}`);
        console.log(`   Status: ${response.status}`);
        console.log(`   User: ${response.data.data.user.fullName}`);
        console.log(`   Access Token: ${response.data.data.accessToken ? 'Present' : 'Missing'}`);
        console.log(`   Refresh Token: ${response.data.data.refreshToken ? 'Present' : 'Missing'}`);
        console.log('');

        // Test 3: Test current user endpoint with token
        console.log(`3️⃣ Testing Current User for ${credentials.email}...`);
        const currentUserResponse = await api.get('/api/v1/auth/current-user', {
          headers: {
            'Authorization': `Bearer ${response.data.data.accessToken}`,
            'Origin': FRONTEND_URL
          }
        });
        console.log(`   ✅ Current User: ${currentUserResponse.data.data.fullName}`);
        console.log('');

      } catch (loginError) {
        console.log(`   ❌ Login failed for ${credentials.email}`);
        console.log(`   Error: ${loginError.response?.data?.message || loginError.message}`);
        console.log(`   Status: ${loginError.response?.status}`);
        console.log(`   Response Data:`, loginError.response?.data);
        console.log('');
      }
    }

    // Test 4: Test CORS with frontend origin
    console.log('4️⃣ Testing CORS with Frontend Origin...');
    try {
      const corsResponse = await axios.options(`${API_BASE_URL}/api/v1/auth/login`, {
        headers: {
          'Origin': FRONTEND_URL,
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type,Authorization'
        }
      });
      console.log('✅ CORS preflight successful');
      console.log(`   Allow Origin: ${corsResponse.headers['access-control-allow-origin']}`);
      console.log(`   Allow Methods: ${corsResponse.headers['access-control-allow-methods']}`);
      console.log(`   Allow Headers: ${corsResponse.headers['access-control-allow-headers']}`);
    } catch (corsError) {
      console.log('❌ CORS preflight failed');
      console.log(`   Error: ${corsError.message}`);
    }
    console.log('');

    // Test 5: Check if frontend can reach backend
    console.log('5️⃣ Testing Frontend to Backend Connectivity...');
    try {
      const healthResponse = await api.get('/api/v1/healthcheck');
      console.log('✅ Frontend can reach backend');
      console.log(`   Status: ${healthResponse.status}`);
      console.log(`   Backend Status: ${healthResponse.data.data.status}`);
    } catch (error) {
      console.log('❌ Frontend cannot reach backend');
      console.log(`   Error: ${error.message}`);
    }
    console.log('');

  } catch (error) {
    console.log('💥 Frontend login test failed:');
    console.log(`   Error: ${error.message}`);
  }
}

// Run the test
testFrontendLogin().then(() => {
  console.log('🏁 Frontend Login Test Complete');
  console.log('\n📋 SUMMARY:');
  console.log('If all tests pass, the issue might be:');
  console.log('1. Frontend environment variables not set correctly');
  console.log('2. Browser cache issues');
  console.log('3. Frontend build not using correct API URL');
  console.log('4. JavaScript errors in the browser console');
  console.log('\n🔧 NEXT STEPS:');
  console.log('1. Check browser console for errors');
  console.log('2. Verify VITE_API_URL in frontend environment');
  console.log('3. Clear browser cache and try again');
  console.log('4. Check if frontend is using the correct API URL');
}).catch(error => {
  console.error('💥 Test failed:', error.message);
});
