import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  exportDataAtom,
  importDataAtom,
  redoAtom,
  undoAtom,
} from "../state/actions";
import { redoStackAtom, undoStackAtom } from "../state/store";

import { GanttToolbar } from "./GanttToolbar";

const {
  useAtomValueMock,
  useSetAtomMock,
  setZoomMock,
  downloadExportPayloadMock,
  readJsonFileMock,
  validateExportPayloadMock,
} = vi.hoisted(() => ({
  useAtomValueMock: vi.fn(),
  useSetAtomMock: vi.fn(),
  setZoomMock: vi.fn(),
  downloadExportPayloadMock: vi.fn(),
  readJsonFileMock: vi.fn(),
  validateExportPayloadMock: vi.fn(),
}));

vi.mock("jotai", async () => {
  const actual = await vi.importActual<typeof import("jotai")>("jotai");
  return {
    ...actual,
    useAtomValue: useAtomValueMock,
    useSetAtom: useSetAtomMock,
  };
});

vi.mock("../hooks", () => ({
  useTimeline: () => ({
    config: { zoomLevel: 40 },
    setZoom: setZoomMock,
  }),
}));

vi.mock("../utils/importExport", () => ({
  downloadExportPayload: (...args: unknown[]) =>
    downloadExportPayloadMock(...args),
  readJsonFile: (...args: unknown[]) => readJsonFileMock(...args),
  validateExportPayload: (...args: unknown[]) =>
    validateExportPayloadMock(...args),
}));

const exportPayload = {
  version: 2,
  tabs: [],
  activeTabId: "tab-1",
  timelineDataByTab: {},
};

describe("GanttToolbar", () => {
  beforeEach(() => {
    setZoomMock.mockReset();
    downloadExportPayloadMock.mockReset();
    readJsonFileMock.mockReset();
    validateExportPayloadMock.mockReset();

    const undoMock = vi.fn();
    const redoMock = vi.fn();
    const importMock = vi.fn();

    useSetAtomMock.mockImplementation((atom: unknown) => {
      if (atom === undoAtom) return undoMock;
      if (atom === redoAtom) return redoMock;
      if (atom === importDataAtom) return importMock;
      return vi.fn();
    });

    useAtomValueMock.mockImplementation((atom: unknown) => {
      if (atom === exportDataAtom) return exportPayload;
      if (atom === undoStackAtom) return [];
      if (atom === redoStackAtom) return [];
      return undefined;
    });

    vi.stubGlobal("alert", vi.fn());
  });

  it("handles zoom controls and export", () => {
    render(<GanttToolbar />);

    fireEvent.click(screen.getByTitle("Zoom out"));
    fireEvent.click(screen.getByTitle("Zoom in"));
    fireEvent.click(screen.getByTitle("Export as JSON"));

    expect(setZoomMock).toHaveBeenCalledWith(30);
    expect(setZoomMock).toHaveBeenCalledWith(50);
    expect(downloadExportPayloadMock).toHaveBeenCalledWith(exportPayload);
  });

  it("enables undo/redo when stacks are not empty", () => {
    const undoMock = vi.fn();
    const redoMock = vi.fn();

    useSetAtomMock.mockImplementation((atom: unknown) => {
      if (atom === undoAtom) return undoMock;
      if (atom === redoAtom) return redoMock;
      if (atom === importDataAtom) return vi.fn();
      return vi.fn();
    });

    useAtomValueMock.mockImplementation((atom: unknown) => {
      if (atom === exportDataAtom) return exportPayload;
      if (atom === undoStackAtom) return [{ tasks: [], markers: [] }];
      if (atom === redoStackAtom) return [{ tasks: [], markers: [] }];
      return undefined;
    });

    render(<GanttToolbar />);

    fireEvent.click(screen.getByTitle("Undo (Ctrl+Z)"));
    fireEvent.click(screen.getByTitle("Redo (Ctrl+Shift+Z)"));

    expect(undoMock).toHaveBeenCalledTimes(1);
    expect(redoMock).toHaveBeenCalledTimes(1);
  });

  it("imports valid json files", async () => {
    const importMock = vi.fn();

    useSetAtomMock.mockImplementation((atom: unknown) => {
      if (atom === undoAtom || atom === redoAtom) return vi.fn();
      if (atom === importDataAtom) return importMock;
      return vi.fn();
    });

    const validData = { ok: true };
    readJsonFileMock.mockResolvedValue(validData);
    validateExportPayloadMock.mockReturnValue(validData);

    const { container } = render(<GanttToolbar />);
    const input = container.querySelector(
      "input[type='file']"
    ) as HTMLInputElement;

    await act(async () => {
      fireEvent.change(input, {
        target: { files: [new File(["{}"], "data.json")] },
      });
    });

    expect(importMock).toHaveBeenCalledWith(validData);
    expect(input.value).toBe("");
  });

  it("alerts for invalid payloads or read failures", async () => {
    const importMock = vi.fn();

    useSetAtomMock.mockImplementation((atom: unknown) => {
      if (atom === undoAtom || atom === redoAtom) return vi.fn();
      if (atom === importDataAtom) return importMock;
      return vi.fn();
    });

    const { container, rerender } = render(<GanttToolbar />);
    const input = container.querySelector(
      "input[type='file']"
    ) as HTMLInputElement;

    readJsonFileMock.mockResolvedValue({ bad: true });
    validateExportPayloadMock.mockReturnValue(null);
    await act(async () => {
      fireEvent.change(input, {
        target: { files: [new File(["{}"], "bad.json")] },
      });
    });

    expect(alert).toHaveBeenCalledWith("Invalid Gantt file format");
    expect(importMock).not.toHaveBeenCalled();

    readJsonFileMock.mockRejectedValue(new Error("boom"));
    rerender(<GanttToolbar />);

    await act(async () => {
      fireEvent.change(input, {
        target: { files: [new File(["{}"], "fail.json")] },
      });
    });

    expect(alert).toHaveBeenCalledWith("Failed to read file");
  });

  it("renders optional title and custom divider styles", () => {
    const { container } = render(
      <GanttToolbar
        title="Planner"
        titleClass="title-class"
        dividerClass="divider-class"
        accentColor="#123456"
      />
    );

    expect(screen.getByText("Planner")).toBeTruthy();
    const divider = container.querySelector(".divider-class") as HTMLDivElement;
    expect(divider).toBeTruthy();
    expect(divider.style.background).toBe("rgb(18, 52, 86)");
  });

  it("ignores file input changes when no file is selected", async () => {
    const { container } = render(<GanttToolbar />);
    const input = container.querySelector(
      "input[type='file']"
    ) as HTMLInputElement;

    await act(async () => {
      fireEvent.change(input, { target: { files: [] } });
    });

    expect(readJsonFileMock).not.toHaveBeenCalled();
  });

  it("opens file picker when import button is clicked", () => {
    const clickSpy = vi
      .spyOn(HTMLInputElement.prototype, "click")
      .mockImplementation(() => {});

    render(<GanttToolbar />);
    fireEvent.click(screen.getByTitle("Import JSON"));

    expect(clickSpy).toHaveBeenCalledTimes(1);
  });
});
