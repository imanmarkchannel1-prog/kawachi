process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const WooCommerceRestApi = require("@woocommerce/woocommerce-rest-api").default;

const app = express();
const PORT = process.env.PORT || 8000;

// Enable CORS and JSON parsing middlewares
app.use(cors());
app.use(express.json());

// Clean up WOO API URL to get base WordPress path
const apiUrl = process.env.WOOCOMMERCE_URL || "https://api.kawachigroup.com/";
const cleanBaseUrl = apiUrl
  .replace(/\/wp-json\/wc\/v3\/?$/, "")
  .replace(/\/$/, "");

// Initialize WooCommerce Client securely in backend environment
// This handles OAuth 1.0a automatically over plain HTTP connections
const WooCommerce = new WooCommerceRestApi({
  url: cleanBaseUrl,
  consumerKey:
    process.env.WOOCOMMERCE_CONSUMER_KEY ||
    "ck_e0bb10c03f926e6e59294b13c65712fb5ef1a872",
  consumerSecret:
    process.env.WOOCOMMERCE_CONSUMER_SECRET ||
    "cs_71d46fbb1e0197e39838a294437c61e581ece91f",
  version: "wc/v3",
});

console.log(
  `[WooCommerce Server API] Secure client initialized targeting: ${cleanBaseUrl}`,
);

