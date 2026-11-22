import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import { viteStaticCopy } from "vite-plugin-static-copy";
import { localGamesPlugin } from "./server/local-games-plugin";

export default defineConfig({
  base: "./",
  plugins: [
    preact(),
    localGamesPlugin(),
    viteStaticCopy({
      targets: [
        {
          src: "static/*",
          dest: "static",
        },
        {
          src: "node_modules/js-dos/dist/*",
          dest: "static/js-dos",
        },
        {
          src: "node_modules/js-dos/dist/wdosbox.js",
          dest: "static/js-dos",
          transform: (content) =>
            content.replace("gamepads[i]!==undefined", "Boolean(gamepads[i])"),
        },
        {
          src: "node_modules/js-dos/dist/js-dos.js",
          dest: "static/js-dos",
          transform: (content) =>
            content
              .replace("pcspeaker=true", "pcspeaker=false")
              .replace("joysticktype=auto", "joysticktype=none")
              .replace("js-dos-cache (", "js-dos-cache-v3 ("),
        },
      ],
    }),
  ],
  define: {
    APP_VERSION: JSON.stringify(process.env.npm_package_version),
  },
});
