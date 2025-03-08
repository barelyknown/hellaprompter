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
6. Keep all the original content and information except for duplicate links
7. If there are multiple identical links, keep the first occurrence and remove the rest
8. Do not add any extra content, commentary, or notes
9. Remove any special characters, Unicode symbols, or non-standard characters that might not render properly in a browser
10. Keep all links in standard markdown format: [link text](url)
11. IMPORTANT: When handling image URLs, follow these guidelines:
   - Only URLs that are direct links to image files should be formatted as markdown images ![Image description](image-url)
   - Direct image URLs typically do not contain "/wiki/" or similar path segments
   - URLs containing "/wiki/" or pointing to Wikipedia/Wikimedia pages should NOT be treated as images, even if they end with .jpg, .jpeg, .png, etc.
   - Each properly identified image should be in its own paragraph with no other content

IMPORTANT: Return ONLY the reformatted markdown content. Do NOT include any markdown fences (like \`\`\`markdown) around your response.
`;

    // Also generate a short question title for social sharing
    const socialTitlePrompt = `
Based on the following article title and content, create a short, engaging question (5-10 words) that captures the essence of the article. This will be used as a social media post title.

ARTICLE TITLE: "${title}"

ARTICLE CONTENT (EXCERPT):
${cleanedCompletionText.substring(0, 500)}${cleanedCompletionText.length > 500 ? '...' : ''}

The question should:
1. Be concise (5-10 words)
2. Be conversational and engaging
3. Capture the core comparison or concept from the article
4. End with a question mark
5. Entice readers to want to learn more

Just return the question, nothing else.
`;

    // Run both API calls in parallel
    const [completion, socialTitle] = await Promise.all([
      openai.chat.completions.create({
        model: "o1",
        messages: [{ role: "user", content: prompt }]
      }),
      openai.chat.completions.create({
        model: "o1-mini",
        messages: [{ role: "user", content: socialTitlePrompt }]
      })
    ]);

    let formattedContent = completion.choices[0].message.content.trim();
    const socialQuestion = socialTitle.choices[0].message.content.trim();
    
    // Remove markdown fences if they exist
    formattedContent = formattedContent.replace(/^```markdown\n/, '');
    formattedContent = formattedContent.replace(/\n```$/, '');
    formattedContent = formattedContent.replace(/^```\n/, '');
    
    return { formattedContent, socialQuestion };
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    throw error;
  }
}

async function processCompletions() {
  console.log('Looking for completion.txt files to process...');
  
  // Check if running in GitHub Actions or manually enabled
  if (!process.env.GITHUB_ACTIONS && !process.env.ENABLE_LOCAL_API_TASKS) {
    console.log('Not running in GitHub Actions and ENABLE_LOCAL_API_TASKS not set. Skipping API tasks.');
    console.log('To run API tasks locally, set ENABLE_LOCAL_API_TASKS=true in your environment.');
    return;
  }
  
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
        const { formattedContent, socialQuestion } = await formatCompletion(completionText, markdownGuide, metadata.title);
        
        // Replace first heading with the question title
        const originalTitle = metadata.title;
        metadata.title = socialQuestion;
        
        // Check if content has a title heading, and either update or add it
        let updatedContent;
        if (formattedContent.match(/^# .+$/m)) {
          // If there's a title heading, replace it
          updatedContent = formattedContent.replace(/^# .+$/m, `# ${socialQuestion}`);
        } else {
          // If no title heading exists, add it at the beginning
          updatedContent = `# ${socialQuestion}\n\n${formattedContent}`;
        }
        
        // Write the formatted content to completion.md
        await fs.writeFile(completionMdPath, updatedContent);
        
        // Add original title and social question to metadata
        metadata.originalTitle = originalTitle;
        metadata.socialQuestion = socialQuestion;
        await fs.writeJson(metadataPath, metadata, { spaces: 2 });
        
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