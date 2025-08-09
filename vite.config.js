import { defineConfig } from "vite";
import preact from "@preact/preset-vite";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        index: "index.html",
        "content-script": "src/content-script.js",
        detector: "src/detector.js",
        background: "src/background.js",
        options: "pages/options.html",
        popup: "pages/popup.html",
        panel: "pages/panel.html",
      },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "[name].js",
      },
    },
  },
  plugins: [
    preact(),
    {
      name: "write-extension-manifest-and-assets",
      apply: "build",
      writeBundle: async (options, bundle) => {
        const fs = await import("fs/promises");
        const path = await import("path");
        const distDir = options.dir || "dist";
        // Copy assets directory as-is for manifest references
        async function copyDir(src, dest) {
          await fs.mkdir(dest, { recursive: true });
          const entries = await fs.readdir(src, { withFileTypes: true });
          for (const entry of entries) {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);
            if (entry.isDirectory()) {
              await copyDir(srcPath, destPath);
            } else {
              await fs.copyFile(srcPath, destPath);
            }
          }
        }
        try {
          await copyDir(path.resolve("assets"), path.resolve(distDir, "assets"));
        } catch {}

        // Transform and write manifest
        try {
          const raw = await fs.readFile(path.resolve("manifest.json"), "utf8");
          const manifest = JSON.parse(raw);
          // Service worker should point to built file
          if (manifest.background?.service_worker) {
            manifest.background.service_worker = "background.js";
          }
          // Content scripts should point to built files
          if (Array.isArray(manifest.content_scripts)) {
            manifest.content_scripts = manifest.content_scripts.map((cs) => ({
              ...cs,
              js: (cs.js || []).map((p) =>
                p.endsWith("content-script.js")
                  ? "content-script.js"
                  : p.endsWith("detector.js")
                    ? "detector.js"
                    : p
              ),
              matches: ["http://*/*", "https://*/*"],
            }));
          }
          // Ensure standard icon sizes exist
          manifest.icons = {
            16: manifest.icons?.[16] || "assets/raccoon.png",
            32: manifest.icons?.[32] || "assets/raccoon.png",
            48: manifest.icons?.[48] || "assets/raccoon.png",
            128: manifest.icons?.[128] || "assets/raccoon.png",
          };
          // Keep action icon path as assets/raccoon.png
          if (manifest.action?.default_icon) {
            manifest.action.default_icon = "assets/raccoon.png";
          }
          await fs.writeFile(
            path.resolve(distDir, "manifest.json"),
            JSON.stringify(manifest, null, 2),
            "utf8"
          );
        } catch (e) {
          // best-effort; don't fail the build
        }
      },
    },
  ],
});
