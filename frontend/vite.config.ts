/// <reference types="vitest/config" />
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const BACKEND = process.env.VITE_BACKEND_URL ?? "http://127.0.0.1:8000";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Same-origin in development: the browser only talks to Vite, which
    // forwards API and admin requests to Django. Session + CSRF cookies
    // therefore work without any CORS configuration.
    proxy: {
      "/api": { target: BACKEND, changeOrigin: false },
      "/admin": { target: BACKEND, changeOrigin: false },
      "/static": { target: BACKEND, changeOrigin: false },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    rollupOptions: {
      output: {
        // Long-lived vendor chunks: app changes don't invalidate cached libraries.
        manualChunks: {
          react: ["react", "react-dom", "react-router"],
          charts: ["recharts"],
        },
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: false,
    setupFiles: ["./src/test/setup.ts"],
    css: false,
    restoreMocks: true,
  },
});
