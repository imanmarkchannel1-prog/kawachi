/**
 * Kawachi Headless WooCommerce - REST API Interface Client
 *
 * This module contains vanilla JS shells, client logic, and placeholders
 * designed to target WooCommerce /wp-json/wc/v3 REST API endpoints.
 */

class WooCommerceClient {
  /**
   * Initializes the WooCommerce API client connection
   * @param {Object} config - Client configuration params
   * @param {string} config.baseUrl - WordPress site URL (e.g., 'https://kawachi-store.com')
   * @param {string} config.consumerKey - WooCommerce consumer key (ck_...)
   * @param {string} config.consumerSecret - WooCommerce consumer secret (cs_...)
   * @param {boolean} config.useProxy - If true, requests are channeled through an intermediate proxy routing
   */
  constructor({
    baseUrl = "https://api.kawachigroup.com",
    consumerKey = "ck_e0bb10c03f926e6e59294b13c65712fb5ef1a872",
    consumerSecret = "cs_71d46fbb1e0197e39838a294437c61e581ece91f",
    useProxy = true,
  } = {}) {
    this.baseUrl = baseUrl;
    this.consumerKey = consumerKey;
    this.consumerSecret = consumerSecret;
    this.useProxy = useProxy;
    this.mockMode = !this.useProxy && (!this.baseUrl || !this.consumerKey); // Only fallback to mock mode if missing
  }

  /**
   * Helper utility to perform dynamic authorized fetch queries
   * @param {string} endpoint - API path (e.g., '/products')
   * @param {Object} options - Request options (headers, method, body)
   * @returns {Promise<any>}
   */
  async request(endpoint, options = {}) {
    if (this.mockMode) {
      console.warn(
        `[WooCommerce API] Operating in Mock Mode. Target endpoint: ${endpoint}`,
      );
      return this.getMockResponse(endpoint, options);
    }

    let targetUrl = this.useProxy
      ? `/api/wc-proxy?endpoint=${encodeURIComponent(endpoint)}`
      : `${this.baseUrl}/wp-json/wc/v3${endpoint}`;

    // Standard authorization headers setup
    const headers = new Headers(options.headers || {});
    headers.set("Content-Type", "application/json");

    // WooCommerce REST API: pass consumer_key and consumer_secret in the URL query parameters
    // directly instead of using Authorization headers to prevent server-level header stripping.
    if (!this.useProxy) {
      const separator = targetUrl.includes("?") ? "&" : "?";
      targetUrl = `${targetUrl}${separator}consumer_key=${this.consumerKey}&consumer_secret=${this.consumerSecret}`;
    }

    const fetchOptions = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(targetUrl, fetchOptions);
      if (!response.ok) {
        throw new Error(
          `WooCommerce REST API Error [${response.status}]: ${response.statusText}`,
        );
      }
      return await response.json();
    } catch (error) {
      console.error(
        `[WooCommerce REST Client] Fetch failed at ${endpoint}:`,
        error,
      );
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
    const endpoint = `/products${queryString ? "?" + queryString : ""}`;
    return this.request(endpoint, { method: "GET" });
  }

  /**
   * Fetches details of a single product ID
   * Endpoint: GET /wp-json/wc/v3/products/<id>
   * @param {number|string} productId
   * @returns {Promise<Object>}
   */
  async fetchProduct(productId) {
    return this.request(`/products/${productId}`, { method: "GET" });
  }

  /**
   * Fetches list of WooCommerce categories
   * Endpoint: GET /wp-json/wc/v3/products/categories
   * @param {Object} params
   * @returns {Promise<Array>}
   */
  async fetchCategories(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/products/categories${queryString ? "?" + queryString : ""}`;
    return this.request(endpoint, { method: "GET" });
  }

  /**
   * Creates a WooCommerce transaction order
   * Endpoint: POST /wp-json/wc/v3/orders
   * @param {Object} orderData - Standard WooCommerce order configuration model
   * @returns {Promise<Object>}
   */
  async createOrder(orderData) {
    return this.request("/orders", {
      method: "POST",
      body: JSON.stringify(orderData),
    });
  }

  // ==========================================================================
  // Development Mock Engine - Guarantees visual demonstration even offline
  // ==========================================================================
  getMockResponse(endpoint, options) {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (endpoint.startsWith("/products/categories")) {
          resolve([
            {
              id: 10,
              name: "Wellness",
              slug: "wellness",
              count: 12,
              image: {
                src: "https://images.unsplash.com/photo-1545205597-3d9d02c29597?q=80&w=150",
              },
            },
            {
              id: 11,
              name: "Furniture",
              slug: "furniture",
              count: 32,
              image: {
                src: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?q=80&w=150",
              },
            },
            {
              id: 12,
              name: "Smart Tech",
              slug: "smart-tech",
              count: 18,
              image: {
                src: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=150",
              },
            },
          ]);
        } else if (endpoint.startsWith("/products/")) {
          // Single product request mockup
          const id = endpoint.split("/").pop();
          resolve({
            id: parseInt(id, 10) || 101,
            name: "Premium Portable Finnish Sauna (1-Person)",
            sku: "KW-SAUNA-08",
            price: "89999.00",
            regular_price: "129999.00",
            description:
              "Indulge in deep detoxification and full-body relaxation in the comfort of your home.",
            images: [
              {
                src: "https://images.unsplash.com/photo-1545205597-3d9d02c29597?q=80&w=800",
              },
            ],
          });
        } else if (endpoint.startsWith("/products")) {
          resolve([
            {
              id: 101,
              name: "Premium Portable Finnish Sauna",
              price: "89999.00",
              regular_price: "129999.00",
              categories: [{ name: "Wellness" }],
              images: [
                {
                  src: "https://images.unsplash.com/photo-1545205597-3d9d02c29597?q=80&w=500",
                },
              ],
            },
            {
              id: 102,
              name: "Minimalist Oak Swivel Office Chair",
              price: "24999.00",
              categories: [{ name: "Furniture" }],
              images: [
                {
                  src: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?q=80&w=500",
                },
              ],
            },
            {
              id: 103,
              name: "Noise Cancelling Studio Headphones",
              price: "18999.00",
              categories: [{ name: "Gadgets" }],
              images: [
                {
                  src: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=500",
                },
              ],
            },
            {
              id: 104,
              name: "Retro Italian Countertop Espresso Machine",
              price: "32000.00",
              regular_price: "39999.00",
              categories: [{ name: "Appliances" }],
              images: [
                {
                  src: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=500",
                },
              ],
            },
          ]);
        } else if (endpoint === "/orders" && options.method === "POST") {
          resolve({
            id: 20042,
            status: "processing",
            total: "114998.00",
            currency: "INR",
            payment_method_title: "Razorpay / NetBanking",
            date_created: new Date().toISOString(),
          });
        } else {
          resolve({ message: "Mock data endpoint not mapped" });
        }
      }, 500);
    });
  }
}

// ==========================================================================
// WooCommerce Live Catalog Integration Layer (v6.20)
// ==========================================================================
const MOCK_CATALOG = [
  {
    id: 101,
    name: "Foldable Laptop Study Table",
    price: 1690,
    regular_price: 2490,
    category: "Home Furniture",
    image: "images/products/laptop_desk.png",
    images: [{ src: "images/products/laptop_desk.png" }],
    rating: "4.8",
    reviews: "128",
    sales_count: 1450,
    description: "Ultra-portable and space-saving folding table.",
  },
  {
    id: 102,
    name: "3 Tier Kitchen Storage Rack",
    price: 2099,
    regular_price: 3499,
    category: "Kitchen Storage",
    image: "images/products/kitchen_rack.png",
    images: [{ src: "images/products/kitchen_rack.png" }],
    rating: "4.7",
    reviews: "96",
    sales_count: 850,
    description: "Multi-functional kitchen shelves organizer.",
  },
  {
    id: 103,
    name: "3 Tier Utility Trolley Cart",
    price: 1899,
    regular_price: 2999,
    category: "Kitchen Storage",
    image: "images/products/trolley_organizer.png",
    images: [{ src: "images/products/trolley_organizer.png" }],
    rating: "4.6",
    reviews: "72",
    sales_count: 920,
    description: "Mobile rolling storage organizer cart with lockable wheels.",
  },
  {
    id: 104,
    name: "Portable Steam Sauna Box",
    price: 6799,
    regular_price: 9999,
    category: "Wellness",
    image: "images/products/steam_sauna.png",
    images: [{ src: "images/products/steam_sauna.png" }],
    rating: "4.9",
    reviews: "210",
    sales_count: 1890,
    description: "Personal home steam spa box for relaxation.",
  },
  {
    id: 105,
    name: "Meditation Floor Chair",
    price: 2099,
    regular_price: 2999,
    category: "Home Furniture",
    image: "images/products/meditation_chair.png",
    images: [{ src: "images/products/meditation_chair.png" }],
    rating: "4.8",
    reviews: "142",
    sales_count: 950,
    description: "Ergonomic floor seating for home posture support.",
  },
  {
    id: 106,
    name: "Decorative Wall Shelves",
    price: 1299,
    regular_price: 1999,
    category: "Home Furniture",
    image: "images/products/wall_shelves.png",
    images: [{ src: "images/products/wall_shelves.png" }],
    rating: "4.5",
    reviews: "88",
    sales_count: 420,
    description: "Sleek wood floating wall shelves for display.",
  },
  {
    id: 107,
    name: "Bedside Table with Charging",
    price: 4199,
    regular_price: 5999,
    category: "Home Furniture",
    image: "images/products/bedside_table.png",
    images: [{ src: "images/products/bedside_table.png" }],
    rating: "4.7",
    reviews: "74",
    sales_count: 510,
    description: "Smart bedside drawer with built-in USB outlets.",
  },
];

function loadMockCatalogFallback() {
  window.KawachiBestSellers = MOCK_CATALOG.filter(
    (p) => p.sales_count > 400,
  ).sort((a, b) => b.sales_count - a.sales_count);
  window.KawachiTrendingNow = [...MOCK_CATALOG].reverse().slice(0, 8);
  window.KawachiFurniture = MOCK_CATALOG.filter(
    (p) => p.category === "Home Furniture",
  );
  window.KawachiKitchen = MOCK_CATALOG.filter(
    (p) => p.category === "Kitchen Storage",
  );
  window.KawachiProducts = [...MOCK_CATALOG];
  return MOCK_CATALOG;
}

async function loadLiveWooCommerceProducts() {
  try {
    const client = new WooCommerceClient({
      useProxy: true,
    });

    console.log(
      `[WooCommerce REST Client] Fetching catalog and rows dynamically in parallel...`,
    );

    const mapWooProduct = (p) => {
      const regularPrice =
        parseFloat(p.regular_price) || parseFloat(p.price) || 0;
      const currentPrice = parseFloat(p.price) || 0;

      let demoVideoUrl = "";
      if (p.acf) {
        demoVideoUrl =
          p.acf.demo_video_url ||
          p.acf.video_url ||
          p.acf.instagram_link ||
          p.acf.social_link ||
          "";
      }
      if (!demoVideoUrl && p.meta_data) {
        const found = p.meta_data.find(
          (m) =>
            m.key === "demo_video_url" ||
            m.key === "_demo_video_url" ||
            m.key === "video_url" ||
            m.key === "_video_url" ||
            m.key === "instagram_link" ||
            m.key === "_instagram_link" ||
            m.key === "social_link" ||
            m.key === "_social_link",
        );
        if (found) demoVideoUrl = found.value;
      }

      return {
        id: p.id,
        name: p.name,
        price: currentPrice,
        regular_price: regularPrice > currentPrice ? regularPrice : null,
        category:
          p.categories && p.categories.length > 0
            ? p.categories[0].name
            : "Wellness",
        image: p.images && p.images.length > 0 ? p.images[0].src : "",
        images: p.images || [],
        attributes: p.attributes || [],
        rating: p.average_rating || "4.5",
        reviews: String(p.rating_count || 12),
        sales_count: p.total_sales || 100,
        weekly_sales: Math.round((p.total_sales || 100) / 4),
        description: p.description || p.short_description || "",
        short_description: p.short_description || "",
        featured: p.featured || false,
        tags: p.tags || [],
        stock_status: p.stock_status || "instock",
        demo_video_url: demoVideoUrl,
        meta_data: p.meta_data || [],
        acf: p.acf || null,
      };
    };

    // 1. Fetch categories first to resolve slugs to IDs dynamically
    let categories = [];
    try {
      categories = await client.fetchCategories({ per_page: 50 });
      console.log(
        `[WooCommerce REST Client] Resolved ${categories.length} categories.`,
      );
    } catch (err) {
      console.warn(
        "[WooCommerce REST Client] Failed to fetch categories:",
        err,
      );
    }

    const homeFurnitureCat = categories.find(
      (c) =>
        c.slug === "home-furniture" ||
        c.name.toLowerCase() === "home furniture",
    );
    const kitchenStorageCat = categories.find(
      (c) =>
        c.slug === "kitchen-storage" ||
        c.name.toLowerCase() === "kitchen storage" ||
        c.slug === "home-kitchen" ||
        c.name.toLowerCase().includes("kitchen"),
    );

    // 2. Fetch rows in parallel using standard WooCommerce API query params
    const [bestSellersRaw, trendingRaw, furnitureRaw, kitchenRaw, catalogRaw] =
      await Promise.all([
        client.fetchProducts({
          status: "publish",
          orderby: "popularity",
          order: "desc",
          per_page: 8,
        }),
        client.fetchProducts({
          status: "publish",
          orderby: "date",
          order: "desc",
          per_page: 8,
        }),
        homeFurnitureCat
          ? client.fetchProducts({
              status: "publish",
              category: homeFurnitureCat.id,
              per_page: 8,
            })
          : Promise.resolve([]),
        kitchenStorageCat
          ? client.fetchProducts({
              status: "publish",
              category: kitchenStorageCat.id,
              per_page: 8,
            })
          : Promise.resolve([]),
        client
          .fetchProducts({
            status: "publish",
            per_page: 100,
          })
          .catch(() => []),
      ]);

    const bestSellers = bestSellersRaw.map(mapWooProduct);
    const trendingNow = trendingRaw.map(mapWooProduct);
    const furniture = furnitureRaw.map(mapWooProduct);
    const kitchen = kitchenRaw.map(mapWooProduct);
    const catalog = catalogRaw.map(mapWooProduct);

    if (!bestSellers.length && !trendingNow.length) {
      console.warn(
        "[WooCommerce REST Client] API resolved with no catalog data. Invoking mock catalog fallback.",
      );
      return loadMockCatalogFallback();
    }

    // Combine and deduplicate for search and general loops
    const allProducts = [
      ...bestSellers,
      ...trendingNow,
      ...furniture,
      ...kitchen,
      ...catalog,
    ];

    const uniqueProducts = allProducts.filter(
      (p, index, self) => self.findIndex((t) => t.id === p.id) === index,
    );

    // Save specific rows globally with dynamic rules:
    // 1. Best Sellers: Sort by total_sales (popularity) from the catalog
    window.KawachiBestSellers = [...uniqueProducts]
      .sort((a, b) => (b.sales_count || 0) - (a.sales_count || 0))
      .slice(0, 8);

    // 2. Trending Now: Filter by 'trending' tag, otherwise select a random assortment
    const trendingTagProducts = uniqueProducts.filter(
      (p) =>
        p.tags &&
        p.tags.some(
          (t) => t.name.toLowerCase() === "trending" || t.slug === "trending",
        ),
    );
    if (trendingTagProducts.length > 0) {
      window.KawachiTrendingNow = trendingTagProducts.slice(0, 8);
    } else {
      // Random shuffle fallback
      window.KawachiTrendingNow = [...uniqueProducts]
        .sort(() => 0.5 - Math.random())
        .slice(0, 8);
    }

    // 3. Home Furniture: Filter dynamically from unique catalog based on keywords, fallback to query row
    const furnitureCategoryProducts = uniqueProducts.filter(
      (p) =>
        p.category &&
        (p.category.toLowerCase().includes("furniture") ||
          p.category.toLowerCase().includes("desk") ||
          p.category.toLowerCase().includes("table") ||
          p.category.toLowerCase().includes("chair")),
    );
    window.KawachiFurniture =
      furnitureCategoryProducts.length > 0
        ? furnitureCategoryProducts.slice(0, 8)
        : furniture;

    // 4. Kitchen Storage: Filter dynamically from unique catalog based on keywords, fallback to query row
    const kitchenCategoryProducts = uniqueProducts.filter(
      (p) =>
        p.category &&
        (p.category.toLowerCase().includes("kitchen") ||
          p.category.toLowerCase().includes("rack") ||
          p.category.toLowerCase().includes("spice") ||
          p.category.toLowerCase().includes("organizer")),
    );
    window.KawachiKitchen =
      kitchenCategoryProducts.length > 0
        ? kitchenCategoryProducts.slice(0, 8)
        : kitchen;

    window.KawachiProducts = uniqueProducts;
    console.log(
      `[WooCommerce REST Client] Loaded dynamic product rows successfully. Unique count: ${uniqueProducts.length}`,
    );
    return uniqueProducts;
  } catch (error) {
    console.error(
      "[WooCommerce REST Client] Dynamic loading failed. Using fallback catalog:",
      error,
    );
    return loadMockCatalogFallback();
  }
}

// Start products retrieval immediately after WooCommerceClient is initialized
window.KawachiProductsPromise = loadLiveWooCommerceProducts();

// ==========================================================================
// 2. Global Headless Cart System & Dynamic Formatting
// ==========================================================================

/**
 * Clean standard local formatting for Indian Rupees (₹X,XX,XXX.00)
 */
function formatRupees(amount) {
  return (
    "₹" +
    Number(amount).toLocaleString("en-IN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
  );
}

/**
 * Generates dynamic 5-star row with blue count link for cards
 */
window.getCardRatingHtml = function (rating, reviews) {
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
window.getCardPriceRowHtml = function (p) {
  const formattedPrice = formatRupees(p.price);
  const formattedRegularPrice = p.regular_price
    ? formatRupees(p.regular_price)
    : "";

  let limitedDealHtml = "";
  if (p.limited_time_deal) {
    limitedDealHtml = `<span class="limited-deal-tag" style="background-color: #CC0C39; color: #FFFFFF; padding: 3px 6px; font-size: 10px; font-weight: 700; border-radius: 2px; display: inline-block; margin-bottom: 4px; line-height: 1; align-self: flex-start; text-transform: capitalize;">Limited time deal</span>`;
  }

  let discountHtml = "";
  if (p.regular_price && p.regular_price > p.price) {
    const discountPct = Math.round(
      ((p.regular_price - p.price) / p.regular_price) * 100,
    );
    discountHtml = `<span style="color: #CC0C39; font-size: 15px; font-weight: 400; margin-right: 4px;">-${discountPct}%</span>`;
  }

  const priceParts = formattedPrice.replace("₹", "").split(".");
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
    this.key = "kawachi_cart";
    this.items = this.load();
  }

  load() {
    try {
      const data = localStorage.getItem(this.key);
      let items = data ? JSON.parse(data) : [];
      if (items && items.length > 0) {
        // Filter out legacy mockup items with Unsplash image URLs
        items = items.filter(
          (item) => !item.image || !item.image.includes("unsplash.com"),
        );
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
      console.error("[Kawachi Cart] LocalStorage save failed:", e);
    }
    this.syncUI();
  }

  addItem(product) {
    const existing = this.items.find((item) => item.id == product.id);
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
        quantity: quantity,
      });
    }
    this.save();
  }

  removeItem(id) {
    this.items = this.items.filter((item) => item.id != id);
    this.save();
  }

  updateQty(id, qty) {
    const item = this.items.find((item) => item.id == id);
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
    const subtotal = this.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    if (drawerBody) {
      if (this.items.length === 0) {
        drawerBody.innerHTML = `
          <div style="padding: 48px 24px; text-align: center; color: var(--color-text-muted); font-size: var(--text-sm);">
            Your cart is currently empty.
          </div>
        `;
      } else {
        drawerBody.innerHTML = this.items
          .map(
            (item) => `
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
        `,
          )
          .join("");
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
          <div style="text-align: center; padding: 48px; color: var(--color-text-muted); font-size: 14px; font-weight: 600;">Your cart is currently empty.</div>
        `;
      } else {
        cartTableBody.innerHTML = this.items
          .map((item) => {
            // Recover image from KawachiProducts if stored image is missing or is clearly not an image URL
            let rawImg = item.image || "";
            const looksLikeImage =
              /\.(jpg|jpeg|png|gif|webp|svg|avif)(\?|$)/i.test(rawImg) ||
              rawImg.startsWith("data:");
            if (!rawImg || !looksLikeImage) {
              // Try to get the real image from the loaded product catalog
              const productData =
                window.KawachiProducts &&
                window.KawachiProducts.find((p) => p.id == item.id);
              if (productData && productData.image) rawImg = productData.image;
            }
            const cleanedImg = rawImg.replace(
              /62\.72\.31\.43|wordpress-3ht1\.srv1774889\.hstgr.cloud/g,
              "kawachigroup.com",
            );
            return `
            <div class="cart-item-card" data-cart-row-id="${item.id}" style="display: flex; gap: 20px; padding: 20px 0; border-bottom: 1.5px solid #cbd5e1; align-items: flex-start; justify-content: space-between;">
              
              <!-- Left Side: Product Image -->
              <div class="cart-item-image-box" style="width: 100px; height: 100px; background-color: #f8fafc; border-radius: 10px; border: 1.5px solid #cbd5e1; display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0;">
                <img src="${cleanedImg}" data-pid="${item.id}" alt="${item.name}" onerror="if(window.cartImgFallback)window.cartImgFallback(this,${item.id})" style="max-width: 100%; max-height: 100%; object-fit: contain; padding: 4px;">
              </div>

              <!-- Right Side: Content Block -->
              <div class="cart-item-content-box" style="flex-grow: 1; display: flex; flex-direction: column; justify-content: space-between; min-height: 100px; min-width: 0;">
                
                <!-- Top Row: Title & Total Price -->
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; width: 100%;">
                  <div style="min-width: 0; flex-grow: 1; text-align: left;">
                    <a href="single-product.html?id=${item.id}" style="font-weight: 700; font-size: 15.5px; color: #1e293b; text-decoration: none; line-height: 1.4; display: block; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; margin-bottom: 4px;">
                      ${item.name}
                    </a>
                    <span style="font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Category: ${item.category}</span>
                  </div>
                  
                  <!-- Single Price Display (Subtotal) -->
                  <div style="text-align: right; flex-shrink: 0; min-width: 90px;">
                    <div class="row-item-total" style="font-weight: 800; font-size: 16px; color: #0f172a;">${formatRupees(item.price * item.quantity)}</div>
                    ${item.quantity > 1 ? `<div class="row-item-unit-price-helper" style="font-size: 11px; font-weight: 600; color: #94a3b8; margin-top: 2px;">(${formatRupees(item.price)} each)</div>` : ""}
                  </div>
                </div>

                <!-- Bottom Row: Qty Selector & Action Buttons -->
                <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 12px; flex-wrap: wrap; gap: 12px;">
                  
                  <!-- Quantity Selector -->
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 12px; font-weight: 700; color: #475569;">Qty:</span>
                    <div class="quantity-selector" style="width: 84px; height: 28px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; display: inline-flex; align-items: center; justify-content: space-between; overflow: hidden;">
                      <button class="qty-btn val-decrement" style="width: 26px; height: 26px; font-size: 12px; font-weight: 700; color: #475569; border: none; background: transparent; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0;">-</button>
                      <input type="text" class="qty-input val-qty" value="${item.quantity}" readonly style="width: 28px; height: 26px; border: none; background: transparent; text-align: center; font-size: 11px; font-weight: 800; color: #1e293b; padding: 0;">
                      <button class="qty-btn val-increment" style="width: 26px; height: 26px; font-size: 12px; font-weight: 700; color: #475569; border: none; background: transparent; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0;">+</button>
                    </div>
                  </div>

                  <!-- Action Items: Remove Button -->
                  <button class="remove-cart-row-btn" aria-label="Remove Item" style="background: transparent; border: none; cursor: pointer; color: #94a3b8; padding: 6px 12px; border-radius: 6px; display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; transition: all 0.2s; border: 1px solid #cbd5e1;" onmouseover="this.style.color='#ef4444'; this.style.backgroundColor='#fee2e2'; this.style.borderColor='#fca5a5';" onmouseout="this.style.color='#94a3b8'; this.style.backgroundColor='transparent'; this.style.borderColor='#cbd5e1';">
                    <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                    <span>Delete</span>
                  </button>

                </div>

              </div>

            </div>
          `;
          })
          .join("");
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
          summaryContainer.innerHTML = this.items
            .map(
              (item) => `
            <div class="summary-item-row" style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 8px;">
              <div style="max-width: 75%; text-align: left; font-size: 13.5px; line-height: 1.4; color: var(--color-text-main); font-weight: 400;">
                <span>${item.name}</span>
                <span style="color: var(--color-text-muted); margin-left: 4px; font-weight: 400;">&times; ${item.quantity}</span>
              </div>
              <span style="font-size: 13.5px; font-weight: 400; color: var(--color-text-main); white-space: nowrap;">${formatRupees(item.price * item.quantity)}</span>
            </div>
          `,
            )
            .join("");
        }
      }
    }

    // Dynamic checkout page update
    const orderReviewTable = document.querySelector(".order-review-table");
    if (orderReviewTable) {
      const tax = Math.round(subtotal * 0.08 * 100) / 100;
      let itemsHtml = this.items
        .map(
          (item) => `
        <div class="order-review-row" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px dashed #e2e8f0; border-top: none;">
          <div style="display: flex; flex-direction: column; gap: 4px; text-align: left;">
            <span style="font-weight: 600; color: #1e293b; font-size: 14px; display: block; line-height: 1.4;">${item.name}</span>
            <span style="font-size: 12px; color: #64748b;">Qty: ${item.quantity} &times; ${formatRupees(item.price)}</span>
          </div>
          <span style="font-weight: 700; color: #003366; font-size: 14px; white-space: nowrap;">${formatRupees(item.price * item.quantity)}</span>
        </div>
      `,
        )
        .join("");

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
    const panel = document.getElementById("kawachi-sticky-cart-panel");
    if (panel) {
      const totalItems = this.items.reduce((s, i) => s + i.quantity, 0);
      if (this.items.length === 0) {
        panel.style.display = "none";
      } else {
        panel.style.display = "block";

        const scpSubtotal = document.getElementById("scp-subtotal");
        const scpBadge = document.getElementById("scp-badge");
        const scpBuyBtn = document.getElementById("scp-buy-btn");
        const scpItemsContainer = document.getElementById(
          "scp-items-container",
        );

        if (scpSubtotal) {
          scpSubtotal.textContent = formatRupees(subtotal);
        }
        if (scpBadge) {
          scpBadge.textContent = totalItems;
        }
        if (scpBuyBtn) {
          scpBuyBtn.setAttribute(
            "aria-label",
            `Proceed to Buy (${totalItems} items)`,
          );
        }

        if (scpItemsContainer) {
          scpItemsContainer.innerHTML = this.items
            .map(
              (item) => `
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
          `,
            )
            .join("");
        }
      }
    }
  }
}

