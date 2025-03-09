document.addEventListener('DOMContentLoaded', () => {
  console.log('Hellaprompter initialized');
  
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