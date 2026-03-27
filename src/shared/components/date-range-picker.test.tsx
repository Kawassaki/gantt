import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DateRangePicker } from "./date-range-picker";

vi.mock("react-day-picker", () => ({
  DayPicker: ({
    className,
    onSelect,
  }: {
    className?: string;
    onSelect?: (range: { from?: Date; to?: Date }) => void;
  }) => (
    <button
      type="button"
      data-testid="mock-day-picker"
      data-class-name={className}
      onClick={() =>
        onSelect?.({
          from: new Date("2026-01-02"),
          to: new Date("2026-01-10"),
        })
      }
    >
      Choose Range
    </button>
  ),
}));

describe("DateRangePicker", () => {
  it("renders default label with no value", () => {
    render(<DateRangePicker onChange={() => {}} />);

    expect(screen.getByText("Pick a date range")).toBeTruthy();
  });

  it("renders a single-day label when only from is provided", () => {
    render(
      <DateRangePicker
        value={{ from: new Date("2026-01-05") }}
        onChange={() => {}}
      />
    );

    expect(screen.getByText("Jan 5, 2026")).toBeTruthy();
  });

  it("renders a full range label and emits selected range", () => {
    const onChange = vi.fn();
    render(
      <DateRangePicker
        value={{ from: new Date("2026-01-01"), to: new Date("2026-01-03") }}
        onChange={onChange}
        isDark
      />
    );

    expect(screen.getByText("Jan 1, 2026 - Jan 3, 2026")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Jan 1, 2026/i }));
    const pickerButton = screen.getByTestId("mock-day-picker");
    expect(pickerButton.getAttribute("data-class-name")).toContain(
      "gantt-rdp--dark"
    );

    fireEvent.click(pickerButton);

    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
