const OpenAI = require('openai');
require('dotenv').config();

// Create OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Generates pull quotes from article content
 * @param {string} completionText - The article text
 * @param {string} title - The article title
 * @returns {Promise<string[]>} Array of pull quotes
 */
async function generatePullQuotes(completionText, title) {
  try {
    console.log(`Generating pull quotes for "${title}"...`);
    
    const pullQuotePrompt = `
Extract 3-5 of the most interesting and thought-provoking pull quotes from the following article. 
These quotes should be:
1. Direct quotes from the article text (do not modify or paraphrase)
2. Around 10-25 words each
3. Concise, insightful, and impactful 
4. Representative of the article's key points or most interesting ideas
5. From different sections of the article, if possible

ARTICLE TITLE: "${title}"

ARTICLE CONTENT:
${completionText}

Return only the quotes, one per line, with no numbering, prefixes, or other text.
`;

    const response = await openai.chat.completions.create({
      model: "o1",
      messages: [{ role: "user", content: pullQuotePrompt }]
    });
    
    // Process pull quotes - split by lines and filter out empty lines
    const quotes = response.choices[0].message.content
      .trim()
      .split('\n')
      .map(quote => quote.trim())
      .filter(quote => quote);
    
    return quotes;
  } catch (error) {
    console.error('Error generating pull quotes:', error);
    throw error;
  }
}

module.exports = {
  generatePullQuotes
};