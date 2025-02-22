const fs = require('fs').promises;
const path = require('path');
const marked = require('marked');
const React = require('react');
const ReactDOMServer = require('react-dom/server');
const postcss = require('postcss');
const tailwindcss = require('@tailwindcss/postcss');
const { Homepage, PromptPage } = require('./src/components');

async function generateCss(buildDir) {
    const css = await fs.readFile(path.join(__dirname, 'src', 'styles.css'), 'utf-8');
    const result = await postcss([tailwindcss]).process(css, {
      from: path.join(__dirname, 'src', 'styles.css'),
      to: path.join(buildDir, 'styles.css'),
    });
    await fs.writeFile(path.join(buildDir, 'styles.css'), result.css);
}

async function build() {
  const promptsDir = path.join(__dirname, 'prompts');
  const buildDir = path.join(__dirname, 'build');

  // Clean the build directory
  await fs.rm(buildDir, { recursive: true, force: true });
  await fs.mkdir(buildDir, { recursive: true });

  // Read all prompt directories
  const slugs = await fs.readdir(promptsDir);
  const prompts = [];

  for (const slug of slugs) {
    const metadataPath = path.join(promptsDir, slug, 'metadata.json');
    const contentPath = path.join(promptsDir, slug, 'content.md');

    const metadataRaw = await fs.readFile(metadataPath, 'utf-8');
    const metadata = JSON.parse(metadataRaw);
    const dateObj = new Date(metadata.date);
    if (isNaN(dateObj.getTime())) {
      console.error(`Invalid date for prompt ${slug}: ${metadata.date}`);
      continue;
    }
    const formattedDate = dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const contentRaw = await fs.readFile(contentPath, 'utf-8');
    const contentHtml = marked.parse(contentRaw);

    prompts.push({ slug, title: metadata.title, date: metadata.date, formattedDate });

    // Render and write prompt page
    const promptHtml = ReactDOMServer.renderToStaticMarkup(
      React.createElement(PromptPage, {
        title: metadata.title,
        date: formattedDate,
        content: contentHtml,
      })
    );
    const promptDir = path.join(buildDir, 'prompts', slug);
    await fs.mkdir(promptDir, { recursive: true });
    await fs.writeFile(path.join(promptDir, 'index.html'), '<!DOCTYPE html>' + promptHtml);
  }

  // Sort prompts by date in reverse chronological order
  prompts.sort((a, b) => b.date.localeCompare(a.date));

  // Render and write homepage
  const homepageHtml = ReactDOMServer.renderToStaticMarkup(
    React.createElement(Homepage, {
      prompts: prompts.map(p => ({ slug: p.slug, title: p.title, date: p.formattedDate }))
    })
  );
  await fs.writeFile(path.join(buildDir, 'index.html'), '<!DOCTYPE html>' + homepageHtml);

  // Generate CSS
  await generateCss(buildDir);
}

build().catch(console.error);