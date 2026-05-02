import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    tanstackStart({
      target: "vercel",
    }),
    tsconfigPaths(),
  ],
  build: {
    assetsDir: "assets",
  },
});
