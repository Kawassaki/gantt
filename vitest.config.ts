import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      all: true,
      include: ["src"],
      exclude: [
        "src/screens/GanttEarth.tsx",
        "src/features/gantt/hooks/useGanttDrag.ts",
        "src/features/gantt/components/GanttToolbar.tsx",
        "src/features/gantt/utils/importExport.ts",
      ],
      thresholds: {
        lines: 100,
        statements: 100,
        functions: 100,
        branches: 100,
      },
    },
  },
});
