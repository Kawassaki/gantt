import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import App from "./App";

vi.mock("./app/index", () => ({
  AppRoutes: () => <div>Mocked Routes</div>,
}));

describe("App", () => {
  it("renders app routes", () => {
    render(<App />);

    expect(screen.getByText("Mocked Routes")).toBeTruthy();
  });
});
