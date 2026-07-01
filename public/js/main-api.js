/**
 * Kawachi Headless WooCommerce - REST API Interface Client
 * 
 * This module contains vanilla JS shells, client logic, and placeholders
 * designed to target WooCommerce /wp-json/wc/v3 REST API endpoints.
 */

// ==========================================================================
// WooCommerce Live Catalog Integration Layer (v6.20)
// ==========================================================================
async function loadLiveWooCommerceProducts() {
  try {
    const client = new WooCommerceClient({
      useProxy: true
    });

    console.log(`[WooCommerce REST Client] Fetching catalog and rows dynamically in parallel...`);

    const mapWooProduct = (p) => {
      const regularPrice = parseFloat(p.regular_price) || parseFloat(p.price) || 0;
      const currentPrice = parseFloat(p.price) || 0;
      return {
        id: p.id,
        name: p.name,
        price: currentPrice,
        regular_price: regularPrice > currentPrice ? regularPrice : null,
        category: p.categories && p.categories.length > 0 ? p.categories[0].name : "Wellness",
        image: p.images && p.images.length > 0 ? p.images[0].src : "",
        images: p.images || [],
        attributes: p.attributes || [],
        rating: p.average_rating || "4.5",
        reviews: String(p.rating_count || 12),
        sales_count: p.total_sales || 100,
        weekly_sales: Math.round((p.total_sales || 100) / 4),
        description: p.description || p.short_description || "",
        short_description: p.short_description || "",
        featured: p.featured || false
      };
    };

    // 1. Fetch categories first to resolve slugs to IDs dynamically
    let categories = [];
    try {
      categories = await client.fetchCategories({ per_page: 50 });
      console.log(`[WooCommerce REST Client] Resolved ${categories.length} categories.`);
    } catch (err) {
      console.warn("[WooCommerce REST Client] Failed to fetch categories:", err);
    }

    const homeFurnitureCat = categories.find(c => c.slug === 'home-furniture' || c.name.toLowerCase() === 'home furniture');
    const kitchenStorageCat = categories.find(c => c.slug === 'kitchen-storage' || c.name.toLowerCase() === 'kitchen storage');

    // 2. Fetch rows in parallel using standard WooCommerce API query params
    const [bestSellersRaw, trendingRaw, furnitureRaw, kitchenRaw] = await Promise.all([
      client.fetchProducts({ orderby: 'popularity', order: 'desc', per_page: 8 }),
      client.fetchProducts({ orderby: 'date', order: 'desc', per_page: 8 }),
      homeFurnitureCat ? client.fetchProducts({ category: homeFurnitureCat.id, per_page: 8 }) : Promise.resolve([]),
      kitchenStorageCat ? client.fetchProducts({ category: kitchenStorageCat.id, per_page: 8 }) : Promise.resolve([])
    ]);

    const bestSellers = bestSellersRaw.map(mapWooProduct);
    const trendingNow = trendingRaw.map(mapWooProduct);
    const furniture = furnitureRaw.map(mapWooProduct);
    const kitchen = kitchenRaw.map(mapWooProduct);

    // Save specific rows globally
    window.KawachiBestSellers = bestSellers;
    window.KawachiTrendingNow = trendingNow;
    window.KawachiFurniture = furniture;
    window.KawachiKitchen = kitchen;

    // Combine and deduplicate for search and general loops
    const allProducts = [
      ...bestSellers,
      ...trendingNow,
      ...furniture,
      ...kitchen
    ];

    const uniqueProducts = allProducts.filter((p, index, self) => 
      self.findIndex(t => t.id === p.id) === index
    );

    window.KawachiProducts = uniqueProducts;
    console.log(`[WooCommerce REST Client] Loaded dynamic product rows successfully. Unique count: ${uniqueProducts.length}`);
    return uniqueProducts;
  } catch (error) {
    console.error('[WooCommerce REST Client] Dynamic loading failed:', error);
    window.KawachiProducts = [];
    return [];
  }
}

