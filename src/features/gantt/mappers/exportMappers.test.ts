import { describe, expect, it } from "vitest";

import { CURRENT_EXPORT_VERSION, toExportPayload } from "./exportMappers";

describe("export mappers", () => {
  it("builds export payload using current version", () => {
    const payload = toExportPayload({
      tasks: [],
      markers: [],
      timelineConfig: {
        startDate: "2026-03-01",
        endDate: "2026-03-31",
        zoomLevel: 40,
      },
    });

    expect(payload.version).toBe(CURRENT_EXPORT_VERSION);
    expect(payload.tasks).toEqual([]);
    expect(payload.markers).toEqual([]);
    expect(payload.timelineConfig.zoomLevel).toBe(40);
  });
});
