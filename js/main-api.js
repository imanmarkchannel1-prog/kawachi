/**
 * Kawachi Headless WooCommerce - REST API Interface Client
 * 
 * This module contains vanilla JS shells, client logic, and placeholders
 * designed to target WooCommerce /wp-json/wc/v3 REST API endpoints.
 * 
 * SECURITY NOTE:
 * When using the WooCommerce REST API in a headless architecture:
 * 1. DO NOT expose your Consumer Secret or Consumer Key directly in clientside JS in production.
 * 2. It is recommended to use a serverless middleware (e.g., Hostinger Node.js proxy, Next.js api routes) 
 *    to forward requests to your WordPress database.
 * 3. Below, we demonstrate a clean WooCommerceClient class designed to execute requests either
 *    directly (for dev/local authorization check) or via a reverse proxy/middleware.
 */

// ==========================================================================
// 1. Headless WooCommerce REST API Client Definition
// ==========================================================================
class WooCommerceClient {
  /**
   * Initializes the WooCommerce API client connection
   * @param {Object} config - Client configuration params
   * @param {string} config.baseUrl - WordPress site URL (e.g., 'https://kawachi-store.com')
   * @param {string} config.consumerKey - WooCommerce consumer key (ck_...)
   * @param {string} config.consumerSecret - WooCommerce consumer secret (cs_...)
   * @param {boolean} config.useProxy - If true, requests are channeled through an intermediate proxy routing
   */
  constructor({ baseUrl = '', consumerKey = '', consumerSecret = '', useProxy = false } = {}) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Strip trailing slash
    this.consumerKey = consumerKey;
    this.consumerSecret = consumerSecret;
    this.useProxy = useProxy;
    this.mockMode = !this.baseUrl || !this.consumerKey; // Automatically fallback to mockup details if config is empty
  }

  /**
   * Helper utility to perform dynamic authorized fetch queries
   * @param {string} endpoint - API path (e.g., '/products')
   * @param {Object} options - Request options (headers, method, body)
   * @returns {Promise<any>}
   */
  async request(endpoint, options = {}) {
    if (this.mockMode) {
      console.warn(`[WooCommerce API] Operating in Mock Mode. Target endpoint: ${endpoint}`);
      return this.getMockResponse(endpoint, options);
    }

    const targetUrl = this.useProxy
      ? `/api/wc-proxy?endpoint=${encodeURIComponent(endpoint)}`
      : `${this.baseUrl}/wp-json/wc/v3${endpoint}`;

    // Standard authorization headers setup
    const headers = new Headers(options.headers || {});
    headers.set('Content-Type', 'application/json');

    // For direct API requests over SSL, WooCommerce accepts Basic Authorization
    if (!this.useProxy) {
      const credentials = btoa(`${this.consumerKey}:${this.consumerSecret}`);
      headers.set('Authorization', `Basic ${credentials}`);
    }

    const fetchOptions = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(targetUrl, fetchOptions);
      if (!response.ok) {
        throw new Error(`WooCommerce REST API Error [${response.status}]: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`[WooCommerce REST Client] Fetch failed at ${endpoint}:`, error);
      throw error;
    }
  }

  // ==========================================================================
  // WooCommerce Core Endpoints Methods Mappings
  // ==========================================================================

  /**
   * Fetches a list of products with optional query parameters
   * Endpoint: GET /wp-json/wc/v3/products
   * @param {Object} params - WooCommerce standard query constraints (e.g., page: 1, per_page: 12, category: 18)
   * @returns {Promise<Array>}
   */
  async fetchProducts(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/products${queryString ? '?' + queryString : ''}`;
    return this.request(endpoint, { method: 'GET' });
  }

  /**
   * Fetches details of a single product ID
   * Endpoint: GET /wp-json/wc/v3/products/<id>
   * @param {number|string} productId 
   * @returns {Promise<Object>}
   */
  async fetchProduct(productId) {
    return this.request(`/products/${productId}`, { method: 'GET' });
  }

  /**
   * Fetches list of WooCommerce categories
   * Endpoint: GET /wp-json/wc/v3/products/categories
   * @param {Object} params 
   * @returns {Promise<Array>}
   */
  async fetchCategories(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/products/categories${queryString ? '?' + queryString : ''}`;
    return this.request(endpoint, { method: 'GET' });
  }

  /**
   * Creates a WooCommerce transaction order
   * Endpoint: POST /wp-json/wc/v3/orders
   * @param {Object} orderData - Standard WooCommerce order configuration model
   * @returns {Promise<Object>}
   */
  async createOrder(orderData) {
    return this.request('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData)
    });
  }

  // ==========================================================================
  // Development Mock Engine - Guarantees visual demonstration even offline
  // ==========================================================================
  getMockResponse(endpoint, options) {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (endpoint.startsWith('/products/categories')) {
          resolve([
            { id: 10, name: 'Wellness', slug: 'wellness', count: 12, image: { src: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?q=80&w=150' } },
            { id: 11, name: 'Furniture', slug: 'furniture', count: 32, image: { src: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?q=80&w=150' } },
            { id: 12, name: 'Smart Tech', slug: 'smart-tech', count: 18, image: { src: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=150' } }
          ]);
        } 
        else if (endpoint.startsWith('/products/')) {
          // Single product request mockup
          const id = endpoint.split('/').pop();
          resolve({
            id: parseInt(id, 10) || 101,
            name: 'Premium Portable Finnish Sauna (1-Person)',
            sku: 'KW-SAUNA-08',
            price: '89999.00',
            regular_price: '129999.00',
            description: 'Indulge in deep detoxification and full-body relaxation in the comfort of your home.',
            images: [{ src: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?q=80&w=800' }]
          });
        }
        else if (endpoint.startsWith('/products')) {
          resolve([
            { id: 101, name: 'Premium Portable Finnish Sauna', price: '89999.00', regular_price: '129999.00', categories: [{ name: 'Wellness' }], images: [{ src: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?q=80&w=500' }] },
            { id: 102, name: 'Minimalist Oak Swivel Office Chair', price: '24999.00', categories: [{ name: 'Furniture' }], images: [{ src: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?q=80&w=500' }] },
            { id: 103, name: 'Noise Cancelling Studio Headphones', price: '18999.00', categories: [{ name: 'Gadgets' }], images: [{ src: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=500' }] },
            { id: 104, name: 'Retro Italian Countertop Espresso Machine', price: '32000.00', regular_price: '39999.00', categories: [{ name: 'Appliances' }], images: [{ src: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=500' }] }
          ]);
        }
        else if (endpoint === '/orders' && options.method === 'POST') {
          resolve({
            id: 20042,
            status: 'processing',
            total: '114998.00',
            currency: 'INR',
            payment_method_title: 'Razorpay / NetBanking',
            date_created: new Date().toISOString()
          });
        }
        else {
          resolve({ message: 'Mock data endpoint not mapped' });
        }
      }, 500);
    });
  }
}

// ==========================================================================
// 2. Global Headless Cart System & Dynamic Formatting
// ==========================================================================

/**
 * Clean standard local formatting for Indian Rupees (₹X,XX,XXX.00)
 */
function formatRupees(amount) {
  return '₹' + Number(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
}

/**
 * Generates dynamic 5-star row with blue count link for cards
 */
window.getCardRatingHtml = function(rating, reviews) {
  if (!rating) return "";
  const rVal = parseFloat(rating) || 4.5;
  let starsHtml = "";
  for (let i = 1; i <= 5; i++) {
    if (rVal >= i) {
      starsHtml += `<svg width="12" height="12" fill="#DE7921" viewBox="0 0 20 20" style="display: inline-block; vertical-align: middle; margin-right: 1px;"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>`;
    } else if (rVal > i - 1) {
      const pct = Math.round((rVal - (i - 1)) * 100);
      const gradId = `c-star-grad-${Math.random().toString(36).substr(2, 9)}`;
      starsHtml += `
        <svg width="12" height="12" viewBox="0 0 20 20" style="display: inline-block; vertical-align: middle; margin-right: 1px;">
          <defs>
            <linearGradient id="${gradId}">
              <stop offset="${pct}%" stop-color="#DE7921" />
              <stop offset="${pct}%" stop-color="#E5E7EB" />
            </linearGradient>
          </defs>
          <path fill="url(#${gradId})" d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
        </svg>
      `;
    } else {
      starsHtml += `<svg width="12" height="12" fill="#E5E7EB" viewBox="0 0 20 20" style="display: inline-block; vertical-align: middle; margin-right: 1px;"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>`;
    }
  }
  return `
    <div class="product-rating" style="display: inline-flex; align-items: center; gap: 2px;">
      <span style="font-size: 13px; font-weight: 700; color: #565959; margin-right: 4px;">${rVal.toFixed(1)}</span>
      ${starsHtml}
    </div>
  `;
};

/**
 * Generates dynamic price layout including limited time deal badge & inline discount for cards
 */
window.getCardPriceRowHtml = function(p) {
  const formattedPrice = formatRupees(p.price);
  const formattedRegularPrice = p.regular_price ? formatRupees(p.regular_price) : "";
  
  let limitedDealHtml = "";
  if (p.limited_time_deal) {
    limitedDealHtml = `<span class="limited-deal-tag" style="background-color: #CC0C39; color: #FFFFFF; padding: 3px 6px; font-size: 10px; font-weight: 700; border-radius: 2px; display: inline-block; margin-bottom: 4px; line-height: 1; align-self: flex-start; text-transform: capitalize;">Limited time deal</span>`;
  }
  
  let discountHtml = "";
  if (p.regular_price && p.regular_price > p.price) {
    const discountPct = Math.round(((p.regular_price - p.price) / p.regular_price) * 100);
    discountHtml = `<span style="color: #CC0C39; font-size: 15px; font-weight: 400; margin-right: 4px;">-${discountPct}%</span>`;
  }
  
  const priceParts = formattedPrice.replace('₹', '').split('.');
  const wholePrice = priceParts[0];
  
  return `
    <div style="display: flex; flex-direction: column; gap: 2px; align-items: flex-start; margin-top: 4px;">
      ${limitedDealHtml}
      <div style="display: flex; align-items: baseline; flex-wrap: wrap;">
        ${discountHtml}
        <span style="font-size: 10px; font-weight: 500; align-self: flex-start; margin-right: 1px; color: #003366;">₹</span>
        <span style="font-size: 16px; font-weight: 700; color: #003366; line-height: 1;">${wholePrice}</span>
      </div>
      ${formattedRegularPrice ? `<div style="font-size: 12px; color: #565959; margin-top: 1px;">M.R.P.: <span style="text-decoration: line-through;">${formattedRegularPrice}</span></div>` : ""}
    </div>
  `;
};

class CartSystem {
  constructor() {
    this.key = 'kawachi_cart';
    this.items = this.load();
  }

  load() {
    try {
      const data = localStorage.getItem(this.key);
      let items = data ? JSON.parse(data) : [];
      if (items && items.length > 0) {
        // Filter out legacy mockup items with Unsplash image URLs
        items = items.filter(item => !item.image || !item.image.includes("unsplash.com"));
      }
      if (!items || items.length === 0) {
        items = [
          { id: 103, name: 'Wall Mounted Floating Shelves', price: 399, quantity: 1, image: 'images/products/wall_shelves.png', category: 'Home Decor' },
          { id: 105, name: 'Meditation Floor Chair', price: 2099, quantity: 2, image: 'images/products/meditation_chair.png', category: 'Health & Beauty' }
        ];
      }
      return items;
    } catch (e) {
      return [];
    }
  }

  save() {
    try {
      localStorage.setItem(this.key, JSON.stringify(this.items));
    } catch (e) {
      console.error('[Kawachi Cart] LocalStorage save failed:', e);
    }
    this.syncUI();
  }

  addItem(product) {
    const existing = this.items.find(item => item.id == product.id);
    const quantity = parseInt(product.quantity || 1, 10);
    if (existing) {
      existing.quantity += quantity;
    } else {
      this.items.push({
        id: Number(product.id),
        name: product.name,
        price: Number(product.price),
        image: product.image,
        category: product.category,
        quantity: quantity
      });
    }
    this.save();
  }

  removeItem(id) {
    this.items = this.items.filter(item => item.id != id);
    this.save();
  }

  updateQty(id, qty) {
    const item = this.items.find(item => item.id == id);
    if (item) {
      item.quantity = parseInt(qty, 10);
      if (item.quantity <= 0) {
        this.removeItem(id);
      } else {
        this.save();
      }
    }
  }

  clear() {
    this.items = [];
    this.save();
  }

  syncUI() {
    const totalQty = this.items.reduce((sum, item) => sum + item.quantity, 0);
    const badge = document.getElementById("cart-badge-count");
    if (badge) {
      badge.textContent = totalQty;
    }
    const islandBadge = document.getElementById("island-cart-badge-count");
    if (islandBadge) {
      islandBadge.textContent = totalQty;
    }

    const drawerBody = document.getElementById("cart-drawer-items-body");
    const subtotal = this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    if (drawerBody) {
      if (this.items.length === 0) {
        drawerBody.innerHTML = `
          <div style="padding: 48px 24px; text-align: center; color: var(--color-text-muted); font-size: var(--text-sm);">
            Your cart is currently empty.
          </div>
        `;
      } else {
        drawerBody.innerHTML = this.items.map(item => `
          <div class="cart-item" data-cart-id="${item.id}" style="position: relative;">
            <img src="${item.image}" alt="${item.name}" class="cart-item-img">
            <div class="cart-item-info">
              <h4 class="cart-item-title">${item.name}</h4>
              <span class="cart-item-meta">Category: ${item.category}</span>
              <div class="flex align-center justify-between" style="margin-top: auto;">
                <div class="quantity-selector" style="transform: scale(0.8); transform-origin: left center;">
                  <button class="qty-btn val-decrement">-</button>
                  <input type="text" class="qty-input val-qty" value="${item.quantity}" readonly>
                  <button class="qty-btn val-increment">+</button>
                </div>
                <span class="cart-item-price">${formatRupees(item.price)}</span>
              </div>
            </div>
            <button class="remove-cart-item-btn" style="position: absolute; top: 12px; right: 12px; border: none; background: transparent; cursor: pointer; color: var(--color-text-muted); padding: 4px;">
              <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
        `).join("");
      }
    }

    const subtotalVal = document.getElementById("cart-summary-subtotal-val");
    const totalVal = document.getElementById("cart-summary-total-val");
    if (subtotalVal) subtotalVal.textContent = formatRupees(subtotal);
    if (totalVal) totalVal.textContent = formatRupees(subtotal);

    // Dynamic cart page update
    const cartTableBody = document.getElementById("cart-items-table-body");
    if (cartTableBody) {
      if (this.items.length === 0) {
        cartTableBody.innerHTML = `
          <tr><td colspan="6" style="text-align: center; padding: 48px; color: var(--color-text-muted);">Your cart is currently empty.</td></tr>
        `;
      } else {
        cartTableBody.innerHTML = this.items.map(item => `
          <tr data-cart-row-id="${item.id}">
            <td style="width: 100px;">
              <img src="${item.image}" alt="${item.name}" style="width: 80px; height: 80px; object-fit: cover; border-radius: var(--radius-md); border: 1px solid var(--color-border);">
            </td>
            <td>
              <div style="font-weight: 600; font-size: var(--text-sm);"><a href="single-product.html?id=${item.id}">${item.name}</a></div>
              <div style="font-size: var(--text-xs); color: var(--color-text-muted); margin-top: 4px;">Category: ${item.category}</div>
            </td>
            <td style="font-weight: 500; font-size: var(--text-sm);" class="row-item-price" data-raw-price="${item.price}">${formatRupees(item.price)}</td>
            <td>
              <div class="quantity-selector" style="transform: scale(0.9); transform-origin: left center;">
                <button class="qty-btn val-decrement">-</button>
                <input type="text" class="qty-input val-qty" value="${item.quantity}" readonly>
                <button class="qty-btn val-increment">+</button>
              </div>
            </td>
            <td style="font-weight: 700; font-size: var(--text-sm); color: var(--color-accent);" class="row-item-total">${formatRupees(item.price * item.quantity)}</td>
            <td style="text-align: right;">
              <button class="remove-cart-row-btn" aria-label="Remove Item" style="color: var(--color-text-light);">
                <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
              </button>
            </td>
          </tr>
        `).join("");
      }

      const pageSubtotal = document.getElementById("page-subtotal-val");
      if (pageSubtotal) {
        pageSubtotal.textContent = formatRupees(subtotal);
      }
      
      const summaryContainer = document.getElementById("summary-cart-items");
      if (summaryContainer) {
        if (this.items.length === 0) {
          summaryContainer.innerHTML = `<div style="text-align: center; color: var(--color-text-muted); font-size: var(--text-xs);">No items in cart</div>`;
        } else {
          summaryContainer.innerHTML = this.items.map(item => `
            <div class="summary-item-row">
              <div style="max-width: 70%; text-align: left;">
                <span style="font-weight: 600; color: var(--color-text-main);">${item.name}</span>
                <span style="color: var(--color-text-muted); margin-left: 4px;">&times; ${item.quantity}</span>
              </div>
              <span style="font-weight: 700; color: var(--color-primary);">${formatRupees(item.price * item.quantity)}</span>
            </div>
          `).join("");
        }
      }
    }

    // Dynamic checkout page update
    const orderReviewTable = document.querySelector(".order-review-table");
    if (orderReviewTable) {
      const tax = Math.round(subtotal * 0.08 * 100) / 100;
      let itemsHtml = this.items.map(item => `
        <div class="order-review-row">
          <span style="font-weight: 500; max-width: 70%;">${item.name} &times; ${item.quantity}</span>
          <span style="font-weight: 600; color: var(--color-primary);">${formatRupees(item.price * item.quantity)}</span>
        </div>
      `).join("");

      orderReviewTable.innerHTML = `
        ${itemsHtml}
        
        <div class="order-review-row" style="margin-top: 12px; color: var(--color-text-muted);">
          <span>Subtotal</span>
          <span id="summary-subtotal">${formatRupees(subtotal)}</span>
        </div>
        <div class="order-review-row" style="color: var(--color-text-muted);">
          <span>Shipping</span>
          <span>Free Shipping</span>
        </div>
        <div class="order-review-row" style="color: var(--color-text-muted);">
          <span>Estimated Tax (8%)</span>
          <span id="summary-tax">${formatRupees(tax)}</span>
        </div>
        <div class="order-review-row total">
          <span>Total Due</span>
          <span id="summary-grand-total">${formatRupees(subtotal + tax)}</span>
        </div>
      `;
    }
  }
}

// Instantiate globally
window.KawachiCart = new CartSystem();

window.KawachiProducts = [
  {
    id: 101,
    name: "Foldable Laptop Desk Study Table",
    price: 1690,
    regular_price: 2450,
    category: "Home Furniture",
    image: "images/products/laptop_desk.png",
    rating: "4.6",
    reviews: "124",
    sales_count: 1500,
    weekly_sales: 120,
    orders_count: 1450,
    featured: true,
    limited_time_deal: true
  },
  {
    id: 102,
    name: "3 Tier Kitchen Storage Rack Organizer",
    price: 2099,
    regular_price: 2750,
    category: "Kitchen Storage",
    image: "images/products/kitchen_rack.png",
    rating: "4.7",
    reviews: "98",
    sales_count: 1200,
    weekly_sales: 95,
    orders_count: 1150,
    featured: true,
    limited_time_deal: true
  },
  {
    id: 103,
    name: "Wall Mounted Floating Shelves",
    price: 399,
    regular_price: 480,
    category: "Home Decor",
    image: "images/products/wall_shelves.png",
    rating: "4.5",
    reviews: "78",
    sales_count: 600,
    weekly_sales: 50,
    orders_count: 580,
    featured: true
  },
  {
    id: 104,
    name: "Portable Steam Sauna Box",
    price: 6799,
    regular_price: 8999,
    category: "Health & Beauty",
    image: "images/products/steam_sauna.png",
    rating: "4.6",
    reviews: "66",
    sales_count: 950,
    weekly_sales: 85,
    orders_count: 900,
    featured: true
  },
  {
    id: 105,
    name: "Meditation Floor Chair",
    price: 2099,
    regular_price: 2590,
    category: "Health & Beauty",
    image: "images/products/meditation_chair.png",
    rating: "4.6",
    reviews: "115",
    sales_count: 800,
    weekly_sales: 70,
    orders_count: 780,
    featured: true
  },
  {
    id: 106,
    name: "Wooden Bedside Table with 3 Drawers",
    price: 3190,
    regular_price: 4150,
    category: "Home Furniture",
    image: "images/products/bedside_table.png",
    rating: "4.5",
    reviews: "87",
    sales_count: 500,
    weekly_sales: 40,
    orders_count: 480,
    featured: false
  },
  {
    id: 107,
    name: "Laptop Table for Bed & Sofa",
    price: 1490,
    regular_price: 1990,
    category: "Home Furniture",
    image: "images/products/laptop_desk.png",
    rating: "4.6",
    reviews: "124",
    sales_count: 450,
    weekly_sales: 35,
    orders_count: 430,
    featured: false
  },
  {
    id: 108,
    name: "Kitchen Storage Rack 4 Tier",
    price: 2250,
    regular_price: 2990,
    category: "Kitchen Storage",
    image: "images/products/kitchen_rack.png",
    rating: "4.7",
    reviews: "98",
    sales_count: 400,
    weekly_sales: 30,
    orders_count: 380,
    featured: false
  },
  {
    id: 109,
    name: "Portable Sauna Steam Box",
    price: 6799,
    regular_price: 8999,
    category: "Health & Beauty",
    image: "images/products/steam_sauna.png",
    rating: "4.6",
    reviews: "66",
    sales_count: 350,
    weekly_sales: 25,
    orders_count: 330,
    featured: false
  },
  {
    id: 110,
    name: "Wooden Wall Shelves Set of 3",
    price: 1299,
    regular_price: 1790,
    category: "Home Decor",
    image: "images/products/wall_shelves.png",
    rating: "4.5",
    reviews: "78",
    sales_count: 300,
    weekly_sales: 20,
    orders_count: 280,
    featured: false
  },
  {
    id: 111,
    name: "Meditation Chair Foldable",
    price: 2099,
    regular_price: 2590,
    category: "Health & Beauty",
    image: "images/products/meditation_chair.png",
    rating: "4.6",
    reviews: "115",
    sales_count: 250,
    weekly_sales: 15,
    orders_count: 230,
    featured: false
  },
  {
    id: 112,
    name: "Bedside Table with 3 Drawers",
    price: 3190,
    regular_price: 4150,
    category: "Home Furniture",
    image: "images/products/bedside_table.png",
    rating: "4.5",
    reviews: "87",
    sales_count: 200,
    weekly_sales: 10,
    orders_count: 180,
    featured: false
  },
  {
    id: 113,
    name: "Multi-purpose Trolley Organizer",
    price: 1599,
    regular_price: 2199,
    category: "Utility Products",
    image: "images/products/trolley_organizer.png",
    rating: "4.4",
    reviews: "56",
    sales_count: 480,
    weekly_sales: 45,
    orders_count: 460,
    featured: false
  },
  {
    id: 114,
    name: "Foldable Multi-purpose Table",
    price: 1790,
    regular_price: 2490,
    category: "Home Furniture",
    image: "images/products/laptop_desk.png",
    rating: "4.5",
    reviews: "42",
    sales_count: 310,
    weekly_sales: 24,
    orders_count: 290,
    featured: false
  },
  {
    id: 115,
    name: "Smart Space Saving Study Desk",
    price: 1890,
    regular_price: 2650,
    category: "Home Furniture",
    image: "images/products/laptop_desk.png",
    rating: "4.6",
    reviews: "58",
    sales_count: 420,
    weekly_sales: 38,
    orders_count: 400,
    featured: false
  },
  {
    id: 116,
    name: "Elegant Bedside Cabinet",
    price: 3490,
    regular_price: 4500,
    category: "Home Furniture",
    image: "images/products/bedside_table.png",
    rating: "4.4",
    reviews: "31",
    sales_count: 220,
    weekly_sales: 18,
    orders_count: 210,
    featured: false
  },
  {
    id: 117,
    name: "2 Tier Spice Rack Organizer",
    price: 1099,
    regular_price: 1599,
    category: "Kitchen Storage",
    image: "images/products/kitchen_rack.png",
    rating: "4.5",
    reviews: "50",
    sales_count: 650,
    weekly_sales: 60,
    orders_count: 620,
    featured: false
  },
  {
    id: 118,
    name: "Under Sink Storage Shelf",
    price: 1299,
    regular_price: 1899,
    category: "Kitchen Storage",
    image: "images/products/kitchen_rack.png",
    rating: "4.3",
    reviews: "29",
    sales_count: 380,
    weekly_sales: 32,
    orders_count: 360,
    featured: false
  },
  {
    id: 119,
    name: "Kitchen Counter Microwave Stand",
    price: 1999,
    regular_price: 2999,
    category: "Kitchen Storage",
    image: "images/products/kitchen_rack.png",
    rating: "4.6",
    reviews: "75",
    sales_count: 820,
    weekly_sales: 78,
    orders_count: 800,
    featured: false
  },
  {
    id: 120,
    name: "Adjustable Dish Drying Rack",
    price: 2399,
    regular_price: 3499,
    category: "Kitchen Storage",
    image: "images/products/kitchen_rack.png",
    rating: "4.7",
    reviews: "88",
    sales_count: 940,
    weekly_sales: 90,
    orders_count: 910,
    featured: false
  },
  {
    id: 121,
    name: "Hexagonal Wall Shelf Set",
    price: 999,
    regular_price: 1499,
    category: "Home Decor",
    image: "images/products/wall_shelves.png",
    rating: "4.4",
    reviews: "45",
    sales_count: 510,
    weekly_sales: 40,
    orders_count: 490,
    featured: false
  },
  {
    id: 122,
    name: "Corner Floating Display Shelves",
    price: 799,
    regular_price: 1299,
    category: "Home Decor",
    image: "images/products/wall_shelves.png",
    rating: "4.3",
    reviews: "38",
    sales_count: 430,
    weekly_sales: 35,
    orders_count: 410,
    featured: false
  },
  {
    id: 123,
    name: "Industrial Metal Wall Shelves",
    price: 1699,
    regular_price: 2499,
    category: "Home Decor",
    image: "images/products/wall_shelves.png",
    rating: "4.6",
    reviews: "62",
    sales_count: 570,
    weekly_sales: 48,
    orders_count: 550,
    featured: false
  },
  {
    id: 124,
    name: "Rustic Wooden Display Ledges",
    price: 599,
    regular_price: 999,
    category: "Home Decor",
    image: "images/products/wall_shelves.png",
    rating: "4.2",
    reviews: "25",
    sales_count: 280,
    weekly_sales: 22,
    orders_count: 270,
    featured: false
  },
  {
    id: 125,
    name: "Personal Detox Steam Sauna Tent",
    price: 7499,
    regular_price: 9999,
    category: "Health & Beauty",
    image: "images/products/steam_sauna.png",
    rating: "4.7",
    reviews: "40",
    sales_count: 310,
    weekly_sales: 28,
    orders_count: 300,
    featured: false
  },
  {
    id: 126,
    name: "Comfort Backrest Floor Cushion",
    price: 1699,
    regular_price: 2299,
    category: "Health & Beauty",
    image: "images/products/meditation_chair.png",
    rating: "4.5",
    reviews: "52",
    sales_count: 460,
    weekly_sales: 38,
    orders_count: 440,
    featured: false
  },
  {
    id: 127,
    name: "4 Tier Slim Utility Cart",
    price: 1799,
    regular_price: 2499,
    category: "Utility Products",
    image: "images/products/trolley_organizer.png",
    rating: "4.5",
    reviews: "70",
    sales_count: 880,
    weekly_sales: 82,
    orders_count: 860,
    featured: false
  },
  {
    id: 128,
    name: "Heavy Duty Laundry Trolley",
    price: 2199,
    regular_price: 2999,
    category: "Utility Products",
    image: "images/products/trolley_organizer.png",
    rating: "4.3",
    reviews: "34",
    sales_count: 320,
    weekly_sales: 25,
    orders_count: 300,
    featured: false
  },
  {
    id: 129,
    name: "3 Tier Rolling Utility Organizer",
    price: 1499,
    regular_price: 1999,
    category: "Utility Products",
    image: "images/products/trolley_organizer.png",
    rating: "4.4",
    reviews: "48",
    sales_count: 590,
    weekly_sales: 52,
    orders_count: 570,
    featured: false
  },
  {
    id: 130,
    name: "Foldable Storage Trolley with Wheels",
    price: 2499,
    regular_price: 3299,
    category: "Utility Products",
    image: "images/products/trolley_organizer.png",
    rating: "4.6",
    reviews: "63",
    sales_count: 710,
    weekly_sales: 65,
    orders_count: 690,
    featured: false
  },
  {
    id: 131,
    name: "Metal Mesh Kitchen Utility Cart",
    price: 1999,
    regular_price: 2799,
    category: "Utility Products",
    image: "images/products/trolley_organizer.png",
    rating: "4.5",
    reviews: "50",
    sales_count: 530,
    weekly_sales: 42,
    orders_count: 510,
    featured: false
  }
];

function hydrateDetailPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const productId = parseInt(urlParams.get("id"), 10);
  if (productId && window.KawachiProducts) {
    const product = window.KawachiProducts.find(p => p.id === productId);
    if (product) {
      // Hydrate title
      const titleEls = document.querySelectorAll(".product-title-detail, .breadcrumb-product-title");
      titleEls.forEach(el => {
        el.textContent = product.name;
      });

      // Hydrate average rating numerical values
      const avgRatingVal = document.getElementById("avg-rating-val");
      if (avgRatingVal) avgRatingVal.textContent = product.rating || "4.6";

      const ratingCountVal = document.getElementById("rating-count-val");
      if (ratingCountVal) ratingCountVal.textContent = product.reviews || "124";

      // Hydrate dynamic stars
      const starsRow = document.getElementById("detail-stars-row");
      if (starsRow) {
        const rating = parseFloat(product.rating) || 4.6;
        let starsHtml = "";
        for (let i = 1; i <= 5; i++) {
          if (rating >= i) {
            // Full star
            starsHtml += `<svg width="15" height="15" fill="currentColor" viewBox="0 0 20 20" style="color: #DE7921; display: inline-block; vertical-align: middle; margin-right: 2px;"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>`;
          } else if (rating > i - 1) {
            // Fractional/Half star using a gradient fill
            const pct = Math.round((rating - (i - 1)) * 100);
            const gradId = `star-grad-${Math.random().toString(36).substr(2, 9)}`;
            starsHtml += `
              <svg width="15" height="15" viewBox="0 0 20 20" style="display: inline-block; vertical-align: middle; margin-right: 2px;">
                <defs>
                  <linearGradient id="${gradId}">
                    <stop offset="${pct}%" stop-color="#DE7921" />
                    <stop offset="${pct}%" stop-color="#E5E7EB" />
                  </linearGradient>
                </defs>
                <path fill="url(#${gradId})" d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
              </svg>
            `;
          } else {
            // Empty star
            starsHtml += `<svg width="15" height="15" fill="#E5E7EB" viewBox="0 0 20 20" style="display: inline-block; vertical-align: middle; margin-right: 2px;"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>`;
          }
        }
        starsRow.innerHTML = starsHtml;
      }
      
      // Hydrate Limited Time Deal Badge
      const pLimitedDeal = document.getElementById("p-limited-deal-badge");
      if (pLimitedDeal) {
        if (product.limited_time_deal) {
          pLimitedDeal.style.display = "inline-block";
        } else {
          pLimitedDeal.style.display = "none";
        }
      }

      // Hydrate price
      const priceDisplay = document.getElementById("p-price-display");
      if (priceDisplay) {
        priceDisplay.textContent = Number(product.price).toLocaleString('en-IN');
      }
      
      const purchaseWidgetPrice = document.getElementById("purchase-widget-price");
      if (purchaseWidgetPrice) purchaseWidgetPrice.textContent = formatRupees(product.price);
      
      // Hydrate old price
      const priceOldDisplays = document.querySelectorAll(".price-old");
      priceOldDisplays.forEach(el => {
        el.textContent = product.regular_price ? formatRupees(product.regular_price) : "";
      });

      // Calculate and hydrate discount badge / percentage
      const discountPercentage = document.getElementById("product-discount-percentage");
      const discountBadge = document.getElementById("product-discount-badge");
      if (product.regular_price && product.regular_price > product.price) {
        const pct = Math.round(((product.regular_price - product.price) / product.regular_price) * 100);
        if (discountPercentage) {
          discountPercentage.textContent = `-${pct}%`;
          discountPercentage.style.display = "inline-block";
        }
        if (discountBadge) {
          discountBadge.textContent = `SAVE ${pct}%`;
          discountBadge.style.display = "inline-block";
        }
      } else {
        if (discountPercentage) discountPercentage.style.display = "none";
        if (discountBadge) discountBadge.style.display = "none";
      }

      // Hydrate delivery estimate date
      const deliveryEl = document.getElementById("delivery-date-estimate");
      if (deliveryEl) {
        const date = new Date();
        date.setDate(date.getDate() + 5);
        const options = { weekday: 'long', day: 'numeric', month: 'long' };
        deliveryEl.textContent = date.toLocaleDateString('en-IN', options);
      }
      
      // Hydrate main gallery image
      const mainImg = document.getElementById("gallery-main-img");
      if (mainImg) {
        mainImg.src = product.image;
        mainImg.alt = product.name;
      }
      
      // Hydrate category link
      const categoryEls = document.querySelectorAll(".category-link, .product-category-detail");
      categoryEls.forEach(el => {
        el.textContent = product.category;
      });

      // Hydrate bought count badge
      const boughtEl = document.getElementById("detail-bought-count");
      if (boughtEl) {
        const salesCount = product.sales_count || product.orders_count || 0;
        const countVal = boughtEl.querySelector(".bought-count-val");
        if (countVal && salesCount > 0) {
          countVal.textContent = `${salesCount.toLocaleString('en-IN')}+ bought`;
          boughtEl.style.display = "inline-flex";
        } else {
          boughtEl.style.display = "none";
        }
      }

      // Hydrate breadcrumbs
      const breadcrumbCat = document.querySelector('nav[aria-label="Breadcrumb"] a[href*="categories"]');
      if (breadcrumbCat) breadcrumbCat.textContent = product.category;
      const breadcrumbTitle = document.querySelector('nav[aria-label="Breadcrumb"] span');
      if (breadcrumbTitle) breadcrumbTitle.textContent = product.name;

      // Define descriptions mapping
      const categoryKeywords = product.category.toLowerCase();
      let briefText = `${product.name} is a high-performance, premium product designed to elevate your everyday living. Features state-of-the-art craftsmanship and highly durable materials.`;
      let fullText = `The ${product.name} is meticulously engineered for comfort, durability, and convenience. Made with high-quality materials and smart utility concepts, this product offers an elite experience.`;

      if (categoryKeywords.includes("furniture")) {
        if (product.name.toLowerCase().includes("meditation")) {
          briefText = "Experience ultimate comfort with our 5-position adjustable floor folding chair, ideal for reading, gaming, and meditation.";
          fullText = "The Kawachi meditation floor chair offers superior back support with its reinforced iron frame adjustable across 5 angles. Wrapped in breathable fabric and padded with thick foam, it maintains its shape and comfort for long hours of seating. Perfect for cozy reading, movie nights, or group discussions.";
        } else if (product.name.toLowerCase().includes("bedside")) {
          briefText = "A sleek, modern 3-drawer bedside storage cabinet crafted with solid wood legs and premium hardware.";
          fullText = "Add mid-century modern styling to your bedroom with the Kawachi Wooden Bedside Table. Features three spacious drawers with easy-glide rollers to organize essentials. Supported by solid pine legs for maximum stability, the top surface is waterproof and scratch-resistant, perfect for holding a bedside lamp and books.";
        }
      } else if (categoryKeywords.includes("kitchen")) {
        briefText = "Perfect for kitchens, pantries, and storage rooms. Made with rust-proof steel and sturdy support panels.";
        fullText = "Optimize your kitchen storage with this premium Kawachi rack. Meticulously designed for heavy loads, it is made of rust-proof carbon steel with a sleek protective finish. Its space-saving dimensions fit neatly into counters, cabinets, or floors to keep utensils and jars organized.";
      } else if (categoryKeywords.includes("study") || categoryKeywords.includes("office") || product.name.toLowerCase().includes("desk") || product.name.toLowerCase().includes("table")) {
        briefText = "A highly versatile, space-saving foldable desk designed for study sessions, laptop work, and breakfast in bed. Features an integrated device slot and cup holder.";
        fullText = "Maximize your comfort and productivity with the Kawachi Foldable Laptop Table. Meticulously designed for modern utility, it features a heavy-duty MDF top and carbon steel legs with anti-slip rubber protectors. The slot allows you to secure your iPad, Kindle or phone at the perfect viewing angle. Folds flat in seconds for easy storage under the bed or behind the door.";
      } else if (categoryKeywords.includes("wellness") || categoryKeywords.includes("beauty") || product.name.toLowerCase().includes("sauna")) {
        briefText = "A portable home steam sauna spa complete with a 2-liter steam pot, remote control, and folding chair.";
        fullText = "Transform your home into a luxury wellness spa with the Kawachi Portable Steam Sauna Box. The multi-layered insulated tent retains steam and heat effectively. It features a digital remote control to adjust time and heat level across 9 settings. Ideal for muscle relaxation, skin detoxing, and overall health rejuvenation.";
      } else if (categoryKeywords.includes("utility") || product.name.toLowerCase().includes("trolley") || product.name.toLowerCase().includes("cart")) {
        briefText = "A mobile multi-tier steel utility storage cart with mesh baskets and lockable caster wheels.";
        fullText = "Perfect for kitchens, offices, and bathrooms, the Kawachi Rolling Storage Cart features three deep wire mesh baskets that allow airflow to prevent moisture buildup. Heavy-duty carbon steel frame supports heavy loads, while 360-degree wheels (2 lockable) provide smooth mobility and steady placement.";
      } else if (categoryKeywords.includes("decor") || product.name.toLowerCase().includes("shelf") || product.name.toLowerCase().includes("shelves")) {
        briefText = "A set of rustic wooden floating display shelves with industrial iron brackets for wall decor.";
        fullText = "Enhance your wall space with Kawachi rustic floating shelves. Ideal for displaying potted plants, photo frames, and collectables. Made of high-grade natural wood with matte black iron brackets, these shelves are a stylish combination of rustic warmth and industrial strength.";
      }

      // Hydrate descriptions
      const briefDescEl = document.querySelector(".product-description-brief");
      if (briefDescEl) briefDescEl.textContent = briefText;
      const tabDescEl = document.querySelector("#tab-description p");
      if (tabDescEl) tabDescEl.textContent = fullText;

      // Hydrate specifications tab table depending on product type
      const tabSpecsTable = document.querySelector("#tab-specs table tbody");
      if (tabSpecsTable) {
        let specsHtml = `
          <tr style="border-bottom: 1px solid var(--color-border);"><td style="padding: 12px 0; font-weight: 600; color: var(--color-primary); width: 200px;">Product Name</td><td style="padding: 12px 0; color: var(--color-text-muted);">${product.name}</td></tr>
          <tr style="border-bottom: 1px solid var(--color-border);"><td style="padding: 12px 0; font-weight: 600; color: var(--color-primary);">Category</td><td style="padding: 12px 0; color: var(--color-text-muted);">${product.category}</td></tr>
          <tr style="border-bottom: 1px solid var(--color-border);"><td style="padding: 12px 0; font-weight: 600; color: var(--color-primary);">Price</td><td style="padding: 12px 0; color: var(--color-text-muted);">${formatRupees(product.price)}</td></tr>
        `;

        if (categoryKeywords.includes("furniture") && product.name.toLowerCase().includes("meditation")) {
          specsHtml += `
            <tr style="border-bottom: 1px solid var(--color-border);"><td style="padding: 12px 0; font-weight: 600; color: var(--color-primary);">Material</td><td style="padding: 12px 0; color: var(--color-text-muted);">Linen Fabric, Metal Frame, Foam</td></tr>
            <tr style="border-bottom: 1px solid var(--color-border);"><td style="padding: 12px 0; font-weight: 600; color: var(--color-primary);">Adjustability</td><td style="padding: 12px 0; color: var(--color-text-muted);">5 Positions (90 to 180 degrees)</td></tr>
            <tr style="border-bottom: 1px solid var(--color-border);"><td style="padding: 12px 0; font-weight: 600; color: var(--color-primary);">Dimensions</td><td style="padding: 12px 0; color: var(--color-text-muted);">110 cm x 52 cm x 12 cm</td></tr>
            <tr style="border-bottom: 1px solid var(--color-border);"><td style="padding: 12px 0; font-weight: 600; color: var(--color-primary);">Weight Capacity</td><td style="padding: 12px 0; color: var(--color-text-muted);">Up to 120 kg</td></tr>
          `;
        } else if (categoryKeywords.includes("furniture") && product.name.toLowerCase().includes("bedside")) {
          specsHtml += `
            <tr style="border-bottom: 1px solid var(--color-border);"><td style="padding: 12px 0; font-weight: 600; color: var(--color-primary);">Material</td><td style="padding: 12px 0; color: var(--color-text-muted);">Solid Pine Wood &amp; MDF Board</td></tr>
            <tr style="border-bottom: 1px solid var(--color-border);"><td style="padding: 12px 0; font-weight: 600; color: var(--color-primary);">Storage Drawers</td><td style="padding: 12px 0; color: var(--color-text-muted);">3 Drawers with soft-close rollers</td></tr>
            <tr style="border-bottom: 1px solid var(--color-border);"><td style="padding: 12px 0; font-weight: 600; color: var(--color-primary);">Dimensions</td><td style="padding: 12px 0; color: var(--color-text-muted);">45 cm x 40 cm x 60 cm</td></tr>
            <tr style="border-bottom: 1px solid var(--color-border);"><td style="padding: 12px 0; font-weight: 600; color: var(--color-primary);">Waterproof Finish</td><td style="padding: 12px 0; color: var(--color-text-muted);">Yes, Premium Matte Laminate</td></tr>
          `;
        } else if (categoryKeywords.includes("study") || categoryKeywords.includes("office") || product.name.toLowerCase().includes("desk") || product.name.toLowerCase().includes("table")) {
          specsHtml += `
            <tr style="border-bottom: 1px solid var(--color-border);"><td style="padding: 12px 0; font-weight: 600; color: var(--color-primary);">Material</td><td style="padding: 12px 0; color: var(--color-text-muted);">Heavy-duty MDF top &amp; Carbon Steel legs</td></tr>
            <tr style="border-bottom: 1px solid var(--color-border);"><td style="padding: 12px 0; font-weight: 600; color: var(--color-primary);">Features</td><td style="padding: 12px 0; color: var(--color-text-muted);">Foldable legs, Cup holder, Tablet slot, Anti-slip rubber caps</td></tr>
            <tr style="border-bottom: 1px solid var(--color-border);"><td style="padding: 12px 0; font-weight: 600; color: var(--color-primary);">Dimensions</td><td style="padding: 12px 0; color: var(--color-text-muted);">60 cm x 40 cm x 28 cm</td></tr>
            <tr style="border-bottom: 1px solid var(--color-border);"><td style="padding: 12px 0; font-weight: 600; color: var(--color-primary);">Net Weight</td><td style="padding: 12px 0; color: var(--color-text-muted);">2.2 kg</td></tr>
          `;
        } else if (categoryKeywords.includes("wellness") || categoryKeywords.includes("beauty") || product.name.toLowerCase().includes("sauna")) {
          specsHtml += `
            <tr style="border-bottom: 1px solid var(--color-border);"><td style="padding: 12px 0; font-weight: 600; color: var(--color-primary);">Material</td><td style="padding: 12px 0; color: var(--color-text-muted);">Waterproof Fabric &amp; Insulating Cotton</td></tr>
            <tr style="border-bottom: 1px solid var(--color-border);"><td style="padding: 12px 0; font-weight: 600; color: var(--color-primary);">Capacity</td><td style="padding: 12px 0; color: var(--color-text-muted);">2.0L Steam Generator with Digital Remote</td></tr>
            <tr style="border-bottom: 1px solid var(--color-border);"><td style="padding: 12px 0; font-weight: 600; color: var(--color-primary);">Power / Wattage</td><td style="padding: 12px 0; color: var(--color-text-muted);">1000W Max</td></tr>
            <tr style="border-bottom: 1px solid var(--color-border);"><td style="padding: 12px 0; font-weight: 600; color: var(--color-primary);">Safety</td><td style="padding: 12px 0; color: var(--color-text-muted);">Auto-off dry boil protection &amp; Timer control</td></tr>
          `;
        } else if (categoryKeywords.includes("utility") || product.name.toLowerCase().includes("trolley") || product.name.toLowerCase().includes("cart")) {
          specsHtml += `
            <tr style="border-bottom: 1px solid var(--color-border);"><td style="padding: 12px 0; font-weight: 600; color: var(--color-primary);">Material</td><td style="padding: 12px 0; color: var(--color-text-muted);">Rust-proof Powder Coated Carbon Steel</td></tr>
            <tr style="border-bottom: 1px solid var(--color-border);"><td style="padding: 12px 0; font-weight: 600; color: var(--color-primary);">Load Capacity</td><td style="padding: 12px 0; color: var(--color-text-muted);">Up to 60 kg total (20 kg per shelf)</td></tr>
            <tr style="border-bottom: 1px solid var(--color-border);"><td style="padding: 12px 0; font-weight: 600; color: var(--color-primary);">Casters / Wheels</td><td style="padding: 12px 0; color: var(--color-text-muted);">360-degree lockable caster wheels</td></tr>
            <tr style="border-bottom: 1px solid var(--color-border);"><td style="padding: 12px 0; font-weight: 600; color: var(--color-primary);">Finish</td><td style="padding: 12px 0; color: var(--color-text-muted);">Matte anti-corrosive mesh storage baskets</td></tr>
          `;
        } else if (categoryKeywords.includes("decor") || product.name.toLowerCase().includes("shelf") || product.name.toLowerCase().includes("shelves")) {
          specsHtml += `
            <tr style="border-bottom: 1px solid var(--color-border);"><td style="padding: 12px 0; font-weight: 600; color: var(--color-primary);">Material</td><td style="padding: 12px 0; color: var(--color-text-muted);">Natural Paulownia Wood &amp; Metal Brackets</td></tr>
            <tr style="border-bottom: 1px solid var(--color-border);"><td style="padding: 12px 0; font-weight: 600; color: var(--color-primary);">Set Quantity</td><td style="padding: 12px 0; color: var(--color-text-muted);">Set of 3 display ledges (S, M, L)</td></tr>
            <tr style="border-bottom: 1px solid var(--color-border);"><td style="padding: 12px 0; font-weight: 600; color: var(--color-primary);">Mounting Hardware</td><td style="padding: 12px 0; color: var(--color-text-muted);">Wall anchors, screws, and leveler included</td></tr>
            <tr style="border-bottom: 1px solid var(--color-border);"><td style="padding: 12px 0; font-weight: 600; color: var(--color-primary);">Weight Rating</td><td style="padding: 12px 0; color: var(--color-text-muted);">Up to 15 kg per shelf</td></tr>
          `;
        } else {
          specsHtml += `
            <tr style="border-bottom: 1px solid var(--color-border);"><td style="padding: 12px 0; font-weight: 600; color: var(--color-primary);">Finish / Style</td><td style="padding: 12px 0; color: var(--color-text-muted);">Matte, modern utilities concept</td></tr>
            <tr style="border-bottom: 1px solid var(--color-border);"><td style="padding: 12px 0; font-weight: 600; color: var(--color-primary);">Quality Checked</td><td style="padding: 12px 0; color: var(--color-text-muted);">Yes, certified quality inspections</td></tr>
          `;
        }
        tabSpecsTable.innerHTML = specsHtml;
      }

      // Hide/show variations
      const variationSections = document.querySelectorAll(".variation-section");
      variationSections.forEach(sec => {
        if (product.id !== 104) {
          sec.style.display = "none";
        } else {
          sec.style.display = "block";
        }
      });

      // Hydrate SKU
      const skuEl = document.getElementById("meta-sku");
      if (skuEl) skuEl.textContent = `KW-${product.category.toUpperCase().replace(/[^A-Z0-9]/g, '')}-${product.id}`;

      // Build rich custom gallery for all products depending on category
      const thumbnailRow = document.querySelector(".thumbnail-row");
      if (thumbnailRow) {
        let galleryImages = [product.image];

        if (categoryKeywords.includes("furniture")) {
          galleryImages.push(
            "https://images.unsplash.com/photo-1592078615290-033ee584e267?q=80&w=800&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1581539250439-c96689b516dd?q=80&w=800&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1503602642458-232111445657?q=80&w=800&auto=format&fit=crop"
          );
        } else if (categoryKeywords.includes("kitchen")) {
          galleryImages.push(
            "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?q=80&w=800&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=800&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1556912173-3bb406ef7e77?q=80&w=800&auto=format&fit=crop"
          );
        } else if (categoryKeywords.includes("study") || categoryKeywords.includes("office") || product.name.toLowerCase().includes("desk") || product.name.toLowerCase().includes("table")) {
          galleryImages.push(
            "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?q=80&w=800&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?q=80&w=800&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?q=80&w=800&auto=format&fit=crop"
          );
        } else if (categoryKeywords.includes("wellness") || categoryKeywords.includes("beauty") || product.name.toLowerCase().includes("sauna")) {
          galleryImages.push(
            "https://images.unsplash.com/photo-1515377905703-c4788e51af15?q=80&w=800&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=800&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=800&auto=format&fit=crop"
          );
        } else if (categoryKeywords.includes("utility") || product.name.toLowerCase().includes("trolley") || product.name.toLowerCase().includes("cart")) {
          galleryImages.push(
            "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?q=80&w=800&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1595428774223-ef52624120d2?q=80&w=800&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1600585154526-990dced4db0d?q=80&w=800&auto=format&fit=crop"
          );
        } else if (categoryKeywords.includes("decor") || product.name.toLowerCase().includes("shelf") || product.name.toLowerCase().includes("shelves")) {
          galleryImages.push(
            "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?q=80&w=800&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1538688525198-9b88f6f53126?q=80&w=800&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?q=80&w=800&auto=format&fit=crop"
          );
        } else {
          galleryImages.push(
            "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=800&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=800&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?q=80&w=800&auto=format&fit=crop"
          );
        }

        thumbnailRow.innerHTML = galleryImages.map((imgUrl, index) => `
          <div class="thumb-item ${index === 0 ? 'active' : ''}" data-img-url="${imgUrl}">
            <img src="${imgUrl}" alt="${product.name} Thumbnail ${index + 1}">
          </div>
        `).join('');

        // Thumbnail switcher logic
        const thumbs = thumbnailRow.querySelectorAll(".thumb-item");
        thumbs.forEach(thumb => {
          thumb.addEventListener("click", () => {
            thumbs.forEach(t => t.classList.remove("active"));
            thumb.classList.add("active");
            mainImg.src = thumb.getAttribute("data-img-url");
          });
        });
      }

      // Hydrate direct marketplace purchase buttons (Amazon and Flipkart)
      const marketplaceContainer = document.getElementById("marketplace-links-container");
      if (marketplaceContainer) {
        const query = encodeURIComponent("Kawachi " + product.name);
        marketplaceContainer.innerHTML = `
          <div style="display: flex; flex-direction: column; gap: 10px; width: 100%;">
            <a href="https://www.amazon.in/s?k=${query}" target="_blank" class="premium-marketplace-btn amazon">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 16 16" style="flex-shrink:0;">
                <path fill="#FFFFFF" d="M10.813 11.968c.157.083.36.074.5-.05l.005.005a90 90 0 0 1 1.623-1.405c.173-.143.143-.372.006-.563l-.125-.17c-.345-.465-.673-.906-.673-1.791v-3.3l.001-.335c.008-1.265.014-2.421-.933-3.305C10.404.274 9.06 0 8.03 0 6.017 0 3.77.75 3.296 3.24c-.047.264.143.404.316.443l2.054.22c.19-.009.33-.196.366-.387.176-.857.896-1.271 1.703-1.271.435 0 .929.16 1.188.55.264.39.26.91.257 1.376v.432q-.3.033-.621.065c-1.113.114-2.397.246-3.36.67C3.873 5.91 2.94 7.08 2.94 8.798c0 2.2 1.387 3.298 3.168 3.298 1.506 0 2.328-.354 3.489-1.54l.167.246c.274.405.456.675 1.047 1.166ZM6.03 8.431C6.03 6.627 7.647 6.3 9.177 6.3v.57c.001.776.002 1.434-.396 2.133-.336.595-.87.961-1.465.961-.812 0-1.286-.619-1.286-1.533"/>
                <path fill="#FF9900" d="M.435 12.174c2.629 1.603 6.698 4.084 13.183.997.28-.116.475.078.199.431C13.538 13.96 11.312 16 7.57 16 3.832 16 .968 13.446.094 12.386c-.24-.275.036-.4.199-.299z M13.828 11.943c.567-.07 1.468-.027 1.645.204.135.176-.004.966-.233 1.533-.23.563-.572.961-.762 1.115s-.333.094-.23-.137c.105-.23.684-1.663.455-1.963-.213-.278-1.177-.177-1.625-.13l-.09.009q-.142.013-.233.024c-.193.021-.245.027-.274-.032-.074-.209.779-.556 1.347-.623"/>
              </svg>
              <span style="color: #FF9900;">Buy via Amazon</span>
            </a>
            <a href="https://www.flipkart.com/search?q=${query}" target="_blank" class="premium-marketplace-btn flipkart">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" style="flex-shrink:0;">
                <path fill="#FFE500" d="M17 6h-2V5c0-1.65-1.35-3-3-3S9 3.35 9 5v1H7c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6-1c0-.55.45-1 1-1s1 .45 1 1v1h-2V5zm6 14H7V8h10v11z"/>
              </svg>
              <span style="color: #FFFFFF;">Buy via <span style="color: #FFE500; font-weight: 800;">Flipkart</span></span>
            </a>
          </div>
        `;
      }

      // Hydrate sticky bar
      const stickyImg = document.querySelector(".sticky-atc-left img");
      if (stickyImg) stickyImg.src = product.image;
      
      const stickyTitle = document.querySelector(".sticky-atc-bar-title");
      if (stickyTitle) stickyTitle.textContent = product.name;
      
      const stickyPrice = document.getElementById("sticky-price-display");
      if (stickyPrice) stickyPrice.textContent = formatRupees(product.price);

      // Initialize Main Image Hover Zoom Lens Effect
      initImageZoom();
    }
  }
}

function initImageZoom() {
  const container = document.querySelector(".main-image-container");
  const img = document.getElementById("gallery-main-img");
  if (!container || !img) return;

  container.addEventListener("mousemove", (e) => {
    const rect = container.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    img.style.transformOrigin = `${x}% ${y}%`;
    img.style.transform = "scale(2.2)";
  });

  container.addEventListener("mouseleave", () => {
    img.style.transform = "scale(1)";
    img.style.transformOrigin = "center center";
  });
}

function initUnifiedSearchBar() {
  const selectContainer = document.querySelector(".category-select-container");
  const searchContainer = document.querySelector(".search-container");
  const form = document.getElementById("header-search-form");
  const inner = document.querySelector(".search-bar-inner");
  
  if (selectContainer && searchContainer && form && inner) {
    // Clear inline onchange
    const select = selectContainer.querySelector(".all-categories-select");
    if (select) {
      select.name = "cat"; // Assign name so it submits natively
      select.onchange = null;
      select.removeAttribute("onchange");
      
      // Convert option values to keywords
      const options = select.querySelectorAll("option");
      options.forEach(opt => {
        const val = opt.value;
        if (val.includes("q=")) {
          const urlParams = new URLSearchParams(val.split("?")[1]);
          opt.value = urlParams.get("q") || val;
        } else if (val === "#") {
          opt.value = "all";
        }
      });
      
      // Keep selected option based on URL parameters (for page reload sync)
      const urlParams = new URLSearchParams(window.location.search);
      const currentCat = urlParams.get("cat");
      if (currentCat) {
        select.value = currentCat;
      }
    }
    
    // Move selectContainer inside the form, right before the inner search bar
    form.insertBefore(selectContainer, inner);
    
    // Wrap the entire form in the unified search bar container
    const parent = searchContainer.parentNode;
    const wrapper = document.createElement("div");
    wrapper.className = "unified-search-wrapper";
    parent.insertBefore(wrapper, searchContainer);
    wrapper.appendChild(form); // move the form into the wrapper
    
    // Remove the now empty searchContainer container
    if (searchContainer.parentNode) {
      searchContainer.parentNode.removeChild(searchContainer);
    }
  }
}

// Event hooks on page load
document.addEventListener("DOMContentLoaded", () => {
  // Initialize unified search bar styling wrapper
  initUnifiedSearchBar();

  // Global listener for both standard and floating island cart drawer triggers
  document.addEventListener("click", (e) => {
    const trigger = e.target.closest("#cart-drawer-trigger, #island-cart-trigger");
    if (trigger) {
      e.preventDefault();
      const drawer = document.getElementById("cart-drawer-overlay");
      const drawerSheet = document.getElementById("cart-drawer-sheet");
      if (drawer && drawerSheet) {
        drawer.classList.add("open");
        trigger.setAttribute("aria-expanded", "true");
        drawerSheet.focus();
      }
    }
  });

  // Hydrate single product page detail nodes dynamically if present
  hydrateDetailPage();

  // Sync the client cart UI state immediately
  window.KawachiCart.syncUI();

  // 1. Dynamic Savings Badge Calculations (Math comparing Current & Old pricing)
  const productCards = document.querySelectorAll(".product-card, .flash-deal-box, .checkout-box");
  productCards.forEach(card => {
    const currentPriceEl = card.querySelector(".price-current, .deal-price-current, .row-item-price");
    const oldPriceEl = card.querySelector(".price-old, .deal-price-old");
    const badgeEl = card.querySelector(".product-badge.sale, .deal-badge");
    
    if (currentPriceEl && oldPriceEl) {
      const parsePrice = (text) => parseFloat(text.replace(/[^\d.]/g, ''));
      const currentVal = parsePrice(currentPriceEl.textContent);
      const oldVal = parsePrice(oldPriceEl.textContent);
      
      if (!isNaN(currentVal) && !isNaN(oldVal) && oldVal > currentVal) {
        const pct = Math.round(((oldVal - currentVal) / oldVal) * 100);
        if (badgeEl) {
          badgeEl.textContent = `Save ${pct}%`;
          badgeEl.style.display = ""; // force visible
        }
      } else {
        if (badgeEl && badgeEl.classList.contains("sale")) {
          badgeEl.style.display = "none";
        }
      }
    }
  });

  // 2. Event Delegation listeners for Drawer quantity modifying and removals
  document.addEventListener("click", (e) => {
    // Increment actions
    if (e.target.classList.contains("val-increment")) {
      const itemRow = e.target.closest("[data-cart-id]");
      if (itemRow) {
        const id = itemRow.getAttribute("data-cart-id");
        const item = window.KawachiCart.items.find(item => item.id == id);
        if (item) {
          window.KawachiCart.updateQty(id, item.quantity + 1);
        }
      }
      const cartRow = e.target.closest("[data-cart-row-id]");
      if (cartRow) {
        const id = cartRow.getAttribute("data-cart-row-id");
        const item = window.KawachiCart.items.find(item => item.id == id);
        if (item) {
          window.KawachiCart.updateQty(id, item.quantity + 1);
        }
      }
    }

    // Decrement actions
    if (e.target.classList.contains("val-decrement")) {
      const itemRow = e.target.closest("[data-cart-id]");
      if (itemRow) {
        const id = itemRow.getAttribute("data-cart-id");
        const item = window.KawachiCart.items.find(item => item.id == id);
        if (item) {
          window.KawachiCart.updateQty(id, item.quantity - 1);
        }
      }
      const cartRow = e.target.closest("[data-cart-row-id]");
      if (cartRow) {
        const id = cartRow.getAttribute("data-cart-row-id");
        const item = window.KawachiCart.items.find(item => item.id == id);
        if (item) {
          window.KawachiCart.updateQty(id, item.quantity - 1);
        }
      }
    }

    // Remove item in side drawer
    const removeBtn = e.target.closest(".remove-cart-item-btn");
    if (removeBtn) {
      const itemRow = removeBtn.closest("[data-cart-id]");
      if (itemRow) {
        const id = itemRow.getAttribute("data-cart-id");
        window.KawachiCart.removeItem(id);
      }
    }

    // Remove row in cart page table
    const removeRowBtn = e.target.closest(".remove-cart-row-btn");
    if (removeRowBtn) {
      const cartRow = removeRowBtn.closest("[data-cart-row-id]");
      if (cartRow) {
        const id = cartRow.getAttribute("data-cart-row-id");
        window.KawachiCart.removeItem(id);
      }
    }
  });

  // 3. Quick Add (+) buttons logic
  document.addEventListener("click", (e) => {
    const quickAddBtn = e.target.closest(".add-to-cart-quick");
    if (quickAddBtn) {
      e.preventDefault();
      const id = quickAddBtn.getAttribute("data-id");
      const name = quickAddBtn.getAttribute("data-name");
      const price = parseFloat(quickAddBtn.getAttribute("data-price"));
      
      const card = quickAddBtn.closest(".product-card, .flash-deal-box");
      let image = "";
      let category = "General";
      
      if (card) {
        const imgEl = card.querySelector(".product-image, img");
        if (imgEl) image = imgEl.src;
        const catEl = card.querySelector(".product-category");
        if (catEl) category = catEl.textContent;
      }
      
      window.KawachiCart.addItem({ id, name, price, image, category, quantity: 1 });
      
      // Open drawer overlay
      const drawer = document.getElementById("cart-drawer-overlay");
      const openBtn = document.getElementById("cart-drawer-trigger");
      const drawerSheet = document.getElementById("cart-drawer-sheet");
      if (drawer && openBtn && drawerSheet) {
        drawer.classList.add("open");
        openBtn.setAttribute("aria-expanded", "true");
        drawerSheet.focus();
      }
    }
  });

  // 4. Detail page main and sticky add-to-cart triggers
  const mainAtcBtn = document.getElementById("main-add-to-cart-btn");
  const stickyAtcBtn = document.getElementById("sticky-atc-trigger-btn");
  if (mainAtcBtn || stickyAtcBtn) {
    const handleDetailATC = (e) => {
      e.preventDefault();
      const name = document.querySelector(".product-title-detail").textContent;
      const priceText = document.getElementById("p-price-display").textContent;
      const price = parseFloat(priceText.replace(/[^\d.]/g, ''));
      const qty = parseInt(document.getElementById("qty-value").value || 1, 10);
      const imgEl = document.getElementById("gallery-main-img");
      const image = imgEl ? imgEl.src : "";
      
      // Get dynamic product attributes
      const urlParams = new URLSearchParams(window.location.search);
      const currentId = parseInt(urlParams.get("id"), 10) || 101;
      const product = window.KawachiProducts.find(x => x.id === currentId);
      const category = product ? product.category : "Wellness";

      window.KawachiCart.addItem({
        id: currentId,
        name,
        price,
        image,
        category,
        quantity: qty
      });
      
      // Auto open drawer
      const drawer = document.getElementById("cart-drawer-overlay");
      const openBtn = document.getElementById("cart-drawer-trigger");
      const drawerSheet = document.getElementById("cart-drawer-sheet");
      if (drawer && openBtn && drawerSheet) {
        drawer.classList.add("open");
        openBtn.setAttribute("aria-expanded", "true");
        drawerSheet.focus();
      }
    };
    
    if (mainAtcBtn) mainAtcBtn.addEventListener("click", handleDetailATC);
    if (stickyAtcBtn) stickyAtcBtn.addEventListener("click", handleDetailATC);
  }

  // 5. Premium Shopify-Style Centered Search Autocomplete & Focus Suggestions
  const searchContainers = document.querySelectorAll(".search-container");
  const searchBackdrop = document.getElementById("search-backdrop");

  const getSuggestionsHtml = () => {
    let bestsellers = [];
    if (window.KawachiProducts) {
      bestsellers = [...window.KawachiProducts]
        .sort((a, b) => (b.orders_count || 0) - (a.orders_count || 0))
        .slice(0, 3);
    }
    
    const bestsellersHtml = bestsellers.map(p => `
      <a href="single-product.html?id=${p.id}" class="search-trending-item">
        <img src="${p.image}" alt="${p.name}" class="search-trending-img">
        <div class="search-trending-info">
          <span class="search-trending-name">${p.name}</span>
          <span class="search-trending-category">${p.category}</span>
        </div>
        <span class="search-trending-price">${formatRupees(p.price)}</span>
      </a>
    `).join("");

    return `
      <div class="search-suggestions-layout">
        <div class="search-suggestions-left">
          <div class="search-dropdown-title" style="margin-top: 0 !important; color: #0F172A; font-weight: 800; font-size: 12px;">Browse Categories</div>
          <div class="search-dropdown-tags" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 0;">
            <a href="search.html?q=Wellness" class="search-category-row">
              <span style="font-size: 16px;">🧘</span> Wellness &amp; Health
            </a>
            <a href="search.html?q=Kitchen" class="search-category-row">
              <span style="font-size: 16px;">🍳</span> Kitchen Utilities
            </a>
            <a href="search.html?q=Furniture" class="search-category-row">
              <span style="font-size: 16px;">🏠</span> Home Furniture
            </a>
            <a href="search.html?q=Study" class="search-category-row">
              <span style="font-size: 16px;">💻</span> Smart Work &amp; Study
            </a>
            <a href="search.html?q=Utility" class="search-category-row">
              <span style="font-size: 16px;">🔋</span> Life Hack Gadgets
            </a>
          </div>
        </div>
        <div class="search-suggestions-right">
          <div class="search-dropdown-title" style="margin-top: 0 !important; color: #0F172A; font-weight: 800; font-size: 12px;">🔥 Bestseller Products</div>
          <div class="search-trending-list">
            ${bestsellersHtml}
          </div>
        </div>
      </div>
    `;
  };

  const getResultsHtml = (query) => {
    const matches = window.KawachiProducts.filter(p => 
      p.name.toLowerCase().includes(query) || 
      p.category.toLowerCase().includes(query)
    );

    if (matches.length === 0) {
      return `
        <div style="padding: 16px; font-size: 13px; color: var(--color-text-muted); text-align: center; font-weight: 500;">
          No products found for "${query}"
        </div>
      `;
    }

    return matches.map(p => `
      <a href="single-product.html?id=${p.id}" class="search-autocomplete-item">
        <img src="${p.image}" alt="${p.name}" class="search-autocomplete-img">
        <div class="search-autocomplete-info">
          <span class="search-autocomplete-title">${p.name}</span>
          <span class="search-autocomplete-category">${p.category}</span>
        </div>
        <span class="search-autocomplete-price">${formatRupees(p.price)}</span>
      </a>
    `).join("");
  };

  searchContainers.forEach(container => {
    const form = container.querySelector("form");
    const input = container.querySelector(".search-input");
    
    let resultsBox = container.querySelector(".search-autocomplete-results");
    if (!resultsBox) {
      resultsBox = document.createElement("div");
      resultsBox.classList.add("search-autocomplete-results");
      container.appendChild(resultsBox);
    }
    
    if (form) {
      form.action = "search.html";
      form.method = "GET";
      if (input) {
        input.name = "q";
      }
    }
    
    if (input) {
      const openSuggestions = () => {
        if (searchBackdrop) searchBackdrop.classList.add("active");
        
        const query = input.value.trim().toLowerCase();
        if (query.length < 2) {
          resultsBox.innerHTML = getSuggestionsHtml();
        } else {
          resultsBox.innerHTML = getResultsHtml(query);
        }
        resultsBox.style.display = "block";
      };

      // Show default suggestions on focus or click
      input.addEventListener("focus", openSuggestions);
      input.addEventListener("click", openSuggestions);

      // Handle query typing
      input.addEventListener("input", () => {
        const query = input.value.trim().toLowerCase();
        if (query.length < 2) {
          resultsBox.innerHTML = getSuggestionsHtml();
        } else {
          resultsBox.innerHTML = getResultsHtml(query);
        }
        resultsBox.style.display = "block";
      });
    }
  });

  // Global listeners to close search dropdown
  document.addEventListener("click", (e) => {
    let clickedSearch = false;
    searchContainers.forEach(container => {
      if (container.contains(e.target)) clickedSearch = true;
    });

    if (!clickedSearch) {
      searchContainers.forEach(container => {
        const resultsBox = container.querySelector(".search-autocomplete-results");
        if (resultsBox) resultsBox.style.display = "none";
      });
      if (searchBackdrop) searchBackdrop.classList.remove("active");
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      searchContainers.forEach(container => {
        const resultsBox = container.querySelector(".search-autocomplete-results");
        if (resultsBox) resultsBox.style.display = "none";
        const input = container.querySelector(".search-input");
        if (input) input.blur();
      });
      if (searchBackdrop) searchBackdrop.classList.remove("active");
    }
  });

  // 6. Header scroll effect & Active State Scroll Spy
  const siteHeader = document.getElementById("site-header");
  const navLinks = document.querySelectorAll(".nav-menu a.nav-link");
  const trendingSec = document.getElementById("trending-now");

  function setActiveLink(targetHref) {
    navLinks.forEach(link => {
      const href = link.getAttribute("href");
      if (href === targetHref) {
        link.classList.add("active");
      } else {
        link.classList.remove("active");
      }
    });
  }

  if (siteHeader) {
    let lastScrollY = window.scrollY;
    let trendingTop = 0;

    // Cache the trending section offset position to avoid calling getBoundingClientRect() during active scrolling
    const updateTrendingOffset = () => {
      if (trendingSec) {
        trendingTop = trendingSec.getBoundingClientRect().top + window.scrollY - 200;
      }
    };

    // Initialize position caching
    updateTrendingOffset();
    
    // Recalculate on load and resize
    window.addEventListener("load", updateTrendingOffset);
    
    let resizeTimeout;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(updateTrendingOffset, 200);
    });

    const scrollThreshold = 8; // min scroll change in px to trigger hide/show
    const headerHeight = 120; // approximate total height of header + sub-navbar

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const searchInput = document.querySelector(".search-input");
      const isSearchFocused = searchInput && document.activeElement === searchInput;

      // Ensure header remains flat and idle without scrolled capsule transformations
      siteHeader.classList.remove("scrolled");
      siteHeader.classList.remove("scrolling-up");

      // Smart hide/show on scroll
      if (currentScrollY < headerHeight) {
        // Near top of the page: let it scroll naturally with the page
        siteHeader.classList.add("header-at-top");
        siteHeader.classList.remove("header-hidden");
      } else {
        siteHeader.classList.remove("header-at-top");
        
        // If we just crossed headerHeight from the top (scrolling down),
        // we should immediately hide the header instantly without transition so it doesn't glitch.
        if (lastScrollY < headerHeight) {
          if (!isSearchFocused) {
            siteHeader.classList.add("no-transition");
            siteHeader.classList.add("header-hidden");
            // Force layout reflow to apply transition: none instantly
            void siteHeader.offsetHeight;
            requestAnimationFrame(() => {
              siteHeader.classList.remove("no-transition");
            });
          }
        } else {
          // Normal scroll threshold checking
          if (currentScrollY > lastScrollY && currentScrollY - lastScrollY > scrollThreshold) {
            // Scrolling down: hide the header unless search is focused
            if (!isSearchFocused) {
              siteHeader.classList.add("header-hidden");
            }
          } else if (currentScrollY < lastScrollY && lastScrollY - currentScrollY > scrollThreshold) {
            // Scrolling up: show the header
            siteHeader.classList.remove("header-hidden");
          }
        }
      }

      // Track last scroll position, safe from iOS elastic negative scroll
      lastScrollY = Math.max(0, currentScrollY);

      // Scroll spy on homepage using cached static top offset
      if (trendingSec) {
        if (currentScrollY >= trendingTop) {
          setActiveLink("#trending-now");
        } else {
          setActiveLink("index.html");
        }
      }
    };

    // Throttle scroll events using requestAnimationFrame for 60fps performance
    let scrollScheduled = false;
    window.addEventListener("scroll", () => {
      if (!scrollScheduled) {
        window.requestAnimationFrame(() => {
          handleScroll();
          scrollScheduled = false;
        });
        scrollScheduled = true;
      }
    }, { passive: true });
    
    handleScroll();

    // Smooth scroll back to top when clicking Home link or Logo on homepage
    if (trendingSec) {
      const homeLink = document.querySelector('.nav-menu a[href="index.html"]');
      if (homeLink) {
        homeLink.addEventListener("click", (e) => {
          e.preventDefault();
          window.scrollTo({ top: 0, behavior: "smooth" });
          if (history.pushState) {
            history.pushState(null, null, ' ');
          } else {
            window.location.hash = '';
          }
        });
      }

      const logoLink = document.getElementById("site-logo");
      if (logoLink) {
        logoLink.addEventListener("click", (e) => {
          e.preventDefault();
          window.scrollTo({ top: 0, behavior: "smooth" });
          if (history.pushState) {
            history.pushState(null, null, ' ');
          } else {
            window.location.hash = '';
          }
        });
      }
    }

    // 7. Inject Partner Bank & Coupon Partner Logos (dynamic credit-card flashcards across all pages)
    const partnerBrands = [
      { name: "Visa", logo: "images/partners/visa.svg" },
      { name: "Mastercard", logo: "images/partners/mastercard.svg" },
      { name: "PayPal", logo: "images/partners/paypal.svg" },
      { name: "Razorpay", logo: "images/partners/razorpay.svg" },
      { name: "Paytm", logo: "images/partners/paytm.svg" },
      { name: "PhonePe", logo: "images/partners/phonepe.svg" },
      { name: "GrabOn", logo: "images/partners/grabon.svg" },
      { name: "Delhivery", logo: "images/partners/delhivery.svg" },
      { name: "BlueDart", logo: "images/partners/bluedart.svg" },
      { name: "Shiprocket", logo: "images/partners/shiprocket.svg" },
      { name: "Xpressbees", logo: "images/partners/xpressbees.svg" }
    ];

    const logoScrollTrack = document.querySelector('.logo-scroll-track');
    if (logoScrollTrack) {
      const partnerTitle = document.querySelector('.partner-cloud-title');
      if (partnerTitle) {
        partnerTitle.innerHTML = 'Our Partner Brands';
      }

      let groupHtml = '<div class="logo-scroll-group">';
      partnerBrands.forEach(function(brand) {
        groupHtml += `
          <div class="partner-logo-item">
            <img src="${brand.logo}" alt="${brand.name}" onerror="this.style.display='none'">
          </div>
        `;
      });
      groupHtml += '</div>';

      logoScrollTrack.innerHTML = `
        <div class="logo-scroll-inner">
          ${groupHtml}
          ${groupHtml}
        </div>
      `;
    }
  }

});

// ==========================================================================
// FAQ Accordion Toggle (global)
// ==========================================================================
function toggleFaq(btn) {
  const faqItem = btn.closest('.faq-item-2026');
  if (!faqItem) return;
  const panel = faqItem.querySelector('.faq-answer-panel');
  if (!panel) return;

  const isOpen = faqItem.classList.contains('open');

  // Close all other FAQ items first (accordion behavior)
  document.querySelectorAll('.faq-item-2026.open').forEach(function(item) {
    if (item !== faqItem) {
      item.classList.remove('open');
      const p = item.querySelector('.faq-answer-panel');
      if (p) p.style.maxHeight = null;
    }
  });

  if (isOpen) {
    faqItem.classList.remove('open');
    panel.style.maxHeight = null;
  } else {
    faqItem.classList.add('open');
    panel.style.maxHeight = panel.scrollHeight + 'px';
  }
}

// ==========================================================================
// Deal of the Day - Dynamic Podium Hydration
// ==========================================================================
var KawachiDealConfig = {
  // Configure which product IDs appear in the Deal of the Day podium.
  // Set these to any product IDs from your catalog.
  // Position 1 = left/hero, Position 2 = center, Position 3 = right
  productIds: [105, 104, 101],
  dealTitle: "Space-Saving Wellness Set",
  dealDescription: "Get up to 45% off on our best-selling smart desk, meditation chair, and sauna collection.",
  countdownSeconds: 14200
};

function hydrateDealPodium() {
  if (!window.KawachiProducts || !KawachiDealConfig) return;
  var config = KawachiDealConfig;
  var podiumProducts = document.querySelector('.podium-products');
  if (!podiumProducts) return;

  var imgs = podiumProducts.querySelectorAll('img');
  config.productIds.forEach(function(pid, i) {
    var product = window.KawachiProducts.find(function(p) { return p.id === pid; });
    if (product && imgs[i]) {
      imgs[i].src = product.image;
      imgs[i].alt = product.name;
    }
  });

  var titleEl = document.querySelector('.deal-title-2026');
  if (titleEl && config.dealTitle) {
    titleEl.textContent = config.dealTitle;
  }
}

function hydrateStaticProductMarquees() {
  if (!window.KawachiProducts) return;
  const trendingTrack = document.getElementById("static-trending-marquee-track");
  const bestsellerTrack = document.getElementById("static-bestseller-marquee-track");

  if (!trendingTrack && !bestsellerTrack) return;

  function createFullCardHtml(p) {
    // Secondary image switcher compatibility
    const allImages = [
      "images/products/laptop_desk.png",
      "images/products/kitchen_rack.png",
      "images/products/wall_shelves.png",
      "images/products/steam_sauna.png",
      "images/products/meditation_chair.png",
      "images/products/bedside_table.png",
      "images/products/trolley_organizer.png"
    ];
    const idx = allImages.indexOf(p.image);
    const hoverImg = idx !== -1 ? allImages[(idx + 1) % allImages.length] : allImages[0];

    return `
      <div class="product-card marquee-product-card" data-gallery-count="2" onclick="if(!event.target.closest('button')) window.location.href='single-product.html?id=${p.id}'">
        <div class="product-image-container">
          <button class="product-wishlist-btn" aria-label="Add to Wishlist" onclick="event.stopPropagation();">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
            </svg>
          </button>
          <img src="${p.image}" alt="${p.name}" class="product-image" loading="lazy">
          <img src="${hoverImg}" alt="${p.name}" class="product-image product-gallery-img" loading="lazy">
          <div class="gallery-dots">
            <span class="gallery-dot dot-active" data-dot-index="0"></span>
            <span class="gallery-dot" data-dot-index="1"></span>
          </div>
          <div class="product-card-actions">
            <button class="product-action-btn add-to-cart-quick" data-id="${p.id}" data-name="${p.name}" data-price="${p.price}" aria-label="Add to Cart" onclick="event.stopPropagation();">
              <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"></path>
              </svg>
            </button>
          </div>
        </div>
        <div class="product-info">
          <span class="product-category">${p.category || 'lifestyle'}</span>
          <h3 class="product-title" onclick="window.location.href='single-product.html?id=${p.id}'">${p.name}</h3>
          ${window.getCardRatingHtml(p.rating, p.reviews)}
          ${window.getCardPriceRowHtml(p)}
        </div>
      </div>
    `;
  }

  function setupStaticSlider(track, products) {
    if (!track) return;
    const container = track.closest('.static-marquee-container');
    if (!container) return;

    // Render cards
    track.innerHTML = products.map(createFullCardHtml).join('');
    
    // Inject rectangular navigation buttons
    const prevBtn = document.createElement('button');
    prevBtn.className = 'static-slider-arrow prev';
    prevBtn.setAttribute('aria-label', 'Previous Page');
    prevBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width: 24px; height: 24px;">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
    `;

    const nextBtn = document.createElement('button');
    nextBtn.className = 'static-slider-arrow next';
    nextBtn.setAttribute('aria-label', 'Next Page');
    nextBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width: 24px; height: 24px;">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    `;

    container.appendChild(prevBtn);
    container.appendChild(nextBtn);

    let currentIndex = 0;

    function getVisibleCards() {
      const containerWidth = container.getBoundingClientRect().width;
      const padding = 88; // space for left/right arrow buttons
      const count = Math.floor((containerWidth - padding + 24) / 254);
      return Math.max(1, count);
    }

    function getMaxIndex() {
      const cards = track.querySelectorAll(".product-card");
      return Math.max(0, cards.length - getVisibleCards());
    }

    function updateSlider() {
      const cards = track.querySelectorAll(".product-card");
      if (cards.length === 0) return;
      const cardWidth = 230;
      const gap = 24;
      const translation = currentIndex * (cardWidth + gap);
      track.style.transform = `translateX(-${translation}px)`;

      prevBtn.disabled = currentIndex === 0;
      nextBtn.disabled = currentIndex >= getMaxIndex();
    }

    let autoScrollInterval = setInterval(() => {
      const visible = getVisibleCards();
      const maxIdx = getMaxIndex();
      if (maxIdx > 0) {
        if (currentIndex >= maxIdx) {
          currentIndex = 0;
        } else {
          currentIndex = Math.min(currentIndex + visible, maxIdx);
        }
        updateSlider();
      }
    }, 6000);

    function resetAutoScroll() {
      clearInterval(autoScrollInterval);
      autoScrollInterval = setInterval(() => {
        const visible = getVisibleCards();
        const maxIdx = getMaxIndex();
        if (maxIdx > 0) {
          if (currentIndex >= maxIdx) {
            currentIndex = 0;
          } else {
            currentIndex = Math.min(currentIndex + visible, maxIdx);
          }
          updateSlider();
        }
      }, 6000);
    }

    prevBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const visible = getVisibleCards();
      currentIndex = Math.max(0, currentIndex - visible);
      updateSlider();
      resetAutoScroll();
    });

    nextBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const visible = getVisibleCards();
      const maxIdx = getMaxIndex();
      if (currentIndex >= maxIdx) {
        currentIndex = 0;
      } else {
        currentIndex = Math.min(currentIndex + visible, maxIdx);
      }
      updateSlider();
      resetAutoScroll();
    });

    window.addEventListener('resize', () => {
      currentIndex = Math.min(currentIndex, getMaxIndex());
      updateSlider();
    });

    setTimeout(updateSlider, 200);
  }

  if (trendingTrack) {
    const trendingProducts = [...window.KawachiProducts]
      .sort((a, b) => (b.weekly_sales || 0) - (a.weekly_sales || 0))
      .slice(0, 10);
    setupStaticSlider(trendingTrack, trendingProducts);
  }

  if (bestsellerTrack) {
    const bestsellerProducts = [...window.KawachiProducts]
      .sort((a, b) => (b.orders_count || 0) - (a.orders_count || 0))
      .slice(0, 10);
    setupStaticSlider(bestsellerTrack, bestsellerProducts);
  }
}

