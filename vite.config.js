import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  base: "./",
  plugins: [tailwindcss()],
  server: {
    watch: {
      ignored: ["**/src/game/data/levels.js"]
    }
  }
});
