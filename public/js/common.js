const API = '/api';

function money(n) {
  return `৳${Number(n || 0).toLocaleString('en-BD', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })}`;
}

async function api(url, options = {}) {
  const res = await fetch(API + url, {
    headers: {
      ...(options.body instanceof FormData
        ? {}
        : { 'Content-Type': 'application/json' }),
      ...(options.headers || {})
    },
    ...options
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || 'Request failed');
  }

  return data;
}

function finalPrice(p) {
  return Number(
    (
      Number(p.price) *
      (1 - Number(p.discountPercent || 0) / 100)
    ).toFixed(2)
  );
}

function productCard(p) {
  const fp = finalPrice(p);
  const rating = p.rating ? Number(p.rating).toFixed(1) : '4.8';
  const reviews = p.reviewCount || 48;

  return `
    <article class="card product-card">
      <div class="card-media">
        <a href="/product.html?slug=${encodeURIComponent(p.slug)}" class="card-img-link">
          <img
            class="product-img"
            src="${p.imageUrl}"
            alt="${p.name}"
            loading="lazy"
          >
        </a>

        <div class="media-badges">
          ${
            p.discountPercent
              ? `<span class="badge-discount">-${p.discountPercent}% OFF</span>`
              : ''
          }
          ${
            p.featured
              ? `<span class="badge-featured">Featured</span>`
              : ''
          }
        </div>

        <button
          class="wishlist-float-btn"
          onclick="addWishlist(${p.id})"
          title="Add to wishlist"
          aria-label="Add to wishlist"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
        </button>
      </div>

      <div class="card-body">
        <div class="card-meta">
          <span class="card-category">${p.categoryName || 'Product'}</span>
          <div class="card-rating">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="var(--color-primary)" stroke="var(--color-primary)" stroke-width="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
            <span>${rating}</span>
            <span class="review-count">(${reviews})</span>
          </div>
        </div>

        <h3 class="card-title">
          <a href="/product.html?slug=${encodeURIComponent(p.slug)}">
            ${p.name}
          </a>
        </h3>

        <p class="card-desc">
          ${p.shortDescription || ''}
        </p>

        <div class="card-price-row">
          <div class="price-wrap">
            <span class="price-current">${money(fp)}</span>
            ${
              p.discountPercent
                ? `<span class="price-old">${money(p.price)}</span>`
                : ''
            }
          </div>

          ${
            p.stock > 0
              ? `<span class="stock-pill in-stock"><span class="dot"></span>In Stock</span>`
              : `<span class="stock-pill" style="color:#dc2626;">Out of Stock</span>`
          }
        </div>

        <div class="card-actions">
          <button
            class="btn btn-add-cart"
            onclick="addToCart(${p.id})"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
            Add to Cart
          </button>
        </div>
      </div>
    </article>
  `;
}

async function addToCart(productId, quantity = 1) {
  try {
    await api('/cart', {
      method: 'POST',
      body: JSON.stringify({
        productId,
        quantity
      })
    });

    alert('Added to cart');

  } catch (e) {
    if (e.message.includes('login')) {
      location.href = '/login.html';
    } else {
      alert(e.message);
    }
  }
}

async function addWishlist(productId) {
  try {
    await api('/wishlist', {
      method: 'POST',
      body: JSON.stringify({
        productId
      })
    });

    alert('Added to wishlist');

  } catch (e) {
    if (e.message.includes('login')) {
      location.href = '/login.html';
    } else {
      alert(e.message);
    }
  }
}

async function mountNav() {
  const box = document.querySelector('[data-nav]');

  if (!box) return;

  const { user } = await api('/auth/me');

  box.innerHTML = `
    <div class="nav">
      <div class="container nav-inner">

        <a class="brand" href="/">
          SwiftCart
        </a>

        <div class="nav-links">

          <a href="/products.html">Products</a>

          <a href="/wishlist.html">Wishlist</a>

          <a href="/cart.html">Cart</a>

          ${
            user
              ? `
                <a href="/orders.html">Orders</a>

                ${
                  user.role === 'ADMIN'
                    ? '<a href="/admin.html" class="nav-admin-badge">Admin Dashboard</a>'
                    : ''
                }

                <span style="font-weight:600;color:var(--primary-deep);">
                  Hi, ${user.fullName}
                </span>

                <button
                  class="link-btn"
                  id="logoutBtn"
                >
                  Logout
                </button>
              `
              : `
                <a href="/login.html">
                  Login
                </a>

                <a
                  class="btn"
                  href="/register.html"
                >
                  Register
                </a>
              `
          }

        </div>

      </div>
    </div>
  `;

  document
    .getElementById('logoutBtn')
    ?.addEventListener('click', async () => {

      await api('/auth/logout', {
        method: 'POST'
      });

      location.href = '/';
    });
}

