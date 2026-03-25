import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      all: true,
      include: [
        "src/features/gantt/constants/colors.ts",
        "src/features/gantt/constants/layout.ts",
        "src/features/gantt/constants/storage.ts",
        "src/features/gantt/constants/theme.ts",
        "src/features/gantt/hooks/useKeyboardShortcuts.ts",
        "src/features/gantt/hooks/useTimeline.ts",
        "src/features/gantt/hooks/useUndoSnapshot.ts",
        "src/features/gantt/mappers/exportMappers.ts",
        "src/features/gantt/state/actions/historyActions.ts",
        "src/features/gantt/state/actions/ioActions.ts",
        "src/features/gantt/state/actions/markerActions.ts",
        "src/features/gantt/state/actions/subtaskActions.ts",
        "src/features/gantt/state/actions/taskActions.ts",
        "src/features/gantt/state/sampleData.ts",
        "src/features/gantt/state/store.ts",
        "src/features/gantt/utils/colors.ts",
        "src/features/gantt/utils/dateConfig.ts",
        "src/features/gantt/utils/ids.ts",
        "src/features/gantt/utils/importExport.ts",
        "src/features/gantt/utils/layoutMetrics.ts",
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
