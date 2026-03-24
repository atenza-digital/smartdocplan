import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import path from "path";

export async function setupVite(app: Express, server: Server) {
  // Imports dinâmicos — vite e plugins são devDependencies
  const { createServer: createViteServer } = await import("vite");
  const tailwindcss = (await import("@tailwindcss/vite")).default;
  const react = (await import("@vitejs/plugin-react")).default;
  const { nanoid } = await import("nanoid");

  const clientRoot = path.resolve(process.cwd(), "client");

  const vite = await createViteServer({
    root: clientRoot,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(process.cwd(), "client", "src"),
        "@shared": path.resolve(process.cwd(), "shared"),
      },
    },
    server: {
      middlewareMode: true,
      hmr: { server },
      allowedHosts: true as const,
    },
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path.resolve(clientRoot, "index.html");
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  // Em produção, o esbuild coloca os arquivos em dist/public (relativo ao dist/index.js)
  const distPath = path.resolve(
    path.dirname(new URL(import.meta.url).pathname),
    "public"
  );

  if (!fs.existsSync(distPath)) {
    console.error(`[Static] Build directory not found: ${distPath}`);
  } else {
    console.log(`[Static] Serving from: ${distPath}`);
  }

  app.use(express.static(distPath));
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
