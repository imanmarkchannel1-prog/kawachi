const fs = require('fs');
const dotenv = require('dotenv');
const WooCommerceRestApi = require('@woocommerce/woocommerce-rest-api').default;

// Parse .env manually
const envRaw = fs.readFileSync('.env', 'utf-8');
const env = dotenv.parse(envRaw);

const apiUrl = env.WOOCOMMERCE_URL || 'http://62.72.31.43';
const consumerKey = env.WOOCOMMERCE_CONSUMER_KEY;
const consumerSecret = env.WOOCOMMERCE_CONSUMER_SECRET;

const cleanBaseUrl = apiUrl.replace(/\/wp-json\/wc\/v3\/?$/, '').replace(/\/$/, '');

const WooCommerce = new WooCommerceRestApi({
  url: cleanBaseUrl,
  consumerKey: consumerKey,
  consumerSecret: consumerSecret,
  version: 'wc/v3'
});

console.log(`Testing connection using WooCommerce SDK targeting: ${cleanBaseUrl}`);

WooCommerce.get('products', { per_page: 1 })
  .then(res => {
    console.log(`Status: ${res.status} ${res.statusText}`);
    const data = res.data;
    console.log(`Success! Retrieved ${data.length} product(s). First product: ${data[0] ? data[0].name : 'None'}`);
  })
  .catch(err => {
    const errorData = err.response ? err.response.data : { message: err.message };
    const status = err.response ? err.response.status : 500;
    console.error(`Error status ${status}:`, errorData);
  });
