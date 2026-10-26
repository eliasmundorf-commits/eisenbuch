// Builds the installable web app from src/: index.html, sw.js, manifest and icons.
// Usage: node build.js   (needs Playwright only to render the icons)
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const root = __dirname;
const plan = JSON.parse(fs.readFileSync(path.join(root, "src/plan.json"), "utf8"));
const app = fs.readFileSync(path.join(root, "src/app.html"), "utf8")
  .replace("/*PLAN*/null", () => JSON.stringify(plan))
  .replace("/*FIGURES*/", () => fs.readFileSync(path.join(root, "src/figures.js"), "utf8"));

// standalone preview without the PWA head (used for the claude.ai preview)
fs.mkdirSync(path.join(root, "dist"), { recursive: true });
fs.writeFileSync(path.join(root, "dist/preview.html"), app);

const head = `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#000000">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Eisenbuch">
<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<link rel="icon" type="image/png" href="icons/icon-192.png">
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>
`;
const index = head + app.replace(/<meta name="claude:viewport-fit-sides"[^>]*>\n?/, "") + "\n</html>\n";
fs.writeFileSync(path.join(root, "index.html"), index);

const manifest = {
  name: "Eisenbuch",
  short_name: "Eisenbuch",
  description: "Persönliches Trainingslog",
  lang: "de",
  start_url: "./",
  scope: "./",
  display: "standalone",
  orientation: "portrait",
  background_color: "#000000",
  theme_color: "#000000",
  icons: [
    { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
    { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
    { src: "icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ],
};
fs.writeFileSync(path.join(root, "manifest.webmanifest"), JSON.stringify(manifest, null, 2) + "\n");

// cache name changes whenever the app changes, so phones pick up updates
const version = crypto.createHash("sha1").update(index).digest("hex").slice(0, 10);
const sw = `// Offline support: app shell is cached; the page is fetched fresh when online.
const CACHE = "eisenbuch-${version}";
const SHELL = ["./", "index.html", "manifest.webmanifest", "icons/apple-touch-icon.png", "icons/icon-192.png", "icons/icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  if (req.mode === "navigate") {
    // network first with a short timeout, so the gym basement still opens instantly
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        const res = await Promise.race([fetch(req), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 2500))]);
        if (res && res.ok) cache.put("index.html", res.clone());
        return res;
      } catch {
        return (await cache.match("index.html")) || (await cache.match("./")) || Response.error();
      }
    })());
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req)));
});
`;
fs.writeFileSync(path.join(root, "sw.js"), sw);

// icons: kettlebell on black, rendered with Playwright
const iconSvg = (pad) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#000"/>
  <g transform="translate(256 268) scale(${pad}) translate(-256 -268)">
    <path d="M196 170a60 60 0 0 1 120 0" fill="none" stroke="#c6f432" stroke-width="34" stroke-linecap="round"/>
    <path d="M186 196h140a30 30 0 0 1 29 23l26 122a52 52 0 0 1-51 63H182a52 52 0 0 1-51-63l26-122a30 30 0 0 1 29-23Z" fill="#c6f432"/>
    <rect x="214" y="272" width="84" height="16" rx="8" fill="#000" opacity=".9"/>
  </g>
</svg>`;
async function icons() {
  let chromium;
  try { ({ chromium } = require("playwright")); } catch { console.log("Playwright missing: icons skipped"); return; }
  fs.mkdirSync(path.join(root, "icons"), { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const shots = [["apple-touch-icon.png", 180, 1], ["icon-192.png", 192, 1], ["icon-512.png", 512, 1], ["icon-maskable-512.png", 512, 0.78]];
  for (const [file, size, pad] of shots) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<style>html,body{margin:0;background:#000}svg{display:block;width:${size}px;height:${size}px}</style>${iconSvg(pad)}`);
    await page.screenshot({ path: path.join(root, "icons", file), omitBackground: false });
  }
  await browser.close();
}
icons().then(() => console.log("built", version));