function hydrateStaticTrendingGrid() {
  if (!window.KawachiProducts) return;
  const grid = document.getElementById("static-trending-grid");
  if (!grid) return;

  const trendingProducts = [...window.KawachiProducts]
    .sort((a, b) => (b.weekly_sales || 0) - (a.weekly_sales || 0))
    .slice(0, 4);

  grid.innerHTML = trendingProducts.map(p => {
    return `
      <div class="product-card" onclick="window.location.href='single-product.html?id=${p.id}'">
        <div class="product-image-container">
          <img src="${p.image}" alt="${p.name}" class="product-image" loading="lazy">
        </div>
        <div class="product-info">
          <span class="product-category">${p.category || 'lifestyle'}</span>
          <h3 class="product-title">${p.name}</h3>
          ${window.getCardRatingHtml(p.rating, p.reviews)}
          ${window.getCardPriceRowHtml(p)}
        </div>
      </div>
    `;
  }).join("");
}

document.addEventListener('DOMContentLoaded', function() {
  hydrateDealPodium();
  initProductGallerySlideshow();
  hydrateStaticProductMarquees();
  hydrateStaticTrendingGrid();
});

// Auto-focus search input if URL parameter exists (for screenshot testing/verification)
if (window.location.search.includes("focusSearch=true")) {
  document.addEventListener("DOMContentLoaded", () => {
    const input = document.querySelector(".search-input");
    if (input) {
      setTimeout(() => {
        input.focus();
        input.click();
      }, 500);
    }
  });
}

