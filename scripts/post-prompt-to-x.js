#!/usr/bin/env node
const { postToX } = require('./post-to-x');
require('dotenv').config();

const promptSlug = process.argv[2];

if (!promptSlug) {
  console.error('Please provide a prompt slug as an argument');
  process.exit(1);
}

// Verify Twitter OAuth 2.0 credentials
if (!process.env.TWITTER_CLIENT_ID || !process.env.TWITTER_CLIENT_SECRET || 
    !process.env.TWITTER_REFRESH_TOKEN) {
  console.error('Twitter OAuth 2.0 credentials are missing. Please add them to your .env file:');
  console.error('Run npm run get-twitter-token to generate these credentials.');
  process.exit(1);
}

postToX(promptSlug)
  .then(result => {
    if (result) {
      console.log(`Successfully posted to X: ${result}`);
      
      // Exit with success after a short delay to allow .env file to be fully written
      setTimeout(() => process.exit(0), 500);
    } else {
      console.error('Failed to post to X');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });