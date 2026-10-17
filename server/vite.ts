import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { type Server } from "http";

// Only import vite in development
let createViteServer: typeof import('vite').createServer | undefined;
let createLogger: typeof import('vite').createLogger | undefined;
let viteConfig: any;
let nanoid: typeof import('nanoid').nanoid | undefined;

if (process.env.NODE_ENV === "development") {
  ({ createServer: createViteServer, createLogger } = await import("vite"));
  viteConfig = (await import("../vite.config.js" as any)).default;
  ({ nanoid } = await import("nanoid"));
}

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  // Only run in development
  if (process.env.NODE_ENV !== "development" || !createViteServer || !createLogger || !viteConfig || !nanoid) {
    return;
  }

  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true,
  };

  const viteLogger = createLogger();
  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    if (url.startsWith('/api/')) {
      return res.status(404).json({ message: "API endpoint not found" });
    }

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
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
  // In production, serve from dist directory
  const possibleDistPaths = [
    path.resolve(import.meta.dirname, '../dist'), // Regular path
    path.resolve(process.cwd(), 'dist'), // PM2 working directory
    path.resolve(process.env.PWD || '', 'dist'), // Alternative working directory
  ];

  if (process.env.NODE_ENV !== "development") {
    // Find the first valid dist path
    const distPath = possibleDistPaths.find(p => fs.existsSync(p));

    if (!distPath) {
      console.error('❌ Could not find build directory in any of these locations:');
      possibleDistPaths.forEach(p => console.error(`   - ${p}`));
      throw new Error('Build directory not found. Please run npm run build first.');
    }

    console.log(`✓ Using build directory: ${distPath}`);

    // Serve static files from dist
    app.use(express.static(distPath, {
      maxAge: '1d', // Cache static assets for 1 day
      etag: true,
      lastModified: true
    }));

    // Serve index.html for all routes (SPA support)
    app.use("*", (_req, res) => {
      const indexPath = path.resolve(distPath, "index.html");
      if (!fs.existsSync(indexPath)) {
        console.error('❌ index.html not found in build directory');
        return res.status(500).send('Server configuration error');
      }
      res.sendFile(indexPath);
    });
  } else {
    // In development, serve from client/public
    const possiblePublicPaths = [
      path.resolve(import.meta.dirname, "..", "client", "public"),
      path.resolve(process.cwd(), "client", "public")
    ];

    const publicPath = possiblePublicPaths.find(p => fs.existsSync(p));

    if (!publicPath) {
      console.error('❌ Could not find public directory in any of these locations:');
      possiblePublicPaths.forEach(p => console.error(`   - ${p}`));
      throw new Error('Public directory not found');
    }

    console.log(`✓ Using public directory: ${publicPath}`);

    // Serve static files from public directory
    app.use(express.static(publicPath));

    // Serve index.html for all routes (SPA support)
    app.use("*", (_req, res) => {
      const indexPath = path.resolve(publicPath, "index.html");
      if (!fs.existsSync(indexPath)) {
        console.error('❌ index.html not found in public directory');
        return res.status(500).send('Server configuration error');
      }
      res.sendFile(indexPath);
    });
  }
}
