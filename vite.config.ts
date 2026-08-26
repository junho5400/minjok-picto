import { defineConfig } from "vite";

export default defineConfig({
  publicDir: "public",
  build: {
    rollupOptions: {
      input: {
        main: "index.html",
        yeonnalligi: "yeonnalligi.html",
        jegichagi: "jegichagi.html",
      },
    },
  },
  server: {
    host: "127.0.0.1",
    port: 43123,
    strictPort: true,
  },
});
