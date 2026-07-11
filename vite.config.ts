import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Served from https://tanaor.github.io/my-library/ (project page subpath).
  base: "/my-library/",
});
