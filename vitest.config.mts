import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    setupFiles: ["./vitest.setup.ts"],
    // Integration tests share one dev database; run files sequentially so delta-based
    // report assertions are not disturbed by another file writing concurrently.
    fileParallelism: false,
  },
  resolve: {
    alias: { "@": path.resolve(process.cwd(), "src") },
  },
});