// Instantiate globally
window.KawachiCart = new CartSystem();

// Inject the sticky cart panel HTML into every page, then sync
function injectStickyCartPanel() {
  if (document.getElementById("kawachi-sticky-cart-panel")) return; // already injected

  if (!document.getElementById("kawachi-scp-style")) {
    const style = document.createElement("style");
    style.id = "kawachi-scp-style";
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

  const panel = document.createElement("div");
  panel.id = "kawachi-sticky-cart-panel";
  panel.setAttribute("aria-label", "Cart Summary");
  panel.style.cssText = [
    "display:none",
    "position:fixed",
    "top:0",
    "right:0",
    "bottom:0",
    "width:90px",
    "background:#232F3E",
    "border-left:1px solid #131A22",
    "box-shadow:-4px 0 20px rgba(0,0,0,0.25)",
    "z-index:9999",
    "font-family:inherit",
    "transition:transform 0.3s ease,opacity 0.3s ease",
    "box-sizing:border-box",
  ].join(";");

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

function getEmbedOrVideoHtml(videoUrl) {
  if (!videoUrl) return "";

  const cleanUrl = videoUrl.trim();

  // Check if Instagram link
  if (
    cleanUrl.includes("instagram.com/p/") ||
    cleanUrl.includes("instagram.com/reel/")
  ) {
    const embedUrl = cleanUrl.split("?")[0].replace(/\/$/, "") + "/embed/";
    return `<iframe src="${embedUrl}" style="width: 100%; height: 100%; border: none; border-radius: 26px;" allowtransparency="true" allow="encrypted-media" scrolling="no"></iframe>`;
  }

  // Check if YouTube link
  if (cleanUrl.includes("youtube.com") || cleanUrl.includes("youtu.be")) {
    let videoId = "";
    if (cleanUrl.includes("watch?v="))
      videoId = cleanUrl.split("v=")[1].split("&")[0];
    else if (cleanUrl.includes("youtu.be/"))
      videoId = cleanUrl.split("youtu.be/")[1].split("?")[0];
    else if (cleanUrl.includes("/embed/"))
      videoId = cleanUrl.split("/embed/")[1].split("?")[0];

    if (videoId) {
      return `<iframe src="https://www.youtube.com/embed/${videoId}" style="width: 100%; height: 100%; border: none; border-radius: 26px;" allowfullscreen></iframe>`;
    }
  }

  // Otherwise assume it is a raw MP4 or fallback video file
  return `
    <video id="product-video-element" loop muted playsinline style="width: 100%; height: 100%; object-fit: cover; display: block;" src="${cleanUrl}"></video>
    <button id="video-unmute-btn" onclick="(function(btn){var v=document.getElementById('product-video-element');v.muted=!v.muted;btn.textContent=v.muted?'🔇':'🔊';})(this)" style="position:absolute;bottom:15px;right:15px;background:rgba(0,0,0,0.55);border:none;color:#fff;border-radius:50%;width:32px;height:32px;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index: 10;">🔇</button>
  `;
}

async function hydrateDetailPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const productId = parseInt(urlParams.get("id"), 10);
  if (!productId) return;

  let product = null;
  if (window.KawachiProducts && window.KawachiProducts.length > 0) {
    product = window.KawachiProducts.find((p) => p.id === productId);
  }

  if (!product) {
    console.log(
      `[WooCommerce REST Client] Product ID ${productId} not found in cache. Fetching directly...`,
    );
    try {
      const client = new WooCommerceClient({ useProxy: true });
      const rawProduct = await client.fetchProduct(productId);
      const regularPrice =
        parseFloat(rawProduct.regular_price) ||
        parseFloat(rawProduct.price) ||
        0;
      const currentPrice = parseFloat(rawProduct.price) || 0;

      let demoVideoUrl = "";
      if (rawProduct.acf) {
        demoVideoUrl =
          rawProduct.acf.demo_video_url ||
          rawProduct.acf.video_url ||
          rawProduct.acf.instagram_link ||
          rawProduct.acf.social_link ||
          "";
      }
      if (!demoVideoUrl && rawProduct.meta_data) {
        const found = rawProduct.meta_data.find(
          (m) =>
            m.key === "demo_video_url" ||
            m.key === "_demo_video_url" ||
            m.key === "video_url" ||
            m.key === "_video_url" ||
            m.key === "instagram_link" ||
            m.key === "_instagram_link" ||
            m.key === "social_link" ||
            m.key === "_social_link",
        );
        if (found) demoVideoUrl = found.value;
      }

      product = {
        id: rawProduct.id,
        name: rawProduct.name,
        price: currentPrice,
        regular_price: regularPrice > currentPrice ? regularPrice : null,
        category:
          rawProduct.categories && rawProduct.categories.length > 0
            ? rawProduct.categories[0].name
            : "Wellness",
        image:
          rawProduct.images && rawProduct.images.length > 0
            ? rawProduct.images[0].src
            : "",
        images: rawProduct.images || [],
        attributes: rawProduct.attributes || [],
        rating: rawProduct.average_rating || "4.5",
        reviews: String(rawProduct.rating_count || 12),
        sales_count: rawProduct.total_sales || 100,
        weekly_sales: Math.round((rawProduct.total_sales || 100) / 4),
        description:
          rawProduct.description || rawProduct.short_description || "",
        short_description: rawProduct.short_description || "",
        featured: rawProduct.featured || false,
        tags: rawProduct.tags || [],
        stock_status: rawProduct.stock_status || "instock",
        demo_video_url: demoVideoUrl,
        meta_data: rawProduct.meta_data || [],
        acf: rawProduct.acf || null,
      };
      if (window.KawachiProducts) {
        window.KawachiProducts.push(product);
      }
    } catch (err) {
      console.error(
        `[WooCommerce REST Client] Failed to fetch product ID ${productId} directly:`,
        err,
      );
      const mockP = MOCK_CATALOG.find((p) => p.id === productId);
      if (mockP) product = mockP;
    }
  }

  if (product) {
    // Hydrate title
    const titleEls = document.querySelectorAll(
      ".product-title-detail, .breadcrumb-product-title",
    );
    titleEls.forEach((el) => {
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
    const priceFormatted = "₹" + Number(product.price).toLocaleString("en-IN");
    const priceDisplay = document.getElementById("p-price-display");
    if (priceDisplay) priceDisplay.textContent = priceFormatted;
    const priceDisplayLarge = document.getElementById("p-price-display-large");
    if (priceDisplayLarge)
      priceDisplayLarge.textContent = Number(product.price).toLocaleString(
        "en-IN",
      );
    const purchaseWidgetPrice = document.getElementById(
      "purchase-widget-price",
    );
    if (purchaseWidgetPrice) purchaseWidgetPrice.textContent = priceFormatted;

    // Hydrate old price
    const priceOldDisplays = document.querySelectorAll(".price-old");
    priceOldDisplays.forEach((el) => {
      el.textContent = product.regular_price
        ? formatRupees(product.regular_price)
        : "";
    });

    // Calculate and hydrate discount badge / percentage
    const discountPercentage = document.getElementById(
      "product-discount-percentage",
    );
    const discountBadge = document.getElementById("product-discount-badge");
    if (product.regular_price && product.regular_price > product.price) {
      const pct = Math.round(
        ((product.regular_price - product.price) / product.regular_price) * 100,
      );
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
      const options = { weekday: "long", day: "numeric", month: "long" };
      deliveryEl.textContent = date.toLocaleDateString("en-IN", options);
    }

    // Hydrate main gallery image and hide skeleton loaders
    const mainImg = document.getElementById("gallery-main-img");
    if (mainImg) {
      mainImg.src = product.image;
      mainImg.alt = product.name;
      mainImg.style.display = "block"; // Show real image
    }
    const galleryContainer = document.getElementById("zoom-lens-container");
    if (galleryContainer) {
      galleryContainer.classList.remove("skeleton-card");
    }
    const galleryOverlay = document.getElementById("gallery-skeleton-overlay");
    if (galleryOverlay) {
      galleryOverlay.style.display = "none";
    }
    const galleryShimmer = document.getElementById("gallery-skeleton-shimmer");
    if (galleryShimmer) {
      galleryShimmer.style.display = "none";
    }

    // Hydrate and show real price, hide price skeleton loader
    const priceShimmer = document.getElementById("price-skeleton-shimmer");
    if (priceShimmer) {
      priceShimmer.style.display = "none";
    }
    const priceRealContent = document.getElementById("price-real-content");
    if (priceRealContent) {
      priceRealContent.style.opacity = "1";
    }

    // Hydrate category link
    const categoryEls = document.querySelectorAll(
      ".category-link, .product-category-detail",
    );
    categoryEls.forEach((el) => {
      el.textContent = product.category;
    });

    // Hydrate bought count badge
    const boughtEl = document.getElementById("detail-bought-count");
    if (boughtEl) {
      const salesCount = product.sales_count || product.orders_count || 0;
      const countVal = boughtEl.querySelector(".bought-count-val");
      if (countVal && salesCount > 0) {
        countVal.textContent = `${salesCount.toLocaleString("en-IN")}+ bought`;
        boughtEl.style.display = "inline-flex";
      } else {
        boughtEl.style.display = "none";
      }
    }

    // Hydrate breadcrumbs
    const breadcrumbCat = document.querySelector(
      'nav[aria-label="Breadcrumb"] a[href*="categories"]',
    );
    if (breadcrumbCat) breadcrumbCat.textContent = product.category;
    const breadcrumbTitle = document.querySelector(
      'nav[aria-label="Breadcrumb"] span',
    );
    if (breadcrumbTitle) breadcrumbTitle.textContent = product.name;

    // Define descriptions mapping
    const categoryKeywords = product.category.toLowerCase();
    let briefText = `${product.name} is a high-performance, premium product designed to elevate your everyday living. Features state-of-the-art craftsmanship and highly durable materials.`;
    let fullText = `The ${product.name} is meticulously engineered for comfort, durability, and convenience. Made with high-quality materials and smart utility concepts, this product offers an elite experience.`;

    if (categoryKeywords.includes("furniture")) {
      if (product.name.toLowerCase().includes("meditation")) {
        briefText =
          "Experience ultimate comfort with our 5-position adjustable floor folding chair, ideal for reading, gaming, and meditation.";
        fullText =
          "The Kawachi meditation floor chair offers superior back support with its reinforced iron frame adjustable across 5 angles. Wrapped in breathable fabric and padded with thick foam, it maintains its shape and comfort for long hours of seating. Perfect for cozy reading, movie nights, or group discussions.";
      } else if (product.name.toLowerCase().includes("bedside")) {
        briefText =
          "A sleek, modern 3-drawer bedside storage cabinet crafted with solid wood legs and premium hardware.";
        fullText =
          "Add mid-century modern styling to your bedroom with the Kawachi Wooden Bedside Table. Features three spacious drawers with easy-glide rollers to organize essentials. Supported by solid pine legs for maximum stability, the top surface is waterproof and scratch-resistant, perfect for holding a bedside lamp and books.";
      }
    } else if (categoryKeywords.includes("kitchen")) {
      briefText =
        "Perfect for kitchens, pantries, and storage rooms. Made with rust-proof steel and sturdy support panels.";
      fullText =
        "Optimize your kitchen storage with this premium Kawachi rack. Meticulously designed for heavy loads, it is made of rust-proof carbon steel with a sleek protective finish. Its space-saving dimensions fit neatly into counters, cabinets, or floors to keep utensils and jars organized.";
    } else if (
      categoryKeywords.includes("study") ||
      categoryKeywords.includes("office") ||
      product.name.toLowerCase().includes("desk") ||
      /\btable\b/i.test(product.name)
    ) {
      briefText =
        "A highly versatile, space-saving foldable desk designed for study sessions, laptop work, and breakfast in bed. Features an integrated device slot and cup holder.";
      fullText =
        "Maximize your comfort and productivity with the Kawachi Foldable Laptop Table. Meticulously designed for modern utility, it features a heavy-duty MDF top and carbon steel legs with anti-slip rubber protectors. The slot allows you to secure your iPad, Kindle or phone at the perfect viewing angle. Folds flat in seconds for easy storage under the bed or behind the door.";
    } else if (
      categoryKeywords.includes("wellness") ||
      categoryKeywords.includes("beauty") ||
      product.name.toLowerCase().includes("sauna")
    ) {
      briefText =
        "A portable home steam sauna spa complete with a 2-liter steam pot, remote control, and folding chair.";
      fullText =
        "Transform your home into a luxury wellness spa with the Kawachi Portable Steam Sauna Box. The multi-layered insulated tent retains steam and heat effectively. It features a digital remote control to adjust time and heat level across 9 settings. Ideal for muscle relaxation, skin detoxing, and overall health rejuvenation.";
    } else if (
      categoryKeywords.includes("utility") ||
      product.name.toLowerCase().includes("trolley") ||
      product.name.toLowerCase().includes("cart")
    ) {
      briefText =
        "A mobile multi-tier steel utility storage cart with mesh baskets and lockable caster wheels.";
      fullText =
        "Perfect for kitchens, offices, and bathrooms, the Kawachi Rolling Storage Cart features three deep wire mesh baskets that allow airflow to prevent moisture buildup. Heavy-duty carbon steel frame supports heavy loads, while 360-degree wheels (2 lockable) provide smooth mobility and steady placement.";
    } else if (
      categoryKeywords.includes("decor") ||
      product.name.toLowerCase().includes("shelf") ||
      product.name.toLowerCase().includes("shelves")
    ) {
      briefText =
        "A set of rustic wooden floating display shelves with industrial iron brackets for wall decor.";
      fullText =
        "Enhance your wall space with Kawachi rustic floating shelves. Ideal for displaying potted plants, photo frames, and collectables. Made of high-grade natural wood with matte black iron brackets, these shelves are a stylish combination of rustic warmth and industrial strength.";
    }

    // Hydrate descriptions
    const briefDescEl = document.querySelector(".product-description-brief");
    if (briefDescEl)
      briefDescEl.innerHTML =
        product.short_description || product.description || briefText;
    let extractedVideoHtml = null;
    const descCollapseWrapper = document.getElementById(
      "desc-collapse-wrapper",
    );
    if (descCollapseWrapper) {
      const rawDescHtml =
        product.description ||
        `<p style="font-size: 14px; color: #333; line-height: 1.6;">${fullText}</p>`;

      // Parse description HTML to check for iframes/videos/Instagram blockquotes/links
      const parser = new DOMParser();
      const doc = parser.parseFromString(rawDescHtml, "text/html");

      const iframe = doc.querySelector("iframe, video");
      if (iframe) {
        extractedVideoHtml = iframe.outerHTML;
        iframe.remove();
      } else {
        // Look for instagram links or blockquotes
        const instaBlockquote = doc.querySelector("blockquote.instagram-media");
        const instaLink = doc.querySelector(
          'a[href*="instagram.com/p/"], a[href*="instagram.com/reel/"]',
        );

        let instaUrl = null;
        if (
          instaBlockquote &&
          instaBlockquote.getAttribute("data-instgrm-permalink")
        ) {
          instaUrl = instaBlockquote.getAttribute("data-instgrm-permalink");
        } else if (instaLink) {
          instaUrl = instaLink.getAttribute("href");
        }

        if (instaUrl) {
          // Convert to embed URL: e.g. https://www.instagram.com/reel/XYZ/embed/
          const cleanUrl = instaUrl.split("?")[0].replace(/\/$/, "");
          const embedUrl = `${cleanUrl}/embed/`;
          extractedVideoHtml = `<iframe src="${embedUrl}" width="100%" height="480" frameborder="0" scrolling="no" allowtransparency="true" allow="encrypted-media"></iframe>`;

          // Remove the blockquote or link from description to avoid duplicates
          if (instaBlockquote) instaBlockquote.remove();
          if (instaLink) instaLink.remove();
        } else {
          // Check for YouTube links in description
          const ytLink = doc.querySelector(
            'a[href*="youtube.com/watch"], a[href*="youtu.be/"], a[href*="youtube.com/embed"]',
          );
          if (ytLink) {
            const ytUrl = ytLink.getAttribute("href");
            let videoId = "";
            if (ytUrl.includes("watch?v="))
              videoId = ytUrl.split("v=")[1].split("&")[0];
            else if (ytUrl.includes("youtu.be/"))
              videoId = ytUrl.split("youtu.be/")[1].split("?")[0];
            else if (ytUrl.includes("/embed/"))
              videoId = ytUrl.split("/embed/")[1].split("?")[0];

            if (videoId) {
              extractedVideoHtml = `<iframe src="https://www.youtube.com/embed/${videoId}" width="100%" height="360" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
              ytLink.remove();
            }
          }
        }
      }

      if (extractedVideoHtml) {
        const textHtml = doc.body.innerHTML;

        descCollapseWrapper.innerHTML = `
          <div class="desc-text-collapse" id="desc-text-container" style="max-height: 120px; overflow: hidden; position: relative;">
            ${textHtml}
          </div>
        `;
        descCollapseWrapper.classList.remove("has-video");
      } else {
        descCollapseWrapper.innerHTML = `
          <div class="desc-text-collapse" id="desc-text-container" style="max-height: 120px; overflow: hidden; position: relative;">
            ${rawDescHtml}
          </div>
        `;
        descCollapseWrapper.classList.remove("has-video");
      }

      // Reset collapse state
      descCollapseWrapper.classList.remove("expanded");
      const readMoreBtn = document.getElementById("desc-read-more-btn");
      if (readMoreBtn) {
        readMoreBtn.style.display = "block";
        readMoreBtn.textContent = "Read More \u25be";
      }
    }

    // Hydrate specifications tab table depending on product type
    const tabSpecsTable = document.querySelector("#tab-specs table tbody");
    if (tabSpecsTable) {
      let specsHtml = `
          <tr style="border-bottom: 1px solid var(--color-border);"><td style="padding: 12px 0; font-weight: 600; color: var(--color-primary); width: 200px;">Product Name</td><td style="padding: 12px 0; color: var(--color-text-muted);">${product.name}</td></tr>
          <tr style="border-bottom: 1px solid var(--color-border);"><td style="padding: 12px 0; font-weight: 600; color: var(--color-primary);">Category</td><td style="padding: 12px 0; color: var(--color-text-muted);">${product.category}</td></tr>
          <tr style="border-bottom: 1px solid var(--color-border);"><td style="padding: 12px 0; font-weight: 600; color: var(--color-primary);">Price</td><td style="padding: 12px 0; color: var(--color-text-muted);">${formatRupees(product.price)}</td></tr>
        `;

      if (
        categoryKeywords.includes("furniture") &&
        product.name.toLowerCase().includes("meditation")
      ) {
        specsHtml += `
            <tr style="border-bottom: 1px solid var(--color-border);"><td style="padding: 12px 0; font-weight: 600; color: var(--color-primary);">Material</td><td style="padding: 12px 0; color: var(--color-text-muted);">Linen Fabric, Metal Frame, Foam</td></tr>
            <tr style="border-bottom: 1px solid var(--color-border);"><td style="padding: 12px 0; font-weight: 600; color: var(--color-primary);">Adjustability</td><td style="padding: 12px 0; color: var(--color-text-muted);">5 Positions (90 to 180 degrees)</td></tr>
            <tr style="border-bottom: 1px solid var(--color-border);"><td style="padding: 12px 0; font-weight: 600; color: var(--color-primary);">Dimensions</td><td style="padding: 12px 0; color: var(--color-text-muted);">110 cm x 52 cm x 12 cm</td></tr>
            <tr style="border-bottom: 1px solid var(--color-border);"><td style="padding: 12px 0; font-weight: 600; color: var(--color-primary);">Weight Capacity</td><td style="padding: 12px 0; color: var(--color-text-muted);">Up to 120 kg</td></tr>
          `;
      } else if (
        categoryKeywords.includes("furniture") &&
        product.name.toLowerCase().includes("bedside")
      ) {
        specsHtml += `
            <tr style="border-bottom: 1px solid var(--color-border);"><td style="padding: 12px 0; font-weight: 600; color: var(--color-primary);">Material</td><td style="padding: 12px 0; color: var(--color-text-muted);">Solid Pine Wood &amp; MDF Board</td></tr>
            <tr style="border-bottom: 1px solid var(--color-border);"><td style="padding: 12px 0; font-weight: 600; color: var(--color-primary);">Storage Drawers</td><td style="padding: 12px 0; color: var(--color-text-muted);">3 Drawers with soft-close rollers</td></tr>
            <tr style="border-bottom: 1px solid var(--color-border);"><td style="padding: 12px 0; font-weight: 600; color: var(--color-primary);">Dimensions</td><td style="padding: 12px 0; color: var(--color-text-muted);">45 cm x 40 cm x 60 cm</td></tr>
            <tr style="border-bottom: 1px solid var(--color-border);"><td style="padding: 12px 0; font-weight: 600; color: var(--color-primary);">Waterproof Finish</td><td style="padding: 12px 0; color: var(--color-text-muted);">Yes, Premium Matte Laminate</td></tr>
          `;
      } else if (
        categoryKeywords.includes("study") ||
        categoryKeywords.includes("office") ||
        product.name.toLowerCase().includes("desk") ||
        product.name.toLowerCase().includes("table")
      ) {
        specsHtml += `
            <tr style="border-bottom: 1px solid var(--color-border);"><td style="padding: 12px 0; font-weight: 600; color: var(--color-primary);">Material</td><td style="padding: 12px 0; color: var(--color-text-muted);">Heavy-duty MDF top &amp; Carbon Steel legs</td></tr>
            <tr style="border-bottom: 1px solid var(--color-border);"><td style="padding: 12px 0; font-weight: 600; color: var(--color-primary);">Features</td><td style="padding: 12px 0; color: var(--color-text-muted);">Foldable legs, Cup holder, Tablet slot, Anti-slip rubber caps</td></tr>
            <tr style="border-bottom: 1px solid var(--color-border);"><td style="padding: 12px 0; font-weight: 600; color: var(--color-primary);">Dimensions</td><td style="padding: 12px 0; color: var(--color-text-muted);">60 cm x 40 cm x 28 cm</td></tr>
            <tr style="border-bottom: 1px solid var(--color-border);"><td style="padding: 12px 0; font-weight: 600; color: var(--color-primary);">Net Weight</td><td style="padding: 12px 0; color: var(--color-text-muted);">2.2 kg</td></tr>
          `;
      } else if (
        categoryKeywords.includes("wellness") ||
        categoryKeywords.includes("beauty") ||
        product.name.toLowerCase().includes("sauna")
      ) {
        specsHtml += `
            <tr style="border-bottom: 1px solid var(--color-border);"><td style="padding: 12px 0; font-weight: 600; color: var(--color-primary);">Material</td><td style="padding: 12px 0; color: var(--color-text-muted);">Waterproof Fabric &amp; Insulating Cotton</td></tr>
            <tr style="border-bottom: 1px solid var(--color-border);"><td style="padding: 12px 0; font-weight: 600; color: var(--color-primary);">Capacity</td><td style="padding: 12px 0; color: var(--color-text-muted);">2.0L Steam Generator with Digital Remote</td></tr>
            <tr style="border-bottom: 1px solid var(--color-border);"><td style="padding: 12px 0; font-weight: 600; color: var(--color-primary);">Power / Wattage</td><td style="padding: 12px 0; color: var(--color-text-muted);">1000W Max</td></tr>
            <tr style="border-bottom: 1px solid var(--color-border);"><td style="padding: 12px 0; font-weight: 600; color: var(--color-primary);">Safety</td><td style="padding: 12px 0; color: var(--color-text-muted);">Auto-off dry boil protection &amp; Timer control</td></tr>
          `;
      } else if (
        categoryKeywords.includes("utility") ||
        product.name.toLowerCase().includes("trolley") ||
        product.name.toLowerCase().includes("cart")
      ) {
        specsHtml += `
            <tr style="border-bottom: 1px solid var(--color-border);"><td style="padding: 12px 0; font-weight: 600; color: var(--color-primary);">Material</td><td style="padding: 12px 0; color: var(--color-text-muted);">Rust-proof Powder Coated Carbon Steel</td></tr>
            <tr style="border-bottom: 1px solid var(--color-border);"><td style="padding: 12px 0; font-weight: 600; color: var(--color-primary);">Load Capacity</td><td style="padding: 12px 0; color: var(--color-text-muted);">Up to 60 kg total (20 kg per shelf)</td></tr>
            <tr style="border-bottom: 1px solid var(--color-border);"><td style="padding: 12px 0; font-weight: 600; color: var(--color-primary);">Casters / Wheels</td><td style="padding: 12px 0; color: var(--color-text-muted);">360-degree lockable caster wheels</td></tr>
            <tr style="border-bottom: 1px solid var(--color-border);"><td style="padding: 12px 0; font-weight: 600; color: var(--color-primary);">Finish</td><td style="padding: 12px 0; color: var(--color-text-muted);">Matte anti-corrosive mesh storage baskets</td></tr>
          `;
      } else if (
        categoryKeywords.includes("decor") ||
        product.name.toLowerCase().includes("shelf") ||
        product.name.toLowerCase().includes("shelves")
      ) {
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

      // Append custom WooCommerce attributes dynamically
      if (product.attributes && product.attributes.length > 0) {
        product.attributes.forEach((attr) => {
          const values = attr.options ? attr.options.join(", ") : "";
          if (values) {
            specsHtml += `
              <tr style="border-bottom: 1px solid var(--color-border);">
                <td style="padding: 12px 0; font-weight: 600; color: var(--color-primary);">${attr.name}</td>
                <td style="padding: 12px 0; color: var(--color-text-muted);">${values}</td>
              </tr>
            `;
          }
        });
      }

      tabSpecsTable.innerHTML = specsHtml;
    }

    // Render attributes/variations dynamically from WooCommerce if available
    const variationSections = document.querySelectorAll(".variation-section");
    variationSections.forEach((sec) => {
      if (product.attributes && product.attributes.length > 0) {
        sec.style.display = "block";
        const label = sec.querySelector("label");
        const container = sec.querySelector("div");

        if (label && container) {
          const attr = product.attributes[0];
          label.textContent = `Select ${attr.name}:`;

          container.innerHTML = attr.options
            .map((opt, idx) => {
              const isActive = idx === 0 ? "active" : "";
              const activeStyle =
                idx === 0
                  ? "border: 1px solid #007185; background: #E7F4F5; color: #0F1111;"
                  : "";
              return `
                <button class="btn btn-secondary ${isActive}" style="padding: 8px 16px; font-size: 12px; font-weight: 700; border-radius: 4px; ${activeStyle}">${opt}</button>
              `;
            })
            .join("");

          // Add click listeners to switch variations
          const buttons = container.querySelectorAll("button");
          buttons.forEach((btn) => {
            btn.addEventListener("click", () => {
              buttons.forEach((b) => {
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
    if (skuEl)
      skuEl.textContent = `KW-${product.category.toUpperCase().replace(/[^A-Z0-9]/g, "")}-${product.id}`;

    // Build rich custom gallery for all products depending on WooCommerce images
    const thumbnailRow = document.querySelector(".thumbnail-row");
    if (thumbnailRow) {
      let galleryImages = [];
      if (product.images && product.images.length > 0) {
        galleryImages = product.images.map((img) => img.src);
      } else if (product.image) {
        galleryImages = [product.image];
      } else {
        galleryImages = [
          "https://via.placeholder.com/600/ffffff/0f172a?text=No+Image",
        ];
      }

      // If we have an extracted video from the description, insert it at index 1 (second position)
      if (extractedVideoHtml) {
        let videoThumb =
          "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=600&q=80";
        if (
          extractedVideoHtml.includes("youtube.com") ||
          extractedVideoHtml.includes("youtu.be")
        ) {
          const match = extractedVideoHtml.match(/\/embed\/([^"?#]+)/);
          if (match && match[1]) {
            videoThumb = `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`;
          }
        } else if (product.images && product.images.length > 1) {
          videoThumb = product.images[1].src;
        } else if (product.image) {
          videoThumb = product.image;
        }

        galleryImages.splice(1, 0, {
          src: videoThumb,
          isVideo: true,
          iframeHtml: extractedVideoHtml,
        });
      }

      // Format standard images into objects for uniform processing
      galleryImages = galleryImages.map((img) => {
        if (typeof img === "object" && img.isVideo) return img;
        return { src: img, isVideo: false };
      });

      const isDesktop = window.innerWidth >= 768;

      if (isDesktop && galleryImages.length > 5) {
        const maxThumbnailsCount = 5;
        const visibleGalleryImages = galleryImages.slice(0, maxThumbnailsCount);
        const remainingCount = galleryImages.length - (maxThumbnailsCount - 1); // e.g. length - 4

        thumbnailRow.innerHTML = visibleGalleryImages
          .map((imgObj, index) => {
            const isVideo = imgObj.isVideo;
            const isLastVisible = index === maxThumbnailsCount - 1;

            return `
            <div class="thumb-item ${index === 0 ? "active" : ""} ${isVideo ? "video-thumb" : ""} ${isLastVisible ? "thumb-view-all-trigger" : ""}" data-index="${index}" style="position:relative;">
              <img src="${imgObj.src}" alt="${product.name} Thumbnail ${index + 1}">
              ${
                isVideo
                  ? `
                <div class="thumb-play-overlay" style="position:absolute;inset:0;background:rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;border-radius:inherit;z-index:1;">
                  <svg width="18" height="18" fill="#FFE500" viewBox="0 0 24 24" style="filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5));">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </div>
              `
                  : ""
              }
              ${
                isLastVisible
                  ? `
                <div class="thumb-item-more-overlay" style="position:absolute;inset:0;background:rgba(15,23,42,0.75);color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:10px;font-weight:700;text-align:center;border-radius:inherit;z-index:2;">
                  <span style="font-size:15px;font-weight:800;color:#fff;">+${remainingCount}</span>
                  <span style="font-size:7.5px;text-transform:uppercase;letter-spacing:0.05em;margin-top:1px;color:rgba(255,255,255,0.95);">View All</span>
                </div>
              `
                  : ""
              }
            </div>
          `;
          })
          .join("");
      } else {
        // Mobile view or <= 5 images: render all thumbnails normally
        thumbnailRow.innerHTML = galleryImages
          .map((imgObj, index) => {
            const isVideo = imgObj.isVideo;
            return `
            <div class="thumb-item ${index === 0 ? "active" : ""} ${isVideo ? "video-thumb" : ""}" data-index="${index}" style="position:relative;">
              <img src="${imgObj.src}" alt="${product.name} Thumbnail ${index + 1}">
              ${
                isVideo
                  ? `
                <div class="thumb-play-overlay" style="position:absolute;inset:0;background:rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;border-radius:inherit;z-index:1;">
                  <svg width="18" height="18" fill="#FFE500" viewBox="0 0 24 24" style="filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5));">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </div>
              `
                  : ""
              }
            </div>
          `;
          })
          .join("");
      }

      // — Fullscreen Gallery Modal Logic —
      function openFullscreenGalleryModal(initialIndex = 0) {
        const modal = document.getElementById("pdp-gallery-modal");
        const titleText = document.getElementById("gallery-modal-title-text");
        const viewerContainer = document.getElementById(
          "gallery-modal-viewer-container",
        );
        const stripContainer = document.getElementById(
          "gallery-modal-thumbnails-strip",
        );
        const closeBtn = document.getElementById("gallery-modal-close-btn");

        if (!modal || !viewerContainer || !stripContainer) return;

        if (titleText)
          titleText.textContent = `Product Media Gallery — ${product.name}`;

        // Populate bottom thumbnails strip (no limits!)
        stripContainer.innerHTML = galleryImages
          .map((imgObj, idx) => {
            return `
            <div class="gallery-modal-thumb ${idx === initialIndex ? "active" : ""}" data-modal-index="${idx}">
              <img src="${imgObj.src}" alt="${product.name} Gallery Item ${idx + 1}">
              ${
                imgObj.isVideo
                  ? `
                <div style="position:absolute;inset:0;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;">
                  <svg width="14" height="14" fill="#FFE500" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                </div>
              `
                  : ""
              }
            </div>
          `;
          })
          .join("");

        // Helper to select item in modal viewer
        const selectModalItem = (index) => {
          const thumbs = stripContainer.querySelectorAll(
            ".gallery-modal-thumb",
          );
          thumbs.forEach((t) => t.classList.remove("active"));

          const activeThumb = stripContainer.querySelector(
            `[data-modal-index="${index}"]`,
          );
          if (activeThumb) activeThumb.classList.add("active");

          const imgObj = galleryImages[index];
          if (imgObj.isVideo) {
            let iframeCode = imgObj.iframeHtml;
            if (iframeCode.includes("<iframe")) {
              iframeCode = iframeCode
                .replace(/width="[^"]*"/, 'width="100%"')
                .replace(/height="[^"]*"/, 'height="100%"');
              if (iframeCode.includes("style=")) {
                iframeCode = iframeCode.replace(
                  /style="([^"]*)"/,
                  'style="$1; width:100%; height:100%; border:none; border-radius:12px;"',
                );
              } else {
                iframeCode = iframeCode.replace(
                  "<iframe",
                  '<iframe style="width:100%; height:100%; border:none; border-radius:12px;"',
                );
              }
            }
            viewerContainer.innerHTML = iframeCode;
          } else {
            viewerContainer.innerHTML = `<img src="${imgObj.src}" alt="${product.name} Large Media" style="max-width:100%; max-height:100%; object-fit:contain; border-radius:12px;">`;
          }
        };

        // Select initial item
        selectModalItem(initialIndex);

        // Bind clicks on modal thumbnails
        stripContainer.onclick = (e) => {
          const thumb = e.target.closest(".gallery-modal-thumb");
          if (thumb) {
            const idx = parseInt(thumb.getAttribute("data-modal-index"), 10);
            selectModalItem(idx);
          }
        };

        // Show modal with animation classes
        modal.classList.add("active");

        // Close handlers
        const closeModal = () => {
          modal.classList.remove("active");
          viewerContainer.innerHTML = ""; // Stop video playback
        };
        if (closeBtn) closeBtn.onclick = closeModal;
        modal.onclick = (e) => {
          if (e.target === modal) closeModal();
        };
      }

      // Thumbnail switcher logic
      const thumbs = thumbnailRow.querySelectorAll(".thumb-item");
      thumbs.forEach((thumb) => {
        const selectImage = () => {
          const index = parseInt(thumb.getAttribute("data-index"), 10);

          // If this is the last visible item with "View All" overlay, launch the modal directly!
          if (thumb.classList.contains("thumb-view-all-trigger")) {
            openFullscreenGalleryModal(index);
            return;
          }

          thumbs.forEach((t) => t.classList.remove("active"));
          thumb.classList.add("active");

          const imgObj = galleryImages[index];

          // Clean up any existing video wrapper
          const existingVideo = galleryContainer.querySelector(
            ".gallery-video-wrapper",
          );
          if (existingVideo) existingVideo.remove();

          if (imgObj.isVideo) {
            // Hide main image
            mainImg.style.display = "none";

            // Create and append responsive video player wrapper
            const videoWrap = document.createElement("div");
            videoWrap.className = "gallery-video-wrapper";
            videoWrap.style.cssText =
              "position:absolute;inset:0;background:#fff;display:flex;align-items:center;justify-content:center;z-index:5;";

            let iframeCode = imgObj.iframeHtml;
            if (iframeCode.includes("<iframe")) {
              iframeCode = iframeCode
                .replace(/width="[^"]*"/, 'width="100%"')
                .replace(/height="[^"]*"/, 'height="100%"');
              if (iframeCode.includes("style=")) {
                iframeCode = iframeCode.replace(
                  /style="([^"]*)"/,
                  'style="$1; width:100%; height:100%; border:none;"',
                );
              } else {
                iframeCode = iframeCode.replace(
                  "<iframe",
                  '<iframe style="width:100%; height:100%; border:none;"',
                );
              }
            }
            videoWrap.innerHTML = iframeCode;
            galleryContainer.appendChild(videoWrap);
          } else {
            // Restore main image
            mainImg.style.display = "block";
            mainImg.src = imgObj.src;
          }
        };
        thumb.addEventListener("click", selectImage);
      });
    }

    // Extract Amazon and Flipkart links from meta_data or ACF
    let amazonUrl = null;
    let flipkartUrl = null;

    if (product.meta_data && Array.isArray(product.meta_data)) {
      product.meta_data.forEach((m) => {
        const keyLower = m.key.toLowerCase();
        if (
          m.value &&
          typeof m.value === "string" &&
          m.value.trim().startsWith("http")
        ) {
          if (keyLower.includes("amazon")) {
            amazonUrl = m.value.trim();
          } else if (keyLower.includes("flipkart")) {
            flipkartUrl = m.value.trim();
          }
        }
      });
    }

    if (product.acf) {
      if (
        !amazonUrl &&
        product.acf.amazon_link &&
        typeof product.acf.amazon_link === "string" &&
        product.acf.amazon_link.trim().startsWith("http")
      ) {
        amazonUrl = product.acf.amazon_link.trim();
      }
      if (
        !amazonUrl &&
        product.acf.amazon_url &&
        typeof product.acf.amazon_url === "string" &&
        product.acf.amazon_url.trim().startsWith("http")
      ) {
        amazonUrl = product.acf.amazon_url.trim();
      }
      if (
        !amazonUrl &&
        product.acf.amazon &&
        typeof product.acf.amazon === "string" &&
        product.acf.amazon.trim().startsWith("http")
      ) {
        amazonUrl = product.acf.amazon.trim();
      }

      if (
        !flipkartUrl &&
        product.acf.flipkart_link &&
        typeof product.acf.flipkart_link === "string" &&
        product.acf.flipkart_link.trim().startsWith("http")
      ) {
        flipkartUrl = product.acf.flipkart_link.trim();
      }
      if (
        !flipkartUrl &&
        product.acf.flipkart_url &&
        typeof product.acf.flipkart_url === "string" &&
        product.acf.flipkart_url.trim().startsWith("http")
      ) {
        flipkartUrl = product.acf.flipkart_url.trim();
      }
      if (
        !flipkartUrl &&
        product.acf.flipkart &&
        typeof product.acf.flipkart === "string" &&
        product.acf.flipkart.trim().startsWith("http")
      ) {
        flipkartUrl = product.acf.flipkart.trim();
      }
    }

    const marketplaceContainer = document.getElementById(
      "marketplace-links-container",
    );
    if (marketplaceContainer) {
      if (!amazonUrl && !flipkartUrl) {
        marketplaceContainer.style.display = "none";
      } else {
        marketplaceContainer.style.display = "block";

        let buttonsHtml = "";
        if (amazonUrl) {
          buttonsHtml += `
            <a href="${amazonUrl}" target="_blank" class="premium-marketplace-btn amazon" style="flex: 1; margin: 0; padding: 8px 12px; font-size: 12.5px; border-radius: 8px; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); transition: all 0.2s;">
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 16 16" style="flex-shrink:0;">
                <path fill="#FFFFFF" d="M10.813 11.968c.157.083.36.074.5-.05l.005.005a90 90 0 0 1 1.623-1.405c.173-.143.143-.372.006-.563l-.125-.17c-.345-.465-.673-.906-.673-1.791v-3.3l.001-.335c.008-1.265.014-2.421-.933-3.305C10.404.274 9.06 0 8.03 0 6.017 0 3.77.75 3.296 3.24c-.047.264.143.404.316.443l2.054.22c.19-.009.33-.196.366-.387.176-.857.896-1.271 1.703-1.271.435 0 .929.16 1.188.55.264.39.26.91.257 1.376v.432q-.3.033-.621.065c-1.113.114-2.397.246-3.36.67C3.873 5.91 2.94 7.08 2.94 8.798c0 2.2 1.387 3.298 3.168 3.298 1.506 0 2.328-.354 3.489-1.54l.167.246c.274.405.456.675 1.047 1.166ZM6.03 8.431C6.03 6.627 7.647 6.3 9.177 6.3v.57c.001.776.002 1.434-.396 2.133-.336.595-.87.961-1.465.961-.812 0-1.286-.619-1.286-1.533"/>
                <path fill="#FF9900" d="M.435 12.174c2.629 1.603 6.698 4.084 13.183.997.28-.116.475.078.199.431C13.538 13.96 11.312 16 7.57 16 3.832 16 .968 13.446.094 12.386c-.24-.275.036-.4.199-.299z M13.828 11.943c.567-.07 1.468-.027 1.645.204.135.176-.004.966-.233 1.533-.23.563-.572.961-.762 1.115s-.333.094-.23-.137c.105-.23.684-1.663.455-1.963-.213-.278-1.177-.177-1.625-.13l-.09.009q-.142.013-.233.024c-.193.021-.245.027-.274-.032-.074-.209.779-.556 1.347-.623"/>
              </svg>
              <span style="color: #FF9900; font-weight: 700;">Amazon</span>
            </a>
          `;
        }
        if (flipkartUrl) {
          buttonsHtml += `
            <a href="${flipkartUrl}" target="_blank" class="premium-marketplace-btn flipkart" style="flex: 1; margin: 0; padding: 8px 12px; font-size: 12.5px; border-radius: 8px; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); transition: all 0.2s;">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" style="flex-shrink:0;">
                <path fill="#FFE500" d="M17 6h-2V5c0-1.65-1.35-3-3-3S9 3.35 9 5v1H7c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6-1c0-.55.45-1 1-1s1 .45 1 1v1h-2V5zm6 14H7V8h10v11z"/>
              </svg>
              <span style="color: #FFFFFF; font-weight: 700;"><span style="color: #FFE500;">Flipkart</span></span>
            </a>
          `;
        }

        marketplaceContainer.innerHTML = `
          <div style="background: linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%); border: 1.5px dashed #CBD5E1; border-radius: 8px; padding: 12px 14px; margin-bottom: 8px; box-sizing: border-box;">
            <span style="font-size: 11px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.8px; display: block; margin-bottom: 8px; text-align: center;">🛒 Shop on partner marketplaces</span>
            <div style="display: flex; gap: 10px; width: 100%;">
              ${buttonsHtml}
            </div>
          </div>
        `;
      }
    }
    // Hydrate sticky bar
    const stickyImg = document.querySelector(".sticky-atc-left img");
    if (stickyImg) stickyImg.src = product.image;

    const stickyTitle = document.querySelector(".sticky-atc-bar-title");
    if (stickyTitle) stickyTitle.textContent = product.name; // Dynamic Influencer Video Reviews Mapping
    const productVideos = {
      104: {
        videoSrc:
          "https://assets.mixkit.co/videos/preview/mixkit-woman-enjoying-a-sauna-session-40019-large.mp4",
        title: "Sauna Box experience by @wellness_guru",
        desc: "A detailed review showing how to set up the 2-liter steam pot, remote control settings, and the general comfort of the portable folding chair. Highly recommended for daily relaxation and detoxing!",
      },
      101: {
        videoSrc:
          "https://assets.mixkit.co/videos/preview/mixkit-freelancer-woman-working-on-a-laptop-42323-large.mp4",
        title: "Smart Bed Desk demonstration by @tech_spaces",
        desc: "Showing the device slots, heavy-duty build, and portable folding legs. Perfect for working from home in bed or on the sofa.",
      },
      105: {
        videoSrc:
          "https://assets.mixkit.co/videos/preview/mixkit-woman-sitting-on-a-cushion-meditating-41586-large.mp4",
        title: "Meditation Chair posture review by @body_mind_spirit",
        desc: "A review focusing on physical posture support, the 5 adjustable backrest angles, and fabric durability during daily meditation sessions.",
      },
      102: {
        videoSrc:
          "https://assets.mixkit.co/videos/preview/mixkit-chef-preparing-a-fresh-salad-41617-large.mp4",
        title: "Kitchen storage rack organization hacks by @kitchen_pro",
        desc: "Demonstrating load capacity, spacing for microwaves and spices, and mesh basket features for optimal kitchen de-cluttering.",
      },
    };

    // Hydrate product video showcase (9:16 portrait, auto-plays muted)
    const videoSection = document.getElementById("detail-video-section");
    if (videoSection) {
      let videoData = productVideos[product.id];
      if (!videoData && product.demo_video_url) {
        videoData = {
          videoSrc: product.demo_video_url,
          title: "Product Demonstration Video",
          desc: `Watch the video demonstration of ${product.name} to see it in action.`,
        };
      }

      if (videoData) {
        const phoneScreenInner = document.getElementById("phone-screen-inner");
        const videoTitle = document.getElementById("product-video-title");
        const videoDesc = document.getElementById("product-video-desc");

        if (phoneScreenInner) {
          const videoUrl = videoData.videoSrc.trim();
          phoneScreenInner.innerHTML = getEmbedOrVideoHtml(videoUrl);

          const videoElement = phoneScreenInner.querySelector("video");
          if (videoElement) {
            videoElement.play().catch(() => {});
          }
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

    // Hydrate trending products strip ("You May Also Like") using the best sellers list
    const trendingStrip = document.getElementById("detail-trending-strip");
    const trendingGrid = document.getElementById("detail-trending-products");
    if (trendingStrip && trendingGrid && window.KawachiProducts) {
      const related = [...window.KawachiProducts]
        .filter((p) => p.id !== product.id)
        .sort(
          (a, b) =>
            (b.sales_count || b.orders_count || 0) -
            (a.sales_count || a.orders_count || 0),
        )
        .slice(0, 24);
      if (related.length > 0) {
        setupStaticSlider(trendingGrid, related);
        trendingStrip.style.display = "block";
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

    resultImg.style.width = renderedW * cx + "px";
    resultImg.style.height = renderedH * cy + "px";
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
    if (lensX > imgRect.width - lens.offsetWidth)
      lensX = imgRect.width - lens.offsetWidth;
    if (lensY < 0) lensY = 0;
    if (lensY > imgRect.height - lens.offsetHeight)
      lensY = imgRect.height - lens.offsetHeight;

    lens.style.left = img.offsetLeft + lensX + "px";
    lens.style.top = img.offsetTop + lensY + "px";

    const cx = result.offsetWidth / lens.offsetWidth;
    const cy = result.offsetHeight / lens.offsetHeight;

    resultImg.style.left = "-" + lensX * cx + "px";
    resultImg.style.top = "-" + lensY * cy + "px";
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
        e.touches[0].clientY - e.touches[1].clientY,
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
        e.touches[0].clientY - e.touches[1].clientY,
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
        container.scrollLeft =
          (img.offsetWidth * 2.5 - container.offsetWidth) / 2;
        container.scrollTop =
          (img.offsetHeight * 2.5 - container.offsetHeight) / 2;
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
      options.forEach((opt) => {
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
  const container = document.querySelector(".sub-nav-container");
  if (container) {
    container.innerHTML = `
      <div class="sub-nav-left">
        <a href="index.html" class="sub-nav-link" style="display: inline-flex; align-items: center; gap: 4px;">
          <strong>Home</strong>
        </a>
        <a href="search.html?q=Furniture" class="sub-nav-link">Furniture</a>
        <a href="search.html?q=Kitchen" class="sub-nav-link">Kitchen</a>
        <a href="search.html?q=Storage" class="sub-nav-link">Storage</a>
      </div>
      <div class="sub-nav-divider">/</div>
      <div class="sub-nav-right">
        <a href="contact.html?type=bulk" class="premium-btn-21 bulk-btn desktop-animate-btn">Bulk Orders</a>
        <a href="https://optiedge.in" target="_blank" rel="noopener noreferrer" class="premium-btn-21 ecom-btn desktop-animate-btn">eCommerce Solution <span style="filter: brightness(0) invert(1); display: inline-block; margin-left: 4px; vertical-align: middle;">💫</span></a>
      </div>
    `;
  }

  // Inject B2B vertical stack in logo-group on mobile
  const logoGroup = document.querySelector(".logo-group");
  if (logoGroup) {
    let mobileB2B = logoGroup.querySelector(".header-mobile-right-links");
    if (!mobileB2B) {
      mobileB2B = document.createElement("div");
      mobileB2B.className = "header-mobile-right-links";
      mobileB2B.innerHTML = `
        <a href="contact.html?type=bulk" class="mobile-top-btn bulk-btn">Bulk Orders</a>
        <a href="https://optiedge.in" target="_blank" rel="noopener noreferrer" class="mobile-top-btn ecom-btn">eCommerce Solution <span style="filter: brightness(0) invert(1); display: inline-block; margin-left: 4px; vertical-align: middle;">💫</span></a>
      `;
      logoGroup.appendChild(mobileB2B);
    }
  }
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
  const accountLink = container.querySelector(
    'a[href*="account"], a[href*="support-center"], a[href*="profile"]',
  );
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
  const ordersLink = container.querySelector(
    'a[href*="orders"], a[href*="returns"]',
  );
  if (ordersLink) {
    const span = ordersLink.querySelector("span");
    if (span) span.textContent = "Orders";
    const svg = ordersLink.querySelector("svg");
    if (svg) {
      svg.outerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
          <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
          <line x1="12" y1="22.08" x2="12" y2="12"></line>
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
window.renderHeroBanners = function (banners) {
  const track = document.getElementById("hero-slides-track");
  const dots = document.getElementById("hero-dots-indicator");
  if (!track || !banners || !banners.length) return;

  track.innerHTML = banners
    .map((b, idx) => {
      const desktopImg = b.desktop_image || b.banner_image;
      const mobileImg = b.mobile_image || desktopImg;
      return `
      <a href="${b.banner_link || "#"}" draggable="false" class="carousel-slide ${idx === 0 ? "slide-active" : ""}" data-link="${b.banner_link || "#"}" style="cursor: pointer; height: 100%; position: relative; width: 100%; overflow: hidden; display: flex; align-items: center; justify-content: center; text-decoration: none;">
        <picture style="width: 100%; height: 100%; display: block;">
          <source media="(max-width: 768px)" srcset="${mobileImg}">
          <img src="${desktopImg}" alt="Hero Slide ${idx + 1}" draggable="false" style="width: 100%; height: 100%; object-fit: fill; display: block;">
        </picture>
      </a>
    `;
    })
    .join("");

  if (dots) {
    dots.innerHTML = banners
      .map(
        (_, idx) => `
      <span class="carousel-dot-indicator ${idx === 0 ? "dot-active" : ""}" data-slide-index="${idx}"></span>
    `,
      )
      .join("");
  }

  // Re-initialize hero carousel controls to bind dynamic slides
  if (window.initHeroCarousel) {
    window.initHeroCarousel();
  }
};

window.renderShoppableVideos = function (videos) {
  const track = document.getElementById("video-spotlight-track");
  if (!track || !videos || !videos.length) return;

  const cardsHtml = videos
    .map((videoData) => {
      const productId = parseInt(videoData.linked_product, 10) || "";
      const videoSrc = videoData.video_url;
      if (!videoSrc) return "";

      let influencer = videoData.influencer || "@kawachi_live";
      if (influencer === "@kawachi_live" && videoSrc) {
        // Extract from path if present, e.g. instagram.com/username/reel/
        const handleMatch = videoSrc.match(
          /instagram\.com\/([A-Za-z0-9_.]+)\/reel\//,
        );
        if (handleMatch) {
          influencer = "@" + handleMatch[1];
        } else {
          // Fallback to dynamic realistic handles based on shortcode
          const match = videoSrc.match(
            /(?:\/p\/|\/reel\/|\/tv\/)([A-Za-z0-9_-]+)/,
          );
          const shortcode = match ? match[1] : "default";
          const creatorHandles = [
            "@home_curator",
            "@aesthetic_spaces",
            "@urban_nest",
            "@interior_journal",
            "@cozy_abode",
            "@design_maven",
            "@minimalist_living",
            "@styling_comfort",
            "@modern_habitat",
            "@decormuse",
          ];
          let hash = 0;
          for (let i = 0; i < shortcode.length; i++)
            hash += shortcode.charCodeAt(i);
          influencer = creatorHandles[hash % creatorHandles.length];
        }
      }

      const title = videoData.title || "Customer Review";

      // Automatically extract YouTube thumbnails, fallback to WooCommerce product image, otherwise use generic default
      let thumbnail =
        "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=600&q=80";
      if (productId && window.KawachiProducts) {
        const prod = window.KawachiProducts.find((p) => p.id === productId);
        if (prod && prod.image) {
          thumbnail = prod.image;
        }
      }
      if (videoSrc.includes("youtube.com") || videoSrc.includes("youtu.be")) {
        let videoId = "";
        if (videoSrc.includes("watch?v="))
          videoId = videoSrc.split("v=")[1].split("&")[0];
        else if (videoSrc.includes("youtu.be/"))
          videoId = videoSrc.split("youtu.be/")[1].split("?")[0];
        else if (videoSrc.includes("/embed/"))
          videoId = videoSrc.split("/embed/")[1].split("?")[0];
        else if (videoSrc.includes("/shorts/"))
          videoId = videoSrc.split("/shorts/")[1].split("?")[0];
        if (videoId)
          thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      } else if (
        videoSrc.includes("instagram.com") ||
        videoSrc.includes("/reel/")
      ) {
        const match = videoSrc.match(
          /(?:\/p\/|\/reel\/|\/tv\/)([A-Za-z0-9_-]+)/,
        );
        const shortcode = match ? match[1] : null;
        if (shortcode) {
          thumbnail = `https://images.weserv.nl/?url=https://www.instagram.com/p/${shortcode}/media/?size=l`;
        }
      }

      const pseudoViews =
        ((title.length * 7) % 8) +
        2 +
        "." +
        ((title.length * 3) % 9) +
        "k views";

      const isInstagram =
        videoSrc.includes("instagram.com") || videoSrc.includes("/reel/");
      let innerCardHtml = "";

      if (isInstagram) {
        const match = videoSrc.match(
          /(?:\/p\/|\/reel\/|\/tv\/)([A-Za-z0-9_-]+)/,
        );
        const shortcode = match ? match[1] : null;
        let embedUrl = videoSrc;
        if (shortcode) {
          embedUrl = `https://www.instagram.com/reel/${shortcode}/embed/`;
        }
        innerCardHtml = `
        <iframe src="${embedUrl}" style="width:100%; height:100%; border:none; pointer-events:none;" scrolling="no" frameborder="0"></iframe>
      `;
      } else {
        innerCardHtml = `
        <img src="${thumbnail}" alt="${title}" style="width:100%;height:100%;object-fit:cover;position:absolute;top:0;left:0;">
        <div class="video-play-btn-circle"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></div>
      `;
      }

      // Resolve product name and price from cached product data
      let resolvedProductName = "";
      let resolvedProductPrice = "";
      let resolvedProductImage = "";
      if (productId && window.KawachiProducts) {
        const prod = window.KawachiProducts.find((p) => p.id === productId);
        if (prod) {
          resolvedProductName = prod.name || "";
          resolvedProductImage = prod.image || "";
          const price = parseFloat(prod.price) || 0;
          resolvedProductPrice =
            price > 0 ? "₹" + price.toLocaleString("en-IN") : "";
        }
      }

      return `
      <div class="video-card-wrap">
        <div class="video-card" data-product-id="${productId}" data-influencer="${influencer}" data-title="${title}" data-video-src="${videoSrc}" data-product-name="${resolvedProductName}" data-product-price="${resolvedProductPrice}" data-product-image="${resolvedProductImage}">
          ${innerCardHtml}
        </div>
        <div class="video-card-caption" style="text-align: center;"></div>
      </div>
    `;
    })
    .join("");

  track.innerHTML = cardsHtml;

  // Re-initialize carousel scroll bindings and loop clones
  if (window.initVideoSpotlightCarousel) {
    window.initVideoSpotlightCarousel();
  }
};

window.renderPromoBanners = function (banners) {
  const row = document.getElementById("promo-banners-row");
  if (!row || !banners || !banners.length) return;

  row.innerHTML = banners
    .map((b, idx) => {
      // 3 gradients matching Blue, Green, Yellow theme
      const gradients = [
        "linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)", // Blue
        "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)", // Green
        "linear-gradient(135deg, #d97706 0%, #f59e0b 100%)", // Yellow
      ];
      const textColors = ["#1e3c72", "#11998e", "#d97706"];
      const gradient = gradients[idx % gradients.length];
      const btnColor = textColors[idx % textColors.length];

      const title = b.title || "Deal Spotlight";
      const text = b.text || "Featured Choice";
      const btnText = b.button_text || "Shop Now >";

      const demoImages = [
        "images/products/meditation_chair.png",
        "images/products/trolley_organizer.png",
        "images/products/wall_shelves.png",
      ];
      const boxImage = b.banner_image || demoImages[idx % demoImages.length];

      const ids = ["promo-card-blue", "promo-card-orange", "promo-card-green"];
      const domId = ids[idx % ids.length];

      return `
      <div class="promo-box-triple" id="${domId}" style="background: ${gradient}; color: #ffffff;">
        <div class="promo-box-left">
          <h3 class="promo-title">${title}</h3>
          <p class="promo-text">${text}</p>
        </div>
        <div class="promo-box-right">
          <img src="${boxImage}" alt="${title}">
        </div>
        <a href="${b.banner_link || "#"}" class="promo-btn-white" style="text-decoration: none; color: ${btnColor} !important;">${btnText}</a>
      </div>
    `;
    })
    .join("");
};

window.loadHomepageACFSettings = async function () {
  try {
    // ── Helper: resolve a WP media ID to its source URL via proxy ──
    const mediaCache = {};
    const resolveMediaId = async (mediaId) => {
      if (!mediaId || isNaN(mediaId)) return "";
      if (mediaCache[mediaId]) return mediaCache[mediaId];
      try {
        const resp = await fetch(
          `/api/wp-proxy?endpoint=wp/v2/media/${mediaId}&_fields=source_url&_=${Date.now()}`,
        );
        if (resp.ok) {
          const data = await resp.json();
          mediaCache[mediaId] = data.source_url || "";
          return mediaCache[mediaId];
        }
      } catch (e) {
        /* silent */
      }
      return "";
    };

    // ── 1. Hero Carousel Banners & Below-Category Banners from hero_banner CPT ──
    let heroBanners = [];
    let belowBanners = [];
    try {
      const resp = await fetch(
        `/api/wp-proxy?endpoint=wp/v2/hero_banner&per_page=20&status=publish&_fields=id,title,acf&_=${Date.now()}`,
      );
      if (resp.ok) {
        const posts = await resp.json();
        // Resolve all media IDs in parallel
        const resolved = await Promise.all(
          posts.map(async (post) => {
            const acf = post.acf || {};
            const imgId = acf.banner_image;
            const imgUrl =
              typeof imgId === "number"
                ? await resolveMediaId(imgId)
                : typeof imgId === "string" && imgId.startsWith("http")
                  ? imgId
                  : typeof imgId === "object" && imgId && imgId.url
                    ? imgId.url
                    : "";
            // linked_product is an array of IDs; build a product link
            const productId = Array.isArray(acf.linked_product)
              ? acf.linked_product[0]
              : acf.linked_product || null;
            const link = productId
              ? `single-product.html?id=${productId}`
              : acf.banner_link || "#";
            return {
              imgUrl,
              link,
              placement: acf.placement || "top_hero_carousel",
            };
          }),
        );
        resolved.forEach((item) => {
          if (!item.imgUrl) return;
          const entry = {
            desktop_image: item.imgUrl,
            mobile_image: item.imgUrl,
            banner_link: item.link,
          };
          if (item.placement === "below_category_banner")
            belowBanners.push(entry);
          else heroBanners.push(entry);
        });
      }
    } catch (e) {
      console.warn("[ACF] hero_banner CPT fetch failed:", e);
    }

    if (heroBanners.length > 0 && window.renderHeroBanners) {
      console.log("[ACF] Rendering hero banners from CPT:", heroBanners.length);
      window.renderHeroBanners(heroBanners);
    }

    // Hydrate the two below-category banners next to Best Sellers from hero_banner CPT belowBanners
    const belowCategoryBanners = document.getElementById(
      "below-category-banners-container",
    );
    if (belowCategoryBanners && belowBanners.length > 0) {
      const bannersList = belowCategoryBanners.querySelectorAll(
        ".split-promo-banner",
      );
      belowBanners.forEach((b, idx) => {
        if (bannersList[idx]) {
          const imgEl = bannersList[idx].querySelector(
            ".banner-image-wrap img",
          );
          if (imgEl && b.desktop_image)
            imgEl.setAttribute("src", b.desktop_image);
          if (b.banner_link)
            bannersList[idx].setAttribute("href", b.banner_link);
        }
      });
    }

    // ── 2. Shoppable Videos from video_story CPT ──
    let dynamicVideos = [];
    try {
      const resp = await fetch(
        `/api/wp-proxy?endpoint=wp/v2/video_story&per_page=20&status=publish&_fields=id,title,acf&_=${Date.now()}`,
      );
      if (resp.ok) {
        const posts = await resp.json();
        posts.forEach((post) => {
          const acf = post.acf || {};
          if (acf.video_url) {
            const productId = Array.isArray(acf.linked_product)
              ? acf.linked_product[0]
              : acf.linked_product || null;
            dynamicVideos.push({
              video_url: acf.video_url,
              linked_product: productId || "",
              title: post.title?.rendered || "Customer Review",
              influencer: acf.influencer || "@kawachi_live",
            });
          }
        });
      }
    } catch (e) {
      console.warn("[ACF] video_story CPT fetch failed:", e);
    }

    if (dynamicVideos.length > 0 && window.renderShoppableVideos) {
      console.log("[ACF] Rendering videos from CPT:", dynamicVideos.length);
      window.renderShoppableVideos(dynamicVideos);
    }

    // ── 3. Promo Cards from promo_card CPT ──
    let promoCards = [];
    try {
      const resp = await fetch(
        `/api/wp-proxy?endpoint=wp/v2/promo_card&per_page=10&status=publish&_fields=id,title,acf&_=${Date.now()}`,
      );
      if (resp.ok) {
        const posts = await resp.json();
        // Sort by ID to ensure consistent Blue (mega sale), Green (Storage Items), Yellow (New Season) order
        posts.sort((a, b) => a.id - b.id);

        promoCards = await Promise.all(
          posts.map(async (post) => {
            const acf = post.acf || {};
            const imgId = acf.card_image;
            const imgUrl =
              typeof imgId === "number"
                ? await resolveMediaId(imgId)
                : typeof imgId === "string" && imgId.startsWith("http")
                  ? imgId
                  : typeof imgId === "object" && imgId && imgId.url
                    ? imgId.url
                    : "";
            const linkedIds = Array.isArray(acf.linked_products)
              ? acf.linked_products.map(Number).filter(Boolean)
              : [];
            const link = linkedIds.length
              ? `search.html?ids=${linkedIds.join(",")}&title=${encodeURIComponent(acf.card_heading || "Special Offer")}`
              : "#";

            return {
              badge_tag: post.title?.rendered?.toUpperCase() || "OFFER",
              title: acf.card_heading || "Deal Spotlight",
              text: acf.card_subtitle || "Featured Choice",
              banner_image: imgUrl,
              banner_link: link,
              button_text: acf.button_text || "Shop Now >",
            };
          }),
        );
      }
    } catch (e) {
      console.warn("[ACF] promo_card CPT fetch failed:", e);
    }

    if (promoCards.length > 0 && window.renderPromoBanners) {
      console.log("[ACF] Rendering promo cards from CPT:", promoCards.length);
      window.renderPromoBanners(promoCards);
    }

    return { heroBanners, belowBanners, dynamicVideos, promoCards };
  } catch (error) {
    console.warn("[ACF] loadHomepageACFSettings failed:", error);
    return null;
  }
};

// ── Mobile Bottom Navigation Bar (4 tabs) ──────────────────────────────────
function initMobileBottomNav() {
  // Only render once and only if viewport could be mobile (CSS will hide on desktop)
  if (document.querySelector(".mobile-bottom-nav")) return;

  const nav = document.createElement("nav");
  nav.className = "mobile-bottom-nav";
  nav.setAttribute("aria-label", "Mobile navigation");
  nav.innerHTML = `
    <a href="index.html" class="bottom-nav-item" id="bottom-nav-home">
      <div class="bottom-nav-icon-wrapper">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        </svg>
      </div>
      <span class="bottom-nav-label">Home</span>
    </a>
    <a href="account.html" class="bottom-nav-item" id="bottom-nav-profile">
      <div class="bottom-nav-icon-wrapper">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      </div>
      <span class="bottom-nav-label">Profile</span>
    </a>
    <a href="orders.html" class="bottom-nav-item" id="bottom-nav-orders">
      <div class="bottom-nav-icon-wrapper">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
          <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
          <line x1="12" y1="22.08" x2="12" y2="12"/>
        </svg>
      </div>
      <span class="bottom-nav-label">Orders</span>
    </a>
    <a href="cart.html" class="bottom-nav-item" id="bottom-nav-cart">
      <div class="bottom-nav-icon-wrapper">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="9" cy="21" r="1"></circle>
          <circle cx="20" cy="21" r="1"></circle>
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
        </svg>
        <span class="bottom-nav-badge" id="bottom-nav-cart-badge">0</span>
      </div>
      <span class="bottom-nav-label">Cart</span>
    </a>
  `;
  document.body.appendChild(nav);

  // Highlight active tab based on page URL
  const path = window.location.pathname.split("/").pop() || "index.html";
  if (!path || path === "" || path === "/" || path === "index.html") {
    document.getElementById("bottom-nav-home")?.classList.add("active");
  } else if (path.startsWith("account") || path.startsWith("support-center")) {
    document.getElementById("bottom-nav-profile")?.classList.add("active");
  } else if (path.startsWith("orders") || path.startsWith("returns")) {
    document.getElementById("bottom-nav-orders")?.classList.add("active");
  } else if (path.startsWith("cart")) {
    document.getElementById("bottom-nav-cart")?.classList.add("active");
  }

  // Sync cart badge
  function syncBottomCartBadge() {
    const badge = document.getElementById("bottom-nav-cart-badge");
    if (!badge || !window.KawachiCart) return;
    const total = window.KawachiCart.items.reduce((s, i) => s + i.quantity, 0);
    badge.textContent = total;
    badge.style.display = total > 0 ? "flex" : "none";
  }
  syncBottomCartBadge();
  document.addEventListener("kawachi-cart-updated", syncBottomCartBadge);
}

// Event hooks on page load
document.addEventListener("DOMContentLoaded", async () => {
  // Unify category links in sub-navbar
  syncSubNavbarCategoryLinks();

  // Sync header utilities and icons
  syncHeaderUtilitiesAndIcons();

  // Initialize unified search bar styling wrapper
  initUnifiedSearchBar();

  // Sticky cart panel disabled per user request (removed right-side blue strip)
  // injectStickyCartPanel();

  // Inject mobile bottom navigation bar (4 tabs: Home, Search, Account, Cart)
  initMobileBottomNav();

  // Global listener for both standard and floating island cart drawer triggers to redirect to cart.html
  document.addEventListener(
    "click",
    (e) => {
      const trigger = e.target.closest(
        "#cart-drawer-trigger, #island-cart-trigger",
      );
      if (trigger) {
        e.preventDefault();
        e.stopPropagation();
        window.location.href = "cart.html";
      }
    },
    true,
  );

  // Await live products connection/fetch resolution before layout rendering
  if (window.KawachiProductsPromise) {
    try {
      await window.KawachiProductsPromise;
    } catch (err) {
      console.warn(
        "[WooCommerce Client] DOMContentLoaded wait for live catalog promise rejected:",
        err,
      );
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
  const productCards = document.querySelectorAll(
    ".product-card, .flash-deal-box, .checkout-box",
  );
  productCards.forEach((card) => {
    const currentPriceEl = card.querySelector(
      ".price-current, .deal-price-current, .row-item-price",
    );
    const oldPriceEl = card.querySelector(".price-old, .deal-price-old");
    const badgeEl = card.querySelector(".product-badge.sale, .deal-badge");

    if (currentPriceEl && oldPriceEl) {
      const parsePrice = (text) => parseFloat(text.replace(/[^\d.]/g, ""));
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
        const item = window.KawachiCart.items.find((item) => item.id == id);
        if (item) {
          window.KawachiCart.updateQty(id, item.quantity + 1);
        }
      }
      const cartRow = e.target.closest("[data-cart-row-id]");
      if (cartRow) {
        const id = cartRow.getAttribute("data-cart-row-id");
        const item = window.KawachiCart.items.find((item) => item.id == id);
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
        const item = window.KawachiCart.items.find((item) => item.id == id);
        if (item) {
          window.KawachiCart.updateQty(id, item.quantity - 1);
        }
      }
      const cartRow = e.target.closest("[data-cart-row-id]");
      if (cartRow) {
        const id = cartRow.getAttribute("data-cart-row-id");
        const item = window.KawachiCart.items.find((item) => item.id == id);
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

      window.KawachiCart.addItem({
        id,
        name,
        price,
        image,
        category,
        quantity: 1,
      });

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
  const inlineAtcBtn = document.getElementById("inline-add-to-cart-btn");
  if (mainAtcBtn || stickyAtcBtn || mobileAtcBtn || inlineAtcBtn) {
    const handleDetailATC = (e) => {
      e.preventDefault();
      const name = document.querySelector(".product-title-detail").textContent;
      const priceText = document.getElementById("p-price-display").textContent;
      const price = parseFloat(priceText.replace(/[^\d.]/g, ""));
      const qty = parseInt(document.getElementById("qty-value").value || 1, 10);

      const urlParams = new URLSearchParams(window.location.search);
      const currentId = parseInt(urlParams.get("id"), 10) || 101;
      const product = window.KawachiProducts.find((x) => x.id === currentId);
      const category = product ? product.category : "Wellness";
      // Always get image from the product data (not imgEl.src which resolves to page URL when src is empty)
      const imgEl = document.getElementById("gallery-main-img");
      const image =
        (product && product.image) ||
        (imgEl ? imgEl.getAttribute("src") : "") ||
        "";

      // Add item to cart
      window.KawachiCart.addItem({
        id: currentId,
        name,
        price,
        image,
        category,
        quantity: qty,
      });

      // Redirect to Amazon-style cart confirmation page
      window.location.href = `cart-added.html?id=${currentId}&qty=${qty}`;
    };

    if (mainAtcBtn) mainAtcBtn.addEventListener("click", handleDetailATC);
    if (stickyAtcBtn) stickyAtcBtn.addEventListener("click", handleDetailATC);
    if (mobileAtcBtn) mobileAtcBtn.addEventListener("click", handleDetailATC);
    if (inlineAtcBtn) inlineAtcBtn.addEventListener("click", handleDetailATC);
  }

  // Buy Now button trigger
  const buyNowBtn = document.getElementById("main-buy-now-btn");
  const mobileBuyNowBtn = document.getElementById("mobile-buy-now-btn");
  const inlineBuyNowBtn = document.getElementById("inline-buy-now-btn");
  if (buyNowBtn || mobileBuyNowBtn || inlineBuyNowBtn) {
    const handleBuyNow = (e) => {
      e.preventDefault();
      const name = document.querySelector(".product-title-detail").textContent;
      const priceText = document.getElementById("p-price-display").textContent;
      const price = parseFloat(priceText.replace(/[^\d.]/g, ""));
      const qty = parseInt(document.getElementById("qty-value").value || 1, 10);

      const urlParams = new URLSearchParams(window.location.search);
      const currentId = parseInt(urlParams.get("id"), 10) || 101;
      const product = window.KawachiProducts.find((x) => x.id === currentId);
      const category = product ? product.category : "Wellness";
      // Always get image from the product data (not imgEl.src which resolves to page URL when src is empty)
      const imgEl = document.getElementById("gallery-main-img");
      const image =
        (product && product.image) ||
        (imgEl ? imgEl.getAttribute("src") : "") ||
        "";

      window.KawachiCart.addItem({
        id: currentId,
        name,
        price,
        image,
        category,
        quantity: qty,
      });

      window.location.href = "checkout.html";
    };

    if (buyNowBtn) buyNowBtn.addEventListener("click", handleBuyNow);
    if (mobileBuyNowBtn)
      mobileBuyNowBtn.addEventListener("click", handleBuyNow);
    if (inlineBuyNowBtn)
      inlineBuyNowBtn.addEventListener("click", handleBuyNow);
  }

  // Fallbacks for missing search tag utility functions
  window.hydrateSearchAssistanceTags =
    window.hydrateSearchAssistanceTags ||
    function () {
      console.log(
        "[SearchTagChips] Default global tag cloud hydration handler.",
      );
    };

  function getTrendingTags() {
    return [
      "table",
      "chair",
      "sofa",
      "rack",
      "shelf",
      "hanger",
      "wardrobe",
      "desk",
    ];
  }

  // 5. Premium Shopify-Style Centered Search Autocomplete & Focus Suggestions
  const searchContainers = document.querySelectorAll(
    ".search-container, .unified-search-wrapper",
  );
  const searchBackdrop = document.getElementById("search-backdrop");

  const getAutocompleteDropdownHtml = (query) => {
    // 1. Tag Suggestions
    const chips =
      window.searchTagChips && window.searchTagChips.length > 0
        ? window.searchTagChips
        : getTrendingTags();

    const filteredTags = query
      ? chips.filter((t) => t.toLowerCase().includes(query))
      : chips;

    // 2. Product Matches
    let productSectionHtml = "";
    if (query) {
      const matchingProducts = (window.KawachiProducts || [])
        .filter(
          (p) =>
            p.name.toLowerCase().includes(query) ||
            (p.category && p.category.toLowerCase().includes(query)),
        )
        .slice(0, 5);

      if (matchingProducts.length > 0) {
        const productItemsHtml = matchingProducts
          .map((p) => {
            const formattedPrice =
              "₹" +
              Number(p.price).toLocaleString("en-IN", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              });
            const mainImg = p.image || "https://via.placeholder.com/150";
            return `
            <a href="single-product.html?id=${p.id}" class="search-autocomplete-item">
              <img src="${mainImg}" class="search-autocomplete-img" alt="${p.name}">
              <div class="search-autocomplete-info">
                <span class="search-autocomplete-title">${p.name}</span>
                <span class="search-autocomplete-category">${p.category || "lifestyle"}</span>
              </div>
              <span class="search-autocomplete-price">${formattedPrice}</span>
            </a>
          `;
          })
          .join("");

        productSectionHtml = `
          <div class="search-autocomplete-section-title" style="padding: 10px 16px 6px; font-size: 11px; font-weight: 750; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; background: #f8fafc; border-bottom: 1px solid var(--color-border-light);">
            Matching Products
          </div>
          <div class="search-autocomplete-products-list">
            ${productItemsHtml}
          </div>
        `;
      }
    } else {
      // If query is empty, show top Bestsellers as product preview suggestions!
      const defaultProducts = (window.KawachiProducts || []).slice(0, 3);
      if (defaultProducts.length > 0) {
        const productItemsHtml = defaultProducts
          .map((p) => {
            const formattedPrice =
              "₹" +
              Number(p.price).toLocaleString("en-IN", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              });
            const mainImg = p.image || "https://via.placeholder.com/150";
            return `
            <a href="single-product.html?id=${p.id}" class="search-autocomplete-item">
              <img src="${mainImg}" class="search-autocomplete-img" alt="${p.name}">
              <div class="search-autocomplete-info">
                <span class="search-autocomplete-title">${p.name}</span>
                <span class="search-autocomplete-category">${p.category || "lifestyle"}</span>
              </div>
              <span class="search-autocomplete-price">${formattedPrice}</span>
            </a>
          `;
          })
          .join("");

        productSectionHtml = `
          <div class="search-autocomplete-section-title" style="padding: 10px 16px 6px; font-size: 11px; font-weight: 750; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; background: #f8fafc; border-bottom: 1px solid var(--color-border-light);">
            Recommended Products
          </div>
          <div class="search-autocomplete-products-list">
            ${productItemsHtml}
          </div>
        `;
      }
    }

    // 3. Tag suggestion html
    let tagsSectionHtml = "";
    if (filteredTags.length > 0) {
      const tagChipsHtml = filteredTags
        .map(
          (tag) => `
        <div class="search-tag-suggestion-chip" data-tag="${encodeURIComponent(tag)}" style="padding: 10px 16px; font-size: 13.5px; font-weight: 600; color: #334155; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: background 0.2s; border-bottom: 1px solid var(--color-border-light);" onmouseover="this.style.background='#F1F5F9'" onmouseout="this.style.background='transparent'">
          <svg width="14" height="14" fill="none" stroke="#64748B" stroke-width="2.5" viewBox="0 0 24 24" style="flex-shrink:0;">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
          <span>${tag}</span>
        </div>
      `,
        )
        .join("");

      tagsSectionHtml = `
        <div class="search-autocomplete-section-title" style="padding: 10px 16px 6px; font-size: 11px; font-weight: 750; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; background: #f8fafc; border-bottom: 1px solid var(--color-border-light);">
          Suggested Keywords
        </div>
        <div class="search-autocomplete-tags-list">
          ${tagChipsHtml}
        </div>
      `;
    }

    if (!tagsSectionHtml && !productSectionHtml) {
      return `
        <div style="padding: 16px; font-size: 13px; color: var(--color-text-muted); text-align: center; font-weight: 500;">
          No matching results found
        </div>
      `;
    }

    return `
      <div class="search-autocomplete-inner" style="display: flex; flex-direction: column;">
        ${tagsSectionHtml}
        ${productSectionHtml}
      </div>
    `;
  };

  searchContainers.forEach((container) => {
    const form = container.querySelector("form");
    const input = container.querySelector(".search-input");

    let resultsBox = container.querySelector(".search-autocomplete-results");
    if (!resultsBox) {
      resultsBox = document.createElement("div");
      resultsBox.classList.add("search-autocomplete-results");
      container.appendChild(resultsBox);
    }

    // Handle tag chip selection click
    resultsBox.addEventListener("click", (e) => {
      const chip = e.target.closest(".search-tag-suggestion-chip");
      if (chip) {
        const tag = decodeURIComponent(chip.getAttribute("data-tag"));
        if (input) {
          input.value = tag;
          if (form) {
            form.submit();
          }
        }
      }
    });

    if (form) {
      form.action = "search.html";
      form.method = "GET";
      if (input) {
        input.name = "q";
      }
    }

    if (input) {
      const openSuggestions = () => {
        const query = input.value.trim().toLowerCase();
        if (query === "") {
          resultsBox.style.display = "none";
          if (searchBackdrop) searchBackdrop.classList.remove("active");
          return;
        }

        if (searchBackdrop) searchBackdrop.classList.add("active");
        resultsBox.innerHTML = getAutocompleteDropdownHtml(query);
        resultsBox.style.display = "block";
      };

      // Show default suggestions on focus or click
      input.addEventListener("focus", openSuggestions);
      input.addEventListener("click", openSuggestions);

      // Handle query typing
      input.addEventListener("input", openSuggestions);
    }
  });

  // Global listeners to close search dropdown
  document.addEventListener("click", (e) => {
    let clickedSearch = false;
    searchContainers.forEach((container) => {
      if (container.contains(e.target)) clickedSearch = true;
    });

    if (!clickedSearch) {
      searchContainers.forEach((container) => {
        const resultsBox = container.querySelector(
          ".search-autocomplete-results",
        );
        if (resultsBox) resultsBox.style.display = "none";
      });
      if (searchBackdrop) searchBackdrop.classList.remove("active");
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      searchContainers.forEach((container) => {
        const resultsBox = container.querySelector(
          ".search-autocomplete-results",
        );
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
    navLinks.forEach((link) => {
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
        trendingTop =
          trendingSec.getBoundingClientRect().top + window.scrollY - 200;
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
      const isSearchFocused =
        searchInput && document.activeElement === searchInput;

      // Ensure header remains flat and idle without scrolled capsule transformations
      siteHeader.classList.remove("scrolled");
      siteHeader.classList.remove("scrolling-up");

      // Smart hide/show on scroll
      if (currentScrollY <= 15) {
        // At the very top of the page: show header
        siteHeader.classList.remove("header-hidden");
      } else {
        // Normal scroll direction checking anywhere in the page
        if (
          currentScrollY > lastScrollY &&
          currentScrollY - lastScrollY > scrollThreshold
        ) {
          // Scrolling down: hide the header unless search is focused
          if (!isSearchFocused) {
            siteHeader.classList.add("header-hidden");
          }
        } else if (
          currentScrollY < lastScrollY &&
          lastScrollY - currentScrollY > scrollThreshold
        ) {
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
    window.addEventListener(
      "scroll",
      () => {
        if (!scrollScheduled) {
          window.requestAnimationFrame(() => {
            handleScroll();
            scrollScheduled = false;
          });
          scrollScheduled = true;
        }
      },
      { passive: true },
    );

    handleScroll();

    // Smooth scroll back to top when clicking Home link or Logo on homepage
    if (trendingSec) {
      const homeLink = document.querySelector('.nav-menu a[href="index.html"]');
      if (homeLink) {
        homeLink.addEventListener("click", (e) => {
          e.preventDefault();
          window.scrollTo({ top: 0, behavior: "smooth" });
          if (history.pushState) {
            history.pushState(null, null, " ");
          } else {
            window.location.hash = "";
          }
        });
      }

      const logoLink = document.getElementById("site-logo");
      if (logoLink) {
        logoLink.addEventListener("click", (e) => {
          e.preventDefault();
          window.scrollTo({ top: 0, behavior: "smooth" });
          if (history.pushState) {
            history.pushState(null, null, " ");
          } else {
            window.location.hash = "";
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
      { name: "Xpressbees", logo: "images/partners/xpressbees.svg" },
    ];

    const logoScrollTrack = document.querySelector(".logo-scroll-track");
    if (logoScrollTrack) {
      const partnerTitle = document.querySelector(".partner-cloud-title");
      if (partnerTitle) {
        partnerTitle.innerHTML = "Our Partner Brands";
      }

      let groupHtml = '<div class="logo-scroll-group">';
      partnerBrands.forEach(function (brand) {
        groupHtml += `
          <div class="partner-logo-item">
            <img src="${brand.logo}" alt="${brand.name}" onerror="this.style.display='none'">
          </div>
        `;
      });
      groupHtml += "</div>";

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
  const faqItem = btn.closest(".faq-item-2026");
  if (!faqItem) return;
  const panel = faqItem.querySelector(".faq-answer-panel");
  if (!panel) return;

  const isOpen = faqItem.classList.contains("open");

  // Close all other FAQ items first (accordion behavior)
  document.querySelectorAll(".faq-item-2026.open").forEach(function (item) {
    if (item !== faqItem) {
      item.classList.remove("open");
      const p = item.querySelector(".faq-answer-panel");
      if (p) p.style.maxHeight = null;
    }
  });

  if (isOpen) {
    faqItem.classList.remove("open");
    panel.style.maxHeight = null;
  } else {
    faqItem.classList.add("open");
    panel.style.maxHeight = panel.scrollHeight + "px";
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
  dealDescription:
    "Get up to 45% off on our best-selling smart desk, meditation chair, and sauna collection.",
  countdownSeconds: 14200,
};

function hydrateDealPodium() {
  if (!window.KawachiProducts || !KawachiDealConfig) return;
  var config = KawachiDealConfig;
  var podiumProducts = document.querySelector(".podium-products");
  if (!podiumProducts) return;

  var imgs = podiumProducts.querySelectorAll("img");
  config.productIds.forEach(function (pid, i) {
    var product = window.KawachiProducts.find(function (p) {
      return p.id === pid;
    });
    if (product && imgs[i]) {
      imgs[i].src = product.image;
      imgs[i].alt = product.name;
    }
  });

  var titleEl = document.querySelector(".deal-title-2026");
  if (titleEl && config.dealTitle) {
    titleEl.textContent = config.dealTitle;
  }
}

function createFullCardHtml(p) {
  // Secondary image switcher compatibility dynamically from WooCommerce
  const mainImg =
    p.image ||
    (p.images && p.images.length > 0
      ? p.images[0].src
      : "https://via.placeholder.com/600/ffffff/0f172a?text=No+Image");
  const hoverImg = p.images && p.images.length > 1 ? p.images[1].src : mainImg;

  return `
    <div class="product-card marquee-product-card" data-gallery-count="2" onclick="window.location.href='single-product.html?id=${p.id}'">
      <div class="product-image-container">
        <img src="${p.image}" alt="${p.name}" class="product-image" loading="lazy">
        <img src="${hoverImg}" alt="${p.name}" class="product-image product-gallery-img" loading="lazy">
        <div class="gallery-dots">
          <span class="gallery-dot dot-active" data-dot-index="0"></span>
          <span class="gallery-dot" data-dot-index="1"></span>
        </div>
      </div>
      <div class="product-info">
        <span class="product-category">${p.category || "lifestyle"}</span>
        <h3 class="product-title" onclick="window.location.href='single-product.html?id=${p.id}'">${p.name}</h3>
        ${window.getCardRatingHtml(p.rating, p.reviews)}
        ${window.getCardPriceRowHtml(p)}
      </div>
    </div>
  `;
}

function setupStaticSlider(track, products) {
  if (!track) return;
  const container = track.closest(".static-marquee-container");
  if (!container) return;

  // Adjust overflow dynamically to allow native swiping on mobile viewports
  function adjustOverflow() {
    if (window.innerWidth <= 767) {
      container.style.setProperty("overflow-x", "auto", "important");
      container.style.setProperty("overflow-y", "hidden", "important");
    } else {
      container.style.setProperty("overflow", "hidden", "important");
    }
  }
  adjustOverflow();

  // Remove skeleton loading class if present
  track.classList.remove("skeleton-loading");

  // Render cards
  track.innerHTML = products.map(createFullCardHtml).join("");

  // Inject rectangular navigation buttons
  const prevBtn = document.createElement("button");
  prevBtn.className = "static-slider-arrow prev";
  prevBtn.setAttribute("aria-label", "Previous Page");
  prevBtn.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width: 24px; height: 24px;">
      <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  `;

  const nextBtn = document.createElement("button");
  nextBtn.className = "static-slider-arrow next";
  nextBtn.setAttribute("aria-label", "Next Page");
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

  prevBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const visible = getVisibleCards();
    currentIndex = Math.max(0, currentIndex - visible);
    updateSlider();
    resetAutoScroll();
  });

  nextBtn.addEventListener("click", (e) => {
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

  // Swipe by finger implementation
  let touchStartX = 0;
  let touchEndX = 0;

  track.addEventListener(
    "touchstart",
    (e) => {
      touchStartX = e.changedTouches[0].screenX;
    },
    { passive: true },
  );

  track.addEventListener(
    "touchend",
    (e) => {
      touchEndX = e.changedTouches[0].screenX;
      handleSwipe();
    },
    { passive: true },
  );

  function handleSwipe() {
    const swipeThreshold = 50;
    const maxIdx = getMaxIndex();

    if (touchStartX - touchEndX > swipeThreshold) {
      if (currentIndex < maxIdx) {
        currentIndex = Math.min(currentIndex + 1, maxIdx);
        updateSlider();
        resetAutoScroll();
      }
    } else if (touchEndX - touchStartX > swipeThreshold) {
      if (currentIndex > 0) {
        currentIndex = Math.max(0, currentIndex - 1);
        updateSlider();
        resetAutoScroll();
      }
    }
  }

  window.addEventListener("resize", () => {
    adjustOverflow();
    currentIndex = Math.min(currentIndex, getMaxIndex());
    updateSlider();
  });

  setTimeout(updateSlider, 200);
}

// Expose to window so other pages (e.g. search.html) can call the same slider
window.setupStaticSlider = setupStaticSlider;

function hydrateStaticProductMarquees() {
  if (!window.KawachiProducts) return;
  const trendingTrack = document.getElementById(
    "static-trending-marquee-track",
  );
  const bestsellerTrack = document.getElementById(
    "static-bestseller-marquee-track",
  );

  if (!trendingTrack && !bestsellerTrack) return;

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
    .slice(0, 12);

  setupStaticSlider(grid, trendingProducts);
}

function hydrateCustomersAlsoBought() {
  if (!window.KawachiProducts) return;
  const grid = document.getElementById("customers-also-bought-track");
  if (!grid) return;

  const products = [...window.KawachiProducts]
    .sort(() => 0.5 - Math.random())
    .slice(0, 10);

  setupStaticSlider(grid, products);
}

// ==========================================================================
// FAQ Accordion - Hydration from WordPress REST API
// ==========================================================================
async function hydrateFaqSection() {
  const faqSection = document.getElementById("faq");
  const faqListContainer = document.querySelector(".faq-list-2026");
  if (!faqSection || !faqListContainer) return;

  const BASE_URL = "https://kawachigroup.com";
  const CK = "ck_e0bb10c03f926e6e59294b13c65712fb5ef1a872";
  const CS = "cs_71d46fbb1e0197e39838a294437c61e581ece91f";

  try {
    const url = new URL(`${BASE_URL}/wp-json/wp/v2/faq_item`);
    url.searchParams.set("per_page", "100");
    url.searchParams.set("_fields", "id,title,acf");
    url.searchParams.set("consumer_key", CK);
    url.searchParams.set("consumer_secret", CS);

    const resp = await fetch(url.toString());
    if (!resp.ok) throw new Error(`HTTP ${resp.status} from faq_item endpoint`);
    const faqs = await resp.json();

    if (!Array.isArray(faqs) || faqs.length === 0) {
      faqSection.style.display = "none";
      return;
    }

    // Filter to entries that have valid ACF fields (skip entries with acf: false or missing question/answer)
    const validFaqs = faqs.filter(
      (item) => item && item.acf && item.acf.question && item.acf.answer,
    );

    if (validFaqs.length === 0) {
      faqSection.style.display = "none";
      return;
    }

    // Render the FAQ list accordion structure matching the existing design
    faqListContainer.innerHTML = validFaqs
      .map(
        (item) => `
      <div class="faq-item-2026">
        <button class="faq-question-btn" onclick="toggleFaq(this)">
          <span>${item.acf.question}</span>
          <svg class="faq-icon-svg" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"></path>
          </svg>
        </button>
        <div class="faq-answer-panel">
          <div class="faq-answer-content">
            ${item.acf.answer}
          </div>
        </div>
      </div>
    `,
      )
      .join("");

    console.log("[FAQ Hydration] Hydrated FAQ items count:", validFaqs.length);
    console.log(
      "[Section E — FAQ Accordion] Resolved data:",
      validFaqs.map((item) => ({
        question: item.acf.question,
        answer: item.acf.answer,
      })),
    );
  } catch (err) {
    console.warn("[FAQ Hydration] Failed to fetch or render FAQs:", err);
    faqSection.style.display = "none";
  }
}

// ==========================================================================
// Search Tag Chips - Hydration and Cache from WordPress REST API
// ==========================================================================
async function fetchSearchTagChips() {
  const BASE_URL = "https://kawachigroup.com";
  const CK = "ck_e0bb10c03f926e6e59294b13c65712fb5ef1a872";
  const CS = "cs_71d46fbb1e0197e39838a294437c61e581ece91f";

  try {
    const url = new URL(`${BASE_URL}/wp-json/wp/v2/search_tag_chip`);
    url.searchParams.set("per_page", "100");
    url.searchParams.set("_fields", "id,title,acf");
    url.searchParams.set("consumer_key", CK);
    url.searchParams.set("consumer_secret", CS);

    const resp = await fetch(url.toString());
    if (!resp.ok)
      throw new Error(`HTTP ${resp.status} from search_tag_chip endpoint`);
    const chips = await resp.json();

    if (!Array.isArray(chips) || chips.length === 0) {
      window.searchTagChips = [];
      hydrateSearchAssistanceTags();
      return;
    }

    // Filter valid entries with acf.tag_text
    const validChips = chips
      .filter((item) => item && item.acf && item.acf.tag_text)
      .map((item) => item.acf.tag_text.trim());

    window.searchTagChips = validChips;
    console.log("[SearchTagChips] Fetched search tags:", window.searchTagChips);

    // Call hydration for the tag cloud
    hydrateSearchAssistanceTags();
  } catch (err) {
    console.warn("[SearchTagChips] Failed to fetch search tag chips:", err);
    window.searchTagChips = [];
    hydrateSearchAssistanceTags();
  }
}

function hideSearchAssistanceSection() {
  const sections = document.querySelectorAll(".search-assistance-section");
  sections.forEach((sec) => {
    sec.style.display = "none";
  });
}

// ==========================================================================
// WordPress REST API — Shared Helpers
// ==========================================================================
(function () {
  const WP_BASE = "https://kawachigroup.com";
  const CK = "ck_e0bb10c03f926e6e59294b13c65712fb5ef1a872";
  const CS = "cs_71d46fbb1e0197e39838a294437c61e581ece91f";

  /**
   * Generic WP REST GET helper with consumer key auth in URL.
   */
  async function wpFetch(path, params = {}) {
    const cleanPath = path.replace(/^\/wp-json\//, "");
    const url = new URL(window.location.origin + "/api/wp-proxy");
    url.searchParams.set("endpoint", cleanPath);
    url.searchParams.set("consumer_key", CK);
    url.searchParams.set("consumer_secret", CS);
    url.searchParams.set("_", Date.now());
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    const res = await fetch(url.toString());
    if (!res.ok)
      throw new Error(`HTTP ${res.status} proxy call for ${cleanPath}`);
    return res.json();
  }

  /**
   * Resolve an array of WooCommerce product IDs via the /products endpoint.
   * Returns a map of id -> mapped product object.
   */
  async function resolveProductIds(ids) {
    if (!ids || !ids.length) return {};
    const unique = [...new Set(ids.map(Number).filter(Boolean))];
    // Batch in groups of 50 (WC per_page max)
    const chunks = [];
    for (let i = 0; i < unique.length; i += 50)
      chunks.push(unique.slice(i, i + 50));

    const mapWooProduct = (p) => {
      const regularPrice =
        parseFloat(p.regular_price) || parseFloat(p.price) || 0;
      const currentPrice = parseFloat(p.price) || 0;
      let demoVideoUrl = "";
      if (p.acf) demoVideoUrl = p.acf.demo_video_url || p.acf.video_url || "";
      if (!demoVideoUrl && p.meta_data) {
        const found = p.meta_data.find((m) =>
          [
            "demo_video_url",
            "_demo_video_url",
            "video_url",
            "_video_url",
          ].includes(m.key),
        );
        if (found) demoVideoUrl = found.value;
      }
      return {
        id: p.id,
        name: p.name,
        price: currentPrice,
        regular_price: regularPrice > currentPrice ? regularPrice : null,
        category:
          p.categories && p.categories.length > 0
            ? p.categories[0].name
            : "Lifestyle",
        image: p.images && p.images.length > 0 ? p.images[0].src : "",
        images: p.images || [],
        attributes: p.attributes || [],
        rating: p.average_rating || "4.5",
        reviews: String(p.rating_count || 12),
        sales_count: p.total_sales || 100,
        weekly_sales: Math.round((p.total_sales || 100) / 4),
        description: p.description || p.short_description || "",
        short_description: p.short_description || "",
        featured: p.featured || false,
        tags: p.tags || [],
        stock_status: p.stock_status || "instock",
        demo_video_url: demoVideoUrl,
      };
    };

    const results = await Promise.all(
      chunks.map((chunk) =>
        wpFetch("/wp-json/wc/v3/products", {
          include: chunk.join(","),
          per_page: "50",
          status: "publish",
        }).catch(() => []),
      ),
    );

    const map = {};
    results.flat().forEach((p) => {
      map[p.id] = mapWooProduct(p);
    });
    return map;
  }

  /**
   * Render a product card (slide variant) using existing helpers in index.html scope.
   */
  function renderProductCard(p) {
    if (!p || typeof window.getCardRatingHtml !== "function") return "";
    const mainImg =
      p.image ||
      (p.images && p.images.length > 0
        ? p.images[0].src
        : "https://via.placeholder.com/600/f8fafc/0f172a?text=No+Image");
    const hoverImg =
      p.images && p.images.length > 1 ? p.images[1].src : mainImg;
    const savings = p.regular_price
      ? Math.round(((p.regular_price - p.price) / p.regular_price) * 100)
      : 0;
    const savingsHtml =
      savings > 0
        ? `<span class="deal-discount-badge" style="position:absolute!important;top:10px!important;left:10px!important;z-index:2!important;">${savings}% OFF</span>`
        : "";
    return `
      <div class="product-card marquee-product-card product-slide-card" data-gallery-count="2" onclick="if(!event.target.closest('button'))window.location.href='single-product.html?id=${p.id}'">
        <div class="product-image-container" style="position:relative;">
          ${savingsHtml}
          <img src="${mainImg}" alt="${p.name}" class="product-image" loading="lazy">
          <img src="${hoverImg}" alt="${p.name}" class="product-image product-gallery-img" loading="lazy">
          <div class="gallery-dots"><span class="gallery-dot dot-active" data-dot-index="0"></span><span class="gallery-dot" data-dot-index="1"></span></div>
        </div>
        <div class="product-info">
          <span class="product-category">${p.category || "lifestyle"}</span>
          <h3 class="product-title" onclick="window.location.href='single-product.html?id=${p.id}'">${p.name}</h3>
          ${window.getCardRatingHtml(p.rating, p.reviews)}
          ${window.getCardPriceRowHtml(p)}
        </div>
      </div>`;
  }

  /**
   * Render a discovery grid item (2x2 thumbnail link).
   */
  function renderDiscoveryItem(p) {
    const shortName = p.name.split(" ").slice(0, 3).join(" ");
    return `<a href="single-product.html?id=${p.id}" class="discovery-grid-item"><img src="${p.image}" alt="${p.name}" loading="lazy"><span>${shortName}</span></a>`;
  }

  // ==========================================================================
  // Section D — Site Settings
  // ==========================================================================
  async function fetchAndHydrateSiteSettings() {
    try {
      const pages = await wpFetch("/wp-json/wp/v2/pages", {
        slug: "site-settings",
        _fields: "id,slug,acf",
      });
      if (!Array.isArray(pages) || !pages.length || !pages[0].acf) {
        console.warn("[Section D — Site Settings] No ACF data found.");
        return;
      }
      const acf = pages[0].acf;
      console.log(
        "[Section D — Site Settings] ACF object:",
        JSON.stringify({
          limited_time_offer_enabled: acf.limited_time_offer_enabled,
          deal_products_count: (acf.deal_products || []).length,
          deal_end_time: acf.deal_end_time,
          bestsellers_mode: acf.bestsellers_mode,
          bestsellers_auto_sort: acf.bestsellers_auto_sort,
          most_loved_mode: acf.most_loved_mode,
          most_loved_auto_sort: acf.most_loved_auto_sort,
          customers_also_bought_mode: acf.customers_also_bought_mode,
          bestsellers_section_title: acf.bestsellers_section_title,
          most_loved_section_title: acf.most_loved_section_title,
          customers_also_bought_section_title:
            acf.customers_also_bought_section_title,
        }),
      );

      // — Limited Time Offer Bar —
      const ltoBar = document.getElementById("limited-time-offer-bar");
      const ltoText = document.getElementById("lto-text");
      const ltoCoupon = document.getElementById("lto-coupon");
      if (ltoBar && acf.limited_time_offer_enabled) {
        if (ltoText) ltoText.textContent = acf.limited_time_offer_text || "";
        if (ltoCoupon && acf.coupon_code)
          ltoCoupon.textContent = acf.coupon_code;
        ltoBar.style.display = "block";
      }

      // — Product Details Page Scrolling Ticker Strip —
      const pdpLtoStrip = document.getElementById("pdp-lto-strip");
      if (pdpLtoStrip && acf.limited_time_offer_enabled) {
        const offerText = acf.limited_time_offer_text || "";
        const tickerInner = pdpLtoStrip.querySelector("[data-lto-inner]");
        if (tickerInner && offerText) {
          tickerInner.innerHTML = `
            <span style="display: inline-block; padding-right: 50px;">⚡️ ${offerText} ⚡️</span>
            <span style="display: inline-block; padding-right: 50px;">⚡️ ${offerText} ⚡️</span>
            <span style="display: inline-block; padding-right: 50px;">⚡️ ${offerText} ⚡️</span>
          `;
        }
      }

      // — Save Dynamic Coupons for Cart & Checkout —
      if (acf.coupon_code) {
        localStorage.setItem("dynamic_coupon_code", acf.coupon_code);

        // Auto-migrate active coupon selection from old KAWACHI05 if configured
        const applied = localStorage.getItem("applied_coupon");
        if (applied === "KAWACHI05") {
          localStorage.setItem("applied_coupon", acf.coupon_code);
        }
      }
      if (acf.limited_time_offer_text) {
        localStorage.setItem("dynamic_lto_text", acf.limited_time_offer_text);
      }

      // — Countdown Clock —
      if (
        acf.deal_end_time &&
        typeof window.startDealsCountdownFromSiteSettings === "function"
      ) {
        window.startDealsCountdownFromSiteSettings(acf.deal_end_time);
      }
      // expose for index.html initHeroCarousel area to also call
      window._siteSettingsDealEndTime = acf.deal_end_time || null;

      // — Collect all IDs to resolve —
      const dealIds = (acf.deal_products || []).map(Number).filter(Boolean);

      // Bestsellers: manual or auto
      let bestsellerIds = [];
      if (!acf.bestsellers_mode && acf.bestsellers_manual_products) {
        bestsellerIds = (
          Array.isArray(acf.bestsellers_manual_products)
            ? acf.bestsellers_manual_products
            : []
        )
          .map(Number)
          .filter(Boolean);
      }

      // Most Loved: manual or auto
      let mostLovedIds = [];
      if (!acf.most_loved_mode && acf.most_loved_manual_products) {
        mostLovedIds = (
          Array.isArray(acf.most_loved_manual_products)
            ? acf.most_loved_manual_products
            : []
        )
          .map(Number)
          .filter(Boolean);
      }

      // Customers Also Bought: manual or auto
      let customersAlsoBoughtIds = [];
      if (
        !acf.customers_also_bought_mode &&
        acf.customers_also_bought_manual_products
      ) {
        customersAlsoBoughtIds = (
          Array.isArray(acf.customers_also_bought_manual_products)
            ? acf.customers_also_bought_manual_products
            : []
        )
          .map(Number)
          .filter(Boolean);
      }

      // Resolve deal product IDs
      const allManualIds = [
        ...new Set([
          ...dealIds,
          ...bestsellerIds,
          ...mostLovedIds,
          ...customersAlsoBoughtIds,
        ]),
      ];
      const productMap = await resolveProductIds(allManualIds);
      console.log(
        "[Section D — Site Settings] Resolved product IDs count:",
        Object.keys(productMap).length,
      );

      // — Deals of the Day —
      const dealsTrack = document.getElementById("deals-slider-track");
      if (dealsTrack && dealIds.length) {
        const dealProducts = dealIds
          .map((id) => productMap[id])
          .filter(Boolean);
        if (dealProducts.length) {
          dealsTrack.innerHTML = dealProducts
            .map((p) => {
              const savings = p.regular_price
                ? Math.round(
                    ((p.regular_price - p.price) / p.regular_price) * 100,
                  )
                : 0;
              const savingsHtml =
                savings > 0
                  ? `<span class="deal-discount-badge" style="position:absolute!important;top:10px!important;left:10px!important;z-index:2!important;">${savings}% OFF</span>`
                  : "";
              const mainImg =
                p.image ||
                "https://via.placeholder.com/600/f8fafc/0f172a?text=No+Image";
              const hoverImg =
                p.images && p.images.length > 1 ? p.images[1].src : mainImg;
              return `
              <div class="deal-product-item-card product-card" onclick="if(!event.target.closest('button'))window.location.href='single-product.html?id=${p.id}'">
                <div class="product-image-container" style="position:relative;">
                  ${savingsHtml}
                  <img src="${mainImg}" alt="${p.name}" class="product-image" loading="lazy">
                  <img src="${hoverImg}" alt="${p.name}" class="product-image product-gallery-img" loading="lazy">
                  <div class="gallery-dots"><span class="gallery-dot dot-active" data-dot-index="0"></span><span class="gallery-dot" data-dot-index="1"></span></div>
                </div>
                <div class="product-info">
                  <span class="product-category">${p.category || "lifestyle"}</span>
                  <h3 class="product-title" onclick="window.location.href='single-product.html?id=${p.id}'">${p.name}</h3>
                  ${typeof window.getCardRatingHtml === "function" ? window.getCardRatingHtml(p.rating, p.reviews) : ""}
                  ${typeof window.getCardPriceRowHtml === "function" ? window.getCardPriceRowHtml(p) : ""}
                </div>
              </div>`;
            })
            .join("");
          console.log(
            "[Section D — Site Settings] Deals of the Day populated with",
            dealProducts.length,
            "products",
          );
        }
      }

      // — Update Deals More Link —
      const dealsMore = document.getElementById("more-link-deals");
      if (dealsMore && dealIds.length) {
        dealsMore.href = `search.html?ids=${dealIds.join(",")}&title=${encodeURIComponent("Deals of the Day")}`;
      }

      // — Section Titles —
      const bestSellersTitleEl = document.querySelector(
        ".list-best-sellers-card .split-section-title",
      );
      if (bestSellersTitleEl && acf.bestsellers_section_title)
        bestSellersTitleEl.textContent = acf.bestsellers_section_title;
      const mostLovedTitleEl = document.getElementById("most-loved-title");
      if (mostLovedTitleEl && acf.most_loved_section_title)
        mostLovedTitleEl.textContent = acf.most_loved_section_title;
      const cabTitleEl = document.getElementById("customers-also-bought-title");
      if (cabTitleEl && acf.customers_also_bought_section_title)
        cabTitleEl.textContent = acf.customers_also_bought_section_title;

      // — Best Sellers Sidebar List —
      const bestSellersSidebar = document.getElementById(
        "split-best-sellers-products-container",
      );
      if (bestSellersSidebar) {
        let bsProducts = [];
        if (!acf.bestsellers_mode && bestsellerIds.length) {
          bsProducts = bestsellerIds
            .map((id) => productMap[id])
            .filter(Boolean)
            .slice(0, 7);
        } else {
          // Auto mode: sort window.KawachiProducts by rating or popularity
          const allProds = window.KawachiProducts || [];
          const sortKey = acf.bestsellers_auto_sort || "popularity";
          if (sortKey === "most_rated") {
            bsProducts = [...allProds]
              .sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating))
              .slice(0, 7);
          } else {
            bsProducts = [...allProds]
              .sort((a, b) => (b.sales_count || 0) - (a.sales_count || 0))
              .slice(0, 7);
          }
        }
        if (bsProducts.length) {
          function renderSidebarItem(p) {
            const formattedPrice =
              "₹" +
              Number(p.price).toLocaleString("en-IN", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              });
            return `
              <a href="single-product.html?id=${p.id}" class="split-bestseller-item">
                <img src="${p.image || "https://via.placeholder.com/150"}" alt="${p.name}">
                <div class="item-meta">
                  <span class="item-name">${p.name}</span>
                  <span class="item-category">${p.category || "Lifestyle"}</span>
                  <span class="item-price" style="margin-top: 2px !important;">${formattedPrice}</span>
                </div>
              </a>
            `;
          }
          bestSellersSidebar.innerHTML = bsProducts
            .map(renderSidebarItem)
            .join("");
          console.log(
            "[Section D — Site Settings] Best Sellers sidebar populated with",
            bsProducts.length,
            "products",
          );

          // — Update Bestsellers Sidebar More Link —
          const sidebarMore = document.getElementById(
            "more-link-bestsellers-sidebar",
          );
          if (sidebarMore && bsProducts.length) {
            sidebarMore.href = `search.html?ids=${bsProducts.map((p) => p.id).join(",")}&title=${encodeURIComponent("Best Sellers")}`;
          }
        }
      }

      // — Most Loved Strip —
      const mostLovedTrack = document.getElementById("track-most-loved");
      if (mostLovedTrack) {
        let mlProducts = [];
        if (!acf.most_loved_mode && mostLovedIds.length) {
          mlProducts = mostLovedIds.map((id) => productMap[id]).filter(Boolean);
        } else {
          const allProds = window.KawachiProducts || [];
          const sortKey = acf.most_loved_auto_sort || "latest";
          if (sortKey === "most_rated") {
            mlProducts = [...allProds]
              .sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating))
              .slice(0, 10);
          } else if (sortKey === "popularity") {
            mlProducts = [...allProds]
              .sort((a, b) => (b.sales_count || 0) - (a.sales_count || 0))
              .slice(0, 10);
          } else {
            // latest — take as-is since KawachiProducts is fetched by date desc
            mlProducts = [...allProds].slice(0, 10);
          }
        }
        if (mlProducts.length) {
          mostLovedTrack.innerHTML = mlProducts
            .map((p) => renderProductCard(p))
            .join("");
          console.log(
            "[Section D — Site Settings] Most Loved populated with",
            mlProducts.length,
            "products",
          );
        }
      }

      // — Customers Also Bought Strip —
      const cabTrack = document.getElementById("track-customers-also-bought");
      if (cabTrack) {
        let cabProducts = [];
        if (!acf.customers_also_bought_mode && customersAlsoBoughtIds.length) {
          cabProducts = customersAlsoBoughtIds
            .map((id) => productMap[id])
            .filter(Boolean);
        } else {
          const allProds = window.KawachiProducts || [];
          cabProducts = [...allProds]
            .sort(() => 0.5 - Math.random())
            .slice(0, 10);
        }
        if (cabProducts.length) {
          cabTrack.innerHTML = cabProducts
            .map((p) => renderProductCard(p))
            .join("");
          console.log(
            "[Section D — Site Settings] Customers Also Bought populated with",
            cabProducts.length,
            "products",
          );
        }
      }

      console.log("[Section D — Site Settings] Resolved data:", {
        limited_time_offer_bar: acf.limited_time_offer_enabled
          ? { text: acf.limited_time_offer_text, coupon: acf.coupon_code }
          : "disabled",
        deal_products: dealIds
          .map((id) => productMap[id])
          .filter(Boolean)
          .map((p) => ({ id: p.id, name: p.name, price: p.price })),
        bestsellers: bestsellerIds
          .map((id) => productMap[id])
          .filter(Boolean)
          .map((p) => ({ id: p.id, name: p.name, price: p.price })),
      });

      // Re-init sliders for newly populated sections
      if (typeof window._reinitSliders === "function") window._reinitSliders();
    } catch (err) {
      console.warn(
        "[Section D — Site Settings] Fetch failed, skipping section:",
        err,
      );
    }
  }

  // ==========================================================================
  // Section A — Category Tiles
  // ==========================================================================
  async function fetchAndHydrateCategoryTiles() {
    try {
      const tiles = await wpFetch("/wp-json/wp/v2/category_tile", {
        per_page: "20",
        _fields: "id,slug,acf",
      });
      if (!Array.isArray(tiles) || !tiles.length) {
        console.warn("[Section A — Category Tiles] No tiles returned from WP.");
        return;
      }

      // Map by slug
      const bySlug = {};
      tiles.forEach((t) => {
        if (t.slug && t.acf) bySlug[t.slug] = t.acf;
      });

      console.log(
        "[Section A — Category Tiles] Fetched slugs:",
        Object.keys(bySlug),
      );

      // Collect all product IDs to resolve in one batch
      const allIds = [
        ...new Set(
          Object.values(bySlug).flatMap((acf) =>
            (acf.product || []).map(Number).filter(Boolean),
          ),
        ),
      ];
      const productMap = await resolveProductIds(allIds);
      console.log(
        "[Section A — Category Tiles] Resolved",
        Object.keys(productMap).length,
        "unique products across all tiles",
      );

      // Helper: get resolved products for a slug
      function getProducts(slug, limit = 8) {
        const acf = bySlug[slug];
        if (!acf) return [];
        return (acf.product || [])
          .map(Number)
          .map((id) => productMap[id])
          .filter(Boolean)
          .slice(0, limit);
      }

      // — Update 4-tile discovery grid headings —
      const tileHeadingMap = {
        "trending-now": "tile-title-trending",
        bestsellers: "tile-title-bestsellers",
        "kitchen-furniture": "tile-title-makeover",
        "smart-utilities": "tile-title-utilities",
      };
      Object.entries(tileHeadingMap).forEach(([slug, elId]) => {
        const el = document.getElementById(elId);
        if (el && bySlug[slug] && bySlug[slug].tile_title)
          el.textContent = bySlug[slug].tile_title;
      });

      // — Populate 2x2 discovery grids (first 4 products from each slug) —
      const gridMap = {
        "trending-now": "discovery-trending-grid",
        bestsellers: "discovery-bestsellers-grid",
        "kitchen-furniture": "discovery-makeover-grid",
        "smart-utilities": "discovery-utilities-grid",
      };
      Object.entries(gridMap).forEach(([slug, elId]) => {
        const el = document.getElementById(elId);
        if (!el) return;
        const products = getProducts(slug, 4);
        if (products.length)
          el.innerHTML = products.map(renderDiscoveryItem).join("");
      });

      // — Update discovery cards More links —
      const tileMoreMap = {
        "trending-now": "more-link-trending",
        bestsellers: "more-link-bestsellers",
        "kitchen-furniture": "more-link-makeover",
        "smart-utilities": "more-link-utilities",
      };
      Object.entries(tileMoreMap).forEach(([slug, elId]) => {
        const el = document.getElementById(elId);
        if (el && bySlug[slug]) {
          const acf = bySlug[slug];
          const ids = (acf.product || []).map(Number).filter(Boolean);
          const title = acf.tile_title || "Products";
          if (ids.length) {
            el.href = `search.html?ids=${ids.join(",")}&title=${encodeURIComponent(title)}`;
          }
        }
      });

      // — Populate Trending Now slider (track-trending-now) from slug trending-now —
      // Also update main track-trending-now title from tile_title
      const trendingTitle = document.querySelector(
        "#trending-now-section .kawachi-sec-title",
      );
      if (
        trendingTitle &&
        bySlug["trending-now"] &&
        bySlug["trending-now"].tile_title
      ) {
        trendingTitle.textContent = bySlug["trending-now"].tile_title;
      }
      const trendingTrack = document.getElementById("track-trending-now");
      if (trendingTrack) {
        const products = getProducts("trending-now", 12);
        if (products.length) {
          trendingTrack.innerHTML = products
            .map((p) => renderProductCard(p))
            .join("");
          console.log(
            "[Section A — Category Tiles] Trending Now slider populated with",
            products.length,
            "products",
          );

          const trendingSliderMore = document.getElementById(
            "more-link-trending-slider",
          );
          if (trendingSliderMore) {
            const acf = bySlug["trending-now"];
            const ids = (acf.product || []).map(Number).filter(Boolean);
            const title = acf.tile_title || "Trending Now";
            if (ids.length) {
              trendingSliderMore.href = `search.html?ids=${ids.join(",")}&title=${encodeURIComponent(title)}`;
            }
          }
        }
      }

      // — Populate Trending Now 2 slider (track-trending-now-2) from slug trending-now-2 —
      const tn2Title = document.getElementById("trending-now-2-title");
      if (
        tn2Title &&
        bySlug["trending-now-2"] &&
        bySlug["trending-now-2"].tile_title
      ) {
        tn2Title.textContent = bySlug["trending-now-2"].tile_title;
      }
      const tn2Track = document.getElementById("track-trending-now-2");
      if (tn2Track) {
        const products = getProducts("trending-now-2", 12);
        if (products.length) {
          tn2Track.innerHTML = products
            .map((p) => renderProductCard(p))
            .join("");
          console.log(
            "[Section A — Category Tiles] Trending Now 2 slider populated with",
            products.length,
            "products",
          );
        }
      }

      // — Populate Home Furniture slider (track-home-furniture) from slug home-furniture —
      const hfTitle = document.querySelector(
        "#home-furniture .kawachi-sec-title",
      );
      if (
        hfTitle &&
        bySlug["home-furniture"] &&
        bySlug["home-furniture"].tile_title
      ) {
        hfTitle.textContent = bySlug["home-furniture"].tile_title;
      }
      const hfTrack = document.getElementById("track-home-furniture");
      if (hfTrack) {
        const products = getProducts("home-furniture", 12);
        if (products.length) {
          hfTrack.innerHTML = products
            .map((p) => renderProductCard(p))
            .join("");
          console.log(
            "[Section A — Category Tiles] Home Furniture slider populated with",
            products.length,
            "products",
          );

          const hfSliderMore = document.getElementById(
            "more-link-furniture-slider",
          );
          if (hfSliderMore) {
            const acf = bySlug["home-furniture"];
            const ids = (acf.product || []).map(Number).filter(Boolean);
            const title = acf.tile_title || "Home Furniture";
            if (ids.length) {
              hfSliderMore.href = `search.html?ids=${ids.join(",")}&title=${encodeURIComponent(title)}`;
            }
          }
        }
      }

      // — Populate Kitchen Storage slider (track-kitchen-furniture) from slug kitchen-furniture —
      const kfTitle = document.querySelector(
        "#kitchen-storage .kawachi-sec-title",
      );
      if (
        kfTitle &&
        bySlug["kitchen-furniture"] &&
        bySlug["kitchen-furniture"].tile_title
      ) {
        kfTitle.textContent = bySlug["kitchen-furniture"].tile_title;
      }
      const kfTrack = document.getElementById("track-kitchen-furniture");
      if (kfTrack) {
        const products = getProducts("kitchen-furniture", 12);
        if (products.length) {
          kfTrack.innerHTML = products
            .map((p) => renderProductCard(p))
            .join("");
          console.log(
            "[Section A — Category Tiles] Kitchen Furniture slider populated with",
            products.length,
            "products",
          );

          const kfSliderMore = document.getElementById(
            "more-link-kitchen-slider",
          );
          if (kfSliderMore) {
            const acf = bySlug["kitchen-furniture"];
            const ids = (acf.product || []).map(Number).filter(Boolean);
            const title = acf.tile_title || "Kitchen Storage";
            if (ids.length) {
              kfSliderMore.href = `search.html?ids=${ids.join(",")}&title=${encodeURIComponent(title)}`;
            }
          }
        }
      }

      console.log(
        "[Section A — Category Tiles] Resolved data:",
        Object.keys(bySlug).reduce((acc, slug) => {
          acc[slug] = {
            tile_title: bySlug[slug].tile_title,
            resolved_products: getProducts(slug, 12).map((p) => ({
              id: p.id,
              name: p.name,
              price: p.price,
            })),
          };
          return acc;
        }, {}),
      );

      // Re-init sliders for all newly populated tracks
      if (typeof window._reinitSliders === "function") window._reinitSliders();
    } catch (err) {
      console.warn(
        "[Section A — Category Tiles] Fetch failed, skipping section:",
        err,
      );
    }
  }

  // ==========================================================================
  // Section B — Shop by Category Bubbles
  // ==========================================================================
  async function fetchAndHydrateShopCategory() {
    try {
      const entries = await wpFetch("/wp-json/wp/v2/shop_category_tile", {
        _fields: "id,slug,acf",
        per_page: "20",
      });
      if (!Array.isArray(entries) || !entries.length) {
        console.warn("[Section B — Shop by Category] No entries from WP.");
        return;
      }

      // Resolve all media IDs in parallel
      const mediaIds = entries
        .map((e) => {
          const img = e.acf && e.acf.image;
          if (!img) return null;
          if (typeof img === "number") return img;
          if (typeof img === "object" && typeof img.id === "number")
            return img.id;
          return null;
        })
        .filter(Boolean);
      const mediaResults = await Promise.all(
        mediaIds.map((id) =>
          wpFetch(`/wp-json/wp/v2/media/${id}`, {
            _fields: "id,source_url",
          }).catch(() => null),
        ),
      );
      const mediaMap = {};
      mediaResults.filter(Boolean).forEach((m) => {
        mediaMap[m.id] = m.source_url;
      });

      console.log(
        "[Section B — Shop by Category] Resolved data:",
        entries.map((e) => {
          const img = e.acf && e.acf.image;
          let resolvedUrl = null;
          if (img) {
            if (typeof img === "string") resolvedUrl = img;
            else if (typeof img === "object")
              resolvedUrl =
                img.url || img.source_url || mediaMap[img.id] || null;
            else if (typeof img === "number")
              resolvedUrl = mediaMap[img] || null;
          }
          return {
            title: e.acf.title,
            search_tag: e.acf.search_tag,
            resolved_image_url: resolvedUrl,
          };
        }),
      );

      // Build the bubble HTML
      const bubblesHtml = entries
        .map((e) => {
          const acf = e.acf || {};
          let imgSrc = "images/products/laptop_desk.png";

          const img = acf.image;
          if (img) {
            if (typeof img === "string") {
              imgSrc = img;
            } else if (typeof img === "object") {
              imgSrc =
                img.url ||
                img.source_url ||
                (img.id && mediaMap[img.id]) ||
                imgSrc;
            } else if (typeof img === "number") {
              imgSrc = mediaMap[img] || imgSrc;
            }
          }
          const searchTag = acf.search_tag || acf.title || "";
          const title = acf.title || "";
          const encodedTag = encodeURIComponent(searchTag);
          return `
          <a href="search.html?q=${encodedTag}" class="bubble-category-item">
            <div class="bubble-image-wrap">
              <div class="bubble-image-inner">
                <img src="${imgSrc}" alt="${title}" loading="lazy">
              </div>
            </div>
            <span class="bubble-name">${title}</span>
          </a>`;
        })
        .join("");

      // Update desktop bubble rows (inside .split-category-best-sellers-section)
      const desktopRows = document.querySelectorAll(
        ".split-category-best-sellers-section .bubble-categories-row",
      );
      desktopRows.forEach((row) => {
        row.innerHTML = bubblesHtml;
      });

      // Update mobile-only bubble row
      const mobileRows = document.querySelectorAll(
        ".mobile-only-category-bubbles .bubble-categories-row",
      );
      mobileRows.forEach((row) => {
        row.innerHTML = bubblesHtml;
      });
    } catch (err) {
      console.warn(
        "[Section B — Shop by Category] Fetch failed, skipping section:",
        err,
      );
    }
  }

  // ==========================================================================
  // Section C — Promo Cards
  // ==========================================================================
  async function fetchAndHydratePromoCards() {
    try {
      const cards = await wpFetch("/wp-json/wp/v2/promo_card", {
        _fields: "id,slug,acf",
        per_page: "20",
      });
      if (!Array.isArray(cards) || !cards.length) {
        console.warn("[Section C — Promo Cards] No cards from WP.");
        return;
      }

      console.log(
        "[Section C — Promo Cards] Fetched",
        cards.length,
        "cards:",
        cards.map((c) => ({
          heading: c.acf && c.acf.card_heading,
          linked_count: ((c.acf && c.acf.linked_products) || []).length,
        })),
      );

      const promo1 = cards.find((c) => c.slug === "mega-sale");
      const promo2 = cards.find((c) => c.slug === "2");
      const promo3 = cards.find((c) => c.slug === "3");

      const mapping = [
        { card: promo1, domId: "promo-card-blue" },
        { card: promo2, domId: "promo-card-orange" },
        { card: promo3, domId: "promo-card-green" },
      ];

      for (const { card, domId } of mapping) {
        if (!card) continue;
        const acf = card.acf || {};
        const domCard = document.getElementById(domId);
        if (!domCard) continue;

        // Update heading
        const titleEl = domCard.querySelector(".promo-title");
        if (titleEl && acf.card_heading) titleEl.textContent = acf.card_heading;

        // Update subtitle/text
        const textEl = domCard.querySelector(".promo-text");
        if (textEl && acf.card_subtitle) textEl.textContent = acf.card_subtitle;

        // Update button text and link
        const btnEl = domCard.querySelector(".promo-btn-white");
        if (btnEl) {
          if (acf.button_text) btnEl.textContent = acf.button_text;
          const linkedIds = (acf.linked_products || [])
            .map(Number)
            .filter(Boolean);
          if (linkedIds.length) {
            const titleText = acf.card_heading || "Special Offer";
            btnEl.href = `search.html?ids=${linkedIds.join(",")}&title=${encodeURIComponent(titleText)}`;
          }
        }

        // Update image (media ID, direct URL, or object)
        if (acf.card_image) {
          const imgEl = domCard.querySelector(".promo-box-right img");
          if (imgEl) {
            if (typeof acf.card_image === "number") {
              try {
                const media = await wpFetch(
                  `/wp-json/wp/v2/media/${acf.card_image}`,
                  { _fields: "id,source_url" },
                );
                if (media && media.source_url) {
                  imgEl.src = media.source_url;
                }
              } catch (mediaErr) {
                console.warn(
                  "[Section C — Promo Cards] Could not resolve media ID",
                  acf.card_image,
                  mediaErr,
                );
              }
            } else if (typeof acf.card_image === "string") {
              imgEl.src = acf.card_image;
            } else if (typeof acf.card_image === "object") {
              const url = acf.card_image.url || acf.card_image.source_url;
              if (url) imgEl.src = url;
            }
          }
        }
      }

      console.log(
        "[Section C — Promo Cards] Resolved data:",
        cards.map((c) => ({
          heading: c.acf.card_heading,
          subtitle: c.acf.card_subtitle,
          button_text: c.acf.button_text,
          linked_product_ids: c.acf.linked_products,
        })),
      );
      console.log(
        "[Section C — Promo Cards] Promo cards updated with live WP data.",
      );
    } catch (err) {
      console.warn(
        "[Section C — Promo Cards] Fetch failed, skipping section:",
        err,
      );
    }
  }

  // ==========================================================================
  // Lower Two Banners (Placement: below_category_banner)
  // ==========================================================================
  async function fetchAndHydrateBelowCategoryBanners() {
    try {
      const banners = await wpFetch("/wp-json/wp/v2/hero_banner", {
        per_page: "20",
        _fields: "id,slug,acf",
      });
      if (!Array.isArray(banners)) {
        console.warn("[Below Category Banners] Invalid response from WP.");
        return;
      }
      const belowBanners = banners.filter(
        (b) => b.acf && b.acf.placement === "below_category_banner",
      );
      console.log(
        "[Below Category Banners] Fetched banners:",
        belowBanners.length,
      );

      // Sort by slug to ensure sequential order (below-category-banner-1 first)
      belowBanners.sort((a, b) => (a.slug || "").localeCompare(b.slug || ""));

      // Resolve banner media URLs in parallel
      const mediaIds = belowBanners
        .map((b) => b.acf.banner_image)
        .filter(Boolean);
      const mediaResults = await Promise.all(
        mediaIds.map((id) =>
          wpFetch(`/wp-json/wp/v2/media/${id}`, {
            _fields: "id,source_url",
          }).catch(() => null),
        ),
      );
      const mediaMap = {};
      mediaResults.filter(Boolean).forEach((m) => {
        mediaMap[m.id] = m.source_url;
      });

      console.log("[Below Category Banners] Mapped image URLs:", mediaMap);

      // Map sequentially to spots 1 and 2
      belowBanners.forEach((banner, i) => {
        const spotNum = i + 1;
        const domBanner = document.getElementById(
          `below-category-banner-${spotNum}`,
        );
        if (!domBanner) return;

        const linkedProd =
          Array.isArray(banner.acf.linked_product) &&
          banner.acf.linked_product.length > 0
            ? banner.acf.linked_product[0]
            : null;

        if (linkedProd) {
          domBanner.href = `single-product.html?id=${linkedProd}`;
        }

        const imgEl = domBanner.querySelector("img");
        const resolvedUrl = mediaMap[banner.acf.banner_image];
        if (imgEl && resolvedUrl) {
          imgEl.src = resolvedUrl;
        }
      });

      console.log(
        "[Below Category Banners] Resolved data:",
        belowBanners.map((b, i) => ({
          spot: i + 1,
          slug: b.slug,
          linked_product: b.acf.linked_product,
          image_url: mediaMap[b.acf.banner_image] || null,
        })),
      );
      console.log(
        "[Below Category Banners] Successfully hydrated lower category banners.",
      );
    } catch (err) {
      console.warn("[Below Category Banners] Fetch or hydration failed:", err);
    }
  }

  // Expose all fetch functions globally so DOMContentLoaded can call them
  window._wpFetchSiteSettings = fetchAndHydrateSiteSettings;
  window._wpFetchCategoryTiles = fetchAndHydrateCategoryTiles;
  window._wpFetchShopCategory = fetchAndHydrateShopCategory;
  window._wpFetchPromoCards = fetchAndHydratePromoCards;
  window._wpFetchBelowCategoryBanners = fetchAndHydrateBelowCategoryBanners;
  window.resolveProductIds = resolveProductIds;
})();

// ==========================================================================
// Main DOMContentLoaded Orchestrator
// ==========================================================================
document.addEventListener("DOMContentLoaded", async function () {
  // Wait for the general WooCommerce product catalog to load first
  if (window.KawachiProductsPromise) {
    try {
      await window.KawachiProductsPromise;
    } catch (err) {
      console.warn(
        "[WooCommerce Client] DOMContentLoaded wait for live catalog promise rejected (Marquees):",
        err,
      );
    }
  }

  // Existing marquee + podium + gallery hydrations (unchanged — safe to keep)
  hydrateDealPodium();
  initProductGallerySlideshow();
  hydrateStaticProductMarquees();
  hydrateStaticTrendingGrid();
  hydrateCustomersAlsoBought();
  hydrateFaqSection();
  fetchSearchTagChips();

  // Register slider re-init hook so WP fetch functions can trigger it after populating tracks
  window._reinitSliders = function () {
    if (typeof window.initSlidersGlobal === "function")
      window.initSlidersGlobal();
    if (typeof window.initDealsSliderGlobal === "function")
      window.initDealsSliderGlobal();
  };

  // Fire all WordPress REST API section fetches in parallel — each isolated with its own try/catch
  Promise.allSettled([
    window._wpFetchSiteSettings
      ? window._wpFetchSiteSettings()
      : Promise.resolve(),
    window._wpFetchCategoryTiles
      ? window._wpFetchCategoryTiles()
      : Promise.resolve(),
    window._wpFetchShopCategory
      ? window._wpFetchShopCategory()
      : Promise.resolve(),
    window._wpFetchPromoCards ? window._wpFetchPromoCards() : Promise.resolve(),
    window._wpFetchBelowCategoryBanners
      ? window._wpFetchBelowCategoryBanners()
      : Promise.resolve(),
  ]).then((results) => {
    results.forEach((r, i) => {
      if (r.status === "rejected")
        console.warn(`[WP Section fetch ${i}] Rejected:`, r.reason);
    });
  });
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
    var galleryImgs = card.querySelectorAll(".product-gallery-img");
    var dots = card.querySelectorAll(".gallery-dot");

    // If index 0 = main image (no gallery-active), else show gallery image at index-1
    galleryImgs.forEach(function (img) {
      img.classList.remove("gallery-active");
    });

    if (index === 0) {
      card.classList.remove("slideshow-active");
    } else {
      card.classList.add("slideshow-active");
      var targetImg = galleryImgs[index - 1];
      if (targetImg) targetImg.classList.add("gallery-active");
    }

    // Update dots
    dots.forEach(function (dot) {
      dot.classList.remove("dot-active");
    });
    if (dots[index]) dots[index].classList.add("dot-active");
  }

  // Hover delegation: reveal secondary image on enter, restore main image on leave
  document.body.addEventListener(
    "mouseenter",
    function (e) {
      var card = e.target.closest(".product-card");
      if (card) {
        var totalImages = parseInt(
          card.getAttribute("data-gallery-count") || "1",
          10,
        );
        if (totalImages > 1) {
          // Change to the second image (index 1) instantly on hover
          setActiveSlide(card, 1);
        }
      }
    },
    true,
  );

  document.body.addEventListener(
    "mouseleave",
    function (e) {
      var card = e.target.closest(".product-card");
      if (card) {
        // Restore the main product image (index 0) when hover exits
        setActiveSlide(card, 0);
      }
    },
    true,
  );

  // Manual dot navigation (tap/click behavior) to view specific slides
  document.body.addEventListener("click", function (e) {
    var dot = e.target.closest(".gallery-dot");
    if (dot) {
      e.stopPropagation();
      e.preventDefault();
      var card = dot.closest(".product-card");
      if (card) {
        var dotIndex = parseInt(dot.getAttribute("data-dot-index") || "0", 10);
        setActiveSlide(card, dotIndex);
      }
    }
  });
}
