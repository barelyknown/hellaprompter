# hellaprompter

A static website of articles generated from prompts.

## About

hellaprompter is a personal project that showcases articles generated from AI prompts. The site emphasizes that questions are more valuable than answers, highlighting the prompts that generated each article. The project was vibe coded with Claude Code, an AI coding assistant.

## Development

To run the development server:

```bash
# Install dependencies
npm install

# Build the site
npm run build

# Run the development server (in one terminal)
npm run dev

# Watch for changes and rebuild (in another terminal)
npm run watch
```

## Adding New Content

1. Create a new directory under `prompts/` with a descriptive name (e.g., `prompts/quantum-computing/`)
2. Add a `metadata.json` file with the following fields:
   ```json
   {
     "prompt": "Your AI prompt here",
     "title": "Article Title",
     "date": "YYYY-MM-DD",
     "service": "Service used (e.g., ChatGPT Deep Research, Claude)",
     "postToX": true,
     "illustration": true
   }
   ```
3. To add content, you have two options:

   **Option 1: Add formatted markdown directly**
   - Create a `completion.md` file formatted according to the [Markdown Guide](MARKDOWN_GUIDE.md)

   **Option 2: Let OpenAI format it for you**
   - Paste the raw completion text into a file named `completion.txt`
   - The GitHub Action will automatically convert it to properly formatted markdown
   - Alternatively, run `npm run format-completions` locally (requires OpenAI API key)

## Deployment

The site is automatically deployed to GitHub Pages when changes are pushed to the main branch. The GitHub Actions workflow handles:

1. Formatting any new raw completions to Markdown
2. Generating illustrations for articles that need them
3. Posting new articles to X (if configured)
4. Building and deploying the static site to GitHub Pages

## Posting to X (Twitter)

To enable posting to X (Twitter):

1. Set up Twitter OAuth 2.0 credentials:
   - Add your Twitter Client ID and Secret to `.env`
   - Run `npm run get-twitter-token` and follow the instructions
   - Add the generated Refresh Token to your `.env` file
2. Add `"postToX": true` to a prompt's `metadata.json`
3. Build the site with `npm run build`, which will automatically post new prompts to X
4. To post a specific prompt manually: `npm run post-to-x prompt-directory-name`

Once a prompt is posted, its `metadata.json` will be updated with an `xPostUrl` field containing the X post URL.

## Core Functionality

1. **AI-Generated Content**: Articles are created using various AI services such as ChatGPT or Claude.
2. **Auto-Formatting**: Raw AI responses are automatically formatted according to a consistent Markdown style.
3. **AI-Generated Illustrations**: Automatically generates New Yorker-style illustrations for articles using Ideogram AI.
4. **Social Media Integration**: Can automatically post new articles to X (Twitter) with engaging descriptions.
5. **Static Site Generation**: Builds a fast, lightweight static site with search functionality.
6. **RSS Feed**: Automatically generates an RSS feed of all articles.
7. **SEO Optimization**: Includes proper metadata for search engines and social media sharing.

## Structure

- `prompts/`: Contains directories for each article, with each directory containing:
  - `completion.md`: The article content in Markdown format
  - `completion.txt`: Optional raw AI completion before formatting
  - `metadata.json`: Metadata about the article (prompt, title, date, service, postToX, xPostUrl)
  - `illustration-*.png`: AI-generated New Yorker-style illustrations
- `src/`: Source files for the static site:
  - `css/`: Stylesheets
  - `js/`: JavaScript files
  - `images/`: Images and favicon
- `scripts/`: Build scripts
  - `build.js`: Main script for generating the static site
  - `format-completions.js`: Script to format raw AI outputs into markdown
  - `generate-illustrations.js`: Script to create illustrations using Ideogram AI
  - `post-to-x.js`: Module for posting to X
  - `post-prompt-to-x.js`: CLI script for posting a prompt to X
  - `get-twitter-token.js`: Script to generate X/Twitter OAuth tokens

## License

MIT