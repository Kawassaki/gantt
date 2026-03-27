import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import GanttEarth from "./GanttEarth";

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("dark") ? false : false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

afterEach(() => {
  window.localStorage.clear();
});

describe("GanttEarth timeline tabs", () => {
  it("creates, renames, and deletes a timeline tab through UI", () => {
    render(<GanttEarth />);

    fireEvent.click(screen.getByLabelText("Create new timeline tab"));
    const newTabLabel = screen
      .getAllByText("Timeline 2")
      .find((node) => node.closest("[draggable='true']"));
    expect(newTabLabel).toBeTruthy();

    fireEvent.doubleClick(newTabLabel as HTMLElement);
    const renameInput = screen.getByDisplayValue("Timeline 2");
    fireEvent.change(renameInput, { target: { value: "Operations" } });
    fireEvent.keyDown(renameInput, { key: "Enter" });

    const renamedTabLabel = screen
      .getAllByText("Operations")
      .find((node) => node.closest("[draggable='true']"));
    expect(renamedTabLabel).toBeTruthy();

    const tabContainer = (renamedTabLabel as HTMLElement).closest("div");
    expect(tabContainer).not.toBeNull();
    const deleteButton = within(tabContainer as HTMLElement).getByLabelText(
      "Delete tab"
    );
    fireEvent.click(deleteButton);

    expect(screen.getByText("Delete timeline tab?")).toBeTruthy();
    fireEvent.click(screen.getByText("Delete"));

    const timelineTabWithOperations = screen
      .queryAllByText("Operations")
      .find((node) => node.closest("[draggable='true']"));
    expect(timelineTabWithOperations).toBeUndefined();
  });
});
