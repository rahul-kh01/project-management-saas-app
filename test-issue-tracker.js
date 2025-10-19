/**
 * Issue Tracker Integration Test
 * 
 * This script tests the complete issue tracker workflow:
 * 1. Create an issue
 * 2. Get issue details
 * 3. Update issue
 * 4. Attempt invalid transition (should fail)
 * 5. Perform valid transition (should succeed)
 * 6. Add comment
 * 7. Watch/unwatch issue
 * 
 * Usage:
 *   node test-issue-tracker.js
 * 
 * Prerequisites:
 *   - Server running
 *   - Valid authentication token
 *   - Existing project ID
 */

import axios from 'axios';

// Configuration
const API_BASE_URL = process.env.API_URL || 'http://localhost:5000';
const AUTH_TOKEN = process.env.TEST_AUTH_TOKEN || 'your-jwt-token-here';
const PROJECT_ID = process.env.TEST_PROJECT_ID || 'your-project-id-here';

// Setup axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Authorization': `Bearer ${AUTH_TOKEN}`,
    'Content-Type': 'application/json',
  },
});

// Helper function to log test results
const logTest = (testName, success, data = null, error = null) => {
  console.log('\n' + '='.repeat(60));
  console.log(`TEST: ${testName}`);
  console.log('='.repeat(60));
  if (success) {
    console.log('✅ PASSED');
    if (data) console.log('Response:', JSON.stringify(data, null, 2));
  } else {
    console.log('❌ FAILED');
    if (error) console.log('Error:', error.message);
  }
};

// Test 1: Create Issue
async function testCreateIssue() {
  try {
    const response = await api.post(`/api/v1/issues/${PROJECT_ID}`, {
      title: 'Test Issue - Login Bug',
      description: 'Users cannot login with special characters in password',
      type: 'bug',
      priority: 'high',
      status: 'backlog',
      labels: ['authentication', 'urgent'],
    });

    logTest('Create Issue', true, {
      id: response.data.data._id,
      key: response.data.data.key,
      title: response.data.data.title,
    });

    return response.data.data;
  } catch (error) {
    logTest('Create Issue', false, null, error);
    throw error;
  }
}

// Test 2: Get Issue Details
async function testGetIssue(issueId) {
  try {
    const response = await api.get(`/api/v1/issues/${PROJECT_ID}/i/${issueId}`);

    logTest('Get Issue Details', true, {
      issue: response.data.data.issue,
      commentCount: response.data.data.commentCount,
      activityCount: response.data.data.activityCount,
    });

    return response.data.data;
  } catch (error) {
    logTest('Get Issue Details', false, null, error);
    throw error;
  }
}

// Test 3: List Issues with Filters
async function testListIssues() {
  try {
    const response = await api.get(`/api/v1/issues/${PROJECT_ID}`, {
      params: {
        status: 'backlog',
        priority: 'high',
        page: 1,
        limit: 10,
      },
    });

    logTest('List Issues with Filters', true, {
      total: response.data.data.total,
      count: response.data.data.data.length,
      hasMore: response.data.data.hasMore,
    });

    return response.data.data;
  } catch (error) {
    logTest('List Issues with Filters', false, null, error);
    throw error;
  }
}

// Test 4: Update Issue
async function testUpdateIssue(issueId) {
  try {
    const response = await api.put(`/api/v1/issues/${PROJECT_ID}/i/${issueId}`, {
      priority: 'highest',
      labels: ['authentication', 'urgent', 'security'],
      storyPoints: 5,
    });

    logTest('Update Issue', true, {
      id: response.data.data._id,
      priority: response.data.data.priority,
      labels: response.data.data.labels,
      storyPoints: response.data.data.storyPoints,
    });

    return response.data.data;
  } catch (error) {
    logTest('Update Issue', false, null, error);
    throw error;
  }
}

// Test 5: Invalid Transition (should fail)
async function testInvalidTransition(issueId) {
  try {
    // Try to transition from backlog directly to done (not allowed)
    const response = await api.post(
      `/api/v1/issues/${PROJECT_ID}/i/${issueId}/transition`,
      { to: 'done' }
    );

    logTest('Invalid Transition (backlog → done)', false, null, {
      message: 'This should have failed but succeeded!',
    });
  } catch (error) {
    // This error is expected
    if (error.response && error.response.status === 400) {
      logTest('Invalid Transition (backlog → done)', true, {
        message: 'Correctly rejected invalid transition',
        errorMessage: error.response.data.message,
      });
    } else {
      logTest('Invalid Transition (backlog → done)', false, null, error);
    }
  }
}

