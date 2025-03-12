const fs = require('fs-extra');
const path = require('path');
const marked = require('marked');
const crypto = require('crypto');
const { Feed } = require('feed');
require('dotenv').config();

const PROMPTS_DIR = path.join(__dirname, '../prompts');
const SRC_DIR = path.join(__dirname, '../src');
const DIST_DIR = path.join(__dirname, '../dist');

// Note: X posting is now done separately after deployment

// Function to calculate file hash for fingerprinting
function calculateHash(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  return crypto
    .createHash('md5')
    .update(fileBuffer)
    .digest('hex')
    .substring(0, 8); // Use first 8 characters of hash
}

// Function to generate socialDescription for existing metadata
async function generateSocialDescription(prompt, completion, title) {
  // Check if running in GitHub Actions or manually enabled
  if (!process.env.GITHUB_ACTIONS && !process.env.ENABLE_LOCAL_API_TASKS) {
    console.log('Not running in GitHub Actions and ENABLE_LOCAL_API_TASKS not set. Skipping social description generation.');
    return null;
  }
  
  try {
    console.log(`Generating social description for "${title}"...`);
    
    const openai = new (require('openai')).OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert at creating engaging social media descriptions for articles.
Your task is to formulate a compelling question that the article answers.

Guidelines:
- Frame the description as a direct question about the article's core topic
- Be concise and intriguing (max 150 characters)
- Capture the essence of the article without giving everything away
- Avoid introductory phrases like "Discover why" or "Understand how"
- Use natural, conversational language that creates curiosity
- Do not use hashtags, emojis, or calls to action

Simply return the question with no additional commentary or explanation.`
        },
        {
          role: "user", 
          content: `Create a social media description for an article with:

Title: "${title}"
Prompt: "${prompt.substring(0, 300)}${prompt.length > 300 ? '...' : ''}"
Content (excerpt): "${completion.substring(0, 500)}${completion.length > 500 ? '...' : ''}"`
        }
      ],
      max_tokens: 200
    });
    
    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error generating social description:', error);
    return null;
  }
}

async function buildArticlePage(articleDir, slug, cssPath, jsPath, isProduction = false) {
  const completionPath = path.join(articleDir, 'completion.md');
  
  // Check if completion.md exists, if not, skip this directory
  if (!await fs.pathExists(completionPath)) {
    console.log(`Skipping ${slug}: No completion.md file found`);
    return null;
  }
  
  const mdContent = await fs.readFile(completionPath, 'utf8');
  // Escape the markdown content for safe embedding in HTML
  const escapedMdContent = mdContent
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
    
  const metadataPath = path.join(articleDir, 'metadata.json');
  const metadata = await fs.readJson(metadataPath);
  
  // Generate social description if it doesn't exist and we have an API key
  if (!metadata.socialDescription && process.env.OPENAI_API_KEY) {
    console.log(`No social description found for ${slug}, generating one...`);
    const socialDescription = await generateSocialDescription(
      metadata.prompt,
      mdContent,
      metadata.title
    );
    
    if (socialDescription) {
      metadata.socialDescription = socialDescription;
      console.log(`Added social description for ${slug}: ${socialDescription}`);
      await fs.writeJson(metadataPath, metadata, { spaces: 2 });
    }
  }
  
  const htmlContent = marked.parse(mdContent);
  
  // Create prompt directory
  await fs.ensureDir(path.join(DIST_DIR, 'prompts', slug));
  
  // Check if illustration exists and copy it to the dist directory
  let illustrationHtml = '';
  let hasIllustration = false;
  let illustrationPath = null;
  
  if (metadata.illustration === true && metadata.illustrationPath) {
    const illustrationSourcePath = path.join(articleDir, metadata.illustrationPath);
    if (await fs.pathExists(illustrationSourcePath)) {
      // Create images directory for this prompt
      await fs.ensureDir(path.join(DIST_DIR, 'prompts', slug, 'images'));
      
      // Copy the illustration
      const illustrationDestPath = path.join(DIST_DIR, 'prompts', slug, 'images', metadata.illustrationPath);
      await fs.copy(illustrationSourcePath, illustrationDestPath);
      
      // Store illustration path for index page
      illustrationPath = metadata.illustrationPath;
      hasIllustration = true;
      
      // Add the illustration HTML with loading attribute
      illustrationHtml = `
      <div class="illustration-container">
        <img src="images/${metadata.illustrationPath}" alt="New Yorker-style illustration for ${metadata.title}" class="prompt-illustration" loading="lazy">
      </div>`;
    }
  }
  
  // Create article HTML file
  await fs.writeFile(
    path.join(DIST_DIR, 'prompts', slug, 'index.html'),
    `<!DOCTYPE html>
    <html lang="en">
    <head>
      ${isProduction ? `<!-- Umami Analytics -->
      <script defer src="https://cloud.umami.is/script.js" data-website-id="e9b4bbf5-260a-4975-828c-fa3a9b9f34fa"></script>` : '<!-- Analytics disabled in development -->'}
      
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${metadata.title}</title>
      <meta name="description" content="${metadata.prompt.substring(0, 150)}${metadata.prompt.length > 150 ? '...' : ''}">
      <link rel="icon" href="../../images/favicon.png" type="image/png">
      
      <!-- Open Graph / Facebook -->
      <meta property="og:type" content="article">
      <meta property="og:url" content="https://www.hellaprompter.com/prompts/${slug}/">
      <meta property="og:title" content="${metadata.title}">
      <meta property="og:description" content="${metadata.socialDescription || metadata.prompt.substring(0, 150)}${!metadata.socialDescription && metadata.prompt.length > 150 ? '...' : ''}">
      ${hasIllustration ? `<meta property="og:image" content="https://www.hellaprompter.com/prompts/${slug}/images/${illustrationPath}">` : ''}
      <meta property="article:published_time" content="${metadata.date}">
      
      <!-- Twitter -->
      <meta name="twitter:card" content="summary_large_image">
      <meta name="twitter:url" content="https://www.hellaprompter.com/prompts/${slug}/">
      <meta name="twitter:title" content="${metadata.title}">
      <meta name="twitter:description" content="${metadata.socialDescription || metadata.prompt.substring(0, 150)}${!metadata.socialDescription && metadata.prompt.length > 150 ? '...' : ''}">
      ${hasIllustration ? `<meta name="twitter:image" content="https://www.hellaprompter.com/prompts/${slug}/images/${illustrationPath}">` : ''}
      <meta name="twitter:creator" content="@barelyknown">
      
      <link rel="stylesheet" href="../../${cssPath}">
    </head>
    <body>
      <header>
        <h1 class="site-title"><a href="../../index.html">hellaprompter</a></h1>
        <p class="site-tagline">questions > answers</p>
        <p class="author-link"><a href="https://x.com/barelyknown" target="_blank">@barelyknown</a></p>
      </header>
      <main>
        <article>
          <div class="prompt-container">
            <div class="prompt-header">
              <span class="prompt-label">Prompt</span>
              <span class="prompt-service">${metadata.service}</span>
              <button id="copy-markdown-button" class="copy-button" data-markdown="${escapedMdContent}" title="Copy Markdown">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              </button>
            </div>
            <div class="prompt-content">
              ${marked.parse(metadata.prompt)}
            </div>
            <div class="prompt-footer">
              <div class="article-info">
                <span class="article-title-small">${metadata.title}</span>
                <span class="article-date">${metadata.date}</span>
              </div>
            </div>
          </div>
          
          ${illustrationHtml}
          
          <div class="article-content">
            ${htmlContent}
          </div>
        </article>
      </main>
      <script src="../../${jsPath}"></script>
    </body>
    </html>`
  );
  
  return {
    slug,
    title: metadata.title,
    date: metadata.date,
    service: metadata.service,
    hasIllustration,
    illustrationPath
  };
}

// Function to generate RSS feed
async function generateRssFeed(articles) {
  console.log('Generating RSS feed...');
  
  const feed = new Feed({
    title: "hellaprompter",
    description: "A collection of articles generated from AI prompts. Questions > answers.",
    id: "https://www.hellaprompter.com/",
    link: "https://www.hellaprompter.com/",
    language: "en",
    favicon: "https://www.hellaprompter.com/images/favicon.png",
    copyright: `© ${new Date().getFullYear()} hellaprompter`,
    updated: articles.length > 0 ? new Date(articles[0].date) : new Date(),
    feedLinks: {
      rss: "https://www.hellaprompter.com/rss.xml"
    },
    author: {
      name: "@barelyknown",
      link: "https://x.com/barelyknown"
    }
  });

  // Add entries to feed
  for (const article of articles) {
    // Get the article content
    const articleDir = path.join(PROMPTS_DIR, article.slug);
    const completionPath = path.join(articleDir, 'completion.md');
    const mdContent = await fs.readFile(completionPath, 'utf8');
    const htmlContent = marked.parse(mdContent);
    
    // Get metadata for more details
    const metadataPath = path.join(articleDir, 'metadata.json');
    const metadata = await fs.readJson(metadataPath);
    
    feed.addItem({
      title: article.title,
      id: `https://www.hellaprompter.com/prompts/${article.slug}/`,
      link: `https://www.hellaprompter.com/prompts/${article.slug}/`,
      description: metadata.prompt.substring(0, 280),
      content: htmlContent,
      author: [
        {
          name: "@barelyknown",
          link: "https://x.com/barelyknown"
        }
      ],
      date: new Date(article.date)
    });
  }

  // Write the RSS feed to file
  await fs.writeFile(path.join(DIST_DIR, 'rss.xml'), feed.rss2());
  console.log('RSS feed generated successfully!');
}

