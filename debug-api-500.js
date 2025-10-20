/**
 * Debug API 500 Error Script
 * 
 * This script helps debug the 500 server error by testing various endpoints
 * and providing detailed error information.
 */

import axios from 'axios';

const API_BASE_URL = 'https://project-management-saas-app.onrender.com';

async function debugAPI500() {
  console.log('🔍 Debugging API 500 Error...\n');
  
  try {
    // Test 1: Basic connectivity
    console.log('1️⃣ Testing Basic Connectivity...');
    try {
      const response = await axios.get(`${API_BASE_URL}/`, {
        timeout: 10000
      });
      console.log('✅ Root endpoint accessible');
      console.log(`   Response: ${response.data}`);
    } catch (error) {
      console.log('❌ Root endpoint failed');
      console.log(`   Error: ${error.message}`);
      console.log(`   Status: ${error.response?.status}`);
    }
    console.log('');

    // Test 2: Health check with detailed error info
    console.log('2️⃣ Testing Health Check with Detailed Error Info...');
    try {
      const response = await axios.get(`${API_BASE_URL}/api/v1/healthcheck`, {
        timeout: 10000,
        validateStatus: function (status) {
          return status < 600; // Accept any status code
        }
      });
      console.log('✅ Health check response received');
      console.log(`   Status: ${response.status}`);
      console.log(`   Data:`, JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.log('❌ Health check failed');
      console.log(`   Error: ${error.message}`);
      console.log(`   Status: ${error.response?.status}`);
      console.log(`   Status Text: ${error.response?.statusText}`);
      console.log(`   Response Data:`, error.response?.data);
      console.log(`   Response Headers:`, error.response?.headers);
    }
    console.log('');

    // Test 3: Check if it's a CORS issue
    console.log('3️⃣ Testing CORS Configuration...');
    try {
      const response = await axios.options(`${API_BASE_URL}/api/v1/healthcheck`, {
        headers: {
          'Origin': 'https://project-management-saas-app-1.onrender.com',
          'Access-Control-Request-Method': 'GET'
        },
        timeout: 10000
      });
      console.log('✅ CORS preflight successful');
      console.log(`   Status: ${response.status}`);
      console.log(`   CORS Headers:`, {
        'Access-Control-Allow-Origin': response.headers['access-control-allow-origin'],
        'Access-Control-Allow-Methods': response.headers['access-control-allow-methods'],
        'Access-Control-Allow-Headers': response.headers['access-control-allow-headers']
      });
    } catch (error) {
      console.log('❌ CORS preflight failed');
      console.log(`   Error: ${error.message}`);
      console.log(`   Status: ${error.response?.status}`);
    }
    console.log('');

    // Test 4: Test auth endpoint
    console.log('4️⃣ Testing Auth Endpoint...');
    try {
      const response = await axios.post(`${API_BASE_URL}/api/v1/auth/login`, {
        email: 'admin@projectcamp.com',
        password: 'Admin123!'
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'https://project-management-saas-app-1.onrender.com'
        },
        timeout: 10000,
        validateStatus: function (status) {
          return status < 600; // Accept any status code
        }
      });
      console.log('✅ Auth endpoint accessible');
      console.log(`   Status: ${response.status}`);
      console.log(`   Data:`, JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.log('❌ Auth endpoint failed');
      console.log(`   Error: ${error.message}`);
      console.log(`   Status: ${error.response?.status}`);
      console.log(`   Response Data:`, error.response?.data);
    }
    console.log('');

    // Test 5: Check server headers
    console.log('5️⃣ Checking Server Headers...');
    try {
      const response = await axios.head(`${API_BASE_URL}/api/v1/healthcheck`, {
        timeout: 10000
      });
      console.log('✅ Server headers received');
      console.log(`   Server: ${response.headers.server}`);
      console.log(`   Content-Type: ${response.headers['content-type']}`);
      console.log(`   X-Powered-By: ${response.headers['x-powered-by']}`);
    } catch (error) {
      console.log('❌ Server headers check failed');
      console.log(`   Error: ${error.message}`);
    }
    console.log('');

  } catch (error) {
    console.log('💥 Debug script failed:');
    console.log(`   Error: ${error.message}`);
    console.log(`   Code: ${error.code}`);
  }
}

// Run the debug
debugAPI500().then(() => {
  console.log('🏁 API Debug Complete');
}).catch(error => {
  console.error('💥 Debug failed:', error.message);
});
