import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

const src = (p: string) =>
  fileURLToPath(new URL(`./src/${p}`, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      app: src("app"),
      scenes: src("app/scenes"),
    },
  },
  build: {
    sourcemap: true,
    chunkSizeWarningLimit: 2000, // Phaser alone is ~1 MB
  },
});