// Start products retrieval immediately on script parse
window.KawachiProductsPromise = loadLiveWooCommerceProducts();

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

    let targetUrl = this.useProxy
      ? `/api/wc-proxy?endpoint=${encodeURIComponent(endpoint)}`
      : `${this.baseUrl}/wp-json/wc/v3${endpoint}`;

    // Standard authorization headers setup
    const headers = new Headers(options.headers || {});
    headers.set('Content-Type', 'application/json');

    // WooCommerce REST API: pass consumer_key and consumer_secret in the URL query parameters
    // directly instead of using Authorization headers to prevent server-level header stripping.
    if (!this.useProxy) {
      const separator = targetUrl.includes('?') ? '&' : '?';
      targetUrl = `${targetUrl}${separator}consumer_key=${this.consumerKey}&consumer_secret=${this.consumerSecret}`;
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
      return items || [];
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
          <tr class="empty-cart-row"><td colspan="6" style="text-align: center; padding: 48px; color: var(--color-text-muted);">Your cart is currently empty.</td></tr>
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
      
      const cartMobileTotal = document.getElementById("cart-mobile-total-val");
      if (cartMobileTotal) {
        cartMobileTotal.textContent = formatRupees(subtotal);
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
        <div class="order-review-row" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px dashed #e2e8f0; border-top: none;">
          <div style="display: flex; flex-direction: column; gap: 4px; text-align: left;">
            <span style="font-weight: 600; color: #1e293b; font-size: 14px; display: block; line-height: 1.4;">${item.name}</span>
            <span style="font-size: 12px; color: #64748b;">Qty: ${item.quantity} &times; ${formatRupees(item.price)}</span>
          </div>
          <span style="font-weight: 700; color: #003366; font-size: 14px; white-space: nowrap;">${formatRupees(item.price * item.quantity)}</span>
        </div>
      `).join("");

      orderReviewTable.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 2px;">
          ${itemsHtml}
        </div>
        
        <div style="margin-top: 16px; display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; justify-content: space-between; font-size: 13px; color: #64748b;">
            <span>Subtotal</span>
            <span style="font-weight: 600; color: #334155;">${formatRupees(subtotal)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 13px; color: #64748b;">
            <span>Shipping</span>
            <span style="font-weight: 600; color: #16a34a;">Free Shipping</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 13px; color: #64748b; padding-bottom: 12px; border-bottom: 1px solid #e2e8f0;">
            <span>Estimated Tax (8%)</span>
            <span style="font-weight: 600; color: #334155;">${formatRupees(tax)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: 800; color: #003366; padding-top: 6px;">
            <span>Total Due</span>
            <span>${formatRupees(subtotal + tax)}</span>
          </div>
        </div>
      `;
    }
    // ---- Update Sticky Cart Panel (persists across all pages like Amazon) ----
    const panel = document.getElementById('kawachi-sticky-cart-panel');
    if (panel) {
      const totalItems = this.items.reduce((s, i) => s + i.quantity, 0);
      if (this.items.length === 0) {
        panel.style.display = 'none';
      } else {
        panel.style.display = 'block';

        const scpSubtotal = document.getElementById('scp-subtotal');
        const scpBadge = document.getElementById('scp-badge');
        const scpBuyBtn = document.getElementById('scp-buy-btn');
        const scpItemsContainer = document.getElementById('scp-items-container');

        if (scpSubtotal) {
          scpSubtotal.textContent = formatRupees(subtotal);
        }
        if (scpBadge) {
          scpBadge.textContent = totalItems;
        }
        if (scpBuyBtn) {
          scpBuyBtn.setAttribute('aria-label', `Proceed to Buy (${totalItems} items)`);
        }

        if (scpItemsContainer) {
          scpItemsContainer.innerHTML = this.items.map(item => `
            <div class="scp-item-wrapper" style="position:relative;cursor:pointer;">
              <!-- Thumbnail -->
              <div style="position:relative;width:52px;height:52px;background:#fff;border-radius:6px;border:1.5px solid #e2e8f0;display:flex;align-items:center;justify-content:center;padding:2px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
                <img src="${item.image}" alt="${item.name}" style="max-width:100%;max-height:100%;object-fit:contain;">
                <span style="position:absolute;bottom:-5px;right:-5px;background:#e05e3f;color:#fff;font-size:9px;font-weight:700;border-radius:50%;width:16px;height:16px;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 3px rgba(0,0,0,0.2);">${item.quantity}</span>
              </div>
              
              <!-- Hover Card -->
              <div class="scp-hover-card" style="display:none;position:absolute;right:66px;top:50%;transform:translateY(-50%);width:210px;background:#fff;border:1px solid #d5d9d9;border-radius:8px;box-shadow:-4px 4px 16px rgba(0,0,0,0.15);padding:12px;z-index:10000;color:#0f1111;text-align:left;">
                <div style="font-size:11px;font-weight:700;line-height:1.3;margin-bottom:6px;color:#0f1111;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${item.name}</div>
                <div style="font-size:12px;font-weight:800;color:#B12704;margin-bottom:8px;">${formatRupees(item.price)}</div>
                
                <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
                  <!-- Qty controls -->
                  <div style="display:flex;align-items:center;border:1px solid #d5d9d9;border-radius:4px;overflow:hidden;height:24px;">
                    <button onclick="window.KawachiCart.updateQty(${item.id}, ${item.quantity - 1}); event.stopPropagation();" style="width:22px;height:100%;border:none;background:#f0f2f2;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:12px;">&minus;</button>
                    <span style="font-size:11px;font-weight:700;min-width:18px;text-align:center;color:#0f1111;">${item.quantity}</span>
                    <button onclick="window.KawachiCart.updateQty(${item.id}, ${item.quantity + 1}); event.stopPropagation();" style="width:22px;height:100%;border:none;background:#f0f2f2;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:12px;">&plus;</button>
                  </div>
                  
                  <!-- Remove button -->
                  <button onclick="window.KawachiCart.removeItem(${item.id}); event.stopPropagation();" style="border:none;background:transparent;color:#007185;font-size:10.5px;font-weight:600;cursor:pointer;padding:4px 0;transition:color 0.15s;" onmouseover="this.style.color='#C7511F'" onmouseout="this.style.color='#007185'">Remove</button>
                </div>
              </div>
            </div>
          `).join('');
        }
      }
    }
  }
}

// Instantiate globally
window.KawachiCart = new CartSystem();

