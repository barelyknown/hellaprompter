const fs = require('fs-extra');
const path = require('path');
const marked = require('marked');
const crypto = require('crypto');

const PROMPTS_DIR = path.join(__dirname, '../prompts');
const SRC_DIR = path.join(__dirname, '../src');
const DIST_DIR = path.join(__dirname, '../dist');

// Function to calculate file hash for fingerprinting
function calculateHash(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  return crypto
    .createHash('md5')
    .update(fileBuffer)
    .digest('hex')
    .substring(0, 8); // Use first 8 characters of hash
}

async function buildArticlePage(articleDir, slug) {
  const completionPath = path.join(articleDir, 'completion.md');
  
  // Check if completion.md exists, if not, skip this directory
  if (!await fs.pathExists(completionPath)) {
    console.log(`Skipping ${slug}: No completion.md file found`);
    return null;
  }
  
  const mdContent = await fs.readFile(completionPath, 'utf8');
  const metadata = await fs.readJson(path.join(articleDir, 'metadata.json'));
  
  const htmlContent = marked.parse(mdContent);
  
  // Create prompt directory
  await fs.ensureDir(path.join(DIST_DIR, 'prompts', slug));
  
  // Create article HTML file
  await fs.writeFile(
    path.join(DIST_DIR, 'prompts', slug, 'index.html'),
    `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>hellaprompter > ${metadata.title}</title>
      <meta name="description" content="${metadata.prompt.substring(0, 150)}${metadata.prompt.length > 150 ? '...' : ''}">
      <link rel="icon" href="../../images/favicon.ico" type="image/x-icon">
      
      <!-- Open Graph / Facebook -->
      <meta property="og:type" content="article">
      <meta property="og:url" content="https://www.hellaprompter.com/prompts/${slug}/">
      <meta property="og:title" content="hellaprompter > ${metadata.title}">
      <meta property="og:description" content="${metadata.prompt.substring(0, 150)}${metadata.prompt.length > 150 ? '...' : ''}">
      <meta property="article:published_time" content="${metadata.date}">
      
      <!-- Twitter -->
      <meta name="twitter:card" content="summary_large_image">
      <meta name="twitter:url" content="https://www.hellaprompter.com/prompts/${slug}/">
      <meta name="twitter:title" content="hellaprompter > ${metadata.title}">
      <meta name="twitter:description" content="${metadata.prompt.substring(0, 150)}${metadata.prompt.length > 150 ? '...' : ''}">
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
    service: metadata.service
  };
}

async function build() {
  console.log('Building site...');
  
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
        const article = await buildArticlePage(articleDir, dir);
        // Only add the article if it's not null (has a completion.md file)
        if (article) {
          articles.push(article);
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
    ? articles.map(article => `
      <div class="article-item">
        <h2 class="article-title">
          <a href="prompts/${article.slug}/index.html">${article.title}</a>
        </h2>
        <div class="article-meta">
          <span class="article-date">${article.date}</span>
        </div>
      </div>
    `).join('')
    : '<p>No articles yet. Add some to the prompts directory.</p>';
  
  // Create index file
  await fs.writeFile(
    path.join(DIST_DIR, 'index.html'),
    `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>hellaprompter</title>
      <meta name="description" content="A collection of articles generated from AI prompts. Questions > answers.">
      <link rel="icon" href="images/favicon.ico" type="image/x-icon">
      
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

  console.log('Site built successfully!');
}

build().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});