// blunted builder — dependency-free Node. Concatenates original source into
// dist/index.html. Deterministic: fixed file order, no timestamps in output.
// Usage: node scripts/build.mjs [--out dist/index.html]
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outArg = process.argv.indexOf("--out");
const outPath = resolve(root, outArg !== -1 ? process.argv[outArg + 1] : "dist/index.html");

const ENGINE_FILES = [
  "src/engine/version.js",
  "src/engine/graphemes.js",
  "src/engine/markdown.js",
  "src/engine/syllables.js",
  "src/engine/tokenizer.js",
  "src/engine/segmenter.js",
  "src/engine/readability.js",
  "src/engine/config.js",
  "src/engine/rules/helpers.js",
  "src/engine/rules/passive.js",
  "src/engine/rules/adverbs.js",
  "src/engine/rules/wordlists.js",
  "src/engine/analyze.js",
];

function load(p) {
  return readFileSync(resolve(root, p), "utf8");
}

function stripModule(src) {
  return src
    .split("\n")
    .filter((line) => !/^\s*import\s+.+\s+from\s+["'].+["'];?\s*$/.test(line))
    .join("\n")
    .replace(/^(\s*)export\s+/gm, "$1");
}

function safeInline(js) {
  if (js.includes("</script")) throw new Error("inline JS contains </script — refusing to embed");
  return js;
}

const bundle = ENGINE_FILES.map((f) => `/* --- ${f} --- */\n` + stripModule(load(f))).join("\n\n");

// sanity: required symbols exist
for (const sym of ["function analyze(", "function scanDocument(", "function ari(", "MODES"]) {
  if (!bundle.includes(sym)) throw new Error(`engine bundle missing ${sym}`);
}

const mainEngine = `window.BluntedEngine = (function () {\n${bundle}\nreturn { analyze: analyze, MODES: MODES, getMode: getMode, ENGINE_VERSION: ENGINE_VERSION, CONFIG_VERSION: CONFIG_VERSION };\n})();`;

const workerBoot = `\nonmessage = function (e) {\n  try {\n    var r = analyze(e.data || {});\n    postMessage({ ok: true, rev: (e.data || {}).textRevision, result: r });\n  } catch (err) {\n    postMessage({ ok: false, rev: (e.data || {}).textRevision, error: String((err && err.message) || err) });\n  }\n};\n`;

const workerSrc = bundle + workerBoot;
const css = load("src/ui/styles.css");
const appJs = load("src/ui/app.js");
let shell = load("src/ui/shell.html");

if (css.includes("@import") || /url\(\s*http/i.test(css)) throw new Error("CSS must not reference remote assets");
for (const j of [mainEngine, workerSrc, appJs]) safeInline(j);
if (/src\s*=\s*"http|href\s*=\s*"http/i.test(shell)) throw new Error("shell must not reference remote assets");

shell = shell.replace(
  "<!--BLUNTED:STYLES-->",
  `<style>\n${css}\n</style>`
);
shell = shell.replace(
  "<!--BLUNTED:ENGINE-->",
  `<script>\n${mainEngine}\n</script>`
);
shell = shell.replace(
  "<!--BLUNTED:WORKER-->",
  `<script>window.BluntedWorkerSrc = ${JSON.stringify(workerSrc)};</script>`
);
shell = shell.replace("<!--BLUNTED:APP-->", `<script>\n${appJs}\n</script>`);

if (shell.includes("BLUNTED:")) throw new Error("unreplaced placeholder in shell");

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, shell, "utf8");
console.log(`blunted: wrote ${outPath} (${Buffer.byteLength(shell, "utf8")} bytes)`);
