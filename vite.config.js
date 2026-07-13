import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  // "/" e nao "./": o app e servido pelo Node com fallback de SPA, entao uma
  // rota funda (ex: /admin) precisa resolver os assets a partir da raiz.
  base: "/",
  plugins: [react()],
  build: {
    outDir: "dist",
    sourcemap: false,
    rollupOptions: {
      output: {
        // React sai num arquivo separado: ele quase nunca muda, entao o
        // navegador reaproveita o cache dele a cada deploy do app.
        manualChunks: {
          react: ["react", "react-dom"],
        },
      },
    },
  },
  server: {
    port: 5173,
    // Em desenvolvimento o Vite serve o front e repassa /api pro Fastify.
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: false,
      },
    },
  },
});
