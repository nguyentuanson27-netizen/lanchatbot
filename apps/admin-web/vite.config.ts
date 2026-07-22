import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 3000,
    proxy: {
      "/admin/v1": {
        target: process.env.ADMIN_API_DEV_URL ?? "http://localhost:8081",
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 3000,
  },
  build: {
    target: "es2022",
    outDir: "dist",
    sourcemap: true,
  },
});
