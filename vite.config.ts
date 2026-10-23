import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// Public (publishable) backend connection values. Used only when the build
// environment does not provide them, so published builds never ship without a backend URL.
const PUBLIC_BACKEND_FALLBACK = {
  VITE_SUPABASE_URL: "https://hlnzqkvffyoafppxcozx.supabase.co",
  VITE_SUPABASE_PUBLISHABLE_KEY:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhsbnpxa3ZmZnlvYWZwcHhjb3p4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwMDc5MDEsImV4cCI6MjA4MTU4MzkwMX0.MqC6_ysK82MV0N0PfSk9Jr9gGES-fZi7ql8lKJ0YhnE",
  VITE_SUPABASE_PROJECT_ID: "hlnzqkvffyoafppxcozx",
} as const;

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const define = Object.fromEntries(
    Object.entries(PUBLIC_BACKEND_FALLBACK)
      .filter(([key]) => !env[key] && !process.env[key])
      .map(([key, value]) => [`import.meta.env.${key}`, JSON.stringify(value)]),
  );

  return {
    server: {
      host: "::",
      port: 8080,
    },
    define,
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
  };
});
