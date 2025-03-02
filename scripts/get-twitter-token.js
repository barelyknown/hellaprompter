#!/usr/bin/env node
const { TwitterApi } = require('twitter-api-v2');
const readline = require('readline');
require('dotenv').config();

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to parse code from URL or direct input
function parseCodeFromInput(input) {
  if (input.startsWith('http')) {
    // Input is a URL, try to parse it
    try {
      const url = new URL(input);
      return {
        code: url.searchParams.get('code'),
        state: url.searchParams.get('state')
      };
    } catch (e) {
      return null;
    }
  } else {
    // Input might be just the code
    return { code: input, state: null };
  }
}

async function getTwitterToken() {
  try {
    console.log('Setting up Twitter OAuth 2.0 credentials...\n');
    
    // Check for client ID and secret
    if (!process.env.TWITTER_CLIENT_ID || !process.env.TWITTER_CLIENT_SECRET) {
      console.error('Missing TWITTER_CLIENT_ID or TWITTER_CLIENT_SECRET in .env file');
      console.error('Please add these from the Twitter Developer Portal > App > Keys and tokens tab > OAuth 2.0 Client ID and Client Secret');
      process.exit(1);
    }
    
    // Create the TwitterApi client
    const twitterClient = new TwitterApi({
      clientId: process.env.TWITTER_CLIENT_ID,
      clientSecret: process.env.TWITTER_CLIENT_SECRET,
    });
    
    // Generate the authorization URL
    const redirectUri = 'https://www.hellaprompter.com';
    const { url: authUrl, codeVerifier, state } = twitterClient.generateOAuth2AuthLink(
      redirectUri,
      { scope: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'] }
    );
    
    // Provide instructions to the user
    console.log('Please authorize your app by visiting this URL:');
    console.log(authUrl);
    console.log('\nAfter authorization, you will be redirected to ' + redirectUri);
    console.log('You will need the authorization code to proceed.');
    console.log('This can be found in two ways:');
    console.log('1. In the redirect URL as the "code" parameter in the URL');
    console.log('2. Some browsers may display the code directly on the page\n');
    
    // Get the code from the user
    const userInput = await new Promise((resolve) => {
      rl.question('Enter the authorization code: ', (answer) => {
        resolve(answer.trim());
      });
    });
    
    // Parse the input to get the code
    const parsedInput = parseCodeFromInput(userInput);
    
    if (!parsedInput || !parsedInput.code) {
      console.error('Error: Could not parse authorization code from input');
      process.exit(1);
    }
    
    // If state was returned, verify it
    if (parsedInput.state && state !== parsedInput.state) {
      console.error('Error: State parameter does not match. This could be a CSRF attack.');
      process.exit(1);
    }
    
    // Exchange the code for tokens
    console.log('\nExchanging code for tokens...');
    
    try {
      // Try with PKCE flow first
      const { accessToken, refreshToken, expiresIn } = await twitterClient.loginWithOAuth2({
        code: parsedInput.code,
        codeVerifier,
        redirectUri,
      });
      
      console.log('\nSuccess! Add these tokens to your .env file:');
      console.log(`TWITTER_CLIENT_ID=${process.env.TWITTER_CLIENT_ID}`);
      console.log(`TWITTER_CLIENT_SECRET=${process.env.TWITTER_CLIENT_SECRET}`);
      console.log(`TWITTER_REFRESH_TOKEN=${refreshToken}`);
      console.log(`\nThe access token expires in ${expiresIn} seconds.`);
      console.log('The refresh token can be used to get new access tokens and does not expire unless revoked.');
      
    } catch (error) {
      console.error('Error exchanging code for tokens:', error);
      console.error('Make sure the code is correct and you are using the right redirect URI.');
      process.exit(1);
    }
    
    // Close the readline interface
    rl.close();
    
  } catch (error) {
    console.error('Error getting Twitter tokens:', error);
    rl.close();
    process.exit(1);
  }
}

// Run the function if the script is run directly
if (require.main === module) {
  getTwitterToken().catch(console.error);
}

module.exports = { getTwitterToken };