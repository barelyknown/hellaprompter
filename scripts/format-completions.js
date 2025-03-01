const fs = require('fs-extra');
const path = require('path');
const OpenAI = require('openai');
require('dotenv').config();

// Check if OPENAI_API_KEY environment variable is set
if (!process.env.OPENAI_API_KEY) {
  console.error('Error: OPENAI_API_KEY environment variable is not set');
  console.error('Please create a .env file with your OpenAI API key or set it as an environment variable.');
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const PROMPTS_DIR = path.join(__dirname, '../prompts');
const MARKDOWN_GUIDE_PATH = path.join(__dirname, '../MARKDOWN_GUIDE.md');

async function formatCompletion(completionText, markdownGuide, title) {
  try {
    console.log(`Formatting completion with OpenAI API...`);
    
    // Pre-process: Strip text fragments from URLs in the completion text
    const cleanedCompletionText = completionText.replace(/(https?:\/\/[^\s]+?)#:~:text=[^\s)]+/g, '$1');
    
    const prompt = `
You are helping to format an AI-generated article according to our markdown style guide.

MARKDOWN STYLE GUIDE:
${markdownGuide}

ARTICLE TITLE: "${title}"

ORIGINAL ARTICLE TEXT:
${cleanedCompletionText}

Your task is to reformat the original article text to follow our markdown style guide.
Make sure to:
1. Format headings correctly (# for title, ## for sections, etc.)
2. Use the provided article title as the main heading (# Title) if the original doesn't have a clear title
3. Ensure proper paragraph spacing
4. Format lists and code blocks correctly
5. Apply appropriate emphasis with *italic* or **bold** formatting
6. Keep all the original content and information
7. Do not add any extra content, commentary, or notes

IMPORTANT: Return ONLY the reformatted markdown content. Do NOT include any markdown fences (like \`\`\`markdown) around your response.
`;

    const completion = await openai.chat.completions.create({
      model: "o3-mini",
      messages: [{ role: "user", content: prompt }]
    });

    let formattedContent = completion.choices[0].message.content.trim();
    
    // Remove markdown fences if they exist
    formattedContent = formattedContent.replace(/^```markdown\n/, '');
    formattedContent = formattedContent.replace(/\n```$/, '');
    formattedContent = formattedContent.replace(/^```\n/, '');
    
    return formattedContent;
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    throw error;
  }
}

async function processCompletions() {
  console.log('Looking for completion.txt files to process...');
  
  // Read the markdown guide
  const markdownGuide = await fs.readFile(MARKDOWN_GUIDE_PATH, 'utf8');
  
  // Get all prompt directories
  const promptDirs = await fs.readdir(PROMPTS_DIR);
  
  let processedCount = 0;
  
  for (const dir of promptDirs) {
    try {
      const dirPath = path.join(PROMPTS_DIR, dir);
      const stats = await fs.stat(dirPath);
      
      if (!stats.isDirectory()) continue;
      
      const completionTxtPath = path.join(dirPath, 'completion.txt');
      const completionMdPath = path.join(dirPath, 'completion.md');
      const metadataPath = path.join(dirPath, 'metadata.json');
      
      // Check if completion.txt exists but completion.md doesn't
      if (
        await fs.pathExists(completionTxtPath) && 
        !await fs.pathExists(completionMdPath) &&
        await fs.pathExists(metadataPath)
      ) {
        console.log(`Processing ${dir}...`);
        
        // Read the completion.txt and metadata.json
        const completionText = await fs.readFile(completionTxtPath, 'utf8');
        const metadata = await fs.readJson(metadataPath);
        
        // Format the completion using OpenAI
        const formattedCompletion = await formatCompletion(completionText, markdownGuide, metadata.title);
        
        // Write the formatted content to completion.md
        await fs.writeFile(completionMdPath, formattedCompletion);
        
        console.log(`✓ Created completion.md for ${dir}`);
        processedCount++;
      }
    } catch (err) {
      console.error(`Error processing ${dir}:`, err);
    }
  }
  
  console.log(`Done! Processed ${processedCount} completion files.`);
}

processCompletions().catch(err => {
  console.error('Failed to process completions:', err);
  process.exit(1);
});