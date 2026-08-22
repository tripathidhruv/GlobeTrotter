import { defineConfig, configDefaults } from "vitest/config";

export default defineConfig({
  test: {
    setupFiles: ["./vitest.setup.ts"],
    exclude: [...configDefaults.exclude, "dist/**"],
    // Tests share a single real Postgres database (no per-file isolation),
    // so running test files in parallel causes cross-file races on shared
    // rows (e.g. the "test-user-1" fixture). Force sequential file execution.
    fileParallelism: false,
  },
});
