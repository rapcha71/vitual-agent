import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig(async () => {
  // Plugins de Replit: solo cargar en Replit para que el build funcione en Railway
  const replitPlugins: any[] = [];
  if (process.env.REPL_ID) {
    try {
      const themePlugin = (await import("@replit/vite-plugin-shadcn-theme-json")).default;
      const runtimeErrorOverlay = (await import("@replit/vite-plugin-runtime-error-modal")).default;
      replitPlugins.push(runtimeErrorOverlay(), themePlugin());
    } catch {
      // Build fuera de Replit: sin estos plugins
    }
  }
  const cartographerPlugin =
    process.env.NODE_ENV !== "production" && process.env.REPL_ID
      ? [(await import("@replit/vite-plugin-cartographer")).cartographer()]
      : [];

  return {
  plugins: [
    react(),
    ...replitPlugins,
    ...cartographerPlugin,
  ],
  optimizeDeps: {
    exclude: ["qrcode.react", "@radix-ui/react-dialog", "@radix-ui/react-popover", "@radix-ui/react-select"],
    include: ["react", "react-dom", "lucide-react", "wouter"]
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
    },
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
  },
};
});
