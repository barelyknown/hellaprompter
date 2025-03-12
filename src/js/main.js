document.addEventListener('DOMContentLoaded', () => {
  // Setup copy markdown functionality
  const copyMarkdownButton = document.getElementById('copy-markdown-button');
  
  if (copyMarkdownButton) {
    copyMarkdownButton.addEventListener('click', async () => {
      try {
        // Get the markdown content directly from the data attribute
        const markdownContent = copyMarkdownButton.getAttribute('data-markdown');
        
        if (!markdownContent) {
          throw new Error('Markdown content not found');
        }
        
        // Copy to clipboard
        await navigator.clipboard.writeText(markdownContent);
        
        // Visual feedback
        const originalContent = copyMarkdownButton.innerHTML;
        copyMarkdownButton.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 6L9 17l-5-5"></path>
          </svg>
        `;
        copyMarkdownButton.classList.add('copied');
        
        // Reset button after 2 seconds
        setTimeout(() => {
          copyMarkdownButton.innerHTML = originalContent;
          copyMarkdownButton.classList.remove('copied');
        }, 2000);
      } catch (error) {
        console.error('Failed to copy markdown:', error);
        const originalContent = copyMarkdownButton.innerHTML;
        copyMarkdownButton.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        `;
        copyMarkdownButton.classList.add('copied');
        
        // Reset button after 2 seconds
        setTimeout(() => {
          copyMarkdownButton.innerHTML = originalContent;
          copyMarkdownButton.classList.remove('copied');
        }, 2000);
      }
    });
  }
  
  // Setup search functionality
  const searchInput = document.getElementById('search-input');
  const articlesList = document.getElementById('articles-list');
  
  if (searchInput && articlesList) {
    const articleItems = Array.from(articlesList.querySelectorAll('.article-item'));
    
    // Lazy load images using Intersection Observer
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const image = entry.target;
            const dataSrc = image.getAttribute('data-src');
            
            if (dataSrc) {
              image.src = dataSrc;
              image.removeAttribute('data-src');
              
              // Add loading animation and stop shimmer
              image.addEventListener('load', () => {
                image.classList.add('loaded');
                // Find the parent container and remove the shimmer effect
                const container = image.closest('.article-image-container');
                if (container) {
                  container.classList.add('image-loaded');
                }
              });
              
              // Handle broken images
              image.addEventListener('error', () => {
                const articleItem = image.closest('.article-item');
                if (articleItem) {
                  articleItem.classList.remove('article-item-with-image');
                  image.parentElement.remove();
                }
              });
              
              // Stop observing after loading
              observer.unobserve(image);
            }
          }
        });
      }, {
        rootMargin: '200px 0px', // Start loading when image is 200px from viewport
        threshold: 0.01
      });
      
      // Find all article images and observe them
      articleItems.forEach(item => {
        const image = item.querySelector('.article-image');
        if (image) {
          // Convert src to data-src for lazy loading
          if (image.src) {
            image.setAttribute('data-src', image.src);
            image.removeAttribute('src');
            // Add a placeholder or low-res image if needed
            // image.src = 'placeholder.jpg';
          }
          imageObserver.observe(image);
        }
      });
    } else {
      // Fallback for browsers without Intersection Observer
      articleItems.forEach(item => {
        const image = item.querySelector('.article-image');
        if (image) {
          // Add loading animation if needed
          image.addEventListener('load', () => {
            image.classList.add('loaded');
          });
          
          // Handle broken images
          image.addEventListener('error', () => {
            item.classList.remove('article-item-with-image');
            const container = image.closest('.article-image-container');
            if (container) {
              container.classList.add('image-loaded'); // Stop shimmer on error too
              container.remove();
            }
          });
        }
      });
    }
    
    searchInput.addEventListener('input', () => {
      const searchTerm = searchInput.value.toLowerCase().trim();
      
      if (searchTerm === '') {
        // If search is empty, show all articles
        articleItems.forEach(item => {
          item.style.display = '';
        });
      } else {
        // Filter articles based on search term
        articleItems.forEach(item => {
          const title = item.querySelector('.article-title').textContent.toLowerCase();
          if (title.includes(searchTerm)) {
            item.style.display = '';
          } else {
            item.style.display = 'none';
          }
        });
      }
    });
  }
});