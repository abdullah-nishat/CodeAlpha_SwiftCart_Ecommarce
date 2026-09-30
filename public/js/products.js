let currentPage = 1;
let searchDebounceTimer = null;

async function loadCategories() {
  try {
    const cats = await api('/categories');
    const categoryEl = document.getElementById('category');
    const urlParams = new URLSearchParams(window.location.search);
    const initialCategory = urlParams.get('category') || '';

    categoryEl.innerHTML =
      '<option value="">All categories</option>' +
      cats
        .map(
          c => `
            <option value="${c.slug}" ${c.slug === initialCategory ? 'selected' : ''}>
              ${c.name}
            </option>
          `
        )
        .join('');
  } catch (err) {
    console.error('Failed to load categories:', err);
  }
}

async function loadProducts(page = 1) {
  currentPage = page;

  const q = new URLSearchParams();
  q.set('page', page);

  const searchVal = document.getElementById('search')?.value.trim();
  const categoryVal = document.getElementById('category')?.value;
  const minPriceVal = document.getElementById('minPrice')?.value;
  const maxPriceVal = document.getElementById('maxPrice')?.value;
  const sortVal = document.getElementById('sort')?.value;

  if (searchVal) q.set('search', searchVal);
  if (categoryVal) q.set('category', categoryVal);
  if (minPriceVal) q.set('minPrice', minPriceVal);
  if (maxPriceVal) q.set('maxPrice', maxPriceVal);
  if (sortVal) q.set('sort', sortVal);

  // Sync current query state to browser URL without full reload
  const newUrl = `${window.location.pathname}?${q.toString()}`;
  window.history.replaceState({}, '', newUrl);

  const productsContainer = document.getElementById('products');
  const countBadge = document.getElementById('productCount');
  
  if (productsContainer) {
    productsContainer.style.opacity = '0.5';
    productsContainer.style.transition = 'opacity 0.2s ease';
  }

  try {
    const data = await api('/products?' + q.toString());
    
    if (productsContainer) {
      productsContainer.style.opacity = '1';
    }

    if (countBadge) {
      countBadge.textContent = `${data.total} product${data.total === 1 ? '' : 's'} found`;
    }

    if (data.items.length) {
      productsContainer.innerHTML = data.items.map(productCard).join('');
    } else {
      productsContainer.innerHTML = `
        <div class="empty" style="grid-column: 1 / -1; padding: 48px 20px; text-align: center;">
          <div style="margin-bottom: 14px; color: var(--text-muted); display: flex; justify-content: center;">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>
          <h3 style="margin: 0 0 8px; color: var(--dark);">No matching products found</h3>
          <p class="muted" style="margin: 0 0 18px;">Try clearing filters or adjusting your search keywords.</p>
          <button class="btn secondary" onclick="resetFilters()">Reset All Filters</button>
        </div>
      `;
    }

    // Render Pagination
    const paginationEl = document.getElementById('pagination');
    if (paginationEl) {
      if (data.pages > 1) {
        paginationEl.innerHTML = Array.from(
          { length: data.pages },
          (_, i) => `
            <button
              class="btn ${i + 1 === data.page ? '' : 'secondary'}"
              onclick="loadProducts(${i + 1})"
            >
              ${i + 1}
            </button>
          `
        ).join('');
      } else {
        paginationEl.innerHTML = '';
      }
    }
  } catch (error) {
    if (productsContainer) {
      productsContainer.style.opacity = '1';
      productsContainer.innerHTML = `
        <div class="empty" style="grid-column: 1 / -1;">
          Could not load products. Please check connection.
        </div>
      `;
    }
  }
}

function resetFilters() {
  document.getElementById('search').value = '';
  document.getElementById('category').value = '';
  document.getElementById('minPrice').value = '';
  document.getElementById('maxPrice').value = '';
  document.getElementById('sort').value = 'newest';
  loadProducts(1);
}

function syncInputsFromUrl() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('search')) document.getElementById('search').value = params.get('search');
  if (params.get('minPrice')) document.getElementById('minPrice').value = params.get('minPrice');
  if (params.get('maxPrice')) document.getElementById('maxPrice').value = params.get('maxPrice');
  if (params.get('sort')) document.getElementById('sort').value = params.get('sort');
}

document.addEventListener('DOMContentLoaded', async () => {
  syncInputsFromUrl();
  await loadCategories();
  await loadProducts();

  // Instant trigger when SORT dropdown changes
  const sortSelect = document.getElementById('sort');
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      loadProducts(1);
    });
  }

  // Instant trigger when CATEGORY dropdown changes
  const categorySelect = document.getElementById('category');
  if (categorySelect) {
    categorySelect.addEventListener('change', () => {
      loadProducts(1);
    });
  }

  // Instant search input with 300ms debounce
  const searchInput = document.getElementById('search');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => {
        loadProducts(1);
      }, 300);
    });
  }

  // Instant trigger on price inputs
  const minPriceInput = document.getElementById('minPrice');
  const maxPriceInput = document.getElementById('maxPrice');
  [minPriceInput, maxPriceInput].forEach(input => {
    if (input) {
      input.addEventListener('change', () => {
        loadProducts(1);
      });
    }
  });

  // Filter form submit
  const filterForm = document.getElementById('filters');
  if (filterForm) {
    filterForm.addEventListener('submit', (e) => {
      e.preventDefault();
      loadProducts(1);
    });
  }
});