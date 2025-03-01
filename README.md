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

## Deployment

The site is automatically deployed to GitHub Pages when changes are pushed to the main branch.

## Structure

- `prompts/`: Contains directories for each article, with each directory containing:
  - `article.md`: The article content in Markdown format
  - `metadata.json`: Metadata about the article (prompt, title, date, service)
- `src/`: Source files for the static site:
  - `css/`: Stylesheets
  - `js/`: JavaScript files
  - `images/`: Images and favicon
- `scripts/`: Build scripts
  - `build.js`: Main script for generating the static site

## License

MIT