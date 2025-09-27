import react from "@vitejs/plugin-react";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import { resolve } from "path";

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          topbar: resolve(__dirname, "src/preload/apis/topbar.ts"),
          sidebar: resolve(__dirname, "src/preload/apis/sidebar.ts"),
          flowcanvas: resolve(__dirname, "src/preload/apis/flowcanvas.ts"),
          "screenshot-selector": resolve(
            __dirname,
            "src/preload/screenshot-selector.ts"
          ),
          tab: resolve(__dirname, "src/preload/apis/tab.ts"),
        },
      },
    },
  },
  renderer: {
    root: "src/renderer",
    build: {
      rollupOptions: {
        input: {
          topbar: resolve(__dirname, "src/renderer/topbar/index.html"),
          sidebar: resolve(__dirname, "src/renderer/sidebar/index.html"),
          flowcanvas: resolve(__dirname, "src/renderer/flowcanvas/index.html"),
        },
      },
    },
    resolve: {
      alias: {
        "@renderer": resolve("src/renderer/src"),
        "@common": resolve("src/shared"),
      },
    },
    plugins: [react()],
    server: {
      port: 5173,
      strictPort: false,
      fs: {
        allow: [".."],
      },
    },
  },
});