function mountFooter() {
  const el = document.querySelector('[data-footer]');

  if (!el) return;

  el.innerHTML = `
    <footer class="site-footer">
      <div class="footer-top">
        <div class="container footer-grid">

          <!-- Column 1: About SwiftCart -->
          <div class="footer-col footer-about">
            <a class="footer-brand" href="/">
              SwiftCart
            </a>
            <p class="footer-desc">
              Your premier online shopping destination in Bangladesh. Discover authentic electronics, urban lifestyle, and modern home workspace essentials delivered quickly with reliable Cash on Delivery.
            </p>
            <div class="footer-trust-chips">
              <span class="trust-chip"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;"><polyline points="20 6 9 17 4 12"></polyline></svg>100% Genuine</span>
              <span class="trust-chip"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;"><polyline points="20 6 9 17 4 12"></polyline></svg>Cash on Delivery</span>
              <span class="trust-chip"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;"><polyline points="20 6 9 17 4 12"></polyline></svg>Fast Dispatch</span>
            </div>
            <div class="footer-socials">
              <a href="https://facebook.com" target="_blank" rel="noopener" class="social-icon" aria-label="Facebook">
                <svg width="17" height="17" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener" class="social-icon" aria-label="Instagram">
                <svg width="17" height="17" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener" class="social-icon" aria-label="Twitter">
                <svg width="17" height="17" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
            </div>
          </div>

          <!-- Column 2: Quick Links -->
          <div class="footer-col">
            <h4 class="footer-heading">Shop Categories</h4>
            <ul class="footer-links">
              <li><a href="/products.html">All Products</a></li>
              <li><a href="/products.html?category=electronics">Audio & Electronics</a></li>
              <li><a href="/products.html?category=fashion">Fashion & Apparel</a></li>
              <li><a href="/products.html?category=lifestyle">Lifestyle & Watches</a></li>
              <li><a href="/products.html?category=home-living">Home & Living</a></li>
              <li><a href="/cart.html">My Cart</a></li>
            </ul>
          </div>

          <!-- Column 3: Customer Care & About -->
          <div class="footer-col">
            <h4 class="footer-heading">Customer Care</h4>
            <ul class="footer-links">
              <li><a href="/orders.html">Track My Orders</a></li>
              <li><a href="javascript:void(0)" onclick="openAboutModal()">About SwiftCart</a></li>
              <li><a href="javascript:void(0)" onclick="openContactModal()">Help & Contact Us</a></li>
              <li><a href="javascript:void(0)" onclick="openFaqModal()">Delivery & COD Policy</a></li>
              <li><a href="/wishlist.html">My Saved Wishlist</a></li>
            </ul>
          </div>

          <!-- Column 4: Contact & Office -->
          <div class="footer-col footer-contact">
            <h4 class="footer-heading">Get in Touch</h4>
            <div class="contact-item">
              <span class="contact-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
              </span>
              <div>
                <strong>Office Address</strong>
                <p>Gulshan Avenue, Block SE(F), Dhaka-1212, Bangladesh</p>
              </div>
            </div>
            <div class="contact-item">
              <span class="contact-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
              </span>
              <div>
                <strong>Hotline & Support</strong>
                <p><a href="tel:+8801700000000">+880 1700-000000</a> (9:00 AM – 10:00 PM)</p>
              </div>
            </div>
            <div class="contact-item">
              <span class="contact-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
              </span>
              <div>
                <strong>Customer Support</strong>
                <p><a href="mailto:support@swiftcart.com">support@swiftcart.com</a></p>
              </div>
            </div>
            <div class="contact-item">
              <span class="contact-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"></rect><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
              </span>
              <div>
                <strong>Payment Accepted</strong>
                <p>Cash on Delivery (Pay at Doorstep)</p>
              </div>
            </div>
          </div>

        </div>
      </div>

      <div class="footer-bottom">
        <div class="container footer-bottom-inner">
          <p class="copyright">© 2026 SwiftCart E-Commerce. All rights reserved.</p>
          <div class="payment-methods">
            <span class="pay-badge"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"></rect><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg> Cash on Delivery</span>
            <span class="pay-badge"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg> Nationwide Express</span>
            <span class="pay-badge"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg> 100% Genuine Guaranteed</span>
          </div>
        </div>
      </div>
    </footer>

    <!-- Interactive About Us Modal -->
    <div class="modal-overlay" id="aboutModal" onclick="if(event.target===this)closeModal('aboutModal')">
      <div class="modal-card">
        <button class="modal-close-btn" onclick="closeModal('aboutModal')" aria-label="Close">&times;</button>
        <span class="badge" style="margin-bottom:12px;">About SwiftCart</span>
        <h2 style="margin:0 0 14px;color:var(--dark);">Simple, Fast & Reliable E-Commerce</h2>
        <p style="color:var(--muted);line-height:1.6;margin-bottom:16px;">
          Founded in 2026, <strong>SwiftCart</strong> was created with a straightforward goal: to provide shoppers across Bangladesh with a seamless, trustworthy shopping experience featuring genuine lifestyle gear, audio electronics, and modern home workspace essentials.
        </p>
        <h3 style="font-size:16px;margin:20px 0 8px;color:var(--dark);">Why Choose SwiftCart?</h3>
        <ul style="color:var(--muted);line-height:1.7;padding-left:20px;margin-bottom:20px;">
          <li><strong>Curated Quality:</strong> Every item is tested and certified authentic.</li>
          <li><strong>Zero Prepayment Anxiety:</strong> Pay Cash on Delivery when you receive and inspect your package.</li>
          <li><strong>Free Shipping:</strong> Enjoy free nationwide delivery on all orders over ৳3,000.</li>
          <li><strong>Customer First:</strong> Dedicated support team reachable 7 days a week.</li>
        </ul>
        <button class="btn" onclick="closeModal('aboutModal');location.href='/products.html'">Start Shopping</button>
      </div>
    </div>

    <!-- Interactive Contact Us Modal -->
    <div class="modal-overlay" id="contactModal" onclick="if(event.target===this)closeModal('contactModal')">
      <div class="modal-card">
        <button class="modal-close-btn" onclick="closeModal('contactModal')" aria-label="Close">&times;</button>
        <span class="badge" style="margin-bottom:12px;">Contact Us</span>
        <h2 style="margin:0 0 8px;color:var(--dark);">We'd Love to Hear From You</h2>
        <p style="color:var(--muted);margin-bottom:20px;">Have questions about an order or product? Reach out to our Dhaka support desk.</p>
        
        <div style="background:#fff9f8;border:1px solid var(--border);border-radius:14px;padding:18px;margin-bottom:20px;">
          <div style="margin-bottom:12px;"><strong>Headquarters:</strong> Gulshan Avenue, Dhaka-1212, Bangladesh</div>
          <div style="margin-bottom:12px;"><strong>Helpline:</strong> <a href="tel:+8801700000000" style="color:var(--primary);font-weight:700;">+880 1700-000000</a></div>
          <div style="margin-bottom:12px;"><strong>Email:</strong> <a href="mailto:support@swiftcart.com" style="color:var(--primary);font-weight:700;">support@swiftcart.com</a></div>
          <div><strong>Hours:</strong> Saturday – Thursday: 9:00 AM – 10:00 PM</div>
        </div>

        <form onsubmit="event.preventDefault();alert('Thank you! Your message has been sent to our customer care team.');closeModal('contactModal');">
          <div class="field">
            <label>Your Name</label>
            <input required placeholder="Enter your full name">
          </div>
          <div class="field">
            <label>Your Email / Phone</label>
            <input required placeholder="e.g. you@example.com or 017...">
          </div>
          <div class="field">
            <label>Message</label>
            <textarea rows="3" required placeholder="How can we help you?"></textarea>
          </div>
          <button class="btn" style="width:100%;">Send Message</button>
        </form>
      </div>
    </div>

    <!-- Interactive Delivery & COD Policy Modal -->
    <div class="modal-overlay" id="faqModal" onclick="if(event.target===this)closeModal('faqModal')">
      <div class="modal-card">
        <button class="modal-close-btn" onclick="closeModal('faqModal')" aria-label="Close">&times;</button>
        <span class="badge" style="margin-bottom:12px;">Delivery & Policy</span>
        <h2 style="margin:0 0 14px;color:var(--dark);">Shipping & Cash on Delivery (COD)</h2>
        <div style="color:var(--muted);line-height:1.6;">
          <h4 style="color:var(--dark);margin:16px 0 6px;">How does Cash on Delivery work?</h4>
          <p style="margin:0 0 14px;">Select Cash on Delivery at checkout. Our courier partner will deliver the package to your given address. Simply inspect the parcel and pay the exact invoice amount in cash to the delivery agent.</p>
          <h4 style="color:var(--dark);margin:16px 0 6px;">What are the shipping fees?</h4>
          <p style="margin:0 0 14px;">Standard nationwide shipping fee is <strong>৳80</strong>. All orders of <strong>৳3,000 or above</strong> automatically qualify for <strong>100% Free Shipping</strong>.</p>
          <h4 style="color:var(--dark);margin:16px 0 6px;">Delivery Timeline</h4>
          <p style="margin:0 0 20px;">Inside Dhaka: 24 to 48 hours. Outside Dhaka: 48 to 72 hours via express parcel service.</p>
        </div>
        <button class="btn secondary" onclick="closeModal('faqModal')">Close</button>
      </div>
    </div>
  `;
}

function openAboutModal() {
  document.getElementById('aboutModal')?.classList.add('active');
}

function openContactModal() {
  document.getElementById('contactModal')?.classList.add('active');
}

function openFaqModal() {
  document.getElementById('faqModal')?.classList.add('active');
}

function closeModal(id) {
  document.getElementById(id)?.classList.remove('active');
}

document.addEventListener('DOMContentLoaded', () => {
  mountNav();
  mountFooter();
});