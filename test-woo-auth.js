const fs = require('fs');
const dotenv = require('dotenv');

// Parse .env manually
const envRaw = fs.readFileSync('.env', 'utf-8');
const env = dotenv.parse(envRaw);

const apiUrl = env.VITE_WOO_API_URL;
const consumerKey = env.VITE_WOO_CONSUMER_KEY;
const consumerSecret = env.VITE_WOO_CONSUMER_SECRET;

const targetUrl = `${apiUrl}/products?consumer_key=${consumerKey}&consumer_secret=${consumerSecret}&per_page=1`;

console.log(`Testing URL: ${targetUrl}`);

fetch(targetUrl)
  .then(res => {
    console.log(`Status: ${res.status} ${res.statusText}`);
    return res.json();
  })
  .then(data => {
    if (data.code && data.message) {
      console.log('API Error:', data);
    } else {
      console.log(`Success! Retrieved ${data.length} product(s). First product: ${data[0] ? data[0].name : 'None'}`);
    }
  })
  .catch(err => {
    console.error('Fetch error:', err);
  });
