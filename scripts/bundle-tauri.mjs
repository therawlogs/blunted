// bundle-tauri — copies dist/index.html into src-tauri/frontend with the
// shell-only adapter injected. dist/ stays portable and dependency-free.
// Usage: node scripts/bundle-tauri.mjs
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distHtml = resolve(root, "dist/index.html");
const frontDir = resolve(root, "src-tauri/frontend");

let html;
try {
  html = readFileSync(distHtml, "utf8");
} catch {
  console.error("bundle-tauri: run `npm run build` first (dist/index.html missing)");
  process.exit(1);
}
if (!html.includes("BluntedEngine")) {
  console.error("bundle-tauri: dist/index.html looks unbuilt — run `npm run build` first");
  process.exit(1);
}

mkdirSync(frontDir, { recursive: true });
copyFileSync(resolve(root, "src-tauri/adapter.js"), resolve(frontDir, "tauri-adapter.js"));

const injected = html.replace(
  "</body>",
  '  <script src="./tauri-adapter.js"></script>\n</body>'
);
if (injected === html) throw new Error("bundle-tauri: no </body> found in dist/index.html");

writeFileSync(resolve(frontDir, "index.html"), injected, "utf8");
console.log(`bundle-tauri: wrote src-tauri/frontend/index.html + tauri-adapter.js`);
