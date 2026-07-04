process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const WooCommerceRestApi = require('@woocommerce/woocommerce-rest-api').default;

const app = express();
const PORT = process.env.PORT || 8000;

// Enable CORS and JSON parsing middlewares
app.use(cors());
app.use(express.json());

// Clean up WOO API URL to get base WordPress path
const apiUrl = process.env.WOOCOMMERCE_URL || 'https://wordpress-3ht1.srv1774889.hstgr.cloud/';
const cleanBaseUrl = apiUrl.replace(/\/wp-json\/wc\/v3\/?$/, '').replace(/\/$/, '');

// Initialize WooCommerce Client securely in backend environment
// This handles OAuth 1.0a automatically over plain HTTP connections
const WooCommerce = new WooCommerceRestApi({
  url: cleanBaseUrl,
  consumerKey: process.env.WOOCOMMERCE_CONSUMER_KEY || 'ck_e0bb10c03f926e6e59294b13c65712fb5ef1a872',
  consumerSecret: process.env.WOOCOMMERCE_CONSUMER_SECRET || 'cs_71d46fbb1e0197e39838a294437c61e581ece91f',
  version: 'wc/v3'
});

console.log(`[WooCommerce Server API] Secure client initialized targeting: ${cleanBaseUrl}`);

// Secure WooCommerce Middleman Proxy API route
app.all('/api/wc-proxy', (req, res) => {
  const endpoint = req.query.endpoint;
  if (!endpoint) {
    return res.status(400).json({ error: 'Missing endpoint query parameter' });
  }

  // Parse path and query parameters
  const [path, queryString] = endpoint.split('?');
  const cleanPath = path.replace(/^\//, '');

  const params = {};
  if (queryString) {
    const urlSearchParams = new URLSearchParams(queryString);
    for (const [key, value] of urlSearchParams.entries()) {
      params[key] = value;
    }
  }

  const method = req.method.toLowerCase();
  let wooRequest;

  // Route request type to corresponding WooCommerce SDK method
  if (method === 'get') {
    wooRequest = WooCommerce.get(cleanPath, params);
  } else if (method === 'post') {
    wooRequest = WooCommerce.post(cleanPath, req.body, params);
  } else if (method === 'put') {
    wooRequest = WooCommerce.put(cleanPath, req.body, params);
  } else if (method === 'delete') {
    wooRequest = WooCommerce.delete(cleanPath, params);
  } else {
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  wooRequest
    .then(response => {
      res.json(response.data);
    })
    .catch(error => {
      const errorData = error.response ? error.response.data : { message: error.message };
      const status = error.response ? error.response.status : 500;
      console.error(`[WooCommerce Server API] Error [${method.toUpperCase()} ${cleanPath}]:`, errorData);
      res.status(status).json(errorData);
    });
});

// Serve frontend static assets from public/ folder
app.use(express.static('public'));

// Fallback to serving index.html for general routes
app.get('*', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

app.listen(PORT, () => {
  console.log(`[Kawachi Node Store] Serving static headless web storefront at http://localhost:${PORT}`);
});