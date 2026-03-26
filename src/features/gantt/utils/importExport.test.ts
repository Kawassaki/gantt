import { afterEach, describe, expect, it, vi } from "vitest";

import {
  downloadExportPayload,
  readJsonFile,
  validateExportPayload,
} from "./importExport";

const validPayload = {
  version: 2,
  tabs: [
    {
      id: "tab-1",
      title: "Timeline 1",
      color: "#0052CC",
    },
  ],
  activeTabId: "tab-1",
  timelineDataByTab: {
    "tab-1": {
      tasks: [
        {
          id: "t-1",
          name: "Task",
          startDate: "2026-01-01",
          endDate: "2026-01-02",
          color: "#111111",
          subtasks: [],
          progress: 0,
        },
      ],
      markers: [
        {
          id: "m-1",
          date: "2026-01-01",
          label: "Marker",
          color: "#222222",
        },
      ],
      timelineConfig: {
        startDate: "2026-01-01",
        endDate: "2026-02-01",
        zoomLevel: 40,
        viewMode: "week" as const,
        customDateRange: false,
      },
    },
  },
};

const validLegacyPayload = {
  version: 1,
  tasks: [
    {
      id: "t-1",
      name: "Task",
      startDate: "2026-01-01",
      endDate: "2026-01-02",
      color: "#111111",
      subtasks: [],
      progress: 0,
    },
  ],
  markers: [
    {
      id: "m-1",
      date: "2026-01-01",
      label: "Marker",
      color: "#222222",
    },
  ],
  timelineConfig: {
    startDate: "2026-01-01",
    endDate: "2026-02-01",
    zoomLevel: 40,
    viewMode: "week" as const,
    customDateRange: false,
  },
};

const validPayloadWithSubtask = {
  ...validPayload,
  timelineDataByTab: {
    "tab-1": {
      ...validPayload.timelineDataByTab["tab-1"],
      tasks: [
        {
          ...validPayload.timelineDataByTab["tab-1"].tasks[0],
          subtasks: [
            {
              id: "s-1",
              name: "Subtask",
              startDate: "2026-01-01",
              endDate: "2026-01-02",
              color: "#444444",
            },
          ],
        },
      ],
    },
  },
};

