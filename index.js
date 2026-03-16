import express from "express";
import http from "node:http";
import cors from "cors";
import path from "path";
import os from "node:os";

// ---- Ultraviolet / Bare Detection ----
let bareServer;
let bareMux;
let wispServer;

try {
  // Try v3+ modules
  const { createBareMux } = await import("@tomphttp/bare-mux-node");
  const { createWispEServer } = await import("@tomphttp/wisp-e-server");

  bareMux = createBareMux();
  bareMux.register("/b/"); // all /b/ paths

  wispServer = createWispEServer({ basePath: "/wisp/" });
  console.log("Detected Ultraviolet v3+ (bare-mux + wisp-e)");
} catch {
  // fallback to pre-3.0 modules
  const { createBareServer } = await import("@tomphttp/bare-server-node");
  const { createWispEServer } = await import("@tomphttp/wisp-e-server");

  bareServer = createBareServer("/b/");
  wispServer = createWispEServer({ basePath: "/wisp/" });
  console.log("Detected Ultraviolet pre-3.0 (bare-server + wisp-e)");
}

// ---- Express Setup ----
const PORT = process.env.PORT || 3000;
const __dirname = process.cwd();
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(express.static(path.join(__dirname, "public")));

app.get(["/", "/index"], (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

// ---- HTTP Server ----
const server = http.createServer((req, res) => {
  if (bareMux && bareMux.shouldRoute(req)) {
    bareMux.routeRequest(req, res);
  } else if (bareServer && bareServer.shouldRoute(req)) {
    bareServer.routeRequest(req, res);
  } else if (wispServer && wispServer.shouldRoute(req)) {
    wispServer.routeRequest(req, res);
  } else {
    app(req, res);
  }
});

// ---- WebSocket Upgrade ----
server.on("upgrade", (req, socket, head) => {
  if (bareMux && bareMux.shouldRoute(req)) {
    bareMux.routeUpgrade(req, socket, head);
  } else if (bareServer && bareServer.shouldRoute(req)) {
    bareServer.routeUpgrade(req, socket, head);
  } else if (wispServer && wispServer.shouldRoute(req)) {
    wispServer.routeUpgrade(req, socket, head);
  } else {
    socket.end();
  }
});

// ---- Start server ----
server.listen(PORT, () => {
  const address = server.address();
  console.log("Listening on:");
  console.log(`\thttp://localhost:${PORT}`);
  console.log(`\thttp://${os.hostname()}:${PORT}`);
  if (address && typeof address === "object") {
    console.log(
      `\thttp://${address.family === "IPv6" ? `[${address.address}]` : address.address
      }:${address.port}`
    );
  }
});

// ---- Graceful shutdown ----
function shutdown() {
  console.log("SIGTERM/SIGINT received: closing server");
  server.close(() => {
    const bareClose = bareMux ? bareMux.close : bareServer ? bareServer.close : () => {};
    bareClose(() => {
      wispServer ? wispServer.close(() => process.exit(0)) : process.exit(0);
    });
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