// Test 6: Valid Transition (should succeed)
async function testValidTransition(issueId) {
  try {
    // Transition from backlog to selected (allowed)
    const response = await api.post(
      `/api/v1/issues/${PROJECT_ID}/i/${issueId}/transition`,
      { to: 'selected' }
    );

    logTest('Valid Transition (backlog → selected)', true, {
      status: response.data.data.status,
    });

    return response.data.data;
  } catch (error) {
    logTest('Valid Transition (backlog → selected)', false, null, error);
    throw error;
  }
}

// Test 7: Add Comment
async function testAddComment(issueId) {
  try {
    const response = await api.post(
      `/api/v1/issues/${PROJECT_ID}/i/${issueId}/comments`,
      {
        body: 'This is a test comment. I will work on this issue.',
      }
    );

    logTest('Add Comment', true, {
      id: response.data.data._id,
      body: response.data.data.body,
      author: response.data.data.authorId?.username,
    });

    return response.data.data;
  } catch (error) {
    logTest('Add Comment', false, null, error);
    throw error;
  }
}

// Test 8: List Comments
async function testListComments(issueId) {
  try {
    const response = await api.get(
      `/api/v1/issues/${PROJECT_ID}/i/${issueId}/comments`,
      {
        params: { page: 1, limit: 20 },
      }
    );

    logTest('List Comments', true, {
      total: response.data.data.total,
      count: response.data.data.data.length,
    });

    return response.data.data;
  } catch (error) {
    logTest('List Comments', false, null, error);
    throw error;
  }
}

// Test 9: Watch Issue
async function testWatchIssue(issueId) {
  try {
    const response = await api.post(
      `/api/v1/issues/${PROJECT_ID}/i/${issueId}/watch`
    );

    logTest('Watch Issue', true, {
      message: response.data.message,
      watchersCount: response.data.data.watchers?.length,
    });

    return response.data.data;
  } catch (error) {
    logTest('Watch Issue', false, null, error);
    throw error;
  }
}

// Test 10: Unwatch Issue
async function testUnwatchIssue(issueId) {
  try {
    const response = await api.delete(
      `/api/v1/issues/${PROJECT_ID}/i/${issueId}/watch`
    );

    logTest('Unwatch Issue', true, {
      message: response.data.message,
    });

    return response.data.data;
  } catch (error) {
    logTest('Unwatch Issue', false, null, error);
    throw error;
  }
}

// Main test runner
async function runTests() {
  console.log('\n🚀 Starting Issue Tracker Integration Tests\n');
  console.log(`API URL: ${API_BASE_URL}`);
  console.log(`Project ID: ${PROJECT_ID}`);
  console.log('\n');

  if (AUTH_TOKEN === 'your-jwt-token-here' || PROJECT_ID === 'your-project-id-here') {
    console.error('❌ Please set TEST_AUTH_TOKEN and TEST_PROJECT_ID environment variables');
    console.error('\nExample:');
    console.error('  export TEST_AUTH_TOKEN="your-actual-token"');
    console.error('  export TEST_PROJECT_ID="actual-project-id"');
    console.error('  node test-issue-tracker.js');
    process.exit(1);
  }

  try {
    // Run tests in sequence
    const issue = await testCreateIssue();
    const issueId = issue._id;

    await testGetIssue(issueId);
    await testListIssues();
    await testUpdateIssue(issueId);
    await testInvalidTransition(issueId);
    await testValidTransition(issueId);
    await testAddComment(issueId);
    await testListComments(issueId);
    await testWatchIssue(issueId);
    await testUnwatchIssue(issueId);

    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL TESTS COMPLETED SUCCESSFULLY');
    console.log('='.repeat(60) + '\n');

    console.log(`Created test issue with key: ${issue.key}`);
    console.log(`Issue ID: ${issueId}`);
    console.log('\nYou can now view this issue in the frontend!');
  } catch (error) {
    console.log('\n' + '='.repeat(60));
    console.log('❌ TESTS FAILED');
    console.log('='.repeat(60) + '\n');
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    process.exit(1);
  }
}

// Run tests
runTests();