describe("importExport utilities", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("validates a correct payload", () => {
    expect(validateExportPayload(validPayload)).toEqual(validPayload);
    expect(validateExportPayload(validPayloadWithSubtask)).toEqual(
      validPayloadWithSubtask
    );
    expect(validateExportPayload(validLegacyPayload)).toEqual(
      validLegacyPayload
    );
  });

  it("rejects invalid payload variations", () => {
    expect(validateExportPayload(null)).toBeNull();
    expect(validateExportPayload({ ...validPayload, version: 3 })).toBeNull();
    expect(
      validateExportPayload({ ...validPayload, tabs: "invalid" })
    ).toBeNull();
    expect(
      validateExportPayload({ ...validPayload, activeTabId: 1 })
    ).toBeNull();
    expect(
      validateExportPayload({
        ...validPayload,
        timelineDataByTab: {
          "tab-1": {
            ...validPayload.timelineDataByTab["tab-1"],
            timelineConfig: {
              ...validPayload.timelineDataByTab["tab-1"].timelineConfig,
              viewMode: "quarter",
            },
          },
        },
      })
    ).toBeNull();
    expect(
      validateExportPayload({
        ...validPayload,
        timelineDataByTab: {
          "tab-1": {
            ...validPayload.timelineDataByTab["tab-1"],
            timelineConfig: null,
          },
        },
      })
    ).toBeNull();
    expect(
      validateExportPayload({
        ...validPayload,
        timelineDataByTab: {
          "tab-1": {
            ...validPayload.timelineDataByTab["tab-1"],
            timelineConfig: {
              ...validPayload.timelineDataByTab["tab-1"].timelineConfig,
              startDate: "bad-date",
            },
          },
        },
      })
    ).toBeNull();
    expect(
      validateExportPayload({
        ...validPayload,
        timelineDataByTab: {
          "tab-1": {
            ...validPayload.timelineDataByTab["tab-1"],
            timelineConfig: {
              ...validPayload.timelineDataByTab["tab-1"].timelineConfig,
              zoomLevel: "40",
            },
          },
        },
      })
    ).toBeNull();
    expect(
      validateExportPayload({
        ...validPayload,
        timelineDataByTab: {
          "tab-1": {
            ...validPayload.timelineDataByTab["tab-1"],
            tasks: [
              {
                ...validPayload.timelineDataByTab["tab-1"].tasks[0],
                subtasks: [null],
              },
            ],
          },
        },
      })
    ).toBeNull();
    expect(
      validateExportPayload({
        ...validPayload,
        timelineDataByTab: {
          "tab-1": {
            ...validPayload.timelineDataByTab["tab-1"],
            timelineConfig: {
              ...validPayload.timelineDataByTab["tab-1"].timelineConfig,
              customDateRange: "yes",
            },
          },
        },
      })
    ).toBeNull();
    expect(
      validateExportPayload({
        ...validPayload,
        timelineDataByTab: {
          "tab-1": {
            ...validPayload.timelineDataByTab["tab-1"],
            tasks: [
              {
                ...validPayload.timelineDataByTab["tab-1"].tasks[0],
                progress: "0",
              },
            ],
          },
        },
      })
    ).toBeNull();
    expect(
      validateExportPayload({
        ...validPayload,
        tabs: [{ ...validPayload.tabs[0], title: 42 }],
      })
    ).toBeNull();
    expect(
      validateExportPayload({
        ...validPayload,
        tabs: [null],
      })
    ).toBeNull();
    expect(
      validateExportPayload({
        ...validPayload,
        timelineDataByTab: "invalid",
      })
    ).toBeNull();
    expect(
      validateExportPayload({
        ...validPayload,
        timelineDataByTab: { "tab-1": null },
      })
    ).toBeNull();
    expect(
      validateExportPayload({
        ...validLegacyPayload,
        timelineConfig: {
          ...validLegacyPayload.timelineConfig,
          viewMode: "quarter",
        },
      })
    ).toBeNull();
    expect(
      validateExportPayload({ ...validLegacyPayload, tasks: [null] })
    ).toBeNull();
    expect(
      validateExportPayload({ ...validLegacyPayload, markers: [null] })
    ).toBeNull();
  });

  it("downloads payload as json file", () => {
    const appendChildSpy = vi.spyOn(document.body, "appendChild");
    const removeChildSpy = vi.spyOn(document.body, "removeChild");
    const createObjectUrlSpy = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:mock");
    const revokeObjectUrlSpy = vi
      .spyOn(URL, "revokeObjectURL")
      .mockImplementation(() => {});
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});

    downloadExportPayload(validPayload);

    expect(createObjectUrlSpy).toHaveBeenCalled();
    expect(appendChildSpy).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(removeChildSpy).toHaveBeenCalled();
    expect(revokeObjectUrlSpy).toHaveBeenCalledWith("blob:mock");
  });

  it("reads and parses json files", async () => {
    class MockFileReaderSuccess {
      public result: string | null = '{"ok":true}';
      public onload: (() => void) | null = null;
      public onerror: (() => void) | null = null;
      public readAsText() {
        this.onload?.();
      }
    }

    vi.stubGlobal("FileReader", MockFileReaderSuccess);
    const result = await readJsonFile(new File(['{"ok":true}'], "ok.json"));
    expect(result).toEqual({ ok: true });
  });

  it("rejects when json parse fails", async () => {
    class MockFileReaderInvalidJson {
      public result: string | null = "not-json";
      public onload: (() => void) | null = null;
      public onerror: (() => void) | null = null;
      public readAsText() {
        this.onload?.();
      }
    }

    vi.stubGlobal("FileReader", MockFileReaderInvalidJson);
    await expect(
      readJsonFile(new File(["not-json"], "bad.json"))
    ).rejects.toThrow("Invalid JSON file");
  });

  it("rejects when read operation fails", async () => {
    class MockFileReaderFailure {
      public result: string | null = null;
      public onload: (() => void) | null = null;
      public onerror: (() => void) | null = null;
      public readAsText() {
        this.onerror?.();
      }
    }

    vi.stubGlobal("FileReader", MockFileReaderFailure);
    await expect(readJsonFile(new File([""], "fail.json"))).rejects.toThrow(
      "Failed to read file"
    );
  });
});
