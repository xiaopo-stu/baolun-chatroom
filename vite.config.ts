import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  base: "/baolun-chatroom/",
  plugins: [react()],
  resolve: {
    alias: {
      "@components": "/src/components",
      "@screens": "/src/screens",
      "@core": "/src/core",
      "@utils": "/src/utils",
      "@assets": "/assets",
    }
  }
});
