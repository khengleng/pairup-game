import "dotenv/config";
// Ensure the Web Crypto global exists. `jose` (admin JWTs) needs
// `globalThis.crypto`, which isn't exposed by default on Node 18. Polyfill it
// from node:crypto so admin login/session work regardless of Node version.
import { webcrypto } from "node:crypto";
if (!globalThis.crypto) {
  (globalThis as unknown as { crypto: Crypto }).crypto = webcrypto as Crypto;
}
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { runMigrations } from "../db";
import {
  registerTelegramBot,
  setupTelegramWebhook,
  startDailyNudgeScheduler,
} from "../telegram";
import { getHealth, reportError, startMonitoring } from "../monitoring";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  // Apply any pending DB migrations before serving traffic.
  await runMigrations();

  const app = express();
  const server = createServer(app);

  // Baseline security headers. Kept conservative so they don't break the
  // Telegram Mini App webview or the SPA (no strict CSP / frame blocking).
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("X-DNS-Prefetch-Control", "off");
    res.setHeader(
      "Permissions-Policy",
      "geolocation=(), microphone=(), camera=(), payment=()"
    );
    if (process.env.NODE_ENV === "production") {
      res.setHeader(
        "Strict-Transport-Security",
        "max-age=15552000; includeSubDomains"
      );
    }
    next();
  });

  // Health / readiness probe (for uptime monitors + Railway).
  const health = async (_req: express.Request, res: express.Response) => {
    const h = await getHealth();
    res.status(h.db === "down" ? 503 : 200).json(h);
  };
  app.get("/health", health);
  app.get("/healthz", health);

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  registerTelegramBot(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
      // Report only genuine server-side (5xx) errors, not client 4xx.
      onError({ error, path, type }) {
        if (error.code === "INTERNAL_SERVER_ERROR") {
          reportError(`trpc:${type}:${path ?? "?"}`, error.cause ?? error);
        }
      },
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Catch-all Express error handler (must be last).
  app.use(
    (
      err: unknown,
      req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      reportError(`express:${req.method} ${req.path}`, err);
      if (!res.headersSent) res.status(500).json({ error: "Internal server error" });
    }
  );

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    // Register the Telegram webhook + Mini App menu button (best-effort).
    setupTelegramWebhook().catch(error =>
      console.error("[Telegram] Setup failed:", error)
    );
    // Start the daily-nudge scheduler (no-op if the bot isn't configured).
    startDailyNudgeScheduler();
    // Health probe error capture + scheduled prize-liability alerts.
    startMonitoring();
  });
}

startServer().catch(console.error);
