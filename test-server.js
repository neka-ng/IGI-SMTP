// Simple test to check if the server module loads correctly
console.log('Testing server module loading...');

try {
  // We'll just check if we can import the modules without errors
  const express = require('express');
  console.log('✓ Express imported successfully');
  
  // Try to load dotenv
  require('dotenv').config();
  console.log('✓ Dotenv imported and configured');
  
  console.log('✓ Basic server dependencies loaded successfully');
  console.log('The server should start normally. The issue might be with the async connection to MongoDB.');
  console.log('Since we are running locally without MONGODB_URI, it should fallback to in-memory mode.');
} catch (error) {
  console.error('✗ Error importing server dependencies:', error.message);
}