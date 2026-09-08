import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    // Les tests touchent une vraie base : on les fait passer un par un pour que
    // deux fichiers ne se marchent pas dessus.
    fileParallelism: false,
    include: ["src/**/*.test.ts"],
  },
});