// Function to generate sitemap.xml
async function generateSitemap(articles) {
  console.log('Generating sitemap.xml...');
  
  const today = new Date().toISOString().split('T')[0];
  
  let sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://www.hellaprompter.com/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`;

  // Add entries for each article
  for (const article of articles) {
    const articleDate = new Date(article.date).toISOString().split('T')[0];
    sitemapContent += `
  <url>
    <loc>https://www.hellaprompter.com/prompts/${article.slug}/</loc>
    <lastmod>${articleDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`;
  }

  sitemapContent += `
</urlset>`;

  // Write the sitemap to file
  await fs.writeFile(path.join(DIST_DIR, 'sitemap.xml'), sitemapContent);
  console.log('Sitemap generated successfully!');
}

async function build() {
  console.log('Building site...');
  
  // Determine if we're in production or development environment
  const isProduction = process.env.GITHUB_ACTIONS === 'true' || process.env.NODE_ENV === 'production';
  console.log(`Building in ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'} mode (analytics ${isProduction ? 'ENABLED' : 'DISABLED'})`);
  
  // Clean dist directory
  await fs.emptyDir(DIST_DIR);
  
  // Create asset directories
  await fs.ensureDir(path.join(DIST_DIR, 'css'));
  await fs.ensureDir(path.join(DIST_DIR, 'js'));
  
  // Copy and fingerprint CSS
  const cssSourcePath = path.join(SRC_DIR, 'css', 'style.css');
  const cssHash = calculateHash(cssSourcePath);
  const cssDestFilename = `style.${cssHash}.css`;
  await fs.copy(cssSourcePath, path.join(DIST_DIR, 'css', cssDestFilename));
  
  // Copy and fingerprint JS
  const jsSourcePath = path.join(SRC_DIR, 'js', 'main.js');
  const jsHash = calculateHash(jsSourcePath);
  const jsDestFilename = `main.${jsHash}.js`;
  await fs.copy(jsSourcePath, path.join(DIST_DIR, 'js', jsDestFilename));
  
  // Copy images (no need to fingerprint)
  await fs.copy(path.join(SRC_DIR, 'images'), path.join(DIST_DIR, 'images'));
  
  // Copy CNAME file
  await fs.copy(path.join(__dirname, '../CNAME'), path.join(DIST_DIR, 'CNAME'));
  
  // Copy robots.txt file
  await fs.copy(path.join(__dirname, '../robots.txt'), path.join(DIST_DIR, 'robots.txt'));
  
  // Store asset paths for use in templates
  const cssPath = `css/${cssDestFilename}`;
  const jsPath = `js/${jsDestFilename}`;
  
  // Get all prompt directories
  const promptDirs = await fs.readdir(PROMPTS_DIR);
  
  // Build article pages
  const articles = [];
  for (const dir of promptDirs) {
    try {
      const articleDir = path.join(PROMPTS_DIR, dir);
      const stats = await fs.stat(articleDir);
      
      if (stats.isDirectory()) {
        const article = await buildArticlePage(articleDir, dir, cssPath, jsPath, isProduction);
        // Only add the article if it's not null (has a completion.md file)
        if (article) {
          // Check if there are pull quotes in metadata
          const metadataPath = path.join(articleDir, 'metadata.json');
          if (await fs.pathExists(metadataPath)) {
            const metadata = await fs.readJson(metadataPath);
            if (metadata.pullQuotes && metadata.pullQuotes.length > 0) {
              // Add a random pull quote to the article object
              const randomIndex = Math.floor(Math.random() * metadata.pullQuotes.length);
              article.pullQuote = metadata.pullQuotes[randomIndex];
            }
          }
          
          articles.push(article);
          // Note: X posting is now done separately after deployment in post-all-to-x.js
        }
      }
    } catch (err) {
      console.error(`Error processing ${dir}:`, err);
    }
  }
  
  // Sort articles by date (newest first)
  articles.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  // Create articles list HTML
  const articlesListHtml = articles.length > 0
    ? articles.map(article => {
        const hasImage = article.hasIllustration && article.illustrationPath;
        const imageHtml = hasImage ? `
          <div class="article-image-container">
            <img data-src="prompts/${article.slug}/images/${article.illustrationPath}" 
                 alt="${article.title}" 
                 class="article-image">
          </div>` : '';
        
        // Add pull quote if available - clean up quotes and ellipses
        const cleanQuote = article.pullQuote 
          ? article.pullQuote
              .replace(/^[""]|[""]$/g, '') // Remove opening/closing quotes
              .replace(/\.\.\.$/g, '') // Remove trailing ellipses if present
              .trim()
          : '';
          
        // Always include the pull-quote div for consistent layout, but only fill it if we have a quote
        const pullQuoteHtml = `
          <div class="article-pull-quote">
            ${cleanQuote ? `<blockquote>${cleanQuote}</blockquote>` : ''}
          </div>`;
        
        return `
        <div class="article-item ${hasImage ? 'article-item-with-image' : ''}">
          <a href="prompts/${article.slug}/index.html" class="article-link">${article.title}</a>
          ${imageHtml}
          <div class="article-content">
            <h2 class="article-title">
              <a href="prompts/${article.slug}/index.html">${article.title}</a>
            </h2>
            ${pullQuoteHtml}
            <div class="article-meta">
              <span class="article-date">${article.date}</span>
            </div>
          </div>
        </div>
      `;
      }).join('')
    : '<p>No articles yet. Add some to the prompts directory.</p>';
  
  // Create index file
  await fs.writeFile(
    path.join(DIST_DIR, 'index.html'),
    `<!DOCTYPE html>
    <html lang="en">
    <head>
      ${isProduction ? `<!-- Umami Analytics -->
      <script defer src="https://cloud.umami.is/script.js" data-website-id="e9b4bbf5-260a-4975-828c-fa3a9b9f34fa"></script>` : '<!-- Analytics disabled in development -->'}
      
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>hellaprompter</title>
      <meta name="description" content="A collection of articles generated from AI prompts. Questions > answers.">
      <link rel="icon" href="images/favicon.png" type="image/png">
      <link rel="alternate" type="application/rss+xml" title="hellaprompter RSS Feed" href="/rss.xml">
      
      <!-- Open Graph / Facebook -->
      <meta property="og:type" content="website">
      <meta property="og:url" content="https://www.hellaprompter.com/">
      <meta property="og:title" content="hellaprompter">
      <meta property="og:description" content="A collection of articles generated from AI prompts. Questions > answers.">
      
      <!-- Twitter -->
      <meta name="twitter:card" content="summary_large_image">
      <meta name="twitter:url" content="https://www.hellaprompter.com/">
      <meta name="twitter:title" content="hellaprompter">
      <meta name="twitter:description" content="A collection of articles generated from AI prompts. Questions > answers.">
      <meta name="twitter:creator" content="@barelyknown">
      
      <link rel="stylesheet" href="${cssPath}">
    </head>
    <body>
      <header>
        <h1 class="site-title">hellaprompter</h1>
        <p class="site-tagline">questions > answers</p>
        <p class="author-link"><a href="https://x.com/barelyknown" target="_blank">@barelyknown</a></p>
      </header>
      <main>
        <section class="how-it-works">
          <h2>What is This?</h2>
          <p>This site is a collection of articles generated from prompts. Every article begins with a question that explores an idea or concept that is of interest to me. An AI responds with a detailed answer, which is presented alongside an automatically generated and selected illustration. Even the pull quotes are automatically selected.</p>
          <p>What makes this site special is that the <em>questions</em> are the focus, not just the answers. The prompts cover a variety of topics ranging from philosophy and technology to sports and design.</p>
          <p><small>This entire site was designed and implemented using <a href="https://docs.anthropic.com/en/docs/agents-and-tools/claude-code/overview">Claude Code</a>—Anthropic's AI coding assistant—and is <a href="https://github.com/barelyknown/hellaprompter">available, built and deployed on GitHub</a>.</small></p>
        </section>
        <div id="search-container">
          <input type="text" id="search-input" placeholder="search">
        </div>
        <div id="articles-list">
          ${articlesListHtml}
        </div>
      </main>
      <script src="${jsPath}"></script>
    </body>
    </html>`
  );
  
  // We're no longer creating the about page since the intro is on the main page

  // Generate RSS feed
  await generateRssFeed(articles);
  
  // Generate sitemap
  await generateSitemap(articles);

  console.log('Site built successfully!');
}

build().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});