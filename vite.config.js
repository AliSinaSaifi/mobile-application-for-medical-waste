import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Relative asset URLs are required for Capacitor WebView (avoid /assets/... 404s).
export default defineConfig({
  plugins: [react()],
  base: "./",
});
