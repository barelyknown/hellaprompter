const fs = require('fs-extra');
const path = require('path');
require('dotenv').config();
const { generatePullQuotes } = require('./utils/pull-quotes');

// Check if OPENAI_API_KEY environment variable is set
if (!process.env.OPENAI_API_KEY) {
  console.error('Error: OPENAI_API_KEY environment variable is not set');
  console.error('Please create a .env file with your OpenAI API key or set it as an environment variable.');
  process.exit(1);
}

const PROMPTS_DIR = path.join(__dirname, '../prompts');

async function processArticles() {
  console.log('Looking for articles that need pull quotes...');
  
  // Check if running in GitHub Actions or manually enabled
  if (!process.env.GITHUB_ACTIONS && !process.env.ENABLE_LOCAL_API_TASKS) {
    console.log('Not running in GitHub Actions and ENABLE_LOCAL_API_TASKS not set. Skipping API tasks.');
    console.log('To run API tasks locally, set ENABLE_LOCAL_API_TASKS=true in your environment.');
    return;
  }
  
  // Get all prompt directories
  const promptDirs = await fs.readdir(PROMPTS_DIR);
  
  let processedCount = 0;
  
  for (const dir of promptDirs) {
    try {
      const dirPath = path.join(PROMPTS_DIR, dir);
      const stats = await fs.stat(dirPath);
      
      if (!stats.isDirectory() || dir === 'TEMPLATE') continue;
      
      const completionMdPath = path.join(dirPath, 'completion.md');
      const metadataPath = path.join(dirPath, 'metadata.json');
      
      // Check if completion.md exists and metadata.json exists
      if (
        await fs.pathExists(completionMdPath) && 
        await fs.pathExists(metadataPath)
      ) {
        // Read the metadata
        const metadata = await fs.readJson(metadataPath);
        
        // Check if pullQuotes already exists or is empty
        if (!metadata.pullQuotes || metadata.pullQuotes.length === 0) {
          console.log(`Processing ${dir}...`);
          
          // Read the completion content
          const completionText = await fs.readFile(completionMdPath, 'utf8');
          
          // Generate pull quotes
          const pullQuotes = await generatePullQuotes(completionText, metadata.title);
          
          // Add pull quotes to metadata
          metadata.pullQuotes = pullQuotes;
          
          console.log('Generated pull quotes:');
          pullQuotes.forEach((quote, i) => console.log(`  ${i+1}. ${quote}`));
          
          // Write updated metadata
          await fs.writeJson(metadataPath, metadata, { spaces: 2 });
          
          console.log(`✓ Added pull quotes to metadata for ${dir}`);
          processedCount++;
        }
      }
    } catch (err) {
      console.error(`Error processing ${dir}:`, err);
    }
  }
  
  console.log(`Done! Added pull quotes to ${processedCount} articles.`);
}

processArticles().catch(err => {
  console.error('Failed to generate pull quotes:', err);
  process.exit(1);
});