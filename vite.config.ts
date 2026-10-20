import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const modulePath = id.replace(/\\/g, "/");
          if (!modulePath.includes("/node_modules/")) return;
          if (/\/node_modules\/(react|react-dom|scheduler)\//.test(modulePath)) return "vendor-react";
          if (/\/node_modules\/@supabase\//.test(modulePath)) return "vendor-supabase";
          if (/\/node_modules\/@tanstack\//.test(modulePath)) return "vendor-runtime";
          if (/\/node_modules\/(recharts|d3-[^/]+)\//.test(modulePath)) return "vendor-charts";
        },
      },
    },
  },
}));
