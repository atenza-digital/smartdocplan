import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // Bibliotecas grandes em arquivos próprios: mudam pouco entre versões e ficam no cache do navegador.
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (/[\/]node_modules[\/](react|react-dom|scheduler)[\/]/.test(id)) return "react";
          if (id.includes("recharts") || id.includes("d3-") || id.includes("victory-vendor")) return "graficos";
          if (id.includes("@dnd-kit")) return "arrastar";
          if (id.includes("@radix-ui")) return "componentes";
          if (id.includes("@tanstack") || id.includes("@trpc") || id.includes("superjson")) return "dados";
          return undefined;
        },
      },
    },
  },
  server: {
    host: true,
    allowedHosts: ["localhost", "127.0.0.1", ".hstgr.cloud"],
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
