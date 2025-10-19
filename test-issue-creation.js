/**
 * Simple Issue Creation Test
 * 
 * This script tests both scenarios:
 * 1. Creating an issue without attachments (JSON)
 * 2. Creating an issue with attachments (FormData with labels as JSON string)
 * 
 * Prerequisites:
 *   npm install axios form-data
 * 
 * Usage:
 *   export TEST_AUTH_TOKEN="your-token"
 *   export TEST_PROJECT_ID="your-project-id"
 *   node test-issue-creation.js
 */

import axios from 'axios';

const API_BASE_URL = process.env.API_URL || 'http://localhost:5000';
const AUTH_TOKEN = process.env.TEST_AUTH_TOKEN;
const PROJECT_ID = process.env.TEST_PROJECT_ID;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Authorization': `Bearer ${AUTH_TOKEN}`,
  },
});

// Test 1: Create issue without attachments (regular JSON)
async function testCreateIssueWithoutAttachments() {
  console.log('\n📝 Test 1: Creating issue without attachments (JSON)');
  console.log('='.repeat(60));
  
  try {
    const response = await api.post(`/api/v1/issues/${PROJECT_ID}`, {
      title: 'Test Issue - Without Attachments',
      description: 'This issue is created without any file attachments',
      type: 'task',
      priority: 'medium',
      status: 'backlog',
      labels: ['test', 'automation'],
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('✅ SUCCESS');
    console.log('Issue Key:', response.data.data.key);
    console.log('Issue ID:', response.data.data._id);
    console.log('Title:', response.data.data.title);
    console.log('Labels:', response.data.data.labels);
    console.log('Status:', response.data.data.status);
    
    return response.data.data;
  } catch (error) {
    console.log('❌ FAILED');
    console.error('Error:', error.response?.data || error.message);
    throw error;
  }
}

// Test 2: Create issue with FormData (simulating frontend with attachments)
async function testCreateIssueWithFormData() {
  console.log('\n📎 Test 2: Creating issue with FormData (simulating attachments)');
  console.log('='.repeat(60));
  
  try {
    const FormData = (await import('form-data')).default;
    const formData = new FormData();
    
    formData.append('title', 'Test Issue - With FormData');
    formData.append('description', 'This issue is created using FormData with labels as JSON string');
    formData.append('type', 'bug');
    formData.append('priority', 'high');
    formData.append('status', 'backlog');
    formData.append('labels', JSON.stringify(['bug', 'critical', 'backend']));
    
    const response = await api.post(`/api/v1/issues/${PROJECT_ID}`, formData, {
      headers: {
        ...formData.getHeaders(),
      },
    });

    console.log('✅ SUCCESS');
    console.log('Issue Key:', response.data.data.key);
    console.log('Issue ID:', response.data.data._id);
    console.log('Title:', response.data.data.title);
    console.log('Labels:', response.data.data.labels);
    console.log('Labels Type:', Array.isArray(response.data.data.labels) ? 'Array ✓' : 'Not Array ✗');
    console.log('Status:', response.data.data.status);
    
    return response.data.data;
  } catch (error) {
    console.log('❌ FAILED');
    console.error('Error:', error.response?.data || error.message);
    throw error;
  }
}

// Test 3: Verify issues can be retrieved
async function testListIssues() {
  console.log('\n📋 Test 3: Listing created issues');
  console.log('='.repeat(60));
  
  try {
    const response = await api.get(`/api/v1/issues/${PROJECT_ID}`, {
      params: {
        page: 1,
        limit: 5,
        sort: '-createdAt',
      },
    });

    console.log('✅ SUCCESS');
    console.log('Total Issues:', response.data.data.total);
    console.log('Issues Retrieved:', response.data.data.data.length);
    
    if (response.data.data.data.length > 0) {
      console.log('\nLatest Issue:');
      const latest = response.data.data.data[0];
      console.log('  Key:', latest.key);
      console.log('  Title:', latest.title);
      console.log('  Labels:', latest.labels);
    }
    
    return response.data.data;
  } catch (error) {
    console.log('❌ FAILED');
    console.error('Error:', error.response?.data || error.message);
    throw error;
  }
}

async function runTests() {
  console.log('\n🚀 Starting Issue Creation Tests');
  console.log('API URL:', API_BASE_URL);
  console.log('Project ID:', PROJECT_ID);

  if (!AUTH_TOKEN || !PROJECT_ID) {
    console.error('\n❌ Missing required environment variables:');
    console.error('  TEST_AUTH_TOKEN:', AUTH_TOKEN ? '✓' : '✗ Missing');
    console.error('  TEST_PROJECT_ID:', PROJECT_ID ? '✓' : '✗ Missing');
    console.error('\nPlease set:');
    console.error('  export TEST_AUTH_TOKEN="your-token"');
    console.error('  export TEST_PROJECT_ID="your-project-id"');
    process.exit(1);
  }

  try {
    await testCreateIssueWithoutAttachments();
    await testCreateIssueWithFormData();
    await testListIssues();

    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL TESTS PASSED');
    console.log('='.repeat(60) + '\n');
  } catch (error) {
    console.log('\n' + '='.repeat(60));
    console.log('❌ TESTS FAILED');
    console.log('='.repeat(60) + '\n');
    process.exit(1);
  }
}

runTests();

