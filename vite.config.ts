import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// BASE_PATH sätts av GitHub Actions till /<repo-namn>/ så att appen fungerar på GitHub Pages.
const base = process.env.BASE_PATH ?? "/";

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["apple-touch-icon.png", "icon.svg"],
      manifest: {
        name: "Daily Coach",
        short_name: "Coach",
        description: "Din dagliga coach i 12-veckorsprogrammet",
        lang: "sv",
        display: "standalone",
        orientation: "portrait",
        background_color: "#F7F3EC",
        theme_color: "#F7F3EC",
        start_url: base,
        scope: base,
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: { globPatterns: ["**/*.{js,css,html,png,svg,webmanifest}"] },
    }),
  ],
});