// Inject the sticky cart panel HTML into every page, then sync
function injectStickyCartPanel() {
  if (document.getElementById('kawachi-sticky-cart-panel')) return; // already injected

  if (!document.getElementById('kawachi-scp-style')) {
    const style = document.createElement('style');
    style.id = 'kawachi-scp-style';
    style.textContent = `
      .scp-item-wrapper:hover .scp-hover-card {
        display: block !important;
      }
      .scp-item-wrapper::after {
        content: '';
        position: absolute;
        right: 52px;
        top: 0;
        bottom: 0;
        width: 16px;
        display: block;
      }
      @media (max-width: 768px) {
        #kawachi-sticky-cart-panel {
          display: none !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  const panel = document.createElement('div');
  panel.id = 'kawachi-sticky-cart-panel';
  panel.setAttribute('aria-label', 'Cart Summary');
  panel.style.cssText = [
    'display:none',
    'position:fixed',
    'top:0',
    'right:0',
    'bottom:0',
    'width:90px',
    'background:#232F3E',
    'border-left:1px solid #131A22',
    'box-shadow:-4px 0 20px rgba(0,0,0,0.25)',
    'z-index:9999',
    'font-family:inherit',
    'transition:transform 0.3s ease,opacity 0.3s ease',
    'box-sizing:border-box'
  ].join(';');

  panel.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:space-between;height:100%;padding:20px 8px;box-sizing:border-box;">
      <!-- Top Section -->
      <div style="width:100%;display:flex;flex-direction:column;align-items:center;">
        <a href="cart.html" style="position:relative;display:flex;flex-direction:column;align-items:center;text-decoration:none;color:#fff;margin-bottom:16px;" aria-label="View Shopping Cart">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" stroke="#FFFFFF" stroke-width="1.8"></path>
            <path d="M9 19c2 1.5 5 1.5 7 0" stroke="#00E5FF" stroke-width="2" stroke-linecap="round"></path>
            <circle cx="9" cy="21" r="1" fill="#00E5FF" stroke="#00E5FF"></circle>
            <circle cx="20" cy="21" r="1" fill="#00E5FF" stroke="#00E5FF"></circle>
          </svg>
          <span id="scp-badge" style="position:absolute;top:-6px;right:-8px;background:#FF2D55;color:#fff;font-size:9.5px;font-weight:700;border-radius:10px;padding:1px 5px;border:1px solid #232F3E;min-width:14px;text-align:center;">0</span>
          <span style="font-size:10px;font-weight:600;color:#a1a1aa;margin-top:4px;">Cart</span>
        </a>
        <div style="text-align:center;border-bottom:1px solid rgba(255,255,255,0.15);width:100%;padding-bottom:12px;margin-bottom:12px;">
          <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.5px;color:#a1a1aa;font-weight:600;">Subtotal</div>
          <div id="scp-subtotal" style="font-size:13px;font-weight:800;color:#10B981;margin-top:2px;">&#8377;0</div>
        </div>
      </div>

      <!-- Middle Section: Scrollable Items -->
      <div id="scp-items-container" style="flex:1;width:100%;overflow-y:auto;display:flex;flex-direction:column;align-items:center;gap:14px;scrollbar-width:none;margin-bottom:16px;">
      </div>

      <!-- Bottom Section -->
      <div style="display:flex;flex-direction:column;gap:10px;align-items:center;width:100%;border-top:1px solid rgba(255,255,255,0.15);padding-top:12px;">
        <a href="checkout.html" id="scp-buy-btn" style="display:flex;flex-direction:column;align-items:center;justify-content:center;background:#e05e3f;color:#fff;width:68px;height:68px;border-radius:50%;text-decoration:none;font-weight:700;font-size:10px;text-align:center;box-shadow:0 4px 10px rgba(224,94,63,0.35);transition:transform 0.2s,background 0.2s;line-height:1.2;padding:4px;box-sizing:border-box;">
          <span>Buy<br>Now</span>
        </a>
        <a href="cart.html" style="display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.1);color:#fff;width:68px;padding:7px 0;border-radius:4px;text-decoration:none;font-weight:600;font-size:9.5px;border:1px solid rgba(255,255,255,0.2);transition:background 0.2s;text-align:center;">
          Edit Cart
        </a>
      </div>
    </div>
  `;

  document.body.appendChild(panel);

  // Sync immediately after injection
  if (window.KawachiCart) window.KawachiCart.syncUI();
}

window.KawachiProducts = [];
/*
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
    orders_count: 790,
    featured: false
  }
*/

// window.KawachiProducts is fully driven by the WooCommerce REST API database catalog fetch.
// The static placeholder JSON mock database has been entirely removed to ensure pure dynamic state.
window.KawachiProducts = [];

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

      // Hydrate price — always include ₹ symbol
      const priceFormatted = '₹' + Number(product.price).toLocaleString('en-IN');
      const priceDisplay = document.getElementById("p-price-display");
      if (priceDisplay) priceDisplay.textContent = priceFormatted;
      const priceDisplayLarge = document.getElementById("p-price-display-large");
      if (priceDisplayLarge) priceDisplayLarge.textContent = Number(product.price).toLocaleString('en-IN');
      const purchaseWidgetPrice = document.getElementById("purchase-widget-price");
      if (purchaseWidgetPrice) purchaseWidgetPrice.textContent = priceFormatted;
      
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
      } else if (categoryKeywords.includes("study") || categoryKeywords.includes("office") || product.name.toLowerCase().includes("desk") || /\btable\b/i.test(product.name)) {
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

      // Render attributes/variations dynamically from WooCommerce if available
      const variationSections = document.querySelectorAll(".variation-section");
      variationSections.forEach(sec => {
        if (product.attributes && product.attributes.length > 0) {
          sec.style.display = "block";
          const label = sec.querySelector("label");
          const container = sec.querySelector("div");
          
          if (label && container) {
            const attr = product.attributes[0];
            label.textContent = `Select ${attr.name}:`;
            
            container.innerHTML = attr.options.map((opt, idx) => {
              const isActive = idx === 0 ? "active" : "";
              const activeStyle = idx === 0 ? "border: 1px solid #007185; background: #E7F4F5; color: #0F1111;" : "";
              return `
                <button class="btn btn-secondary ${isActive}" style="padding: 8px 16px; font-size: 12px; font-weight: 700; border-radius: 4px; ${activeStyle}">${opt}</button>
              `;
            }).join("");

            // Add click listeners to switch variations
            const buttons = container.querySelectorAll("button");
            buttons.forEach(btn => {
              btn.addEventListener("click", () => {
                buttons.forEach(b => {
                  b.classList.remove("active");
                  b.style.border = "";
                  b.style.background = "";
                  b.style.color = "";
                });
                btn.classList.add("active");
                btn.style.border = "1px solid #007185";
                btn.style.background = "#E7F4F5";
                btn.style.color = "#0F1111";
              });
            });
          }
        } else {
          sec.style.display = "none";
        }
      });

      // Hydrate SKU
      const skuEl = document.getElementById("meta-sku");
      if (skuEl) skuEl.textContent = `KW-${product.category.toUpperCase().replace(/[^A-Z0-9]/g, '')}-${product.id}`;

      // Build rich custom gallery for all products depending on WooCommerce images
      const thumbnailRow = document.querySelector(".thumbnail-row");
      if (thumbnailRow) {
        let galleryImages = [];
        if (product.images && product.images.length > 0) {
          galleryImages = product.images.map(img => img.src);
        } else if (product.image) {
          galleryImages = [product.image];
        } else {
          galleryImages = ["https://via.placeholder.com/600/ffffff/0f172a?text=No+Image"];
        }

        thumbnailRow.innerHTML = galleryImages.map((imgUrl, index) => `
          <div class="thumb-item ${index === 0 ? 'active' : ''}" data-img-url="${imgUrl}">
            <img src="${imgUrl}" alt="${product.name} Thumbnail ${index + 1}">
          </div>
        `).join('');

        // Thumbnail switcher logic
        const thumbs = thumbnailRow.querySelectorAll(".thumb-item");
        thumbs.forEach(thumb => {
          const selectImage = () => {
            thumbs.forEach(t => t.classList.remove("active"));
            thumb.classList.add("active");
            mainImg.src = thumb.getAttribute("data-img-url");
          };
          thumb.addEventListener("mouseenter", selectImage);
          thumb.addEventListener("click", selectImage);
        });
      }

      // Hydrate direct marketplace purchase buttons (Amazon navy #232F3E + Flipkart blue)
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
      if (stickyTitle) stickyTitle.textContent = product.name;      // Dynamic Influencer Video Reviews Mapping
      const productVideos = {
        104: {
          videoSrc: "https://assets.mixkit.co/videos/preview/mixkit-woman-enjoying-a-sauna-session-40019-large.mp4",
          title: "Sauna Box experience by @wellness_guru",
          desc: "A detailed review showing how to set up the 2-liter steam pot, remote control settings, and the general comfort of the portable folding chair. Highly recommended for daily relaxation and detoxing!"
        },
        101: {
          videoSrc: "https://assets.mixkit.co/videos/preview/mixkit-freelancer-woman-working-on-a-laptop-42323-large.mp4",
          title: "Smart Bed Desk demonstration by @tech_spaces",
          desc: "Showing the device slots, heavy-duty build, and portable folding legs. Perfect for working from home in bed or on the sofa."
        },
        105: {
          videoSrc: "https://assets.mixkit.co/videos/preview/mixkit-woman-sitting-on-a-cushion-meditating-41586-large.mp4",
          title: "Meditation Chair posture review by @body_mind_spirit",
          desc: "A review focusing on physical posture support, the 5 adjustable backrest angles, and fabric durability during daily meditation sessions."
        },
        102: {
          videoSrc: "https://assets.mixkit.co/videos/preview/mixkit-chef-preparing-a-fresh-salad-41617-large.mp4",
          title: "Kitchen storage rack organization hacks by @kitchen_pro",
          desc: "Demonstrating load capacity, spacing for microwaves and spices, and mesh basket features for optimal kitchen de-cluttering."
        }
      };

      // Hydrate product video showcase (9:16 portrait, auto-plays muted)
      const videoSection = document.getElementById("detail-video-section");
      if (videoSection) {
        const videoData = productVideos[product.id];
        if (videoData) {
          const videoElement = document.getElementById("product-video-element");
          const videoTitle = document.getElementById("product-video-title");
          const videoDesc = document.getElementById("product-video-desc");

          if (videoElement) {
            videoElement.src = videoData.videoSrc;
            // Auto-play muted (portrait reel style)
            videoElement.play().catch(() => {});
          }
          if (videoTitle) videoTitle.textContent = videoData.title;
          if (videoDesc) videoDesc.textContent = videoData.desc;

          videoSection.style.display = "block";
        } else {
          videoSection.style.display = "none";
        }
      }

      // Initialize Main Image Hover Zoom Lens Effect
      initImageZoom();

      // Hydrate trending products strip ("You May Also Like")
      const trendingStrip = document.getElementById("detail-trending-strip");
      const trendingGrid = document.getElementById("detail-trending-products");
      if (trendingStrip && trendingGrid && window.KawachiProducts) {
        const related = window.KawachiProducts
          .filter(p => p.id !== product.id)
          .sort((a, b) => (b.weekly_sales || 0) - (a.weekly_sales || 0))
          .slice(0, 8);
        if (related.length > 0) {
          trendingGrid.innerHTML = related.map(p => {
            const disc = p.regular_price && p.regular_price > p.price
              ? Math.round(((p.regular_price - p.price) / p.regular_price) * 100)
              : null;
            return `
              <a href="single-product.html?id=${p.id}" style="flex-shrink:0;width:140px;background:#fff;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;text-decoration:none;color:inherit;transition:box-shadow 0.2s,transform 0.2s;" onmouseover="this.style.transform='translateY(-3px)';this.style.boxShadow='0 8px 18px rgba(0,0,0,0.09)'" onmouseout="this.style.transform='';this.style.boxShadow=''">
                <div style="aspect-ratio:1;background:#f8fafc;display:flex;align-items:center;justify-content:center;padding:10px;position:relative;">
                  ${disc ? `<span style="position:absolute;top:6px;left:6px;background:#CC0C39;color:#fff;font-size:10px;font-weight:700;padding:2px 5px;border-radius:3px;">-${disc}%</span>` : ''}
                  <img src="${p.image}" alt="${p.name}" style="max-width:100%;max-height:100%;object-fit:contain;">
                </div>
                <div style="padding:8px;">
                  <p style="font-size:11.5px;font-weight:600;color:#0f1111;line-height:1.3;margin:0 0 4px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${p.name}</p>
                  <span style="font-size:13px;font-weight:700;color:#0f1111;">&#8377;${Number(p.price).toLocaleString('en-IN')}</span>
                </div>
              </a>`;
          }).join('');
          trendingStrip.style.display = 'block';
        }
      }
    }
  }
}