// Auto-scroll page if URL parameter exists (for screenshot testing/verification)
if (window.location.search.includes("scroll=true")) {
  window.addEventListener("load", () => {
    setTimeout(() => {
      window.scrollTo(0, 600);
    }, 800);
  });
}

// ==========================================================================
// Product Card Gallery Slideshow on Hover (Static Secondary Image Reveal)
// ==========================================================================
function initProductGallerySlideshow() {
  function setActiveSlide(card, index) {
    var galleryImgs = card.querySelectorAll('.product-gallery-img');
    var dots = card.querySelectorAll('.gallery-dot');

    // If index 0 = main image (no gallery-active), else show gallery image at index-1
    galleryImgs.forEach(function(img) {
      img.classList.remove('gallery-active');
    });

    if (index === 0) {
      card.classList.remove('slideshow-active');
    } else {
      card.classList.add('slideshow-active');
      var targetImg = galleryImgs[index - 1];
      if (targetImg) targetImg.classList.add('gallery-active');
    }

    // Update dots
    dots.forEach(function(dot) {
      dot.classList.remove('dot-active');
    });
    if (dots[index]) dots[index].classList.add('dot-active');
  }

  // Hover delegation: reveal secondary image on enter, restore main image on leave
  document.body.addEventListener('mouseenter', function(e) {
    var card = e.target.closest('.product-card');
    if (card) {
      var totalImages = parseInt(card.getAttribute('data-gallery-count') || '1', 10);
      if (totalImages > 1) {
        // Change to the second image (index 1) instantly on hover
        setActiveSlide(card, 1);
      }
    }
  }, true);

  document.body.addEventListener('mouseleave', function(e) {
    var card = e.target.closest('.product-card');
    if (card) {
      // Restore the main product image (index 0) when hover exits
      setActiveSlide(card, 0);
    }
  }, true);

  // Manual dot navigation (tap/click behavior) to view specific slides
  document.body.addEventListener('click', function(e) {
    var dot = e.target.closest('.gallery-dot');
    if (dot) {
      e.stopPropagation();
      e.preventDefault();
      var card = dot.closest('.product-card');
      if (card) {
        var dotIndex = parseInt(dot.getAttribute('data-dot-index') || '0', 10);
        setActiveSlide(card, dotIndex);
      }
    }
  });
}
