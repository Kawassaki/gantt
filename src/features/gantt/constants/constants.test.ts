import { describe, expect, it } from "vitest";

import { DEFAULT_TASK_COLORS, TASK_PRESET_COLORS } from "./colors";
import {
  HEADER_HEIGHT,
  LEFT_PANEL_DEFAULT_WIDTH,
  LEFT_PANEL_MAX_WIDTH,
  LEFT_PANEL_MIN_WIDTH,
  MAX_ZOOM_LEVEL,
  MIN_ZOOM_LEVEL,
  QUICK_DOUBLE_CLICK_MS,
  SUBTASK_ROW_HEIGHT,
  TASK_ROW_HEIGHT,
} from "./layout";
import { STORAGE_KEYS } from "./storage";
import { THEME_COLORS, THEME_STORAGE_KEY } from "./theme";

describe("gantt constants", () => {
  it("exposes expected layout constants", () => {
    expect(TASK_ROW_HEIGHT).toBe(56);
    expect(SUBTASK_ROW_HEIGHT).toBe(36);
    expect(LEFT_PANEL_DEFAULT_WIDTH).toBe(240);
    expect(LEFT_PANEL_MIN_WIDTH).toBe(200);
    expect(LEFT_PANEL_MAX_WIDTH).toBe(420);
    expect(QUICK_DOUBLE_CLICK_MS).toBe(220);
    expect(HEADER_HEIGHT).toBe(72);
    expect(MIN_ZOOM_LEVEL).toBe(15);
    expect(MAX_ZOOM_LEVEL).toBe(120);
  });

  it("exposes task color palettes", () => {
    expect(DEFAULT_TASK_COLORS).toHaveLength(9);
    expect(TASK_PRESET_COLORS).toHaveLength(5);
  });

  it("exposes storage keys and theme constants", () => {
    expect(STORAGE_KEYS.tabs).toBe("gantt-v2-tabs");
    expect(STORAGE_KEYS.activeTabId).toBe("gantt-v2-active-tab-id");
    expect(STORAGE_KEYS.timelineDataByTab).toBe(
      "gantt-v2-timeline-data-by-tab"
    );
    expect(THEME_STORAGE_KEY).toBe(STORAGE_KEYS.themeMode);
    expect(THEME_COLORS.light.terracotta).toBe("#0052CC");
    expect(THEME_COLORS.dark.terracotta).toBe("#58A6FF");
  });
});