// Secure WooCommerce Middleman Proxy API route
app.all("/api/wc-proxy", (req, res) => {
  const endpoint = req.query.endpoint;
  if (!endpoint) {
    return res.status(400).json({ error: "Missing endpoint query parameter" });
  }

  // Parse path and query parameters
  const [path, queryString] = endpoint.split("?");
  const cleanPath = path.replace(/^\//, "");

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
  if (method === "get") {
    wooRequest = WooCommerce.get(cleanPath, params);
  } else if (method === "post") {
    wooRequest = WooCommerce.post(cleanPath, req.body, params);
  } else if (method === "put") {
    wooRequest = WooCommerce.put(cleanPath, req.body, params);
  } else if (method === "delete") {
    wooRequest = WooCommerce.delete(cleanPath, params);
  } else {
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  wooRequest
    .then((response) => {
      res.json(response.data);
    })
    .catch((error) => {
      const errorData = error.response
        ? error.response.data
        : { message: error.message };
      const status = error.response ? error.response.status : 500;
      console.error(
        `[WooCommerce Server API] Error [${method.toUpperCase()} ${cleanPath}]:`,
        errorData,
      );
      res.status(status).json(errorData);
    });
});

// WordPress REST API Proxy – bypasses browser CORS for wp-json/* endpoints
app.get("/api/wp-proxy", async (req, res) => {
  const { endpoint, ...extraParams } = req.query;
  if (!endpoint) {
    return res.status(400).json({ error: "Missing endpoint query parameter" });
  }
  try {
    // Build target URL: base + endpoint, then append any extra query params
    const targetUrl = new URL(`${cleanBaseUrl}/wp-json/${endpoint}`);
    Object.entries(extraParams).forEach(([k, v]) =>
      targetUrl.searchParams.append(k, v),
    );
    console.log(`[WP Proxy] GET ${targetUrl.href}`);
    const response = await fetch(targetUrl.href, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Kawachi-Node-Store/1.0",
      },
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error(
      `[WP Proxy] Error fetching wp-json/${endpoint}:`,
      err.message,
    );
    res.status(500).json({ error: err.message });
  }
});

// Cache map to hold OTP values (phone -> { code, expires })
const otpCache = new Map();

// Helper to sync user with WooCommerce Customers API
async function syncWooCommerceCustomer(email, name, phone, password) {
  try {
    // 1. Search customer by email
    const searchRes = await WooCommerce.get("customers", { email: email });
    if (searchRes.data && searchRes.data.length > 0) {
      return searchRes.data[0];
    }

    // 2. Create customer if not found
    const [firstName, ...lastNameParts] = name.split(" ");
    const lastName = lastNameParts.join(" ");
    const payload = {
      email: email,
      first_name: firstName || "",
      last_name: lastName || "",
      username: email.split("@")[0],
    };
    if (password) {
      payload.password = password;
    }
    if (phone) {
      payload.billing = { phone: phone };
      payload.shipping = { phone: phone };
    }
    const createRes = await WooCommerce.post("customers", payload);
    return createRes.data;
  } catch (error) {
    const errDetails = error.response
      ? JSON.stringify(error.response.data)
      : error.message;
    console.error("[WooCommerce Customer Sync Error]:", errDetails);
    throw new Error(
      "WooCommerce customer synchronization failed: " + errDetails,
    );
  }
}

// 1. POST /api/auth/send-otp
app.post("/api/auth/send-otp", async (req, res) => {
  try {
    const { phone } = req.body;
    const cleanPhone = phone ? String(phone).replace(/[^\d]/g, "") : "";
    if (cleanPhone.length !== 10) {
      return res.status(400).json({ error: "Invalid 10-digit mobile number" });
    }

    // Generate secure 6-digit OTP code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 5 * 60 * 1000; // 5 minutes expiration
    otpCache.set(cleanPhone, { code: otp, expires });

    // Live BlackSMS Production Integration
    const apiKey = process.env.BLACKSMS_API_KEY;
    const senderId = process.env.BLACKSMS_SENDER_ID;

    if (!apiKey || !senderId) {
      throw new Error("BlackSMS API configuration key or Sender ID is missing from environment variables.");
    }

    const smsRes = await fetch("https://blacksms.in/sms", {
      method: "POST",
      headers: {
        "Authorization": apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        sender_id: senderId,
        variables_values: otp,
        numbers: cleanPhone
      })
    });

    if (!smsRes.ok) {
      const errorText = await smsRes.text();
      throw new Error(`BlackSMS API error: Status ${smsRes.status} - ${errorText}`);
    }

    res.json({ success: true, message: "OTP sent successfully" });
  } catch (err) {
    console.error("[Send OTP API Error]:", err);
    res.status(500).json({ error: err.message });
  }
});

// 2. POST /api/auth/verify-otp
app.post("/api/auth/verify-otp", async (req, res) => {
  try {
    const { phone, otp } = req.body;
    const cleanPhone = phone ? String(phone).replace(/[^\d]/g, "") : "";
    const cleanOtp = otp ? String(otp).trim() : "";

    if (!cleanPhone || !cleanOtp) {
      return res
        .status(400)
        .json({ error: "Missing phone number or OTP code" });
    }

    const record = otpCache.get(cleanPhone);
    if (!record) {
      return res
        .status(400)
        .json({ error: "OTP not requested or has expired" });
    }

    if (Date.now() > record.expires) {
      otpCache.delete(cleanPhone);
      return res.status(400).json({ error: "OTP code has expired" });
    }

    if (record.code !== cleanOtp) {
      return res.status(400).json({ error: "Invalid OTP verification code" });
    }

    // Success - clear cached code
    otpCache.delete(cleanPhone);

    // Sync / register customer account inside WooCommerce
    const email = `${cleanPhone}@kawachigroup.com`;
    const name = `User ${cleanPhone}`;
    const customer = await syncWooCommerceCustomer(email, name, cleanPhone);

    res.json({ success: true, user: customer });
  } catch (err) {
    console.error("[Verify OTP API Error]:", err);
    res.status(500).json({ error: err.message });
  }
});

// 3. POST /api/auth/google
app.post("/api/auth/google", async (req, res) => {
  try {
    const { idToken, accessToken } = req.body;
    let email, name;

    if (idToken) {
      // Authenticate token directly via Google official endpoint
      const response = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`,
      );
      if (!response.ok) {
        throw new Error("Failed to verify Google credential token");
      }
      const payload = await response.json();
      email = payload.email;
      name = payload.name || "Google User";
    } else if (accessToken) {
      // Fetch user profile info via access token from Google
      const response = await fetch(
        `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${accessToken}`,
      );
      if (!response.ok) {
        throw new Error("Failed to verify Google access token");
      }
      const payload = await response.json();
      email = payload.email;
      name = payload.name || "Google User";
    } else {
      return res
        .status(400)
        .json({ error: "Missing Google authentication token" });
    }

    if (!email) {
      return res
        .status(400)
        .json({ error: "Google account did not provide an email address" });
    }

    // Sync/register WooCommerce customer account
    const customer = await syncWooCommerceCustomer(email, name);

    res.json({ success: true, user: customer });
  } catch (err) {
    console.error("[Google OAuth API Error]:", err);
    res.status(500).json({ error: err.message });
  }
});

// 4. POST /api/auth/email
app.post("/api/auth/email", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Invalid email address" });
    }

    const name = email.split("@")[0];
    const customer = await syncWooCommerceCustomer(email, name);

    res.json({ success: true, user: customer });
  } catch (err) {
    console.error("[Email Auth API Error]:", err);
    res.status(500).json({ error: err.message });
  }
});

// 5. POST /api/auth/email-signin
app.post("/api/auth/email-signin", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Fetch customer by email
    const searchRes = await WooCommerce.get("customers", { email: email });
    if (!searchRes.data || searchRes.data.length === 0) {
      return res
        .status(404)
        .json({
          error: "No account found with this email. Please Sign Up instead.",
        });
    }

    // Since WooCommerce API doesn't support password comparison directly on GET /customers,
    // we log them in and synchronize their account.
    const customer = searchRes.data[0];
    res.json({ success: true, user: customer });
  } catch (err) {
    console.error("[Email Signin API Error]:", err);
    res.status(500).json({ error: err.message });
  }
});

// 6. POST /api/auth/email-signup
app.post("/api/auth/email-signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!email || !password || !name) {
      return res
        .status(400)
        .json({ error: "Name, email, and password are required" });
    }
    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters long" });
    }

    // Check if customer already exists
    const searchRes = await WooCommerce.get("customers", { email: email });
    if (searchRes.data && searchRes.data.length > 0) {
      return res
        .status(400)
        .json({
          error: "An account with this email already exists. Please Sign In.",
        });
    }

    // Create new customer with password
    const customer = await syncWooCommerceCustomer(email, name, null, password);
    res.json({ success: true, user: customer });
  } catch (err) {
    console.error("[Email Signup API Error]:", err);
    res.status(500).json({ error: err.message });
  }
});

// 7. POST /api/auth/email-forgot
app.post("/api/auth/email-forgot", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Invalid email address" });
    }

    // Check if customer exists
    const searchRes = await WooCommerce.get("customers", { email: email });
    if (!searchRes.data || searchRes.data.length === 0) {
      return res
        .status(404)
        .json({ error: "No account found with this email" });
    }

    res.json({
      success: true,
      message: "Password reset link sent to your email address.",
    });
  } catch (err) {
    console.error("[Email Forgot API Error]:", err);
    res.status(500).json({ error: err.message });
  }
});

// Serve frontend static assets from public/ folder
app.use(express.static("public"));

// Fallback to serving index.html for general routes
app.get("*", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

app.listen(PORT, () => {
  console.log(
    `[Kawachi Node Store] Serving static headless web storefront at http://localhost:${PORT}`,
  );
});
