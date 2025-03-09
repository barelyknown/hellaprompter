document.addEventListener('DOMContentLoaded', () => {
  console.log('Hellaprompter initialized');
  
  // Setup search functionality
  const searchInput = document.getElementById('search-input');
  const articlesList = document.getElementById('articles-list');
  
  if (searchInput && articlesList) {
    const articleItems = Array.from(articlesList.querySelectorAll('.article-item'));
    
    // Handle image loading and errors
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
          image.parentElement.remove();
        });
      }
    });
    
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