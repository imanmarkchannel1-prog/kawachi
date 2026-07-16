import React, { useState, useEffect } from "react";

/**
 * FeaturedBannersGrid - Dynamic side-by-side promo banner grid component.
 * Adapts grid layout columns dynamically based on the number of active banners fetched from the WordPress ACF API.
 */
export default function FeaturedBannersGrid() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchBanners() {
      try {
        // Load API configuration from Vite environment variables
        const apiUrl =
          import.meta.env.VITE_WOO_API_URL ||
          "https://api.kawachigroup.com/wp-json/wc/v3";
        const consumerKey = import.meta.env.VITE_WOO_CONSUMER_KEY;
        const consumerSecret = import.meta.env.VITE_WOO_CONSUMER_SECRET;

        // Strip API path to target the custom WP API namespace
        const cleanBaseUrl = apiUrl
          .replace(/\/wp-json\/wc\/v3\/?$/, "")
          .replace(/\/$/, "");
        // Fetch from custom REST endpoint or home page fields endpoint
        const acfUrl = `${cleanBaseUrl}/wp-json/custom/v1/homepage`;

        // Request with authorization parameters
        const url = new URL(acfUrl);
        if (consumerKey && consumerSecret) {
          url.searchParams.append("consumer_key", consumerKey);
          url.searchParams.append("consumer_secret", consumerSecret);
        }

        const response = await fetch(url.toString());
        if (!response.ok) {
          throw new Error(
            `Failed to load banner settings: ${response.statusText}`,
          );
        }

        const data = await response.json();

        // Extract top_banner_1, top_banner_2, top_banner_3 from homepage settings
        const activeBanners = [];
        if (data.top_banner_1) activeBanners.push(data.top_banner_1);
        if (data.top_banner_2) activeBanners.push(data.top_banner_2);
        if (data.top_banner_3) activeBanners.push(data.top_banner_3);

        // Fallback placeholder logic to display Trending Styles & Sneaker Central if empty
        if (activeBanners.length === 0) {
          activeBanners.push(
            {
              image: "images/products/meditation_chair.png",
              title: "Trending Styles",
              link: "#trending-now",
            },
            {
              image: "images/products/laptop_desk.png",
              title: "Sneaker Central",
              link: "#best-sellers",
            },
            {
              image: "images/products/trolley_organizer.png",
              title: "Smart Utilities",
              link: "#utility-products",
            },
          );
        }

        setBanners(activeBanners);
      } catch (err) {
        console.error("[FeaturedBannersGrid] Error loading options:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchBanners();
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse h-48 bg-slate-100 rounded-xl my-4"></div>
    );
  }

  if (error || banners.length === 0) {
    return null; // Fallback gracefully if endpoint fails
  }

  // Determine Tailwind column class dynamically depending on the banners length
  const gridColsClass =
    banners.length === 1
      ? "grid-cols-1"
      : banners.length === 2
        ? "md:grid-cols-2"
        : banners.length === 3
          ? "md:grid-cols-3"
          : `md:grid-cols-${banners.length}`;

  return (
    <section className="featured-banners-section my-6 px-4">
      <div className={`grid grid-cols-1 ${gridColsClass} gap-6 w-full`}>
        {banners.map((banner, index) => (
          <a
            key={index}
            href={banner.link || "#"}
            className="group relative flex items-center justify-between overflow-hidden rounded-2xl p-6 transition-all duration-300 hover:shadow-lg"
            style={{
              background:
                index % 2 === 0
                  ? "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)"
                  : "linear-gradient(135deg, #FF5E00 0%, #FF9A3C 100%)",
              color: "#ffffff",
              minHeight: "160px",
            }}
          >
            <div className="z-10 flex flex-col justify-between h-full max-w-[60%]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-75">
                  Mega Offer
                </span>
                <h3 className="text-xl font-black mt-1 group-hover:scale-102 transition-transform duration-200">
                  {banner.title || "Featured Collection"}
                </h3>
              </div>
              <span className="text-sm font-bold mt-4 inline-flex items-center group-hover:translate-x-1 transition-transform">
                Shop Now &rarr;
              </span>
            </div>
            <div className="absolute right-4 bottom-4 w-32 h-32 overflow-hidden flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300">
              <img
                src={banner.image}
                alt={banner.title || "Banner Image"}
                className="object-contain max-w-full max-h-full drop-shadow-2xl"
              />
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
