const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const https = require('https');
const { TwitterApi } = require('twitter-api-v2');
require('dotenv').config();

// Post a prompt to X (Twitter)
async function postToX(promptSlug) {
  try {
    // Path to the prompt's metadata
    const promptDir = path.join(__dirname, '../prompts', promptSlug);
    const metadataPath = path.join(promptDir, 'metadata.json');
    
    // Check if the metadata file exists
    if (!await fs.pathExists(metadataPath)) {
      console.error(`Metadata file not found for ${promptSlug}`);
      return null;
    }
    
    // Read the metadata
    const metadata = await fs.readJson(metadataPath);
    
    // Check if this prompt should be posted to X
    if (!metadata.postToX) {
      console.log(`Prompt "${promptSlug}" is not marked for posting to X.`);
      return null;
    }
    
    // Check if it was already posted
    if (metadata.xPostUrl) {
      console.log(`Prompt "${promptSlug}" was already posted to X: ${metadata.xPostUrl}`);
      return metadata.xPostUrl;
    }
    
    // Create the post text and URL
    const url = `https://www.hellaprompter.com/prompts/${promptSlug}/`;
    const postText = createPostText(metadata, promptSlug, url);
    
    console.log(`Preparing to post to X: "${postText}"`);
    
    // Check if the page is actually available before posting
    console.log(`Verifying that the page is accessible: ${url}`);
    try {
      await verifyUrlIsAccessible(url);
      console.log('Page is accessible! Proceeding with posting to X.');
    } catch (error) {
      console.error(`ERROR: Page is not accessible: ${error.message}`);
      
      const maxRetries = 10;
      const delaySeconds = 30;
      let pageAccessible = false;
      
      console.log(`Will retry up to ${maxRetries} times with ${delaySeconds}s between attempts (up to ${maxRetries * delaySeconds / 60} minutes total)`);
      
      // Retry a few times before giving up
      for (let i = 0; i < maxRetries; i++) {
        console.log(`Retrying in ${delaySeconds} seconds... (${i+1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
        
        try {
          await verifyUrlIsAccessible(url);
          console.log('Page is now accessible! Proceeding with posting to X.');
          pageAccessible = true;
          break;
        } catch (retryError) {
          console.error(`Still not accessible: ${retryError.message}`);
        }
      }
      
      if (!pageAccessible) {
        console.error(`Cannot post to X because the page is not accessible after ${maxRetries} attempts (${(maxRetries * delaySeconds / 60).toFixed(1)} minutes).`);
        console.error('This might indicate that the GitHub Pages deployment failed or is still in progress.');
        console.error('Please check the deployment status and try again later.');
        
        if (process.env.IGNORE_URL_CHECK === 'true') {
          console.log('IGNORE_URL_CHECK is set to true, proceeding with posting despite page not being accessible.');
        } else {
          throw new Error('Page not accessible');
        }
      }
    }
    
    // Check Twitter API credentials
    if (!process.env.TWITTER_CLIENT_ID || 
        !process.env.TWITTER_CLIENT_SECRET || 
        !process.env.TWITTER_REFRESH_TOKEN) {
      throw new Error('Twitter OAuth credentials missing. Run npm run get-twitter-token to set up.');
    }
    
    try {
      // Create the Twitter auth client
      const twitterAuth = new TwitterApi({
        clientId: process.env.TWITTER_CLIENT_ID,
        clientSecret: process.env.TWITTER_CLIENT_SECRET,
      });
      
      console.log('Refreshing access token...');
      
      // Get a new client with refreshed tokens
      const { client, refreshToken: newRefreshToken, accessToken } = await twitterAuth.refreshOAuth2Token(
        process.env.TWITTER_REFRESH_TOKEN
      );
      
      // Update refresh token in .env if running locally
      if (fs.existsSync('.env')) {
        try {
          console.log('Updating refresh token in .env file...');
          const envContent = await fs.readFile('.env', 'utf8');
          const updatedContent = envContent.replace(
            /TWITTER_REFRESH_TOKEN=.*/,
            `TWITTER_REFRESH_TOKEN=${newRefreshToken}`
          );
          await fs.writeFile('.env', updatedContent);
        } catch (envError) {
          console.error('Error updating .env file:', envError);
        }
      } 
      
      // Check if running in GitHub Actions
      if (process.env.GITHUB_ACTIONS) {
        try {
          // Write token to an output file for the update-secret job
          const tokenDir = path.join(process.env.GITHUB_WORKSPACE || '.', 'twitter_tokens');
          await fs.ensureDir(tokenDir);
          const tokenFile = path.join(tokenDir, 'new_refresh_token.txt');
          await fs.writeFile(tokenFile, newRefreshToken);
          
          console.log('IMPORTANT: A new refresh token has been generated!');
          console.log(`New refresh token: ${newRefreshToken}`);
          
          // Set output for GitHub workflow - this is needed by the update-token job
          if (process.env.GITHUB_OUTPUT) {
            // Use a simpler approach without HEREDOC to avoid EOF delimiter issues
            await fs.appendFile(process.env.GITHUB_OUTPUT, `TWITTER_REFRESH_TOKEN=${newRefreshToken}\n`);
            // Also set the token_updated output to true for the GitHub workflow
            await fs.appendFile(process.env.GITHUB_OUTPUT, `token_updated=true\n`);
            console.log('Set refresh token and token_updated=true as outputs for GitHub workflow');
          }
          
          console.log('The token is available as an output variable and saved to twitter_tokens/new_refresh_token.txt');
        } catch (tokenError) {
          console.error('Error handling token in GitHub Actions:', tokenError);
          console.log(`New refresh token: ${newRefreshToken}`);
        }
      } else if (!fs.existsSync('.env')) {
        // Not running locally and not in GitHub Actions
        console.log('New refresh token generated. Update your environment variables with:');
        console.log(`TWITTER_REFRESH_TOKEN=${newRefreshToken}`);
      }
      
      console.log('Sending tweet...');
      // Post to X with the refreshed client
      const tweet = await client.v2.tweet(postText);
      
      if (tweet && tweet.data && tweet.data.id) {
        // Create the post URL
        const postUrl = `https://x.com/barelyknown/status/${tweet.data.id}`;
        
        // Update the metadata with the post URL
        metadata.xPostUrl = postUrl;
        await fs.writeJson(metadataPath, metadata, { spaces: 2 });
        
        console.log(`Successfully posted to X: ${postUrl}`);
        return postUrl;
      } else {
        console.error('Failed to post to X: No tweet ID returned');
        console.error('Response data:', tweet);
        return null;
      }
      
    } catch (error) {
      console.error('Error posting to X:', error);
      
      if (error.message?.includes('invalid_grant') || 
          error.data?.error === 'invalid_request' ||
          error.message?.includes('failed to refresh token')) {
        console.error('\nYour Twitter refresh token is invalid or expired.');
        console.error('Please run "npm run get-twitter-token" to generate a new token.');
      }
      
      return null;
    }
  } catch (error) {
    console.error('Error in postToX function:', error);
    return null;
  }
}

// Function to verify if a URL is accessible
function verifyUrlIsAccessible(url) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, { timeout: 10000 }, (response) => {
      const { statusCode } = response;
      
      // Check for successful response (200 OK)
      if (statusCode === 200) {
        // Consume the response data to free up memory
        response.resume();
        resolve();
      } else {
        reject(new Error(`HTTP status code: ${statusCode}`));
      }
    });
    
    // Handle request errors (network issues, etc.)
    request.on('error', (err) => {
      reject(new Error(`Request failed: ${err.message}`));
    });
    
    // Handle timeout
    request.on('timeout', () => {
      request.destroy();
      reject(new Error('Request timed out after 10 seconds'));
    });
  });
}

