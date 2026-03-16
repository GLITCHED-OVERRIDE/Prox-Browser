import { createBareMux } from "@tomphttp/bare-mux-node";
import { createBareServer } from "@tomphttp/bare-server-node";
import { createWispEServer } from "@tomphttp/wisp-e-server";
import path from "path";
import fs from "fs";

const __dirname = process.cwd();

// ---- Setup Bare server / BareMux ----
let bareMux;
let bareServer;

try {
  // Try v3+ (bare-mux)
  bareMux = createBareMux();
  bareMux.register("/b/");
  console.log("Bare-mux detected (v3+)");
} catch {
  // Fallback to pre-3.0
  bareServer = createBareServer("/b/");
  console.log("Bare-server detected (pre-v3.0)");
}

// ---- Setup Wisp E ----
const wispServer = createWispEServer({ basePath: "/wisp/" });

// ---- Serverless Handler ----
export default async function handler(req, res) {
  // Route bare requests
  if (bareMux && bareMux.shouldRoute(req)) {
    return bareMux.routeRequest(req, res);
  }
  if (bareServer && bareServer.shouldRoute(req)) {
    return bareServer.routeRequest(req, res);
  }

  // Route wisp requests
  if (wispServer.shouldRoute(req)) {
    return wispServer.routeRequest(req, res);
  }

  // Serve static files from /public
  let urlPath = req.url.split("?")[0];
  if (urlPath === "/" || urlPath === "/index") {
    urlPath = "/index.html";
  }

  const filePath = path.join(__dirname, "public", urlPath);
  if (fs.existsSync(filePath) && fs.lstatSync(filePath).isFile()) {
    const fileContent = fs.readFileSync(filePath);
    return res.send(fileContent);
  }

  // Fallback 404
  res.statusCode = 404;
  res.end("Not Found");
}
