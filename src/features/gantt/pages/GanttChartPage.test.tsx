import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { GanttChartPage } from "./GanttChartPage";

vi.mock("../../../screens/GanttChart", () => ({
  default: () => <div>Gantt Screen Loaded</div>,
}));

describe("GanttChartPage", () => {
  it("shows suspense fallback then renders gantt screen", async () => {
    render(<GanttChartPage />);

    expect(screen.getByText("Loading...")).toBeTruthy();
    expect(await screen.findByText("Gantt Screen Loaded")).toBeTruthy();
  });
});
