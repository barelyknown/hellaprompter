# hellaprompter

A static website of articles generated from prompts.

## About

hellaprompter is a personal project that showcases articles generated from AI prompts. The site emphasizes that questions are more valuable than answers, highlighting the prompts that generated each article.

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
2. Add a `metadata.json` file with the prompt, title, date, service, and optional `postToX` flag
3. To add content, you have two options:

   **Option 1: Add formatted markdown directly**
   - Create a `completion.md` file formatted according to the [Markdown Guide](MARKDOWN_GUIDE.md)

   **Option 2: Let OpenAI format it for you**
   - Paste the raw completion text into a file named `completion.txt`
   - The GitHub Action will automatically convert it to properly formatted markdown
   - Alternatively, run `npm run format-completions` locally (requires OpenAI API key)

## Deployment

The site is automatically deployed to GitHub Pages when changes are pushed to the main branch.

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

## Structure

- `prompts/`: Contains directories for each article, with each directory containing:
  - `completion.md`: The article content in Markdown format
  - `metadata.json`: Metadata about the article (prompt, title, date, service, postToX, xPostUrl)
- `src/`: Source files for the static site:
  - `css/`: Stylesheets
  - `js/`: JavaScript files
  - `images/`: Images and favicon
- `scripts/`: Build scripts
  - `build.js`: Main script for generating the static site
  - `post-to-x.js`: Module for posting to X
  - `post-prompt-to-x.js`: CLI script for posting a prompt to X

## License

MIT