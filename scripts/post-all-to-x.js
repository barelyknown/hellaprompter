#!/usr/bin/env node
const fs = require('fs-extra');
const path = require('path');
const { postToX } = require('./post-to-x');
require('dotenv').config();

// Directory containing all prompts
const PROMPTS_DIR = path.join(__dirname, '../prompts');

// Check if running in GitHub Actions or manually enabled
if (!process.env.GITHUB_ACTIONS && !process.env.ENABLE_LOCAL_API_TASKS) {
  console.log('Not running in GitHub Actions and ENABLE_LOCAL_API_TASKS not set. Skipping posting to X.');
  console.log('To post to X locally, set ENABLE_LOCAL_API_TASKS=true in your environment.');
  process.exit(0);
}

// Verify Twitter OAuth 2.0 credentials
if (!process.env.TWITTER_CLIENT_ID || !process.env.TWITTER_CLIENT_SECRET || 
    !process.env.TWITTER_REFRESH_TOKEN) {
  console.error('Twitter OAuth 2.0 credentials are missing. Please add them to your .env file:');
  console.error('Run npm run get-twitter-token to generate these credentials.');
  process.exit(1);
}

/**
 * Post all eligible prompts to X
 * A prompt is eligible if:
 * 1. It has postToX set to true in metadata.json
 * 2. It does not already have xPostUrl in metadata.json
 * 3. It has a completion.md file (indicating it's been formatted)
 */
async function postAllToX() {
  console.log('Looking for prompts to post to X...');
  
  try {
    // Get all prompt directories
    const promptDirs = await fs.readdir(PROMPTS_DIR);
    let postedCount = 0;
    
    // Process each prompt directory
    for (const dir of promptDirs) {
      const dirPath = path.join(PROMPTS_DIR, dir);
      
      // Skip if not a directory
      if (!(await fs.stat(dirPath)).isDirectory()) continue;
      
      const metadataPath = path.join(dirPath, 'metadata.json');
      const completionPath = path.join(dirPath, 'completion.md');
      
      // Skip if metadata.json doesn't exist
      if (!await fs.pathExists(metadataPath)) continue;
      
      // Skip if completion.md doesn't exist (not formatted yet)
      if (!await fs.pathExists(completionPath)) continue;
      
      // Read metadata
      const metadata = await fs.readJson(metadataPath);
      
      // Check if eligible for posting
      if (metadata.postToX === true && !metadata.xPostUrl) {
        console.log(`Posting ${dir} to X...`);
        
        try {
          const postUrl = await postToX(dir);
          
          if (postUrl) {
            console.log(`Successfully posted ${dir} to X: ${postUrl}`);
            postedCount++;
            
            // Add a small delay between posts to avoid rate limits
            if (postedCount > 0) {
              await new Promise(resolve => setTimeout(resolve, 5000));
            }
          } else {
            console.error(`Failed to post ${dir} to X`);
          }
        } catch (error) {
          console.error(`Error posting ${dir} to X:`, error);
        }
      }
    }
    
    console.log(`Done! Posted ${postedCount} prompts to X.`);
    return postedCount;
  } catch (error) {
    console.error('Error posting prompts to X:', error);
    return 0;
  }
}

// Run the function if this script is called directly
if (require.main === module) {
  postAllToX()
    .then(count => {
      // Exit with success after a short delay to allow file writes to complete
      setTimeout(() => process.exit(0), 1000);
    })
    .catch(error => {
      console.error('Error:', error);
      process.exit(1);
    });
}

module.exports = { postAllToX };