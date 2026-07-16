import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";

// Helpers to connect to WooCommerce API
const WOOCOMMERCE_URL =
  process.env.NEXT_PUBLIC_WOOCOMMERCE_URL || "https://api.kawachigroup.com";
const WOOCOMMERCE_CONSUMER_KEY =
  process.env.WOOCOMMERCE_CONSUMER_KEY ||
  "ck_e0bb10c03f926e6e59294b13c65712fb5ef1a872";
const WOOCOMMERCE_CONSUMER_SECRET =
  process.env.WOOCOMMERCE_CONSUMER_SECRET ||
  "cs_71d46fbb1e0197e39838a294437c61e581ece91f";

async function syncWooCommerceCustomer(
  email: string,
  name: string,
  phone?: string,
) {
  try {
    // 1. Search for existing customer
    const searchUrl = `${WOOCOMMERCE_URL}/wp-json/wc/v3/customers?email=${encodeURIComponent(email)}&consumer_key=${WOOCOMMERCE_CONSUMER_KEY}&consumer_secret=${WOOCOMMERCE_CONSUMER_SECRET}`;
    const searchRes = await fetch(searchUrl);
    if (searchRes.ok) {
      const customers = await searchRes.json();
      if (customers && customers.length > 0) {
        return customers[0]; // Existing customer found
      }
    }

    // 2. Create customer if not found
    const createUrl = `${WOOCOMMERCE_URL}/wp-json/wc/v3/customers?consumer_key=${WOOCOMMERCE_CONSUMER_KEY}&consumer_secret=${WOOCOMMERCE_CONSUMER_SECRET}`;
    const [firstName, ...lastNameParts] = name.split(" ");
    const lastName = lastNameParts.join(" ");

    const payload: any = {
      email,
      first_name: firstName || "",
      last_name: lastName || "",
      username: email.split("@")[0],
    };

    if (phone) {
      payload.billing = { phone };
      payload.shipping = { phone };
    }

    const createRes = await fetch(createUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (createRes.ok) {
      return await createRes.json();
    }
  } catch (error) {
    console.error("[WooCommerce Auth Sync] Error syncing user:", error);
  }
  return null;
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    CredentialsProvider({
      id: "phone-otp",
      name: "Phone OTP verification",
      credentials: {
        phone: { label: "Phone Number", type: "text" },
        otp: { label: "OTP Code", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.phone || !credentials?.otp) return null;

        // Perform server-side validation against backend cache (in production this checks database/redis session)
        const verifyUrl = `${process.env.NEXTAUTH_URL}/api/auth/verify-otp`;
        const res = await fetch(verifyUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: credentials.phone,
            otp: credentials.otp,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            // Find or create user inside WooCommerce
            const email = `${credentials.phone}@kawachigroup.com`;
            const name = `User ${credentials.phone}`;
            await syncWooCommerceCustomer(email, name, credentials.phone);

            return {
              id: credentials.phone,
              name: name,
              email: email,
            };
          }
        }
        return null;
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        const email = user.email || "";
        const name = user.name || "";
        if (email) {
          await syncWooCommerceCustomer(email, name);
        }
      }
      return true;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.sub;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/auth/signin",
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
