import { afterEach, describe, expect, it, vi } from "vitest";

import { createMarkerId, createSubtaskId, createTaskId } from "./ids";

describe("id helpers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a task id with task prefix", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.123456789);
    expect(createTaskId()).toMatch(/^t-/);
  });

  it("creates a subtask id with subtask prefix", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.234567891);
    expect(createSubtaskId()).toMatch(/^s-/);
  });

  it("creates a marker id with marker prefix", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.345678912);
    expect(createMarkerId()).toMatch(/^m-/);
  });
});
