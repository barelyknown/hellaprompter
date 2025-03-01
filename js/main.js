document.addEventListener('DOMContentLoaded', () => {
  console.log('Hellaprompter initialized');
  
  // Setup search functionality
  const searchInput = document.getElementById('search-input');
  const articlesList = document.getElementById('articles-list');
  
  if (searchInput && articlesList) {
    const articleItems = Array.from(articlesList.querySelectorAll('.article-item'));
    
    searchInput.addEventListener('input', () => {
      const searchTerm = searchInput.value.toLowerCase().trim();
      
      if (searchTerm === '') {
        // If search is empty, show all articles
        articleItems.forEach(item => {
          item.style.display = 'block';
        });
      } else {
        // Filter articles based on search term
        articleItems.forEach(item => {
          const title = item.querySelector('.article-title').textContent.toLowerCase();
          if (title.includes(searchTerm)) {
            item.style.display = 'block';
          } else {
            item.style.display = 'none';
          }
        });
      }
    });
  }
});