function initImageZoom() {
  const container = document.querySelector(".main-image-container");
  const img = document.getElementById("gallery-main-img");
  const lens = document.getElementById("zoom-lens");
  const result = document.getElementById("zoom-result");
  const resultImg = document.getElementById("zoom-result-img");

  if (!container || !img || !lens || !result || !resultImg) return;

  let clickZoomed = false;

  // Sync result image src with main image (and keep in sync on thumbnail changes)
  function syncResultSrc() {
    resultImg.src = img.src;
    // Reset zoom image size so it will be recalculated on next mouseenter
    resultImg.style.width = "";
    resultImg.style.height = "";
    
    // Auto-reset click zoom state when swapping images
    if (clickZoomed) {
      clickZoomed = false;
      img.style.transform = "scale(1) translate(0, 0)";
      img.style.zIndex = "1";
      img.style.cursor = "zoom-in";
      container.style.overflow = "hidden";
    }
  }
  syncResultSrc();

  const observer = new MutationObserver(syncResultSrc);
  observer.observe(img, { attributes: true, attributeFilter: ["src"] });

  function updateZoomImageSize() {
    const imgRect = img.getBoundingClientRect();
    const renderedW = imgRect.width;
    const renderedH = imgRect.height;

    if (renderedW === 0 || renderedH === 0) return;

    const resultW = result.offsetWidth;
    const resultH = result.offsetHeight;

    const cx = resultW / lens.offsetWidth;
    const cy = resultH / lens.offsetHeight;

    resultImg.style.width = (renderedW * cx) + "px";
    resultImg.style.height = (renderedH * cy) + "px";
  }

  container.addEventListener("mouseenter", () => {
    if (window.innerWidth <= 768) return;
    lens.style.display = "block";
    result.style.display = "block";
    updateZoomImageSize();
  });

  container.addEventListener("mouseleave", () => {
    lens.style.display = "none";
    result.style.display = "none";
  });

  container.addEventListener("mousemove", (e) => {
    if (window.innerWidth <= 768) return;
    e.preventDefault();

    const imgRect = img.getBoundingClientRect();

    let x = e.clientX - imgRect.left;
    let y = e.clientY - imgRect.top;

    x = Math.max(0, Math.min(x, imgRect.width));
    y = Math.max(0, Math.min(y, imgRect.height));

    const lensHalfW = lens.offsetWidth / 2;
    const lensHalfH = lens.offsetHeight / 2;

    let lensX = x - lensHalfW;
    let lensY = y - lensHalfH;
    if (lensX < 0) lensX = 0;
    if (lensX > imgRect.width - lens.offsetWidth) lensX = imgRect.width - lens.offsetWidth;
    if (lensY < 0) lensY = 0;
    if (lensY > imgRect.height - lens.offsetHeight) lensY = imgRect.height - lens.offsetHeight;

    lens.style.left = (img.offsetLeft + lensX) + "px";
    lens.style.top  = (img.offsetTop  + lensY) + "px";

    const cx = result.offsetWidth  / lens.offsetWidth;
    const cy = result.offsetHeight / lens.offsetHeight;

    resultImg.style.left = "-" + (lensX * cx) + "px";
    resultImg.style.top  = "-" + (lensY * cy) + "px";
  });

  // Mobile Pinch-to-Zoom & Pan Gesture Handler
  let initialDistance = 0;
  let initialMidX = 0;
  let initialMidY = 0;
  let isPinching = false;

  img.addEventListener("touchstart", (e) => {
    if (window.innerWidth > 768) return;
    if (e.touches.length === 2) {
      isPinching = true;
      initialDistance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      initialMidX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      initialMidY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      img.style.transition = "none";
    }
  });

  img.addEventListener("touchmove", (e) => {
    if (window.innerWidth > 768) return;
    if (isPinching && e.touches.length === 2) {
      e.preventDefault(); // Prevent native page scrolling while zooming
      const currentDistance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const currentMidX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const currentMidY = (e.touches[0].clientY + e.touches[1].clientY) / 2;

      if (initialDistance > 0) {
        let scale = currentDistance / initialDistance;
        // Clamp scale between 1x and 3.5x
        scale = Math.max(1, Math.min(scale, 3.5));
        
        // Calculate translation displacement (panning)
        const panX = currentMidX - initialMidX;
        const panY = currentMidY - initialMidY;

        img.style.transform = `scale(${scale}) translate(${panX / scale}px, ${panY / scale}px)`;
        img.style.zIndex = scale > 1 ? "100" : "1";
        container.style.overflow = scale > 1 ? "visible" : "hidden";
      }
    }
  });

  const resetZoom = () => {
    if (isPinching) {
      isPinching = false;
      initialDistance = 0;
      initialMidX = 0;
      initialMidY = 0;
      img.style.transition = "transform 0.25s ease-out";
      img.style.transform = "scale(1) translate(0, 0)";
      img.style.zIndex = "1";
      setTimeout(() => {
        container.style.overflow = "hidden";
      }, 250);
    }
  };

  img.addEventListener("touchend", resetZoom);
  img.addEventListener("touchcancel", resetZoom);

  // Mobile Click-to-Zoom Toggle Handler
  img.addEventListener("click", (e) => {
    if (window.innerWidth > 768) return;
    
    // Ignore click events if they were part of a pinch gesture
    if (isPinching) return;

    clickZoomed = !clickZoomed;
    if (clickZoomed) {
      img.style.transition = "transform 0.25s ease-out";
      img.style.transform = "scale(2.5)";
      img.style.zIndex = "100";
      container.style.overflow = "auto";
      img.style.cursor = "zoom-out";
      
      // Auto-scroll parent container to center the enlarged image
      setTimeout(() => {
        container.scrollLeft = (img.offsetWidth * 2.5 - container.offsetWidth) / 2;
        container.scrollTop = (img.offsetHeight * 2.5 - container.offsetHeight) / 2;
      }, 50);
    } else {
      img.style.transition = "transform 0.25s ease-out";
      img.style.transform = "scale(1) translate(0, 0)";
      img.style.zIndex = "1";
      img.style.cursor = "zoom-in";
      setTimeout(() => {
        container.style.overflow = "hidden";
      }, 250);
    }
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

function syncSubNavbarCategoryLinks() {
  const container = document.querySelector(".sub-nav-left");
  if (!container) return;

  container.innerHTML = `
    <a href="index.html" class="sub-nav-link" style="display: inline-flex; align-items: center; gap: 4px;">
      <strong>Home</strong>
    </a>
    <a href="search.html?q=Furniture" class="sub-nav-link">Furniture</a>
    <a href="search.html?q=Kitchen" class="sub-nav-link">Kitchen</a>
    <a href="search.html?q=Storage" class="sub-nav-link">Storage</a>
    <a href="search.html?q=Hot" class="sub-nav-link">Hot</a>
    <a href="search.html?q=Office" class="sub-nav-link">Office</a>
    <a href="search.html?q=new" class="sub-nav-link">New Arrivals</a>
    <a href="index.html#deals-of-the-day" class="sub-nav-link highlighted-link">Deals</a>
    <a href="contact.html?type=bulk" class="sub-nav-link">Bulk Orders</a>
  `;
}

function syncHeaderUtilitiesAndIcons() {
  const container = document.querySelector(".header-utilities");
  if (!container) return;

  // 1. Wishlist Link
  const wishlistLink = container.querySelector('a[href*="wishlist"]');
  if (wishlistLink) {
    const svg = wishlistLink.querySelector("svg");
    if (svg) {
      svg.outerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
        </svg>
      `;
    }
  }

  // 2. Account Link
  const accountLink = container.querySelector('a[href*="account"], a[href*="support-center"], a[href*="profile"]');
  if (accountLink) {
    const svg = accountLink.querySelector("svg");
    if (svg) {
      svg.outerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="8" r="5"></circle>
          <path d="M20 21a8 8 0 0 0-16 0"></path>
        </svg>
      `;
    }
  }

  // 3. Orders & Returns Link
  const ordersLink = container.querySelector('a[href*="orders"], a[href*="returns"]');
  if (ordersLink) {
    const svg = ordersLink.querySelector("svg");
    if (svg) {
      svg.outerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 8v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8"></path>
          <path d="M21 8H3V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          <path d="M8 14h6a2 2 0 0 0 2-2v0a2 2 0 0 0-2-2H9.5"></path>
          <polyline points="11.5 8 9.5 10 11.5 12"></polyline>
        </svg>
      `;
    }
  }

  // 4. Cart Link / Button
  const cartTrigger = document.getElementById("cart-drawer-trigger");
  if (cartTrigger) {
    const svg = cartTrigger.querySelector("svg");
    if (svg) {
      svg.outerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="9" cy="21" r="1"></circle>
          <circle cx="20" cy="21" r="1"></circle>
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
        </svg>
      `;
    }
  }
}

// ==========================================================================
// WordPress REST API Custom ACF Homepage Integration Settings
// ==========================================================================
window.renderHeroBanners = function(banners) {
  const track = document.getElementById("hero-slides-track");
  const dots = document.getElementById("hero-dots-indicator");
  if (!track || !banners || !banners.length) return;

  track.innerHTML = banners.map((b, idx) => {
    const desktopImg = b.desktop_image || b.banner_image;
    const mobileImg = b.mobile_image || desktopImg;
    return `
      <a href="${b.banner_link || '#'}" draggable="false" class="carousel-slide ${idx === 0 ? 'slide-active' : ''}" data-link="${b.banner_link || '#'}" style="cursor: pointer; height: 100%; position: relative; width: 100%; overflow: hidden; display: flex; align-items: center; justify-content: center; text-decoration: none;">
        <picture style="width: 100%; height: 100%; display: block;">
          <source media="(max-width: 768px)" srcset="${mobileImg}">
          <img src="${desktopImg}" alt="Hero Slide ${idx + 1}" draggable="false" style="width: 100%; height: 100%; object-fit: fill; display: block;">
        </picture>
      </a>
    `;
  }).join("");

  if (dots) {
    dots.innerHTML = banners.map((_, idx) => `
      <span class="carousel-dot-indicator ${idx === 0 ? 'dot-active' : ''}" data-slide-index="${idx}"></span>
    `).join("");
  }

  // Re-initialize hero carousel controls to bind dynamic slides
  if (window.initHeroCarousel) {
    window.initHeroCarousel();
  }
};

window.renderShoppableVideos = function(videos) {
  const track = document.getElementById("video-spotlight-track");
  if (!track || !videos || !videos.length) return;

  const cardsHtml = videos.map(videoData => {
    const productId = parseInt(videoData.linked_product, 10) || "";
    const videoSrc = videoData.video_url;
    if (!videoSrc) return "";

    const influencer = videoData.influencer || "@kawachi_live";
    const title = videoData.title || "Customer Review";
    
    // Automatically extract YouTube thumbnails if available, otherwise use premium generic fallback
    let thumbnail = "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=600&q=80"; 
    if (videoSrc.includes("youtube.com") || videoSrc.includes("youtu.be")) {
      let videoId = "";
      if (videoSrc.includes("watch?v=")) videoId = videoSrc.split("v=")[1].split("&")[0];
      else if (videoSrc.includes("youtu.be/")) videoId = videoSrc.split("youtu.be/")[1].split("?")[0];
      else if (videoSrc.includes("/embed/")) videoId = videoSrc.split("/embed/")[1].split("?")[0];
      if (videoId) thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    }

    return `
      <div class="video-card-wrap">
        <div class="video-card" data-product-id="${productId}" data-influencer="${influencer}" data-title="${title}" data-video-src="${videoSrc}" data-product-name="Click to view details" data-product-price="" data-product-image="${thumbnail}">
          <img src="${thumbnail}" alt="${title}" style="width:100%;height:100%;object-fit:cover;position:absolute;top:0;left:0;">
          <div class="video-play-btn-circle"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></div>
        </div>
        <div class="video-card-caption">
          <p class="vc-product-name">${title}</p>
          <span class="vc-views">
            <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            Click to watch
          </span>
        </div>
      </div>
    `;
  }).join("");

  track.innerHTML = cardsHtml;
};

window.renderPromoBanners = function(banners) {
  const row = document.getElementById("promo-banners-row");
  if (!row || !banners || !banners.length) return;

  row.innerHTML = banners.map((b, idx) => {
    const gradients = [
      'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
      'linear-gradient(135deg, #e65c00 0%, #f9d423 100%)',
      'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)'
    ];
    const gradient = gradients[idx % gradients.length];
    
    // Extract dynamic texts configured by the owner in the WordPress options panel
    const badge = b.badge_tag || b.promo_badge || "OFFER";
    const title = b.title || b.promo_title || "Deal Spotlight";
    const text = b.text || b.promo_text || "Featured Choice";

    return `
      <div class="promo-box-triple" style="background: ${gradient}; color: #ffffff;">
        <div class="promo-box-left">
          <span class="promo-badge-tag">${badge}</span>
          <h3 class="promo-title">${title}</h3>
          <p class="promo-text">${text}</p>
          <a href="${b.banner_link || '#'}" class="promo-btn-white" style="text-decoration: none;">Shop Now &rarr;</a>
        </div>
        <div class="promo-box-right">
          <img src="${b.banner_image}" alt="Promo Banner" style="object-fit: contain;">
        </div>
      </div>
    `;
  }).join("");
};

window.loadHomepageACFSettings = async function() {
  try {
    const env = await loadEnv();
    let apiUrl = "http://62.72.31.43/wp-json/wc/v3";
    let consumerKey = "";
    let consumerSecret = "";
    if (env) {
      if (env.VITE_WOO_API_URL) apiUrl = env.VITE_WOO_API_URL;
      if (env.VITE_WOO_CONSUMER_KEY) consumerKey = env.VITE_WOO_CONSUMER_KEY;
      if (env.VITE_WOO_CONSUMER_SECRET) consumerSecret = env.VITE_WOO_CONSUMER_SECRET;
    }
    const cleanBaseUrl = apiUrl.replace(/\/wp-json\/wc\/v3\/?$/, '').replace(/\/$/, '');
    
    // We will query the standard WordPress Pages API first for slug 'home'
    const pagesUrl = `${cleanBaseUrl}/wp-json/wp/v2/pages?slug=home`;
    const url = new URL(pagesUrl);
    if (consumerKey && consumerSecret) {
      url.searchParams.append("consumer_key", consumerKey);
      url.searchParams.append("consumer_secret", consumerSecret);
    }

    console.log(`[ACF Settings Client] Fetching standard WordPress page data from: ${url.pathname}`);
    let pages = [];
    try {
      const response = await fetch(url.toString());
      if (response.ok) {
        pages = await response.json();
        console.log(`[ACF Settings Client] Raw Pages API Response (slug=home):`, pages);
      }
    } catch (err) {
      console.warn("[ACF Settings Client] Standard Pages API request failed:", err);
    }

    let acfData = null;
    if (pages && pages.length > 0) {
      const homePage = pages[0];
      if (homePage.acf) {
        acfData = homePage.acf;
        console.log(`[ACF Settings Client] Extracted ACF fields from Home page object:`, acfData);
      }
    }

    // Fallback: if pages API doesn't return ACF fields, query our custom endpoint
    if (!acfData) {
      const customUrl = new URL(`${cleanBaseUrl}/wp-json/custom/v1/homepage`);
      if (consumerKey && consumerSecret) {
        customUrl.searchParams.append("consumer_key", consumerKey);
        customUrl.searchParams.append("consumer_secret", consumerSecret);
      }
      console.log(`[ACF Settings Client] Fallback: Fetching from custom endpoint: ${customUrl.pathname}`);
      try {
        const customResp = await fetch(customUrl.toString());
        if (customResp.ok) {
          acfData = await customResp.json();
          console.log(`[ACF Settings Client] Raw Custom Endpoint Response:`, acfData);
        }
      } catch (err) {
        console.warn("[ACF Settings Client] Custom endpoint fallback failed:", err);
      }
    }

    if (acfData) {
      // Collect dynamic banners: top_banner_1, top_banner_2, top_banner_3
      const pageBanners = [];
      if (acfData.top_banner_1) pageBanners.push(acfData.top_banner_1);
      if (acfData.top_banner_2) pageBanners.push(acfData.top_banner_2);
      if (acfData.top_banner_3) pageBanners.push(acfData.top_banner_3);

      // Extract image URL dynamically from both raw URL string or Image Object/Array return structures
      const extractImageUrl = (field) => {
        if (!field) return "";
        if (typeof field === "string") return field;
        if (typeof field === "object") {
          if (field.url) return field.url;
          if (field.banner_image) {
            if (typeof field.banner_image === "string") return field.banner_image;
            if (field.banner_image.url) return field.banner_image.url;
          }
          if (field.sizes && field.sizes.large) return field.sizes.large;
        }
        return "";
      };

      const extractLinkUrl = (field) => {
        if (!field) return "#";
        if (typeof field === "string") return field;
        if (typeof field === "object") {
          if (field.url) return field.url;
          if (field.banner_link) {
            if (typeof field.banner_link === "string") return field.banner_link;
            if (field.banner_link.url) return field.banner_link.url;
          }
        }
        return "#";
      };

      const formattedBanners = pageBanners.map(b => ({
        desktop_image: extractImageUrl(b.desktop_image) || extractImageUrl(b.banner_image) || extractImageUrl(b),
        mobile_image: extractImageUrl(b.mobile_image) || extractImageUrl(b.banner_image_mobile) || extractImageUrl(b.banner_image) || extractImageUrl(b),
        banner_link: extractLinkUrl(b.banner_link) || extractLinkUrl(b)
      })).filter(b => b.desktop_image); // Skip empty slots dynamically!

      if (formattedBanners.length > 0) {
        console.log(`[ACF Settings Client] Rendering dynamic hero banners from page fields:`, formattedBanners);
        window.renderHeroBanners(formattedBanners);
      } else if (acfData.top_banners && acfData.top_banners.length > 0) {
        // Fallback to options page repeater top_banners
        const formattedOptions = acfData.top_banners.map(b => ({
          desktop_image: extractImageUrl(b.desktop_image) || extractImageUrl(b.banner_image) || extractImageUrl(b),
          mobile_image: extractImageUrl(b.mobile_image) || extractImageUrl(b.banner_image_mobile) || extractImageUrl(b.banner_image) || extractImageUrl(b),
          banner_link: extractLinkUrl(b.banner_link) || extractLinkUrl(b)
        })).filter(b => b.desktop_image);
        console.log(`[ACF Settings Client] Rendering dynamic hero banners from options page repeater:`, formattedOptions);
        window.renderHeroBanners(formattedOptions);
      }

      // Collect all shoppable videos dynamically from fixed slots 1 through 4 (Standard ACF)
      const dynamicVideos = [];
      for (let i = 1; i <= 4; i++) {
        const videoUrl = acfData[`video_${i}_url`];
        const videoProduct = acfData[`video_${i}_product`];
        if (videoUrl) {
          dynamicVideos.push({
            video_url: videoUrl,
            linked_product: videoProduct || "",
            title: acfData[`video_${i}_title`] || "Customer Review",
            influencer: acfData[`video_${i}_influencer`] || "@kawachi_live"
          });
        }
      }
      if (dynamicVideos.length > 0) {
        window.renderShoppableVideos(dynamicVideos);
      }

      if (acfData.promo_banners && acfData.promo_banners.length > 0) window.renderPromoBanners(acfData.promo_banners);

      // Bind global text interfaces dynamically from WordPress settings (if configured)
      if (acfData.video_spotlight_title) {
        const titleEl = document.querySelector(".video-spotlight-title");
        if (titleEl) titleEl.textContent = acfData.video_spotlight_title;
      }
      if (acfData.video_spotlight_desc) {
        const descEl = document.querySelector(".video-spotlight-desc");
        if (descEl) descEl.textContent = acfData.video_spotlight_desc;
      }
      if (acfData.transform_title) {
        const heading = document.querySelector(".spotlight-eyebrow");
        if (heading) heading.textContent = acfData.transform_title;
      }
      if (acfData.transform_text) {
        const subtitle = document.querySelector(".spotlight-subtitle");
        if (subtitle) subtitle.textContent = acfData.transform_text;
      }
    }
    return acfData;
  } catch (error) {
    console.warn('[ACF Settings Client] Failed to load dynamic settings from WordPress backend:', error);
    return null;
  }
};

// Event hooks on page load
document.addEventListener("DOMContentLoaded", async () => {
  // Unify category links in sub-navbar
  syncSubNavbarCategoryLinks();

  // Sync header utilities and icons
  syncHeaderUtilitiesAndIcons();

  // Initialize unified search bar styling wrapper
  initUnifiedSearchBar();

  // Inject persistent sticky cart panel (Amazon-style, shows when cart has items)
  injectStickyCartPanel();

  // Global listener for both standard and floating island cart drawer triggers to redirect to cart.html
  document.addEventListener("click", (e) => {
    const trigger = e.target.closest("#cart-drawer-trigger, #island-cart-trigger");
    if (trigger) {
      e.preventDefault();
      e.stopPropagation();
      window.location.href = "cart.html";
    }
  }, true);

  // Await live products connection/fetch resolution before layout rendering
  if (window.KawachiProductsPromise) {
    try {
      await window.KawachiProductsPromise;
    } catch (err) {
      console.warn("[WooCommerce Client] DOMContentLoaded wait for live catalog promise rejected:", err);
    }
  }

  // Hydrate single product page detail nodes dynamically if present
  hydrateDetailPage();

  // Hydrate custom ACF homepage options settings if on homepage
  if (document.getElementById("hero-slides-track")) {
    await window.loadHomepageACFSettings();
  }

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

  // 4. Detail page main, sticky and mobile add-to-cart triggers
  // Clicking ATC saves item to cart then REDIRECTS to cart-added.html (Amazon-style confirmation)
  const mainAtcBtn = document.getElementById("main-add-to-cart-btn");
  const stickyAtcBtn = document.getElementById("sticky-atc-trigger-btn");
  const mobileAtcBtn = document.getElementById("mobile-add-to-cart-btn");
  if (mainAtcBtn || stickyAtcBtn || mobileAtcBtn) {
    const handleDetailATC = (e) => {
      e.preventDefault();
      const name = document.querySelector(".product-title-detail").textContent;
      const priceText = document.getElementById("p-price-display").textContent;
      const price = parseFloat(priceText.replace(/[^\d.]/g, ''));
      const qty = parseInt(document.getElementById("qty-value").value || 1, 10);
      const imgEl = document.getElementById("gallery-main-img");
      const image = imgEl ? imgEl.src : "";

      const urlParams = new URLSearchParams(window.location.search);
      const currentId = parseInt(urlParams.get("id"), 10) || 101;
      const product = window.KawachiProducts.find(x => x.id === currentId);
      const category = product ? product.category : "Wellness";

      // Add item to cart
      window.KawachiCart.addItem({
        id: currentId,
        name,
        price,
        image,
        category,
        quantity: qty
      });

      // Redirect to Amazon-style cart confirmation page
      window.location.href = `cart-added.html?id=${currentId}&qty=${qty}`;
    };

    if (mainAtcBtn) mainAtcBtn.addEventListener("click", handleDetailATC);
    if (stickyAtcBtn) stickyAtcBtn.addEventListener("click", handleDetailATC);
    if (mobileAtcBtn) mobileAtcBtn.addEventListener("click", handleDetailATC);
  }

  // Buy Now button trigger
  const buyNowBtn = document.getElementById("main-buy-now-btn");
  const mobileBuyNowBtn = document.getElementById("mobile-buy-now-btn");
  if (buyNowBtn || mobileBuyNowBtn) {
    const handleBuyNow = (e) => {
      e.preventDefault();
      const name = document.querySelector(".product-title-detail").textContent;
      const priceText = document.getElementById("p-price-display").textContent;
      const price = parseFloat(priceText.replace(/[^\d.]/g, ''));
      const qty = parseInt(document.getElementById("qty-value").value || 1, 10);
      const imgEl = document.getElementById("gallery-main-img");
      const image = imgEl ? imgEl.src : "";
      
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
      
      window.location.href = "checkout.html";
    };

    if (buyNowBtn) buyNowBtn.addEventListener("click", handleBuyNow);
    if (mobileBuyNowBtn) mobileBuyNowBtn.addEventListener("click", handleBuyNow);
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
      if (currentScrollY <= 15) {
        // At the very top of the page: show header
        siteHeader.classList.remove("header-hidden");
      } else {
        // Normal scroll direction checking anywhere in the page
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
    // Secondary image switcher compatibility dynamically from WooCommerce
    const mainImg = p.image || (p.images && p.images.length > 0 ? p.images[0].src : "https://via.placeholder.com/600/ffffff/0f172a?text=No+Image");
    const hoverImg = (p.images && p.images.length > 1) ? p.images[1].src : mainImg;

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

document.addEventListener('DOMContentLoaded', async function() {
  if (window.KawachiProductsPromise) {
    try {
      await window.KawachiProductsPromise;
    } catch (err) {
      console.warn("[WooCommerce Client] DOMContentLoaded wait for live catalog promise rejected (Marquees):", err);
    }
  }
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
