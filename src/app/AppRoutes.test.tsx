import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { AppRoutes } from "./AppRoutes";

vi.mock("../features/gantt/pages", () => ({
  GanttChartPage: () => <div>Gantt Chart Page</div>,
}));

describe("AppRoutes", () => {
  it("renders the catch-all gantt chart page", () => {
    render(
      <MemoryRouter initialEntries={["/any/path"]}>
        <AppRoutes />
      </MemoryRouter>
    );

    expect(screen.getByText("Gantt Chart Page")).toBeTruthy();
  });
});