// Create the text for the X post
function createPostText(metadata, promptSlug, url) {
  // Use social question if available, otherwise use social description or title
  let text = '';
  if (metadata.socialQuestion || metadata.title.endsWith('?')) {
    // If we have a question title (either in socialQuestion or the title itself is a question)
    text = `New prompt: ${metadata.socialQuestion || metadata.title}`;
  } else if (metadata.socialDescription) {
    text = metadata.socialDescription;
  } else {
    text = `New article: ${metadata.title}`;
  }
  
  // Combine text and URL (ensure it's under X's 280 character limit)
  let postText = `${text} ${url}`;
  
  // Truncate if necessary
  if (postText.length > 279) {
    const urlLength = url.length + 1; // +1 for the space
    const maxTextLength = 279 - urlLength;
    postText = `${text.substring(0, maxTextLength - 3)}... ${url}`;
  }
  
  return postText;
}

// If script is run directly, post the given prompt
if (require.main === module) {
  const promptSlug = process.argv[2];
  
  if (!promptSlug) {
    console.error('Please provide a prompt slug as an argument');
    process.exit(1);
  }
  
  postToX(promptSlug)
    .then(result => {
      if (result) {
        console.log(`Post URL: ${result}`);
        process.exit(0);
      } else {
        console.error('Failed to post to X');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Error:', error);
      process.exit(1);
    });
}

module.exports = { postToX };