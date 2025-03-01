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
2. Add a `metadata.json` file with the prompt, title, date, and service
3. To add content, you have two options:

   **Option 1: Add formatted markdown directly**
   - Create a `completion.md` file formatted according to the [Markdown Guide](MARKDOWN_GUIDE.md)

   **Option 2: Let OpenAI format it for you**
   - Paste the raw completion text into a file named `completion.txt`
   - The GitHub Action will automatically convert it to properly formatted markdown
   - Alternatively, run `npm run format-completions` locally (requires OpenAI API key)

## Deployment

The site is automatically deployed to GitHub Pages when changes are pushed to the main branch.

## Structure

- `prompts/`: Contains directories for each article, with each directory containing:
  - `completion.md`: The article content in Markdown format
  - `metadata.json`: Metadata about the article (prompt, title, date, service)
- `src/`: Source files for the static site:
  - `css/`: Stylesheets
  - `js/`: JavaScript files
  - `images/`: Images and favicon
- `scripts/`: Build scripts
  - `build.js`: Main script for generating the static site

## License

MIT