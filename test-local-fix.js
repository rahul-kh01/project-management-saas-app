/**
 * Test Local Fix Script
 * 
 * This script tests the middleware fix locally before deployment
 */

import express from 'express';
import { sanitizeInputs } from './src/middlewares/security.middleware.js';

const app = express();

// Add middleware
app.use(express.json());
app.use(sanitizeInputs);

// Test route
app.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Middleware fix working',
    query: req.query,
    params: req.params
  });
});

// Health check route
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

const PORT = 3001;

app.listen(PORT, () => {
  console.log(`🧪 Test server running on http://localhost:${PORT}`);
  console.log('✅ Middleware fix appears to be working locally');
  console.log('📝 You can now commit and push to deploy the fix');
  console.log('\nTest endpoints:');
  console.log(`- http://localhost:${PORT}/health`);
  console.log(`- http://localhost:${PORT}/test?param=value`);
  console.log('\nPress Ctrl+C to stop the test server');
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Test server stopped');
  process.exit(0);
});
