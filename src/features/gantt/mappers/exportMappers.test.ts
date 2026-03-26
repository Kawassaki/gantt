import { describe, expect, it } from "vitest";

import { CURRENT_EXPORT_VERSION, toExportPayload } from "./exportMappers";

describe("export mappers", () => {
  it("builds export payload using current version", () => {
    const payload = toExportPayload({
      tabs: [{ id: "tab-1", title: "Timeline 1", color: "#0052CC" }],
      activeTabId: "tab-1",
      timelineDataByTab: {
        "tab-1": {
          tasks: [],
          markers: [],
          timelineConfig: {
            startDate: "2026-03-01",
            endDate: "2026-03-31",
            zoomLevel: 40,
          },
        },
      },
    });

    expect(payload.version).toBe(CURRENT_EXPORT_VERSION);
    expect(payload.tabs).toHaveLength(1);
    expect(payload.activeTabId).toBe("tab-1");
    expect(payload.timelineDataByTab["tab-1"].timelineConfig.zoomLevel).toBe(
      40
    );
  });
});
