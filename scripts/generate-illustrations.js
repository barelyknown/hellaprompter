const fs = require('fs-extra');
const path = require('path');
const fetch = require('node-fetch');
const OpenAI = require('openai');
require('dotenv').config();

// Check if API keys are set
if (!process.env.OPENAI_API_KEY) {
  console.error('Error: OPENAI_API_KEY environment variable is not set');
  process.exit(1);
}

if (!process.env.IDEOGRAM_API_KEY) {
  console.error('Error: IDEOGRAM_API_KEY environment variable is not set');
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const PROMPTS_DIR = path.join(__dirname, '../prompts');
const IDEOGRAM_PROMPT_TEMPLATE_PATH = path.join(__dirname, 'ideogram-prompt-template.txt');

// Generate a scene description using OpenAI
async function generateSceneDescription(prompt, completion, title) {
  try {
    console.log(`Generating scene description for "${title}"...`);
    
    const systemPrompt = `You are an expert at creating scene descriptions for New Yorker-style cartoons.
Given a prompt and its corresponding article, generate a scene description for a New Yorker-style cartoon that captures the essence of the article.

Your scene descriptions should be:
1. Characteristic of the New Yorker's style of cartoons
2. Subtle, with understated visual humor based on the themes, ironies, or contradictions present in the content
3. Focused on a single, clear scene
4. Detailed enough for an artist to draw from, but concise (50-100 words)

Important guidelines!
- Do not include text or speech bubbles
- Do not include any text in "quotes"
- Focus on black and white line art style elements
- Keep it simple and minimalist
- Ensure the scene has a clear visual focus

Just return the description without any prefix, suffix, or other commentary.`;

    const userPrompt = `Prompt: ${prompt}
    
Article Title: ${title}

Article Content (excerpt): ${completion.substring(0, 1000)}${completion.length > 1000 ? '...' : ''}

Create a scene description for a New Yorker-style cartoon that captures the essence of this content.`;

    const response = await openai.chat.completions.create({
      model: "o1",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ]
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error generating scene description:', error);
    throw error;
  }
}

// Generate cartoon options using Ideogram API
async function generateCartoonOptions(sceneDescription) {
  try {
    console.log('Generating cartoon options with Ideogram API...');
    
    // Read the Ideogram prompt template
    const ideogramTemplate = await fs.readFile(IDEOGRAM_PROMPT_TEMPLATE_PATH, 'utf8');
    
    // Insert the scene description into the template
    const fullPrompt = ideogramTemplate.replace('{{SCENE_DESCRIPTION}}', sceneDescription);
    
    // Prepare request body according to the API documentation
    const requestBody = {
      image_request: {
        prompt: fullPrompt,
        aspect_ratio: "ASPECT_16_9", // Using 16:9 as it's closest to 21:11
        model: "V_2",
        magic_prompt_option: "OFF",
        style_type: "AUTO",
        negative_prompt: "text, words, writing, caption, signature, New Yorker",
        num_images: 4,
      }
    };
    
    const response = await fetch('https://api.ideogram.ai/generate', {
      method: 'POST',
      headers: {
        'Api-Key': process.env.IDEOGRAM_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ideogram API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('Ideogram API response:', JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    console.error('Error generating cartoon options:', error);
    throw error;
  }
}

// Select the best illustration using OpenAI Vision
async function selectBestIllustration(sceneDescription, imageUrls, prompt, completion) {
  try {
    console.log('Selecting the best illustration...');
    
    const systemPrompt = `You are an expert art director for The New Yorker magazine.
Your task is to select the best cartoon illustration from a set of options that best represents the given prompt and article content.
Evaluate each illustration based on:
1. How well it captures the essence of the content
2. How characteristic it is of New Yorker cartoon style
3. Visual clarity and composition
4. Subtlety and sophistication of humor
5. Artistic quality

Respond with the number of your selection (1, 2, 3, etc.) followed by a brief explanation of why you chose it.`;

    // Create a message array with the system prompt
    const messages = [
      { role: "system", content: systemPrompt },
    ];
    
    // Create the user message content array starting with text
    const userContent = [
      {
        type: "text",
        text: `Scene Description: ${sceneDescription}

Original Prompt: ${prompt.substring(0, 300)}${prompt.length > 300 ? '...' : ''}

Article Content (excerpt): ${completion.substring(0, 500)}${completion.length > 500 ? '...' : ''}

Please examine the following illustrations and select the best one. Respond with just the number (1-${imageUrls.length}) followed by a brief explanation.`
      }
    ];
    
    // Add each image to the content array
    for (let i = 0; i < imageUrls.length; i++) {
      userContent.push({
        type: "image_url",
        image_url: {
          url: imageUrls[i]
        }
      });
      
      // Add a label for each image
      userContent.push({
        type: "text",
        text: `Illustration ${i + 1}`
      });
    }
    
    // Add the user message with both text and images
    messages.push({
      role: "user",
      content: userContent
    });
    
    // Make the API call with the messages containing text and images
    const apiResponse = await openai.chat.completions.create({
      model: "gpt-4o", // Use a model that supports vision
      messages: messages,
      max_tokens: 500
    });

    const response = apiResponse.choices[0].message.content.trim();
    console.log('OpenAI selection response:', response);
    
    // Extract the number from the response (assuming it starts with the number)
    const match = response.match(/^(\d+)|Illustration\s+(\d+)/i);
    if (match) {
      // Get the first captured group that isn't undefined
      const num = match[1] || match[2];
      const selectedIndex = parseInt(num) - 1; // Convert to 0-based index
      if (selectedIndex >= 0 && selectedIndex < imageUrls.length) {
        return {
          index: selectedIndex,
          url: imageUrls[selectedIndex],
          explanation: response
        };
      }
    }
    
    // If we couldn't parse a number or it's out of range, default to the first image
    console.warn('Could not determine selection from OpenAI response, defaulting to first image');
    return {
      index: 0,
      url: imageUrls[0],
      explanation: response
    };
  } catch (error) {
    console.error('Error selecting best illustration:', error);
    throw error;
  }
}

// Download an image from a URL and save it to the file system
async function downloadImage(url, outputPath) {
  try {
    console.log(`Downloading image from ${url}...`);
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
    }
    
    const buffer = await response.buffer();
    await fs.writeFile(outputPath, buffer);
    
    console.log(`Image saved to ${outputPath}`);
    return outputPath;
  } catch (error) {
    console.error('Error downloading image:', error);
    throw error;
  }
}

async function processPrompts() {
  console.log('Looking for prompts that need illustrations...');
  
  // Get all prompt directories
  const promptDirs = await fs.readdir(PROMPTS_DIR);
  
  let processedCount = 0;
  
  for (const dir of promptDirs) {
    try {
      const dirPath = path.join(PROMPTS_DIR, dir);
      const stats = await fs.stat(dirPath);
      
      if (!stats.isDirectory()) continue;
      
      const metadataPath = path.join(dirPath, 'metadata.json');
      
      // Check if metadata.json exists
      if (await fs.pathExists(metadataPath)) {
        const metadata = await fs.readJson(metadataPath);
        
        // Check if this prompt should have an illustration
        // Either it doesn't have a path yet, or the illustration file doesn't exist
        if (metadata.illustration === true && 
            (!metadata.illustrationPath || 
             !(await fs.pathExists(path.join(dirPath, metadata.illustrationPath))))) {
          console.log(`Processing ${dir} for illustration...`);
          
          // Read the completion.md and metadata
          const completionPath = path.join(dirPath, 'completion.md');
          if (!await fs.pathExists(completionPath)) {
            console.log(`Skipping ${dir}: No completion.md file found`);
            continue;
          }
          
          const completion = await fs.readFile(completionPath, 'utf8');
          
          // 1. Generate scene description
          const sceneDescription = await generateSceneDescription(
            metadata.prompt,
            completion,
            metadata.title
          );
          
          // 2. Generate cartoon options using Ideogram
          const ideogramResponse = await generateCartoonOptions(sceneDescription);
          
          // Extract image URLs from the response based on Ideogram API structure
          const imageUrls = ideogramResponse.data.map(img => img.url);
          
          // 3. Select the best illustration
          const selected = await selectBestIllustration(
            sceneDescription,
            imageUrls,
            metadata.prompt,
            completion
          );
          
          // 4. Download and save all generated images
          const allImageNames = [];
          for (let i = 0; i < imageUrls.length; i++) {
            const imageName = `illustration-${i+1}-${Date.now()}.png`;
            const imagePath = path.join(dirPath, imageName);
            await downloadImage(imageUrls[i], imagePath);
            allImageNames.push(imageName);
          }
          
          // 5. Update metadata with just the selected image path
          const selectedImageName = allImageNames[selected.index];
          metadata.illustrationPath = selectedImageName;
          metadata.sceneDescription = sceneDescription;
          metadata.illustrationExplanation = selected.explanation;
          
          await fs.writeJson(metadataPath, metadata, { spaces: 2 });
          
          console.log(`✓ Added illustration for ${dir}`);
          processedCount++;
        }
      }
    } catch (err) {
      console.error(`Error processing ${dir}:`, err);
    }
  }
  
  console.log(`Done! Processed ${processedCount} illustrations.`);
}

// Main function
async function main() {
  try {
    // Check if running in GitHub Actions or manually enabled
    if (!process.env.GITHUB_ACTIONS && !process.env.ENABLE_LOCAL_API_TASKS) {
      console.log('Not running in GitHub Actions and ENABLE_LOCAL_API_TASKS not set. Skipping API tasks.');
      console.log('To run API tasks locally, set ENABLE_LOCAL_API_TASKS=true in your environment.');
      return;
    }
    
    await processPrompts();
  } catch (error) {
    console.error('Failed to process illustrations:', error);
    process.exit(1);
  }
}

// Run the script
main();