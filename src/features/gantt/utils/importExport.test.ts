import { afterEach, describe, expect, it, vi } from "vitest";

import {
  downloadExportPayload,
  readJsonFile,
  validateExportPayload,
} from "./importExport";

const validPayload = {
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
  tasks: [
    {
      ...validPayload.tasks[0],
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
  });

  it("rejects invalid payload variations", () => {
    expect(validateExportPayload(null)).toBeNull();
    expect(validateExportPayload({ ...validPayload, version: 2 })).toBeNull();
    expect(
      validateExportPayload({ ...validPayload, tasks: "invalid" })
    ).toBeNull();
    expect(
      validateExportPayload({ ...validPayload, markers: "invalid" })
    ).toBeNull();
    expect(
      validateExportPayload({
        ...validPayload,
        timelineConfig: { ...validPayload.timelineConfig, viewMode: "quarter" },
      })
    ).toBeNull();
    expect(
      validateExportPayload({
        ...validPayload,
        timelineConfig: {
          ...validPayload.timelineConfig,
          customDateRange: "yes",
        },
      })
    ).toBeNull();
    expect(
      validateExportPayload({
        ...validPayload,
        tasks: [{ ...validPayload.tasks[0], subtasks: [null] }],
      })
    ).toBeNull();
    expect(
      validateExportPayload({
        ...validPayload,
        tasks: [
          {
            ...validPayload.tasks[0],
            subtasks: [
              {
                id: "s-1",
                name: 42,
                startDate: "2026-01-01",
                endDate: "2026-01-02",
                color: "#111111",
              },
            ],
          },
        ],
      })
    ).toBeNull();
    expect(
      validateExportPayload({
        ...validPayload,
        tasks: [{ ...validPayload.tasks[0], progress: "0" }],
      })
    ).toBeNull();
    expect(
      validateExportPayload({
        ...validPayload,
        tasks: [null],
      })
    ).toBeNull();
    expect(
      validateExportPayload({
        ...validPayload,
        markers: [{ ...validPayload.markers[0], date: "not-a-date" }],
      })
    ).toBeNull();
    expect(
      validateExportPayload({
        ...validPayload,
        markers: [null],
      })
    ).toBeNull();
    expect(
      validateExportPayload({
        ...validPayload,
        timelineConfig: { ...validPayload.timelineConfig, startDate: "bad" },
      })
    ).toBeNull();
    expect(
      validateExportPayload({
        ...validPayload,
        timelineConfig: { ...validPayload.timelineConfig, endDate: "bad" },
      })
    ).toBeNull();
    expect(
      validateExportPayload({
        ...validPayload,
        timelineConfig: { ...validPayload.timelineConfig, zoomLevel: "40" },
      })
    ).toBeNull();
    expect(
      validateExportPayload({
        ...validPayload,
        timelineConfig: null,
      })
    ).toBeNull();
    expect(
      validateExportPayload({
        ...validPayloadWithSubtask,
        tasks: [
          {
            ...validPayloadWithSubtask.tasks[0],
            id: 1 as unknown as string,
          },
        ],
      })
    ).toBeNull();
    expect(
      validateExportPayload({
        ...validPayloadWithSubtask,
        tasks: [
          {
            ...validPayloadWithSubtask.tasks[0],
            name: 1 as unknown as string,
          },
        ],
      })
    ).toBeNull();
    expect(
      validateExportPayload({
        ...validPayloadWithSubtask,
        tasks: [
          {
            ...validPayloadWithSubtask.tasks[0],
            startDate: "bad",
          },
        ],
      })
    ).toBeNull();
    expect(
      validateExportPayload({
        ...validPayloadWithSubtask,
        tasks: [
          {
            ...validPayloadWithSubtask.tasks[0],
            endDate: "bad",
          },
        ],
      })
    ).toBeNull();
    expect(
      validateExportPayload({
        ...validPayloadWithSubtask,
        tasks: [
          {
            ...validPayloadWithSubtask.tasks[0],
            color: 1 as unknown as string,
          },
        ],
      })
    ).toBeNull();
    expect(
      validateExportPayload({
        ...validPayloadWithSubtask,
        tasks: [
          {
            ...validPayloadWithSubtask.tasks[0],
            subtasks: [
              {
                ...validPayloadWithSubtask.tasks[0].subtasks[0],
                id: 1 as unknown as string,
              },
            ],
          },
        ],
      })
    ).toBeNull();
    expect(
      validateExportPayload({
        ...validPayloadWithSubtask,
        tasks: [
          {
            ...validPayloadWithSubtask.tasks[0],
            subtasks: [
              {
                ...validPayloadWithSubtask.tasks[0].subtasks[0],
                startDate: "bad",
              },
            ],
          },
        ],
      })
    ).toBeNull();
    expect(
      validateExportPayload({
        ...validPayloadWithSubtask,
        tasks: [
          {
            ...validPayloadWithSubtask.tasks[0],
            subtasks: [
              {
                ...validPayloadWithSubtask.tasks[0].subtasks[0],
                endDate: "bad",
              },
            ],
          },
        ],
      })
    ).toBeNull();
    expect(
      validateExportPayload({
        ...validPayloadWithSubtask,
        tasks: [
          {
            ...validPayloadWithSubtask.tasks[0],
            subtasks: [
              {
                ...validPayloadWithSubtask.tasks[0].subtasks[0],
                color: 1 as unknown as string,
              },
            ],
          },
        ],
      })
    ).toBeNull();
    expect(
      validateExportPayload({
        ...validPayload,
        markers: [{ ...validPayload.markers[0], id: 1 as unknown as string }],
      })
    ).toBeNull();
    expect(
      validateExportPayload({
        ...validPayload,
        markers: [
          { ...validPayload.markers[0], label: 1 as unknown as string },
        ],
      })
    ).toBeNull();
    expect(
      validateExportPayload({
        ...validPayload,
        markers: [
          { ...validPayload.markers[0], color: 1 as unknown as string },
        ],
      })
    ).toBeNull();
    expect(
      validateExportPayload({
        ...validPayload,
        timelineConfig: { ...validPayload.timelineConfig, viewMode: undefined },
      })
    ).not.toBeNull();
    expect(
      validateExportPayload({
        ...validPayload,
        timelineConfig: {
          ...validPayload.timelineConfig,
          customDateRange: undefined,
        },
      })
    ).not.toBeNull();
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
