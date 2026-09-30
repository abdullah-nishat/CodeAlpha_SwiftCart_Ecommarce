function showAdminError(e) {
  adminMsg.className = 'notice error show';
  adminMsg.textContent = e.message || 'Access restricted. Redirecting to login...';

  const msg = (e.message || '').toLowerCase();
  if (msg.includes('login') || msg.includes('admin')) {
    setTimeout(() => {
      location.href = '/login.html';
    }, 1500);
  }
}

function toggleForm() {
  productFormBox.style.display =
    productFormBox.style.display === 'none'
      ? 'block'
      : 'none';
}

async function loadStats() {
  const s = await api('/admin/stats');

  stats.innerHTML = `
    <div class="stat">
      <span class="muted">Orders</span>
      <strong>${s.totalOrders}</strong>
    </div>

    <div class="stat">
      <span class="muted">Customers</span>
      <strong>${s.customers}</strong>
    </div>

    <div class="stat">
      <span class="muted">Products</span>
      <strong>${s.products}</strong>
    </div>

    <div class="stat">
      <span class="muted">Delivered Revenue</span>
      <strong>${money(s.revenue)}</strong>
    </div>
  `;
}

async function loadCategories() {
  const d = await api('/categories');

  categoryId.innerHTML = d
    .map(
      c => `
        <option value="${c.id}">
          ${c.name}
        </option>
      `
    )
    .join('');
}

async function loadProducts() {
  const d = await api('/admin/products');

  products.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Product</th>
            <th>Category</th>
            <th>Price</th>
            <th>Stock</th>
            <th></th>
          </tr>
        </thead>

        <tbody>
          ${d
            .map(
              p => `
                <tr>
                  <td>
                    <img class="thumb" src="${p.imageUrl}">
                    ${p.name}
                  </td>

                  <td>${p.categoryName}</td>
                  <td>${money(p.price)}</td>
                  <td>${p.stock}</td>

                  <td>
                    <button
                      class="btn danger"
                      onclick="deleteProduct(${p.id})"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              `
            )
            .join('')}
        </tbody>
      </table>
    </div>
  `;
}

async function deleteProduct(id) {
  if (!confirm('Delete this product?')) return;

  try {
    await api('/admin/products/' + id, {
      method: 'DELETE'
    });

    loadProducts();
    loadStats();
  } catch (e) {
    alert(e.message);
  }
}

async function loadOrders() {
  const d = await api('/admin/orders');

  orders.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Order</th>
            <th>Customer</th>
            <th>Total</th>
            <th>Status</th>
            <th>Change</th>
          </tr>
        </thead>

        <tbody>
          ${d
            .map(
              o => `
                <tr>
                  <td>${o.orderNumber}</td>
                  <td>${o.userName}</td>
                  <td>${money(o.total)}</td>
                  <td>${o.status}</td>

                  <td>
                    <select
                      onchange="updateStatus(${o.id},this.value)"
                    >
                      <option>${o.status}</option>

                      ${[
                        'CONFIRMED',
                        'PROCESSING',
                        'SHIPPED',
                        'DELIVERED',
                        'CANCELLED'
                      ]
                        .filter(x => x !== o.status)
                        .map(
                          x => `
                            <option>${x}</option>
                          `
                        )
                        .join('')}
                    </select>
                  </td>
                </tr>
              `
            )
            .join('')}
        </tbody>
      </table>
    </div>
  `;
}

async function updateStatus(id, status) {
  try {
    await api('/admin/orders/' + id + '/status', {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });

    loadOrders();
    loadStats();
  } catch (e) {
    alert(e.message);
    loadOrders();
  }
}

productForm.addEventListener('submit', async e => {
  e.preventDefault();

  const fd = new FormData();

  for (const k of [
    'name',
    'shortDescription',
    'description',
    'price',
    'discountPercent',
    'stock',
    'categoryId'
  ]) {
    fd.append(
      k,
      document.getElementById(k).value
    );
  }

  fd.append(
    'featured',
    featured.checked ? 'true' : 'false'
  );

  if (image.files[0]) {
    fd.append(
      'image',
      image.files[0]
    );
  }

  try {
    await api('/admin/products', {
      method: 'POST',
      body: fd
    });

    productForm.reset();
    productFormBox.style.display = 'none';

    loadProducts();
    loadStats();
  } catch (err) {
    alert(err.message);
  }
});

document.addEventListener(
  'DOMContentLoaded',
  async () => {
    try {
      await Promise.all([
        loadStats(),
        loadCategories(),
        loadProducts(),
        loadOrders()
      ]);
    } catch (e) {
      showAdminError(e);
    }
  }
);